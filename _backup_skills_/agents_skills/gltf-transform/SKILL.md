---
name: gltf-transform
description: Use when optimizing, inspecting, compressing, transforming, or validating 3D models (GLB, GLTF), applying Draco/Meshopt compression, WebP texture resizing, deduplicating materials, or pruning unused node hierarchies in Three.js and WebGL.
---

# glTF-Transform: WebGL 3D Model Optimization & Compression

## Overview
**glTF-Transform** (`@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`) is the definitive library and CLI for inspecting, editing, compressing, and optimizing 3D assets in glTF and GLB formats.

Local reference source: `d:\BaoTang3D\skills\glTF-Transform-main`

---

## When to Use glTF-Transform
- An uploaded or downloaded `.glb` file is too large (> 10MB) or causes WebGL stuttering.
- Models have excessive draw calls, duplicate textures, or uncompressed 4K PNGs.
- Need automated Draco or Meshopt geometric compression for web delivery.
- Need to prune empty nodes, weld duplicate vertices, or quantize vertex attributes.
- Preparing assets for 60+ FPS Three.js rendering in `BaoTang3D`.

---

## CLI Quick Reference

Ensure dependencies are available or run via npx:
```bash
# Basic inspection
npx @gltf-transform/cli inspect public/model/asset.glb

# Comprehensive automated optimization (weld, dedup, prune, resample)
npx @gltf-transform/cli optimize public/model/asset.glb public/model/asset_opt.glb

# Compress geometry with Draco (ideal for static meshes)
npx @gltf-transform/cli draco public/model/asset.glb public/model/asset_draco.glb

# Compress geometry with Meshopt (faster decoding than Draco, works well on mobile)
npx @gltf-transform/cli meshopt public/model/asset.glb public/model/asset_meshopt.glb

# Convert and resize textures to WebP (512x512 or 1024x1024 max for props)
npx @gltf-transform/cli webp public/model/asset.glb public/model/asset_webp.glb --max-size 1024

# Weld close vertices (tolerance in meters)
npx @gltf-transform/cli weld public/model/asset.glb public/model/asset_welded.glb --tolerance 0.0001
```

---

## Programmatic Node.js Pipeline (Tailored for BaoTang3D)

In Node.js scripts (such as `scripts/compress_model.mjs`), use the programmatic transform pipeline:

```javascript
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { 
  dedup, 
  prune, 
  resample, 
  weld, 
  simplify, 
  textureCompress, 
  quantize 
} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

export async function optimizeBaoTangModel(inputPath, outputPath) {
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

  const document = await io.read(inputPath);

  // 1. Remove unused textures, materials, and empty transformation nodes
  await document.transform(
    prune(),
    dedup()
  );

  // 2. Weld duplicate vertices and clean up mesh geometry
  await document.transform(
    weld({ tolerance: 0.0005 }),
    resample()
  );

  // 3. Compress textures to WebP and limit resolution (power of 2)
  if (sharp) {
    await document.transform(
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        resize: [1024, 1024]
      })
    );
  }

  // 4. Write optimized file
  await io.write(outputPath, document);
  console.log(`[glTF-Transform] Successfully optimized: ${outputPath}`);
}
```

---

## Three.js Integration Rules
1. **DRACOLoader Setup:** When loading models compressed with Draco, configure `DRACOLoader` with the Draco decoder path:
   ```javascript
   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
   import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

   const dracoLoader = new DRACOLoader();
   dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
   dracoLoader.preload();

   const gltfLoader = new GLTFLoader();
   gltfLoader.setDRACOLoader(dracoLoader);
   ```
2. **Sanitation Check:** Always run `computeVertexNormals()` and check for `NaN`/`Infinity` on positions to prevent black screen poisoning.
3. **Shadow Optimization:** Turn off `castShadow` and `receiveShadow` on micro-props and small decorations.
