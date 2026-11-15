import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9222;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_vn_err_' + Date.now());

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    'http://localhost:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((item) => item.type === 'page');
        if (page?.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break; }
      }
    } catch (_) {}
    await sleep(500);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise(r => { ws.onopen = r; });

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
  await sleep(4000);

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        try {
          const mod = await import('/src/utils/modelLoaderHelper.js');
          const res = await mod.loadGlbCached(['/model/vonhat.glb', '/models/vonhat.glb'], {
            returnGltf: true
          });
          return { success: true, keys: Object.keys(res), hasScene: !!res.scene };
        } catch (e) {
          return { success: false, err: e.message, stack: e.stack };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('LOAD TEST RESULT:', JSON.stringify(evalRes?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
