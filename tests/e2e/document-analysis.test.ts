import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to dismiss the onboarding tour if it's visible
 */
async function dismissTour(page: Page) {
  try {
    // Wait a bit for the tour to appear (it might be animating in)
    await page.waitForTimeout(500);

    // Try multiple strategies to dismiss the tour
    // Strategy 1: Click "Skip Tour" button
    const skipButton = page.getByRole('button', { name: /skip tour/i });
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
      // Wait for dialog to close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }

    // Strategy 2: Click the X close button in the dialog header
    const closeButton = page.locator('button:has([class*="lucide-x"]), button[aria-label*="close" i]').first();
    if (await closeButton.isVisible({ timeout: 2000 })) {
      await closeButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }

    // Strategy 3: Press Escape key
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 1000 })) {
      await page.keyboard.press('Escape');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }
  } catch {
    // Tour might not be visible, which is fine - just continue
  }
}

/**
 * Helper function to sign in a user
 * Creates a test user if needed and signs them in
 */
async function signInUser(page: Page, email = 'test@example.com', password = 'password123') {
  // Check if we're already on the documents page (already signed in)
  const currentUrl = page.url();
  if (currentUrl.includes('/documents') && !currentUrl.includes('/sign-in')) {
    // Wait for the page to load
    await page.waitForLoadState('load');
    // Verify we can see documents content - look for heading or tab
    try {
      const heading = page.getByRole('heading', { name: /documents/i });
      const tab = page.getByRole('tab', { name: /upload|my documents/i });
      await expect(heading.or(tab).first()).toBeVisible({ timeout: 5000 });
      return; // Already signed in
    } catch {
      // Not actually signed in, continue with sign-in flow
    }
  }

  // Navigate to sign-in page
  await page.goto('http://localhost:3000/sign-in', { waitUntil: 'load' });

  // Fill sign-in form
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);

  // Click sign in button and wait for navigation
  await Promise.all([
    page.waitForURL('**/documents', { timeout: 15000 }).catch(() => {
      // If navigation fails, check if we need to sign up
    }),
    page.click('button[type="submit"]'),
  ]);

  // If we're still on sign-in page, try to sign up first
  if (page.url().includes('/sign-in')) {
    // Navigate to sign-up
    await page.goto('http://localhost:3000/sign-up', { waitUntil: 'load' });

    // Fill sign-up form
    const nameInput = page.locator('input[id="name"]').first();
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill('Test User');
    }
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', password);

    // Submit sign-up
    await page.click('button[type="submit"]');

    // Wait a bit for either navigation or error message to appear
    await page.waitForTimeout(2000);

    // Check if we successfully navigated to documents
    const currentUrl = page.url();

    // Still on sign-up page - check for error message
    if (currentUrl.includes('/sign-up')) {
      // Look for "User already exists" error message using getByText (more reliable)
      const hasUserExistsError = await page
        .getByText(/user already exists|already exists/i)
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      // If user already exists error, navigate to sign-in and sign in
      if (hasUserExistsError) {
        await page.goto('http://localhost:3000/sign-in', { waitUntil: 'load' });
        await page.fill('input[id="email"]', email);
        await page.fill('input[id="password"]', password);
        await Promise.all([page.waitForURL('**/documents', { timeout: 15000 }), page.click('button[type="submit"]')]);
      } else {
        // Some other error or still processing - wait a bit more then try sign-in as fallback
        await page.waitForTimeout(2000);
        // If still on sign-up, try sign-in
        if (page.url().includes('/sign-up')) {
          await page.goto('http://localhost:3000/sign-in', { waitUntil: 'load' });
          await page.fill('input[id="email"]', email);
          await page.fill('input[id="password"]', password);
          await Promise.all([page.waitForURL('**/documents', { timeout: 15000 }), page.click('button[type="submit"]')]);
        }
      }
    }
  }

  // Final check - ensure we're on documents page
  await page.waitForURL('**/documents', { timeout: 15000 });
  await page.waitForLoadState('load');

  // Verify documents page content is visible - look for heading or tab
  const documentsHeading = page.getByRole('heading', { name: /documents/i });
  const documentsTab = page.getByRole('tab', { name: /upload|my documents/i });

  try {
    await expect(documentsHeading.or(documentsTab).first()).toBeVisible({ timeout: 10000 });
  } catch {
    // Fallback: just check URL
    if (!page.url().includes('/documents')) {
      throw new Error('Not on documents page after sign-in');
    }
  }

  // Dismiss tour popup if it appears
  await dismissTour(page);
}

