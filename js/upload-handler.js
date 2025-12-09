// Upload Handler Module
class UploadHandler {
    constructor(uiManager, fileUtils, fileViewer, assignmentGrader, document, console, FileReader, JSZip) {
        this.uiManager = uiManager;
        this.fileUtils = fileUtils;
        this.fileViewer = fileViewer;
        this.assignmentGrader = assignmentGrader;
        this.document = document;
        this.console = console;
        this.FileReader = FileReader;
        this.JSZip = JSZip;
        this.currentZip = null;
        this.zipFiles = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop();
    }

    bindEvents() {
        const submitForm = this.document.getElementById('submitFile');
        submitForm.addEventListener('submit', (event) => this.handleSubmit(event));
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
                    this.document.getElementById('fileInput').files = files;
                    this.readZipFile(file);
                } else {
                    this.uiManager.showError('Please drop a valid ZIP file.');
                }
            }
        });
    }

    handleSubmit(event) {
        event.preventDefault();

        const fileInput = this.document.getElementById('fileInput');
        if (fileInput.files.length === 0) {
            this.uiManager.showError('Please select a ZIP file to upload.');
            return;
        }

        const file = fileInput.files[0];

        if (!this.isValidZipFile(file)) {
            this.uiManager.showError('Please select a valid ZIP file.');
            return;
        }

        this.readZipFile(file);
    }

    isValidZipFile(file) {
        return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
    }

    readZipFile(file) {
        this.uiManager.showLoading(true);
        this.uiManager.hideFileContent();
        this.uiManager.hideZipContent();
        this.uiManager.hideTestRunner();

        const reader = new this.FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;

            this.JSZip.loadAsync(arrayBuffer)
                .then((zip) => {
                    this.currentZip = zip;
                    this.displayZipContents(zip, file);
                    this.uiManager.showLoading(false);
                    this.uiManager.showSuccess(`Successfully loaded ZIP file: ${file.name}`);
                })
                .catch((error) => {
                    this.uiManager.showLoading(false);
                    this.uiManager.showError(`Failed to read ZIP file: ${error.message}`);
                    this.console.error('ZIP reading error:', error);
                });
        };

        reader.onerror = () => {
            this.uiManager.showLoading(false);
            this.uiManager.showError('Failed to read the selected file.');
        };

        reader.readAsArrayBuffer(file);
    }

    displayZipContents(zip, originalFile) {
        // Check if this looks like an assignment submission
        const structureAnalysis = this.assignmentGrader.analyzeZipStructure(zip);
        const isAssignmentZip = structureAnalysis.valid && this.assignmentGrader.detectAssignmentStructure(zip);

        if (isAssignmentZip) {
            this.uiManager.showTestRunner();
            this.assignmentGrader.runTestsOnAssignment(zip);
        } else if (structureAnalysis.valid === false) {
            this.uiManager.showTestRunner();
            this.assignmentGrader.runTestsOnAssignment(zip);
        }

        this.displayZipInfo(originalFile, zip);
        this.displayFileTree(zip);
        this.uiManager.showZipContent();
    }

    displayZipInfo(originalFile, zip) {
        const fileCount = Object.keys(zip.files).length;
        const folderCount = Object.values(zip.files).filter((file) => file.dir).length;
        const realFileCount = fileCount - folderCount;

        const template = this.document.getElementById('zip-info-template');
        const clone = template.content.cloneNode(true);

        clone.querySelector('.zip-filename').textContent = originalFile.name;
        clone.querySelector('.zip-filesize').textContent = this.fileUtils.formatBytes(originalFile.size);
        clone.querySelector('.zip-total-entries').textContent = fileCount;
        clone.querySelector('.zip-folders').textContent = folderCount;
        clone.querySelector('.zip-files').textContent = realFileCount;
        clone.querySelector('.zip-last-modified').textContent = new Date(originalFile.lastModified).toLocaleString();

        const zipInfo = this.document.getElementById('zipInfo');
        this.clearElement(zipInfo);
        zipInfo.appendChild(clone);
    }

    displayFileTree(zip) {
        this.zipFiles = [];
        const fileTree = this.document.getElementById('fileTree');
        this.clearElement(fileTree);

        const sortedFiles = Object.values(zip.files).sort((a, b) => {
            if (a.dir !== b.dir) {
                return a.dir ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        sortedFiles.forEach((zipEntry) => {
            const fileItem = this.createFileItem(zipEntry);
            fileTree.appendChild(fileItem);
            this.zipFiles.push(zipEntry);
        });
    }

    createFileItem(zipEntry) {
        const template = this.document.getElementById('file-item-template');
        const clone = template.content.cloneNode(true);

        const fileItem = clone.querySelector('.file-item');

        if (zipEntry.dir) {
            fileItem.classList.add('file-item--folder');
        }

        const icon = zipEntry.dir ? '📁' : this.fileUtils.getFileIcon(zipEntry.name);
        const size = zipEntry.dir
            ? ''
            : this.fileUtils.formatBytes(zipEntry._data ? zipEntry._data.uncompressedSize : 0);
        const date = zipEntry.date ? zipEntry.date.toLocaleString() : '';

        clone.querySelector('.file-icon').textContent = icon;
        clone.querySelector('.file-name').textContent = zipEntry.name;
        clone.querySelector('.file-date').textContent = date;
        clone.querySelector('.file-size').textContent = size;

        const actionsContainer = clone.querySelector('.file-actions');
        if (!zipEntry.dir) {
            const viewBtn = clone.querySelector('.btn--view');
            const downloadBtn = clone.querySelector('.btn--download');

            viewBtn.onclick = () => this.viewFile(zipEntry.name);
            downloadBtn.onclick = () => this.downloadFile(zipEntry.name);
        } else {
            this.clearElement(actionsContainer);
        }

        return clone;
    }

    viewFile(filename) {
        if (!this.currentZip) return;

        const file = this.currentZip.file(filename);
        if (!file) {
            this.uiManager.showError('File not found in ZIP archive.');
            return;
        }

        this.fileViewer.viewFile(file, filename);
    }

    downloadFile(filename) {
        if (!this.currentZip) return;

        const file = this.currentZip.file(filename);
        if (!file) {
            this.uiManager.showError('File not found in ZIP archive.');
            return;
        }

        this.fileViewer.downloadFile(file, filename);
    }

    clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create all dependencies
    const uiManager = new UIManager(document);
    const fileUtils = new FileUtils();
    const consoleManager = new ConsoleManager(console);
    const fileViewer = new FileViewer(uiManager, fileUtils, document);
    const testExecutor = new TestExecutor(consoleManager);
    const assignmentGrader = new AssignmentGrader(testExecutor, fileUtils, document);

    // Initialize upload handler with all dependencies
    window.uploadHandler = new UploadHandler(
        uiManager,
        fileUtils,
        fileViewer,
        assignmentGrader,
        document,
        console,
        FileReader,
        JSZip,
    );
});
