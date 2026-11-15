import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9224;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_load_adv_' + Date.now());

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
  await send('Page.enable');

  await sleep(4000);

  // Directly call fetch on /model/amduongvuong.glb and test GLTFLoader
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        try {
          const fetchRes = await fetch('/model/amduongvuong.glb', { method: 'HEAD' });
          const status = fetchRes.status;
          const contentLength = fetchRes.headers.get('content-length');

          // Check GLTFLoader with DRACOLoader
          const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
          const { DRACOLoader } = await import('/node_modules/three/examples/jsm/loaders/DRACOLoader.js');
          const draco = new DRACOLoader();
          draco.setDecoderPath('/draco/');
          const loader = new GLTFLoader();
          loader.setDRACOLoader(draco);

          const loadPromise = new Promise((resolve, reject) => {
            loader.load('/model/amduongvuong.glb', (gltf) => {
              resolve({
                success: true,
                hasScene: !!gltf.scene,
                children: gltf.scene.children.map(c => c.name)
              });
            }, undefined, (err) => {
              reject(err.message || String(err));
            });
          });

          const gltfResult = await loadPromise;
          return { status, contentLength, gltfResult };
        } catch (err) {
          return { error: err.message || String(err), stack: err.stack };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('DIRECT GLTF LOAD RESULT:', JSON.stringify(evalResult?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
