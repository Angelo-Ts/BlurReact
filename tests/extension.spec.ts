import { test, expect, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { PNG } from 'pngjs';
let context: BrowserContext;
let worker: Worker;
let page: Page;
let profile: string;
const launch = async () => {
  const extension = path.resolve('dist');
  context = await chromium.launchPersistentContext(profile, {
    channel: process.env.BLURREACT_BROWSER || 'msedge', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    viewport: { width: 1280, height: 1000 },
  });
  worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
};
async function command(message: unknown) {
  // Use a real extension page so sendMessage exercises the actual background service worker.
  const id = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  const result = await popup.evaluate(async m => chrome.runtime.sendMessage(m), message);
  await popup.close();
  expect(result.ok, result.error).toBe(true);
  return result;
}
async function start(effect = 'blur', scope = 'page', intensity = 12) {
  const tabId = await worker.evaluate(async () => (await chrome.tabs.query({})).find(t => t.url?.startsWith('http://127.0.0.1:4173'))!.id);
  await command({ type: 'CONTROL', tabId, action: 'START', settings: { effect, scope, intensity, debug: false } });
  await expect(page.locator('[data-blurreact-ui="selection"]')).toHaveCount(1);
}
async function stop() {
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-blurreact-ui="selection"]')).toHaveCount(0);
}
async function rules() { return (await command({ type: 'GET' })).store.rules; }
test.beforeEach(async () => {
  profile = await fs.mkdtemp(path.join(os.tmpdir(), 'blurreact-test-'));
  await launch(); page = await context.newPage();
  page.on('pageerror', error => console.error('PAGE ERROR', error.message));
  await page.goto('http://127.0.0.1:4173/profile');
  await expect(page.locator('[data-testid="balance"]')).toBeVisible();
});
test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus && page && !page.isClosed()) {
    await info.attach('DOM', { body: await page.content(), contentType: 'text/html' });
    await info.attach('render', { body: await page.screenshot(), contentType: 'image/png' });
  }
  await context?.close();
  const resolved = path.resolve(profile);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('blurreact-test-')) throw new Error('Unexpected test profile path');
  await fs.rm(resolved, { recursive: true, force: true });
});

test('rendered pixel grid and opaque coverage actually change captured pixels, then restore original', async () => {
  const canvas = page.locator('#canvas');
  await canvas.evaluate(element => {
    const c = (element as HTMLCanvasElement).getContext('2d')!;
    for (let x = 0; x < 180; x++) { c.fillStyle = `rgb(${x},30,${255-x})`; c.fillRect(x, 0, 1, 80); }
  });
  const original = PNG.sync.read(await canvas.screenshot());
  await start('pixel', 'page', 12); await canvas.click(); await stop();
  const pixelated = PNG.sync.read(await canvas.screenshot({ path: 'artifacts/pixel.png' }));
  const colors = (png: PNG) => new Set(Array.from({ length: png.width }, (_, x) => {
    const i = (40 * png.width + x) * 4; return `${png.data[i]},${png.data[i+1]},${png.data[i+2]}`;
  }));
  expect(colors(original).size).toBeGreaterThan(150);
  expect(colors(pixelated).size).toBeLessThan(80);
  expect(colors(pixelated).size).toBeGreaterThan(5);
  const saved = await rules();
  await command({ type: 'UPDATE', ids: saved.map(r => r.id), effect: 'blackout', intensity: 12 });
  const covered = PNG.sync.read(await canvas.screenshot({ path: 'artifacts/blackout.png' }));
  for (const [x, y] of [[1, 1], [90, 40], [178, 78]]) {
    const i = (y * covered.width + x) * 4;
    expect([...covered.data.subarray(i, i + 3)]).toEqual([17, 24, 39]);
  }
  await command({ type: 'REMOVE', ids: saved.map(r => r.id) });
  const restored = PNG.sync.read(await canvas.screenshot());
  expect(restored.data.equals(original.data)).toBe(true);
});

test('popup operates on the active site: starts selection, adjusts rules and restores site', async () => {
  const tabId = await worker.evaluate(async () => (await chrome.tabs.query({})).find(t => t.url?.startsWith('http://127.0.0.1:4173'))!.id!);
  const openPopupPage = async () => {
    const popup = await context.newPage();
    await worker.evaluate(async id => { await chrome.tabs.update(id, { active: true }); }, tabId);
    await popup.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
    await expect(popup.locator('#site')).toHaveText('127.0.0.1');
    return popup;
  };
  let popup = await openPopupPage();
  await popup.locator('#effect').selectOption('blackout');
  await popup.locator('#start').click();
  await expect(page.locator('[data-blurreact-ui="selection"]')).toHaveCount(1);
  await page.locator('[data-testid="balance"]').click(); await stop();
  if (!popup.isClosed()) await popup.close();
  popup = await openPopupPage();
  await expect(popup.locator('.rule')).toHaveCount(1);
  await popup.locator('.rule select').selectOption('strong');
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(30px)');
  await popup.screenshot({ path: 'artifacts/popup.png' });
  await popup.locator('#restore-site').click();
  await expect(popup.locator('.rule')).toHaveCount(0);
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'none');
  await popup.close();
});

