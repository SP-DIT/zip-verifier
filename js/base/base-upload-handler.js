// Base Upload Handler
class BaseUploadHandler {
    constructor(domUtils, notificationService) {
        this.domUtils = domUtils;
        this.notificationService = notificationService;
    }

    isValidZipFile(file) {
        return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
    }

    setupDragAndDrop(uploadSectionSelector, fileInputId, onDrop) {
        const uploadSection = this.domUtils.querySelector(uploadSectionSelector);
        if (!uploadSection) {
            console.warn(`Upload section not found: ${uploadSectionSelector}`);
            return;
        }

        this.domUtils.addEventListener(uploadSection, 'dragover', (e) => {
            e.preventDefault();
            uploadSection.classList.add(AppConfig.CSS_CLASSES.UPLOAD_DRAGOVER);
        });

        this.domUtils.addEventListener(uploadSection, 'dragleave', (e) => {
            e.preventDefault();
            uploadSection.classList.remove(AppConfig.CSS_CLASSES.UPLOAD_DRAGOVER);
        });

        this.domUtils.addEventListener(uploadSection, 'drop', (e) => {
            e.preventDefault();
            uploadSection.classList.remove(AppConfig.CSS_CLASSES.UPLOAD_DRAGOVER);
            this.handleFileDrop(e, fileInputId, onDrop);
        });
    }

    handleFileDrop(event, fileInputId, onDrop) {
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (this.isValidZipFile(file)) {
                const fileInput = this.domUtils.getElementById(fileInputId);
                if (fileInput) {
                    fileInput.files = files;
                }
                onDrop(file);
            } else {
                this.showError('Please drop a valid ZIP file.');
            }
        }
    }

    handleSubmit(event, fileInputId, onSubmit, errorContainerId = 'errorMessage') {
        event.preventDefault();

        const fileInput = this.domUtils.getElementById(fileInputId);
        if (!fileInput || fileInput.files.length === 0) {
            this.notificationService.showError(errorContainerId, 'Please select a ZIP file to upload.');
            return;
        }

        const file = fileInput.files[0];

        if (!this.isValidZipFile(file)) {
            this.notificationService.showError(errorContainerId, 'Please select a valid ZIP file.');
            return;
        }

        onSubmit(file);
    }

    showError(message, containerId = 'errorMessage') {
        this.notificationService.showError(containerId, message);
    }

    showSuccess(message, containerId = 'successMessage') {
        this.notificationService.showSuccess(containerId, message);
    }

    showLoading(show, buttonId, loadingId, processingText = 'Processing...', defaultText = 'Process File') {
        const loading = this.domUtils.getElementById(loadingId);
        const uploadBtn = this.domUtils.getElementById(buttonId);

        if (show) {
            this.domUtils.toggleVisibility(loading, true, AppConfig.CSS_CLASSES.LOADING_VISIBLE);
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = processingText;
            }
        } else {
            this.domUtils.toggleVisibility(loading, false, AppConfig.CSS_CLASSES.LOADING_VISIBLE);
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = defaultText;
            }
        }
    }

    readZipFileAsync(file, onSuccess, onError) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            JSZip.loadAsync(arrayBuffer)
                .then((zip) => onSuccess(zip, file))
                .catch((error) => onError(error));
        };

        reader.onerror = () => {
            onError(new Error('Failed to read the selected file.'));
        };

        reader.readAsArrayBuffer(file);
    }

    clearElement(element) {
        this.domUtils.clearElement(element);
    }
}
