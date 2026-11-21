// Headless screenshots for visual checks. Usage: npm run build && node tools/shot.mjs [outDir]
// Needs Chrome: set CHROME=/path/to/chrome (defaults work on Linux and macOS).
import puppeteer from 'puppeteer-core';
import { preview } from 'vite';
import fs from 'node:fs';

const out = process.argv[2] ?? 'shots';
fs.mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME ?? ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => fs.existsSync(p));
const server = await preview({ preview: { port: 4179 } });
const browser = await puppeteer.launch({ executablePath: chrome, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1280, height: 720 });
const wait = ms => new Promise(r => setTimeout(r, ms));

await page.goto('http://localhost:4179/?bot&seed=7');
await wait(1500);
await page.screenshot({ path: `${out}/menu.png` });
await page.keyboard.press('Space');
for (const [name, ms] of [['run-1', 2500], ['run-2', 3000], ['run-3', 4000], ['run-4', 6000], ['run-5', 2300], ['run-6', 3100]]) {
  await wait(ms);
  await page.screenshot({ path: `${out}/${name}.png` });
}
// P-13: the touch button pads (?pads shows them without a touch screen)
await page.goto('http://localhost:4179/?bot&seed=7&pads');
await wait(1200);
await page.keyboard.press('Space');
await wait(2500);
await page.screenshot({ path: `${out}/pads.png` });
// no-input run: the skater slams until the run ends, to capture the results screen
await page.goto('http://localhost:4179/?seed=7');
await wait(1200);
await page.keyboard.press('Space');
for (let i = 0; i < 80; i++) {
  await wait(500);
  if (await page.evaluate(() => window.__sk8.scene.getScene('game').sim?.s.mode === 'over')) break;
}
await wait(900);
await page.screenshot({ path: `${out}/over.png` });
await browser.close();
await server.close();
if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`ok — screenshots in ${out}/`);
