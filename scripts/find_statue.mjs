import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9212;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_find_model_' + Date.now());

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
  await sleep(6000);

  const evalFind = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__app?.scene || window.__scene;
        const matches = [];
        scene.traverse(o => {
          if (o.name === 'node_0' || o.name === 'convert' || (o.userData?.onFocusCamera && o.userData?.loreKey === 'an_duong_vuong_statue') || o.name === 'ClickHitbox_an_duong_vuong_statue') {
            const pos = o.getWorldPosition(new o.position.constructor());
            const scale = o.getWorldScale(new o.scale.constructor());
            matches.push({
              name: o.name,
              type: o.type,
              visible: o.visible,
              parent: o.parent?.name || '(no parent name)',
              grandparent: o.parent?.parent?.name || '',
              pos: [pos.x, pos.y, pos.z],
              scale: [scale.x, scale.y, scale.z],
              mat: o.material ? (Array.isArray(o.material) ? o.material.map(m => m.type) : o.material.type) : 'no mat'
            });
          }
        });
        return matches;
      })()
    `,
    returnByValue: true
  });

  console.log('FIND STATUE MATCHES:', JSON.stringify(evalFind?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
