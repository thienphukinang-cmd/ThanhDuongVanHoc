import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9245;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_quy_trinh_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting Edge headless for 2560x1440 Master Infographic Export on port', CDP_PORT);
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    '--window-size=2560,1440',
    'http://localhost:5173/infographic-quy-trinh.html'
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

  console.log('Waiting for fonts and 8 real images to load...');
  await send('Runtime.evaluate', {
    expression: `
      (async () => {
        await document.fonts.ready;
        const imgs = Array.from(document.querySelectorAll('img'));
        await Promise.all(imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => { img.onload = res; img.onerror = res; });
        }));
        return { count: imgs.length, allLoaded: true };
      })()
    `,
    awaitPromise: true
  });

  await sleep(2000);

  // Set exact 2560x1440 layout without transforms or toolbars
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const toolbar = document.querySelector('.floating-toolbar');
        if (toolbar) toolbar.style.display = 'none';

        document.documentElement.style.width = '2560px';
        document.documentElement.style.height = '1440px';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';

        document.body.style.width = '2560px';
        document.body.style.height = '1440px';
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        const wrapper = document.querySelector('.canvas-scaler-wrapper');
        if (wrapper) {
          wrapper.style.width = '2560px';
          wrapper.style.height = '1440px';
          wrapper.style.margin = '0';
          wrapper.style.padding = '0';
          wrapper.style.transform = 'none';
        }

        const root = document.getElementById('infographic-quy-trinh-root');
        if (root) {
          root.style.transform = 'none';
          root.style.margin = '0';
          root.style.width = '2560px';
          root.style.height = '1440px';
        }
      })()
    `
  });

  await send('Emulation.setDeviceMetricsOverride', {
    width: 2560,
    height: 1440,
    deviceScaleFactor: 1,
    mobile: false
  });

  await sleep(1000);

  console.log('Capturing exact 2560x1440 screenshot...');
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: 0,
      y: 0,
      width: 2560,
      height: 1440,
      scale: 1
    }
  });

  if (shot && shot.data) {
    const outPath = path.resolve('infographic-quy-trinh-tong-hop.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log('MASTER INFOGRAPHIC SAVED TO:', outPath);

    const pubPath = path.resolve('public', 'infographic-quy-trinh-tong-hop.png');
    fs.writeFileSync(pubPath, Buffer.from(shot.data, 'base64'));
    console.log('PUBLIC COPY SAVED TO:', pubPath);
  }

  ws.close();
  try {
    edgeProc.kill();
  } catch (_) {}
}

run().catch((err) => {
  console.error('Error exporting master infographic:', err);
  process.exit(1);
});
