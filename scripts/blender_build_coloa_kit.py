"""
scripts/blender_build_coloa_kit.py
Blender Python (bpy) Masterpiece Asset Generator for An Dương Vương - Cổ Loa Kit
Generates public/model/coloa_kit.glb containing 6 AAA cultural heritage meshes:
  1. CoLoa_Portal_Gate
  2. DongSon_Drum_Pedestal
  3. CoLoa_Spiral_Walls
  4. Sacred_Crossbow_Altar
  5. MiChau_Jade_Well
  6. KimQuy_Golden_Turtle

Compatible with Blender 4.x and Blender 5.2+ LTS.
"""

import bpy
import bmesh
import mathutils
from mathutils import Vector, Matrix, Euler
import math
import os
import shutil

print("[BLENDER-KIT] Starting Cổ Loa 3D Asset Kit Generation...")

BASE_DIR = r"D:\BaoTang3D"
OUT_PATH_MODEL = os.path.join(BASE_DIR, "public", "model", "coloa_kit.glb")
OUT_PATH_MODELS = os.path.join(BASE_DIR, "public", "models", "coloa_kit.glb")
OUT_PATH_ROOT_MODEL = os.path.join(BASE_DIR, "model", "coloa_kit.glb")

os.makedirs(os.path.join(BASE_DIR, "public", "model"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "public", "models"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "model"), exist_ok=True)

# ---------------------------------------------------------------------------
# Scene Initialization
# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

kit_collection = bpy.data.collections.new("CoLoa_Kit_Collection")
scene.collection.children.link(kit_collection)

# ---------------------------------------------------------------------------
# Material Library
# ---------------------------------------------------------------------------
def hex_to_rgba(hex_str, alpha=1.0):
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return (r, g, b, alpha)

