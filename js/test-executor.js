// Test Executor Module
class TestExecutor {
    constructor(consoleManager) {
        this.consoleManager = consoleManager;
        this.workerScriptPath = 'js/testcase-worker.js';
    }

    async executeTests(codeContent, testContent) {
        try {
            const testResults = {
                passed: 0,
                failed: 0,
                testCases: [],
                error: null,
            };

            const testModule = this.parseTestModule(testContent);
            if (!testModule.success) {
                return { error: `Failed to parse test cases: ${testModule.error}` };
            }

            // Validate student code once before running any testcase in workers.
            const codeValidation = this.parseCodeModule(codeContent);
            if (!codeValidation.success) {
                return { error: `Failed to parse student code: ${codeValidation.error}` };
            }

            const { testcases, options = {} } = testModule.data;

            for (let index = 0; index < testcases.length; index++) {
                const testCase = testcases[index];
                try {
                    const { input, expected, isPublic, description } = testCase;

                    const workerResult = await this.executeTestCaseInWorker(codeContent, testCase, options);

                    let passed;
                    let actualResults;

                    if (options.type === 'commands') {
                        passed = workerResult.passed;
                        actualResults = workerResult.actual;
                    } else {
                        passed = this.compareResults(workerResult.actual, expected, options);
                        actualResults = workerResult.actual;
                    }

                    testResults.testCases.push({
                        index: index + 1,
                        passed,
                        input,
                        expected: options.type === 'commands' ? workerResult.expected : expected,
                        actual: actualResults,
                        isPublic,
                        description,
                        error: null,
                    });

                    if (passed) {
                        testResults.passed++;
                    } else {
                        testResults.failed++;
                    }
                } catch (error) {
                    testResults.testCases.push({
                        index: index + 1,
                        passed: false,
                        input: testCase.input,
                        expected:
                            options.type === 'commands' && Array.isArray(testCase.expected)
                                ? testCase.expected.map((e) => e.value)
                                : testCase.expected,
                        actual: null,
                        isPublic: testCase.isPublic,
                        description: testCase.description,
                        error: error.message,
                    });
                    testResults.failed++;
                }
            }

            return testResults;
        } catch (error) {
            return { error: `Test execution failed: ${error.message}` };
        }
    }

    executeTestCaseInWorker(codeContent, testCase, options) {
        return new Promise((resolve, reject) => {
            if (typeof Worker === 'undefined') {
                try {
                    const fallbackResult = this.executeTestCaseInMainThread(codeContent, testCase, options);
                    resolve(fallbackResult);
                } catch (error) {
                    reject(error);
                }
                return;
            }

            const worker = new Worker(this.workerScriptPath);
            const timeoutMs = AppConfig.TIMEOUTS.CODE_EXECUTION;
            let isSettled = false;

            const cleanup = () => {
                if (!isSettled) {
                    isSettled = true;
                    worker.terminate();
                }
            };

            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Time Limit Exceeded: Code execution timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            worker.onmessage = (event) => {
                if (isSettled) {
                    return;
                }

                clearTimeout(timeoutId);
                cleanup();

                const response = event.data || {};
                if (!response.success) {
                    reject(new Error(response.error || 'Unknown worker execution error'));
                    return;
                }

                resolve(response.result);
            };

            worker.onerror = (errorEvent) => {
                if (isSettled) {
                    return;
                }

                clearTimeout(timeoutId);
                cleanup();
                reject(new Error(errorEvent.message || 'Worker execution failed'));
            };

            worker.postMessage({
                codeContent,
                testCase,
                options,
                timeoutMs,
            });
        });
    }

    executeTestCaseInMainThread(codeContent, testCase, options) {
        const codeFunction = this.parseCodeModule(codeContent);
        if (!codeFunction.success) {
            throw new Error(`Failed to parse student code: ${codeFunction.error}`);
        }

        this.consoleManager.silence();
        try {
            if (options.type === 'commands') {
                return this.runCommandBasedTest(codeFunction.fn, testCase);
            }

            const actual = this.executeWithTimeout(codeFunction.fn, testCase.input);
            return {
                passed: this.compareResults(actual, testCase.expected, options),
                expected: testCase.expected,
                actual,
            };
        } finally {
            this.consoleManager.restore();
        }
    }

