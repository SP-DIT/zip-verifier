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

    clearElement(element) {
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
        this.submissions = submissions;
        this.container = container;
        this.render();
    }

    render() {
        const template = document.getElementById('progress-dashboard-template');
        const clone = template.content.cloneNode(true);

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

        // Update status counts
        const counters = {
            completedCount: progress.completed,
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
            const clone = template.content.cloneNode(true);

            const item = clone.querySelector('.student-progress-item');
            const name = clone.querySelector('.student-name');
            const status = clone.querySelector('.student-status');
            const details = clone.querySelector('.student-details');

            name.textContent = submission.id;
            status.textContent = this.formatStatus(submission.status);
            status.className = `student-status ${submission.status}`;

            let detailText = submission.fileName;
            if (submission.status === 'completed' && submission.results) {
                detailText += ` - Score: ${submission.results.percentage}%`;
            } else if (submission.status === 'error') {
                detailText += ` - Error: ${submission.error}`;
            }

            details.textContent = detailText;

            list.appendChild(clone);
        });
    }

    formatStatus(status) {
        const statusMap = {
            pending: '📋 Pending',
            processing: '⏳ Processing',
            completed: '✅ Completed',
            error: '❌ Failed',
        };
        return statusMap[status] || status;
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