def create_pbr_material(name, base_color=(0.8, 0.8, 0.8, 1.0), metallic=0.0, roughness=0.5,
                        emission_color=None, emission_strength=0.0, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    if hasattr(mat, "use_nodes"):
        mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF") if nt else None
    if bsdf is None and nt:
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
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = transmission
    return mat

mat_thanhhoa_stone = create_pbr_material(
    "Mat_ThanhHoa_Stone",
    base_color=hex_to_rgba("4A5562"), # Thanh Hóa weathered slate blue-gray
    metallic=0.12,
    roughness=0.78
)

mat_mossy_rock = create_pbr_material(
    "Mat_Mossy_Rock",
    base_color=hex_to_rgba("3E4C41"), # Subtle ancient green mossy stone
    metallic=0.08,
    roughness=0.85
)

mat_ancient_roof = create_pbr_material(
    "Mat_Ancient_Roof_Tile",
    base_color=hex_to_rgba("7A3828"), # Ancient terracotta roof tile
    metallic=0.15,
    roughness=0.62
)

mat_dongson_bronze = create_pbr_material(
    "Mat_DongSon_Bronze",
    base_color=hex_to_rgba("B27838"), # Weathered Dong Son bronze
    metallic=0.88,
    roughness=0.32
)

mat_lim_wood = create_pbr_material(
    "Mat_Lim_Wood",
    base_color=hex_to_rgba("402315"), # Deep dark Vietnamese Lim ironwood
    metallic=0.05,
    roughness=0.72
)

mat_crossbow_gold_emission = create_pbr_material(
    "Mat_Golden_Claw_Emission",
    base_color=hex_to_rgba("FFD700"),
    metallic=0.92,
    roughness=0.18,
    emission_color=hex_to_rgba("FFD700"),
    emission_strength=3.5
)

mat_well_water = create_pbr_material(
    "Mat_Clear_Well_Water",
    base_color=hex_to_rgba("0A4E5C", alpha=0.85),
    metallic=0.25,
    roughness=0.08,
    transmission=0.92
)

mat_jade_pearl_emission = create_pbr_material(
    "Mat_Jade_Pearl_Emission",
    base_color=hex_to_rgba("00f5d4"),
    metallic=0.15,
    roughness=0.10,
    emission_color=hex_to_rgba("00f5d4"),
    emission_strength=4.0
)

mat_divine_turtle_gold = create_pbr_material(
    "Mat_Divine_Turtle_Gold",
    base_color=hex_to_rgba("D9A736"), # Sacred Kim Quy antique gold
    metallic=0.94,
    roughness=0.22,
    emission_color=hex_to_rgba("5E440B"),
    emission_strength=0.6
)

mat_wave_sea = create_pbr_material(
    "Mat_Sacred_Wave",
    base_color=hex_to_rgba("185A70", alpha=0.9),
    metallic=0.3,
    roughness=0.2,
    transmission=0.5
)

# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------
def set_active(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

def deselect_all():
    bpy.ops.object.select_all(action='DESELECT')

def join_mesh_parts(primary_obj, other_objs):
    deselect_all()
    for o in other_objs:
        o.select_set(True)
    set_active(primary_obj)
    bpy.ops.object.join()
    return primary_obj

def post_process_kit_mesh(obj, keep_xy_center=False):
    """
    Standardizes origin to bottom center (0,0,0), auto smooths, and smart UV unwraps.
    """
    deselect_all()
    set_active(obj)
    
    # 1. Apply all existing transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # 2. Offset vertices so min Z = 0, and (unless keep_xy_center=True) center X/Y at 0
    verts = obj.data.vertices
    if len(verts) > 0:
        min_z = min(v.co.z for v in verts)
        min_x = min(v.co.x for v in verts)
        max_x = max(v.co.x for v in verts)
        min_y = min(v.co.y for v in verts)
        max_y = max(v.co.y for v in verts)
        
        offset_x = (min_x + max_x) / 2.0 if not keep_xy_center else 0.0
        offset_y = (min_y + max_y) / 2.0 if not keep_xy_center else 0.0
        offset_z = min_z
        
        for v in verts:
            v.co.x -= offset_x
            v.co.y -= offset_y
            v.co.z -= offset_z
            
        obj.location = (0, 0, 0)
        obj.data.update()
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # 3. Shade Auto Smooth
    try:
        bpy.ops.object.shade_auto_smooth()
    except Exception:
        bpy.ops.object.shade_smooth()
        
    # 4. Smart UV Project
    try:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
        bpy.ops.object.mode_set(mode='OBJECT')
    except Exception as e:
        print(f"[BLENDER-KIT] UV unwrap note for {obj.name}: {e}")
        
    deselect_all()
    print(f"[BLENDER-KIT] Processed {obj.name}: {len(obj.data.vertices)} verts, {len(obj.data.polygons)} polys")

# ===========================================================================
# 1. CoLoa_Portal_Gate
# Cổng thành đá xanh Thanh Hóa rêu phong rộng 4.2m thông thủy, mái đao cổ đại,
# 2 trụ cổng chạm nổi hoa văn chim Lạc / Kim Quy.
# ===========================================================================
print("[BLENDER-KIT] Building 1/6: CoLoa_Portal_Gate...")
gate_parts = []

# Clear opening is 4.2m -> Inner faces at x = -2.1 and x = +2.1.
# Pillar width = 0.8m x 0.8m -> centers at x = -2.5 and x = +2.5.
pillar_x_dist = 2.5
pillar_w = 0.8
pillar_h = 5.2

for sx in [-pillar_x_dist, pillar_x_dist]:
    # Base pedestal (Bệ tảng chân cột hoa sen chạm khắc)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, 0, 0.35), scale=(1.2, 1.2, 0.7))
    b_ped = bpy.context.active_object
    b_ped.data.materials.append(mat_mossy_rock)
    gate_parts.append(b_ped)
    
    # Stepped upper plinth
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, 0, 0.8), scale=(1.0, 1.0, 0.2))
    b_step = bpy.context.active_object
    b_step.data.materials.append(mat_thanhhoa_stone)
    gate_parts.append(b_step)
    
    # Main stone pillar shaft
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, 0, 2.9), scale=(pillar_w, pillar_w, 4.0))
    p_shaft = bpy.context.active_object
    p_shaft.data.materials.append(mat_thanhhoa_stone)
    gate_parts.append(p_shaft)
    
    # Carved Relief Panels on front (+Y and -Y) of pillars (Chim Lạc / Kim Quy motifs)
    for sign_y in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(sx, sign_y * (pillar_w/2 + 0.03), 2.9),
            scale=(0.55, 0.05, 3.0)
        )
        relief = bpy.context.active_object
        relief.data.materials.append(mat_dongson_bronze)
        gate_parts.append(relief)
        
        # Bronze relief icon (Chim Lạc emblem)
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.22,
            depth=0.06,
            location=(sx, sign_y * (pillar_w/2 + 0.06), 4.1),
            rotation=(math.pi/2, 0, 0)
        )
        icon1 = bpy.context.active_object
        icon1.data.materials.append(mat_dongson_bronze)
        gate_parts.append(icon1)
        
        # Kim Quy bronze emblem lower down
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.20,
            depth=0.06,
            location=(sx, sign_y * (pillar_w/2 + 0.06), 1.8),
            rotation=(math.pi/2, 0, 0)
        )
        icon2 = bpy.context.active_object
        icon2.data.materials.append(mat_dongson_bronze)
        gate_parts.append(icon2)
        
    # Pillar capital bracket (Đầu cột đón đỡ xà ngang)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, 0, 5.05), scale=(1.1, 1.1, 0.3))
    cap = bpy.context.active_object
    cap.data.materials.append(mat_thanhhoa_stone)
    gate_parts.append(cap)

# Massive Stone Architrave / Lintel (Xà ngang cổng thành)
# Inner span is 4.2m; total beam length = 6.0m
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 5.3), scale=(6.2, 0.95, 0.6))
lintel = bpy.context.active_object
lintel.data.materials.append(mat_thanhhoa_stone)
gate_parts.append(lintel)

# Inscription Tablet / Relief frieze: CỔ LOA THÀNH in bronze relief on lintel
for sign_y in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0, sign_y * 0.49, 5.3),
        scale=(2.6, 0.06, 0.38)
    )
    tablet = bpy.context.active_object
    tablet.data.materials.append(mat_dongson_bronze)
    gate_parts.append(tablet)

# Timber Brackets (Đấu củng kép đỡ mái đao)
for bx in [-2.5, -1.25, 0.0, 1.25, 2.5]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(bx, 0, 5.75), scale=(0.35, 1.4, 0.35))
    bracket = bpy.context.active_object
    bracket.data.materials.append(mat_lim_wood)
    gate_parts.append(bracket)