test('multiple selection persists through refresh, React remount, missing node and browser restart', async () => {
  await start();
  await page.locator('[data-testid="balance"]').click();
  await page.locator('[data-testid="email"]').click();
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
  await expect.poll(async () => (await rules()).length).toBe(2);
  await stop();
  await page.locator('#remount').click();
  await expect(page.locator('[data-testid="balance"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="balance"]')).toHaveText('Balance 101 EUR');
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
  await page.locator('#toggle').click(); await expect(page.locator('[data-testid="balance"]')).toHaveCount(0);
  expect((await rules()).length).toBe(2);
  await page.locator('#toggle').click(); await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
  await page.reload(); await expect(page.locator('[data-testid="email"]')).toHaveCSS('filter', 'blur(12px)');
  await context.close(); await launch(); page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/profile');
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
  await expect(page.locator('[data-testid="email"]')).toHaveCSS('filter', 'blur(12px)');
});

test('page and site scope follow SPA pushState, back and reload; removal is permanent', async () => {
  await start('strong', 'page', 10); await page.locator('[data-testid="balance"]').click(); await stop();
  await start('blur', 'site', 8); await page.locator('[data-testid="email"]').click(); await stop();
  await page.locator('#settings').click();
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'none');
  await expect(page.locator('[data-testid="email"]')).toHaveCSS('filter', 'blur(8px)');
  await page.goBack(); await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(25px)');
  const saved = await rules();
  await command({ type: 'UPDATE', ids: saved.map(r => r.id), effect: 'blur', intensity: 21 });
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(21px)');
  await page.reload(); await expect(page.locator('[data-testid="email"]')).toHaveCSS('filter', 'blur(21px)');
  await command({ type: 'REMOVE', ids: saved.map(r => r.id) });
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'none');
  await page.locator('#remount').click(); await page.reload();
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'none');
  expect((await rules()).length).toBe(0);
});

