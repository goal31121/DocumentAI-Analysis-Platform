import { test, expect } from '@playwright/test';

test.describe('Document Analysis E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should complete full document analysis flow', async ({ page }) => {
    // Step 1: Sign in (if not already signed in)
    const signInButton = page.getByRole('button', { name: /sign in/i });
    if (await signInButton.isVisible()) {
      await signInButton.click();
      // Fill in sign-in form (adjust selectors based on your actual form)
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/documents');
    }

    // Step 2: Navigate to documents page
    await page.goto('http://localhost:3000/documents');
    await expect(page.getByText(/documents/i)).toBeVisible();

    // Step 3: Upload a document (if upload functionality is available)
    // Note: This test assumes you have a test document available
    // In a real scenario, you'd create a test file or use a fixture
    const uploadTab = page.getByRole('tab', { name: /upload/i });
    if (await uploadTab.isVisible()) {
      await uploadTab.click();

      // Check if upload area is visible
      const uploadArea = page.getByText(/drag and drop/i);
      await expect(uploadArea).toBeVisible();
    }

    // Step 4: Navigate to document list
    const listTab = page.getByRole('tab', { name: /my documents/i });
    if (await listTab.isVisible()) {
      await listTab.click();

      // Wait for document list to load
      await page.waitForSelector('[data-testid="document-list"], .empty-state', {
        timeout: 5000,
      });
    }

    // Step 5: If documents exist, click on one to view
    const documentCard = page.locator('[data-testid="document-card"]').first();
    if (await documentCard.isVisible({ timeout: 2000 })) {
      await documentCard.click();

      // Wait for document viewer to load
      await expect(page.getByText(/analysis/i)).toBeVisible({ timeout: 10000 });

      // Step 6: Test Q&A interface
      const qaInput = page.locator('textarea[placeholder*="question"]');
      if (await qaInput.isVisible({ timeout: 2000 })) {
        await qaInput.fill('What is this document about?');
        await page.click('button[type="submit"], button:has-text("Send")');

        // Wait for response (with timeout)
        await page.waitForSelector('.message, [data-testid="ai-response"]', {
          timeout: 30000,
        });
      }

      // Step 7: Test summary tab
      const summaryTab = page.getByRole('tab', { name: /summary/i });
      if (await summaryTab.isVisible()) {
        await summaryTab.click();
        await page.waitForTimeout(2000); // Wait for summary to load
      }

      // Step 8: Test entities tab
      const entitiesTab = page.getByRole('tab', { name: /entities/i });
      if (await entitiesTab.isVisible()) {
        await entitiesTab.click();
        await page.waitForTimeout(2000); // Wait for entities to load
      }

      // Step 9: Test sentiment tab
      const sentimentTab = page.getByRole('tab', { name: /sentiment/i });
      if (await sentimentTab.isVisible()) {
        await sentimentTab.click();
        await page.waitForTimeout(2000); // Wait for sentiment to load
      }
    }
  });

  test('should handle empty document list', async ({ page }) => {
    await page.goto('http://localhost:3000/documents');
    await page.getByRole('tab', { name: /my documents/i }).click();

    // Should show empty state
    const emptyState = page.getByText(/no documents/i);
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('http://localhost:3000/documents');

    // Navigate to analytics
    const analyticsLink = page.getByRole('link', { name: /analytics/i });
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await expect(page.getByText(/analytics/i)).toBeVisible();
    }

    // Navigate back to documents
    const documentsLink = page.getByRole('link', { name: /documents/i });
    if (await documentsLink.isVisible()) {
      await documentsLink.click();
      await expect(page.getByText(/documents/i)).toBeVisible();
    }
  });
});