# Curved Ancient Roof (Mái đao cổ đại cong vút 4 góc)
# Slices creating upward curve towards the 4 corner eaves
roof_segments = 15
roof_span = 7.4
roof_depth = 2.8
for i in range(roof_segments):
    t = (i / (roof_segments - 1)) - 0.5 # -0.5 to 0.5
    rx = t * roof_span
    # Parabolic sweep upwards at both ends for authentic Vietnamese curved eaves
    rz = 6.2 + 0.95 * (2.0 * t)**2
    # Slight tilt and depth
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(rx, 0, rz),
        scale=(roof_span / roof_segments + 0.1, roof_depth * (1.0 - 0.2 * abs(t)), 0.32)
    )
    r_slice = bpy.context.active_object
    r_slice.data.materials.append(mat_ancient_roof)
    gate_parts.append(r_slice)

# Central Ridge (Bờ nóc mái) & Ridge Finials (Kìm nóc đầu rồng/chim Lạc)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 6.45), scale=(5.4, 0.4, 0.35))
ridge = bpy.context.active_object
ridge.data.materials.append(mat_ancient_roof)
gate_parts.append(ridge)

# 4 Corner Eaves (Đao mái cong vút)
for ex in [-3.5, 3.5]:
    for ey in [-1.2, 1.2]:
        bpy.ops.mesh.primitive_cone_add(
            radius1=0.25,
            radius2=0.02,
            depth=1.1,
            location=(ex, ey, 7.3),
            rotation=(0.4 * (1 if ey < 0 else -1), 0.6 * (1 if ex < 0 else -1), 0)
        )
        finial = bpy.context.active_object
        finial.data.materials.append(mat_dongson_bronze)
        gate_parts.append(finial)

# Central Bronze Sun Talisman on ridge top
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.45,
    depth=0.15,
    location=(0, 0, 6.75),
    rotation=(math.pi/2, 0, 0)
)
talisman = bpy.context.active_object
talisman.data.materials.append(mat_dongson_bronze)
gate_parts.append(talisman)

# Join all into single object CoLoa_Portal_Gate
gate_root = gate_parts[0]
obj_gate = join_mesh_parts(gate_root, gate_parts[1:])
obj_gate.name = "CoLoa_Portal_Gate"
obj_gate.data.name = "CoLoa_Portal_Gate_Mesh"
kit_collection.objects.link(obj_gate)
post_process_kit_mesh(obj_gate, keep_xy_center=False)


# ===========================================================================
# 2. DongSon_Drum_Pedestal
# Bệ đá 3 tầng chạm nổi hoa văn mặt trời 14 tia, chim Lạc và thuyền chiến.
# ===========================================================================
print("[BLENDER-KIT] Building 2/6: DongSon_Drum_Pedestal...")
ped_parts = []

# Tầng 1: Bệ đá bậc hạ (R=2.2m, H=0.45m, chạm hoa sen cánh nổi)
bpy.ops.mesh.primitive_cylinder_add(
    radius=2.25,
    depth=0.45,
    location=(0, 0, 0.225),
    vertices=36
)
t1 = bpy.context.active_object
t1.data.materials.append(mat_thanhhoa_stone)
ped_parts.append(t1)

# Stepped collar between Tier 1 & 2
bpy.ops.mesh.primitive_cylinder_add(
    radius=2.0,
    depth=0.10,
    location=(0, 0, 0.50),
    vertices=36
)
t1_collar = bpy.context.active_object
t1_collar.data.materials.append(mat_mossy_rock)
ped_parts.append(t1_collar)

# Tầng 2: Thân bệ eo thắt chạm nổi phù điêu thuyền chiến Đông Sơn (R=1.75m, H=0.45m)
bpy.ops.mesh.primitive_cone_add(
    radius1=1.9,
    radius2=1.65,
    depth=0.45,
    location=(0, 0, 0.775),
    vertices=36
)
t2 = bpy.context.active_object
t2.data.materials.append(mat_thanhhoa_stone)
ped_parts.append(t2)

# Frieze of 6 Dong Son Warrior Boats (Thuyền chiến Đông Sơn) along circumference
num_boats = 6
for bi in range(num_boats):
    angle = (bi / num_boats) * math.pi * 2
    bx = math.cos(angle) * 1.78
    by = math.sin(angle) * 1.78
    # Crescent boat hull
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(bx, by, 0.775),
        scale=(0.95, 0.12, 0.22),
        rotation=(0, 0, angle + math.pi/2)
    )
    boat = bpy.context.active_object
    boat.data.materials.append(mat_dongson_bronze)
    ped_parts.append(boat)
    
    # Warrior with feather headdress on boat
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.08,
        radius2=0.01,
        depth=0.22,
        location=(bx, by, 0.92),
        rotation=(0, 0, angle)
    )
    warrior = bpy.context.active_object
    warrior.data.materials.append(mat_dongson_bronze)
    ped_parts.append(warrior)

# Tầng 3: Mặt trống đồng Đông Sơn (R=1.45m, H=0.35m)
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.52,
    depth=0.35,
    location=(0, 0, 1.175),
    vertices=36
)
t3 = bpy.context.active_object
t3.data.materials.append(mat_dongson_bronze)
ped_parts.append(t3)

# 4 Bronze rope-twist handles (Quai bện thừng đôi)
for hi in range(4):
    hang = hi * (math.pi / 2)
    hx = math.cos(hang) * 1.50
    hy = math.sin(hang) * 1.50
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.18,
        minor_radius=0.04,
        location=(hx, hy, 1.175),
        rotation=(0, math.pi/2, hang)
    )
    handle = bpy.context.active_object
    handle.data.materials.append(mat_dongson_bronze)
    ped_parts.append(handle)

