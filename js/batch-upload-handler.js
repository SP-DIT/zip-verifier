// Batch Upload Handler Module - Focused and Lightweight
class BatchUploadHandler extends BaseUploadHandler {
    constructor(document, console, FileReader, JSZip, domUtils = null, notificationService = null, progressManager = null, resultsExporter = null, batchProcessor = null) {
        super(domUtils || new DOMUtils(document), notificationService);
        this.document = document;
        this.console = console;
        this.FileReader = FileReader;
        this.JSZip = JSZip;
        
        // Inject dependencies or create new instances
        this.batchProcessor = batchProcessor || new BatchProcessor();
        this.progressManager = progressManager || new ProgressManager(this.domUtils);
        this.resultsExporter = resultsExporter || new ResultsExporter();
        
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

        submitForm.addEventListener('submit', (event) =>
            super.handleSubmit(event, 'bulkFileInput', (file) => this.readBulkZipFile(file), 'bulkErrorMessage'),
        );
        exportCSVBtn.addEventListener('click', () => this.exportResults('csv'));
        exportJSONBtn.addEventListener('click', () => this.exportResults('json'));
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
            super.showLoading(true, 'bulkUploadBtn', 'bulkLoading', 'Extracting student submissions...', 'Process Bulk Submissions');

            const submissions = await this.batchProcessor.extractStudentSubmissions(bulkZip);

            if (submissions.length === 0) {
                super.showError('No student ZIP files found in the bulk submission.', 'bulkErrorMessage');
                return;
            }

            super.showSuccess(`Found ${submissions.length} student submissions. Starting processing...`, 'bulkSuccessMessage');
            super.showLoading(false, 'bulkUploadBtn', 'bulkLoading');

            // Add submissions to processor
            this.batchProcessor.addSubmissions(submissions);

            // Initialize progress tracking
            this.progressManager.initialize(submissions, this.domUtils.getElementById('batchProgress'));
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
        const domUtils = container.get('domUtils');
        const notificationService = container.get('notificationService');
        
        // Create services
        const progressManager = new ProgressManager(domUtils);
        const resultsExporter = new ResultsExporter();
        const batchProcessor = new BatchProcessor();
        
        window.batchUploadHandler = new BatchUploadHandler(
            document, 
            console, 
            FileReader, 
            JSZip,
            domUtils,
            notificationService,
            progressManager,
            resultsExporter,
            batchProcessor
        );
    } catch (error) {
        console.error('Failed to initialize batch upload handler with DI:', error);
        
        // Fallback to manual initialization
        window.batchUploadHandler = new BatchUploadHandler(document, console, FileReader, JSZip);
    }
});