// Console Manager Module
class ConsoleManager {
    constructor(console) {
        this.console = console;
        this.originalConsoleLog = null;
    }

    silence() {
        if (this.originalConsoleLog === null) {
            this.originalConsoleLog = this.console.log;
            this.console.log = () => {}; // Silent function
        }
    }

    restore() {
        if (this.originalConsoleLog !== null) {
            this.console.log = this.originalConsoleLog;
            this.originalConsoleLog = null;
        }
    }
}