# Mặt trống đồng: Mặt trời 14 tia ở trung tâm
# Center sun hub
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.28,
    depth=0.05,
    location=(0, 0, 1.36),
    vertices=24
)
sun_hub = bpy.context.active_object
sun_hub.data.materials.append(mat_dongson_bronze)
ped_parts.append(sun_hub)

# 14 acute rays (Mặt trời 14 tia nổi)
sun_rays = 14
for ri in range(sun_rays):
    ray_ang = (ri / sun_rays) * math.pi * 2
    rx = math.cos(ray_ang) * 0.42
    ry = math.sin(ray_ang) * 0.42
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.07,
        radius2=0.005,
        depth=0.32,
        location=(rx, ry, 1.36),
        rotation=(math.pi/2, 0, -ray_ang - math.pi/2)
    )
    ray = bpy.context.active_object
    ray.data.materials.append(mat_dongson_bronze)
    ped_parts.append(ray)

# Concentric ring with 12 Flying Lac Birds (Vòng tròn chim Lạc bay)
num_birds = 12
bird_radius = 0.95
for bi in range(num_birds):
    bang = (bi / num_birds) * math.pi * 2
    bx = math.cos(bang) * bird_radius
    by = math.sin(bang) * bird_radius
    # Bird body & sweeping wings
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(bx, by, 1.36),
        scale=(0.32, 0.08, 0.03),
        rotation=(0, 0, bang + math.pi/2)
    )
    bird = bpy.context.active_object
    bird.data.materials.append(mat_dongson_bronze)
    ped_parts.append(bird)

# Outer concentric decorative corded ring
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.35,
    minor_radius=0.025,
    location=(0, 0, 1.36)
)
cord_ring = bpy.context.active_object
cord_ring.data.materials.append(mat_dongson_bronze)
ped_parts.append(cord_ring)

# Join into DongSon_Drum_Pedestal
ped_root = ped_parts[0]
obj_ped = join_mesh_parts(ped_root, ped_parts[1:])
obj_ped.name = "DongSon_Drum_Pedestal"
obj_ped.data.name = "DongSon_Drum_Pedestal_Mesh"
kit_collection.objects.link(obj_ped)
post_process_kit_mesh(obj_ped, keep_xy_center=False)


# ===========================================================================
# 3. CoLoa_Spiral_Walls
# Tường đá uốn lượn 3 vòng xoắn ốc Archimedes (Loa Thành) với khoảng cách thông thủy 3.5m.
# ===========================================================================
print("[BLENDER-KIT] Building 3/6: CoLoa_Spiral_Walls...")
mesh_wall = bpy.data.meshes.new("CoLoa_Spiral_Walls_Mesh")
obj_wall = bpy.data.objects.new("CoLoa_Spiral_Walls", mesh_wall)
kit_collection.objects.link(obj_wall)

bm_wall = bmesh.new()

# Archimedean spiral parameters:
# r = a + b * theta.
# Clearance between successive rings = 3.5m. Wall thickness = 0.7m.
# => radial step per 2*pi turn = 3.5 + 0.7 = 4.2m.
# b = 4.2 / (2 * pi)
a_inner = 3.8
b_spiral = 4.2 / (2.0 * math.pi)
wall_height = 2.6
wall_thickness = 0.7

total_turns = 3.0
points_per_turn = 48
total_pts = int(total_turns * points_per_turn)

prev_quad = None
# Build continuous ribbon wall with battlements
for i in range(total_pts + 1):
    theta = (i / points_per_turn) * (2.0 * math.pi)
    r = a_inner + b_spiral * theta
    
    cx = math.cos(theta) * r
    cy = math.sin(theta) * r
    
    # Radial unit vector (normal to wall path)
    nx = math.cos(theta)
    ny = math.sin(theta)
    
    # Battlement crenellations: alternate raised merlons
    h_extra = 0.35 if (i % 4 < 2) else 0.0
    h = wall_height + h_extra
    
    # 4 vertices per cross section
    v_b_in = bm_wall.verts.new((cx - nx * wall_thickness/2, cy - ny * wall_thickness/2, 0.0))
    v_b_out = bm_wall.verts.new((cx + nx * wall_thickness/2, cy + ny * wall_thickness/2, 0.0))
    v_t_out = bm_wall.verts.new((cx + nx * wall_thickness/2, cy + ny * wall_thickness/2, h))
    v_t_in = bm_wall.verts.new((cx - nx * wall_thickness/2, cy - ny * wall_thickness/2, h))
    
    if prev_quad is not None:
        p_b_in, p_b_out, p_t_out, p_t_in = prev_quad
        # Bottom face
        bm_wall.faces.new((p_b_in, p_b_out, v_b_out, v_b_in))
        # Outer face
        bm_wall.faces.new((p_b_out, p_t_out, v_t_out, v_b_out))
        # Top face
        bm_wall.faces.new((p_t_out, p_t_in, v_t_in, v_t_out))
        # Inner face
        bm_wall.faces.new((p_t_in, p_b_in, v_b_in, v_t_in))
        
    prev_quad = (v_b_in, v_b_out, v_t_out, v_t_in)

