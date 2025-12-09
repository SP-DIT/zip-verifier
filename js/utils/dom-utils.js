// DOM Utilities Service
class DOMUtils {
    constructor(document = window.document) {
        this.document = document;
    }

    clearElement(element) {
        if (!element) {
            console.warn('Cannot clear null or undefined element');
            return;
        }
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    createElementFromTemplate(templateId, querySelector = null) {
        const template = this.document.getElementById(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        const clone = template.content.cloneNode(true);
        return querySelector ? clone.querySelector(querySelector) : clone;
    }

    toggleVisibility(element, isVisible, visibleClass) {
        if (!element) return;

        if (isVisible) {
            element.classList.add(visibleClass);
        } else {
            element.classList.remove(visibleClass);
        }
    }

    setTextContent(elementId, text) {
        const element = this.document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            console.warn(`Element not found: ${elementId}`);
        }
    }

    getElementById(id) {
        return this.document.getElementById(id);
    }

    querySelector(selector) {
        return this.document.querySelector(selector);
    }

    createElement(tagName) {
        return this.document.createElement(tagName);
    }

    addEventListener(element, event, handler) {
        if (element && typeof element.addEventListener === 'function') {
            element.addEventListener(event, handler);
        }
    }

    setElementAttribute(element, attribute, value) {
        if (element && typeof element.setAttribute === 'function') {
            element.setAttribute(attribute, value);
        }
    }

    updateProgress(progressFillId, progressTextId, progressPercentageId, progress) {
        const progressFill = this.getElementById(progressFillId);
        const progressText = this.getElementById(progressTextId);
        const progressPercentage = this.getElementById(progressPercentageId);

        if (progressFill) {
            progressFill.style.width = `${progress.percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `${progress.completed + progress.failed} / ${progress.total}`;
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${progress.percentage}%`;
        }
    }

    updateCounters(counters) {
        Object.entries(counters).forEach(([id, value]) => {
            const element = this.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
}
