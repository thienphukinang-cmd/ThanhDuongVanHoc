---
name: three-stdlib
description: Use when importing and utilizing Three.js extensions and addons, including GLTFLoader, DRACOLoader, KTX2Loader, RGBELoader, PointerLockControls, OrbitControls, Sky, Water, EffectComposer, and advanced postprocessing passes.
---

# three-stdlib: Standard Library Addons & Extensions for Three.js

## Overview
**`three-stdlib`** is the modular, modern distribution of Three.js example addons and utilities maintained by the `pmndrs` community. It provides tree-shakable, TypeScript-compatible loaders, controls, post-processing shaders, and procedural environment helpers.

Local reference source: `d:\BaoTang3D\skills\three-stdlib-main`

---

## When to Use three-stdlib
- Loading and configuring 3D assets: `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, `OBJLoader`, `FBXLoader`.
- Camera controls: `PointerLockControls` (first-person museum tour), `OrbitControls` (exhibit inspection), `TransformControls`.
- HDR / Environment maps: `RGBELoader`, `EXRLoader`, `GroundProjectedEnv`.
- Procedural elements: `Sky` (atmospheric Rayleigh/Mie scattering), `Water` (lotus pond shader with normal maps).
- Post-processing: `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `ShaderPass`, `FXAAShader`, `SMAAPass`.

---

## Common Implementations in BaoTang3D

### 1. Robust Asset Loading (`GLTFLoader` with `DRACOLoader`)
```javascript
import { GLTFLoader } from 'three-stdlib';
import { DRACOLoader } from 'three-stdlib';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/'); // Local or CDN fallback

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

export function loadModel(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => resolve(gltf),
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Loading ${url}: ${percent.toFixed(0)}%`);
      },
      (error) => reject(error)
    );
  });
}
```

### 2. First-Person Museum Controls (`PointerLockControls`)
```javascript
import { PointerLockControls } from 'three-stdlib';

export function setupFirstPersonControls(camera, domElement) {
  const controls = new PointerLockControls(camera, domElement);

  domElement.addEventListener('click', () => {
    if (!controls.isLocked) {
      controls.lock();
    }
  });

  return controls;
}
```

### 3. Atmospheric Sky Shader (`Sky`)
```javascript
import { Sky } from 'three-stdlib';
import * as THREE from 'three';

export function createPalaceSky(scene) {
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const sun = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(85); // Low late-afternoon / dusk sun
  const theta = THREE.MathUtils.degToRad(180);
  sun.setFromSphericalCoords(1, phi, theta);
  skyUniforms['sunPosition'].value.copy(sun);

  return sky;
}
```

### 4. Cinematic Post-Processing (`EffectComposer` & `UnrealBloomPass`)
```javascript
import { EffectComposer, RenderPass, UnrealBloomPass } from 'three-stdlib';
import * as THREE from 'three';

export function createCinematicPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Soft glow for palace lanterns, golden inscriptions, and god rays
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35,  // Strength (subtle, avoid blowout)
    0.4,   // Radius
    0.85   // Threshold (only bright highlights glow)
  );
  composer.addPass(bloomPass);

  return composer;
}
```

---

## Performance & Bundling Tips
- Import specifically from `three-stdlib` (e.g. `import { GLTFLoader } from 'three-stdlib'`) to enable Vite tree-shaking.
- Clean up unused passes and loaders during room unmounting or state transitions.
