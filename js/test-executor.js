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

            const { testcases, options = {} } = testModule.data;
            let workerSession = null;

            if (typeof Worker !== 'undefined') {
                try {
                    workerSession = await this.createWorkerSession(codeContent, testContent);
                } catch (error) {
                    return { error: `Failed to initialize worker runner: ${error.message}` };
                }
            } else {
                // Validate student code once when worker execution is unavailable.
                const codeValidation = this.parseCodeModule(codeContent);
                if (!codeValidation.success) {
                    return { error: `Failed to parse student code: ${codeValidation.error}` };
                }
            }

            for (let index = 0; index < testcases.length; index++) {
                const testCase = testcases[index];
                try {
                    const { input, expected, isPublic, description } = testCase;

                    const workerResult = workerSession
                        ? await this.runTestCaseInWorkerSession(workerSession, index)
                        : this.executeTestCaseInMainThread(codeContent, testCase, options);

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

                if (workerSession?.terminated) {
                    try {
                        workerSession = await this.createWorkerSession(codeContent, testContent);
                    } catch {
                        workerSession = null;
                    }
                }
            }

            return testResults;
        } catch (error) {
            return { error: `Test execution failed: ${error.message}` };
        } finally {
            this.terminateWorkerSession();
        }
    }

    async createWorkerSession(codeContent, testContent) {
        this.terminateWorkerSession();

        const session = {
            worker: new Worker(this.workerScriptPath),
            timeoutMs: AppConfig.TIMEOUTS.CODE_EXECUTION,
            terminated: false,
        };

        try {
            await this.sendWorkerRequest(session, {
                type: 'INIT',
                codeContent,
                testContent,
                timeoutMs: session.timeoutMs,
            });
            this.activeWorkerSession = session;
            return session;
        } catch (error) {
            session.terminated = true;
            session.worker.terminate();
            throw error;
        }
    }

    runTestCaseInWorkerSession(session, testCaseIndex) {
        return this.sendWorkerRequest(session, {
            type: 'RUN_CASE',
            testCaseIndex,
        });
    }

    sendWorkerRequest(session, payload) {
        return new Promise((resolve, reject) => {
            if (!session || session.terminated) {
                reject(new Error('Worker session is not available'));
                return;
            }

            const { worker, timeoutMs } = session;
            let isSettled = false;

            const cleanup = () => {
                if (!isSettled) {
                    isSettled = true;
                    worker.onmessage = null;
                    worker.onerror = null;
                }
            };

            const timeoutId = setTimeout(() => {
                cleanup();
                session.terminated = true;
                worker.terminate();
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
                session.terminated = true;
                worker.terminate();
                reject(new Error(errorEvent.message || 'Worker execution failed'));
            };

            worker.postMessage(payload);
        });
    }

    terminateWorkerSession() {
        if (this.activeWorkerSession && !this.activeWorkerSession.terminated) {
            this.activeWorkerSession.terminated = true;
            this.activeWorkerSession.worker.terminate();
        }
        this.activeWorkerSession = null;
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
