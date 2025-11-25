import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('ZIP Verifier End-to-End Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');

        // Wait for the page to be fully loaded
        await expect(page.locator('h1')).toContainText('ZIP File Reader & Code Verifier');
        await page.waitForLoadState('networkidle');
    });

    test('should load the application correctly', async ({ page }) => {
        // Check that all main elements are present
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('#fileInput')).toBeVisible();
        await expect(page.locator('#uploadBtn')).toBeVisible();

        // Check that the upload section is ready
        await expect(page.locator('.upload-section')).toBeVisible();
        await expect(page.locator('#fileInput')).toHaveAttribute('accept', '.zip');
    });

    test('should handle all correct assignment submissions', async ({ page }) => {
        // Upload the all-correct ZIP file
        const filePath = path.resolve('tests/fixtures/all-correct.zip');
        await page.locator('#fileInput').setInputFiles(filePath);

        // Wait for processing
        await page.waitForSelector('#testResults', { timeout: 10000 });

        // Check that test runner is visible
        await expect(page.locator('.test-runner-section')).toBeVisible();

        // Check for successful results
        await expect(page.locator('#testResults')).toContainText('Running tests');

        // Wait for tests to complete and check for "Accepted" results
        await expect(page.locator('.test-case.test-passed')).toHaveCount(2, { timeout: 15000 });
        await expect(page.locator('#testResults')).toContainText('✅ Accepted');

        // Verify no failed tests are shown
        await expect(page.locator('.test-case.test-failed')).toHaveCount(0);

        // Check that ZIP content is also displayed
        await expect(page.locator('#zipInfo')).toBeVisible();
        await expect(page.locator('#fileTree')).toBeVisible();
    });

    test('should handle some correct assignment submissions', async ({ page }) => {
        // Upload the some-correct ZIP file
        const filePath = path.resolve('tests/fixtures/some-correct.zip');
        await page.locator('#fileInput').setInputFiles(filePath);

        // Wait for processing
        await page.waitForSelector('#testResults', { timeout: 10000 });

        // Check that test runner is visible
        await expect(page.locator('.test-runner-section')).toBeVisible();

        // Wait for tests to complete
        await page.waitForSelector('.test-case', { timeout: 15000 });

        // Should have one passed (q1) and one failed (q2)
        await expect(page.locator('.test-case.test-passed')).toHaveCount(1);
        await expect(page.locator('.test-case.test-failed')).toHaveCount(1);

        // Check for both "Accepted" and "Wrong Answer" results
        await expect(page.locator('#testResults')).toContainText('✅ Accepted');
        await expect(page.locator('#testResults')).toContainText('❌ Wrong Answer');

        // Verify that failure details are shown for public test cases
        await expect(page.locator('.test-case--details')).toBeVisible();
    });

    test('should handle all wrong assignment submissions', async ({ page }) => {
        // Upload the all-wrong ZIP file
        const filePath = path.resolve('tests/fixtures/all-wrong.zip');
        await page.locator('#fileInput').setInputFiles(filePath);

        // Wait for processing
        await page.waitForSelector('#testResults', { timeout: 10000 });

        // Check that test runner is visible
        await expect(page.locator('.test-runner-section')).toBeVisible();

        // Wait for tests to complete
        await page.waitForSelector('.test-case', { timeout: 15000 });

        // Should have all failed tests
        await expect(page.locator('.test-case.test-passed')).toHaveCount(0);
        await expect(page.locator('.test-case.test-failed')).toHaveCount(2);

        // Check that all results show "Wrong Answer"
        await expect(page.locator('#testResults')).toContainText('❌ Wrong Answer');
        await expect(page.locator('#testResults')).not.toContainText('✅ Accepted');

        // Verify that failure details are shown for public test cases
        await expect(page.locator('.test-case--details')).toBeVisible();
        await expect(page.locator('#testResults')).toContainText('Input:');
        await expect(page.locator('#testResults')).toContainText('Expected:');
        await expect(page.locator('#testResults')).toContainText('Your output:');
    });

    test('should handle wrong file structure', async ({ page }) => {
        // Upload the wrong-structure ZIP file
        const filePath = path.resolve('tests/fixtures/wrong-structure.zip');
        await page.locator('#fileInput').setInputFiles(filePath);

        // Wait for processing
        await page.waitForSelector('#testResults', { timeout: 10000 });

        // Check that test runner is visible
        await expect(page.locator('.test-runner-section')).toBeVisible();

        // Should show structure error
        await expect(page.locator('#testResults')).toContainText('ZIP structure does not match expected format');
        await expect(page.locator('.error-message')).toBeVisible();
        await expect(page.locator('.error-suggestion')).toBeVisible();

        // Should show expected structure guidance
        await expect(page.locator('#testResults')).toContainText('Expected structure:');
        await expect(page.locator('#testResults')).toContainText('ProblemSetName/q1/code.js');

        // Should not show test results since structure is invalid
        await expect(page.locator('.test-case.test-passed')).toHaveCount(0);
        await expect(page.locator('.test-case.test-failed')).toHaveCount(0);
    });

    test('should validate file type and show error for non-ZIP files', async ({ page }) => {
        // Try to upload a text file instead of ZIP by creating a temporary text file
        const textContent = 'This is not a zip file';
        const textFile = new File([textContent], 'test.txt', { type: 'text/plain' });

        // Create a temporary input element to simulate file selection
        await page.evaluate(() => {
            const input = document.getElementById('fileInput');
            const dt = new DataTransfer();
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            dt.items.add(file);
            input.files = dt.files;

            // Manually trigger the form submission
            const form = document.getElementById('submitFile');
            form.dispatchEvent(new Event('submit'));
        });

        // Should show error message
        await expect(page.locator('.message.message--error')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.message')).toContainText('Please select a valid ZIP file');

        // Should not show test runner or ZIP content
        await expect(page.locator('.test-runner-section')).not.toBeVisible();
        await expect(page.locator('#zipInfo')).not.toBeVisible();
    });

    test('should display ZIP file information correctly', async ({ page }) => {
        const filePath = path.resolve('tests/fixtures/all-correct.zip');
        await page.locator('#fileInput').setInputFiles(filePath);

        // Wait for ZIP content to be displayed
        await page.waitForSelector('#zipInfo', { timeout: 10000 });

        // Check that ZIP information is displayed
        await expect(page.locator('.zip-filename')).toContainText('all-correct.zip');
        await expect(page.locator('.zip-filesize')).toBeVisible();
        await expect(page.locator('.zip-total-entries')).toBeVisible();
        await expect(page.locator('.zip-files')).toBeVisible();
        await expect(page.locator('.zip-folders')).toBeVisible();

        // Check that file tree is displayed
        await expect(page.locator('#fileTree')).toBeVisible();
        await expect(page.locator('.file-item')).toHaveCount(6); // 2 folders (q1, q2) + 4 files

        // Check that files have appropriate icons and actions
        await expect(page.locator('.file-item .file-icon')).toContainText(['📁', '📄']);
        await expect(page.locator('.btn--view')).toBeVisible();
        await expect(page.locator('.btn--download')).toBeVisible();
    });

    test('should handle file viewing from ZIP content', async ({ page }) => {
        const filePath = path.resolve('tests/fixtures/all-correct.zip');
        await page.locator('#fileInput').setInputFiles(filePath);

        // Wait for file tree to be displayed
        await page.waitForSelector('#fileTree .btn--view', { timeout: 10000 });

        // Click view button for a code file
        await page.locator('#fileTree .btn--view').first().click();

        // Check that file content is displayed
        await expect(page.locator('.file-content-section')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('#fileContent')).toBeVisible();
        await expect(page.locator('.file-name')).toBeVisible();

        // Should show syntax highlighted code
        await expect(page.locator('#fileContent')).toContainText('function');
        await expect(page.locator('#fileContent')).toContainText('module.exports');
    });
});
