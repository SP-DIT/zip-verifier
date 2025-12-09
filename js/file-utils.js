// File Utilities Module
class FileUtils {
    getFileIcon(filename) {
        return AppConfig.getIcon(filename);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    isTextFile(filename) {
        return AppConfig.isTextFile(filename);
    }

    formatTestValue(value) {
        if (Array.isArray(value)) {
            return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
        }
        return JSON.stringify(value);
    }
}

// File Viewer Module
class FileViewer {
    constructor(uiManager, fileUtils, document = window.document, domUtils = null) {
        this.ui = uiManager;
        this.fileUtils = fileUtils;
        this.document = document;
        this.domUtils = domUtils || new DOMUtils(document);
    }

    viewFile(file, filename) {
        const contentHeader = this.document.getElementById('contentHeader');
        const contentBody = this.document.getElementById('contentBody');

        contentHeader.textContent = `📖 Loading: ${filename}...`;
        contentBody.textContent = 'Loading file content...';
        this.ui.showFileContent();

        const isTextFile = this.fileUtils.isTextFile(filename);

        if (isTextFile) {
            file.async('string')
                .then((content) => {
                    contentHeader.textContent = `📄 ${filename} (${this.fileUtils.formatBytes(content.length)})`;
                    contentBody.textContent = content;
                })
                .catch((error) => {
                    contentHeader.textContent = `❌ Error reading: ${filename}`;
                    contentBody.textContent = `Error: ${error.message}`;
                });
        } else {
            const ext = filename.toLowerCase().split('.').pop();
            contentHeader.textContent = `📁 ${filename} (Binary File)`;

            const template = this.document.getElementById('binary-file-content-template');
            const clone = template.content.cloneNode(true);
            clone.querySelector('.file-type').textContent = ext.toUpperCase();

            this.clearElement(contentBody);
            contentBody.appendChild(clone);
        }
    }

    downloadFile(file, filename) {
        file.async('blob')
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = this.document.createElement('a');
                a.href = url;
                a.download = filename.split('/').pop();
                this.document.body.appendChild(a);
                a.click();
                this.document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.ui.showSuccess(`Downloaded: ${filename}`);
            })
            .catch((error) => {
                this.ui.showError(`Failed to download file: ${error.message}`);
            });
    }

    clearElement(element) {
        this.domUtils.clearElement(element);
    }
}
