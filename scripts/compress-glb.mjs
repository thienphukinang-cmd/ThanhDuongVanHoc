import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, dedup, prune, textureCompress } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function createOptimizedIO() {
  const [decoderModule, encoderModule] = await Promise.all([
    draco3d.createDecoderModule(),
    draco3d.createEncoderModule()
  ]);

  return new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': decoderModule,
      'draco3d.encoder': encoderModule
    });
}

export async function compressGlbFile(inputPath, outputPath, options = {}) {
  const {
    quantizePosition = 14,
    quantizeNormal = 10,
    quantizeTexcoord = 12,
    maxTextureSize = 1024,
    targetFormat = 'webp',
    quality = 82
  } = options;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Tệp nguồn không tồn tại: ${inputPath}`);
  }

  const initialStats = fs.statSync(inputPath);
  const initialMB = (initialStats.size / (1024 * 1024)).toFixed(2);
  console.log(`[NÉN GLB] Bắt đầu xử lý: ${path.basename(inputPath)} (${initialMB} MB)`);

  const io = await createOptimizedIO();
  const document = await io.read(inputPath);

  // 1. Dọn dẹp vertex và material thừa
  await document.transform(
    dedup(),
    prune()
  );

  // 2. Nén và resize texture sang WebP
  try {
    await document.transform(
      textureCompress({
        encoder: sharp,
        targetFormat,
        resize: [maxTextureSize, maxTextureSize],
        quality
      })
    );
  } catch (texErr) {
    console.warn(`[NÉN GLB] Texture resize cảnh báo:`, texErr.message);
  }

  // 3. Nén hình học Draco edgebreaker
  await document.transform(
    draco({
      quantizePosition,
      quantizeNormal,
      quantizeTexcoord,
      quantizeColor: 8,
      quantizeGeneric: 10
    })
  );

  // 4. Ghi file đầu ra
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  await io.write(outputPath, document);

  const finalStats = fs.statSync(outputPath);
  const finalMB = (finalStats.size / (1024 * 1024)).toFixed(2);
  const savedPercent = (((initialStats.size - finalStats.size) / initialStats.size) * 100).toFixed(1);

  console.log(`[NÉN GLB] Thành công! -> ${path.basename(outputPath)}: ${finalMB} MB (Giảm ${savedPercent}%)`);
  return {
    file: path.basename(inputPath),
    initialMB: parseFloat(initialMB),
    finalMB: parseFloat(finalMB),
    savedPercent: parseFloat(savedPercent)
  };
}

// Chạy trực tiếp qua CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const targetFile = args[0];

  const runAllHeavyModels = async () => {
    const heavyFiles = [
      'public/models/ANDUONGVUONG.glb',
      'public/model/ANDUONGVUONG.glb',
      'public/models/an_duong_vuong.glb',
      'public/models/truyen_kieu_hero.glb',
      'public/assets/models/truyen_kieu_hero.glb',
      'public/models/den_long_co.glb',
      'public/model/den_long_co.glb',
      'public/models/daichiensontinhthuytinh.glb',
      'public/model/daichiensontinhthuytinh.glb'
    ];

    const results = [];
    for (const relPath of heavyFiles) {
      const fullPath = path.join(rootDir, relPath);
      if (fs.existsSync(fullPath)) {
        try {
          const res = await compressGlbFile(fullPath, fullPath, { maxTextureSize: 1024 });
          results.push(res);
        } catch (e) {
          console.error(`[LỖI NÉN] ${relPath}:`, e.message);
        }
      }
    }
    console.table(results);
  };

  if (targetFile) {
    const fullPath = path.resolve(process.cwd(), targetFile);
    compressGlbFile(fullPath, fullPath, { maxTextureSize: 1024 })
      .catch(e => console.error(e));
  } else {
    runAllHeavyModels();
  }
}
