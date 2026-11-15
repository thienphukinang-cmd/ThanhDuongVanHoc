import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9229;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_screenshot_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  // Wait 4s for app to load Three.js scene
  await sleep(4000);

  // Teleport to Nam Quoc Son Ha Room using focusRoomPreset
  const teleportResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        if (app && app.cameraManager) {
          const res = app.cameraManager.focusRoomPreset('nam_quoc_son_ha', false);
          return {
            teleportSuccess: res,
            camPos: [app.camera.position.x, app.camera.position.y, app.camera.position.z]
          };
        }
        return 'NO CAM MGR';
      })()
    `,
    returnByValue: true
  });
  console.log('TELEPORT NQSH RESULT:', JSON.stringify(teleportResult?.result?.value, null, 2));

  await sleep(1500);

  // Capture screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) {
    const outPath = path.resolve('public', 'room_nam_quoc_son_ha_view.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log('SCREENSHOT SAVED TO:', outPath);
  }

  // Also query scene objects
  const sceneSummary = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const scene = window.__app?.scene || window.__scene;
        const visibleRooms = [];
        const externalRoots = [
          'TruyenKieu_Master_Root',
          'ThanhGiong_DongSon_Exhibition_Room101',
          'NamQuocSonHa_Sovereignty_Exhibition',
          'DayThonViDa_Room_Root',
          'TatDen_Room_Root',
          'Central_Glass_Skylight',
          'Corridor_Lim_Pillars_Instanced',
          'Corridor_Angled_Sunbeams_Instanced',
          'Corridor_Literary_Galaxy_Stream',
          'Fifteen_Literature_Dioramas_Generator'
        ];
        scene.traverse(o => {
          if (externalRoots.includes(o.name)) {
            visibleRooms.push({ name: o.name, visible: o.visible });
          }
        });
        return visibleRooms;
      })()
    `,
    returnByValue: true
  });

  console.log('TARGET MESHES VISIBILITY CHECK:', JSON.stringify(sceneSummary?.result?.value, null, 2));

  edgeProc.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
