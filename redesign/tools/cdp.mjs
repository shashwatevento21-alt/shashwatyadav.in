// Minimal Chrome DevTools Protocol driver with no dependencies (Node 22+ has a global WebSocket).
// Used by the redesign audit and verification scripts: full-page screenshots, computed styles, rendered DOM.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchChrome(port = 9333) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-profile-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--force-color-profile=srgb', 'about:blank',
  ], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(250); }
  }
  if (!wsUrl) { proc.kill(); throw new Error('Chrome did not start'); }
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
  async function newPage({ width = 1440, height = 900, mobile = false, scale = 1 } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    await s('Page.enable'); await s('Runtime.enable'); await s('Network.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
    if (mobile) await s('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' });
    const requests = [];
    const responses = [];
    const consoleErrors = [];
    listeners.push((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Network.requestWillBeSent') requests.push({ url: msg.params.request.url, method: msg.params.request.method });
      if (msg.method === 'Network.responseReceived') responses.push({ url: msg.params.response.url, status: msg.params.response.status, type: msg.params.type });
      if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push((msg.params.args || []).map((a) => a.value || a.description || '').join(' '));
    });
    return {
      requests, responses, consoleErrors,
      async goto(url, { settle = 1200 } = {}) {
        const loaded = new Promise((res) => { const l = (msg) => { if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') { res(); } }; listeners.push(l); setTimeout(res, 30000); });
        await s('Page.navigate', { url });
        await loaded;
        for (let i = 0; i < 60; i++) {
          try { if ((await this.eval('document.readyState')) === 'complete' && (await this.eval('!!document.documentElement && !!document.body'))) break; } catch { /* navigating */ }
          await sleep(250);
        }
        // Some hosts show a short "Checking your browser" interstitial that reloads into the real page by itself:
        // just wait for the real page (an <h1>) to be there before measuring anything.
        for (let i = 0; i < 100; i++) {
          try { if (await this.eval(`!/Checking your browser/i.test(document.body ? document.body.innerText : '') && !!document.querySelector('h1')`)) break; } catch { /* page is reloading */ }
          await sleep(250);
        }
        for (let i = 0; i < 40; i++) {
          try { if ((await this.eval('document.readyState')) === 'complete') break; } catch { /* reloading */ }
          await sleep(250);
        }
        try { await this.eval('document.fonts && document.fonts.ready.then(() => true)'); } catch { /* ignore */ }
        await sleep(settle);
      },
      async eval(expression) {
        // a page that reloads itself (redirects, interstitials) invalidates the call in flight: wait and retry
        for (let attempt = 0; ; attempt++) {
          try {
            const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
            return r.result.value;
          } catch (e) {
            if (attempt < 12 && /navigated or closed|Execution context was destroyed|Cannot find context/i.test(e.message)) { await sleep(700); continue; }
            throw e;
          }
        }
      },
      /** Scroll through the whole page so scroll-triggered reveals/counters/lazy images fire, then back to the top. */
      async scrollThrough() {
        await this.eval(`(async () => { const h = () => document.documentElement.scrollHeight; for (let y = 0; y < h(); y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); } window.scrollTo(0, h()); await new Promise(r => setTimeout(r, 600)); window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 500)); return h(); })()`);
      },
      async screenshot(file, { quality = 80 } = {}) {
        const m = await s('Page.getLayoutMetrics');
        const w = Math.ceil(m.cssContentSize.width), total = Math.ceil(m.cssContentSize.height);
        const PART = 15000; // Chrome cannot capture taller than ~16k px in one image: long pages are saved in numbered parts
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const files = [];
        for (let y = 0, n = 1; y < total; y += PART, n++) {
          const h = Math.min(PART, total - y);
          const shot = await s('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: true, clip: { x: 0, y, width: w, height: h, scale: 1 } });
          const f = n === 1 ? file : file.replace(/\.jpg$/, `-part${n}.jpg`);
          fs.writeFileSync(f, Buffer.from(shot.data, 'base64')); files.push(path.basename(f));
        }
        return { width: w, height: total, files };
      },
      /** Only what is visible in the window (used for an open mobile menu or a sticky header state). */
      async viewportShot(file, { quality = 80 } = {}) {
        const shot = await s('Page.captureScreenshot', { format: 'jpeg', quality });
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      },
      /** A rectangle of the page (page coordinates), e.g. just the header or one component. */
      async clipShot(file, { x = 0, y = 0, width, height }, { quality = 85 } = {}) {
        const shot = await s('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: true, clip: { x, y, width, height, scale: 1 } });
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      },
      /** The element with this selector, with optional extra space around it. */
      async elementShot(file, selector, { pad = 0, quality = 85 } = {}) {
        const r = await this.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; })()`);
        if (!r) return false;
        await this.clipShot(file, { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + pad * 2, height: r.h + pad * 2 }, { quality });
        return true;
      },
      async click(selector) {
        return this.eval(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(selector)})].find(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); if (!e) return false; e.click(); return true; })()`);
      },
      async hover(selector) {
        const pt = await this.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        if (!pt) return false;
        await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y });
        await sleep(450);
        return true;
      },
      async close() { await send('Target.closeTarget', { targetId }); },
    };
  }
  async function close() { try { ws.close(); } catch {} proc.kill(); await sleep(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }
  return { newPage, close };
}
