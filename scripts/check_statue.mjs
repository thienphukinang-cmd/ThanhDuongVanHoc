import { spawn } from 'child_process';
import path from 'path';

const CDP_PORT = 9221;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_check_statue_' + Date.now());

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
  await send('Log.enable');

  const logs = [];
  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      logs.push(data.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  // Wait 6 seconds for glb to load
  await sleep(6000);

  const statueCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        const advRoom = app?.anDuongVuongRoom;
        if (!advRoom) return 'NO ADV ROOM';

        const found = [];
        advRoom.traverse(o => {
          if (o.name && (o.name.toLowerCase().includes('an_duong_vuong') || o.name.toLowerCase().includes('king') || o.name.toLowerCase().includes('statue') || o.name.toLowerCase().includes('glb'))) {
            found.push({
              name: o.name,
              type: o.type,
              visible: o.visible,
              pos: [o.position.x, o.position.y, o.position.z],
              scale: [o.scale.x, o.scale.y, o.scale.z],
              childCount: o.children?.length || 0
            });
          }
        });

        // Also check GLTFLoader or any error
        return {
          found,
          userData: advRoom.userData?.heroStatue ? {
            name: advRoom.userData.heroStatue.name,
            visible: advRoom.userData.heroStatue.visible,
            scale: [advRoom.userData.heroStatue.scale.x, advRoom.userData.heroStatue.scale.y, advRoom.userData.heroStatue.scale.z],
            pos: [advRoom.userData.heroStatue.position.x, advRoom.userData.heroStatue.position.y, advRoom.userData.heroStatue.position.z]
          } : 'NO heroStatue in userData'
        };
      })()
    `,
    returnByValue: true
  });

  console.log('STATUE CHECK:', JSON.stringify(statueCheck?.result?.value, null, 2));
  console.log('CONSOLE LOGS (ADV related):');
  logs.filter(l => l.toLowerCase().includes('an_duong') || l.toLowerCase().includes('gltf') || l.toLowerCase().includes('glb') || l.toLowerCase().includes('error')).forEach(l => console.log(l));

  ws.close();
  edgeProc.kill();
}

run().catch(console.error);
