import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9225;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_diag_' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\11accc92-eac9-4567-b1c0-17bb3c10632c';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('[DIAG] Spawning Edge on CDP port', CDP_PORT);
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
    console.error('Cannot connect to CDP');
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

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
      if (data.params.type === 'error' || data.params.type === 'warning') {
        console.log(`[BROWSER ${data.params.type.toUpperCase()}]`, text);
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails?.text, data.params.exceptionDetails?.exception?.description);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');

  console.log('[DIAG] Waiting 5s for museum to initialize...');
  await sleep(5000);

  // Take screenshot 1: initial museum lobby
  console.log('[DIAG] Taking screenshot 1 (Lobby)...');
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'diag_lobby.png'), Buffer.from(shot1.data, 'base64'));

  // Now call window.enterRealm('an_duong_vuong')
  console.log('[DIAG] Calling window.enterRealm("an_duong_vuong")...');
  const enterRes = await send('Runtime.evaluate', {
    expression: `window.enterRealm('an_duong_vuong')`,
    returnByValue: true
  });
  console.log('[DIAG] enterRealm result:', enterRes?.result?.value);

  // Wait 2s for cutscene / transition
  await sleep(2500);

  // Take screenshot 2: immediately after enterRealm
  console.log('[DIAG] Taking screenshot 2 (After enterRealm)...');
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'diag_after_enter_realm.png'), Buffer.from(shot2.data, 'base64'));

  // Detailed state diagnostic
  const diagData = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      const cam = window.__camera || app?.camera;
      const renderer = window.__renderer || app?.renderer;
      const activeScene = app?.activeScene;
      const advScene = window.__anDuongVuongScene;
      const advRoom = window.__anDuongVuongRoom;

      // Check pixel in center of canvas
      let canvasSample = null;
      if (renderer && renderer.domElement) {
        try {
          const gl = renderer.getContext();
          const pixels = new Uint8Array(4);
          gl.readPixels(gl.drawingBufferWidth / 2, gl.drawingBufferHeight / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          canvasSample = Array.from(pixels);
        } catch (e) {
          canvasSample = 'Error: ' + e.message;
        }
      }

      // Check lights and objects in activeScene
      let lights = [];
      let meshes = 0;
      let visibleMeshes = 0;
      if (activeScene) {
        activeScene.traverse(obj => {
          if (obj.isLight) {
            lights.push({
              type: obj.type,
              name: obj.name,
              color: '#' + obj.color?.getHexString?.(),
              intensity: obj.intensity,
              visible: obj.visible,
              pos: [obj.position.x, obj.position.y, obj.position.z]
            });
          }
          if (obj.isMesh) {
            meshes++;
            if (obj.visible) visibleMeshes++;
          }
        });
      }

      return {
        activeSceneName: activeScene?.name,
        activeSceneVisible: activeScene?.visible,
        activeSceneChildrenCount: activeScene?.children?.length,
        camera: cam ? {
          fov: cam.fov,
          near: cam.near,
          far: cam.far,
          position: [cam.position.x, cam.position.y, cam.position.z],
          rotation: [cam.rotation.x, cam.rotation.y, cam.rotation.z],
          quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w]
        } : null,
        renderInfo: renderer?.info ? {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          lines: renderer.info.render.lines,
          points: renderer.info.render.points
        } : null,
        canvasSampleRGBA: canvasSample,
        lightsSummary: lights,
        meshesSummary: { total: meshes, visible: visibleMeshes },
        sceneBg: activeScene?.background ? {
          r: activeScene.background.r,
          g: activeScene.background.g,
          b: activeScene.background.b
        } : null,
        sceneFog: activeScene?.fog ? {
          color: activeScene.fog.color,
          density: activeScene.fog.density
        } : null
      };
    })()`,
    returnByValue: true
  });

  console.log('[DIAG] Diagnostic data:', JSON.stringify(diagData?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
  try {
    fs.rmSync(TEMP_USER_DATA_DIR, { recursive: true, force: true });
  } catch (_) {}
}

run().catch(console.error);
