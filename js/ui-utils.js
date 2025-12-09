// UI Utilities Module
class UIManager {
    constructor(document = window.document, domUtils = null, notificationService = null) {
        this.document = document;
        this.domUtils = domUtils || new DOMUtils(document);
        this.notificationService = notificationService;
    }

    showError(message) {
        if (this.notificationService) {
            this.notificationService.showError('errorMessage', message);
            return;
        }

        // Legacy fallback
        const errorDiv = this.document.getElementById('errorMessage');
        const template = this.document.getElementById('message-template');
        const clone = template.content.cloneNode(true);

        const messageDiv = clone.querySelector('.message');
        messageDiv.classList.add('message--error');
        messageDiv.textContent = `❌ ${message}`;

        this.clearElement(errorDiv);
        errorDiv.appendChild(clone);

        setTimeout(() => {
            this.clearElement(errorDiv);
        }, AppConfig.TIMEOUTS.MESSAGE_DISPLAY);
    }

    showSuccess(message) {
        if (this.notificationService) {
            this.notificationService.showSuccess('successMessage', message);
            return;
        }

        // Legacy fallback
        const successDiv = this.document.getElementById('successMessage');
        const template = this.document.getElementById('message-template');
        const clone = template.content.cloneNode(true);

        const messageDiv = clone.querySelector('.message');
        messageDiv.classList.add('message--success');
        messageDiv.textContent = `✅ ${message}`;

        this.clearElement(successDiv);
        successDiv.appendChild(clone);

        setTimeout(() => {
            this.clearElement(successDiv);
        }, AppConfig.TIMEOUTS.SUCCESS_MESSAGE);
    }

    showLoading(show) {
        const loading = this.domUtils.getElementById('loading');
        const uploadBtn = this.domUtils.getElementById('uploadBtn');

        if (show) {
            this.domUtils.toggleVisibility(loading, true, AppConfig.CSS_CLASSES.LOADING_VISIBLE);
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Reading...';
            }
        } else {
            this.domUtils.toggleVisibility(loading, false, AppConfig.CSS_CLASSES.LOADING_VISIBLE);
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Read ZIP File';
            }
        }
    }

    hideFileContent() {
        const fileContent = this.domUtils.getElementById('fileContent');
        this.domUtils.toggleVisibility(fileContent, false, AppConfig.CSS_CLASSES.FILE_CONTENT_VISIBLE);
    }

    showFileContent() {
        const fileContent = this.domUtils.getElementById('fileContent');
        this.domUtils.toggleVisibility(fileContent, true, AppConfig.CSS_CLASSES.FILE_CONTENT_VISIBLE);
    }

    hideZipContent() {
        const zipContent = this.domUtils.getElementById('zipContent');
        this.domUtils.toggleVisibility(zipContent, false, AppConfig.CSS_CLASSES.ZIP_CONTENT_VISIBLE);
    }

    showZipContent() {
        const zipContent = this.domUtils.getElementById('zipContent');
        this.domUtils.toggleVisibility(zipContent, true, AppConfig.CSS_CLASSES.ZIP_CONTENT_VISIBLE);
        this.setupZipToggle();
    }

    setupZipToggle() {
        const toggleBtn = this.document.getElementById('toggleZipInfo');
        const zipDetails = this.document.getElementById('zipDetails');
        const toggleIcon = this.document.getElementById('toggleIcon');
        const toggleText = this.document.getElementById('toggleText');

        if (toggleBtn && !toggleBtn.hasEventListener) {
            toggleBtn.hasEventListener = true;
            toggleBtn.addEventListener('click', () => {
                const isVisible = zipDetails.style.display !== 'none';

                if (isVisible) {
                    zipDetails.style.display = 'none';
                    toggleIcon.textContent = '👁️';
                    toggleText.textContent = 'Show ZIP Details';
                } else {
                    zipDetails.style.display = 'block';
                    toggleIcon.textContent = '🙈';
                    toggleText.textContent = 'Hide ZIP Details';
                }
            });
        }
    }

    hideTestRunner() {
        const testRunner = this.domUtils.getElementById('testRunnerContainer');
        this.domUtils.toggleVisibility(testRunner, false, AppConfig.CSS_CLASSES.TEST_RUNNER_VISIBLE);
    }

    showTestRunner() {
        const testRunner = this.domUtils.getElementById('testRunnerContainer');
        this.domUtils.toggleVisibility(testRunner, true, AppConfig.CSS_CLASSES.TEST_RUNNER_VISIBLE);
    }

    clearElement(element) {
        this.domUtils.clearElement(element);
    }
}
