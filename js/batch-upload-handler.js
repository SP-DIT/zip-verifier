// Batch Upload Handler Module
class BatchUploadHandler {
    constructor(document, console, FileReader, JSZip) {
        this.document = document;
        this.console = console;
        this.FileReader = FileReader;
        this.JSZip = JSZip;
        this.batchProcessor = new BatchProcessor();
        this.progressManager = new ProgressManager();
        this.resultsExporter = new ResultsExporter();
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop();
    }

    bindEvents() {
        const submitForm = this.document.getElementById('bulkSubmitFile');
        const exportCSVBtn = this.document.getElementById('exportCSV');
        const exportJSONBtn = this.document.getElementById('exportJSON');

        submitForm.addEventListener('submit', (event) => this.handleSubmit(event));
        exportCSVBtn.addEventListener('click', () => this.exportResults('csv'));
        exportJSONBtn.addEventListener('click', () => this.exportResults('json'));
    }

    setupDragAndDrop() {
        const uploadSection = this.document.querySelector('.upload-section');

        uploadSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadSection.classList.add('upload-section--dragover');
        });

        uploadSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('upload-section--dragover');
        });

        uploadSection.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('upload-section--dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (this.isValidZipFile(file)) {
                    this.document.getElementById('bulkFileInput').files = files;
                    this.readBulkZipFile(file);
                } else {
                    this.showError('Please drop a valid ZIP file.');
                }
            }
        });
    }

    handleSubmit(event) {
        event.preventDefault();

        const fileInput = this.document.getElementById('bulkFileInput');
        if (fileInput.files.length === 0) {
            this.showError('Please select a ZIP file to upload.');
            return;
        }

        const file = fileInput.files[0];

        if (!this.isValidZipFile(file)) {
            this.showError('Please select a valid ZIP file.');
            return;
        }

        this.readBulkZipFile(file);
    }

    isValidZipFile(file) {
        return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
    }

    async readBulkZipFile(file) {
        this.showLoading(true);
        this.hideProgress();
        this.hideResults();

        const reader = new this.FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const bulkZip = await this.JSZip.loadAsync(arrayBuffer);

                this.showLoading(false);
                this.showSuccess(`Successfully loaded bulk ZIP file: ${file.name}`);

                await this.processBulkSubmissions(bulkZip);
            } catch (error) {
                this.showLoading(false);
                this.showError(`Failed to read ZIP file: ${error.message}`);
                this.console.error('Bulk ZIP reading error:', error);
            }
        };

        reader.onerror = () => {
            this.showLoading(false);
            this.showError('Failed to read the selected file.');
        };

        reader.readAsArrayBuffer(file);
    }

    async processBulkSubmissions(bulkZip) {
        try {
            // Clear previous results
            this.clearPreviousResults();

            // Extract individual student submissions
            this.showLoading(true, 'Extracting student submissions...');

            const submissions = await this.batchProcessor.extractStudentSubmissions(bulkZip);

            if (submissions.length === 0) {
                this.showError('No student ZIP files found in the bulk submission.');
                return;
            }

            this.showSuccess(`Found ${submissions.length} student submissions. Starting processing...`);
            this.showLoading(false);

            // Add submissions to processor
            this.batchProcessor.addSubmissions(submissions);

            // Initialize progress tracking
            this.progressManager.initialize(submissions, this.document.getElementById('batchProgress'));
            this.showProgress();

            // Start processing
            await this.batchProcessor.processAll((progress) => {
                this.progressManager.updateProgress(progress);
            });

            // Show results
            this.displayResults();
            this.showResults();
        } catch (error) {
            this.showLoading(false);
            this.showError(`Failed to process bulk submissions: ${error.message}`);
            this.console.error('Bulk processing error:', error);
        }
    }

    displayResults() {
        const results = this.batchProcessor.getResults();
        const stats = this.batchProcessor.getSummaryStats();

        // Display summary
        this.displaySummaryStats(stats);

        // Enable export buttons
        this.document.getElementById('exportCSV').disabled = false;
        this.document.getElementById('exportJSON').disabled = false;

        this.showSuccess(`Batch processing completed! Processed ${stats.total} submissions.`);
    }

    displaySummaryStats(stats) {
        const summaryContainer = this.document.getElementById('resultsSummary');
        const template = this.document.getElementById('results-summary-template');
        const clone = template.content.cloneNode(true);

        clone.querySelector('#totalSubmissions').textContent = stats.total;
        clone.querySelector('#successfulSubmissions').textContent = stats.successful;
        clone.querySelector('#failedSubmissions').textContent = stats.failed;
        clone.querySelector('#averageScore').textContent = `${stats.averageScore}%`;

        this.clearElement(summaryContainer);
        summaryContainer.appendChild(clone);
    }

    exportResults(format) {
        const results = this.batchProcessor.getResults();

        if (format === 'csv') {
            this.resultsExporter.exportToCSV(Array.from(results.values()));
        } else if (format === 'json') {
            this.resultsExporter.exportToJSON(Array.from(results.values()));
        }
    }

    // UI Helper Methods
    showError(message) {
        const errorDiv = this.document.getElementById('bulkErrorMessage');
        const template = this.document.getElementById('message-template');
        const clone = template.content.cloneNode(true);

        const messageDiv = clone.querySelector('.message');
        messageDiv.classList.add('message--error');
        messageDiv.textContent = `❌ ${message}`;

        this.clearElement(errorDiv);
        errorDiv.appendChild(clone);

        setTimeout(() => {
            this.clearElement(errorDiv);
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = this.document.getElementById('bulkSuccessMessage');
        const template = this.document.getElementById('message-template');
        const clone = template.content.cloneNode(true);

        const messageDiv = clone.querySelector('.message');
        messageDiv.classList.add('message--success');
        messageDiv.textContent = `✅ ${message}`;

        this.clearElement(successDiv);
        successDiv.appendChild(clone);

        setTimeout(() => {
            this.clearElement(successDiv);
        }, 3000);
    }

    showLoading(show, message = 'Processing bulk submissions...') {
        const loading = this.document.getElementById('bulkLoading');
        const uploadBtn = this.document.getElementById('bulkUploadBtn');

        if (show) {
            loading.classList.add('loading--visible');
            loading.textContent = `📖 ${message}`;
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Processing...';
        } else {
            loading.classList.remove('loading--visible');
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Process Bulk Submissions';
        }
    }

    showProgress() {
        const container = this.document.getElementById('batchProgressContainer');
        container.classList.add('batch-progress--visible');
    }

    hideProgress() {
        const container = this.document.getElementById('batchProgressContainer');
        container.classList.remove('batch-progress--visible');
    }

    showResults() {
        const container = this.document.getElementById('batchResultsContainer');
        container.classList.add('batch-results--visible');
    }

    hideResults() {
        const container = this.document.getElementById('batchResultsContainer');
        container.classList.remove('batch-results--visible');
    }

    clearPreviousResults() {
        // Hide previous progress and results
        this.hideProgress();
        this.hideResults();

        // Clear progress container content
        const progressContainer = this.document.getElementById('batchProgress');
        if (progressContainer) {
            this.clearElement(progressContainer);
        }

        // Clear results container content
        const resultsContainer = this.document.getElementById('resultsSummary');
        if (resultsContainer) {
            this.clearElement(resultsContainer);
        }
        const detailedResultsContainer = this.document.getElementById('detailedResults');
        if (detailedResultsContainer) {
            this.clearElement(detailedResultsContainer);
        }

        // Reset batch processor state
        if (this.batchProcessor) {
            this.batchProcessor.reset();
        }
    }

    clearElement(element) {
        if (!element) {
            console.error('Cannot clear null element');
            return;
        }
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}

// Progress Manager
class ProgressManager {
    constructor() {
        this.container = null;
        this.submissions = [];
    }

    initialize(submissions, container) {
        if (!container) {
            console.error('Container element is null in ProgressManager.initialize');
            return;
        }
        if (!submissions) {
            console.error('Submissions array is null in ProgressManager.initialize');
            return;
        }

        this.submissions = submissions;
        this.container = container;
        this.render();
    }

    render() {
        const template = document.getElementById('progress-dashboard-template');
        if (!template) {
            console.error('Progress dashboard template not found');
            return;
        }

        const clone = template.content.cloneNode(true);
        if (!clone) {
            console.error('Failed to clone progress dashboard template');
            return;
        }

        this.clearElement(this.container);
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
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');

        if (progressFill) {
            progressFill.style.width = `${progress.percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `${progress.completed + progress.failed} / ${progress.total}`;
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${progress.percentage}%`;
        }

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
        const completedElement = document.getElementById('completedCount');
        if (completedElement && completedSubmissions.length > 0) {
            const statusParts = [];
            if (totalPassed > 0) statusParts.push(`✅ ${totalPassed}`);
            if (totalWarnings > 0) statusParts.push(`⚠️ ${totalWarnings}`);
            if (totalErrors > 0) statusParts.push(`❌ ${totalErrors}`);
            completedElement.textContent = statusParts.length > 0 ? statusParts.join(' ') : progress.completed;
        } else {
            const element = document.getElementById('completedCount');
            if (element) {
                element.textContent = progress.completed;
            }
        }

        // Update other status counts
        const counters = {
            failedCount: progress.failed,
            processingCount: progress.processing,
            remainingCount: progress.remaining,
        };

        Object.entries(counters).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update individual student progress
        this.updateStudentProgress(progress.submissions);
    }

    updateStudentProgress(submissions) {
        const list = document.getElementById('studentProgressList');
        if (!list) return;

        this.clearElement(list);

        submissions.forEach((submission) => {
            const template = document.getElementById('student-progress-item-template');
            if (!template) {
                console.error('Student progress item template not found');
                return;
            }

            const clone = template.content.cloneNode(true);
            if (!clone) {
                console.error('Failed to clone template content');
                return;
            }

            const item = clone.querySelector('.student-progress-item');
            const studentInfo = clone.querySelector('.student-info');
            const name = clone.querySelector('.student-name');
            const status = clone.querySelector('.student-status');
            const summary = clone.querySelector('.student-summary');
            const detailedResults = clone.querySelector('.student-detailed-results');
            const expandBtn = clone.querySelector('.expand-btn');

            // Check if all required elements exist with detailed logging
            const missingElements = [];
            if (!item) missingElements.push('student-progress-item');
            if (!studentInfo) missingElements.push('student-info');
            if (!name) missingElements.push('student-name');
            if (!status) missingElements.push('student-status');
            if (!summary) missingElements.push('student-summary');
            if (!detailedResults) missingElements.push('student-detailed-results');
            if (!expandBtn) missingElements.push('expand-btn');

            if (missingElements.length > 0) {
                console.error('Missing template elements:', missingElements, 'for submission:', submission.id);
                return;
            }

            // Set student ID for reference
            if (studentInfo && submission.id) {
                studentInfo.setAttribute('data-student-id', submission.id);
            }

            if (name) {
                try {
                    name.textContent = submission.id || 'Unknown';
                } catch (e) {
                    console.error(
                        'Error setting name textContent:',
                        e,
                        'name element:',
                        name,
                        'submission.id:',
                        submission.id,
                    );
                    throw e;
                }
            }
            if (status) {
                try {
                    status.textContent = this.formatStatus(submission.status, submission);
                    status.className = `student-status ${submission.status}`;
                } catch (e) {
                    console.error(
                        'Error setting status textContent:',
                        e,
                        'status element:',
                        status,
                        'submission.status:',
                        submission.status,
                    );
                    throw e;
                }
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
                try {
                    summary.textContent = summaryText;
                } catch (e) {
                    console.error(
                        'Error setting summary textContent:',
                        e,
                        'summary element:',
                        summary,
                        'summaryText:',
                        summaryText,
                    );
                    throw e;
                }
            }

            // Only show expand button for completed submissions with results
            if (expandBtn) {
                if (submission.status === 'completed' && submission.results) {
                    expandBtn.style.display = 'flex';

                    // Bind click event for expansion
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
            // Calculate detailed status for completed submissions
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

            // Build status string with counts
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
            // Collapse
            detailedResults.style.display = 'none';
            expandBtn.setAttribute('data-expanded', 'false');
            expandText.textContent = 'Details';
        } else {
            // Expand
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

        const template = document.getElementById('detailed-results-template');
        const clone = template.content.cloneNode(true);
        const questionResults = clone.querySelector('#questionResults');

        // Clear any existing content
        this.clearElement(container);
        this.clearElement(questionResults);

        // Render each question
        Object.entries(submission.results.questions).forEach(([questionName, questionData]) => {
            const questionTemplate = document.getElementById('question-result-template');
            const questionClone = questionTemplate.content.cloneNode(true);

            const questionNameEl = questionClone.querySelector('.question-name');
            const questionScoreEl = questionClone.querySelector('.question-score');
            const passedTestsEl = questionClone.querySelector('.passed-tests');
            const failedTestsEl = questionClone.querySelector('.failed-tests');
            const questionErrorEl = questionClone.querySelector('.question-error');
            const testCaseDetails = questionClone.querySelector('#testCaseDetails');

            // Question header
            questionNameEl.textContent = questionName;

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

            // Test case details (only show failed test cases to keep it manageable)
            if (questionData.testCases && questionData.testCases.length > 0) {
                const failedTestCases = questionData.testCases.filter((tc) => !tc.passed);

                failedTestCases.forEach((testCase) => {
                    if (testCase.isPublic) {
                        // Create test case header
                        const headerTemplate = document.getElementById('test-case-template');
                        const headerClone = headerTemplate.content.cloneNode(true);
                        const headerDiv = headerClone.querySelector('.test-case');
                        headerDiv.classList.add('test-failed');

                        const headerText = document.createElement('strong');
                        headerText.textContent = `Test ${testCase.index}: Wrong Answer`;
                        headerDiv.appendChild(headerText);
                        testCaseDetails.appendChild(headerClone);

                        // Create test details
                        const detailsTemplate = document.getElementById('test-case-details-template');
                        const detailsClone = detailsTemplate.content.cloneNode(true);

                        detailsClone.querySelector('.input-value').textContent = this.formatTestValue(testCase.input);
                        detailsClone.querySelector('.expected-value').textContent = this.formatTestValue(
                            testCase.expected,
                        );

                        const outputValue = testCase.error
                            ? `Runtime Error: ${testCase.error}`
                            : this.formatTestValue(testCase.actual);
                        detailsClone.querySelector('.output-value').textContent = outputValue;

                        testCaseDetails.appendChild(detailsClone);
                    } else {
                        // Show header for private test cases without details
                        const headerTemplate = document.getElementById('test-case-template');
                        const headerClone = headerTemplate.content.cloneNode(true);
                        const headerDiv = headerClone.querySelector('.test-case');
                        headerDiv.classList.add('test-failed');

                        const headerText = document.createElement('strong');
                        headerText.textContent = `Test ${testCase.index}: Wrong Answer`;
                        headerDiv.appendChild(headerText);
                        headerDiv.appendChild(document.createTextNode(' (Hidden test case)'));
                        testCaseDetails.appendChild(headerClone);
                    }
                });
            }

            questionResults.appendChild(questionClone);
        });

        container.appendChild(clone);
    }

    formatTestValue(value) {
        if (Array.isArray(value)) {
            return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
        }
        return JSON.stringify(value);
    }

    clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}

// Results Exporter
class ResultsExporter {
    exportToCSV(results) {
        const headers = [
            'Student ID',
            'Filename',
            'Status',
            'Overall Score (%)',
            'Questions Attempted',
            'Questions Passed',
            'Total Points',
            'Max Points',
            'Error Message',
        ];

        const rows = [headers];

        results.forEach((result) => {
            const questions = result.results?.questions || {};
            const questionKeys = Object.keys(questions);
            const passedQuestions = questionKeys.filter((q) => questions[q].status === 'passed').length;

            const row = [
                result.id,
                result.fileName,
                result.status,
                result.results?.percentage || '0',
                questionKeys.length,
                passedQuestions,
                result.results?.totalScore || '0',
                result.results?.maxScore || '0',
                result.error || '',
            ];

            rows.push(row);
        });

        const csvContent = rows
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        this.downloadFile('batch_results.csv', csvContent, 'text/csv');
    }

    exportToJSON(results) {
        const jsonContent = JSON.stringify(results, null, 2);
        this.downloadFile('batch_results.json', jsonContent, 'application/json');
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.batchUploadHandler = new BatchUploadHandler(document, console, FileReader, JSZip);
});
