import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9250;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_perfect_bt_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const assetsDir = path.resolve('public', 'infographic_assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('Starting Edge for Perfect 3D Museum Screenshots on port', CDP_PORT);
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    '--window-size=1920,1080',
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

  console.log('Waiting for museum app boot...');
  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__app && window.__app.cameraManager)',
      returnByValue: true
    });
    if (check?.result?.value) {
      console.log('Museum __app ready!');
      break;
    }
    await sleep(500);
  }

  // Inject CSS to hide unwanted debug bars, but allow lore overlay
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const style = document.createElement('style');
        style.id = 'clean-bt-shots';
        style.innerHTML = \`
          #museum-boot-loader,
          #director-hud,
          #directory-hud-modal,
          #directory-hud-toggle-btn,
          #museum-autotour-hud,
          #td-realm-top-hud,
          #nqsh-realm-top-hud,
          #tg-realm-top-hud,
          #tk-realm-top-hud,
          #adv-realm-top-hud,
          #vn-realm-top-hud,
          #sttt-realm-top-hud,
          #kieuworld-realm-hud,
          #kieuworld-top-exit,
          #camera-mode-hint,
          #return-waypoint-prompt {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
        \`;
        document.head.appendChild(style);
        const loader = document.getElementById('museum-boot-loader');
        if (loader) loader.classList.add('hidden');
      })()
    `
  });

  await sleep(3000);

  // ─────────────────────────────────────────────────────────────────────────────
  // ẢNH BT-1: Quy hoạch không gian (Toàn cảnh Đại Sảnh Thiên Thư)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Capturing BT-1: Toàn cảnh Đại Sảnh & Cuốn Sách Thiên Thư 3D...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        app.setActiveScene(app.mainScene);
        app.camera.position.set(0, 5.8, 22.0);
        app.camera.lookAt(0, 3.2, 0);
        if (app.cameraManager?.controls) {
          app.cameraManager.controls.target.set(0, 3.2, 0);
          app.cameraManager.controls.update();
        }
      })()
    `
  });
  await sleep(2500);
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const p1 = path.join(assetsDir, 'bt_1_quyhoach.png');
    fs.writeFileSync(p1, Buffer.from(shot.data, 'base64'));
    console.log(`Saved BT-1: ${p1} (${fs.statSync(p1).size} bytes)`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ẢNH BT-2: Dựng mô hình 3D & Chất liệu PBR (Tượng An Dương Vương & Sa bàn Cổ Loa)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Capturing BT-2: Cận cảnh Tượng 3D Uy Nghiêm & Sa bàn PBR...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        app.setActiveScene(app.mainScene);
        app.cameraManager.focusRoomPreset('an_duong_vuong', false);
        // Position camera to frame the 3.4m statue and the 3-ring spiral citadel dais
        const advRoom = app.anDuongVuongRoom;
        const dais = advRoom?.getObjectByName?.('ADV_Central_Dais_LoaThanh');
        if (dais) {
          const wp = new THREE.Vector3();
          dais.getWorldPosition(wp);
          app.camera.position.set(wp.x + 0.2, wp.y + 2.8, wp.z + 5.2);
          app.camera.lookAt(wp.x, wp.y + 2.2, wp.z);
          if (app.cameraManager?.controls) {
            app.cameraManager.controls.target.set(wp.x, wp.y + 2.2, wp.z);
            app.cameraManager.controls.update();
          }
        }
      })()
    `
  });
  await sleep(3500); // let glb textures load
  shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const p2 = path.join(assetsDir, 'bt_2_dungsan.png');
    fs.writeFileSync(p2, Buffer.from(shot.data, 'base64'));
    console.log(`Saved BT-2: ${p2} (${fs.statSync(p2).size} bytes)`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ẢNH BT-3: Ánh sáng Chiaroscuro & Cổng Dịch Chuyển xoáy ngọc
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Capturing BT-3: Ánh sáng Chiaroscuro & Cổng Dịch Chuyển Portal...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        app.setActiveScene(app.mainScene);
        const advRoom = app.anDuongVuongRoom;
        const portal = advRoom?.getObjectByName?.('ADV_Swirling_Vortex_Portal_Station');
        if (portal) {
          const wp = new THREE.Vector3();
          portal.getWorldPosition(wp);
          // Look towards the swirling portal with chiaroscuro beam
          app.camera.position.set(wp.x + 3.2, wp.y + 2.0, wp.z + 4.5);
          app.camera.lookAt(wp.x, wp.y + 2.2, wp.z);
          if (app.cameraManager?.controls) {
            app.cameraManager.controls.target.set(wp.x, wp.y + 2.2, wp.z);
            app.cameraManager.controls.update();
          }
        } else {
          // fallback to nam xuong chiaroscuro shadow
          app.cameraManager.focusRoomPreset('nguoi_con_gai_nam_xuong', false);
        }
      })()
    `
  });
  await sleep(3000);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const p3 = path.join(assetsDir, 'bt_3_chiaroscuro_portal.png');
    fs.writeFileSync(p3, Buffer.from(shot.data, 'base64'));
    console.log(`Saved BT-3: ${p3} (${fs.statSync(p3).size} bytes)`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ẢNH BT-4: Không gian Cõi Mở (Thế giới truyện 240m) kèm Lore học thuật
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Capturing BT-4: Cõi Mở Cổ Loa & Giao diện Lore học thuật...');
  await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const app = window.__app;
        if (app.anDuongVuongRoom?.enterRealm) {
          app.anDuongVuongRoom.enterRealm();
        }
        await new Promise(r => setTimeout(r, 4000));
        // Trigger Lore overlay dialog if available
        if (app.anDuongVuongRoom?.loreOverlay?.show) {
          app.anDuongVuongRoom.loreOverlay.show(0);
        } else if (typeof window.showAnDuongVuongFourPartLore === 'function') {
          window.showAnDuongVuongFourPartLore(0);
        }
      })()
    `,
    awaitPromise: true
  });
  await sleep(3500);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const p4 = path.join(assetsDir, 'bt_4_openworld_lore.png');
    fs.writeFileSync(p4, Buffer.from(shot.data, 'base64'));
    console.log(`Saved BT-4: ${p4} (${fs.statSync(p4).size} bytes)`);
  }

  console.log('\nAll 4 Museum Images captured successfully with high quality!');
  ws.close();
  try {
    edgeProc.kill();
  } catch (_) {}
}

run().catch((err) => {
  console.error('Error capturing museum images:', err);
  process.exit(1);
});
