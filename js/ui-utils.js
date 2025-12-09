// UI Utilities Module
class UIManager {
    constructor(document = window.document) {
        this.document = document;
    }

    showError(message) {
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
        }, 5000);
    }

    showSuccess(message) {
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
        }, 3000);
    }

    showLoading(show) {
        const loading = this.document.getElementById('loading');
        const uploadBtn = this.document.getElementById('uploadBtn');

        if (show) {
            loading.classList.add('loading--visible');
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Reading...';
        } else {
            loading.classList.remove('loading--visible');
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Read ZIP File';
        }
    }

    hideFileContent() {
        const fileContent = this.document.getElementById('fileContent');
        fileContent.classList.remove('file-content--visible');
    }

    showFileContent() {
        const fileContent = this.document.getElementById('fileContent');
        fileContent.classList.add('file-content--visible');
    }

    hideZipContent() {
        const zipContent = this.document.getElementById('zipContent');
        zipContent.classList.remove('zip-content--visible');
    }

    showZipContent() {
        const zipContent = this.document.getElementById('zipContent');
        zipContent.classList.add('zip-content--visible');
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
        const testRunner = this.document.getElementById('testRunnerContainer');
        testRunner.classList.remove('test-runner--visible');
    }

    showTestRunner() {
        const testRunner = this.document.getElementById('testRunnerContainer');
        testRunner.classList.add('test-runner--visible');
    }

    clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