    // Execute function with timeout to prevent infinite loops
    executeWithTimeout(fn, args) {
        try {
            const result = fn(...args);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Run command-based test cases
    runCommandBasedTest(runCode, testCase) {
        const { input, expected, commands } = testCase;

        // Create the object using the input parameters
        const obj = this.executeWithTimeout(runCode, input);

        // Execute each command and collect results
        const actualResults = [];
        let allPassed = true;

        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            const expectedItem = expected[i];

            try {
                // Check if method exists
                if (typeof obj[command.method] !== 'function') {
                    throw new TypeError(`${command.method} is not a function or does not exist on the returned object`);
                }

                // Execute the method on the object
                const actualResult = obj[command.method](...command.params);
                actualResults.push(actualResult);

                // Get comparison options (can be per-command or use defaults)
                const compareOptions = expectedItem.options || {};

                // Compare the result
                const passed = this.compareResults(actualResult, expectedItem.value, compareOptions);

                if (!passed) {
                    allPassed = false;
                }
            } catch (error) {
                // If there's an error executing the command, treat it as a failed test
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

    parseTestModule(testContent) {
        try {
            const moduleCode = testContent.replace(/module\.exports\s*=/, 'var testModule =');
            const func = new Function(moduleCode + '; return testModule;');
            const testModule = func();
            return { success: true, data: testModule };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    parseCodeModule(codeContent) {
        try {
            const exportMatch = codeContent.match(/module\.exports\s*=\s*(\w+)/);
            if (!exportMatch) {
                return { success: false, error: 'No module.exports found in code' };
            }

            const functionName = exportMatch[1];
            const codeWithoutExports = codeContent.replace(/module\.exports\s*=.*?;?/g, '');

            // Instrument code with timeout checks to prevent infinite loops
            const instrumentedCode = this.instrumentCodeWithTimeoutChecks(codeWithoutExports);

            const executionCode = `
                var __executionStartTime = Date.now();
                var __timeoutMs = ${AppConfig.TIMEOUTS.CODE_EXECUTION}; // Configurable timeout
                var __checkTimeoutCounter = 0;

                function __checkTimeout() {
                    __checkTimeoutCounter++;
                    // Check every single iteration for immediate detection
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

            // Monkey patch console.log during execution
            this.consoleManager.silence();

            try {
                const func = new Function(executionCode);
                const userFunction = func();
                return { success: true, fn: userFunction };
            } finally {
                // Always restore original console.log
                this.consoleManager.restore();
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Instrument code with timeout checks in loops
    instrumentCodeWithTimeoutChecks(code) {
        // Add timeout checks to for loops
        code = code.replace(/for\s*\(\s*([^;]*);([^;]*);([^)]*)\)\s*\{/g, 'for ($1; $2; $3) { __checkTimeout();');

        // Add timeout checks to while loops
        code = code.replace(/while\s*\(\s*([^)]+)\)\s*\{/g, 'while ($1) { __checkTimeout();');

        // Add timeout checks to do-while loops
        code = code.replace(/do\s*\{/g, 'do { __checkTimeout();');

        return code;
    }

    compareResults(result, expected, options) {
        if (options.type === 'floating point') {
            const precision = options.precision || 6;
            return Math.abs(result - expected) < Math.pow(10, -precision);
        } else if (options.type === 'JSON') {
            return this.deepEqual(result, expected);
        }
        return result === expected;
    }

    deepEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
        if (Object.keys(a).length !== Object.keys(b).length) return false;
        for (let key in a) {
            if (!(key in b) || !this.deepEqual(a[key], b[key])) return false;
        }
        return true;
    }
}
