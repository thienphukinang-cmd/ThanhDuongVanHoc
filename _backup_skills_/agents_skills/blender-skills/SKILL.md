---
name: blender-skills
description: Master orchestrator and index for the 95+ professional Blender 3D production skills (blender-modeler, hard-surface, archviz, environment-artist, prop-artist, lighting, materials, asset-optimization, export-pipeline). Use when designing, building, texturing, lighting, or optimizing 3D assets and environments for Blender and Three.js.
license: MIT
metadata:
  author: https://github.com/arjun988
  repo: https://github.com/arjun988/blender-skills
  domain: 3d-production
  role: master-suite
---

# Blender Skills: Complete 3D Production Suite for AI Agents

## Overview
**Blender Skills** (`arjun988/blender-skills`) is a production-grade suite of 95+ modular skills covering every discipline in modern 3D asset creation, environment design, shading, lighting, and game engine export.

All 95 individual skills are installed and directly accessible in `.agents/skills/`.

Local repository source: `d:\BaoTang3D\skills\blender-skills`

---

## Skill Directory by Discipline

### 1. Modeling & Architecture
- **`blender-modeler`**: Edit mode fundamentals, modifiers, non-destructive workflows, scale verification.
- **`hard-surface`**: Precision bevels, sub-d surfaces, non-destructive booleans, sharp edges.
- **`archviz`**: Architectural layouts, imperial/metric grid snapping, interior illumination, materials.
- **`procedural-modeling`**: Geometry nodes, curve sweeps, array-along-path, architectural facades.
- **`prop-artist`**: Museum exhibits, antique furniture, censers, thrones, historical artifacts.
- **`sculpting`**: Organic sculpting, ornamental reliefs, dragon heads, lotus carvings.

### 2. Environment & Biomes
- **`environment-artist`**: Terrain sculpting, set dressing, atmospheric depth, biome layouts.
- **`biome-worlds`**: Natural ecosystems, terrain layering, rock formations, water bodies.
- **`vegetation-artist`**: Procedural bamboo groves, lotus ponds, weeping willows, cherry blossoms.
- **`historical-worlds`**: Ancient Vietnamese palaces, imperial temples, stone citadels, heritage artifacts.
- **`set-dressing`**: Placement of clutter, lanterns, scrolls, incense burners, red banners.

### 3. Materials, Textures & Shading
- **`materials`**: Principled BSDF, roughness/metalness calibration, clearcoat, transmission.
- **`texture-workflow`**: UV unwrapping, seam placement, texture atlasing, PBR baking.
- **`uv-workflow`**: Non-stretching UV layout, texel density matching (e.g. 1024px/meter).
- **`hand-painted-style`** / **`stylized-style`**: Unlit vivid colors, gradient shading, anime/comic looks.

### 4. Lighting, Cinematography & Rendering
- **`lighting`**: Key/fill/rim lights, HDRI environment maps, volumetric fog, sun god rays.
- **`camera-cinematography`**: Focal length selection (24mm wide for architecture, 50mm portrait, 85mm prop hero shot), depth of field, framing.
- **`compositing`**: Bloom passes, tone mapping, color grading, vignette.
- **`rendering`**: Cycles vs EEVEE Next settings, sample counts, denoising.

### 5. WebGL & Game Engine Optimization Pipeline
- **`asset-optimization`**: Polygon reduction, manifold verification, vertex cache optimization.
- **`collision-proxy`**: Generating low-poly collision hulls (`Box3`, capsule, convex hull).
- **`lod-pipeline`**: Creating LOD levels (LOD0: 100%, LOD1: 50%, LOD2: 25%).
- **`export-pipeline`**: Clean glTF/GLB export with transforms applied, Y-up orientation, and PBR textures.

---

## Standard 3D Asset Creation Workflow for BaoTang3D

```
1. Concept & Specs   → Dimensions, polygon budget (e.g. < 5,000 tris for props)
2. Blockout          → blender-modeler (primitives, grid snap, scale check)
3. Detail Sculpt     → hard-surface or sculpting (dragon motifs, lotus petals)
4. Retopology        → retopology (clean quads, low polycount)
5. UV & Texel        → uv-workflow (0 to 1 space, consistent texel density)
6. Shading/Bake      → materials & texture-workflow (PBR bake to diffuse, normal, roughness)
7. Collision Proxy   → collision-proxy (simplified convex collider)
8. Export to WebGL   → export-pipeline (.glb) → pass to gltf-transform
```

---

## Directing an Agent with Blender Skills
When invoking subagents or executing 3D modeling tasks, specify the exact skill to activate:
- *"Use `archviz` and `hard-surface` to build the imperial palace entrance gate."*
- *"Use `lighting` and `camera-cinematography` to set up dramatic museum god rays."*
- *"Use `asset-optimization` and `export-pipeline` to prepare the 3D model for Three.js 60 FPS delivery."*
