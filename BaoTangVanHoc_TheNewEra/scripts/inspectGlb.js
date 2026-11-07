import fs from 'fs';

function inspect(file) {
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  console.log('=== FILE:', file, '===');
  console.log('Materials:', JSON.stringify(gltf.materials, null, 2));
  console.log('Meshes:', gltf.meshes?.map(m => ({
    name: m.name,
    primitives: m.primitives?.map(p => ({
      attributes: Object.keys(p.attributes),
      materialIndex: p.material
    }))
  })));
}

inspect('public/model/be_da_co.glb');
inspect('public/model/cot_da_co.glb');
inspect('public/model/an_thu_go.glb');