bm_wall.to_mesh(mesh_wall)
bm_wall.free()
obj_wall.data.materials.append(mat_thanhhoa_stone)
obj_wall.data.materials.append(mat_mossy_rock)
# For the spiral citadel, we keep (0,0) as the radial center of the Archimedean spiral
post_process_kit_mesh(obj_wall, keep_xy_center=True)


# ===========================================================================
# 4. Sacred_Crossbow_Altar
# Án thờ gỗ lim chạm khắc + Nỏ Thần Liên Châu (Linh Quang Kim Quy Thần Cơ) đồng cổ
# có lẫy vuốt Rùa Vàng phát sáng Emission vàng kim + giá binh khí (mũi tên đồng Cổ Loa 3 cạnh, giáo, rìu lưỡi xéo).
# ===========================================================================
print("[BLENDER-KIT] Building 4/6: Sacred_Crossbow_Altar...")
altar_parts = []

# --- A. Án Thờ Gỗ Lim ---
# Main tabletop: 2.4m x 1.1m x 0.12m at z=0.98m
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 0.98),
    scale=(2.4, 1.1, 0.12)
)
tabletop = bpy.context.active_object
tabletop.data.materials.append(mat_lim_wood)
altar_parts.append(tabletop)

# Raised border lip around table top (Vành gờ mặt án thờ)
for sign_y in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0, sign_y * 0.53, 1.06),
        scale=(2.4, 0.05, 0.06)
    )
    lip_y = bpy.context.active_object
    lip_y.data.materials.append(mat_lim_wood)
    altar_parts.append(lip_y)

for sign_x in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(sign_x * 1.18, 0, 1.06),
        scale=(0.05, 1.1, 0.06)
    )
    lip_x = bpy.context.active_object
    lip_x.data.materials.append(mat_lim_wood)
    altar_parts.append(lip_x)

# Carved Apron (Dạ yếm án thờ chạm khắc rủ xuống)
for sign_y in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0, sign_y * 0.48, 0.85),
        scale=(2.1, 0.06, 0.16)
    )
    apron = bpy.context.active_object
    apron.data.materials.append(mat_lim_wood)
    altar_parts.append(apron)

# 4 Massive Carved Table Legs (Chân án thờ móng rồng lượn)
leg_coords = [(-0.95, -0.42), (-0.95, 0.42), (0.95, -0.42), (0.95, 0.42)]
for lx, ly in leg_coords:
    # Leg upper column
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(lx, ly, 0.48),
        scale=(0.16, 0.16, 0.90)
    )
    leg = bpy.context.active_object
    leg.data.materials.append(mat_lim_wood)
    altar_parts.append(leg)
    # Leg foot (chân móng vuốt)
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(lx, ly, 0.08),
        scale=(0.24, 0.24, 0.16)
    )
    foot = bpy.context.active_object
    foot.data.materials.append(mat_dongson_bronze)
    altar_parts.append(foot)

# Lower Stretcher Shelf (Đợt giằng ngang)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 0.25),
    scale=(2.0, 0.85, 0.06)
)
stretcher = bpy.context.active_object
stretcher.data.materials.append(mat_lim_wood)
altar_parts.append(stretcher)

# --- B. Nỏ Thần Liên Châu (Linh Quang Kim Quy Thần Cơ) ---
# Crossbow rest cushion / bronze stand
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 1.08),
    scale=(1.4, 0.35, 0.08)
)
cb_stand = bpy.context.active_object
cb_stand.data.materials.append(mat_lim_wood)
altar_parts.append(cb_stand)

# Nỏ Thần: Thân nỏ (Stock) bằng đồng cổ dài 1.6m có rãnh liên châu
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 1.18),
    scale=(0.14, 1.55, 0.12)
)
cb_stock = bpy.context.active_object
cb_stock.data.materials.append(mat_dongson_bronze)
altar_parts.append(cb_stock)

# Nỏ Thần: Cánh nỏ đôi cong vút bằng đồng viền sừng (Front limbs)
for side in [-1, 1]:
    # Sweeping curved arm segment 1
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(side * 0.45, 0.65, 1.20),
        scale=(0.85, 0.10, 0.09),
        rotation=(0, side * 0.12, side * 0.25)
    )
    limb1 = bpy.context.active_object
    limb1.data.materials.append(mat_dongson_bronze)
    altar_parts.append(limb1)
    # Sweeping curved arm tip
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.06,
        radius2=0.015,
        depth=0.55,
        location=(side * 0.95, 0.78, 1.25),
        rotation=(side * 0.2, math.pi/2, 0)
    )
    limb_tip = bpy.context.active_object
    limb_tip.data.materials.append(mat_dongson_bronze)
    altar_parts.append(limb_tip)

# Dây nỏ đồng căng ngang
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.012,
    depth=1.85,
    location=(0, 0.62, 1.22),
    rotation=(0, math.pi/2, 0)
)
bowstring = bpy.context.active_object
bowstring.data.materials.append(mat_dongson_bronze)
altar_parts.append(bowstring)

# Lẫy nỏ vuốt Thần Kim Quy (Divine Golden Turtle Claw Trigger)
# Emits divine golden luminescence (#FFD700)
bpy.ops.mesh.primitive_cone_add(
    radius1=0.07,
    radius2=0.008,
    depth=0.35,
    location=(0, -0.12, 1.38),
    rotation=(math.pi/5, 0, 0)
)
claw_trigger = bpy.context.active_object
claw_trigger.data.materials.append(mat_crossbow_gold_emission)
altar_parts.append(claw_trigger)

