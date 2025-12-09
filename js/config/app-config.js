// Application Configuration
class AppConfig {
    static TIMEOUTS = {
        CODE_EXECUTION: 2000,
        MESSAGE_DISPLAY: 5000,
        SUCCESS_MESSAGE: 3000,
        BATCH_DELAY: 100,
    };

    static BATCH_SETTINGS = {
        DEFAULT_BATCH_SIZE: 4,
        MAX_BATCH_SIZE: 10,
    };

    static FILE_EXTENSIONS = {
        TEXT_FILES: [
            'txt',
            'md',
            'js',
            'html',
            'htm',
            'css',
            'json',
            'xml',
            'csv',
            'log',
            'sql',
            'py',
            'java',
            'c',
            'cpp',
            'h',
            'php',
            'rb',
            'go',
            'rs',
            'sh',
            'bat',
            'yml',
            'yaml',
        ],
        ARCHIVE_FILES: ['zip', 'rar'],
        IMAGE_FILES: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
        DOCUMENT_FILES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
        AUDIO_FILES: ['mp3', 'wav'],
        VIDEO_FILES: ['mp4', 'avi'],
        EXECUTABLE_FILES: ['exe', 'msi'],
    };

    static ICONS = {
        FOLDER: '📁',
        DEFAULT_FILE: '📄',
        EXTENSION_MAP: {
            // Text files
            txt: '📄',
            md: '📄',
            js: '📜',
            html: '🌐',
            htm: '🌐',
            css: '🎨',
            json: '📋',
            xml: '📋',
            // Documents
            pdf: '📕',
            doc: '📘',
            docx: '📘',
            xls: '📗',
            xlsx: '📗',
            ppt: '📙',
            pptx: '📙',
            // Archives
            zip: '🗜️',
            rar: '🗜️',
            // Images
            jpg: '🖼️',
            jpeg: '🖼️',
            png: '🖼️',
            gif: '🖼️',
            svg: '🖼️',
            // Audio/Video
            mp3: '🎵',
            wav: '🎵',
            mp4: '🎬',
            avi: '🎬',
            // Executables
            exe: '⚙️',
            msi: '⚙️',
        },
    };

    static MESSAGE_TYPES = {
        ERROR: 'error',
        SUCCESS: 'success',
        WARNING: 'warning',
        INFO: 'info',
    };

    static CSS_CLASSES = {
        UPLOAD_DRAGOVER: 'upload-section--dragover',
        FILE_CONTENT_VISIBLE: 'file-content--visible',
        ZIP_CONTENT_VISIBLE: 'zip-content--visible',
        TEST_RUNNER_VISIBLE: 'test-runner--visible',
        LOADING_VISIBLE: 'loading--visible',
        BATCH_PROGRESS_VISIBLE: 'batch-progress--visible',
        BATCH_RESULTS_VISIBLE: 'batch-results--visible',
    };

    static getIcon(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        return this.ICONS.EXTENSION_MAP[ext] || this.ICONS.DEFAULT_FILE;
    }

    static isTextFile(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        return this.FILE_EXTENSIONS.TEXT_FILES.includes(ext);
    }
}
