"""
blender_rebuild_anduongvuong.py
Blender Python script — sinh coloa_kit.glb cho Phòng An Dương Vương
Compatible with Blender 4.x and Blender 5.x LTS.
Run: blender --background --python scripts/blender_rebuild_anduongvuong.py
"""

import bpy
import bmesh
import math
import os

# ── 0. RESET SCENE ───────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)

# Ensure scene collection exists and is active
scene = bpy.context.scene

# ── HELPERS ───────────────────────────────────────────────────────────────────

def create_collection(name):
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    return col


def hex_to_rgba(hex_str, alpha=1.0):
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return (r, g, b, alpha)


def new_material(name, base_color=(0.8, 0.8, 0.8, 1.0),
                 metallic=0.0, roughness=0.5,
                 emission_color=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    # Handle modern & legacy node tree activation
    if hasattr(mat, "use_nodes"):
        try:
            mat.use_nodes = True
        except Exception:
            pass

    nt = mat.node_tree
    bsdf = None
    if nt:
        bsdf = nt.nodes.get("Principled BSDF")
        if bsdf is None:
            bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")

    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness

        if emission_color is not None:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = emission_color
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = emission_color
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def set_active(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)


def deselect_all():
    bpy.ops.object.select_all(action='DESELECT')


def finish_object(obj, col):
    """Link to collection, smooth shade, and smart UV unwrap."""
    if obj.name not in col.objects:
        col.objects.link(obj)
    if obj.name in scene.collection.objects:
        scene.collection.objects.unlink(obj)

    deselect_all()
    set_active(obj)
    bpy.ops.object.shade_smooth()

    # Smart UV
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    deselect_all()


def join_objects(primary_obj, other_objs):
    """Join other_objs into primary_obj, preserving transforms and materials."""
    deselect_all()
    for o in other_objs:
        o.select_set(True)
    set_active(primary_obj)
    bpy.ops.object.join()
    return primary_obj


# ── COLLECTION ────────────────────────────────────────────────────────────────
kit_col = create_collection('CoLoa_Kit')

# ═════════════════════════════════════════════════════════════════════════════
# 1. CoLoa_Portal_Gate — cổng thành 4.2m×5m, 2 trụ + xà + mái cong
# ═════════════════════════════════════════════════════════════════════════════
mat_gate = new_material("Mat_Gate", base_color=hex_to_rgba("4A5568"), metallic=0.1, roughness=0.8)
mat_roof = new_material("Mat_Roof", base_color=hex_to_rgba("8B4513"), metallic=0.05, roughness=0.7)

# Left Pillar (Box: 0.5 x 0.5 x 5.0)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-2.1, 0, 2.5), scale=(0.5, 0.5, 5.0))
pillar_l = bpy.context.active_object
pillar_l.data.materials.append(mat_gate)

# Right Pillar
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(2.1, 0, 2.5), scale=(0.5, 0.5, 5.0))
pillar_r = bpy.context.active_object
pillar_r.data.materials.append(mat_gate)

# Crossbeam
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 4.8), scale=(4.7, 0.6, 0.4))
crossbeam = bpy.context.active_object
crossbeam.data.materials.append(mat_gate)

# Roof parts (curved arch)
roof_parts = []
roof_count = 11
for i in range(roof_count):
    t = (i / (roof_count - 1)) - 0.5  # -0.5 to 0.5
    rx = t * 5.2
    rz = 5.05 + 0.5 * (1.0 - (2.0 * t) ** 2)
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(rx, 0, rz),
        scale=(5.2 / roof_count + 0.08, 0.9, 0.25)
    )
    p = bpy.context.active_object
    p.data.materials.append(mat_roof)
    roof_parts.append(p)

# Join all into CoLoa_Portal_Gate
gate_obj = join_objects(pillar_l, [pillar_r, crossbeam] + roof_parts)
gate_obj.name = "CoLoa_Portal_Gate"
gate_obj.data.name = "CoLoa_Portal_Gate_Mesh"
finish_object(gate_obj, kit_col)

# ═════════════════════════════════════════════════════════════════════════════
# 2. DongSon_Drum_Pedestal — bệ 3 tầng R=1.6/1.3/1.0m H=0.4/0.5/0.4m
# ═════════════════════════════════════════════════════════════════════════════
mat_drum = new_material("Mat_DongSon", base_color=hex_to_rgba("B87333"), metallic=0.6, roughness=0.4)

# Tier 1 (bottom): R=1.6, H=0.4 -> Z: 0 to 0.4 (center 0.2)
bpy.ops.mesh.primitive_cylinder_add(radius=1.6, depth=0.4, location=(0, 0, 0.2), vertices=36)
t1 = bpy.context.active_object
t1.data.materials.append(mat_drum)

