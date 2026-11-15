import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CDP_PORT = 9222;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_qa_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((item) => item.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch (e) {
      // wait
    }
    await sleep(500);
  }
  throw new Error('Failed to get CDP debugger URL');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(msg.error);
          } else {
            resolve(msg.result);
          }
        } else if (msg.method) {
          const listeners = this.eventListeners.get(msg.method) || [];
          for (const cb of listeners) {
            cb(msg.params);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, cb) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(cb);
  }

  async evaluate(expression, awaitPromise = true) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error('Evaluation exception: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runQA() {
  console.log('[QA] Starting Edge Headless with CDP on port', CDP_PORT);
  
  if (!fs.existsSync(TEMP_USER_DATA_DIR)) {
    fs.mkdirSync(TEMP_USER_DATA_DIR, { recursive: true });
  }

  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--window-size=1280,720',
    'about:blank'
  ], {
    stdio: 'ignore'
  });

  const consoleErrors = [];
  const pageErrors = [];
  const httpFailures = [];

  try {
    const wsUrl = await getDebuggerUrl();
    console.log('[QA] Connected to CDP:', wsUrl);

    const client = new CDPClient(wsUrl);
    await client.connect();

    // Enable domains
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');

    client.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = params.args ? params.args.map((a) => (a.value !== undefined ? a.value : a.description)).join(' ') : '';
        consoleErrors.push(text);
        console.error('[Browser console.error]', text);
      }
    });

    client.on('Runtime.exceptionThrown', (params) => {
      const desc = params.exceptionDetails ? params.exceptionDetails.text + ' ' + (params.exceptionDetails.exception ? params.exceptionDetails.exception.description : '') : 'unknown exception';
      pageErrors.push(desc);
      console.error('[Browser pageerror]', desc);
    });

    client.on('Network.responseReceived', (params) => {
      const { response } = params;
      if (response && response.status >= 400) {
        httpFailures.push({ url: response.url, status: response.status, statusText: response.statusText });
        console.error('[Network Error]', response.status, response.url);
      }
    });

    console.log('[QA] Navigating to http://localhost:5173/ ...');
    await client.send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for the app and scene to load
    console.log('[QA] Waiting for window.__app and window.__mainScene ...');
    let loaded = false;
    for (let i = 0; i < 40; i++) {
      await sleep(1000);
      try {
        const ready = await client.evaluate(`
          (function() {
            return !!(window.__app && window.__mainScene && window.__lobbyDecorator);
          })()
        `);
        if (ready) {
          loaded = true;
          console.log(`[QA] App and mainScene initialized after ${i + 1} seconds.`);
          break;
        }
      } catch (e) {
        // continue
      }
    }

    if (!loaded) {
      throw new Error('Timed out waiting for window.__app and window.__mainScene to initialize.');
    }

    // Let the scene render a bit
    await sleep(2000);

    console.log('[QA] Inspecting Museum_Space_Enrichment_Root and components...');

    const verificationResult = await client.evaluate(`
      (function() {
        const results = {
          items: {},
          corridorClearance: null,
          fpsCheck: null,
          issues: []
        };

        const scene = window.__mainScene || window.__scene;
        if (!scene) {
          results.issues.push('mainScene not found');
          return results;
        }

        // 1. Locate Space Enrichment Root
        let root = scene.getObjectByName('Museum_Space_Enrichment_System_Root') ||
                   scene.getObjectByName('Museum_Space_Enrichment_Root');

        if (!root) {
          scene.traverse((obj) => {
            if (obj.name && (obj.name.includes('Museum_Space_Enrichment') || obj.name.includes('Space_Enrichment'))) {
              root = obj;
            }
          });
        }

        results.items.rootFound = !!root;
        results.items.rootName = root ? root.name : null;

        if (!root) {
          results.issues.push('Museum_Space_Enrichment_Root not found in mainScene');
          return results;
        }

        // 2. Bình Phong Chạm Khắc Tứ Linh / Sen Vàng tại các góc khuất
        const screens = [];
        root.traverse((obj) => {
          if (obj.name === 'Carved_Lim_Folding_Screen') {
            screens.push({
              name: obj.name,
              pos: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
              leavesCount: obj.children.filter(c => c.name.startsWith('Screen_Leaf_')).length
            });
          }
        });
        results.items.foldingScreens = {
          count: screens.length,
          screens
        };
        if (screens.length < 2) {
          results.issues.push('Expected at least 2 Carved_Lim_Folding_Screen, found ' + screens.length);
        }

        // 3. Tàng Kinh Các Thu Nhỏ (Kệ Sách Cổ cao 3.2m)
        const bookcases = [];
        root.traverse((obj) => {
          if (obj.name === 'Heritage_Antique_Bookcase') {
            bookcases.push({
              name: obj.name,
              pos: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
              childrenCount: obj.children.length
            });
          }
        });
        results.items.bookcases = {
          count: bookcases.length,
          bookcases
        };
        if (bookcases.length < 2) {
          results.issues.push('Expected 2 Heritage_Antique_Bookcase, found ' + bookcases.length);
        }

        // 4. Bộ Đỉnh Đồng & Hạc Chầu
        const burnerSets = [];
        root.traverse((obj) => {
          if (obj.name === 'Bronze_Incense_Burner_And_Cranes_Set') {
            const hasTripod = !!obj.getObjectByName('Bronze_Incense_Burner_Tripod');
            const hasCraneLeft = !!obj.getObjectByName('Crane_Left');
            const hasCraneRight = !!obj.getObjectByName('Crane_Right');
            burnerSets.push({
              name: obj.name,
              pos: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
              hasTripod,
              hasCraneLeft,
              hasCraneRight
            });
          }
        });
        results.items.burnerSets = {
          count: burnerSets.length,
          burnerSets
        };
        if (burnerSets.length < 2) {
          results.issues.push('Expected 2 Bronze_Incense_Burner_And_Cranes_Set, found ' + burnerSets.length);
        }

        // 5. Trướng Lụa, Rèm Trúc & Câu Đối chữ Nôm, hoành phi thếp vàng
        const silkDecor = root.getObjectByName('Silk_Bamboo_And_Calligraphy_Decorations');
        results.items.silkDecor = {
          found: !!silkDecor,
          childrenCount: silkDecor ? silkDecor.children.length : 0
        };
        if (!silkDecor) {
          results.issues.push('Silk_Bamboo_And_Calligraphy_Decorations not found');
        }

        // 6. Góc Ông Đồ & Thư Pháp
        const scholarsNook = root.getObjectByName('Scholars_Writing_Nook_Root');
        results.items.scholarsNook = {
          found: !!scholarsNook,
          pos: scholarsNook ? { x: scholarsNook.position.x, y: scholarsNook.position.y, z: scholarsNook.position.z } : null,
          hasMat: scholarsNook ? !!scholarsNook.getObjectByName('Scholars_Sedge_Mat') : false,
          hasDesk: scholarsNook ? !!scholarsNook.getObjectByName('Scholars_Low_Table') : false,
          hasInkstone: scholarsNook ? !!scholarsNook.getObjectByName('Inkstone_Set') : false,
          hasRedPapers: scholarsNook ? !!scholarsNook.getObjectByName('Red_Calligraphy_Papers_Cluster') : false,
          hasLoreProxy: scholarsNook ? !!scholarsNook.getObjectByName('plaque_ongDo_thuPhap') : false
        };
        if (!scholarsNook) {
          results.issues.push('Scholars_Writing_Nook_Root not found');
        }

        // 7. Góc Nhạc Cụ Cổ Truyền & Trà Đạo
        const musicNook = root.getObjectByName('Traditional_Music_And_Tea_Nook_Root');
        results.items.musicNook = {
          found: !!musicNook,
          pos: musicNook ? { x: musicNook.position.x, y: musicNook.position.y, z: musicNook.position.z } : null,
          hasInstrumentsDais: musicNook ? !!musicNook.getObjectByName('Instruments_Rosewood_Dais') : false,
          hasDanBau: musicNook ? !!musicNook.getObjectByName('Dan_Bau_Instrument') : false,
          hasDanTranh: musicNook ? !!musicNook.getObjectByName('Dan_Tranh_Instrument') : false,
          hasDanNguyet: musicNook ? !!musicNook.getObjectByName('Dan_Nguyet_Instrument') : false,
          hasSaoTruc: musicNook ? !!musicNook.getObjectByName('Sao_Truc_Flute') : false,
          hasTeaSet: musicNook ? !!musicNook.getObjectByName('Lotus_Tea_Service_Set') : false,
          hasAudio: musicNook ? !!musicNook.getObjectByName('DanTranh_Traditional_PositionalAudio') : false,
          hasLoreProxy: musicNook ? !!musicNook.getObjectByName('plaque_nhacCu_traDao') : false
        };
        if (!musicNook) {
          results.issues.push('Traditional_Music_And_Tea_Nook_Root not found');
        }

        // 8. Góc Dân Gian & Làng Nghề
        const folkNook = root.getObjectByName('Folk_Crafts_Nook_Root');
        results.items.folkNook = {
          found: !!folkNook,
          pos: folkNook ? { x: folkNook.position.x, y: folkNook.position.y, z: folkNook.position.z } : null,
          hasCeramics: folkNook ? !!folkNook.getObjectByName('ChuDau_Ceramic_Vase_Large') : false,
          hasMasks: folkNook ? !!folkNook.getObjectByName('TuongCheo_Masks_Trio') : false,
          hasHat: folkNook ? !!folkNook.getObjectByName('Non_Quai_Thao_Silk_Hat') : false,
          hasBaskets: folkNook ? !!folkNook.getObjectByName('Bamboo_Carrying_Pole_Set') : false,
          hasLoreProxy: folkNook ? !!folkNook.getObjectByName('plaque_danGian_langNghe') : false
        };
        if (!folkNook) {
          results.issues.push('Folk_Crafts_Nook_Root not found');
        }

        // 9. Tiểu Cảnh Thiên Nhiên Tứ Quý & Non Bộ Sương Khói
        const natureGroup = root.getObjectByName('Four_Seasons_Bonsai_And_Rockery_Group');
        const pondGroup = root.getObjectByName('Ceramic_Pond_And_Mist_Rockery');
        results.items.natureAndPond = {
          natureFound: !!natureGroup,
          pondFound: !!pondGroup,
          hasBonsaiTung: natureGroup ? !!natureGroup.getObjectByName('Bonsai_Tung_Bach') : false,
          hasBonsaiCuc: natureGroup ? !!natureGroup.getObjectByName('Bonsai_Cuc_Vang') : false,
          hasBonsaiTruc: natureGroup ? !!natureGroup.getObjectByName('Bonsai_Truc_Quan_Tu') : false,
          hasBonsaiMai: natureGroup ? !!natureGroup.getObjectByName('Bonsai_Mai_Vang') : false,
          hasMist: pondGroup ? !!pondGroup.getObjectByName('NonBo_Mist_Particles') : false,
          hasLotusLeaves: pondGroup ? !!pondGroup.getObjectByName('CeramicPond_Lotus_Leaves') : false,
          hasLotusBlooms: pondGroup ? !!pondGroup.getObjectByName('CeramicPond_Lotus_Blooms') : false
        };
        if (!natureGroup || !pondGroup) {
          results.issues.push('Four_Seasons_Bonsai_And_Rockery_Group or Ceramic_Pond_And_Mist_Rockery not found');
        }

        // 10. Quần thể Đèn Kéo Quân & Đèn Lồng Hội An thả trần (Y=12..16m)
        const ceilingLanterns = root.getObjectByName('Ceiling_Revolving_Lanterns_Group');
        results.items.ceilingLanterns = {
          found: !!ceilingLanterns,
          childrenCount: ceilingLanterns ? ceilingLanterns.children.length : 0
        };
        if (!ceilingLanterns) {
          results.issues.push('Ceiling_Revolving_Lanterns_Group not found');
        }

        // 11. Họa tiết Mặt Trống Đồng chiếu phát quang trên sàn
        const floorMandala = root.getObjectByName('Floor_DongSon_Mandala_Projections');
        results.items.floorMandala = {
          found: !!floorMandala,
          childrenCount: floorMandala ? floorMandala.children.length : 0
        };
        if (!floorMandala) {
          results.issues.push('Floor_DongSon_Mandala_Projections not found');
        }

        // 12. Living VFX (Khói trầm hương, cánh hoa rơi, đom đóm lân tinh xanh ngọc)
        const livingVFX = root.getObjectByName('Space_Enrichment_Living_VFX_Root');
        results.items.livingVFX = {
          found: !!livingVFX,
          hasSmokeWest: livingVFX ? !!livingVFX.getObjectByName('Incense_Smoke_West') : false,
          hasSmokeEast: livingVFX ? !!livingVFX.getObjectByName('Incense_Smoke_East') : false,
          hasFallingPetals: livingVFX ? !!livingVFX.getObjectByName('Falling_Flower_Petals_VFX') : false,
          hasFireflies: livingVFX ? !!livingVFX.getObjectByName('Cyan_Fireflies_VFX') : false
        };
        if (!livingVFX) {
          results.issues.push('Space_Enrichment_Living_VFX_Root not found');
        }

        // 13. Kiểm tra trục đường đi chính giữa (|X| <= 2.3) hoàn toàn thông thoáng
        // Check solid colliders in hitboxManager
        const hbMgr = window.__museumHitboxManager || window.hitboxManager;
        let colliderCollisions = [];
        if (hbMgr && hbMgr.solidColliders) {
          for (const col of hbMgr.solidColliders) {
            const box = col.box || col.customBox;
            if (box) {
              // Check if box overlaps with corridor central clearance |X| <= 2.3
              // Corridor path runs along Z roughly from -40 to 40 at Y=0..2
              if (box.min.y < 2.0 && box.max.y > 0.0) {
                const overlapsX = !(box.max.x < -2.3 || box.min.x > 2.3);
                if (overlapsX) {
                  colliderCollisions.push({
                    tag: col.tag || col.name || 'unnamed',
                    min: { x: box.min.x, y: box.min.y, z: box.min.z },
                    max: { x: box.max.x, y: box.max.y, z: box.max.z }
                  });
                }
              }
            }
          }
        }
        results.corridorClearance = {
          totalSolidCollidersChecked: hbMgr && hbMgr.solidColliders ? hbMgr.solidColliders.length : 0,
          obstructingCollidersInCentralLane: colliderCollisions
        };
        if (colliderCollisions.length > 0) {
          results.issues.push('Obstacles found blocking central walkway (|X| <= 2.3): ' + JSON.stringify(colliderCollisions));
        }

        return results;
      })()
    `);

    console.log('[QA] Component Verification Results:');
    console.log(JSON.stringify(verificationResult, null, 2));

    // FPS test: measure 100 frames
    console.log('[QA] Measuring FPS over 120 frames...');
    const fpsMeasurement = await client.evaluate(`
      new Promise((resolve) => {
        let frameCount = 0;
        const maxFrames = 120;
        const startTime = performance.now();
        let lastTime = startTime;
        const frameDeltas = [];

        function step(now) {
          const delta = now - lastTime;
          lastTime = now;
          if (frameCount > 0) {
            frameDeltas.push(delta);
          }
          frameCount++;
          if (frameCount < maxFrames) {
            requestAnimationFrame(step);
          } else {
            const totalDuration = now - startTime;
            const avgFPS = (frameDeltas.length / (totalDuration / 1000));
            frameDeltas.sort((a, b) => a - b);
            const p95Delta = frameDeltas[Math.floor(frameDeltas.length * 0.95)];
            const minFPS = 1000 / p95Delta;
            resolve({
              avgFPS: Number(avgFPS.toFixed(1)),
              minFPS: Number(minFPS.toFixed(1)),
              totalFrames: frameDeltas.length,
              totalDurationMs: Number(totalDuration.toFixed(1))
            });
          }
        }
        requestAnimationFrame(step);
      })
    `);

    console.log('[QA] FPS Measurement:', fpsMeasurement);

    client.close();
    edgeProc.kill();

    return {
      success: verificationResult.issues.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0 && httpFailures.length === 0,
      consoleErrors,
      pageErrors,
      httpFailures,
      verificationResult,
      fpsMeasurement
    };
  } catch (err) {
    edgeProc.kill();
    throw err;
  } finally {
    // cleanup temp user data dir
    try {
      fs.rmSync(TEMP_USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
}

runQA().then((res) => {
  console.log('[QA FINAL RESULT]', res.success ? 'PASS' : 'FAIL');
  fs.writeFileSync('qa_result.json', JSON.stringify(res, null, 2));
  process.exit(res.success ? 0 : 1);
}).catch((err) => {
  console.error('[QA RUNNER ERROR]', err);
  process.exit(1);
});
