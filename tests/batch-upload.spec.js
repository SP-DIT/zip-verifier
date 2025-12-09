const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * Simple test suite for batch upload functionality
 * Tests the two main scenarios: bulk.zip and sample LMS export.zip
 */

test.describe('Batch Upload Tests', () => {
    // Test fixtures paths - using local workspace files
    const BULK_ZIP_PATH = path.resolve(__dirname, 'fixtures', 'bulk.zip');
    const LMS_EXPORT_PATH = path.resolve(__dirname, 'fixtures', 'sample LMS export.zip');

    test.beforeEach(async ({ page }) => {
        // Navigate to batch processor page
        await page.goto('http://127.0.0.1:3000/batch.html');
        await expect(page).toHaveTitle('Batch ZIP Processor - Instructor Tool');
    });

    test('should process bulk.zip successfully', async ({ page }) => {
        // Upload bulk.zip file
        await page.locator('#bulkFileInput').setInputFiles(BULK_ZIP_PATH);
        await page.locator('#bulkSubmitFile button[type="submit"]').click();

        // Wait for processing to complete
        await expect(page.locator('#progressPercentage')).toHaveText('100%', { timeout: 60000 });

        // Verify results
        await expect(page.locator('#batchResultsContainer')).toBeVisible();

        // Check total submissions count (should be 7 for bulk.zip)
        await expect(page.locator('#totalSubmissions')).toHaveText('7');

        // Verify export buttons are enabled after processing
        await expect(page.locator('#exportCSV')).toBeEnabled();
        await expect(page.locator('#exportJSON')).toBeEnabled();

        // Check that some specific submissions appear in the student progress list
        const studentItems = page.locator('.student-progress-item');
        await expect(studentItems).toHaveCount(7);

        // Check for specific files in the results
        await expect(page.locator('.student-name').filter({ hasText: 'all-correct' })).toBeVisible();
        await expect(page.locator('.student-name').filter({ hasText: 'all-wrong' })).toBeVisible();
    });

    test('should process sample LMS export.zip successfully', async ({ page }) => {
        // Upload LMS export file
        await page.locator('#bulkFileInput').setInputFiles(LMS_EXPORT_PATH);
        await page.locator('#bulkSubmitFile button[type="submit"]').click();

        // Wait for processing to complete (longer timeout for larger file)
        await expect(page.locator('#progressPercentage')).toHaveText('100%', { timeout: 180000 });

        // Verify results
        await expect(page.locator('#batchResultsContainer')).toBeVisible();

        // Check that multiple submissions were processed (LMS export should have many)
        const totalText = await page.locator('#totalSubmissions').textContent();
        const total = parseInt(totalText);
        expect(total).toBeGreaterThan(20); // LMS export should have 20+ submissions

        // Verify export buttons are enabled
        await expect(page.locator('#exportCSV')).toBeEnabled();
        await expect(page.locator('#exportJSON')).toBeEnabled();

        // Check that student submissions appear with expected patterns
        const studentItems = page.locator('.student-progress-item');
        await expect(studentItems.first()).toBeVisible();

        // LMS submissions should contain student IDs and scores
        const firstStudentSummary = page.locator('.student-summary').first();
        await expect(firstStudentSummary).toContainText(/Score: \d+%/);
    });
});
