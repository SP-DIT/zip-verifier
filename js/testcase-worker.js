// Web Worker: execute a single testcase in isolation.
self.onmessage = (event) => {
    const { codeContent, testCase, options = {}, timeoutMs = 2000 } = event.data || {};

    try {
        const codeFunction = parseCodeModule(codeContent, timeoutMs);
        if (!codeFunction.success) {
            throw new Error(`Failed to parse student code: ${codeFunction.error}`);
        }

        let result;
        if (options.type === 'commands') {
            result = runCommandBasedTest(codeFunction.fn, testCase);
        } else {
            const actual = executeWithTimeout(codeFunction.fn, testCase.input);
            result = {
                passed: compareResults(actual, testCase.expected, options),
                expected: testCase.expected,
                actual,
            };
        }

        self.postMessage({
            success: true,
            result,
        });
    } catch (error) {
        self.postMessage({
            success: false,
            error: error && error.message ? error.message : 'Unknown worker error',
        });
    }
};

function executeWithTimeout(fn, args) {
    return fn(...args);
}

function runCommandBasedTest(runCode, testCase) {
    const { input, expected, commands } = testCase;
    const obj = executeWithTimeout(runCode, input);

    const actualResults = [];
    let allPassed = true;

    for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const expectedItem = expected[i];

        try {
            if (typeof obj[command.method] !== 'function') {
                throw new TypeError(`${command.method} is not a function or does not exist on the returned object`);
            }

            const actualResult = obj[command.method](...command.params);
            actualResults.push(actualResult);

            const compareOptions = expectedItem.options || {};
            const passed = compareResults(actualResult, expectedItem.value, compareOptions);
            if (!passed) {
                allPassed = false;
            }
        } catch (error) {
            actualResults.push(`Error: ${error.message}`);
            allPassed = false;
        }
    }

    return {
        passed: allPassed,
        expected: expected.map((e) => e.value),
        actual: actualResults,
        commands,
    };
}

function parseCodeModule(codeContent, timeoutMs) {
    try {
        const exportMatch = codeContent.match(/module\.exports\s*=\s*(\w+)/);
        if (!exportMatch) {
            return { success: false, error: 'No module.exports found in code' };
        }

        const functionName = exportMatch[1];
        const codeWithoutExports = codeContent.replace(/module\.exports\s*=.*?;?/g, '');
        const instrumentedCode = instrumentCodeWithTimeoutChecks(codeWithoutExports);

        const executionCode = `
            var __executionStartTime = Date.now();
            var __timeoutMs = ${timeoutMs};

            function __checkTimeout() {
                if (Date.now() - __executionStartTime > __timeoutMs) {
                    throw new Error('Time Limit Exceeded: Code execution timed out after ' + __timeoutMs + 'ms');
                }
            }

            ${instrumentedCode}
            if (typeof ${functionName} !== 'function') {
                throw new Error('${functionName} is not defined as a function');
            }
            return ${functionName};
        `;

        const func = new Function(executionCode);
        const userFunction = func();
        return { success: true, fn: userFunction };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function instrumentCodeWithTimeoutChecks(code) {
    code = code.replace(/for\s*\(\s*([^;]*);([^;]*);([^)]*)\)\s*\{/g, 'for ($1; $2; $3) { __checkTimeout();');
    code = code.replace(/while\s*\(\s*([^)]+)\)\s*\{/g, 'while ($1) { __checkTimeout();');
    code = code.replace(/do\s*\{/g, 'do { __checkTimeout();');
    return code;
}

function compareResults(result, expected, options) {
    if (options.type === 'floating point') {
        const precision = options.precision || 6;
        return Math.abs(result - expected) < Math.pow(10, -precision);
    }

    if (options.type === 'JSON') {
        return deepEqual(result, expected);
    }

    return result === expected;
}

function deepEqual(a, b) {
    if (a === b) {
        return true;
    }

    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }

    if (Object.keys(a).length !== Object.keys(b).length) {
        return false;
    }

    for (const key in a) {
        if (!(key in b) || !deepEqual(a[key], b[key])) {
            return false;
        }
    }

    return true;
}
