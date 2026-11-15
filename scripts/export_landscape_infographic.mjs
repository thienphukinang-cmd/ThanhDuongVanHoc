import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9235;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_landscape_' + Date.now());

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
    '--window-size=1920,1080',
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

  console.log('Waiting for landscape infographic fonts and images...');
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

  // Set exact 1920x1080 layout without transforms or toolbars
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const toolbar = document.querySelector('.floating-toolbar');
        if (toolbar) toolbar.style.display = 'none';
        
        document.documentElement.style.width = '1920px';
        document.documentElement.style.height = '1080px';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';

        document.body.style.width = '1920px';
        document.body.style.height = '1080px';
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        const wrapper = document.querySelector('.canvas-scaler-wrapper');
        if (wrapper) {
          wrapper.style.width = '1920px';
          wrapper.style.height = '1080px';
          wrapper.style.margin = '0';
          wrapper.style.padding = '0';
        }

        const root = document.getElementById('infographic-landscape-root');
        if (root) {
          root.style.transform = 'none';
          root.style.margin = '0';
          root.style.width = '1920px';
          root.style.height = '1080px';
        }
      })()
    `
  });

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  await sleep(800);

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      scale: 1
    }
  });

  if (shot && shot.data) {
    const outPath = path.resolve('infographic-bao-tang-3d-ngang.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log('EXACT 1920x1080 LANDSCAPE INFOGRAPHIC SAVED TO:', outPath);

    // Also write to public/ for web access
    const pubPath = path.resolve('public', 'infographic-bao-tang-3d-ngang.png');
    fs.writeFileSync(pubPath, Buffer.from(shot.data, 'base64'));
    console.log('PUBLIC COPY SAVED TO:', pubPath);
  }

  ws.close();
  try {
    edgeProc.kill();
  } catch (_) {}
}

run().catch((err) => {
  console.error('Error exporting landscape infographic:', err);
  process.exit(1);
});
