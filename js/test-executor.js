// Test Executor Module
class TestExecutor {
    constructor(consoleManager) {
        this.consoleManager = consoleManager;
        this.workerScriptPath = 'js/testcase-worker.js';
        this.runtime = globalThis.TestcaseRuntime;
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

                    const workerResult = await this.executeTestCaseInWorker(
                        codeContent,
                        testContent,
                        index,
                        testCase,
                        options,
                    );

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

    executeTestCaseInWorker(codeContent, testContent, testCaseIndex, fallbackTestCase, fallbackOptions) {
        return new Promise((resolve, reject) => {
            if (typeof Worker === 'undefined') {
                try {
                    const fallbackResult = this.executeTestCaseInMainThread(
                        codeContent,
                        fallbackTestCase,
                        fallbackOptions,
                    );
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
                testContent,
                testCaseIndex,
                timeoutMs,
            });
        });
    }

    executeTestCaseInMainThread(codeContent, testCase, options) {
        const timeoutMs = AppConfig.TIMEOUTS.CODE_EXECUTION;

        this.consoleManager.silence();
        try {
            return this.runtime.executeSingleTestCase(codeContent, testCase, options, timeoutMs);
        } finally {
            this.consoleManager.restore();
        }
    }

    // Execute function with timeout to prevent infinite loops
    executeWithTimeout(fn, args) {
        return this.runtime.executeWithTimeout(fn, args);
    }

    // Run command-based test cases
    runCommandBasedTest(runCode, testCase) {
        return this.runtime.runCommandBasedTest(runCode, testCase, this.runtime.compareResults);
    }

    parseTestModule(testContent) {
        return this.runtime.parseTestModule(testContent);
    }

    parseCodeModule(codeContent) {
        const timeoutMs = AppConfig.TIMEOUTS.CODE_EXECUTION;
        this.consoleManager.silence();
        try {
            return this.runtime.parseCodeModule(codeContent, timeoutMs, { instrumentLoops: true });
        } finally {
            this.consoleManager.restore();
        }
    }

    // Instrument code with timeout checks in loops
    instrumentCodeWithTimeoutChecks(code) {
        return this.runtime.instrumentCodeWithTimeoutChecks(code);
    }

    compareResults(result, expected, options) {
        return this.runtime.compareResults(result, expected, options);
    }

    deepEqual(a, b) {
        return this.runtime.deepEqual(a, b);
    }
}
