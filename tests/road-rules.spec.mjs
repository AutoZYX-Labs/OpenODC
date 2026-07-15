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

test('homepage and primary navigation expose road rules as a core OpenODC capability', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await expect(page.getByRole('navigation').getByRole('link', { name: '道路规则', exact: true })).toHaveAttribute('href', '/road-rules.html')
  await expect(page.getByRole('heading', { name: '运行边界如何连接道路规则' })).toBeVisible()
  await expect(page.locator('.home-rule-flow > li')).toHaveCount(4)
  await expect(page.getByRole('link', { name: '进入道路规则映射', exact: false })).toHaveAttribute('href', '/road-rules.html')
  await expect(page.locator('.home-rule-metric')).toHaveCount(3)
  await expect(page.locator('.home-workflow-grid').getByText('道路规则映射', { exact: true })).toBeVisible()
  await expectNoPageOverflow(page)
})

test('English homepage exposes the same road-rule relationship', async ({ page }) => {
  await page.goto('/en/')
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Road Rules', exact: true })).toHaveAttribute('href', '/en/road-rules.html')
  await expect(page.getByRole('heading', { name: 'How Operating Boundaries Connect to Road Rules' })).toBeVisible()
  await expect(page.locator('.home-rule-flow > li')).toHaveCount(4)
  await expect(page.getByRole('link', { name: 'Open Road-Rule Mapping', exact: false })).toHaveAttribute('href', '/en/road-rules.html')
})

test('method and matrix pages connect ODC semantics to filtered road rules', async ({ page }) => {
  await page.goto('/methodology.html')
  await expect(page.getByRole('heading', { name: 'ODC 与道路规则的关系' })).toBeVisible()
  const methodRuleLink = page.getByRole('link', { name: '查看道路规则映射', exact: false })
  await expect(methodRuleLink).toHaveAttribute('href', '/road-rules.html')
  await methodRuleLink.click()
  await expect(page.getByRole('heading', { name: '道路规则映射' })).toBeVisible()
  await expect(page.locator('article.obligation-card')).toHaveCount(20)

  await page.goto('/matrix.html')
  const ruleLink = page.locator('.matrix-rule-link').first()
  await expect(ruleLink).toBeVisible()
  await expect(ruleLink).toHaveAttribute('href', /\/road-rules\.html\?element=/)
  await expect(ruleLink).toContainText('条规则')
  await ruleLink.click()
  await expect(page).toHaveURL(/\/road-rules(?:\.html)?\?element=/)
  await expect(page.locator('.active-rule-filter')).toBeVisible()
  await expect(page.locator('article.obligation-card').first()).toBeVisible()
})

test('matrix remains usable when the road-rule enhancement is unavailable', async ({ page }) => {
  await page.route('**/data/road-rules/obligations.json', route => route.abort())
  await page.goto('/matrix.html')
  await expect(page.locator('#matrix-body tr').nth(1)).toBeVisible()
  await expect(page.locator('#matrix-body .error')).toHaveCount(0)
  await expect(page.locator('.matrix-rule-link')).toHaveCount(0)
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
  for (const [label, extension] of [['JSON', 'json'], ['CSV', 'csv'], ['Markdown', 'md']]) {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: label, exact: true }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(`openodc-road-rules-zh.${extension}`)
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
  const relatedRuleLink = page.locator('.related-rule-link').first()
  await expect(relatedRuleLink).toBeVisible()
  await expect(page.getByText('不表示该产品满足或违反相关规则', { exact: false })).toBeVisible()
  await relatedRuleLink.click()
  await expect(page).toHaveURL(/\/road-rules(?:\.html)?\?element=.+#rr\./)
  await expect(page.locator('.active-rule-filter')).toBeVisible()
  const targetRuleId = await page.evaluate(() => decodeURIComponent(window.location.hash.slice(1)))
  await expect(page.locator(`article.obligation-card[data-rule-id="${targetRuleId}"]`)).toBeVisible()
})

test('language switching preserves the filtered road-rule context', async ({ page }) => {
  await page.goto('/road-rules.html?element=odd.targets.pedestrian#rr.signal.police')
  await expect(page.locator('.active-rule-filter')).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'EN', exact: true }).click()
  await expect(page).toHaveURL(/\/en\/road-rules(?:\.html)?\?element=odd\.targets\.pedestrian#rr\.signal\.police/)
  await expect(page.locator('.active-rule-filter')).toContainText('Pedestrian')
  await expect(page.locator('article.obligation-card[data-rule-id="rr.signal.police"]')).toBeVisible()
})

test('mobile layouts contain overflow and preserve internal table access', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '运行边界如何连接道路规则' })).toBeVisible()
  await expect(page.locator('.home-rule-flow > li')).toHaveCount(4)
  await expectNoPageOverflow(page)
  await page.screenshot({ path: `${evidenceDir}/mobile-home-road-rules.png`, fullPage: true })

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

  await page.goto('/matrix.html')
  await expect(page.locator('.matrix-rule-link').first()).toBeVisible()
  await expectNoPageOverflow(page)
  const matrixMetrics = await page.locator('.matrix-wrap').evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX
  }))
  expect(['auto', 'scroll']).toContain(matrixMetrics.overflowX)
  expect(matrixMetrics.scrollWidth).toBeGreaterThan(matrixMetrics.clientWidth)
})
