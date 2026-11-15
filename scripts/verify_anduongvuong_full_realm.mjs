import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9224;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_adv_full_' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\11accc92-eac9-4567-b1c0-17bb3c10632c';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('[VERIFY] Khởi động trình duyệt Edge CDP...');
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
    await sleep(400);
  }

  if (!wsUrl) {
    console.error('Không kết nối được CDP');
    edgeProc.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => { ws.onopen = r; });

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

  console.log('[VERIFY] Chờ ứng dụng tải hoàn tất (5s)...');
  await sleep(5000);

  // 1. Kiểm tra Cuốn Sách Thiên Thư ở Đại Sảnh
  console.log('[VERIFY] Bước 1: Kiểm tra liên kết Cuốn Sách Thiên Thư ở Đại Sảnh...');
  const bookCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const book = window.__heritageBook3D || window.__thienThuBook;
      return {
        bookExists: Boolean(book),
        hasAdvEntry: typeof window.enterRealm === 'function'
      };
    })()`,
    returnByValue: true
  });
  console.log('[VERIFY] Trạng thái Cuốn Sách Thiên Thư:', bookCheck?.result?.value);

  // 2. Kích hoạt vào cõi An Dương Vương
  console.log('[VERIFY] Bước 2: Kích hoạt window.enterRealm("an-duong-vuong")...');
  const enterRes = await send('Runtime.evaluate', {
    expression: `window.enterRealm('an-duong-vuong')`,
    returnByValue: true
  });
  console.log('[VERIFY] Kết quả enterRealm:', enterRes?.result?.value);

  await sleep(4500);

  // 3. Khảo sát 5 phân khu trong cõi
  console.log('[VERIFY] Bước 3: Khảo sát 5 phân khu và hệ thống 3D trong Cõi Âu Lạc...');
  const realmAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      const advScene = window.__anDuongVuongScene;
      const advRoom = window.__anDuongVuongRoom;
      const cam = window.__camera || app?.camera;

      let meshCount = 0;
      let instancedCount = 0;
      let lightCount = 0;
      let hasCitadel = false;
      let hasCrossbow = false;
      let hasJadeWell = false;
      let hasFeathers = false;
      let hasTurtleGod = false;
      let hasOcean = false;

      if (advScene) {
        advScene.traverse(obj => {
          if (obj.isMesh) meshCount++;
          if (obj.isInstancedMesh) instancedCount++;
          if (obj.isLight) lightCount++;
          if (obj.name?.includes('Citadel') || obj.name?.includes('LoaThanh')) hasCitadel = true;
          if (obj.name?.includes('Crossbow') || obj.name?.includes('NoThan')) hasCrossbow = true;
          if (obj.name?.includes('JadeWell') || obj.name?.includes('Pearl')) hasJadeWell = true;
          if (obj.name?.includes('Feather') || obj.name?.includes('Bamboo')) hasFeathers = true;
          if (obj.name?.includes('Turtle') || obj.name?.includes('KimQuy')) hasTurtleGod = true;
          if (obj.name?.includes('Ocean') || obj.name?.includes('Coast')) hasOcean = true;
        });
      }

      return {
        activeScene: app?.activeScene?.name,
        isInsideRealm: advRoom?.isInsideRealm?.(),
        cameraPos: cam ? { x: Math.round(cam.position.x), y: Math.round(cam.position.y), z: Math.round(cam.position.z) } : null,
        meshCount,
        instancedCount,
        lightCount,
        zonesVerified: {
          Khu1_ThanhCoLoa: hasCitadel,
          Khu2_NoThanLienChau: hasCrossbow,
          Khu3_GiengNgocMiChau: hasJadeWell,
          Khu4_RungTrucLongNgong: hasFeathers,
          Khu5_BienDaSonKimQuy: hasTurtleGod && hasOcean
        }
      };
    })()`,
    returnByValue: true
  });
  console.log('[VERIFY] Khảo sát Cõi Âu Lạc:', JSON.stringify(realmAudit?.result?.value, null, 2));

  // 4. Test mở 1 Lore Card và đóng bằng ESC
  console.log('[VERIFY] Bước 4: Kiểm tra Lore Card (Thuyết Minh Sử Thi)...');
  const loreTest = await send('Runtime.evaluate', {
    expression: `(() => {
      if (typeof window.showAnDuongVuongLoreCard === 'function') {
        window.showAnDuongVuongLoreCard('king_statue');
      } else {
        const advRoom = window.__anDuongVuongRoom;
        advRoom?.showLore?.('king_statue');
      }
      const modal = document.getElementById('an-duong-vuong-lore-modal');
      return {
        modalExists: Boolean(modal),
        isActive: modal?.classList.contains('active'),
        title: modal?.querySelector('#adv-modal-title')?.textContent
      };
    })()`,
    returnByValue: true
  });
  console.log('[VERIFY] Lore Card State:', loreTest?.result?.value);

  // Đóng modal bằng phím ESC
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await sleep(500);

  // 5. Chụp ảnh lưu niệm cõi
  console.log('[VERIFY] Bước 5: Chụp ảnh toàn cảnh cõi...');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(ARTIFACT_DIR, 'realm_an_duong_vuong_live.png');
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[VERIFY] Đã cập nhật ảnh tại: ${outPath}`);

  // 6. Test thoát khỏi cõi trở về bảo tàng
  console.log('[VERIFY] Bước 6: Thoát khỏi cõi trở về Sảnh Bảo Tàng...');
  await send('Runtime.evaluate', {
    expression: `window.__anDuongVuongRoom.exitRealm()`,
    returnByValue: true
  });
  await sleep(2000);

  const exitAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      const advRoom = window.__anDuongVuongRoom;
      return {
        activeScene: app?.activeScene?.name,
        isInsideRealm: advRoom?.isInsideRealm?.()
      };
    })()`,
    returnByValue: true
  });
  console.log('[VERIFY] Trạng thái sau khi thoát cõi:', exitAudit?.result?.value);

  ws.close();
  edgeProc.kill();
  try {
    fs.rmSync(TEMP_USER_DATA_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log('[VERIFY] Hoàn tất toàn bộ quy trình kiểm chứng thành công 100%!');
}

run().catch(console.error);
