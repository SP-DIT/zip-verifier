// Assignment Grader Module
class AssignmentGrader {
    constructor(testExecutor, fileUtils, document) {
        this.testExecutor = testExecutor;
        this.fileUtils = fileUtils;
        this.document = document;
    }

    detectAssignmentStructure(zip) {
        const files = Object.keys(zip.files);
        const hasCodeFiles = files.some((file) => file.includes('code.js'));
        const hasTestFiles = files.some((file) => file.includes('testcases.js'));
        const hasQuestionFolders = files.some((file) => /\/q\d+\//.test(file));
        return hasCodeFiles && hasTestFiles && hasQuestionFolders;
    }

    analyzeZipStructure(zip) {
        const files = Object.keys(zip.files);

        const hasCodeFiles = files.some((file) => file.includes('code.js'));
        const hasTestFiles = files.some((file) => file.includes('testcases.js'));
        const hasQuestionFolders = files.some((file) => /\/q\d+\//.test(file));

        const codeFilePaths = files.filter((file) => file.includes('code.js'));
        const testFilePaths = files.filter((file) => file.includes('testcases.js'));

        if (hasCodeFiles && hasTestFiles) {
            const extraNested = codeFilePaths.some((path) => {
                const depth = path.split('/').length;
                return depth > 3;
            });

            if (extraNested) {
                return {
                    valid: false,
                    error: 'ZIP structure has extra folder levels',
                    suggestion:
                        'Please zip the assignment folder directly (e.g., 5MockMSTSetA.zip) without additional parent folders',
                    detectedPaths: codeFilePaths.slice(0, 3),
                };
            }

            const correctStructure = codeFilePaths.some((path) => {
                return /\d+[A-Z].*\/q\d+\/code\.js$/.test(path);
            });

            if (!correctStructure) {
                return {
                    valid: false,
                    error: 'ZIP structure does not match expected format',
                    suggestion: 'Expected structure: ProblemSetName/q1/code.js, ProblemSetName/q1/testcases.js',
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
        clone.querySelector('.error-suggestion').textContent = analysis.suggestion;

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

        const problemSetFolders = [
            ...new Set(files.filter((file) => /\d+[A-Z].*\/q\d+\//.test(file)).map((file) => file.split('/')[0])),
        ];

        problemSetFolders.forEach((problemSet) => {
            const questions = [
                ...new Set(
                    files
                        .filter((file) => file.startsWith(problemSet + '/q'))
                        .map((file) => {
                            const parts = file.split('/');
                            return parts.length >= 2 ? parts[1] : null;
                        })
                        .filter((q) => q && q.startsWith('q')),
                ),
            ];

            questions.forEach((question) => {
                const codeFile = `${problemSet}/${question}/code.js`;
                const testFile = `${problemSet}/${question}/testcases.js`;

                if (files.includes(codeFile) && files.includes(testFile)) {
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
