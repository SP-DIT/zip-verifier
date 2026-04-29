// Progress Management Service
class ProgressManager {
    constructor(domUtils = null) {
        this.container = null;
        this.submissions = [];
        this.domUtils = domUtils || new DOMUtils(document);
        this.onViewFilesCallback = null; // Callback for file viewing
    }

    initialize(submissions, container, onViewFilesCallback = null) {
        if (!container || !submissions) {
            return;
        }

        this.submissions = submissions;
        this.container = container;
        this.onViewFilesCallback = onViewFilesCallback;
        this.render();
    }

    render() {
        const template = this.domUtils.getElementById('progress-dashboard-template');
        if (!template) {
            return;
        }

        const clone = template.content.cloneNode(true);
        if (!clone) {
            return;
        }

        this.domUtils.clearElement(this.container);
        this.container.appendChild(clone);

        this.updateProgress({
            total: this.submissions.length,
            completed: 0,
            failed: 0,
            processing: 0,
            remaining: this.submissions.length,
            percentage: 0,
            submissions: this.submissions,
        });
    }

    updateProgress(progress) {
        // Update progress bar using domUtils
        this.domUtils.updateProgress('progressFill', 'progressText', 'progressPercentage', progress);

        // Calculate detailed statistics for completed submissions
        const completedSubmissions = progress.submissions.filter((s) => s.status === 'completed' && s.results);
        let totalPassed = 0;
        let totalWarnings = 0;
        let totalErrors = 0;

        completedSubmissions.forEach((submission) => {
            const questions = submission.results.questions || {};
            Object.values(questions).forEach((question) => {
                if (question.status === 'passed') {
                    totalPassed++;
                } else if (question.status === 'partial') {
                    totalWarnings++;
                } else if (question.status === 'error') {
                    totalErrors++;
                }
            });
        });

        // Update status counts with detailed breakdown
        const completedElement = this.domUtils.getElementById('completedCount');
        if (completedElement && completedSubmissions.length > 0) {
            const statusParts = [];
            if (totalPassed > 0) statusParts.push(`✅ ${totalPassed}`);
            if (totalWarnings > 0) statusParts.push(`⚠️ ${totalWarnings}`);
            if (totalErrors > 0) statusParts.push(`❌ ${totalErrors}`);
            completedElement.textContent = statusParts.length > 0 ? statusParts.join(' ') : progress.completed;
        } else {
            this.domUtils.setTextContent('completedCount', progress.completed);
        }

        // Update other status counts using domUtils
        this.domUtils.updateCounters({
            failedCount: progress.failed,
            processingCount: progress.processing,
            remainingCount: progress.remaining,
        });

        // Update individual student progress
        this.updateStudentProgress(progress.submissions);
    }

