---
name: mcp-for-blender
description: Use when connecting AI agents to Blender via Model Context Protocol (MCP), automating 3D modeling, executing Python bpy scripts, taking multi-angle viewport renders, inspecting scene hierarchies, and exporting glTF/GLB models directly to Three.js.
license: MIT
metadata:
  author: https://github.com/ahujasid
  repo: https://github.com/ahujasid/mcp-for-blender
  domain: blender-mcp
  role: bridge
---

# MCP for Blender (formerly blender-mcp)

## Overview
**MCP for Blender** connects LLM agents directly to a live Blender session using the Model Context Protocol (MCP). It enables two-way communication: the agent writes and executes Blender Python (`bpy`), manipulates meshes, applies materials, captures camera/wireframe renders for self-verification, and exports production `.glb` assets.

Local reference source: `d:\BaoTang3D\skills\mcp-for-blender-main`

---

## When to Use mcp-for-blender
- When the user asks to create, modify, inspect, or render 3D scenes in Blender.
- When generating 3D assets (palace pillars, dragon sculptures, carved lanterns, antique books) that require programmatic Blender modeling.
- When baking high-poly procedural textures down into PBR maps (diffuse, roughness, normal) for WebGL.
- When downloading and integrating Poly Haven or Sketchfab CC0 assets into a Blender scene.
- When exporting optimized `.glb` models into `public/model/` for `BaoTang3D`.

---

## Quick Setup & Antigravity MCP Integration

### 1. Installation
In PowerShell on Windows:
```powershell
# Automated setup (installs uv and configures client)
irm https://www.mcp-for-blender.com/install.ps1 | iex

# Or with uv already installed:
uvx mcp-for-blender setup
```

### 2. Antigravity MCP Server Configuration
Add to your Antigravity MCP config:
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

### 3. Install Addon in Blender
```bash
uvx mcp-for-blender install-addon
```
Then inside Blender:
- Go to **Edit → Preferences → Add-ons**
- Enable **Interface: MCP for Blender**
- The addon runs a socket server on `localhost:9876` allowing instant agent communication.

---

## Available MCP Tools

| Tool | Parameters | Description |
|------|------------|-------------|
| `execute_blender_code` | `code: string` | Executes arbitrary Python in Blender and returns stdout/stderr |
| `get_scene_info` | — | Returns full scene hierarchy, object names, vertex counts, materials |
| `get_viewport_render` | `camera?: string, samples?: number` | Takes high-resolution viewport render for visual verification |
| `search_polyhaven` | `query: string, asset_type?: string` | Searches CC0 models, textures, and HDRIs |
| `import_polyhaven_asset`| `asset_id: string` | Imports Poly Haven assets directly into active scene |

---

## Headless Automation Pattern for BaoTang3D
If Blender is not running interactively with GUI, run headless batch execution:
```bash
blender --background --python scripts/build_asset.py
```
And optimize exported `.glb` models using `gltf-transform`:
```bash
npx @gltf-transform/cli optimize public/model/asset.glb public/model/asset_opt.glb
```
