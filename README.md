# ZIP Verifier - AI-Assisted Development Journey

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://sp-dit.github.io/zip-verifier/)

## Overview

This ZIP Verifier provides students a chance to verify their code submission before uploading to Brightspace. During FOP's MST/EST, students occasionally submit the wrong zip file (blank template instead of their completed code), resulting in automatic zero scores. This tool allows verification of zip files by executing code against test cases within the browser.

The application includes both a **Student Verifier** tool for individual submissions and a **Batch Processor** for instructors to handle multiple submissions efficiently. This comprehensive test suite provides end-to-end testing using Playwright.

## Setup

1. Install dependencies:

    ```bash
    npm install
    ```

2. Install Playwright browsers:
    ```bash
    npx playwright install
    ```

## Running Tests

### Local Development

```bash
# Run all tests (both student verifier and batch processor)
npm test

# Run tests with browser UI visible
npm run test:headed

# Debug tests step by step
npm run test:debug

# Start development server manually
npm run serve
```

### Individual Test Suites

```bash
# Run only student verifier tests
npx playwright test zip-verifier.spec.js

# Run only batch processor tests
npx playwright test batch-upload.spec.js
```

### CI/CD

```bash
# Run tests in CI mode with JUnit output
npm run test:ci
```

## Application Architecture

The application consists of two main interfaces with a sophisticated modular architecture built around dependency injection and service-oriented design patterns.

### System Overview

```mermaid
flowchart TB
    subgraph "User Interfaces"
        Student[Student Verifier<br/>Single ZIP Processing]
        Batch[Batch Processor<br/>Bulk ZIP Processing]
    end

    subgraph "Core Services"
        TestRunner[TestRunnerService<br/>Test Orchestration]
        BatchProc[BatchProcessor<br/>Bulk Operations]
    end

    subgraph "Infrastructure"
        DI[Dependency Injection<br/>Container]
        Base[Base Classes<br/>& Utilities]
    end

    Student --> TestRunner
    Batch --> BatchProc
    BatchProc --> TestRunner

    DI --> Student
    DI --> Batch
    DI --> TestRunner
    DI --> BatchProc

    TestRunner --> Base
    BatchProc --> Base
```

### Student Verifier Architecture

```mermaid
flowchart LR
    subgraph "Student Interface"
        UI_Student[index.html<br/>Student Interface]
    end

    subgraph "Upload Processing"
        UH[UploadHandler]
        Base[BaseUploadHandler]
    end

    subgraph "File Analysis & Viewing"
        FU[FileUtils]
        FV[FileViewer]
    end

    subgraph "Test Execution"
        TE[TestExecutor]
        TRS[TestRunnerService]
        AG[AssignmentGrader]
        CM[ConsoleManager]
    end

    subgraph "User Experience"
        NS[NotificationService]
        UI_Mgr[UIManager]
        DOM[DOMUtils]
    end

    UI_Student --> UH
    UH --> Base
    UH --> TRS
    UH --> FV

    TRS --> AG
    TRS --> TE
    AG --> TE

    TE --> CM

    UH --> UI_Mgr
    Base --> NS
    NS --> DOM
    UI_Mgr --> DOM

    FV --> UI_Mgr
    FV --> FU
```

### Batch Processor Architecture

```mermaid
flowchart LR
    subgraph "Batch Interface"
        UI_Batch[batch.html<br/>Instructor Interface]
    end

    subgraph "Bulk Processing"
        BUH[BatchUploadHandler]
        BP[BatchProcessor]
        TRS[TestRunnerService]
    end

    subgraph "Progress & Results"
        PM[ProgressManager]
        RE[ResultsExporter]
    end

    subgraph "Core Services"
        AG[AssignmentGrader]
        TE[TestExecutor]
        Base[BaseUploadHandler]
    end

    subgraph "Note: Batch Processing"
        Note["🎯 No FileViewer needed<br/>Focus on bulk results<br/>not individual file viewing"]
    end

    subgraph "UI Infrastructure"
        DOM[DOMUtils]
        NS[NotificationService]
    end

    UI_Batch --> BUH
    BUH --> Base
    BUH --> BP
    BUH --> PM
    BUH --> RE

    BP --> TRS
    TRS --> AG
    AG --> TE

    PM --> DOM
    Base --> NS
    NS --> DOM

    BP --> AG
```