    updateStudentProgress(submissions) {
        const list = this.domUtils.getElementById('studentProgressList');
        if (!list) return;

        this.domUtils.clearElement(list);

        submissions.forEach((submission) => {
            const template = this.domUtils.getElementById('student-progress-item-template');
            if (!template) {
                return;
            }

            const clone = template.content.cloneNode(true);
            if (!clone) {
                return;
            }

            const item = clone.querySelector('.student-progress-item');
            const studentInfo = clone.querySelector('.student-info');
            const name = clone.querySelector('.student-name');
            const status = clone.querySelector('.student-status');
            const summary = clone.querySelector('.student-summary');
            const detailedResults = clone.querySelector('.student-detailed-results');
            const expandBtn = clone.querySelector('.expand-btn');

            // Check if all required elements exist
            const missingElements = [];
            if (!item) missingElements.push('student-progress-item');
            if (!studentInfo) missingElements.push('student-info');
            if (!name) missingElements.push('student-name');
            if (!status) missingElements.push('student-status');
            if (!summary) missingElements.push('student-summary');
            if (!detailedResults) missingElements.push('student-detailed-results');
            if (!expandBtn) missingElements.push('expand-btn');

            if (missingElements.length > 0) {
                return;
            }

            // Set student information
            if (studentInfo && submission.id) {
                studentInfo.setAttribute('data-student-id', submission.id);
            }

            if (name) {
                name.textContent = submission.id || 'Unknown';
            }

            if (status) {
                status.textContent = this.formatStatus(submission.status, submission);
                status.className = `student-status ${submission.status}`;
            }

            // Summary text
            let summaryText = submission.fileName || 'Unknown file';
            if (submission.status === 'completed' && submission.results) {
                summaryText += ` - Score: ${submission.results.percentage || 0}%`;
                const totalQuestions = Object.keys(submission.results.questions || {}).length;
                summaryText += ` (${totalQuestions} questions)`;
            } else if (submission.status === 'error') {
                summaryText += ` - Error: ${submission.error || 'Unknown error'}`;
            }
            if (summary) {
                summary.textContent = summaryText;
            }

            // Only show expand button for completed submissions with results
            if (expandBtn) {
                if (submission.status === 'completed' && submission.results) {
                    expandBtn.style.display = 'flex';
                    expandBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.toggleStudentDetails(submission, detailedResults, expandBtn);
                    });
                } else {
                    expandBtn.style.display = 'none';
                }
            }

            if (list) {
                list.appendChild(clone);
            }
        });
    }

    formatStatus(status, submission = null) {
        const statusMap = {
            pending: '📋 Pending',
            processing: '⏳ Processing',
            error: '❌ Failed',
        };

        if (status === 'completed' && submission && submission.results) {
            const questions = submission.results.questions || {};
            let passed = 0;
            let warnings = 0;
            let errors = 0;

            Object.values(questions).forEach((question) => {
                if (question.status === 'passed') {
                    passed++;
                } else if (question.status === 'partial') {
                    warnings++;
                } else if (question.status === 'error') {
                    errors++;
                }
            });

            const statusParts = [];
            if (passed > 0) statusParts.push(`✅ ${passed}`);
            if (warnings > 0) statusParts.push(`⚠️ ${warnings}`);
            if (errors > 0) statusParts.push(`❌ ${errors}`);

            return statusParts.length > 0 ? statusParts.join(' ') : '✅ Completed';
        }

        return statusMap[status] || status;
    }

    toggleStudentDetails(submission, detailedResults, expandBtn) {
        const isExpanded = expandBtn.getAttribute('data-expanded') === 'true';
        const expandText = expandBtn.querySelector('.expand-text');

        if (isExpanded) {
            detailedResults.style.display = 'none';
            expandBtn.setAttribute('data-expanded', 'false');
            expandText.textContent = 'Details';
        } else {
            this.renderDetailedResults(submission, detailedResults);
            detailedResults.style.display = 'block';
            expandBtn.setAttribute('data-expanded', 'true');
            expandText.textContent = 'Hide';
        }
    }

    renderDetailedResults(submission, container) {
        if (!submission.results || !submission.results.questions) {
            container.innerHTML = '<p>No detailed results available</p>';
            return;
        }

        const template = this.domUtils.getElementById('detailed-results-template');
        const clone = template.content.cloneNode(true);
        const questionResults = clone.querySelector('#questionResults');

        this.domUtils.clearElement(container);
        this.domUtils.clearElement(questionResults);

        // Render each question
        Object.entries(submission.results.questions).forEach(([questionName, questionData]) => {
            const questionTemplate = this.domUtils.getElementById('question-result-template');
            const questionClone = questionTemplate.content.cloneNode(true);

            const questionNameEl = questionClone.querySelector('.question-name');
            const questionScoreEl = questionClone.querySelector('.question-score');
            const passedTestsEl = questionClone.querySelector('.passed-tests');
            const failedTestsEl = questionClone.querySelector('.failed-tests');
            const questionErrorEl = questionClone.querySelector('.question-error');
            const testCaseDetails = questionClone.querySelector('#testCaseDetails');

            // Question header
            questionNameEl.textContent = questionName;

            // Set question data attribute for file viewing
            const viewCodeBtn = questionClone.querySelector('.view-question-code-btn');
            if (viewCodeBtn) {
                viewCodeBtn.setAttribute('data-question', questionName);
                viewCodeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Find the actual DOM element that contains this button
                    const actualQuestionElement = e.target.closest('.question-result');
                    this.toggleQuestionFileViewer(submission.id, questionName, actualQuestionElement);
                });
            }

            // Score and status
            let scoreClass = 'failed';
            let scoreText = 'Failed';
            if (questionData.status === 'passed') {
                scoreClass = 'passed';
                scoreText = `✅ ${questionData.score}/${questionData.maxScore}`;
            } else if (questionData.status === 'partial') {
                scoreClass = 'partial';
                scoreText = `⚠️ ${questionData.score}/${questionData.maxScore}`;
            } else if (questionData.status === 'error') {
                scoreText = '❌ Error';
            } else {
                scoreText = `❌ ${questionData.score}/${questionData.maxScore}`;
            }

            questionScoreEl.textContent = scoreText;
            questionScoreEl.className = `question-score ${scoreClass}`;

            // Test summary
            if (questionData.passed > 0) {
                passedTestsEl.textContent = `✅ ${questionData.passed} passed`;
            } else {
                passedTestsEl.style.display = 'none';
            }

            if (questionData.failed > 0) {
                failedTestsEl.textContent = `❌ ${questionData.failed} failed`;
            } else {
                failedTestsEl.style.display = 'none';
            }

            // Error message
            if (questionData.error) {
                questionErrorEl.textContent = questionData.error;
                questionErrorEl.style.display = 'block';
            }

            // Test case details
            if (questionData.testCases && questionData.testCases.length > 0) {
                const failedTestCases = questionData.testCases.filter((tc) => !tc.passed);
                this.renderFailedTestCases(failedTestCases, testCaseDetails);
            }

            questionResults.appendChild(questionClone);
        });

        container.appendChild(clone);
    }

    toggleQuestionFileViewer(studentId, questionName, questionElement) {
        const fileViewer = questionElement.querySelector('.question-file-viewer');
        const viewCodeBtn = questionElement.querySelector('.view-question-code-btn');

        if (!fileViewer || !viewCodeBtn) {
            return;
        }

        if (fileViewer.style.display === 'none') {
            this.showQuestionCode(studentId, questionName, fileViewer);
            fileViewer.style.display = 'block';
            viewCodeBtn.innerHTML = '<span>🙈 Hide Code</span>';
        } else {
            fileViewer.style.display = 'none';
            viewCodeBtn.innerHTML = '<span>👁️ See Code</span>';
        }
    }

    async showQuestionCode(studentId, questionName, fileViewer) {
        try {
            if (this.onViewFilesCallback && this.onViewFilesCallback.getStudentZip) {
                const studentZip = this.onViewFilesCallback.getStudentZip(studentId);
                if (!studentZip) {
                    this.showQuestionFileError(fileViewer, `No ZIP file found for student ${studentId}`);
                    return;
                }

                // Look for code.js file for this specific question
                const questionPath = questionName.toLowerCase().replace(/[^a-z0-9]/g, ''); // normalize question name
                const codeFiles = Object.values(studentZip.files).filter((file) => {
                    if (file.dir || !file.name.includes('code.js')) return false;

                    // Check if this code file belongs to this question
                    const filePath = file.name.toLowerCase();
                    return (
                        filePath.includes(`/${questionPath}/`) ||
                        filePath.includes(`q${questionName.match(/\d+/) ? questionName.match(/\d+/)[0] : '1'}/`)
                    );
                });

                if (codeFiles.length === 0) {
                    this.showQuestionFileError(fileViewer, `No code.js file found for ${questionName}`);
                    return;
                }

                // Use the first matching code file
                const codeFile = codeFiles[0];
                const content = await codeFile.async('string');

                const contentDisplay = fileViewer.querySelector('.question-file-content-display');
                const header = contentDisplay.querySelector('.content-header');
                const body = contentDisplay.querySelector('.content-body');

                header.innerHTML = `<h6>📄 ${codeFile.name.split('/').pop()}</h6>`;
                body.innerHTML = `<pre><code class="language-javascript">${this.escapeHtml(content)}</code></pre>`;

                // Apply syntax highlighting
                if (typeof hljs !== 'undefined') {
                    const codeBlock = body.querySelector('code');
                    if (codeBlock) {
                        hljs.highlightElement(codeBlock);
                    }
                }
            } else {
                this.showQuestionFileError(fileViewer, 'File viewing functionality not available');
            }
        } catch (error) {
            this.showQuestionFileError(fileViewer, `Error loading file: ${error.message}`);
        }
    }

    showQuestionFileError(fileViewer, message) {
        const contentDisplay = fileViewer.querySelector('.question-file-content-display');
        const header = contentDisplay.querySelector('.content-header');
        const body = contentDisplay.querySelector('.content-body');

        header.innerHTML = '<h6>❌ Error</h6>';
        body.innerHTML = `<p class="error-message">${message}</p>`;
    }

    escapeHtml(text) {
        const div = this.domUtils.document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderFailedTestCases(failedTestCases, testCaseDetails) {
        failedTestCases.forEach((testCase) => {
            if (testCase.isPublic) {
                // Create test case header
                const headerTemplate = this.domUtils.getElementById('test-case-template');
                const headerClone = headerTemplate.content.cloneNode(true);
                const headerDiv = headerClone.querySelector('.test-case');
                headerDiv.classList.add('test-failed');

                const headerText = this.domUtils.createElement('strong');
                headerText.textContent = `Test ${testCase.index}: Wrong Answer`;
                headerDiv.appendChild(headerText);
                testCaseDetails.appendChild(headerClone);

                // Create test details
                const detailsTemplate = this.domUtils.getElementById('test-case-details-template');
                const detailsClone = detailsTemplate.content.cloneNode(true);

                detailsClone.querySelector('.input-value').textContent = this.formatTestValue(testCase.input);
                detailsClone.querySelector('.expected-value').textContent = this.formatTestValue(testCase.expected);

                const outputValue = testCase.error
                    ? `Runtime Error: ${testCase.error}`
                    : this.formatTestValue(testCase.actual);
                detailsClone.querySelector('.output-value').textContent = outputValue;

                testCaseDetails.appendChild(detailsClone);
            } else {
                // Show header for private test cases without details
                const headerTemplate = this.domUtils.getElementById('test-case-template');
                const headerClone = headerTemplate.content.cloneNode(true);
                const headerDiv = headerClone.querySelector('.test-case');
                headerDiv.classList.add('test-failed');

                const headerText = this.domUtils.createElement('strong');
                headerText.textContent = `Test ${testCase.index}: Wrong Answer`;
                headerDiv.appendChild(headerText);
                headerDiv.appendChild(this.domUtils.document.createTextNode(' (Hidden test case)'));
                testCaseDetails.appendChild(headerClone);
            }
        });
    }

    formatTestValue(value) {
        if (Array.isArray(value)) {
            return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
        }
        return JSON.stringify(value);
    }
}
