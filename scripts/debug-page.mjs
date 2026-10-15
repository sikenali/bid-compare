import { chromium } from 'file:///C:/Users/jingle/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({
  executablePath: 'C:\\Users\\jingle\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright-core\\.local-browsers\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://localhost:5173/property-check', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const title = await page.title();
const h1 = await page.locator('h1').first().textContent().catch(() => null);
const sub = await page.locator('.page-subtitle, .ba-page-subtitle').first().textContent().catch(() => null);
const url = page.url();
console.log({ url, title, h1, sub });
await browser.close();
