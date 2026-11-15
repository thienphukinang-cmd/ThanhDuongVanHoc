import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  prune,
  draco,
  textureCompress,
  weld,
  resample
} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function main() {
  const inputPath = path.resolve('public/models/amduongvuong.glb');
  const outputPath = path.resolve('public/models/amduongvuong_draco.glb');
  const syncPath = path.resolve('public/model/amduongvuong.glb');
  const syncModelsPath = path.resolve('public/models/amduongvuong.glb');

  console.log(`Input file: ${inputPath}`);
  const inputStats = fs.statSync(inputPath);
  console.log(`Original file size: ${(inputStats.size / (1024 * 1024)).toFixed(2)} MB`);

  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule()
    });

  const document = await io.read(inputPath);
  const root = document.getRoot();

  console.log(`Meshes: ${root.listMeshes().length}`);
  console.log(`Textures: ${root.listTextures().length}`);
  console.log(`Materials: ${root.listMaterials().length}`);
  console.log(`Nodes: ${root.listNodes().length}`);

  for (const tex of root.listTextures()) {
    console.log(`Texture name: ${tex.getName()}, mime: ${tex.getMimeType()}, size: ${tex.getImage()?.length} bytes`);
  }

  console.log('Running transformations: prune, dedup, weld, resample...');
  await document.transform(
    prune(),
    dedup(),
    weld({ tolerance: 0.0001 }),
    resample()
  );

  console.log('Compressing textures with sharp (WebP 1024x1024 / 2048x2048)...');
  await document.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [2048, 2048],
      quality: 85
    })
  );

  console.log('Applying Draco compression (method: edgebreaker)...');
  await document.transform(
    draco({
      method: 'edgebreaker',
      quantizationVolume: 'mesh',
      quantizationBits: {
        POSITION: 14,
        NORMAL: 10,
        TEX_COORD: 12,
        COLOR: 8,
        GENERIC: 12
      }
    })
  );

  console.log(`Writing output to ${outputPath}...`);
  await io.write(outputPath, document);

  const outStats = fs.statSync(outputPath);
  console.log(`Compressed file size: ${(outStats.size / (1024 * 1024)).toFixed(2)} MB`);

  // If size is under 20MB, replace amduongvuong.glb in both public/models and public/model
  if (outStats.size < 20 * 1024 * 1024) {
    fs.copyFileSync(outputPath, syncModelsPath);
    if (!fs.existsSync(path.dirname(syncPath))) {
      fs.mkdirSync(path.dirname(syncPath), { recursive: true });
    }
    fs.copyFileSync(outputPath, syncPath);
    console.log(`Successfully synced compressed model to:\n  - ${syncModelsPath}\n  - ${syncPath}`);
  } else {
    console.warn(`Compressed file is still ${(outStats.size / (1024 * 1024)).toFixed(2)} MB`);
  }
}

main().catch((err) => {
  console.error('Compression failed:', err);
  process.exit(1);
});
