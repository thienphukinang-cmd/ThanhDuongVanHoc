import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9222;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_vn_dbg_' + Date.now());

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

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const args = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      if (args.includes('VoNhat') || args.includes('vo_nhat') || args.includes('vonhat') || data.params.type === 'error') {
        console.log(`[${data.params.type}] ${args}`);
      }
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');

  await sleep(4000);

  // Focus room
  await send('Runtime.evaluate', {
    expression: 'window.__app?.cameraManager?.focusRoomPreset("vo_nhat", false)'
  });

  await sleep(4000);

  // Inspect the scene graph inside vo_nhat room!
  const inspectResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        const res = [];
        app?.scene?.traverse((o) => {
          if (o.name && (o.name.includes('VoNhat') || o.name.includes('VN_') || o.name.includes('geometry_0') || o.name.includes('world') || o.name.includes('Interactive_VoNhat'))) {
            res.push({
              name: o.name,
              type: o.type,
              pos: [o.position.x, o.position.y, o.position.z],
              scale: [o.scale.x, o.scale.y, o.scale.z],
              visible: o.visible,
              isMesh: !!o.isMesh,
              mat: o.material ? (Array.isArray(o.material) ? o.material.map(m=>m.name) : o.material.name) : null
            });
          }
        });
        return res;
      })()
    `,
    returnByValue: true
  });

  console.log('SCENE INSPECT:', JSON.stringify(inspectResult?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
