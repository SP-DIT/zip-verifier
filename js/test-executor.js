// Test Executor Module
class TestExecutor {
    constructor(consoleManager) {
        this.consoleManager = consoleManager;
    }

    executeTests(codeContent, testContent) {
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

            const codeFunction = this.parseCodeModule(codeContent);
            if (!codeFunction.success) {
                return { error: `Failed to parse student code: ${codeFunction.error}` };
            }

            const { testcases, options = {} } = testModule.data;

            testcases.forEach((testCase, index) => {
                try {
                    const { input, expected, isPublic, description } = testCase;

                    // Monkey patch console.log during test execution
                    this.consoleManager.silence();

                    let result;
                    try {
                        result = codeFunction.fn(...input);
                    } finally {
                        // Always restore original console.log
                        this.consoleManager.restore();
                    }

                    const passed = this.compareResults(result, expected, options);

                    testResults.testCases.push({
                        index: index + 1,
                        passed,
                        input,
                        expected,
                        actual: result,
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
                        expected: testCase.expected,
                        actual: null,
                        isPublic: testCase.isPublic,
                        description: testCase.description,
                        error: error.message,
                    });
                    testResults.failed++;
                }
            });

            return testResults;
        } catch (error) {
            return { error: `Test execution failed: ${error.message}` };
        }
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

            const executionCode = `
                ${codeWithoutExports}
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
