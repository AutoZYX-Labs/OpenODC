import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const evidenceDir = 'test-results/evidence'

async function expectNoPageOverflow(page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }))
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.innerWidth + 1)
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 1)
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true })
})

test('Chinese road-rule tool supports filtering and full traceability', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/road-rules.html')
  await expect(page.locator('article.obligation-card')).toHaveCount(20)
  await expect(page.getByRole('heading', { name: '道路规则映射' })).toBeVisible()
  await expect(page.getByText('本工具用于工程研究、需求追溯和测试设计', { exact: false })).toBeVisible()
  await expect(page.locator('.active-rule-filter')).toBeHidden()

  await page.getByLabel('规则类别').selectOption('vehicle_operation')
  await expect(page.locator('article.obligation-card')).toHaveCount(4)
  await page.getByLabel('关键词').fill('铁路')
  await expect(page.locator('article.obligation-card')).toHaveCount(0)
  await page.locator('#rule-reset').click()
  await expect(page.locator('article.obligation-card')).toHaveCount(20)

  const firstCard = page.locator('article.obligation-card').first()
  const firstTrace = firstCard.locator('details')
  await firstTrace.locator('summary').click()
  await expect(firstTrace).toHaveAttribute('open', '')
  await expect(firstCard.getByText('法律义务主体', { exact: true })).toBeVisible()
  await expect(firstTrace.getByText('查看公开原文', { exact: false }).first()).toBeVisible()
  await expectNoPageOverflow(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${evidenceDir}/desktop-road-rules.png` })
})

test('deep links scroll to dynamically rendered obligations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/road-rules.html#rr.operation.lane-change')
  const target = page.locator('#rr\\.operation\\.lane-change')
  await expect(target).toBeVisible()
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
  const box = await target.boundingBox()
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeLessThan(240)
})

test('JSON, CSV, and Markdown exports are downloadable', async ({ page }) => {
  await page.goto('/road-rules.html?category=vehicle_operation')
  await page.locator('.export-menu summary').click()
  for (const label of ['JSON', 'CSV', 'Markdown']) {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: label, exact: true }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^openodc-road-rules-zh\.(json|csv|md)$/)
    await page.locator('.export-menu summary').click()
  }
})

test('English route and related-rule integration are available', async ({ page }) => {
  await page.goto('/en/road-rules.html')
  await expect(page.getByRole('heading', { name: 'Road-Rule Mapping' })).toBeVisible()
  await expect(page.locator('article.obligation-card')).toHaveCount(20)
  await expect(page.getByText('Engineering candidate', { exact: true }).first()).toBeVisible()

  await page.goto('/view.html?id=huawei-ads4-aito-m9')
  await expect(page.locator('.related-road-rules')).toBeVisible()
  await expect(page.locator('.related-rule-link').first()).toBeVisible()
  await expect(page.getByText('不表示该产品满足或违反相关规则', { exact: false })).toBeVisible()
})

test('mobile layouts contain overflow and preserve internal table access', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/road-rules.html')
  await expect(page.locator('article.obligation-card')).toHaveCount(20)
  await expect(page.locator('.active-rule-filter')).toBeHidden()
  await expectNoPageOverflow(page)
  await page.screenshot({ path: `${evidenceDir}/mobile-road-rules.png` })

  await page.goto('/road-rules.html#rr.signal.police')
  await expect(page.locator('#rr\\.signal\\.police')).toBeVisible()
  await expectNoPageOverflow(page)
  await page.screenshot({ path: `${evidenceDir}/mobile-road-rule-card.png` })

  await page.goto('/view.html?id=huawei-ads4-aito-m9')
  await expect(page.locator('.odc-table').first()).toBeVisible()
  await expectNoPageOverflow(page)
  const tableMetrics = await page.locator('.odc-table').first().evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX
  }))
  expect(['auto', 'scroll']).toContain(tableMetrics.overflowX)
  expect(tableMetrics.scrollWidth).toBeGreaterThanOrEqual(tableMetrics.clientWidth)
  await page.screenshot({ path: `${evidenceDir}/mobile-existing-sample.png` })
})
