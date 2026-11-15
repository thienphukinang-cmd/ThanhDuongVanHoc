import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9214;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_statue_pos_' + Date.now());

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

  const evalPos = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        const holder = app?.anDuongVuongRoom?.getObjectByName('ADV_Glb_Statue_Holder');
        if (!holder) return 'NO HOLDER';
        
        const child = holder.children[0];
        if (!child) return 'HOLDER HAS NO CHILD';
        
        child.updateMatrixWorld(true);
        const box = new (child.position.constructor === undefined ? Object : child.position.constructor)();
        const worldPos = child.getWorldPosition(new child.position.constructor());
        const worldScale = child.getWorldScale(new child.scale.constructor());
        
        let meshInfo = [];
        child.traverse(m => {
          if (m.isMesh) {
            const mPos = m.getWorldPosition(new m.position.constructor());
            const mScale = m.getWorldScale(new m.scale.constructor());
            meshInfo.push({
              name: m.name,
              visible: m.visible,
              pos: [mPos.x, mPos.y, mPos.z],
              scale: [mScale.x, mScale.y, mScale.z],
              geo: m.geometry ? {
                vertices: m.geometry.attributes?.position?.count,
                bbox: m.geometry.boundingBox ? [
                  m.geometry.boundingBox.min.x, m.geometry.boundingBox.min.y, m.geometry.boundingBox.min.z,
                  m.geometry.boundingBox.max.x, m.geometry.boundingBox.max.y, m.geometry.boundingBox.max.z
                ] : 'NO BBOX'
              } : 'NO GEO'
            });
          }
        });
        
        return {
          holderVisible: holder.visible,
          childName: child.name,
          childVisible: child.visible,
          childPos: [child.position.x, child.position.y, child.position.z],
          childScale: [child.scale.x, child.scale.y, child.scale.z],
          worldPos: [worldPos.x, worldPos.y, worldPos.z],
          worldScale: [worldScale.x, worldScale.y, worldScale.z],
          meshes: meshInfo
        };
      })()
    `,
    returnByValue: true
  });

  console.log('STATUE POS:', JSON.stringify(evalPos?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
