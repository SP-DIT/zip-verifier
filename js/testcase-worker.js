importScripts('shared/testcase-runtime.js');

let state = {
    initialized: false,
    testcases: [],
    options: {},
    executableFn: null,
};

// Web Worker: execute a single testcase in isolation.
self.onmessage = (event) => {
    const { type } = event.data || {};

    try {
        if (type === 'INIT') {
            handleInit(event.data || {});
            self.postMessage({ success: true, result: { initialized: true } });
            return;
        }

        if (type === 'RUN_CASE') {
            const result = handleRunCase(event.data || {});
            self.postMessage({
                success: true,
                result,
            });
            return;
        }

        throw new Error(`Unsupported worker message type: ${type}`);
    } catch (error) {
        self.postMessage({
            success: false,
            error: error && error.message ? error.message : 'Unknown worker error',
        });
    }
};

function handleInit(payload) {
    const { codeContent, testContent, timeoutMs = 2000 } = payload;

    const testModuleResult = self.TestcaseRuntime.parseTestModule(testContent);
    if (!testModuleResult.success) {
        throw new Error(`Failed to parse test cases: ${testModuleResult.error}`);
    }

    const { testcases = [], options = {} } = testModuleResult.data || {};
    const parsedCode = self.TestcaseRuntime.parseCodeModule(codeContent, timeoutMs, { instrumentLoops: true });
    if (!parsedCode.success) {
        throw new Error(`Failed to parse student code: ${parsedCode.error}`);
    }

    const executableFn = self.TestcaseRuntime.applyMonkeyPatchIfNeeded(parsedCode.fn, options);

    state = {
        initialized: true,
        testcases,
        options,
        executableFn,
    };
}

function handleRunCase(payload) {
    const { testCaseIndex } = payload;

    if (!state.initialized) {
        throw new Error('Worker has not been initialized');
    }

    if (!Number.isInteger(testCaseIndex) || testCaseIndex < 0 || testCaseIndex >= state.testcases.length) {
        throw new Error(`Invalid testcase index: ${testCaseIndex}`);
    }

    const testCase = state.testcases[testCaseIndex];
    return self.TestcaseRuntime.executePreparedTestCase(state.executableFn, testCase, state.options);
}
