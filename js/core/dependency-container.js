// Dependency Injection Container
class DependencyContainer {
    constructor() {
        this.services = new Map();
        this.factories = new Map();
    }

    register(name, factory, singleton = true) {
        this.factories.set(name, { factory, singleton });
        if (!singleton) {
            this.services.delete(name); // Clear any cached instance
        }
    }

    get(name) {
        const factoryInfo = this.factories.get(name);
        if (!factoryInfo) {
            throw new Error(`Service '${name}' not registered`);
        }

        if (factoryInfo.singleton) {
            if (!this.services.has(name)) {
                this.services.set(name, factoryInfo.factory(this));
            }
            return this.services.get(name);
        } else {
            return factoryInfo.factory(this);
        }
    }

    has(name) {
        return this.factories.has(name);
    }

    // Bootstrap method to register all services
    bootstrap() {
        // Core utilities
        this.register('domUtils', () => new DOMUtils(document));
        this.register('fileUtils', () => new FileUtils());
        this.register('consoleManager', () => new ConsoleManager(console));

        // Services that depend on core utilities
        this.register('notificationService', (container) => new NotificationService(container.get('domUtils')));

        this.register('testExecutor', (container) => new TestExecutor(container.get('consoleManager')));

        this.register(
            'testRunnerService',
            (container) =>
                new TestRunnerService(
                    container.get('testExecutor'),
                    container.get('fileUtils'),
                    container.get('assignmentGrader'),
                ),
        );

        // UI Manager with proper dependencies
        this.register(
            'uiManager',
            (container) => new UIManager(document, container.get('domUtils'), container.get('notificationService')),
        );

        // Services that depend on UI Manager
        this.register(
            'fileViewer',
            (container) =>
                new FileViewer(
                    container.get('uiManager'),
                    container.get('fileUtils'),
                    document,
                    container.get('domUtils'),
                ),
        );

        this.register(
            'assignmentGrader',
            (container) => new AssignmentGrader(container.get('testExecutor'), container.get('fileUtils'), document),
        );

        // Batch processing services
        this.register(
            'batchProcessor',
            (container) =>
                new BatchProcessor(container.get('testRunnerService'), AppConfig.BATCH_SETTINGS.DEFAULT_BATCH_SIZE),
        );
        this.register('progressManager', (container) => new ProgressManager(container.get('domUtils')));
        this.register('resultsExporter', () => new ResultsExporter());

        // Upload handlers with proper dependencies
        this.register(
            'uploadHandler',
            (container) =>
                new UploadHandler(
                    container.get('uiManager'),
                    container.get('fileViewer'),
                    container.get('testRunnerService'),
                    document,
                    console,
                    FileReader,
                    JSZip,
                    container.get('domUtils'),
                    container.get('notificationService'),
                ),
        );

        this.register(
            'batchUploadHandler',
            (container) =>
                new BatchUploadHandler(
                    container.get('batchProcessor'),
                    container.get('progressManager'),
                    container.get('resultsExporter'),
                    document,
                    console,
                    FileReader,
                    JSZip,
                    container.get('domUtils'),
                    container.get('notificationService'),
                ),
        );

        // Base upload handler
        this.register(
            'baseUploadHandler',
            (container) => new BaseUploadHandler(container.get('domUtils'), container.get('notificationService')),
        );

        return this;
    }

    // Create a new scoped container for specific contexts
    createScope() {
        const scope = new DependencyContainer();

        // Copy all factory registrations
        this.factories.forEach((factoryInfo, name) => {
            scope.register(name, factoryInfo.factory, factoryInfo.singleton);
        });

        return scope;
    }
}

// Global container instance
const container = new DependencyContainer().bootstrap();
