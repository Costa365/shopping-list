const { test, expect } = require('@playwright/test');

const key = 'shopping-list:v1';
const add = async (page, name) => {
  await page.getByRole('textbox', { name: 'Item name' }).fill(name);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
};

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('adds with button and Enter, trims whitespace, allows duplicates and rejects blanks', async ({ page }) => {
  await expect(page.getByText('A fresh start')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear purchased' })).toBeDisabled();
  await add(page, '   ');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await add(page, '  Apples  ');
  await page.getByRole('textbox').fill('Apples');
  await page.getByRole('textbox').press('Enter');
  await expect(page.getByRole('checkbox', { name: 'Apples', exact: true })).toHaveCount(2);
  await expect(page.getByRole('status')).toHaveText('2 items left');
  await expect(page.getByText('A fresh start')).toBeHidden();
  await expect(page.getByRole('textbox')).toBeFocused();
});

test('toggles without reordering, persists, and clears only purchased items', async ({ page }) => {
  await add(page, 'Apples');
  await add(page, 'Bread');
  const apples = page.getByRole('checkbox', { name: 'Apples' });
  await apples.check();
  await expect(page.getByRole('status')).toHaveText('1 item left');
  await apples.uncheck();
  await expect(page.getByRole('status')).toHaveText('2 items left');
  await apples.check();
  await page.reload();
  await expect(apples).toBeChecked();
  await expect(page.locator('#items li').first()).toHaveText('Apples');
  await page.getByRole('button', { name: 'Clear purchased' }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await expect(page.getByRole('checkbox', { name: 'Bread' })).not.toBeChecked();
  await page.reload();
  await page.getByRole('checkbox', { name: 'Bread' }).check();
  await page.getByRole('button', { name: 'Clear purchased' }).click();
  await expect(page.getByText('A fresh start')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('0 items left');
});

test('supports keyboard-only entry, purchase, and clearing', async ({ page }) => {
  await page.keyboard.press('Tab');
  await page.keyboard.type('Milk');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Milk' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Clear purchased' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox')).toBeFocused();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('handles malformed storage and invalid item records', async ({ page }) => {
  for (const value of ['{bad json', '{}', '[null, {"id":4}, {"id":"x","name":"","purchased":false}]']) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value });
    await page.reload();
    await expect(page.getByText('A fresh start')).toBeVisible();
  }
  await add(page, 'Recovered');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Recovered' })).toBeVisible();
});

test('remains usable when storage access is denied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  await add(page, 'Milk');
  await page.getByRole('checkbox', { name: 'Milk' }).check();
  await page.getByRole('button', { name: 'Clear purchased' }).click();
  await expect(page.getByText('A fresh start')).toBeVisible();
});

test('reports failed saves while preserving in-memory changes', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('Quota exceeded'); };
  });
  await page.reload();
  await add(page, 'Milk');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Milk' })).toBeVisible();
});

test('renders untrusted names as text and wraps long names', async ({ page }) => {
  const name = '<img src=x onerror="window.injected=true">';
  await add(page, name);
  await add(page, 'VeryLongItem'.repeat(30));
  await expect(page.getByRole('checkbox', { name, exact: true })).toBeVisible();
  await expect(page.locator('#items img')).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('captures empty and populated layouts without browser errors', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await page.screenshot({ path: testInfo.outputPath('empty.png'), fullPage: true });
  for (const name of ['Avocados', 'Sourdough bread', 'Oat milk', 'Fresh blueberries']) await add(page, name);
  await page.getByRole('checkbox', { name: 'Oat milk' }).check();
  await page.screenshot({ path: testInfo.outputPath('populated.png'), fullPage: true });
  expect(errors).toEqual([]);
});
