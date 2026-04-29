// Assignment Grader Module
class AssignmentGrader {
    constructor(testExecutor, fileUtils, document) {
        this.testExecutor = testExecutor;
        this.fileUtils = fileUtils;
        this.document = document;
        this.currentZip = null;
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
        this.currentZip = zip; // Store zip reference for file viewing
        const testResults = this.document.getElementById('testResults');
        this.setLoadingStatus(testResults, '🔍 Analyzing assignment structure...');

        const structureAnalysis = this.analyzeZipStructure(zip);

        if (!structureAnalysis.valid) {
            this.displayStructureError(testResults, structureAnalysis);
            return;
        }

        const assignmentStructure = this.extractAssignmentStructure(zip);

        if (assignmentStructure.length === 0) {
            this.setErrorStatus(testResults, '❌ No valid assignment structure found');
            return;
        }

        this.setLoadingStatus(testResults, '🧪 Running tests...');
        this.runAllTests(zip, assignmentStructure);
    }

    displayStructureError(container, analysis) {
        const template = this.document.getElementById('structure-error-template');
        const clone = template.content.cloneNode(true);

        clone.querySelector('.error-message').textContent = analysis.error;
        clone.querySelector('.error-suggestion').textContent = analysis.suggestion;

        const pathsList = clone.querySelector('.detected-paths');

        if (analysis.detectedPaths) {
            this.clearElement(pathsList);
            analysis.detectedPaths.forEach((path) => {
                const pathTemplate = this.document.getElementById('error-path-item-template');
                const pathClone = pathTemplate.content.cloneNode(true);
                pathClone.querySelector('.code-path').textContent = path;
                pathsList.appendChild(pathClone);
            });
        } else {
            clone.querySelector('.structure-comparison').style.display = 'none';
        }

        this.clearElement(container);
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
        this.clearElement(questionsList);

        assignmentStructure.forEach((item) => {
            const questionTemplate = this.document.getElementById('question-item-template');
            const questionClone = questionTemplate.content.cloneNode(true);
            questionClone.querySelector('.question-item').textContent = `${item.problemSet}/${item.question}`;
            questionsList.appendChild(questionClone);
        });

        clone.querySelector('.total-questions').textContent = assignmentStructure.length;

        this.clearElement(testResults);
        testResults.appendChild(clone);

        for (const item of assignmentStructure) {
            const resultTemplate = this.document.getElementById('test-result-container-template');
            const resultClone = resultTemplate.content.cloneNode(true);

            const header = resultClone.querySelector('.test-header');
            header.textContent = `${item.problemSet}/${item.question}`;

            const content = resultClone.querySelector('.test-content');
            content.id = `tests-${item.question}`;
            content.textContent = 'Running tests...';

            // Setup View Files button
            const viewFilesBtn = resultClone.querySelector('.btn--view-files');
            const fileViewer = resultClone.querySelector('.test-file-viewer');
            const fileList = resultClone.querySelector('.file-list');

            viewFilesBtn.onclick = () => {
                if (fileViewer.style.display === 'none') {
                    this.showFilesForQuestion(item, fileList, fileViewer);
                    fileViewer.style.display = 'block';
                    viewFilesBtn.innerHTML = '<span class="btn-icon">🙈</span> Hide Files';
                } else {
                    fileViewer.style.display = 'none';
                    viewFilesBtn.innerHTML = '<span class="btn-icon">👁️</span> View Files';
                }
            };

            testResults.appendChild(resultClone);
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
            this.setErrorCase(container, `Error: ${error.message}`);
        }
    }

