// Performance probe. Usage: npm run build && node tools/perf.mjs
// Emulates a retina laptop (so Z=4), reports load time, frame times during a bot run, and the hottest JS functions.
import puppeteer from 'puppeteer-core';
import { preview } from 'vite';
import fs from 'node:fs';

const chrome = process.env.CHROME ?? ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => fs.existsSync(p));
const server = await preview({ preview: { port: 4178 } });
const browser = await puppeteer.launch({ executablePath: chrome, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 810, deviceScaleFactor: 2 });
const cdp = await page.createCDPSession();
const wait = ms => new Promise(r => setTimeout(r, ms));
const top = (profile, n = 12) => {
  const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(x => [x.id, x]));
  profile.samples.forEach((id, i) => { const f = byId.get(id).callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); });
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  return [...self].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `  ${(v / 1000).toFixed(0).padStart(6)} ms ${((v / total) * 100).toFixed(0).padStart(3)}%  ${k}`).join('\n');
};

await cdp.send('Profiler.enable');
await cdp.send('Profiler.start');
const t0 = Date.now();
await page.goto('http://localhost:4178/?bot&fps&seed=7' + (process.argv[2] ?? ''));
await page.waitForFunction(() => window.__sk8?.scene?.isActive('menu'), { timeout: 120000 });
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
console.log(`LOAD to first menu frame: ${Date.now() - t0} ms   (zoom Z=${await page.evaluate(() => window.__sk8.config.width / 640)})`);
console.log(top((await cdp.send('Profiler.stop')).profile));

const boot = await page.evaluate(() => ({ ...window.__sk8perf }));
page.on('console', () => {});
console.log('  ' + await page.evaluate(() => document.getElementById('fps')?.textContent || ''));
console.log(`  text stamps at boot: ${boot.stamps} (${boot.stampMs.toFixed(0)} ms)`);
await page.keyboard.press('Space');
await wait(1500);
const p0 = await page.evaluate(() => ({ ...window.__sk8perf }));
await cdp.send('Profiler.start');
const frames = await page.evaluate(() => new Promise(res => {
  const ts = []; let last = performance.now();
  const tick = now => { ts.push(now - last); last = now; ts.length < 240 && now < 20000 + performance.timeOrigin ? requestAnimationFrame(tick) : res(ts); };
  requestAnimationFrame(tick); setTimeout(() => res(ts), 12000);
}));
const prof = (await cdp.send('Profiler.stop')).profile;
frames.sort((a, b) => a - b);
const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
console.log(`\nGAME: ${frames.length} frames, avg ${avg.toFixed(1)} ms (${(1000 / avg).toFixed(0)} fps), p95 ${frames[Math.floor(frames.length * 0.95)].toFixed(1)} ms, worst ${frames.at(-1).toFixed(1)} ms`);
const p1 = await page.evaluate(() => ({ ...window.__sk8perf }));
const cpu = (p1.cpuMs - p0.cpuMs) / (p1.frames - p0.frames), stamps = p1.stamps - p0.stamps;
console.log(`  CPU per frame (step+render JS): ${cpu.toFixed(2)} ms   text stamps during run: ${stamps} (${(p1.stampMs - p0.stampMs).toFixed(1)} ms)`);
console.log(top(prof));
// Budgets. Frame *pacing* above is from software GL here and only meaningful on real hardware; these two are hardware-independent.
if (cpu > 3 || stamps > 12) { console.error('PERF BUDGET EXCEEDED: cpu/frame must be < 3 ms and text stamps during a run must stay rare'); process.exitCode = 1; }
await browser.close(); await server.close();
