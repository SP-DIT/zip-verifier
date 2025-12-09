// Notification Service
class NotificationService {
    constructor(domUtils) {
        this.domUtils = domUtils;
        this.timeouts = new Map();
    }

    showMessage(containerId, message, type, duration = null) {
        const container = this.domUtils.getElementById(containerId);
        if (!container) {
            console.warn(`Container not found: ${containerId}`);
            return;
        }

        // Clear existing timeout
        this.clearTimeout(containerId);

        const clone = this.domUtils.createElementFromTemplate('message-template');
        const messageDiv = clone.querySelector('.message');

        messageDiv.classList.add(`message--${type}`);
        messageDiv.textContent = `${this.getIcon(type)} ${message}`;

        this.domUtils.clearElement(container);
        container.appendChild(clone);

        // Auto-hide after duration
        const actualDuration = duration !== null ? duration : this.getDefaultDuration(type);
        if (actualDuration > 0) {
            const timeoutId = setTimeout(() => {
                this.domUtils.clearElement(container);
                this.timeouts.delete(containerId);
            }, actualDuration);
            this.timeouts.set(containerId, timeoutId);
        }
    }

    showError(containerId, message, duration = AppConfig.TIMEOUTS.MESSAGE_DISPLAY) {
        this.showMessage(containerId, message, AppConfig.MESSAGE_TYPES.ERROR, duration);
    }

    showSuccess(containerId, message, duration = AppConfig.TIMEOUTS.SUCCESS_MESSAGE) {
        this.showMessage(containerId, message, AppConfig.MESSAGE_TYPES.SUCCESS, duration);
    }

    showWarning(containerId, message, duration = AppConfig.TIMEOUTS.MESSAGE_DISPLAY) {
        this.showMessage(containerId, message, AppConfig.MESSAGE_TYPES.WARNING, duration);
    }

    showInfo(containerId, message, duration = AppConfig.TIMEOUTS.MESSAGE_DISPLAY) {
        this.showMessage(containerId, message, AppConfig.MESSAGE_TYPES.INFO, duration);
    }

    getIcon(type) {
        const icons = {
            error: '❌',
            success: '✅',
            warning: '⚠️',
            info: 'ℹ️',
        };
        return icons[type] || '';
    }

    getDefaultDuration(type) {
        switch (type) {
            case AppConfig.MESSAGE_TYPES.SUCCESS:
                return AppConfig.TIMEOUTS.SUCCESS_MESSAGE;
            case AppConfig.MESSAGE_TYPES.ERROR:
            case AppConfig.MESSAGE_TYPES.WARNING:
            case AppConfig.MESSAGE_TYPES.INFO:
            default:
                return AppConfig.TIMEOUTS.MESSAGE_DISPLAY;
        }
    }

    clearTimeout(containerId) {
        if (this.timeouts.has(containerId)) {
            clearTimeout(this.timeouts.get(containerId));
            this.timeouts.delete(containerId);
        }
    }

    clearAllTimeouts() {
        this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        this.timeouts.clear();
    }
}