### Service Dependencies & Interactions

```mermaid
classDiagram
    class BaseUploadHandler {
        +DOMUtils domUtils
        +NotificationService notificationService
        +isValidZipFile(file)
        +setupDragAndDrop()
        +handleSubmit()
    }

    class UploadHandler {
        +UIManager uiManager
        +FileViewer fileViewer
        +TestRunnerService testRunnerService
        +readZipFile()
        +processZipContent()
    }

    class BatchUploadHandler {
        +BatchProcessor batchProcessor
        +ProgressManager progressManager
        +ResultsExporter resultsExporter
        +readBulkZipFile()
        +processBulkSubmissions()
    }

    class AssignmentGrader {
        +TestExecutor testExecutor
        +FileUtils fileUtils
        +detectAssignmentStructure()
        +runTestsOnAssignment()
    }

    class TestExecutor {
        +ConsoleManager consoleManager
        +executeTests()
        +executeWithTimeout()
    }

    class NotificationService {
        +DOMUtils domUtils
        +showError()
        +showSuccess()
    }

    class FileViewer {
        +UIManager uiManager
        +FileUtils fileUtils
        +viewFile()
        +downloadFile()
    }

    class BatchProcessor {
        +TestRunnerService testRunnerService
        +extractStudentSubmissions()
        +processAll()
    }

    class TestRunnerService {
        +TestExecutor testExecutor
        +FileUtils fileUtils
        +AssignmentGrader assignmentGrader
        +runTestsForAssignment()
        +processSubmissionTests()
        +analyzeAssignmentStructure()
        +processAssignmentWithUI()
    }

    %% Inheritance relationships
    BaseUploadHandler <|-- UploadHandler
    BaseUploadHandler <|-- BatchUploadHandler

    %% Core dependencies (what each class needs to function)
    UploadHandler --> TestRunnerService
    UploadHandler --> FileViewer
    BatchUploadHandler --> BatchProcessor
    BatchUploadHandler --> ProgressManager
    BatchUploadHandler --> ResultsExporter
    BatchProcessor --> TestRunnerService
    TestRunnerService --> TestExecutor
    TestRunnerService --> AssignmentGrader
    AssignmentGrader --> TestExecutor
    TestExecutor --> ConsoleManager

    %% Service usage relationships
    BaseUploadHandler --> NotificationService
    NotificationService --> DOMUtils
    FileViewer --> UIManager
    FileViewer --> FileUtils

    %% Note: FileViewer is only used by UploadHandler (Student Interface)
    %% BatchUploadHandler (Instructor Interface) focuses on bulk processing
    %% without individual file viewing capabilities
```

### Dependency Injection Container Architecture

```mermaid
flowchart TB
    subgraph "Dependency Container Pattern"
        DC[DependencyContainer<br/>Central Service Registry]

        subgraph "Service Factories"
            F1[Core Services Factory<br/>DOM, File Utils, Console]
            F2[UI Services Factory<br/>Notification, UI Manager]
            F3[Processing Factory<br/>Test Executor, Grader]
            F4[Batch Services Factory<br/>Processor, Progress, Export]
        end

        subgraph "Runtime Services"
            Core[Core Services<br/>DOMUtils, FileUtils, ConsoleManager]
            UI[UI Services<br/>NotificationService, UIManager, FileViewer]
            Process[Processing Services<br/>TestExecutor, AssignmentGrader]
            Batch[Batch Services<br/>BatchProcessor, ProgressManager, ResultsExporter]
        end

        subgraph "Application Components"
            UH[UploadHandler]
            BUH[BatchUploadHandler]
        end
    end

    DC --> F1
    DC --> F2
    DC --> F3
    DC --> F4

    F1 --> Core
    F2 --> UI
    F3 --> Process
    F4 --> Batch

    Core --> UH
    UI --> UH
    Process --> UH

    Core --> BUH
    UI --> BUH
    Batch --> BUH

    style DC fill:#e1f5fe
    style UH fill:#f3e5f5
    style BUH fill:#f3e5f5
```

