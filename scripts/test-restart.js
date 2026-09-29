const { chromium, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8080');
    await page.getByRole('textbox').fill('Survives restart');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Survives restart' }).check();
    execFileSync('docker', ['compose', 'restart', 'web'], { stdio: 'inherit', timeout: 60000 });
    await expect(async () => {
      const response = await page.request.get('http://localhost:8080');
      expect(response.ok()).toBe(true);
    }).toPass({ timeout: 30000 });
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Survives restart' })).toBeChecked();
    await expect(page.getByRole('status')).toHaveText('0 items left');
    console.log('PASS: item and purchased status survive a Docker container restart.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
