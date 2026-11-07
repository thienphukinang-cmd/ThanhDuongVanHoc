import fs from 'fs';

function inspectImages(file) {
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  console.log('===', file, '===');
  console.log('Images:', gltf.images);
  console.log('Textures:', gltf.textures);
  console.log('Materials:', gltf.materials);
}

inspectImages('public/model/be_da_co.glb');
inspectImages('public/model/cot_da_co.glb');
inspectImages('public/model/an_thu_go.glb');
inspectImages('public/model/cot_go_co.glb');