test('effects, native interaction, shadow roots and frames', async () => {
  await start('blackout'); await page.locator('#interactive').click(); await stop();
  await expect(page.locator('#interactive')).toHaveCSS('filter', /url\(/);
  await page.locator('#interactive').click(); await expect(page.locator('#interactive')).toHaveText('Counter 1');
  await start('hide'); await page.locator('[data-testid="email"]').click(); await stop();
  await expect(page.locator('[data-testid="email"]')).toHaveCSS('visibility', 'hidden');
  await start('pixel', 'page', 10); await page.locator('#canvas').click(); await stop();
  await expect(page.locator('#canvas')).toHaveCSS('filter', /url\(/);
  await start(); await page.locator('private-card #shadow-secret').click(); await stop();
  await page.locator('#shadow-remount').click();
  await expect(page.locator('private-card #shadow-secret')).toHaveCSS('filter', 'blur(12px)');
  await start(); await page.frameLocator('#cross-frame').locator('#frame-secret').click(); await stop();
  await expect(page.frameLocator('#cross-frame').locator('#frame-secret')).toHaveCSS('filter', 'blur(12px)');
  await page.reload();
  await expect(page.frameLocator('#cross-frame').locator('#frame-secret')).toHaveCSS('filter', 'blur(12px)');
  await expect(page.locator('private-card #shadow-secret')).toHaveCSS('filter', 'blur(12px)');
  await page.screenshot({ path: 'artifacts/effects.png' });
});

test('ancestor choice, toolbar batch updates and popup restore', async () => {
  await start();
  await page.locator('[data-testid="balance"] strong').hover(); await page.keyboard.press('ArrowUp');
  await page.locator('[data-testid="balance"] strong').click();
  await expect(page.locator('article')).toHaveCSS('filter', 'blur(12px)');
  await page.getByRole('combobox', { name: 'Effetto', exact: true }).selectOption('strong');
  await expect(page.locator('article')).toHaveCSS('filter', 'blur(30px)');
  await stop();
  const id = new URL(worker.url()).host;
  const popup = await context.newPage(); await popup.goto(`chrome-extension://${id}/popup.html`);
  // The extension page is the active tab in this test, so exercise background removal here;
  // actual popup active-tab UX has a separate test below.
  const saved = await rules(); await command({ type: 'REMOVE', ids: saved.map(r => r.id) });
  await expect(page.locator('article')).toHaveCSS('filter', 'none'); await popup.close();
});

test('does not guess between duplicate identities; repairs stripped markers without changing site inline style', async () => {
  await start(); await page.locator('[data-testid="balance"]').click(); await stop();
  await page.locator('[data-testid="balance"]').evaluate(e => { e.removeAttribute('data-blurreact'); (e as HTMLElement).style.color = 'red'; });
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
  await page.locator('[data-testid="balance"]').evaluate(e => { e.parentNode!.appendChild(e.cloneNode(true)); });
  await expect(page.locator('[data-testid="balance"]').first()).toHaveCSS('filter', 'none');
  expect((await rules()).length).toBe(1);
  await page.locator('[data-testid="balance"]').last().evaluate(e => e.remove());
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
  const saved = await rules(); await command({ type: 'REMOVE', ids: saved.map(r => r.id) });
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('color', 'rgb(255, 0, 0)');
});

test('site important styles and React inline updates cannot cancel masks; restore keeps newest site values', async () => {
  await page.locator('[data-testid="balance"]').evaluate(e => (e as HTMLElement).style.setProperty('filter', 'contrast(2)', 'important'));
  await start(); await page.locator('[data-testid="balance"]').click(); await stop();
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
  await page.locator('[data-testid="balance"]').evaluate(e => (e as HTMLElement).style.setProperty('filter', 'contrast(3)', 'important'));
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
  const saved = await rules(); await command({ type: 'REMOVE', ids: saved.map(r => r.id) });
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'contrast(3)');
  await start('hide'); await page.locator('[data-testid="balance"]').click(); await stop();
  await page.locator('[data-testid="balance"] strong').evaluate(e => (e as HTMLElement).style.setProperty('visibility', 'visible', 'important'));
  await expect(page.locator('[data-testid="balance"] strong')).toHaveCSS('visibility', 'hidden');
  await command({ type: 'REMOVE', ids: (await rules()).map(r => r.id) });
  await expect(page.locator('[data-testid="balance"] strong')).toHaveCSS('visibility', 'visible');
});

test('media, inline text, contents, fixed elements and scrolling retain visible opaque coverage', async () => {
  await page.evaluate(() => {
    const p = document.createElement('p'); p.innerHTML = '<span id="inline-secret">Inline secret value</span>';
    document.querySelector('main')!.prepend(p);
  });
  await start('blackout');
  for (const id of ['image', 'vector', 'video', 'fixed', 'inline-secret']) {
    await page.locator(`#${id}`).click();
    await expect(page.locator(`#${id}`)).toHaveAttribute('data-blurreact', /.+/);
  }
  await stop();
  for (const id of ['image', 'vector', 'video', 'fixed', 'inline-secret']) {
    const shot = PNG.sync.read(await page.locator(`#${id}`).screenshot());
    const i = (Math.floor(shot.height / 2) * shot.width + Math.floor(shot.width / 2)) * 4;
    expect.soft([...shot.data.subarray(i, i + 3)], id).toEqual([17, 24, 39]);
  }
  await page.evaluate(() => scrollTo(0, 700));
  await expect(page.locator('#fixed')).toHaveCSS('filter', /url\(/);
  await page.reload();
  await expect(page.locator('#image')).toHaveCSS('filter', /url\(/);
  await start('blur');
  await page.locator('#contents span').first().hover(); await page.keyboard.press('ArrowUp');
  await page.locator('#contents span').first().click(); await stop();
  await expect(page.locator('#contents span').first()).toHaveCSS('filter', 'blur(12px)');
});

test('concurrent writers preserve all rules and query/hash/replaceState scope is exact', async () => {
  await start(); await page.locator('[data-testid="balance"]').click(); await stop();
  const base = (await rules())[0];
  const id = new URL(worker.url()).host;
  const helper = await context.newPage(); await helper.goto(`chrome-extension://${id}/popup.html`);
  const result = await helper.evaluate(async rule => Promise.all(Array.from({length: 10}, (_, i) => chrome.runtime.sendMessage({type:'ADD',rule:{...rule,id:crypto.randomUUID(),path:'/other-' + i}}))), base);
  expect(result.every(r => r.ok)).toBe(true); await helper.close();
  expect((await rules()).length).toBe(11);
  await page.evaluate(() => history.replaceState({}, '', '/profile?account=other#detail'));
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'none');
  await page.evaluate(() => history.replaceState({}, '', '/profile'));
  await expect(page.locator('[data-testid="balance"]')).toHaveCSS('filter', 'blur(12px)');
});
