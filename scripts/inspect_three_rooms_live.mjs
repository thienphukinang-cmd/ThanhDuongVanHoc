import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9225;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_rooms_exp_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('[EXPERIENCE] Launching Edge headless to experience the 3 rooms...');
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

  console.log('[EXPERIENCE] Waiting for 3D museum scene to initialize...');
  await sleep(6000);

  // Evaluate the 3 rooms
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const hbm = window.__museumHitboxManager;
        const tg = window.__thanhGiongRoom;
        const td = window.__tatDenRoom;
        const adv = window.__anDuongVuongRoom;
        
        function inspectRoom(room, name) {
          if (!room) return { name, exists: false };
          const group = room.getGroup ? room.getGroup() : (room.group || room);
          let meshCount = 0;
          let lightCount = 0;
          let materials = new Set();
          let hitboxes = [];
          
          if (group && group.traverse) {
            group.traverse(child => {
              if (child.isMesh) {
                meshCount++;
                if (child.material) {
                  const m = Array.isArray(child.material) ? child.material : [child.material];
                  m.forEach(mat => materials.add(mat.type));
                }
              }
              if (child.isLight) lightCount++;
              if (child.userData?.isClickProxy || child.userData?.hitboxId || child.name?.startsWith('hitbox_') || child.name?.includes('Proxy')) {
                hitboxes.push({
                  name: child.name,
                  id: child.userData?.hitboxId,
                  loreKey: child.userData?.loreKey,
                  title: child.userData?.title
                });
              }
            });
          }
          return {
            name,
            exists: true,
            visible: group ? group.visible : false,
            meshCount,
            lightCount,
            materials: Array.from(materials),
            hitboxCount: hitboxes.length,
            hitboxSamples: hitboxes.slice(0, 8),
            hasFogBlend: typeof room.updateFogBlend === 'function' || Boolean(group?.userData?.updateFogBlend),
            tourWaypoints: room.autoTourWaypoints ? room.autoTourWaypoints.length : (room.getAutoTourWaypoints ? room.getAutoTourWaypoints().length : 0)
          };
        }
        
        return {
          hbmTotalSolidBoxes: hbm ? hbm.solidBoxes.length : 0,
          hbmTotalClickProxies: hbm ? hbm.clickProxies.length : 0,
          thanhGiong: inspectRoom(tg, 'thanhGiong'),
          tatDen: inspectRoom(td, 'tatDen'),
          anDuongVuong: inspectRoom(adv, 'anDuongVuong')
        };
      })()
    `,
    returnByValue: true
  });

  console.log('[ROOM INSPECTION REPORT]:');
  console.log(JSON.stringify(evalResult.result.value, null, 2));

  // Take a full screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.resolve(process.env.TEMP || 'C:\\Temp', 'museum_three_rooms_live.png');
  fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`[EXPERIENCE] Screenshot saved to ${shotPath}`);

  ws.close();
  edgeProc.kill();
}

run().catch(err => {
  console.error('[EXPERIENCE ERROR]:', err);
  process.exit(1);
});
