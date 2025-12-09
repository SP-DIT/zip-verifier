# ZIP Verifier - E2E Tests

## Overview

This comprehensive test suite provides end-to-end testing for the ZIP file verifier application using Playwright. The application includes both a **Student Verifier** tool and a **Batch Processor** for instructors.

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
