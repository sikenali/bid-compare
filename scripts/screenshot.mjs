import { chromium } from 'file:///C:/Users/jingle/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
import path from 'node:path';
import fs from 'node:fs';

const OUT = 'D:\\UGit\\bid-assistant\\preview-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\jingle\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright-core\\.local-browsers\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--no-sandbox']
});

async function shoot(page, url, name) {
  await page.goto('http://localhost:5173' + url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  console.log('shot', name);
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await shoot(page, '/#/file-compare', 'file-compare');
await shoot(page, '/#/property-check', 'property-check');
await shoot(page, '/#/batch-compare', 'batch-compare');
await shoot(page, '/#/image-compare', 'image-compare');
await shoot(page, '/#/hardware-info', 'hardware-info');
await shoot(page, '/#/settings', 'settings');

// 移动端尺寸
const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
async function shootM(p, url, name) {
  await p.goto('http://localhost:5173' + url, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  console.log('shot', name);
}
await shootM(mobile, '/#/file-compare', 'file-compare-mobile');
await shootM(mobile, '/#/property-check', 'property-check-mobile');
await shootM(mobile, '/#/batch-compare', 'batch-compare-mobile');
await shootM(mobile, '/#/image-compare', 'image-compare-mobile');

await browser.close();
console.log('done');