### Test Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UH as UploadHandler
    participant TRS as TestRunnerService
    participant AG as AssignmentGrader
    participant TE as TestExecutor
    participant UI as UIManager

    U->>UH: Upload ZIP file
    UH->>TRS: analyzeAssignmentStructure(zip)
    TRS->>AG: analyzeZipStructure(zip)
    TRS-->>UH: structure analysis

    alt Valid Structure
        UH->>TRS: processAssignmentWithUI(zip)
        TRS->>AG: runTestsOnAssignment(zip)

        AG->>AG: extractAssignmentStructure(zip)
        AG->>AG: runAllTests(zip, structure)

        loop For each question
            AG->>AG: runTestsForQuestion(zip, item)
            AG->>TE: executeTests(code, tests)
            TE->>TE: parseCodeModule(code)
            TE->>TE: parseTestModule(tests)
            TE->>TE: executeWithTimeout(func, args)
            TE-->>AG: test results
        end

        AG->>UI: displayTestResults(results)
    else Invalid Structure
        UH->>TRS: processAssignmentWithUI(zip)
        TRS->>AG: runTestsOnAssignment(zip)
        AG->>UI: displayStructureError(analysis)
    end

    UI-->>U: Display results/errors
```

### Batch Processing Flow

```mermaid
sequenceDiagram
    participant I as Instructor
    participant BUH as BatchUploadHandler
    participant BP as BatchProcessor
    participant PM as ProgressManager
    participant TRS as TestRunnerService
    participant RE as ResultsExporter

    I->>BUH: Upload bulk ZIP
    BUH->>BP: extractStudentSubmissions(bulkZip)
    BP->>PM: initialize(submissions)

    BUH->>BP: processAll(progressCallback)

    loop Process batches
        BP->>BP: createBatches()

        loop For each batch
            BP->>TRS: processSubmissionTests(submission)
            TRS-->>BP: submission results
            BP->>PM: updateProgress(progress)
        end
    end

    BP-->>BUH: final results
    BUH->>RE: exportResults(format)
    RE-->>I: Download results file
