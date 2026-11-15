import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9232;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_poster_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting Edge headless on port', CDP_PORT);
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    '--window-size=1280,1800',
    'http://localhost:5173/infographic.html'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((item) => item.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (_) {}
    await sleep(500);
  }

  if (!wsUrl) {
    console.error('Failed to get WebSocket URL');
    edgeProc.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => { ws.onopen = resolve; });

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  console.log('Waiting for infographic page fonts and images...');
  await send('Runtime.evaluate', {
    expression: `
      (async () => {
        await document.fonts.ready;
        const imgs = Array.from(document.querySelectorAll('img'));
        await Promise.all(imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => { img.onload = res; img.onerror = res; });
        }));
        return true;
      })()
    `,
    awaitPromise: true
  });

  await sleep(1500);

  // Hide action bar for clean poster export
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const bar = document.querySelector('.top-action-bar');
        if (bar) bar.style.display = 'none';
        document.body.style.padding = '0';
        document.body.style.backgroundColor = '#0a090e';
      })()
    `
  });

  await sleep(500);

  // Get element rect
  const rectRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const root = document.getElementById('infographic-root');
        const r = root.getBoundingClientRect();
        return {
          x: Math.round(r.left),
          y: Math.round(r.top + window.scrollY),
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
      })()
    `,
    returnByValue: true
  });

  const rect = rectRes?.result?.value;
  console.log('Infographic root rect:', rect);

  if (rect && rect.width && rect.height) {
    // Override device metrics to capture full height
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1240,
      height: rect.height + 20,
      deviceScaleFactor: 1,
      mobile: false
    });

    await sleep(800);

    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        scale: 1
      }
    });

    if (shot && shot.data) {
      const outPath = path.resolve('infographic-bao-tang-3d.png');
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log('INFOGRAPHIC POSTER SAVED TO:', outPath);

      // Also save a copy in public for web access
      const pubCopy = path.resolve('public', 'infographic-bao-tang-3d.png');
      fs.writeFileSync(pubCopy, Buffer.from(shot.data, 'base64'));
      console.log('PUBLIC COPY SAVED TO:', pubCopy);
    }
  }

  ws.close();
  try {
    edgeProc.kill();
  } catch (_) {}
}

run().catch((err) => {
  console.error('Error exporting poster:', err);
  process.exit(1);
});
