# ZIP Verifier - E2E Tests

## Overview

This test suite provides comprehensive end-to-end testing for the ZIP file verifier application using Playwright. The tests cover four main scenarios:

1. **All Correct** - Assignment with all test cases passing
2. **Some Correct** - Assignment with mixed results (some pass, some fail)
3. **All Wrong** - Assignment with all test cases failing  
4. **Wrong Structure** - ZIP file that doesn't match expected assignment structure

## Test Files

Pre-created test ZIP files are stored in `tests/fixtures/`:
- `all-correct.zip` - Contains 5MockMSTSetA with correct solutions
- `some-correct.zip` - Contains 6MockMSTSetB with one correct, one wrong solution
- `all-wrong.zip` - Contains 7MockMSTSetC with incorrect solutions
- `wrong-structure.zip` - Contains files in wrong folder structure

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
# Run all tests
npm test

# Run tests with browser UI visible
npm run test:headed

# Debug tests step by step
npm run test:debug

# Start development server manually
npm run serve
```

### CI/CD
```bash
# Run tests in CI mode with JUnit output
npm run test:ci
```

## Test Scenarios

### 1. Application Loading
- Verifies the main interface loads correctly
- Checks all essential UI elements are present
- Validates file input accepts ZIP files

### 2. All Correct Submissions
- Uploads ZIP with all correct solutions
- Verifies "✅ Accepted" status for all questions
- Ensures no failed test cases are shown

### 3. Some Correct Submissions  
- Uploads ZIP with mixed results
- Verifies both "✅ Accepted" and "❌ Wrong Answer" statuses
- Checks failure details are displayed for public test cases

### 4. All Wrong Submissions
- Uploads ZIP with all incorrect solutions
- Verifies "❌ Wrong Answer" status for all questions
- Ensures detailed failure information is shown

### 5. Wrong File Structure
- Uploads ZIP that doesn't match expected structure
- Verifies structure error message is displayed
- Checks helpful suggestions are provided

### 6. File Type Validation
- Tests rejection of non-ZIP files
- Verifies appropriate error messages

### 7. ZIP Content Display
- Tests file tree display functionality
- Verifies ZIP metadata is shown correctly
- Checks file viewing capabilities

## CI Integration

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs tests on:
- Push to main/develop branches
- Pull requests to main branch

Test artifacts and reports are uploaded for review.

## File Structure

```
tests/
├── fixtures/
│   ├── all-correct.zip      # Pre-built test ZIP files
│   ├── some-correct.zip
│   ├── all-wrong.zip
│   ├── wrong-structure.zip
│   └── temp_files/          # Source files used to create ZIPs
└── zip-verifier.spec.js     # Main test file
```