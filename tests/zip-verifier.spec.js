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
        await expect(page.getByRole('button', { name: 'Choose File' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Read ZIP File' })).toBeVisible();

        // Check that the upload section is ready
        await expect(page.locator('h2').first()).toContainText('Select ZIP File');
        await expect(page.locator('p').first()).toContainText('Choose a ZIP file to read and explore its contents');
    });

    test('should handle wrong file structure', async ({ page }) => {
        // Upload the wrong-structure ZIP file
        const filePath = path.resolve('tests/fixtures/wrong-structure.zip');

        // Click Choose File and upload
        await page.getByRole('button', { name: 'Choose File' }).click();
        await page.setInputFiles('input[type="file"]', filePath);
        await page.getByRole('button', { name: 'Read ZIP File' }).click();

        // Wait for ZIP to be processed
        await expect(page.locator('text=✅ Successfully loaded ZIP file:')).toBeVisible({ timeout: 10000 });

        // Check that ZIP information is still displayed
        await expect(page.locator('h3:has-text("📊 ZIP Information")')).toBeVisible();

        // Check that Code Test Runner shows structure error
        await expect(page.locator('h2:has-text("🧪 Code Test Runner")')).toBeVisible();
        await expect(page.locator('text=❌ Invalid ZIP Structure')).toBeVisible();
        await expect(page.locator('text=ZIP structure does not match expected format')).toBeVisible();

        // Should show expected structure guidance
        await expect(page.locator('text=💡 Suggestion:')).toBeVisible();

        // Should show found vs expected structure comparison
        await expect(page.locator('text=❌ Found structure:')).toBeVisible();
        await expect(page.locator('text=✅ Expected structure:')).toBeVisible();
        await expect(page.locator('.expected-paths').getByText('ProblemSetName/q1/code.js')).toBeVisible();
        await expect(page.locator('.expected-paths').getByText('ProblemSetName/q1/testcases.js')).toBeVisible();
    });

    test('should display ZIP file information correctly', async ({ page }) => {
        const filePath = path.resolve('tests/fixtures/all-correct.zip');

        // Click Choose File and upload
        await page.getByRole('button', { name: 'Choose File' }).click();
        await page.setInputFiles('input[type="file"]', filePath);
        await page.getByRole('button', { name: 'Read ZIP File' }).click();

        // Wait for ZIP to be processed
        await expect(page.locator('text=✅ Successfully loaded ZIP file:')).toBeVisible({ timeout: 10000 });

        // Check that ZIP information is displayed
        await expect(page.locator('h3:has-text("📊 ZIP Information")')).toBeVisible();
        await expect(page.locator('text=Filename: all-correct.zip')).toBeVisible();
        await expect(page.locator('text=File Size: 1.07 KB')).toBeVisible();
        await expect(page.locator('text=Total Entries: 4')).toBeVisible();
        await expect(page.locator('text=Files: 4')).toBeVisible();
        await expect(page.locator('text=Folders: 0')).toBeVisible();

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
});