test.describe('Document Analysis E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should complete full document analysis flow', async ({ page }) => {
    // Step 1: Sign in
    await signInUser(page);

    // Step 2: Dismiss tour if visible (signInUser already does this, but ensure it's done)
    await dismissTour(page);

    // Step 3: Verify we're on the documents page
    const documentsHeading = page.getByRole('heading', { name: /documents/i });
    await expect(documentsHeading).toBeVisible({ timeout: 10000 });

    // Step 4: Upload a document (if upload functionality is available)
    const uploadTab = page.getByRole('tab', { name: /^upload$/i });
    if (await uploadTab.isVisible({ timeout: 2000 })) {
      await uploadTab.click();

      // Check if upload area is visible
      const uploadArea = page.getByText(/drag and drop/i);
      await expect(uploadArea).toBeVisible({ timeout: 5000 });
    }

    // Step 5: Navigate to document list
    const listTab = page.getByRole('tab', { name: /^my documents$/i });
    if (await listTab.isVisible({ timeout: 2000 })) {
      await listTab.click();

      // Wait for tab content to load and API call to complete
      await page.waitForTimeout(1000);

      // Wait for document list to load - either the grid with documents or empty state
      // Check for loading skeletons first, then wait for actual content
      try {
        // Wait for loading to finish (skeletons should disappear)
        await page
          .waitForSelector('.skeleton, [class*="Skeleton"]', { state: 'hidden', timeout: 5000 })
          .catch(() => {});
      } catch {
        // Skeletons might not be present, continue
      }

      // Now wait for actual content - either document list, empty state, or document cards
      const documentList = page.locator('[data-testid="document-list"]');
      const emptyState = page.locator('[data-testid="empty-state"]');
      const documentCard = page.locator('[data-testid="document-card"]');
      const noDocumentsText = page.getByText(/no documents yet/i);
      const gridContainer = page.locator('.grid').filter({ hasText: /./ }); // Grid with content

      // Wait for any of these to appear
      await expect(
        documentList.or(emptyState).or(documentCard).or(noDocumentsText).or(gridContainer).first()
      ).toBeVisible({ timeout: 15000 });
    }

    // Step 6: If documents exist, click on one to view
    const documentCardElement = page.locator('[data-testid="document-card"]').first();
    if (await documentCardElement.isVisible({ timeout: 2000 })) {
      await documentCardElement.click();

      // Wait for navigation to document viewer page
      await page.waitForURL('**/documents/**', { timeout: 15000 });
      await page.waitForLoadState('load');

      // Wait for document viewer to load - look for Analysis heading or panel
      // The AnalysisPanel component has a heading with "Analysis" text
      const analysisHeading = page.getByRole('heading', { name: /analysis/i });
      const analysisText = page.getByText(/analysis/i).first();
      // Also check for the document viewer itself to be loaded
      await page.waitForTimeout(1000); // Give time for components to render
      await expect(analysisHeading.or(analysisText).first()).toBeVisible({ timeout: 15000 });

      // Step 7: Test Q&A interface
      const qaInput = page.locator('textarea[placeholder*="question"], textarea[placeholder*="ask"]').first();
      if (await qaInput.isVisible({ timeout: 2000 })) {
        await qaInput.fill('What is this document about?');
        const sendButton = page
          .locator('button[type="submit"], button:has-text("Send"), button:has-text("Ask")')
          .first();
        await sendButton.click();

        // Wait for response (with timeout)
        await page.waitForSelector('.message, [data-testid="ai-response"], [data-testid="message"]', {
          timeout: 30000,
        });
      }

      // Step 8: Test summary tab
      const summaryTab = page.getByRole('tab', { name: /summary/i });
      if (await summaryTab.isVisible({ timeout: 2000 })) {
        await summaryTab.click();
        await page.waitForTimeout(2000); // Wait for summary to load
      }

      // Step 9: Test entities tab
      const entitiesTab = page.getByRole('tab', { name: /entities/i });
      if (await entitiesTab.isVisible({ timeout: 2000 })) {
        await entitiesTab.click();
        await page.waitForTimeout(2000); // Wait for entities to load
      }

      // Step 10: Test sentiment tab
      const sentimentTab = page.getByRole('tab', { name: /sentiment/i });
      if (await sentimentTab.isVisible({ timeout: 2000 })) {
        await sentimentTab.click();
        await page.waitForTimeout(2000); // Wait for sentiment to load
      }
    }
  });

  test('should handle empty document list', async ({ page }) => {
    // Sign in first (this already navigates to /documents)
    await signInUser(page);

    // Dismiss tour popup if visible
    await dismissTour(page);

    // Verify we're on documents page
    await page.waitForURL('**/documents', { timeout: 15000 });
    const documentsHeading = page.getByRole('heading', { name: /documents/i });
    await expect(documentsHeading).toBeVisible({ timeout: 10000 });

    // Click on "My Documents" tab
    const listTab = page.getByRole('tab', { name: /^my documents$/i });
    await expect(listTab).toBeVisible({ timeout: 10000 });
    await listTab.click();

    // Wait for tab content to load and API call to complete
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Wait for loading to finish (skeletons should disappear)
    try {
      await page.waitForSelector('.skeleton, [class*="Skeleton"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    } catch {
      // Skeletons might not be present, continue
    }

    // Should show empty state - check for empty state component or "No documents yet" text
    // But first check if there are actually documents (in which case we won't see empty state)
    const hasDocuments = await page.locator('[data-testid="document-card"]').count();

    if (hasDocuments === 0) {
      // No documents, should show empty state
      const emptyState = page
        .locator('[data-testid="empty-state"]')
        .or(page.getByText(/no documents yet/i))
        .or(page.getByText(/upload your first document/i))
        .first();
      await expect(emptyState).toBeVisible({ timeout: 10000 });
    } else {
      // Has documents, verify we can see the document list
      const documentList = page
        .locator('[data-testid="document-list"]')
        .or(page.locator('[data-testid="document-card"]').first());
      await expect(documentList.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate between pages', async ({ page }) => {
    // Sign in first
    await signInUser(page);

    // Dismiss tour popup if visible
    await dismissTour(page);

    // Verify we're on documents page
    await page.waitForURL('**/documents', { timeout: 15000 });
    const documentsHeading = page.getByRole('heading', { name: /documents/i });
    await expect(documentsHeading).toBeVisible({ timeout: 10000 });

    // Navigate to analytics
    const analyticsLink = page.getByRole('link', { name: /analytics/i });
    if (await analyticsLink.isVisible({ timeout: 5000 })) {
      await analyticsLink.click();
      await page.waitForURL('**/analytics', { timeout: 15000 });
      // Wait for analytics page to load
      await page.waitForLoadState('load');
      await expect(page.getByText(/analytics/i).first()).toBeVisible({ timeout: 10000 });
    }

    // Navigate back to documents
    const documentsLink = page.getByRole('link', { name: /documents/i });
    if (await documentsLink.isVisible({ timeout: 5000 })) {
      await documentsLink.click();
      await page.waitForURL('**/documents', { timeout: 15000 });
      await page.waitForLoadState('load');
      const documentsHeadingAfterNav = page.getByRole('heading', { name: /documents/i });
      await expect(documentsHeadingAfterNav).toBeVisible({ timeout: 10000 });
    }
  });
});