```

## AI-First Development Approach

The majority of this application was built through collaboration with **GitHub Copilot Agent mode powered by Claude Sonnet 4**, showcasing an advanced AI-assisted development workflow with sophisticated optimization techniques.

### Technical Stack & Architecture

-   **Frontend Only**: Complete client-side ZIP processing using JSZip library - no backend server required
-   **GitHub Pages**: Static site hosting for maximum accessibility
-   **GitHub Codespaces**: Development environment enabling Playwright testing when local machines have process spawning restrictions
-   **Playwright Testing**: Comprehensive E2E testing covering 13 automated scenarios
-   **CI/CD Pipeline**: Optimized GitHub Actions with smart browser caching (70% deployment time reduction)

---

### AI Collaboration Evolution

This project demonstrates a **two-week development journey** (Nov 25 - Dec 9, 2025) with 22+ commits, showcasing how AI collaboration evolves over time rather than being a one-shot solution.

**Development Timeline:**

-   **Week 1 (Nov 25-26)**: Initial prototype with core ZIP verification functionality
-   **Week 2 (Dec 4)**: Architecture reflection and extra folder detection improvements
-   **Week 3 (Dec 9)**: Major AI collaboration optimizations - 18 commits in a single day showing intensive AI-human collaboration

**AI Collaboration Techniques:**

#### 1. Model Context Protocol (MCP) Integration

-   **Context7 MCP**: Up-to-date documentation access for libraries and frameworks
-   **Playwright MCP**: Enabled Copilot to write and verify comprehensive test suites
-   **Browser MCP**: Real-time testing and debugging during development

#### 2. Smart Environment Detection

Implemented `process.env.AI` detection in Playwright configuration:

```javascript
reporter: process.env.CI ? 'github' : process.env.AI ? 'junit' : 'html';
```

This automatically switches to JUnit reporting when working with AI agents, improving the collaboration feedback loop.

#### 3. Mermaid.js Documentation Strategy

Created comprehensive architectural diagrams serving dual purposes:

-   **Human Documentation**: Visual system overview for developers
-   **AI Context**: Rich structural information for Copilot to understand codebase architecture

#### 4. Modular Architecture for AI Collaboration

Transitioned from single HTML file to sophisticated **dependency injection pattern**:

-   Individual service classes with clear responsibilities
-   Container-managed dependencies for better testability
-   Separate concerns between UI, business logic, and testing
-   Clean interfaces that AI can understand and extend

---

### Challenges & Solutions

#### 1. Context Window Management

**Problem**: Initially, Copilot generated everything in a single HTML file, creating:

-   Files too large for context windows
-   AI producing inconsistent code
-   Nearly impossible debugging

**Solution**: Refactored into modular classes with dependency injection, making codebase manageable for both humans and AI.

#### 2. Architectural Control

**Problem**: Copilot defaulted to global scope and static methods, hindering:

-   Unit testing in isolation
-   Dependency management
-   Code maintainability

**Solution**: Explicitly requested dependency injection patterns, resulting in cleaner and testable architecture.

#### 3. Cross-Platform Compatibility

**Problem**: AI initially unaware of different operating systems with different path separators (`/` vs `\`).

**Solution**: Implemented path normalization middleware to handle cross-platform file path differences.

---

### Key Accomplishments

#### AI-Suggested Feature Enhancements

Copilot proactively introduced valuable features beyond original scope:

-   File tree visualization with type-specific emojis
-   Comprehensive ZIP metadata display
-   Drag-and-drop upload interface
-   Real-time progress tracking for batch operations

#### Sophisticated Architecture

Despite being AI-generated, final architecture includes:

-   Dependency injection container
-   Service-oriented design
-   Comprehensive test coverage (13 automated scenarios)
-   Clean separation of concerns

#### AI Collaboration Optimizations

Developed techniques that significantly improved AI productivity:

-   Environment-aware configurations
-   Visual architecture documentation
-   Modular code organization
-   MCP-enhanced context awareness

---

### Lessons Learned

#### 1. Scope Control is Critical

Without clear boundaries, AI agents can pursue unnecessary tangents. Clear, focused instructions are essential through:

-   **Architectural Diagrams**: Mermaid.js flowcharts provide visual boundaries and expected component interactions
-   **Configuration Files**: Playwright config with environment detection establishes clear testing contexts
-   **Dependency Injection Patterns**: Explicit service boundaries prevent unwanted global dependencies
-   **Test Fixtures**: Pre-defined scenarios communicate expected behavior patterns without ambiguity

#### 2. Architecture-First Approach

Having conceptual overview before engaging AI is crucial. Starting small but establishing architectural principles early prevents:

-   **Unnecessary Dependencies**: Circular references and overly complex service relationships
-   **Tangled Code Structure**: Tightly coupled components without clear boundaries
-   **Difficult Maintenance**: Unexpected breakage when changing unrelated functionality

**Key Insight**: Visual documentation helps identify when AI-generated complexity needs human intervention and simplification.

#### 3. MCP Integration Benefits

Model Context Protocols dramatically improve AI capability by providing:

-   Real-time documentation access
-   Enhanced testing capabilities
-   Better understanding of complex workflows

---

### Technical Achievements

-   **Zero Backend Dependencies**: Fully client-side processing
-   **Cross-Platform Compatibility**: Handles Windows, macOS, and Linux submissions
-   **Comprehensive Testing**: 13 automated test scenarios covering edge cases
-   **CI/CD Optimization**: Smart browser caching reduces deployment time by 70%
-   **Accessibility**: Works across all major browsers without plugins

---

### Future Vision

#### Short-term Improvements

-   Enhanced user messaging to clarify verification vs submission
-   Better error messaging for edge cases
-   Mobile-responsive interface improvements

#### Long-term Enhancements

-   **Student Submission Tracking**: Monitor patterns and progress to identify students needing support
-   **Gamification Elements**: Achievement badges for clean code, early submissions, comprehensive testing
-   **User Management System**: Student profiles with submission history and performance analytics
-   **Learning Analytics Dashboard**: Instructor insights into common patterns, mistakes, and class progress
-   **Collaborative Learning Features**: Peer code review and study group formation based on complementary skills