# 2 side talon spurs on the trigger
for sign_x in [-1, 1]:
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.035,
        radius2=0.005,
        depth=0.18,
        location=(sign_x * 0.06, -0.10, 1.35),
        rotation=(math.pi/4, sign_x * 0.35, 0)
    )
    spur = bpy.context.active_object
    spur.data.materials.append(mat_crossbow_gold_emission)
    altar_parts.append(spur)

# --- C. Giá Binh Khí (Mũi tên đồng Cổ Loa 3 cạnh, Giáo, Rìu lưỡi xéo) ---
# Weapon Rack Left: Bó mũi tên đồng 3 cạnh Cổ Loa trong ống đựng
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.12,
    depth=0.55,
    location=(-0.85, 0, 1.30)
)
quiver = bpy.context.active_object
quiver.data.materials.append(mat_dongson_bronze)
altar_parts.append(quiver)

# 5 Three-bladed bronze arrows (Mũi tên đồng Cổ Loa 3 cạnh)
for ai in range(5):
    aang = (ai / 5) * math.pi * 2
    ax = -0.85 + math.cos(aang) * 0.06
    ay = math.sin(aang) * 0.06
    # Arrow shaft
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.010,
        depth=0.75,
        location=(ax, ay, 1.60)
    )
    shaft = bpy.context.active_object
    shaft.data.materials.append(mat_lim_wood)
    altar_parts.append(shaft)
    # 3-bladed triangular bronze arrowhead
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.035,
        radius2=0.002,
        depth=0.14,
        location=(ax, ay, 1.95),
        vertices=3
    )
    tip = bpy.context.active_object
    tip.data.materials.append(mat_dongson_bronze)
    altar_parts.append(tip)

# Weapon Rack Right: Giáo Đông Sơn & Rìu lưỡi xéo
# Rack stand
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0.85, 0, 1.30),
    scale=(0.25, 0.45, 0.50)
)
rack_stand = bpy.context.active_object
rack_stand.data.materials.append(mat_lim_wood)
altar_parts.append(rack_stand)

# Ancient Spear (Giáo búp đa Đông Sơn)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.022,
    depth=1.85,
    location=(0.80, -0.10, 1.85)
)
spear_shaft = bpy.context.active_object
spear_shaft.data.materials.append(mat_lim_wood)
altar_parts.append(spear_shaft)

bpy.ops.mesh.primitive_cone_add(
    radius1=0.06,
    radius2=0.005,
    depth=0.38,
    location=(0.80, -0.10, 2.75)
)
spear_head = bpy.context.active_object
spear_head.data.materials.append(mat_dongson_bronze)
altar_parts.append(spear_head)

# Boot-shaped Bronze Axe (Rìu lưỡi xéo Đông Sơn)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.022,
    depth=1.20,
    location=(0.88, 0.10, 1.55)
)
axe_handle = bpy.context.active_object
axe_handle.data.materials.append(mat_lim_wood)
altar_parts.append(axe_handle)

bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0.88, 0.22, 2.05),
    scale=(0.04, 0.24, 0.16)
)
axe_blade = bpy.context.active_object
axe_blade.data.materials.append(mat_dongson_bronze)
altar_parts.append(axe_blade)

# Join all into Sacred_Crossbow_Altar
altar_root = altar_parts[0]
obj_altar = join_mesh_parts(altar_root, altar_parts[1:])
obj_altar.name = "Sacred_Crossbow_Altar"
obj_altar.data.name = "Sacred_Crossbow_Altar_Mesh"
kit_collection.objects.link(obj_altar)
post_process_kit_mesh(obj_altar, keep_xy_center=False)


# ===========================================================================
# 5. MiChau_Jade_Well
# Giếng đá cổ bát giác, mặt nước trong suốt, viên Minh Châu phát sáng ngọc bích (#00f5d4).
# ===========================================================================
print("[BLENDER-KIT] Building 5/6: MiChau_Jade_Well...")
well_parts = []

# Octagonal Base Apron (Bệ thềm đá bát giác bao quanh)
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.85,
    depth=0.20,
    location=(0, 0, 0.10),
    vertices=8
)
well_apron = bpy.context.active_object
well_apron.data.materials.append(mat_mossy_rock)
well_parts.append(well_apron)

# Octagonal Well Body (Thành giếng đá cổ bát giác)
# Outer octagonal wall
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.45,
    depth=0.95,
    location=(0, 0, 0.575),
    vertices=8
)
well_body = bpy.context.active_object
well_body.data.materials.append(mat_thanhhoa_stone)
well_parts.append(well_body)

# Inner void cylinder (cavity)
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.05,
    depth=0.98,
    location=(0, 0, 0.60),
    vertices=16
)
inner_cavity = bpy.context.active_object
inner_cavity.data.materials.append(mat_thanhhoa_stone)
well_parts.append(inner_cavity)

# 8 Corner Lotus Bud Stone Finials (Búp sen đá ở 8 góc giếng)
for i in range(8):
    ang = (i / 8.0) * math.pi * 2
    cx = math.cos(ang) * 1.42
    cy = math.sin(ang) * 1.42
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.08,
        radius2=0.01,
        depth=0.22,
        location=(cx, cy, 1.15)
    )
    lotus_bud = bpy.context.active_object
    lotus_bud.data.materials.append(mat_thanhhoa_stone)
    well_parts.append(lotus_bud)

