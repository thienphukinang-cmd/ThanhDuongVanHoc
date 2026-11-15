import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9219;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_debug_setup_' + Date.now());

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
          const app = window.__app;
          const advRoom = app.anDuongVuongRoom;
          const holder = advRoom.getObjectByName('ADV_Glb_Statue_Holder');
          
          // Let's see what is inside candidateGlbUrls and what loadGlbCached returned
          const THREE = await import('three');
          const helper = await import('./src/utils/modelLoaderHelper.js');
          const raw = await helper.loadGlbCached(['/models/amduongvuong.glb']);
          
          // Let's see what setupAnDuongVuongGlb does
          const bboxBefore = new THREE.Box3().setFromObject(raw);
          const sizeBefore = new THREE.Vector3();
          bboxBefore.getSize(sizeBefore);

          return {
            holderExists: Boolean(holder),
            holderParent: holder?.parent?.name,
            holderVisible: holder?.visible,
            rawChildren: raw.children.length,
            rawName: raw.name,
            sizeBefore: [sizeBefore.x, sizeBefore.y, sizeBefore.z],
            boxMinBefore: [bboxBefore.min.x, bboxBefore.min.y, bboxBefore.min.z],
            boxMaxBefore: [bboxBefore.max.x, bboxBefore.max.y, bboxBefore.max.z]
          };
        } catch (e) {
          return { error: e.message, stack: e.stack };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('EVAL TEST:', JSON.stringify(evalTest?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
