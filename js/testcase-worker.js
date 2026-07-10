importScripts('shared/testcase-runtime.js');

// Web Worker: execute a single testcase in isolation.
self.onmessage = (event) => {
    const { codeContent, testContent, testCaseIndex, timeoutMs = 2000 } = event.data || {};

    try {
        const testModuleResult = self.TestcaseRuntime.parseTestModule(testContent);
        if (!testModuleResult.success) {
            throw new Error(`Failed to parse test cases: ${testModuleResult.error}`);
        }

        const { testcases = [], options = {} } = testModuleResult.data || {};
        if (!Number.isInteger(testCaseIndex) || testCaseIndex < 0 || testCaseIndex >= testcases.length) {
            throw new Error(`Invalid testcase index: ${testCaseIndex}`);
        }

        const testCase = testcases[testCaseIndex];
        const result = self.TestcaseRuntime.executeSingleTestCase(codeContent, testCase, options, timeoutMs);
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
