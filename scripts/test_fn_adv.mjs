import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9216;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_test_fn_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  await sleep(4000);

  const evalTest = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        try {
          const helper = await import('/src/utils/modelLoaderHelper.js');
          const raw = await helper.loadGlbCached(['/models/amduongvuong.glb']);
          
          const advModule = await import('/src/modules/anDuongVuongRoomDecorator.js');
          
          // Let's test calling loadGlbCached and what happened in the original promise
          const app = window.__app;
          const holder = app.anDuongVuongRoom.getObjectByName('ADV_Glb_Statue_Holder');
          
          return {
            holderPresent: Boolean(holder),
            holderChildren: holder.children.length,
            holderChildrenDetails: holder.children.map(c => ({ name: c.name, type: c.type, vis: c.visible })),
            rawChildren: raw.children.length
          };
        } catch (e) {
          return { error: e.message, stack: e.stack };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('RAW GLB INFO:', JSON.stringify(evalTest?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
