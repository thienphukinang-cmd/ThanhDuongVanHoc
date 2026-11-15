import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9228;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_inspect_whitebox_' + Date.now());

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

  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__app?.scene || window.__scene;
        const map = {};
        scene.traverse(o => {
          if (!o.visible) return;
          if (o.isMesh || o.isPoints || o.isInstancedMesh) {
            const p = o.getWorldPosition(new o.position.constructor());
            if (p.z >= 0 && p.z <= 20 && Math.abs(p.x) <= 15 && p.y <= 6) {
              const key = (o.name || '(unnamed)') + ' -> ' + (o.parent?.name || '');
              if (!map[key]) {
                map[key] = { count: 0, type: o.type, instCount: o.count || 1, samplePos: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) } };
              }
              map[key].count++;
            }
          }
        });
        return map;
      })()
    `,
    returnByValue: true
  });

  console.log('SUMMARY MAP:', JSON.stringify(evalResult?.result?.value, null, 2));

  edgeProc.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