# Tier 2 (middle): R=1.3, H=0.5 -> Z: 0.4 to 0.9 (center 0.65)
bpy.ops.mesh.primitive_cylinder_add(radius=1.3, depth=0.5, location=(0, 0, 0.65), vertices=36)
t2 = bpy.context.active_object
t2.data.materials.append(mat_drum)

# Tier 3 (top): R=1.0, H=0.4 -> Z: 0.9 to 1.3 (center 1.1)
bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=0.4, location=(0, 0, 1.1), vertices=36)
t3 = bpy.context.active_object
t3.data.materials.append(mat_drum)

drum_obj = join_objects(t1, [t2, t3])
drum_obj.name = "DongSon_Drum_Pedestal"
drum_obj.data.name = "DongSon_Drum_Pedestal_Mesh"
finish_object(drum_obj, kit_col)

# ═════════════════════════════════════════════════════════════════════════════
# 3. CoLoa_Wall_Arc — tường cong R=6m, dày 0.8m, cao 3m, 120° arc
# ═════════════════════════════════════════════════════════════════════════════
mat_wall = new_material("Mat_CoLoaWall", base_color=hex_to_rgba("9E8B6A"), metallic=0.0, roughness=0.9)

arc_R = 6.0
arc_thick = 0.8
arc_h = 3.0
arc_segs = 28
start_ang = math.radians(-60)
end_ang = math.radians(60)

bm_wall = bmesh.new()
v_bot_in, v_bot_out, v_top_in, v_top_out = [], [], [], []

for i in range(arc_segs + 1):
    ang = start_ang + (end_ang - start_ang) * i / arc_segs
    cos_a = math.cos(ang)
    sin_a = math.sin(ang)
    r_in = arc_R - arc_thick * 0.5
    r_out = arc_R + arc_thick * 0.5

    v_bot_in.append(bm_wall.verts.new((r_in * cos_a, r_in * sin_a, 0.0)))
    v_bot_out.append(bm_wall.verts.new((r_out * cos_a, r_out * sin_a, 0.0)))
    v_top_in.append(bm_wall.verts.new((r_in * cos_a, r_in * sin_a, arc_h)))
    v_top_out.append(bm_wall.verts.new((r_out * cos_a, r_out * sin_a, arc_h)))

bm_wall.verts.ensure_lookup_table()

for i in range(arc_segs):
    # Outer wall face
    bm_wall.faces.new([v_bot_out[i], v_bot_out[i + 1], v_top_out[i + 1], v_top_out[i]])
    # Inner wall face
    bm_wall.faces.new([v_bot_in[i + 1], v_bot_in[i], v_top_in[i], v_top_in[i + 1]])
    # Bottom
    bm_wall.faces.new([v_bot_in[i], v_bot_in[i + 1], v_bot_out[i + 1], v_bot_out[i]])
    # Top
    bm_wall.faces.new([v_top_in[i + 1], v_top_in[i], v_top_out[i], v_top_out[i + 1]])

# End caps
bm_wall.faces.new([v_bot_in[0], v_top_in[0], v_top_out[0], v_bot_out[0]])
bm_wall.faces.new([v_bot_out[arc_segs], v_top_out[arc_segs], v_top_in[arc_segs], v_bot_in[arc_segs]])

wall_mesh = bpy.data.meshes.new("CoLoa_Wall_Arc_Mesh")
bm_wall.to_mesh(wall_mesh)
bm_wall.free()

wall_obj = bpy.data.objects.new("CoLoa_Wall_Arc", wall_mesh)
scene.collection.objects.link(wall_obj)
wall_obj.data.materials.append(mat_wall)
finish_object(wall_obj, kit_col)

# ═════════════════════════════════════════════════════════════════════════════
# 4. Sacred_Crossbow_Altar — bàn thờ 2.4×1×0.8m + Nỏ Thần Emission FFD700
# ═════════════════════════════════════════════════════════════════════════════
mat_altar = new_material("Mat_AltarWood", base_color=hex_to_rgba("5C3D1E"), metallic=0.05, roughness=0.8)
mat_crossbow = new_material("Mat_CrossbowGlow",
                            base_color=hex_to_rgba("FFD700"),
                            metallic=0.9,
                            roughness=0.2,
                            emission_color=hex_to_rgba("FFD700"),
                            emission_strength=3.5)

# Altar table
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.4), scale=(2.4, 1.0, 0.8))
altar_table = bpy.context.active_object
altar_table.data.materials.append(mat_altar)

