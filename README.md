# ZIP Verifier - E2E Tests

## Overview

This comprehensive test suite provides end-to-end testing for the ZIP file verifier application using Playwright. The application now includes both a **Student Verifier** tool and a **Batch Processor** for instructors, with extensive test coverage for various scenarios including edge cases and error handling.

### Student Verifier Features
Tests cover the main verification scenarios:

1. **All Correct** - Assignment with all test cases passing
2. **Some Correct** - Assignment with mixed results (some pass, some fail)
3. **All Wrong** - Assignment with all test cases failing  
4. **Wrong Structure** - ZIP file that doesn't match expected assignment structure
5. **Extra Layer Structure** - ZIP files with additional folder nesting
6. **Syntax Errors** - Handling JavaScript syntax errors in student code
7. **Infinite Loops** - Timeout handling for problematic code execution

### Batch Processor Features
Tests for instructor tools:

1. **Bulk Processing** - Handle multiple student submissions in one ZIP file
2. **LMS Export Processing** - Process exports from Learning Management Systems
3. **Progress Tracking** - Real-time processing progress and results
4. **Results Export** - CSV and JSON export functionality

## Test Files

Pre-created test ZIP files are stored in `tests/fixtures/`:

### Core Test Cases
- `all-correct.zip` - Contains 5MockMSTSetA with correct solutions
- `some-correct.zip` - Contains 6MockMSTSetB with one correct, one wrong solution
- `all-wrong.zip` - Contains 7MockMSTSetC with incorrect solutions

### Edge Cases & Error Handling
- `extra-layer.zip` - Assignment with additional folder nesting (still valid structure)
- `incorrect syntax.zip` - Contains JavaScript files with syntax errors
- `infinite-loop.zip` - Contains code that would cause infinite loops/timeouts

### Batch Processing
- `bulk.zip` - Contains 7 student submissions for bulk processing
- `sample LMS export.zip` - Simulates real LMS export format with 20+ submissions

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

## Test Scenarios

### Student Verifier Tests (`zip-verifier.spec.js`)

#### 1. Application Loading
- Verifies the main interface loads correctly
- Checks all essential UI elements are present
- Validates file input accepts ZIP files

#### 2. All Correct Submissions
- Uploads ZIP with all correct solutions
- Verifies "✅ Accepted" status for all questions
- Ensures no failed test cases are shown

#### 3. Some Correct Submissions  
- Uploads ZIP with mixed results
- Verifies both "✅ Accepted" and "❌ Wrong Answer" statuses
- Checks failure details are displayed for public test cases

#### 4. All Wrong Submissions
- Uploads ZIP with all incorrect solutions
- Verifies "❌ Wrong Answer" status for all questions
- Ensures detailed failure information is shown

#### 5. Wrong File Structure
- Uploads ZIP that doesn't match expected structure
- Verifies structure error message is displayed
- Checks helpful suggestions are provided

#### 6. Extra Layer Structure Handling
- Tests ZIP files with additional folder nesting
- Verifies the system can still find valid assignment structure
- Ensures proper processing despite extra folders

#### 7. Syntax Error Handling
- Tests JavaScript files with syntax errors
- Verifies proper error messages are displayed
- Ensures other valid questions still process correctly

#### 8. Infinite Loop/Timeout Handling
- Tests code that would cause infinite loops
- Verifies timeout mechanisms work properly
- Ensures system doesn't hang during processing

#### 9. ZIP Content Display
- Tests file tree display functionality
- Verifies ZIP metadata is shown correctly
- Checks file viewing capabilities

### Batch Processor Tests (`batch-upload.spec.js`)

#### 1. Bulk ZIP Processing
- Tests processing of multiple student submissions in one file
- Verifies progress tracking during processing
- Validates results summary with submission counts
- Tests CSV/JSON export functionality

#### 2. LMS Export Processing
- Tests processing of realistic LMS export files
- Handles 20+ student submissions efficiently
- Verifies proper parsing of student IDs and scores
- Tests scalability with larger datasets

## Application Architecture

The application consists of two main interfaces:

### Student Verifier (`index.html`)
- Single ZIP file upload and verification
- Real-time test execution and results display
- Detailed error reporting and code analysis
- ZIP file content exploration

### Batch Processor (`batch.html`) 
- Instructor tool for processing multiple submissions
- Progress tracking for bulk operations
- Results aggregation and export capabilities
- Support for various LMS export formats

## CI Integration

The GitHub Actions workflow runs tests on:
- Push to main/develop branches
- Pull requests to main branch

Test artifacts and reports are uploaded for review.

## File Structure

```
tests/
├── fixtures/
│   ├── all-correct.zip           # Perfect submission
│   ├── some-correct.zip          # Mixed results
│   ├── all-wrong.zip             # All failing tests
│   ├── extra-layer.zip           # Extra folder nesting
│   ├── incorrect syntax.zip      # JavaScript syntax errors  
│   ├── infinite-loop.zip         # Timeout/infinite loop code
│   ├── bulk.zip                  # 7 submissions for batch testing
│   ├── sample LMS export.zip     # Realistic LMS export (20+ submissions)
│   └── temp_files/               # Source files used to create ZIPs
├── zip-verifier.spec.js          # Student verifier tests (11 test cases)
└── batch-upload.spec.js          # Batch processor tests (2 test cases)
```

### Test Coverage Summary
- **Total Test Cases**: 13 automated tests
- **Student Verifier**: 11 comprehensive test scenarios
- **Batch Processor**: 2 bulk processing scenarios
- **Edge Cases**: Syntax errors, timeouts, structure variations
- **Error Handling**: Comprehensive validation and user feedback