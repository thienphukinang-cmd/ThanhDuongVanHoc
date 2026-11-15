---
name: blender-archipack
description: Use when generating procedural architectural elements in Blender, including parametric walls, slabs, doors, windows, curved roofs, wooden trusses, balustrades, stairs, AutoBoolean openings, and exporting optimized GLTF models for Three.js.
---

# blender-archipack: Parametric Architectural Modeling in Blender

## Overview
**Archipack** (`archipack-master`) is a comprehensive parametric architectural modeling addon for Blender. It provides native, real-time procedural generation of architectural structures: walls, doors, windows, curved roofs, wooden timber trusses (`archipack_truss.py`), floor slabs, and stairs with automated boolean wall cutting (`archipack_autoboolean.py`).

Local reference source: `d:\BaoTang3D\skills\archipack-master`

---

## When to Use blender-archipack
- Constructing complex, historically accurate architectural shells (palaces, pavilions, corridors, roofs).
- Modeling parametric curved tile roofs (*mái đao cong*), hip roofs, and traditional wooden trusses (*vì kèo*, xà ngang, con chồng).
- Generating precision wall openings for arch doors and carved window lattices using AutoBoolean.
- Creating parametric balustrades (*lan can con tiện*), steps, and multi-tier floor podiums.
- Producing clean, water-tight architectural geometry ready for GLTF/GLB export.

---

## Architecture of Archipack Modules

| Module | Architectural Application in BaoTang3D |
|--------|----------------------------------------|
| `archipack_roof.py` | Multi-tier hip roofs, curved overhangs, Chinese/Vietnamese tile generation |
| `archipack_truss.py` | Timber roof trusses, beam grids (*hệ vì kèo, quá giang, rui mè*) |
| `archipack_wall2.py` | Parametric wall layouts with exact thickness, heights, and chamfers |
| `archipack_autoboolean.py` | Non-destructive Boolean cutting for doorways and arches |
| `archipack_door.py` / `window.py` | Entrance portals, traditional double-leaf wooden doors, lattice windows |
| `archipack_fence.py` | Stone balustrades with lotus bud finials along bridges and ponds |
| `archipack_slab.py` | Stone foundations, podium platforms, floor tiles |
| `archipack_stair.py` | Traditional grand stone stairs with central dragon ramparts |

---

## Headless Blender Python Scripting with Archipack

You can automate Archipack generation headlessly via `blender --background --python script.py`:

```python
import bpy
import os

# 1. Ensure Archipack addon is enabled
if "archipack" not in bpy.context.preferences.addons:
    bpy.ops.preferences.addon_enable(module="archipack")

# Clear existing scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# 2. Add Parametric Wall System
bpy.ops.archipack.wall2(
    length=12.0,
    width=0.4,
    height=5.0
)
wall = bpy.context.active_object
wall.name = "PalaceMainWall"

# 3. Add Parametric Door & AutoBoolean
bpy.ops.archipack.door(
    type='CURVED',
    width=2.4,
    height=3.6
)
door = bpy.context.active_object
door.location = (6.0, 0, 0)

# Run AutoBoolean to carve doorway automatically
bpy.ops.archipack.autoboolean()

# 4. Export Optimized glTF for Three.js
export_path = os.path.abspath("public/model/procedural_palace_wall.glb")
bpy.ops.export_scene.gltf(
    filepath=export_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
    export_colors=False
)
print(f"Exported Archipack model to: {export_path}")
```

---

## Optimization Rules for WebGL / Three.js
1. **Apply Modifiers Before Export:** Always apply modifiers (`export_apply=True`) so boolean cuts become permanent static geometry.
2. **Remove Internal Faces:** Archipack walls can generate internal coplanar caps. In Blender, run `Select All -> Mesh -> Clean Up -> Degenerate Dissolve` and `Merge by Distance` (0.001m).
3. **Materials & UVs:** Use Box/Triplanar projection or Archipack's automatic UV coordinates mapped to atlas textures (e.g. wood grain, antique stone, terracotta tile).
4. **Pass through glTF-Transform:** After exporting from Archipack, run `npx @gltf-transform/cli optimize` to weld vertices and compress with Draco/Meshopt.