# Crossbow limb
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.85), scale=(1.6, 0.08, 0.06))
cb_limb = bpy.context.active_object
cb_limb.data.materials.append(mat_crossbow)

# Crossbow stock
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.85), scale=(0.08, 0.6, 0.06))
cb_stock = bpy.context.active_object
cb_stock.data.materials.append(mat_crossbow)

altar_obj = join_objects(altar_table, [cb_limb, cb_stock])
altar_obj.name = "Sacred_Crossbow_Altar"
altar_obj.data.name = "Sacred_Crossbow_Altar_Mesh"
finish_object(altar_obj, kit_col)

# ═════════════════════════════════════════════════════════════════════════════
# 5. MipChau_Jade_Well — giếng bát giác + Orb Emission #00f5d4 intensity=4
# ═════════════════════════════════════════════════════════════════════════════
mat_well_stone = new_material("Mat_WellStone", base_color=hex_to_rgba("7A9E7E"), metallic=0.05, roughness=0.7)
mat_jade_orb = new_material("Mat_JadeOrb",
                            base_color=hex_to_rgba("00f5d4"),
                            metallic=0.2,
                            roughness=0.1,
                            emission_color=hex_to_rgba("00f5d4"),
                            emission_strength=4.0)

# Octagonal well body
bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=0.8, location=(0, 0, 0.4), vertices=8)
well_body = bpy.context.active_object
well_body.data.materials.append(mat_well_stone)

# Jade orb floating above
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(0, 0, 1.35), segments=16, ring_count=12)
jade_orb = bpy.context.active_object
jade_orb.data.materials.append(mat_jade_orb)

well_obj = join_objects(well_body, [jade_orb])
well_obj.name = "MipChau_Jade_Well"
well_obj.data.name = "MipChau_Jade_Well_Mesh"
finish_object(well_obj, kit_col)

# ═════════════════════════════════════════════════════════════════════════════
# 6. KimQuy_Turtle_Base — rùa vàng: thân+mai+chân+đầu, metallic=0.95
# ═════════════════════════════════════════════════════════════════════════════
mat_turtle = new_material("Mat_KimQuy", base_color=hex_to_rgba("D4AF37"), metallic=0.95, roughness=0.15)

# Turtle body
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(0, 0, 0.35), segments=20, ring_count=14)
t_body = bpy.context.active_object
t_body.scale = (1.0, 0.65, 0.35)
t_body.data.materials.append(mat_turtle)

# Turtle shell (carapace dome)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(0, 0, 0.48), segments=20, ring_count=14)
t_shell = bpy.context.active_object
t_shell.scale = (0.9, 0.58, 0.28)
t_shell.data.materials.append(mat_turtle)

# Head
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(1.1, 0, 0.42), segments=14, ring_count=10)
t_head = bpy.context.active_object
t_head.scale = (1.3, 0.9, 0.9)
t_head.data.materials.append(mat_turtle)

# 4 Legs
legs = []
for lx, ly in [(0.65, 0.5), (0.65, -0.5), (-0.65, 0.5), (-0.65, -0.5)]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(lx, ly, 0.15), scale=(0.32, 0.22, 0.25))
    leg = bpy.context.active_object
    leg.data.materials.append(mat_turtle)
    legs.append(leg)

# Apply transforms before join
deselect_all()
for part in [t_body, t_shell, t_head] + legs:
    part.select_set(True)
set_active(t_body)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

turtle_obj = join_objects(t_body, [t_shell, t_head] + legs)
turtle_obj.name = "KimQuy_Turtle_Base"
turtle_obj.data.name = "KimQuy_Turtle_Base_Mesh"
finish_object(turtle_obj, kit_col)

# ── EXPORT GLB WITH DRACO ────────────────────────────────────────────────────
out_dir = "D:/BaoTang3D/public/model"
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "coloa_kit.glb").replace("\\", "/")

# Also ensure public/models exists
alt_dir = "D:/BaoTang3D/public/models"
os.makedirs(alt_dir, exist_ok=True)

# Select all kit objects
deselect_all()
for obj in kit_col.objects:
    obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    export_draco_mesh_compression_enable=True,
    export_apply=True,
    use_active_collection=False,
)

# Mirror copy to public/models/
import shutil
shutil.copyfile(out_path, os.path.join(alt_dir, "coloa_kit.glb"))

print("=" * 60)
print(f"GLB export SUCCESS -> {out_path} ({os.path.getsize(out_path):,} bytes)")
print("Objects exported in CoLoa_Kit:")
for obj in kit_col.objects:
    print(f"  [x] {obj.name} ({len(obj.data.vertices)} vertices, {len(obj.data.polygons)} polygons)")
print("=" * 60)
