import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('ZIP Verifier End-to-End Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');

        // Wait for the page to be fully loaded
        await expect(page.locator('h1')).toContainText('ZIP File Reader & Code Verifier');
        await page.waitForLoadState('networkidle');
    });

    // Helper function to upload a ZIP file
    async function uploadZipFile(page, filename) {
        const filePath = path.resolve(`tests/fixtures/${filename}`);
        await page.setInputFiles('input[type="file"]', filePath);
        await page.getByRole('button', { name: 'Read ZIP File' }).click();
    }

    // Helper function to show ZIP details
    async function showZipDetails(page) {
        await expect(page.getByRole('button', { name: '👁️ Show ZIP Details' })).toBeVisible();
        await page.getByRole('button', { name: '👁️ Show ZIP Details' }).click();
        await expect(page.locator('h3:has-text("📊 ZIP Information")')).toBeVisible();
    }

    // Helper function to verify test results section
    async function verifyTestResultsSection(page, assignmentName, questionCount) {
        await expect(page.locator('h2:has-text("🧪 Code Test Runner")')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('h3:has-text("📊 Test Results")')).toBeVisible();
        await expect(page.locator('text=📁 Assignment Structure Found:')).toBeVisible();
        await expect(page.locator(`li:has-text("${assignmentName}/q1")`)).toBeVisible();
        await expect(page.locator(`li:has-text("${assignmentName}/q2")`)).toBeVisible();
        await expect(page.locator(`text=Total Questions: ${questionCount}`)).toBeVisible();
    }

    // Helper function to verify question results
    async function verifyQuestionResult(page, questionIndex, status, passedTests, totalTests) {
        const statusLocator = page.locator(`text=${status}`).nth(questionIndex);
        await expect(statusLocator).toBeVisible();

        if (passedTests !== undefined && totalTests !== undefined) {
            const testResultLocator = page
                .locator(`text=(${passedTests}/${totalTests} test cases passed)`)
                .nth(questionIndex);
            await expect(testResultLocator).toBeVisible();
        }
    }

    // Helper function to verify ZIP file information
    async function verifyZipInfo(page, filename, fileSize, totalEntries, files, folders) {
        await expect(page.locator(`text=Filename: ${filename}`)).toBeVisible();
        await expect(page.locator(`text=File Size: ${fileSize}`)).toBeVisible();
        await expect(page.locator(`text=Total Entries: ${totalEntries}`)).toBeVisible();
        await expect(page.locator(`text=Files: ${files}`)).toBeVisible();
        await expect(page.locator(`text=Folders: ${folders}`)).toBeVisible();
    }

    // Helper function to verify error conditions (syntax errors, timeouts, etc.)
    async function verifyErrorCondition(page, expectedErrorPatterns) {
        let errorFound = false;

        // Try each pattern until one is found
        for (const pattern of expectedErrorPatterns) {
            try {
                await expect(page.locator(pattern)).toBeVisible({ timeout: 2000 });
                errorFound = true;
                break;
            } catch (e) {
                // Continue to next pattern
                continue;
            }
        }

        // If no specific error pattern found, check for generic error indicator
        if (!errorFound) {
            await expect(page.locator('text=❌')).toBeVisible();
        }

        return errorFound;
    }

    test('should load the application correctly', async ({ page }) => {
        // Check that all main elements are present
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Choose File' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Read ZIP File' })).toBeVisible();

        // Check that the upload section is ready
        await expect(page.locator('h2').first()).toContainText('Select ZIP File');
        await expect(page.locator('p').first()).toContainText('Choose a ZIP file to read and explore its contents');
    });

    test('should handle wrong file structure', async ({ page }) => {
        // Upload the wrong-structure ZIP file
        await page.getByRole('button', { name: 'Choose File' }).click();
        await uploadZipFile(page, 'extra-extra-layer.zip');

        // Wait for ZIP to be processed
        await expect(page.locator('text=✅ Successfully loaded ZIP file:')).toBeVisible({ timeout: 10000 });

        // Check that Code Test Runner shows structure error
        await expect(page.locator('h2:has-text("🧪 Code Test Runner")')).toBeVisible();
        await expect(page.locator('text=❌ No valid assignment structure found')).toBeVisible();

        // Show and verify ZIP details are accessible
        await showZipDetails(page);
    });

    test('should handle file upload process', async ({ page }) => {
        // Initially, the file input should be empty and no success message should be shown
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeVisible();
        await expect(page.locator('text=✅ Successfully loaded ZIP file:')).not.toBeVisible();

        // Upload the file directly to the file input
        await uploadZipFile(page, 'all-correct.zip');

        // Verify that the Code Test Runner section appears and shows correct results
        await verifyTestResultsSection(page, '5MockMSTSetA', 2);

        // Verify that both questions show as accepted with correct test results
        await verifyQuestionResult(page, 0, '✅ Accepted', 3, 3);
        await verifyQuestionResult(page, 1, '✅ Accepted', 3, 3);

        // Show ZIP details and verify they are displayed correctly
        await showZipDetails(page);
        await expect(page.locator('.zip-filename:has-text("all-correct.zip")')).toBeVisible();
    });

    test('should display ZIP file information correctly', async ({ page }) => {
        // Click Choose File and upload
        await page.getByRole('button', { name: 'Choose File' }).click();
        await uploadZipFile(page, 'all-correct.zip');

        // Wait for ZIP to be processed
        await expect(page.locator('text=✅ Successfully loaded ZIP file:')).toBeVisible({ timeout: 10000 });

        // Show ZIP details
        await showZipDetails(page);

        // Verify ZIP information
        await verifyZipInfo(page, 'all-correct.zip', '1.07 KB', '4', '4', '0');

        // Check that file structure is displayed with proper files
        await expect(page.locator('h3:has-text("📂 File Structure")')).toBeVisible();
        await expect(page.locator('#fileTree').getByText('5MockMSTSetA\\q1\\code.js')).toBeVisible();
        await expect(page.locator('#fileTree').getByText('5MockMSTSetA\\q1\\testcases.js')).toBeVisible();
        await expect(page.locator('#fileTree').getByText('5MockMSTSetA\\q2\\code.js')).toBeVisible();
        await expect(page.locator('#fileTree').getByText('5MockMSTSetA\\q2\\testcases.js')).toBeVisible();

        // Check that View and Download buttons are present for each file
        await expect(page.getByRole('button', { name: 'View' })).toHaveCount(4);
        await expect(page.getByRole('button', { name: 'Download' })).toHaveCount(4);

        // Check file sizes and timestamps are displayed
        await expect(page.locator('text=128 B')).toBeVisible(); // code.js files
        await expect(page.locator('text=507 B')).toBeVisible(); // testcases.js files
        await expect(page.locator('text=518 B')).toBeVisible(); // testcases.js files
    });

    test('should handle all-wrong ZIP file with failing test cases', async ({ page }) => {
        // Upload the all-wrong ZIP file
        await uploadZipFile(page, 'all-wrong.zip');

        // Verify test results section with different assignment structure
        await verifyTestResultsSection(page, '7MockMSTSetC', 2);

        // Verify that both questions show as wrong/failed with failing test results
        await verifyQuestionResult(page, 0, '❌ Wrong Answer', 0, 2);
        await verifyQuestionResult(page, 1, '❌ Wrong Answer', 0, 2);

        // Check that detailed error information is shown
        await expect(page.locator('text=Test 1: Wrong Answer').first()).toBeVisible();
        await expect(page.locator('text=Expected:').first()).toBeVisible();
        await expect(page.locator('text=Your output:').first()).toBeVisible();
    });

    test('should handle some-correct ZIP file with mixed test results', async ({ page }) => {
        // Upload the some-correct ZIP file
        await uploadZipFile(page, 'some-correct.zip');

        // Verify test results section with different assignment structure
        await verifyTestResultsSection(page, '6MockMSTSetB', 2);

        // Verify mixed results - q1 correct, q2 wrong
        await expect(page.locator('text=✅ Accepted')).toHaveCount(1); // q1 passes
        await expect(page.locator('text=❌ Wrong Answer')).toHaveCount(1); // q2 fails

        // Check for specific test case results
        await expect(page.locator('text=(2/2 test cases passed)')).toBeVisible(); // q1 passes all tests
        await expect(page.locator('text=(0/2 test cases passed)')).toBeVisible(); // q2 fails all tests
    });

    test('should handle extra-layer ZIP file with correct structure but extra folder', async ({ page }) => {
        // Upload the extra-layer ZIP file
        await uploadZipFile(page, 'extra-layer.zip');

        // Verify test results section shows correct structure despite extra layer
        await verifyTestResultsSection(page, '5MockMSTSetA', 2);

        // Verify that both questions show as accepted (same as all-correct but with extra folder)
        await verifyQuestionResult(page, 0, '✅ Accepted', 3, 3);
        await verifyQuestionResult(page, 1, '✅ Accepted', 3, 3);

        // Show ZIP details and verify extra folder structure
        await showZipDetails(page);
        await verifyZipInfo(page, 'extra-layer.zip', '2.14 KB', '8', '4', '4');
    });

    test('should handle incorrect syntax ZIP file', async ({ page }) => {
        // Upload the incorrect syntax ZIP file
        await uploadZipFile(page, 'incorrect syntax.zip');

        // Verify test results section appears
        await verifyTestResultsSection(page, '5MockMSTSetA', 2);

        // Verify that q1 shows syntax error using the error handler
        await verifyErrorCondition(page, [
            'text=❌ Failed to parse student code: Unexpected token',
            'text=❌ Failed to parse student code',
            'text=SyntaxError',
            'text=Unexpected token',
        ]);

        // Verify that q2 is correct (assuming q2 has correct syntax)
        await expect(page.locator('text=✅ Accepted')).toBeVisible();

        // Show ZIP details and verify file structure
        await showZipDetails(page);
        await verifyZipInfo(page, 'incorrect syntax.zip', '2.2 KB', '8', '4', '4');
    });

    test('should handle infinite loop ZIP file', async ({ page }) => {
        // Upload the infinite loop ZIP file
        await uploadZipFile(page, 'infinite-loop.zip');

        // Verify test results section appears (with longer timeout for processing)
        await expect(page.locator('h2:has-text("🧪 Code Test Runner")')).toBeVisible({ timeout: 20000 });
        await expect(page.locator('h3:has-text("📊 Test Results")')).toBeVisible();

        // Check that assignment structure is found
        await expect(page.locator('text=📁 Assignment Structure Found:')).toBeVisible();

        // Verify that questions show timeout/execution errors using the error handler
        await verifyErrorCondition(page, [
            'text=Time Limit Exceeded',
            'text=timed out after',
            'text=❌ Time Limit Exceeded',
            'text=❌',
        ]);
    });
});
