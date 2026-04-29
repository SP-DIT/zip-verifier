// Batch Upload Handler Module - Focused and Lightweight
class BatchUploadHandler extends BaseUploadHandler {
    constructor(
        batchProcessor,
        progressManager,
        resultsExporter,
        fileViewer,
        document,
        console,
        FileReader,
        JSZip,
        domUtils = null,
        notificationService = null,
    ) {
        super(domUtils || new DOMUtils(document), notificationService);
        this.document = document;
        this.console = console;
        this.FileReader = FileReader;
        this.JSZip = JSZip;

        // Use injected dependencies
        this.batchProcessor = batchProcessor;
        this.progressManager = progressManager;
        this.resultsExporter = resultsExporter;
        this.fileViewer = fileViewer;

        // Store student ZIPs for file viewing
        this.studentZips = new Map(); // Map of studentId -> JSZip object

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop('.upload-section', 'bulkFileInput', (file) => this.readBulkZipFile(file));
    }

    bindEvents() {
        const submitForm = this.document.getElementById('bulkSubmitFile');
        const exportCSVBtn = this.document.getElementById('exportCSV');
        const exportJSONBtn = this.document.getElementById('exportJSON');
        const backBtn = this.document.getElementById('backToResultsBtn');

        submitForm.addEventListener('submit', (event) =>
            super.handleSubmit(event, 'bulkFileInput', (file) => this.readBulkZipFile(file), 'bulkErrorMessage'),
        );
        exportCSVBtn.addEventListener('click', () => this.exportResults('csv'));
        exportJSONBtn.addEventListener('click', () => this.exportResults('json'));
        if (backBtn) {
            backBtn.addEventListener('click', () => this.jumpToResults());
        }
    }

    async readBulkZipFile(file) {
        super.showLoading(true, 'bulkUploadBtn', 'bulkLoading', 'Processing...', 'Process Bulk Submissions');
        this.hideProgress();
        this.hideResults();

        this.readZipFileAsync(
            file,
            async (bulkZip, file) => {
                super.showLoading(false, 'bulkUploadBtn', 'bulkLoading');
                super.showSuccess(`Successfully loaded bulk ZIP file: ${file.name}`, 'bulkSuccessMessage');
                await this.processBulkSubmissions(bulkZip);
            },
            (error) => {
                super.showLoading(false, 'bulkUploadBtn', 'bulkLoading');
                super.showError(`Failed to read ZIP file: ${error.message}`, 'bulkErrorMessage');
                this.console.error('Bulk ZIP reading error:', error);
            },
        );
    }

