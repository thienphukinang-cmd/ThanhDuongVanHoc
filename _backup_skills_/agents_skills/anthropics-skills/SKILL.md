---
name: anthropics-skills
description: Use when authoring, orchestrating, or leveraging Anthropic agent skills, including frontend-design, algorithmic-art, canvas-design, web-artifacts-builder, webapp-testing, mcp-builder, and composition patterns.
---

# anthropics-skills: Anthropic Skills Ecosystem & Agent Capabilities

## Overview
**Anthropic Skills** (`anthropics/skills` & `agent-skills`) is the official standard and library of modular agent capabilities. It equips AI agents with specialized workflows for frontend design, algorithmic art generation, interactive web applications, automated web testing, documentation, and Model Context Protocol (MCP) server creation.

Local reference sources:
- `d:\BaoTang3D\skills\skills-main`
- `d:\BaoTang3D\skills\agent-skills-main`

---

## Catalog of Available Anthropic Skills

All individual skills have been integrated directly into `.agents/skills/`:

| Skill Name | Primary Purpose | Best Used For |
|------------|-----------------|---------------|
| `algorithmic-art` | Generative canvas, p5.js, Three.js shaders, math patterns | Traditional Vietnamese motifs, mandalas, particle systems |
| `frontend-design` | Production-grade UI, typography, layouts, CSS architectures | Museum HUD, responsive control panels, exhibition cards |
| `canvas-design` | 2D/3D HTML5 Canvas rendering & interactive graphic design | Exhibition floor plans, mini-maps, scroll textures |
| `web-artifacts-builder`| Complete single-page apps, interactive 3D viewers | Interactive 3D artifact inspect panels, audio narrators |
| `webapp-testing` | Playwright/Puppeteer automated UI and visual regression | End-to-end testing of 3D scene loading, FPS benchmarks |
| `mcp-builder` | Building custom Model Context Protocol servers | Bridging Blender, Three.js, and external AI agents |
| `web-design-guidelines`| Accessibility, color theory, responsive UX/UI | Dark-mode museum aesthetics, contrast compliance |
| `deploy-to-vercel` | Vercel deployment automation, edge functions | Publishing `BaoTang3D` to production with zero config |

---

## Best Practices for Authoring Skills (The Anthropic Standard)

1. **Clear Trigger in YAML Frontmatter:**
   The `description` field MUST start with `"Use when..."` and clearly specify explicit situations, keywords, and tasks that trigger the skill.

2. **Self-Contained & Actionable:**
   Include concrete code snippets, shell commands, and configuration snippets. Avoid vague philosophical prose.

3. **Progressive Disclosure:**
   Keep the main `SKILL.md` concise (< 400 lines) and place extended references, scripts, or examples in dedicated subdirectories:
   - `scripts/`: Executable helper tools (Node, Python, Bash)
   - `references/`: API specifications, schemas, design tokens
   - `examples/`: Reference implementations

4. **Deterministic Testing:**
   Validate skills against automated verification scripts (`npm run build`, headless browser screenshots) rather than subjective evaluation.
