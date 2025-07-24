import { test, expect } from '@playwright/test'

test('basic app loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/CellularLab/)
  await expect(page.locator('canvas')).toBeVisible()
})

test('grid renders correctly', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  await expect(canvas).toHaveAttribute('width')
  await expect(canvas).toHaveAttribute('height')
})

test('simulation controls work', async ({ page }) => {
  await page.goto('/')
  const playButton = page.getByRole('button', { name: /play|pause/i })
  const stepButton = page.getByRole('button', { name: /step/i })
  const resetButton = page.getByRole('button', { name: /reset/i })
  
  await expect(playButton).toBeVisible()
  await expect(stepButton).toBeVisible()
  await expect(resetButton).toBeVisible()
})