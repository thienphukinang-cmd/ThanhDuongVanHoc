---
name: threejs-core
description: Use when developing, architecting, optimizing, or debugging Three.js WebGL applications, custom shaders, BufferGeometry manipulation, InstancedMesh batching, lighting, tone mapping, and memory cleanup (dispose).
---

# Three.js Core Architecture & WebGL Mastery

## Overview
**Three.js** is the primary 3D WebGL rendering engine powering `BaoTang3D`. This skill covers core Three.js architecture, 60+ FPS performance patterns, buffer sanitation, instancing, custom shaders, and memory lifecycle management.

Local reference source: `d:\BaoTang3D\skills\three.js-dev`

---

## When to Use threejs-core
- Constructing new procedural 3D environments, rooms, exhibits, or architectural elements.
- Managing the `WebGLRenderer`, render loop, render passes, and camera projection.
- Preventing memory leaks via systematic `dispose()` of geometries, materials, and textures.
- Building custom shaders (`ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile`).
- Batching repetitive meshes (tiles, columns, lights, lanterns) using `InstancedMesh`.
- Eliminating NaN/Infinity vertex buffer bugs that cause WebGL black screen crashes.

---

## Core Rendering Best Practices (BaoTang3D Standards)

### 1. WebGLRenderer Setup & Color Space
```javascript
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
  depth: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Never exceed 1.5 to maintain 60 FPS
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

### 2. Geometry Sanitation & NaN Shielding
Every procedurally generated or modified `BufferGeometry` MUST be sanitized:
```javascript
export function sanitizeGeometry(geom) {
  if (!geom || !geom.isBufferGeometry) return geom;
  
  const posAttr = geom.getAttribute('position');
  if (posAttr) {
    const arr = posAttr.array;
    for (let i = 0; i < arr.length; i++) {
      if (!Number.isFinite(arr[i])) {
        console.warn(`[threejs-core] Sanitized NaN/Infinity at position index ${i}`);
        arr[i] = 0;
      }
    }
    posAttr.needsUpdate = true;
  }
  
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}
```

### 3. InstancedMesh Batching for 60+ FPS
Whenever rendering repeating elements (e.g. 500 roof tiles, 40 columns, 100 lotus lanterns), use `THREE.InstancedMesh` rather than creating individual `THREE.Mesh` instances:
```javascript
const count = 200;
const tileGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8, 1, true, 0, Math.PI);
const tileMat = new THREE.MeshStandardMaterial({
  color: 0x9e3820,
  roughness: 0.7,
  metalness: 0.1
});

const instancedTiles = new THREE.InstancedMesh(tileGeom, tileMat, count);
instancedTiles.instanceMatrix.setUsage(THREE.StaticDrawUsage);

const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(rx, ry, rz);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  instancedTiles.setMatrixAt(i, dummy.matrix);
}
instancedTiles.instanceMatrix.needsUpdate = true;
scene.add(instancedTiles);
```

### 4. Memory Lifecycle & Safe Disposal
Three.js does not automatically garbage-collect WebGL GPU buffers. Explicitly dispose resources:
```javascript
export function disposeHierarchy(node) {
  if (!node) return;
  node.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => disposeMaterial(mat));
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

function disposeMaterial(mat) {
  for (const key of Object.keys(mat)) {
    const val = mat[key];
    if (val && typeof val === 'object' && val.isTexture) {
      val.dispose();
    }
  }
  mat.dispose();
}
```

---

## Lighting & Atmosphere Strategy
- **Ambient & Hemisphere Light:** Use soft ambient hues (`THREE.HemisphereLight(0xfff3e3, 0x111625, 0.8)`) so undersides of structures are never pitch black.
- **Directional Light (Sun / God Rays):** Single main light with tightly bounded shadow frustum (`camera.left`, `right`, `top`, `bottom` clamped to building boundaries).
- **Point / Spot Lights:** Minimize dynamic shadow-casting point lights to at most 1–2 per active room to preserve mobile and low-tier GPU performance.
