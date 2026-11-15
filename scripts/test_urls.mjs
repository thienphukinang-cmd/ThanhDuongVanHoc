import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9217;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_test_p_' + Date.now());

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
        const results = [];
        try {
          const app = window.__app;
          const advRoom = app.anDuongVuongRoom;
          const holder = advRoom.getObjectByName('ADV_Glb_Statue_Holder');
          
          results.push('Holder found: ' + Boolean(holder));
          results.push('Holder children now: ' + holder?.children?.length);
          
          try {
            const helper = await import('/src/utils/modelLoaderHelper.js');
            results.push('Helper imported');
            const loaded = await helper.loadGlbCached(['/models/amduongvuong.glb'], { maxTextureSize: 1024 });
            results.push('Loaded object: ' + (loaded ? loaded.type + ' ' + loaded.name : 'null'));
            results.push('Loaded children: ' + loaded?.children?.length);
            
            // Now test setupAnDuongVuongGlb
            const advModule = await import('/src/modules/anDuongVuongRoomDecorator.js');
            results.push('advModule keys: ' + Object.keys(advModule).join(', '));
            
            // Try adding loaded to holder!
            if (holder && loaded) {
              holder.add(loaded);
              holder.visible = true;
              results.push('Successfully added loaded to holder! New count: ' + holder.children.length);
            }
          } catch (loaderErr) {
            results.push('LOAD GLB CACHED ERROR: ' + loaderErr.message + ' ' + loaderErr.stack);
          }
          
          return results;
        } catch (e) {
          return { error: e.message, stack: e.stack };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('RESULTS:', JSON.stringify(evalTest?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
