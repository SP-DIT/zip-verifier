// Assignment Grader Module
class AssignmentGrader {
    constructor(testExecutor, fileUtils, document) {
        this.testExecutor = testExecutor;
        this.fileUtils = fileUtils;
        this.document = document;
    }

    // Normalize paths to use forward slashes for consistent processing
    normalizePath(path) {
        return path.replace(/\\/g, '/');
    }

    // Create regex pattern that matches both / and \ path separators
    createPathRegex(pattern) {
        return new RegExp(pattern.replace(/\//g, '[/\\\\]'));
    }

    // Detect if there's an extra parent folder containing all assignment files
    detectExtraFolder(zip) {
        const files = Object.keys(zip.files);
        const assignmentFiles = files.filter((file) => file.includes('code.js') || file.includes('testcases.js'));

        if (assignmentFiles.length === 0) {
            return '';
        }

        // Get all normalized paths
        const normalizedPaths = assignmentFiles.map((file) => this.normalizePath(file));

        // Check if all paths start with the same folder
        const firstPath = normalizedPaths[0];
        const pathParts = firstPath.split('/');

        // If already at root level (depth <= 3), no extra folder
        if (pathParts.length <= 3) {
            return '';
        }

        // Check if all paths share the same first folder
        const potentialBaseFolder = pathParts[0];
        const allShareSameBase = normalizedPaths.every((path) => path.startsWith(potentialBaseFolder + '/'));

        if (allShareSameBase) {
            // Verify that removing this folder gives us valid structure
            const strippedPaths = normalizedPaths.map((path) => path.substring(potentialBaseFolder.length + 1));

            // Check if stripped paths match expected structure
            const correctStructureRegex = this.createPathRegex('\\d+[A-Z].*/q\\d+/(code|testcases)\\.js$');
            const hasValidStructure = strippedPaths.some((path) => correctStructureRegex.test(path));

            if (hasValidStructure) {
                return potentialBaseFolder + '/';
            }
        }

        return '';
    }

    detectAssignmentStructure(zip) {
        const files = Object.keys(zip.files);
        const hasCodeFiles = files.some((file) => file.includes('code.js'));
        const hasTestFiles = files.some((file) => file.includes('testcases.js'));
        const questionFolderRegex = this.createPathRegex('/q\\d+/');
        const hasQuestionFolders = files.some((file) => questionFolderRegex.test(file));
        return hasCodeFiles && hasTestFiles && hasQuestionFolders;
    }

    analyzeZipStructure(zip) {
        const files = Object.keys(zip.files);

        const hasCodeFiles = files.some((file) => file.includes('code.js'));
        const hasTestFiles = files.some((file) => file.includes('testcases.js'));
        const questionFolderRegex = this.createPathRegex('/q\\d+/');
        const hasQuestionFolders = files.some((file) => questionFolderRegex.test(file));

        const codeFilePaths = files.filter((file) => file.includes('code.js'));
        const testFilePaths = files.filter((file) => file.includes('testcases.js'));

        if (hasCodeFiles && hasTestFiles) {
            // Detect if there's an extra parent folder
            const baseFolder = this.detectExtraFolder(zip);

            // Create paths for validation (strip base folder if present)
            const validationPaths = codeFilePaths.map((path) => {
                const normalizedPath = this.normalizePath(path);
                return baseFolder ? normalizedPath.substring(baseFolder.length) : normalizedPath;
            });

            const correctStructureRegex = this.createPathRegex('\\d+[A-Z].*/q\\d+/code\\.js$');

            const correctStructure = validationPaths.some((path) => {
                return correctStructureRegex.test(path);
            });

            if (!correctStructure) {
                return {
                    valid: false,
                    error: 'ZIP structure does not match expected format',
                    suggestion:
                        'Expected structure: ProblemSetName/q1/code.js, ProblemSetName/q1/testcases.js (optionally within an extra folder)',
                    detectedPaths: codeFilePaths.slice(0, 3),
                };
            }
        }

        if (!hasCodeFiles && !hasTestFiles) {
            return {
                valid: false,
                error: 'No assignment files found',
                suggestion: 'Please upload a ZIP file containing your assignment with code.js and testcases.js files',
            };
        }

        if (!hasCodeFiles) {
            return {
                valid: false,
                error: 'No code.js files found',
                suggestion: 'Make sure your ZIP contains code.js files for each question',
            };
        }

        if (!hasTestFiles) {
            return {
                valid: false,
                error: 'No testcases.js files found',
                suggestion: 'Make sure your ZIP contains testcases.js files for each question',
            };
        }

        return { valid: true };
    }

    runTestsOnAssignment(zip) {
        const testResults = this.document.getElementById('testResults');
        testResults.innerHTML = '<p>🔍 Analyzing assignment structure...</p>';

        const structureAnalysis = this.analyzeZipStructure(zip);

        if (!structureAnalysis.valid) {
            this.displayStructureError(testResults, structureAnalysis);
            return;
        }

        const assignmentStructure = this.extractAssignmentStructure(zip);

        if (assignmentStructure.length === 0) {
            testResults.innerHTML = '<p class="message message--error">❌ No valid assignment structure found</p>';
            return;
        }

        testResults.innerHTML = '<p>🧪 Running tests...</p>';
        this.runAllTests(zip, assignmentStructure);
    }

    displayStructureError(container, analysis) {
        const template = this.document.getElementById('structure-error-template');
        const clone = template.content.cloneNode(true);

        clone.querySelector('.error-message').textContent = analysis.error;

        const pathsList = clone.querySelector('.detected-paths');
        const expectedList = clone.querySelector('.expected-paths');

        if (analysis.detectedPaths) {
            pathsList.innerHTML = '';
            analysis.detectedPaths.forEach((path) => {
                const li = this.document.createElement('li');
                li.innerHTML = `<code class="code-path code-path--error">${path}</code>`;
                pathsList.appendChild(li);
            });
        } else {
            clone.querySelector('.structure-comparison').style.display = 'none';
        }

        container.innerHTML = '';
        container.appendChild(clone);
    }

    extractAssignmentStructure(zip) {
        const files = Object.keys(zip.files);
        const structure = [];

        // Detect base folder that should be stripped
        const baseFolder = this.detectExtraFolder(zip);

        const problemSetRegex = this.createPathRegex('\\d+[A-Z].*/q\\d+/');

        const problemSetFolders = [
            ...new Set(
                files
                    .filter((file) => problemSetRegex.test(file))
                    .map((file) => {
                        const normalizedPath = this.normalizePath(file);
                        // Strip base folder if present
                        const workingPath = baseFolder ? normalizedPath.substring(baseFolder.length) : normalizedPath;
                        return workingPath.split('/')[0];
                    }),
            ),
        ];

        problemSetFolders.forEach((problemSet) => {
            const questions = [
                ...new Set(
                    files
                        .filter((file) => {
                            const normalizedFile = this.normalizePath(file);
                            // Strip base folder if present for matching
                            const workingPath = baseFolder
                                ? normalizedFile.substring(baseFolder.length)
                                : normalizedFile;
                            return workingPath.startsWith(problemSet + '/q');
                        })
                        .map((file) => {
                            const normalizedFile = this.normalizePath(file);
                            // Strip base folder if present
                            const workingPath = baseFolder
                                ? normalizedFile.substring(baseFolder.length)
                                : normalizedFile;
                            const parts = workingPath.split('/');
                            return parts.length >= 2 ? parts[1] : null;
                        })
                        .filter((q) => q && q.startsWith('q')),
                ),
            ];

            questions.forEach((question) => {
                // Build possible file paths with base folder
                const basePath = baseFolder || '';
                const possibleCodeFiles = [
                    `${basePath}${problemSet}/${question}/code.js`,
                    `${basePath}${problemSet}\\${question}\\code.js`,
                ];
                const possibleTestFiles = [
                    `${basePath}${problemSet}/${question}/testcases.js`,
                    `${basePath}${problemSet}\\${question}\\testcases.js`,
                ];

                const codeFile = possibleCodeFiles.find((f) => files.includes(f));
                const testFile = possibleTestFiles.find((f) => files.includes(f));

                if (codeFile && testFile) {
                    structure.push({
                        problemSet,
                        question,
                        codeFile,
                        testFile,
                    });
                }
            });
        });

        return structure;
    }

    async runAllTests(zip, assignmentStructure) {
        const testResults = this.document.getElementById('testResults');

        const template = this.document.getElementById('assignment-summary-template');
        const clone = template.content.cloneNode(true);

        const questionsList = clone.querySelector('.questions-list');
        questionsList.innerHTML = '';

        assignmentStructure.forEach((item) => {
            const li = this.document.createElement('li');
            li.textContent = `${item.problemSet}/${item.question}`;
            questionsList.appendChild(li);
        });

        clone.querySelector('.total-questions').textContent = assignmentStructure.length;

        testResults.innerHTML = '';
        testResults.appendChild(clone);

        for (const item of assignmentStructure) {
            const resultDiv = this.document.createElement('div');
            resultDiv.className = 'test-result';
            resultDiv.innerHTML = `
                <div class="test-header">${item.problemSet}/${item.question}</div>
                <div id="tests-${item.question}">Running tests...</div>
            `;
            testResults.appendChild(resultDiv);
        }

        for (const item of assignmentStructure) {
            await this.runTestsForQuestion(zip, item);
        }
    }

    async runTestsForQuestion(zip, item) {
        const container = this.document.getElementById(`tests-${item.question}`);

        try {
            const codeContent = await zip.file(item.codeFile).async('string');
            const testContent = await zip.file(item.testFile).async('string');

            const results = this.testExecutor.executeTests(codeContent, testContent);
            this.displayTestResults(container, results);
        } catch (error) {
            container.innerHTML = `<div class="test-case test-error">Error: ${error.message}</div>`;
        }
    }

    displayTestResults(container, results) {
        if (results.error) {
            container.innerHTML = `<div class="test-case test-error">❌ ${results.error}</div>`;
            return;
        }

        let html = '';

        const totalTests = results.passed + results.failed;
        if (results.failed === 0) {
            html += `<div class="test-case test-passed">
                <strong>✅ Accepted</strong> (${totalTests}/${totalTests} test cases passed)
            </div>`;
        } else {
            html += `<div class="test-case test-failed">
                <strong>❌ Wrong Answer</strong> (${results.passed}/${totalTests} test cases passed)
            </div>`;
        }

        const failedTests = results.testCases.filter((tc) => !tc.passed);
        if (failedTests.length > 0) {
            html += `<div class="mt-15">`;

            failedTests.forEach((testCase) => {
                if (testCase.isPublic) {
                    html += `<div class="test-case test-failed">
                        <strong>Test ${testCase.index}: Wrong Answer</strong>
                    </div>`;

                    html += `<div class="test-case test-case--details">
                        <div><strong>Input:</strong> <code>${this.fileUtils.formatTestValue(
                            testCase.input,
                        )}</code></div>
                        <div><strong>Expected:</strong> <code>${this.fileUtils.formatTestValue(
                            testCase.expected,
                        )}</code></div>
                        <div><strong>Your output:</strong> <code>${
                            testCase.error
                                ? `Runtime Error: ${testCase.error}`
                                : this.fileUtils.formatTestValue(testCase.actual)
                        }</code></div>
                    </div>`;
                } else {
                    html += `<div class="test-case test-failed">
                        <strong>Test ${testCase.index}: Wrong Answer</strong> (Hidden test case)
                    </div>`;
                }
            });

            html += `</div>`;
        }

        container.innerHTML = html;
    }
}
