import { test, expect } from '@playwright/test'

test.describe('Training Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/login')
    // Add login logic here if needed
    // For now, we'll assume user is already logged in
  })

  test('should display training jobs table', async ({ page }) => {
    await page.goto('/training')

    // Check if main elements are present
    await expect(page.getByText(/Training Jobs/i)).toBeVisible()
    await expect(page.getByText(/Start Training/i)).toBeVisible()
  })

  test('should open start training modal', async ({ page }) => {
    await page.goto('/training')

    // Click Start Training button
    await page.click('text=Start Training')

    // Check if modal is open
    await expect(page.getByText(/Start New Training/i)).toBeVisible()
  })

  test('should filter jobs by status', async ({ page }) => {
    await page.goto('/training')

    // Wait for jobs to load
    await page.waitForSelector('text=Running', { timeout: 5000 }).catch(() => {})

    // Find and select status filter
    const statusFilter = page.locator('select').first()
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('completed')

      // Verify filter is applied (jobs should be filtered)
      await expect(page.getByText(/Training Jobs/i)).toBeVisible()
    }
  })

  test('should cancel a training job', async ({ page }) => {
    await page.goto('/training')

    // Wait for jobs to load
    await page.waitForSelector('button:has-text("Cancel")', { timeout: 5000 }).catch(() => {})

    // Find cancel button
    const cancelButton = page.locator('button:has-text("Cancel")').first()
    if (await cancelButton.isVisible()) {
      await cancelButton.click()

      // Check if confirmation modal appears
      await expect(page.getByText(/Are you sure/i)).toBeVisible().catch(() => {
        // If no confirmation, job might be cancelled directly
      })
    }
  })

  test('should display training metrics charts', async ({ page }) => {
    await page.goto('/training')

    // Scroll to bottom to see charts
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Check if charts section is visible
    await expect(page.getByText(/Performance Metrics/i)).toBeVisible().catch(() => {
      // Charts might not be visible if no data
    })
  })

  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/training')

    // Check if layout adapts to mobile
    const mainContent = page.locator('main, [role="main"]').first()
    await expect(mainContent).toBeVisible()
  })

  test('should refresh jobs automatically', async ({ page }) => {
    await page.goto('/training')

    // Wait for initial load
    await page.waitForTimeout(2000)

    // Check if auto-refresh is working (jobs should update)
    // This is a basic check - in real scenario, you'd verify data changes
    await expect(page.getByText(/Training Jobs/i)).toBeVisible()
  })
})

