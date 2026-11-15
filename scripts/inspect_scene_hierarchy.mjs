import { spawn } from 'child_process';
import http from 'http';
import path from 'path';

const CDP_PORT = 9223;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_inspect_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
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

  // Wait 4s for app to load
  await sleep(4000);

  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          const scene = window.__app?.scene || window.__mainScene || window.__scene;
          const list = [];
          scene.traverse(obj => {
            if (obj.isMesh || obj.isPoints || obj.isInstancedMesh) {
              const pos = obj.getWorldPosition(new obj.position.constructor());
              const name = obj.name || '(unnamed)';
              const pName = obj.parent?.name || '';
              const gpName = obj.parent?.parent?.name || '';
              
              let col = null;
              if (obj.material) {
                if (Array.isArray(obj.material)) {
                  col = obj.material.map(m => m.color ? m.color.getHexString() : 'tex').join(',');
                } else if (obj.material.color) {
                  col = obj.material.color.getHexString();
                }
              }

              // Filter meshes around center or with large counts
              if (obj.count > 10 || (pos.y >= -1 && pos.y <= 12 && Math.abs(pos.x) <= 25 && Math.abs(pos.z) <= 25)) {
                list.push({
                  name,
                  parent: pName,
                  grandparent: gpName,
                  type: obj.type,
                  count: obj.count,
                  color: col,
                  worldPos: { x: +pos.x.toFixed(1), y: +pos.y.toFixed(1), z: +pos.z.toFixed(1) }
                });
              }
            }
          });
          return list;
        } catch (err) {
          return { error: err.message, stack: err.stack };
        }
      })()
    `,
    returnByValue: true
  });

  console.log('Meshes count:', evalResult?.result?.value?.length);
  console.log('Meshes:', JSON.stringify(evalResult?.result?.value?.slice(0, 40), null, 2));

  edgeProc.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
