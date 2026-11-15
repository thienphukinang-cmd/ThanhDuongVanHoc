import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9225; // Use port 9225 to avoid any collision
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_vn_mat_' + Date.now());

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
  await sleep(7000); // Wait for GLB to load and replace fallback

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const room = window.__voNhatRoom;
        let mesh = null;
        room?.traverse((o) => {
          if (o.name === 'geometry_0' && o.isMesh) mesh = o;
        });
        if (!mesh) return 'NOT LOADED YET';
        const mat = mesh.material;
        return {
          meshName: mesh.name,
          parent: mesh.parent?.name,
          matName: mat.name,
          matType: mat.type,
          color: '#' + mat.color?.getHexString(),
          metalness: mat.metalness,
          roughness: mat.roughness,
          hasMap: !!mat.map,
          mapSource: mat.map?.source?.data ? 'IMAGE PRESENT' : (mat.map?.image ? 'IMAGE OBJ' : 'NO IMAGE'),
          side: mat.side,
          vertexNormals: mesh.geometry.attributes.normal ? mesh.geometry.attributes.normal.count : 0
        };
      })()
    `,
    returnByValue: true
  });

  console.log('GEOMETRY_0 MAT INFO:', JSON.stringify(res?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
