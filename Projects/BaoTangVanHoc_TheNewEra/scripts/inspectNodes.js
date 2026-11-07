import fs from 'fs';

function inspectNodes(file) {
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  console.log('=== FILE:', file, '===');
  console.log('Nodes:', gltf.nodes);
}

inspectNodes('public/model/sontinh.glb');
inspectNodes('public/model/thuytinh.glb');
