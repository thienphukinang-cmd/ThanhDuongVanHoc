---
name: blender-mcp
description: Use when connecting AI agents to Blender via the Model Context Protocol (MCP), automating 3D modeling, executing bpy scripts, capturing multi-angle renders, baking materials, downloading Poly Haven/Sketchfab assets, or exporting glTF models directly from Blender.
---

# blender-mcp: AI-Driven 3D Modeling with Blender & Model Context Protocol

## Overview
**Blender MCP** (`mcp-for-blender`) connects AI agents directly to a live Blender session using the Model Context Protocol (MCP). It allows the agent to inspect the 3D scene, write and execute Python (`bpy`) scripts, manipulate meshes and materials, take multi-angle viewport renders for visual verification, and export production-ready `.glb` assets.

Local reference source: `d:\BaoTang3D\skills\mcp-for-blender-main`

---

## When to Use blender-mcp
- Automating 3D asset creation, procedural modeling, and modifications directly inside Blender.
- Taking camera, wireframe, or clay renders to visually verify 3D geometry before web export.
- Downloading and integrating CC0 Poly Haven HDRIs, textures, and models via MCP tools.
- Baking procedural shaders (procedural wood grain, aged bronze, gold leaf) into lightweight PBR texture maps.
- Exporting optimized `.glb` models directly into `public/model/` for `BaoTang3D`.

---

## Setup & Configuration

### 1. Automatic One-Line Setup
In PowerShell on Windows:
```powershell
irm https://www.mcp-for-blender.com/install.ps1 | iex
```
Or if `uv` is already installed:
```powershell
uvx mcp-for-blender setup
```

### 2. Manual Configuration for Antigravity / Agent Runtimes
Add to your MCP configuration (e.g., `~/.gemini/antigravity/mcp_servers.json` or project MCP config):
```json
{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["mcp-for-blender"]
    }
  }
}
```

### 3. Blender Addon Installation
In terminal:
```bash
uvx mcp-for-blender install-addon
```
Then inside Blender:
- Open **Edit → Preferences → Add-ons**
- Enable **Interface: MCP for Blender**
- The addon runs a local socket server on port `9876` that the MCP server communicates with.

---

## Key MCP Tools Provided

| Tool Name | Description |
|-----------|-------------|
| `execute_blender_code` | Runs arbitrary Python (`bpy`) scripts inside Blender with full context access |
| `get_scene_info` | Retrieves object list, vertex counts, active cameras, and material hierarchy |
| `get_viewport_render` | Captures a high-resolution render from current viewport or specified camera |
| `search_polyhaven` | Searches Poly Haven library for CC0 models, textures, and HDRIs |
| `import_polyhaven_asset` | Downloads and imports Poly Haven HDRIs/models directly into the active scene |

---

## Headless Python Pipeline Example for BaoTang3D

When running automated asset processing without a GUI:
```python
import bpy
import sys
import os

def create_vietnamese_column(height=6.0, radius_base=0.35, radius_top=0.28):
    # Cylinder with subtle taper (thót ngọn)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=radius_base,
        depth=height,
        location=(0, 0, height / 2.0)
    )
    col = bpy.context.active_object
    col.name = "CotGoLim"

    # Add stone base (Chân tảng đá xanh)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=radius_base * 1.35,
        depth=0.4,
        location=(0, 0, 0.2)
    )
    base = bpy.context.active_object
    base.name = "ChanTangDa"

    # Export to GLB
    output_path = os.path.abspath("public/model/cot_go_lim.glb")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_apply=True
    )
    print(f"Exported column to {output_path}")

if __name__ == "__main__":
    create_vietnamese_column()
```
Run headlessly:
```bash
blender --background --python scripts/generate_column.py
```