    async processBulkSubmissions(bulkZip) {
        try {
            this.clearPreviousResults();

            // Extract individual student submissions
            super.showLoading(
                true,
                'bulkUploadBtn',
                'bulkLoading',
                'Extracting student submissions...',
                'Process Bulk Submissions',
            );

            const submissions = await this.batchProcessor.extractStudentSubmissions(bulkZip);

            if (submissions.length === 0) {
                super.showError('No student ZIP files found in the bulk submission.', 'bulkErrorMessage');
                return;
            }

            // Store student ZIPs for later file viewing
            for (const submission of submissions) {
                try {
                    const studentZip = await new this.JSZip().loadAsync(submission.zipData);
                    this.studentZips.set(submission.id, studentZip);
                } catch (error) {
                    this.console.error(`Failed to load ZIP for student ${submission.id}:`, error);
                }
            }

            super.showSuccess(
                `Found ${submissions.length} student submissions. Starting processing...`,
                'bulkSuccessMessage',
            );
            super.showLoading(false, 'bulkUploadBtn', 'bulkLoading');

            // Add submissions to processor
            this.batchProcessor.addSubmissions(submissions);

            // Initialize progress tracking with file viewing callback
            this.progressManager.initialize(submissions, this.domUtils.getElementById('batchProgress'), {
                getStudentZip: (studentId) => this.studentZips.get(studentId),
            });
            this.showProgress();

            // Start processing
            await this.batchProcessor.processAll((progress) => {
                this.progressManager.updateProgress(progress);
            });

            // Show results
            this.displayResults();
            this.showResults();
        } catch (error) {
            super.showLoading(false, 'bulkUploadBtn', 'bulkLoading');
            super.showError(`Failed to process bulk submissions: ${error.message}`, 'bulkErrorMessage');
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

        super.showSuccess(`Batch processing completed! Processed ${stats.total} submissions.`, 'bulkSuccessMessage');
    }

    displaySummaryStats(stats) {
        const summaryContainer = this.domUtils.getElementById('resultsSummary');
        const template = this.domUtils.getElementById('results-summary-template');
        const clone = template.content.cloneNode(true);

        clone.querySelector('#totalSubmissions').textContent = stats.total;
        clone.querySelector('#successfulSubmissions').textContent = stats.successful;
        clone.querySelector('#failedSubmissions').textContent = stats.failed;
        clone.querySelector('#averageScore').textContent = `${stats.averageScore}%`;

        this.domUtils.clearElement(summaryContainer);
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

    // File Viewing Methods
    displayStudentFileTree(studentId) {
        console.log('displayStudentFileTree called with studentId:', studentId);
        console.log('Available student ZIPs:', Array.from(this.studentZips.keys()));

        const studentZip = this.studentZips.get(studentId);
        if (!studentZip) {
            console.error(`No ZIP file found for student ${studentId}`);
            this.fileViewer.ui.showError(`No ZIP file found for student ${studentId}`);
            return;
        }

        console.log('Found student ZIP, showing file content...');
        this.showFileContent();

        const sortedFiles = Object.values(studentZip.files).sort((a, b) => {
            if (a.dir !== b.dir) {
                return a.dir ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        const fileTree = this.domUtils.getElementById('fileTree');
        if (fileTree) {
            this.domUtils.clearElement(fileTree);

            sortedFiles.forEach((zipEntry) => {
                const fileItem = this.createFileItem(zipEntry, studentId);
                fileTree.appendChild(fileItem);
            });
            console.log(`Displayed ${sortedFiles.length} files for student ${studentId}`);

            // Highlight current student and jump to file section
            this.highlightCurrentStudent(studentId);
            this.jumpToFileSection();
        } else {
            console.error('fileTree element not found');
        }
    }

    highlightCurrentStudent(studentId) {
        // Remove highlight from all student items
        const allStudentItems = this.domUtils.document.querySelectorAll('.student-info');
        allStudentItems.forEach((item) => {
            item.classList.remove('student-info--viewing');
        });

        // Highlight the current student
        const currentStudentItem = this.domUtils.document.querySelector(
            `.student-info[data-student-id="${studentId}"]`,
        );
        if (currentStudentItem) {
            currentStudentItem.classList.add('student-info--viewing');
            console.log(`Highlighted student: ${studentId}`);
        }
    }

    jumpToFileSection() {
        const section = this.domUtils.getElementById('fileContentSection');
        if (section) {
            // Jump directly (no smooth scroll)
            section.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }

    createFileItem(zipEntry, studentId) {
        const template = this.domUtils.getElementById('file-item-template');
        const clone = template.content.cloneNode(true);

        const fileItem = clone.querySelector('.file-item');

        if (zipEntry.dir) {
            fileItem.classList.add('file-item--folder');
        }

        const icon = zipEntry.dir ? '📁' : this.fileViewer.fileUtils.getFileIcon(zipEntry.name);
        const size = zipEntry.dir
            ? ''
            : this.fileViewer.fileUtils.formatBytes(zipEntry._data ? zipEntry._data.uncompressedSize : 0);
        const date = zipEntry.date ? zipEntry.date.toLocaleString() : '';

        clone.querySelector('.file-icon').textContent = icon;
        clone.querySelector('.file-name').textContent = zipEntry.name;
        clone.querySelector('.file-date').textContent = date;
        clone.querySelector('.file-size').textContent = size;

        const actionsContainer = clone.querySelector('.file-actions');
        if (!zipEntry.dir) {
            const viewBtn = clone.querySelector('.btn--view');
            const downloadBtn = clone.querySelector('.btn--download');

            viewBtn.onclick = () => this.viewStudentFile(studentId, zipEntry.name);
            downloadBtn.onclick = () => this.downloadStudentFile(studentId, zipEntry.name);
        } else {
            this.domUtils.clearElement(actionsContainer);
        }

        return clone;
    }

    viewStudentFile(studentId, filename) {
        const studentZip = this.studentZips.get(studentId);
        if (!studentZip) {
            this.fileViewer.ui.showError('Student ZIP not found');
            return;
        }

        const file = studentZip.file(filename);
        if (!file) {
            this.fileViewer.ui.showError('File not found in student ZIP archive.');
            return;
        }

        this.fileViewer.viewFile(file, filename);
    }

    downloadStudentFile(studentId, filename) {
        const studentZip = this.studentZips.get(studentId);
        if (!studentZip) {
            this.fileViewer.ui.showError('Student ZIP not found');
            return;
        }

        const file = studentZip.file(filename);
        if (!file) {
            this.fileViewer.ui.showError('File not found in student ZIP archive.');
            return;
        }

        this.fileViewer.downloadFile(file, filename);
    }

    showFileContent() {
        const section = this.domUtils.getElementById('fileContentSection');
        if (section) {
            section.style.display = 'block';
        }
    }

    hideFileContent() {
        const section = this.domUtils.getElementById('fileContentSection');
        if (section) {
            section.style.display = 'none';
        }
    }

    jumpToResults() {
        // Remove highlight from current student
        const allStudentItems = this.domUtils.document.querySelectorAll('.student-info--viewing');
        allStudentItems.forEach((item) => {
            item.classList.remove('student-info--viewing');
        });

        // Jump to results section
        const resultsContainer = this.domUtils.getElementById('batchResultsContainer');
        if (resultsContainer) {
            resultsContainer.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }

    // UI Helper Methods - using base class methods
    showProgress() {
        const container = this.domUtils.getElementById('batchProgressContainer');
        this.domUtils.toggleVisibility(container, true, AppConfig.CSS_CLASSES.BATCH_PROGRESS_VISIBLE);
    }

    hideProgress() {
        const container = this.domUtils.getElementById('batchProgressContainer');
        this.domUtils.toggleVisibility(container, false, AppConfig.CSS_CLASSES.BATCH_PROGRESS_VISIBLE);
    }

    showResults() {
        const container = this.domUtils.getElementById('batchResultsContainer');
        this.domUtils.toggleVisibility(container, true, AppConfig.CSS_CLASSES.BATCH_RESULTS_VISIBLE);
    }

    hideResults() {
        const container = this.domUtils.getElementById('batchResultsContainer');
        this.domUtils.toggleVisibility(container, false, AppConfig.CSS_CLASSES.BATCH_RESULTS_VISIBLE);
    }

    clearPreviousResults() {
        this.hideProgress();
        this.hideResults();
        this.hideFileContent();
        this.studentZips.clear();

        // Clear containers
        const progressContainer = this.domUtils.getElementById('batchProgress');
        if (progressContainer) {
            this.domUtils.clearElement(progressContainer);
        }

        const resultsContainer = this.domUtils.getElementById('resultsSummary');
        if (resultsContainer) {
            this.domUtils.clearElement(resultsContainer);
        }

        const detailedResultsContainer = this.domUtils.getElementById('detailedResults');
        if (detailedResultsContainer) {
            this.domUtils.clearElement(detailedResultsContainer);
        }

        // Reset batch processor state
        if (this.batchProcessor) {
            this.batchProcessor.reset();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Use dependency injection container to get all services
        const batchUploadHandler = container.get('batchUploadHandler');
        window.batchUploadHandler = batchUploadHandler;
    } catch (error) {
        console.error('Failed to initialize batch upload handler with DI:', error);

        // Fallback to manual initialization only if DI fails completely
        const domUtils = new DOMUtils(document);
        const notificationService = new NotificationService(domUtils);
        const progressManager = new ProgressManager(domUtils);
        const resultsExporter = new ResultsExporter();

        // Create required dependencies for BatchProcessor
        const consoleManager = new ConsoleManager(console);
        const testExecutor = new TestExecutor(consoleManager);
        const fileUtils = new FileUtils();
        const assignmentGrader = new AssignmentGrader(testExecutor, fileUtils, document);
        const testRunnerService = new TestRunnerService(testExecutor, fileUtils, assignmentGrader);
        const batchProcessor = new BatchProcessor(testRunnerService);

        window.batchUploadHandler = new BatchUploadHandler(
            batchProcessor,
            progressManager,
            resultsExporter,
            document,
            console,
            FileReader,
            JSZip,
            domUtils,
            notificationService,
        );
    }
});