# Well Coping Ring (Vành miệng giếng bo tròn)
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.25,
    minor_radius=0.10,
    location=(0, 0, 1.05)
)
coping = bpy.context.active_object
coping.data.materials.append(mat_thanhhoa_stone)
well_parts.append(coping)

# Clear Water Surface (Mặt nước giếng trong suốt phản chiếu)
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.02,
    depth=0.05,
    location=(0, 0, 0.55),
    vertices=24
)
water = bpy.context.active_object
water.data.materials.append(mat_well_water)
well_parts.append(water)

# Hovering Divine Jade Pearl (Viên Minh Châu phát sáng ngọc bích #00f5d4)
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=0.22,
    location=(0, 0, 1.25),
    segments=24,
    ring_count=16
)
pearl = bpy.context.active_object
pearl.data.materials.append(mat_jade_pearl_emission)
well_parts.append(pearl)

# Concentric Jade Halo Ring around the pearl
bpy.ops.mesh.primitive_torus_add(
    major_radius=0.38,
    minor_radius=0.02,
    location=(0, 0, 1.25),
    rotation=(math.pi/6, math.pi/4, 0)
)
halo = bpy.context.active_object
halo.data.materials.append(mat_jade_pearl_emission)
well_parts.append(halo)

# 4 Floating Jade Droplets orbiting the pearl
for di in range(4):
    dang = (di / 4.0) * math.pi * 2
    dx = math.cos(dang) * 0.42
    dy = math.sin(dang) * 0.42
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.045,
        location=(dx, dy, 1.25 + 0.08 * math.sin(di)),
        segments=12,
        ring_count=8
    )
    droplet = bpy.context.active_object
    droplet.data.materials.append(mat_jade_pearl_emission)
    well_parts.append(droplet)

# Join into MiChau_Jade_Well
well_root = well_parts[0]
obj_well = join_mesh_parts(well_root, well_parts[1:])
obj_well.name = "MiChau_Jade_Well"
obj_well.data.name = "MiChau_Jade_Well_Mesh"
kit_collection.objects.link(obj_well)
post_process_kit_mesh(obj_well, keep_xy_center=False)


# ===========================================================================
# 6. KimQuy_Golden_Turtle
# Tượng Thần Kim Quy uy nghiêm nổi trên sóng nước.
# ===========================================================================
print("[BLENDER-KIT] Building 6/6: KimQuy_Golden_Turtle...")
turtle_parts = []

# Sculpted Wave Surge Base (Sóng biển thần linh cuộn trào)
# Multi-tiered stylized waves
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.85,
    depth=0.25,
    location=(0, 0, 0.125),
    vertices=28
)
wave_base = bpy.context.active_object
wave_base.data.materials.append(mat_wave_sea)
turtle_parts.append(wave_base)

# Wave crest scrolls (Cuộn sóng nổi xung quanh)
num_waves = 8
for wi in range(num_waves):
    wang = (wi / num_waves) * math.pi * 2
    wx = math.cos(wang) * 1.55
    wy = math.sin(wang) * 1.55
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.28,
        radius2=0.04,
        depth=0.45,
        location=(wx, wy, 0.32),
        rotation=(0.4, 0, wang + math.pi/2)
    )
    wave_crest = bpy.context.active_object
    wave_crest.data.materials.append(mat_wave_sea)
    turtle_parts.append(wave_crest)

# Main Turtle Body Plinth
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=1.1,
    location=(0, 0, 0.42),
    segments=24,
    ring_count=16
)
t_body = bpy.context.active_object
t_body.scale = (1.2, 0.9, 0.35)
t_body.data.materials.append(mat_divine_turtle_gold)
turtle_parts.append(t_body)

# High Domed Carapace (Mai Rùa Vàng Thần Kim Quy)
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=1.05,
    location=(0, 0, 0.58),
    segments=28,
    ring_count=20
)
carapace = bpy.context.active_object
carapace.scale = (1.15, 0.82, 0.48)
carapace.data.materials.append(mat_divine_turtle_gold)
turtle_parts.append(carapace)

# Carapace Scute Ridges (Hoa văn tấm mai rùa thần)
for s_row in [-0.35, 0.0, 0.35]:
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.22,
        depth=0.08,
        location=(s_row, 0, 0.92),
        vertices=6
    )
    scute = bpy.context.active_object
    scute.data.materials.append(mat_divine_turtle_gold)
    turtle_parts.append(scute)

# Carapace Rim / Skirt (Vành mai rùa chạm viền sóng)
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.12,
    minor_radius=0.08,
    location=(0, 0, 0.46)
)
rim = bpy.context.active_object
rim.scale = (1.12, 0.85, 0.8)
rim.data.materials.append(mat_divine_turtle_gold)
turtle_parts.append(rim)

# Dignified Head & Majestic Neck (Đầu Rùa Thần ngẩng cao)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.18,
    depth=0.65,
    location=(1.25, 0, 0.68),
    rotation=(0, math.pi/4, 0),
    vertices=16
)
neck = bpy.context.active_object
neck.data.materials.append(mat_divine_turtle_gold)
turtle_parts.append(neck)

bpy.ops.mesh.primitive_uv_sphere_add(
    radius=0.32,
    location=(1.58, 0, 0.95),
    segments=18,
    ring_count=12
)
head = bpy.context.active_object
head.scale = (1.3, 0.85, 0.85)
head.data.materials.append(mat_divine_turtle_gold)
turtle_parts.append(head)

