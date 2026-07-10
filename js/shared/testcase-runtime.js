// Shared testcase runtime used by both main thread and worker execution paths.
(function (globalScope) {
    function parseTestModule(testContent) {
        try {
            const moduleCode = testContent.replace(/module\.exports\s*=/, 'var testModule =');
            const func = new Function(moduleCode + '; return testModule;');
            const testModule = func();
            return { success: true, data: testModule };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    function resolveMonkeyPatch(testcaseOptions) {
        if (!testcaseOptions) {
            return null;
        }

        if (typeof testcaseOptions.monkeyPatch === 'function') {
            return testcaseOptions.monkeyPatch;
        }

        if (typeof testcaseOptions.monkeyPatchSource === 'string' && testcaseOptions.monkeyPatchSource.trim()) {
            const monkeyPatch = new Function(`return (${testcaseOptions.monkeyPatchSource});`)();
            if (typeof monkeyPatch !== 'function') {
                throw new Error('monkeyPatchSource must evaluate to a function');
            }
            return monkeyPatch;
        }

        return null;
    }

    function applyMonkeyPatchIfNeeded(fn, testcaseOptions) {
        const monkeyPatch = resolveMonkeyPatch(testcaseOptions);
        if (!monkeyPatch) {
            return fn;
        }

        const patchedFn = monkeyPatch(fn);
        if (typeof patchedFn !== 'function') {
            throw new Error('monkeyPatch must return a function');
        }

        return patchedFn;
    }

    function executeWithTimeout(fn, args) {
        return fn(...args);
    }

    function runCommandBasedTest(runCode, testCase, compareResultsFn) {
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
                const passed = compareResultsFn(actualResult, expectedItem.value, compareOptions);
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

    function instrumentCodeWithTimeoutChecks(code) {
        code = code.replace(/for\s*\(\s*([^;]*);([^;]*);([^)]*)\)\s*\{/g, 'for ($1; $2; $3) { __checkTimeout();');
        code = code.replace(/while\s*\(\s*([^)]+)\)\s*\{/g, 'while ($1) { __checkTimeout();');
        code = code.replace(/do\s*\{/g, 'do { __checkTimeout();');
        return code;
    }

    function parseCodeModule(codeContent, timeoutMs, options) {
        try {
            const runtimeOptions = options || {};
            const exportMatch = codeContent.match(/module\.exports\s*=\s*(\w+)/);
            if (!exportMatch) {
                return { success: false, error: 'No module.exports found in code' };
            }

            const functionName = exportMatch[1];
            const codeWithoutExports = codeContent.replace(/module\.exports\s*=.*?;?/g, '');
            const instrumentedCode = runtimeOptions.instrumentLoops
                ? instrumentCodeWithTimeoutChecks(codeWithoutExports)
                : codeWithoutExports;

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

    function executeSingleTestCase(codeContent, testCase, options, timeoutMs) {
        const codeFunction = parseCodeModule(codeContent, timeoutMs, { instrumentLoops: true });
        if (!codeFunction.success) {
            throw new Error(`Failed to parse student code: ${codeFunction.error}`);
        }

        const executableFn = applyMonkeyPatchIfNeeded(codeFunction.fn, options);

        if (options.type === 'commands') {
            return runCommandBasedTest(executableFn, testCase, compareResults);
        }

        const actual = executeWithTimeout(executableFn, testCase.input);
        return {
            passed: compareResults(actual, testCase.expected, options),
            expected: testCase.expected,
            actual,
        };
    }

    globalScope.TestcaseRuntime = {
        parseTestModule,
        executeWithTimeout,
        runCommandBasedTest,
        instrumentCodeWithTimeoutChecks,
        parseCodeModule,
        compareResults,
        deepEqual,
        resolveMonkeyPatch,
        applyMonkeyPatchIfNeeded,
        executeSingleTestCase,
    };
})(typeof self !== 'undefined' ? self : globalThis);
