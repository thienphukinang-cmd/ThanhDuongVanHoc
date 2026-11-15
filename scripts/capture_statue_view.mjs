import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9215;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_statue_view_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    '--window-size=1280,720',
    'http://localhost:5173/'
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

  // Wait 8s for model to load and mount
  await sleep(8000);

  // Teleport to An Duong Vuong room
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        if (app && app.cameraManager) {
          app.cameraManager.focusRoomPreset('an_duong_vuong', false);
        }
      })()
    `
  });

  await sleep(1500);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) {
    const outPath = path.resolve('public', 'room_an_duong_vuong_statue_view.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log('SAVED STATUE VIEW TO:', outPath);
  }

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