# Dragon-Turtle Crest / Horns on head (Sừng rồng trên đầu Rùa Vàng)
bpy.ops.mesh.primitive_cone_add(
    radius1=0.08,
    radius2=0.01,
    depth=0.38,
    location=(1.65, 0, 1.25),
    rotation=(0, -math.pi/6, 0)
)
horn = bpy.context.active_object
horn.data.materials.append(mat_divine_turtle_gold)
turtle_parts.append(horn)

# Divine Whiskers (Râu Rùa Thần)
for sign_y in [-1, 1]:
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.03,
        radius2=0.005,
        depth=0.28,
        location=(1.82, sign_y * 0.14, 0.88),
        rotation=(0, math.pi/3, sign_y * 0.4)
    )
    whisker = bpy.context.active_object
    whisker.data.materials.append(mat_divine_turtle_gold)
    turtle_parts.append(whisker)

# 4 Powerful Swimming Flippers (Bốn chân bơi uy mãnh gác sóng)
flipper_positions = [
    (0.75, 0.85, 0.35, 0.5),
    (0.75, -0.85, 0.35, -0.5),
    (-0.75, 0.80, 0.32, 1.1),
    (-0.75, -0.80, 0.32, -1.1),
]
for fx, fy, fz, f_rot in flipper_positions:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(fx, fy, fz),
        scale=(0.65, 0.35, 0.12),
        rotation=(0, 0, f_rot)
    )
    flipper = bpy.context.active_object
    flipper.data.materials.append(mat_divine_turtle_gold)
    turtle_parts.append(flipper)
    
    # Claws on flipper tip (Móng rùa vàng)
    for ci in [-0.08, 0, 0.08]:
        bpy.ops.mesh.primitive_cone_add(
            radius1=0.035,
            radius2=0.005,
            depth=0.15,
            location=(fx + math.cos(f_rot)*0.35 + math.sin(f_rot)*ci,
                      fy + math.sin(f_rot)*0.35 - math.cos(f_rot)*ci,
                      fz),
            rotation=(0, math.pi/2, f_rot)
        )
        claw = bpy.context.active_object
        claw.data.materials.append(mat_divine_turtle_gold)
        turtle_parts.append(claw)

# Auspicious Tail (Đuôi rùa cuộn mây)
bpy.ops.mesh.primitive_cone_add(
    radius1=0.12,
    radius2=0.015,
    depth=0.55,
    location=(-1.35, 0, 0.38),
    rotation=(0, -math.pi/2, 0)
)
tail = bpy.context.active_object
tail.data.materials.append(mat_divine_turtle_gold)
turtle_parts.append(tail)

# Join into KimQuy_Golden_Turtle
turtle_root = turtle_parts[0]
obj_turtle = join_mesh_parts(turtle_root, turtle_parts[1:])
obj_turtle.name = "KimQuy_Golden_Turtle"
obj_turtle.data.name = "KimQuy_Golden_Turtle_Mesh"
kit_collection.objects.link(obj_turtle)
post_process_kit_mesh(obj_turtle, keep_xy_center=False)


# ===========================================================================
# Verification & Export
# ===========================================================================
all_kit_objects = [
    obj_gate,
    obj_ped,
    obj_wall,
    obj_altar,
    obj_well,
    obj_turtle
]

print("=" * 70)
print("[BLENDER-KIT] Verifying all 6 meshes in kit:")
for obj in all_kit_objects:
    verts = obj.data.vertices
    polys = obj.data.polygons
    min_z = min(v.co.z for v in verts)
    max_z = max(v.co.z for v in verts)
    print(f"  * {obj.name:<25} | {len(verts):>6} verts | {len(polys):>6} polys | Z: [{min_z:.3f}, {max_z:.3f}]")
print("=" * 70)

# Select only the 6 kit objects for export
deselect_all()
for obj in all_kit_objects:
    obj.select_set(True)

print(f"[BLENDER-KIT] Exporting GLB with Draco compression -> {OUT_PATH_MODEL}")
bpy.ops.export_scene.gltf(
    filepath=OUT_PATH_MODEL,
    export_format='GLB',
    use_selection=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_materials='EXPORT',
    export_apply=True
)

file_size_bytes = os.path.getsize(OUT_PATH_MODEL)
file_size_mb = file_size_bytes / (1024 * 1024)
print(f"[BLENDER-KIT] Exported successfully: {file_size_bytes:,} bytes ({file_size_mb:.2f} MB)")

if file_size_mb >= 5.0:
    print(f"[BLENDER-KIT] WARNING: File size {file_size_mb:.2f} MB exceeds 5 MB target!")
else:
    print(f"[BLENDER-KIT] SUCCESS: File size {file_size_mb:.2f} MB is well under 5 MB threshold!")

# Synchronize / mirror copy to public/models/ and model/
shutil.copyfile(OUT_PATH_MODEL, OUT_PATH_MODELS)
shutil.copyfile(OUT_PATH_MODEL, OUT_PATH_ROOT_MODEL)
print(f"[BLENDER-KIT] Mirrored copy to {OUT_PATH_MODELS}")
print(f"[BLENDER-KIT] Mirrored copy to {OUT_PATH_ROOT_MODEL}")

print("[BLENDER-KIT] All steps completed successfully!")