    displayTestResults(container, results) {
        if (results.error) {
            this.setErrorCase(container, `❌ ${results.error}`);
            return;
        }

        this.clearElement(container);

        const totalTests = results.passed + results.failed;

        // Create main result status
        const statusTemplate = this.document.getElementById('test-case-template');
        const statusClone = statusTemplate.content.cloneNode(true);
        const statusDiv = statusClone.querySelector('.test-case');

        if (results.failed === 0) {
            statusDiv.classList.add('test-passed');
            const statusText = this.document.createElement('strong');
            statusText.textContent = '✅ Accepted';
            statusDiv.appendChild(statusText);
            statusDiv.appendChild(this.document.createTextNode(` (${totalTests}/${totalTests} test cases passed)`));
        } else {
            statusDiv.classList.add('test-failed');
            const statusText = this.document.createElement('strong');
            statusText.textContent = '❌ Wrong Answer';
            statusDiv.appendChild(statusText);
            statusDiv.appendChild(this.document.createTextNode(` (${results.passed}/${totalTests} test cases passed)`));
        }

        container.appendChild(statusClone);

        // Display failed test details
        const failedTests = results.testCases.filter((tc) => !tc.passed);
        if (failedTests.length > 0) {
            const detailsContainer = this.document.createElement('div');
            detailsContainer.className = 'mt-15';

            failedTests.forEach((testCase) => {
                // Create test case header
                const headerTemplate = this.document.getElementById('test-case-template');
                const headerClone = headerTemplate.content.cloneNode(true);
                const headerDiv = headerClone.querySelector('.test-case');
                headerDiv.classList.add('test-failed');

                if (testCase.isPublic) {
                    const headerText = this.document.createElement('strong');
                    headerText.textContent = `Test ${testCase.index}: Wrong Answer`;
                    headerDiv.appendChild(headerText);
                    detailsContainer.appendChild(headerClone);

                    // Create test details
                    const detailsTemplate = this.document.getElementById('test-case-details-template');
                    const detailsClone = detailsTemplate.content.cloneNode(true);

                    detailsClone.querySelector('.input-value').textContent = this.fileUtils.formatTestValue(
                        testCase.input,
                    );
                    detailsClone.querySelector('.expected-value').textContent = this.fileUtils.formatTestValue(
                        testCase.expected,
                    );

                    const outputValue = testCase.error
                        ? `Runtime Error: ${testCase.error}`
                        : this.fileUtils.formatTestValue(testCase.actual);
                    detailsClone.querySelector('.output-value').textContent = outputValue;

                    detailsContainer.appendChild(detailsClone);
                } else {
                    const headerText = this.document.createElement('strong');
                    headerText.textContent = `Test ${testCase.index}: Wrong Answer`;
                    headerDiv.appendChild(headerText);
                    headerDiv.appendChild(this.document.createTextNode(' (Hidden test case)'));
                    detailsContainer.appendChild(headerClone);
                }
            });

            container.appendChild(detailsContainer);
        }
    }

    // Utility methods for template operations
    clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    setLoadingStatus(container, message) {
        const template = this.document.getElementById('loading-status-template');
        const clone = template.content.cloneNode(true);
        clone.querySelector('.loading-status').textContent = message;

        this.clearElement(container);
        container.appendChild(clone);
    }

    setErrorStatus(container, message) {
        const template = this.document.getElementById('message-template');
        const clone = template.content.cloneNode(true);
        const messageDiv = clone.querySelector('.message');
        messageDiv.classList.add('message--error');
        messageDiv.textContent = message;

        this.clearElement(container);
        container.appendChild(clone);
    }

    setErrorCase(container, message) {
        const template = this.document.getElementById('test-case-template');
        const clone = template.content.cloneNode(true);
        const caseDiv = clone.querySelector('.test-case');
        caseDiv.classList.add('test-error');
        caseDiv.textContent = message;

        this.clearElement(container);
        container.appendChild(clone);
    }

    showFilesForQuestion(item, fileList, fileViewer) {
        // Clear previous content
        this.clearElement(fileList);

        // Only show code.js files for this question
        const codeFile = item.codeFile;

        // Create file item
        const fileItem = this.document.createElement('div');
        fileItem.className = 'file-item file-item--code';

        const icon = this.document.createElement('span');
        icon.className = 'file-icon';
        icon.textContent = '📄';

        const name = this.document.createElement('span');
        name.className = 'file-name';
        name.textContent = codeFile.split('/').pop(); // Just show filename

        const viewBtn = this.document.createElement('button');
        viewBtn.className = 'btn btn--small btn--view-code';
        viewBtn.innerHTML = '👁️ View';
        viewBtn.onclick = () => this.viewCodeFile(codeFile, fileViewer);

        fileItem.appendChild(icon);
        fileItem.appendChild(name);
        fileItem.appendChild(viewBtn);

        fileList.appendChild(fileItem);
    }

    async viewCodeFile(filePath, fileViewer) {
        try {
            const file = this.currentZip.file(filePath);
            if (!file) {
                this.showFileError(fileViewer, 'File not found in ZIP archive.');
                return;
            }

            const content = await file.async('string');
            const contentDisplay = fileViewer.querySelector('.file-content-display');
            const header = contentDisplay.querySelector('.content-header');
            const body = contentDisplay.querySelector('.content-body');

            header.innerHTML = `<h5>📄 ${filePath.split('/').pop()}</h5>`;

            // Format code content
            body.innerHTML = `<pre><code class="language-javascript">${this.escapeHtml(content)}</code></pre>`;

            contentDisplay.style.display = 'block';
        } catch (error) {
            this.showFileError(fileViewer, `Error loading file: ${error.message}`);
        }
    }

    showFileError(fileViewer, message) {
        const contentDisplay = fileViewer.querySelector('.file-content-display');
        const header = contentDisplay.querySelector('.content-header');
        const body = contentDisplay.querySelector('.content-body');

        header.innerHTML = '<h5>❌ Error</h5>';
        body.innerHTML = `<p class="error-message">${message}</p>`;
        contentDisplay.style.display = 'block';
    }

    escapeHtml(text) {
        const div = this.document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
