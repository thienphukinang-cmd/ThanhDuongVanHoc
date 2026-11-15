import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9240;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_step1_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const assetsDir = path.resolve('public', 'infographic_assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('1. Starting Edge for Video Frame Extraction...');
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    '--window-size=1920,1080',
    'http://localhost:5173/extract_video_frames.html'
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

  console.log('Waiting for video metadata to load...');
  for (let i = 0; i < 30; i++) {
    const ready = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__ready)',
      returnByValue: true
    });
    if (ready?.result?.value) {
      console.log('Video ready!');
      break;
    }
    await sleep(500);
  }

  // 4 Video timestamps requested:
  // VD-1 (00:15)
  // VD-2 (00:58)
  // VD-3 (01:42 = 102s)
  // VD-4 (02:18 = 138s)
  const videoTargets = [
    { name: 'vd_1_dapthanh.png', time: 15, title: 'Ảnh VD-1 (00:15): Chiều tà hội Đạp Thanh' },
    { name: 'vd_2_nhipcau.png', time: 58, title: 'Ảnh VD-2 (00:58): Dòng suối nhỏ uốn quanh nhịp cầu' },
    { name: 'vd_3_gapgo.png', time: 102, title: 'Ảnh VD-3 (01:42): Gặp gỡ định mệnh Kim - Kiều' },
    { name: 'vd_4_khuephong.png', time: 138, title: 'Ảnh VD-4 (02:18): Đêm trăng khuya khuê phòng' }
  ];

  for (const vt of videoTargets) {
    console.log(`Extracting ${vt.title}...`);
    const evalRes = await send('Runtime.evaluate', {
      expression: `window.captureFrame(${vt.time})`,
      awaitPromise: true,
      returnByValue: true
    });
    const dataUrl = evalRes?.result?.value;
    if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const outPath = path.join(assetsDir, vt.name);
      fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
      console.log(`Saved video frame: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    } else {
      console.error(`Failed to capture video frame for ${vt.name}`);
    }
  }

  // Next, navigate to the 3D museum to capture BT-1, BT-2, BT-3, BT-4
  console.log('\n2. Navigating to 3D Museum for BT-1..4 Screenshots...');
  await send('Page.navigate', { url: 'http://localhost:5173/' });

  // Wait for 3D app boot
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

  // Inject CSS to clean extraneous UI overlays
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const style = document.createElement('style');
        style.id = 'clean-style-bt';
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

  await sleep(2500);

  // BT-1: Toàn cảnh Đại Sảnh Thiên Thư (Quy hoạch không gian)
  console.log('Capturing BT-1: Toàn cảnh Đại Sảnh Thiên Thư...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        app.setActiveScene(app.mainScene);
        app.camera.position.set(0, 11.5, 30.0);
        app.camera.lookAt(0, 4.5, 0);
        if (app.cameraManager?.controls) {
          app.cameraManager.controls.target.set(0, 4.5, 0);
          app.cameraManager.controls.update();
        }
      })()
    `
  });
  await sleep(2500);
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const outPath = path.join(assetsDir, 'bt_1_quyhoach.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved BT-1: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  }

  // BT-2: Cận cảnh tượng nhân vật 3D (amduongvuong.glb) & Sa bàn PBR
  console.log('Capturing BT-2: Cận cảnh tượng 3D & Sa bàn PBR...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        app.setActiveScene(app.mainScene);
        // Focus close-up on An Duong Vuong room diorama
        app.cameraManager.focusRoomPreset('an_duong_vuong', false);
        app.camera.position.set(0, 2.3, -17.5);
        app.camera.lookAt(0, 2.0, -23.5);
        if (app.cameraManager?.controls) {
          app.cameraManager.controls.target.set(0, 2.0, -23.5);
          app.cameraManager.controls.update();
        }
      })()
    `
  });
  await sleep(2500);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const outPath = path.join(assetsDir, 'bt_2_dungsan.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved BT-2: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  }

  // BT-3: Ánh sáng Chiaroscuro & Cổng Dịch Chuyển xoáy ngọc
  console.log('Capturing BT-3: Ánh sáng Chiaroscuro & Cổng Dịch Chuyển...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        app.setActiveScene(app.mainScene);
        // View of the shining portal in An Duong Vuong room with dramatic lighting
        app.camera.position.set(2.8, 1.8, -20.5);
        app.camera.lookAt(-0.5, 1.8, -25.5);
        if (app.cameraManager?.controls) {
          app.cameraManager.controls.target.set(-0.5, 1.8, -25.5);
          app.cameraManager.controls.update();
        }
      })()
    `
  });
  await sleep(2500);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const outPath = path.join(assetsDir, 'bt_3_chiaroscuro_portal.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved BT-3: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  }

  // BT-4: Không gian Cõi Mở trong truyện (Cổ Loa Realm 240m Dạ Sơn / Biển Đông) kèm Lore học thuật
  console.log('Capturing BT-4: Cõi Mở Thế Giới Tác Phẩm...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        if (app.anDuongVuongRoom?.enterRealm) {
          app.anDuongVuongRoom.enterRealm();
        }
      })()
    `
  });
  await sleep(4000); // allow realm terrain, water shaders and models to stabilize
  shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) {
    const outPath = path.join(assetsDir, 'bt_4_openworld_lore.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved BT-4: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  }

  console.log('\nAll 8 asset images captured and extracted successfully!');
  ws.close();
  try {
    edgeProc.kill();
  } catch (_) {}
}

run().catch((err) => {
  console.error('Error in step 1:', err);
  process.exit(1);
});
