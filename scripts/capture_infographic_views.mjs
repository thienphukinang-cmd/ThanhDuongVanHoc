import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9231;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_infographic_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting Edge headless on port', CDP_PORT);
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

  console.log('Waiting for museum application boot...');
  // Wait up to 15s for loader to disappear or app to be ready
  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: `Boolean(window.__app && window.__app.cameraManager)`,
      returnByValue: true
    });
    if (check?.result?.value) {
      console.log('Museum __app ready!');
      break;
    }
    await sleep(500);
  }

  // Inject CSS to hide all HUDs and clean screen
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const style = document.createElement('style');
        style.id = 'infographic-clean-style';
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
          #return-waypoint-prompt,
          .lore-popup {
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

  await sleep(3000); // let shaders and models stabilize

  const targets = [
    {
      id: 'shot_atrium_thienthu',
      name: 'Đại Sảnh & Cuốn Sách Thiên Thư',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          // Set camera position to front of Thien Thu Book looking towards it and grand staircase
          app.camera.position.set(0, 2.8, 16.5);
          app.camera.lookAt(0, 3.2, 0);
          if (app.cameraManager?.controls) {
            app.cameraManager.controls.target.set(0, 3.2, 0);
            app.cameraManager.controls.update();
          }
          return { pos: [app.camera.position.x, app.camera.position.y, app.camera.position.z] };
        })()
      `
    },
    {
      id: 'shot_atrium_overview',
      name: 'Toàn cảnh Đại Sảnh & Giếng Trời Hoàng Kim',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.camera.position.set(0, 14.0, 36.0);
          app.camera.lookAt(0, 6.0, 0);
          if (app.cameraManager?.controls) {
            app.cameraManager.controls.target.set(0, 6.0, 0);
            app.cameraManager.controls.update();
          }
          return { pos: [app.camera.position.x, app.camera.position.y, app.camera.position.z] };
        })()
      `
    },
    {
      id: 'shot_an_duong_vuong',
      name: 'Phòng An Dương Vương & Cổ Loa Thành',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.cameraManager.focusRoomPreset('an_duong_vuong', false);
          return 'ok';
        })()
      `
    },
    {
      id: 'shot_nam_quoc_son_ha',
      name: 'Phòng Nam Quốc Sơn Hà (Lý Thường Kiệt)',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.cameraManager.focusRoomPreset('nam_quoc_son_ha', false);
          return 'ok';
        })()
      `
    },
    {
      id: 'shot_thanh_giong',
      name: 'Phòng Thánh Gióng (Phù Đổng Thiên Vương)',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.cameraManager.focusRoomPreset('thanh_giong', false);
          return 'ok';
        })()
      `
    },
    {
      id: 'shot_truyen_kieu',
      name: 'Phòng Truyện Kiều (Nguyễn Du)',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.cameraManager.focusRoomPreset('truyen_kieu', false);
          return 'ok';
        })()
      `
    },
    {
      id: 'shot_day_thon_vi_da',
      name: 'Phòng Đây Thôn Vĩ Dạ (Hàn Mặc Tử)',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.cameraManager.focusRoomPreset('day_thon_vi_da', false);
          return 'ok';
        })()
      `
    },
    {
      id: 'shot_nam_xuong',
      name: 'Phòng Chuyện Người Con Gái Nam Xương',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.cameraManager.focusRoomPreset('nguoi_con_gai_nam_xuong', false);
          return 'ok';
        })()
      `
    },
    {
      id: 'shot_tat_den',
      name: 'Phòng Tắt Đèn (Ngô Tất Tố)',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.cameraManager.focusRoomPreset('tat_den', false);
          return 'ok';
        })()
      `
    },
    {
      id: 'shot_vo_nhat',
      name: 'Phòng Vợ Nhặt (Kim Lân)',
      action: `
        (() => {
          const app = window.__app;
          app.setActiveScene(app.mainScene);
          app.cameraManager.focusRoomPreset('vo_nhat', false);
          return 'ok';
        })()
      `
    }
  ];

  const publicDir = path.resolve('public', 'infographic_assets');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  for (const t of targets) {
    console.log(`Setting up view: ${t.name} (${t.id})...`);
    await send('Runtime.evaluate', { expression: t.action, returnByValue: true });
    // Allow camera animation or textures/render to settle
    await sleep(2500);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.data) {
      const filePath = path.join(publicDir, `${t.id}.png`);
      fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot: ${filePath}`);
    }
  }

  console.log('All screenshots captured successfully!');
  ws.close();
  try {
    edgeProc.kill();
  } catch (_) {}
}

run().catch((err) => {
  console.error('Error capturing views:', err);
  process.exit(1);
});
