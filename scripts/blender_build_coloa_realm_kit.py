"""
scripts/blender_build_coloa_realm_kit.py
Blender Python (bpy) Masterpiece Asset Generator for Cổ Loa Open-World Realm (240m x 240m)
Generates public/model/coloa_realm_kit.glb containing 6 AAA architectural & landscape modular assets:
  1. Spiral_Citadel_Ramparts
  2. Arch_Wooden_Bridge
  3. Imperial_Pavilion_Hall
  4. SouthGate_Bastion_NoThan
  5. VongNguyet_JadeWell_Courtyard
  6. DaSon_Cliff_And_KimQuy

Compatible with Blender 4.x and Blender 5.2+ LTS.
"""

import bpy
import bmesh
import mathutils
from mathutils import Vector, Matrix, Euler
import math
import os
import shutil

print("[BLENDER-REALM-KIT] Bắt đầu khởi tạo bộ Modular Kit Cõi Mở Cổ Loa (coloa_realm_kit.glb)...")

BASE_DIR = r"D:\BaoTang3D"
OUT_PATH_MODEL = os.path.join(BASE_DIR, "public", "model", "coloa_realm_kit.glb")
OUT_PATH_MODELS = os.path.join(BASE_DIR, "public", "models", "coloa_realm_kit.glb")
OUT_PATH_ROOT_MODEL = os.path.join(BASE_DIR, "model", "coloa_realm_kit.glb")

os.makedirs(os.path.join(BASE_DIR, "public", "model"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "public", "models"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "model"), exist_ok=True)

# ---------------------------------------------------------------------------
# Scene Initialization
# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

realm_collection = bpy.data.collections.new("CoLoa_Realm_Kit_Collection")
scene.collection.children.link(realm_collection)

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

mat_citadel_laterite = create_pbr_material(
    "Mat_Citadel_Laterite",
    base_color=hex_to_rgba("6E432B"), # Đá ong Cổ Loa nâu đỏ gồ ghề
    metallic=0.10,
    roughness=0.88
)

mat_rammed_earth = create_pbr_material(
    "Mat_Rammed_Earth",
    base_color=hex_to_rgba("7F5C3E"), # Đất son đầm nén trình tường
    metallic=0.05,
    roughness=0.92
)

mat_thanhhoa_stone = create_pbr_material(
    "Mat_ThanhHoa_Stone",
    base_color=hex_to_rgba("4A5562"), # Đá phiến Thanh Hóa xanh xám rêu phong
    metallic=0.12,
    roughness=0.78
)

mat_ancient_roof = create_pbr_material(
    "Mat_Ancient_Roof_Tile",
    base_color=hex_to_rgba("7A3828"), # Ngói đất nung cổ
    metallic=0.15,
    roughness=0.62
)

mat_lim_wood = create_pbr_material(
    "Mat_Lim_Wood",
    base_color=hex_to_rgba("3A2114"), # Gỗ lim sẫm màu
    metallic=0.05,
    roughness=0.72
)

mat_dongson_bronze = create_pbr_material(
    "Mat_DongSon_Bronze",
    base_color=hex_to_rgba("B27838"), # Đồng Đông Sơn cổ ánh kim
    metallic=0.88,
    roughness=0.32
)

mat_crossbow_gold_emission = create_pbr_material(
    "Mat_Golden_Claw_Emission",
    base_color=hex_to_rgba("FFD700"),
    metallic=0.92,
    roughness=0.18,
    emission_color=hex_to_rgba("FFD700"),
    emission_strength=3.5
)

mat_clear_well_water = create_pbr_material(
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

mat_dason_cliff = create_pbr_material(
    "Mat_DaSon_Cliff_Stone",
    base_color=hex_to_rgba("343A40"), # Đá hoa cương Dạ Sơn sẫm màu
    metallic=0.15,
    roughness=0.85
)

mat_ocean_wave = create_pbr_material(
    "Mat_Ocean_Breaker_Wave",
    base_color=hex_to_rgba("1A5A72", alpha=0.88),
    metallic=0.35,
    roughness=0.15,
    transmission=0.75
)

mat_divine_turtle_gold = create_pbr_material(
    "Mat_Divine_Turtle_Gold",
    base_color=hex_to_rgba("D9A736"), # Vàng rực rỡ Thần Kim Quy
    metallic=0.95,
    roughness=0.20,
    emission_color=hex_to_rgba("5E440B"),
    emission_strength=0.6
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

def post_process_kit_mesh(obj):
    """
    Standardizes origin to bottom center (0,0,0), auto smooths, and smart UV unwraps.
    """
    deselect_all()
    set_active(obj)
    
    # 1. Apply transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # 2. Offset vertices so min Z = 0, and center X/Y at 0
    verts = obj.data.vertices
    if len(verts) > 0:
        min_z = min(v.co.z for v in verts)
        min_x = min(v.co.x for v in verts)
        max_x = max(v.co.x for v in verts)
        min_y = min(v.co.y for v in verts)
        max_y = max(v.co.y for v in verts)
        
        offset_x = (min_x + max_x) / 2.0
        offset_y = (min_y + max_y) / 2.0
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
        print(f"[BLENDER-REALM-KIT] UV note for {obj.name}: {e}")
        
    deselect_all()
    print(f"[BLENDER-REALM-KIT] Mesh chuẩn hóa: {obj.name} ({len(obj.data.vertices)} đỉnh, {len(obj.data.polygons)} mặt)")


# ===========================================================================
# 1. Spiral_Citadel_Ramparts
# Phân đoạn thành xoắn ốc đất trình tường & đá ong (Ramped earth & laterite wall)
# ===========================================================================
print("[BLENDER-REALM-KIT] Đang tạo 1/6: Spiral_Citadel_Ramparts...")
rampart_parts = []

# Base laterite stone footing (Chân thành đá ong kiên cố)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 0.6),
    scale=(14.0, 3.8, 1.2)
)
footing = bpy.context.active_object
footing.data.materials.append(mat_citadel_laterite)
rampart_parts.append(footing)

# Main Rammed-Earth Wall Body (Thân thành đất trình tường đầm nén)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 2.3),
    scale=(13.8, 3.0, 2.4)
)
wall_body = bpy.context.active_object
wall_body.data.materials.append(mat_rammed_earth)
rampart_parts.append(wall_body)

# Patrol Walkway Stone Coping (Mặt đường tuần tra lát đá)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 3.6),
    scale=(13.9, 2.8, 0.25)
)
walkway = bpy.context.active_object
walkway.data.materials.append(mat_thanhhoa_stone)
rampart_parts.append(walkway)

# Outer Battlement Merlons & Lỗ châu mai (Tường phòng thủ có lỗ châu mai phía ngoài)
num_merlons = 7
for mi in range(num_merlons):
    mx = -6.0 + mi * 2.0
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(mx, 1.35, 4.2),
        scale=(1.2, 0.45, 0.95)
    )
    merlon = bpy.context.active_object
    merlon.data.materials.append(mat_citadel_laterite)
    rampart_parts.append(merlon)

# Inner Parapet (Gờ chắn bảo vệ phía trong)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, -1.35, 3.95),
    scale=(13.9, 0.35, 0.50)
)
inner_parapet = bpy.context.active_object
inner_parapet.data.materials.append(mat_citadel_laterite)
rampart_parts.append(inner_parapet)

# Defensive Bamboo/Timber Palisade Stakes (Chông tre và rào cọc phòng ngự)
for si in range(8):
    sx = -5.5 + si * 1.55
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.08,
        radius2=0.01,
        depth=1.6,
        location=(sx, 1.85, 2.4),
        rotation=(0.4, 0, 0)
    )
    stake = bpy.context.active_object
    stake.data.materials.append(mat_lim_wood)
    rampart_parts.append(stake)

obj_ramparts = join_mesh_parts(rampart_parts[0], rampart_parts[1:])
obj_ramparts.name = "Spiral_Citadel_Ramparts"
obj_ramparts.data.name = "Spiral_Citadel_Ramparts_Mesh"
realm_collection.objects.link(obj_ramparts)
post_process_kit_mesh(obj_ramparts)


# ===========================================================================
# 2. Arch_Wooden_Bridge
# Cầu gỗ lim cong bắc qua 3 vòng hào
# ===========================================================================
print("[BLENDER-REALM-KIT] Đang tạo 2/6: Arch_Wooden_Bridge...")
bridge_parts = []

bridge_len = 10.0
bridge_w = 3.2
bridge_segs = 16

# Stepped Stone Abutments on both riverbanks (Mố cầu đá hai đầu bờ hào)
for ex in [-bridge_len/2 - 0.7, bridge_len/2 + 0.7]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(ex, 0, 0.5),
        scale=(1.8, bridge_w + 0.8, 1.0)
    )
    abut = bpy.context.active_object
    abut.data.materials.append(mat_thanhhoa_stone)
    bridge_parts.append(abut)
    
    # 2 Stone Landing Lantern Posts at each bridgehead
    for post_y in [-(bridge_w/2 + 0.25), bridge_w/2 + 0.25]:
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(ex, post_y, 1.3),
            scale=(0.35, 0.35, 1.6)
        )
        post = bpy.context.active_object
        post.data.materials.append(mat_thanhhoa_stone)
        bridge_parts.append(post)
        
        # Lotus Finial on post
        bpy.ops.mesh.primitive_cone_add(
            radius1=0.18,
            radius2=0.02,
            depth=0.35,
            location=(ex, post_y, 2.25)
        )
        lotus = bpy.context.active_object
        lotus.data.materials.append(mat_dongson_bronze)
        bridge_parts.append(lotus)

# Curved Wooden Deck Planks & Arched Stringers
for i in range(bridge_segs):
    t0 = (i / bridge_segs) - 0.5
    t1 = ((i + 1) / bridge_segs) - 0.5
    tm = (t0 + t1) / 2.0
    bx = tm * bridge_len
    # Parabolic gentle arch rising 1.25m at mid-span
    bz = 0.85 + 1.25 * (1.0 - (2.0 * tm)**2)
    
    # Wooden deck plank segment
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(bx, 0, bz),
        scale=(bridge_len / bridge_segs + 0.05, bridge_w, 0.18),
        rotation=(0, -math.atan(2.5 * -4.0 * tm * (bridge_len / 12.0)), 0)
    )
    plank = bpy.context.active_object
    plank.data.materials.append(mat_lim_wood)
    bridge_parts.append(plank)
    
    # Railing posts on both sides
    for side_y in [-bridge_w/2 + 0.08, bridge_w/2 - 0.08]:
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.045,
            depth=0.85,
            location=(bx, side_y, bz + 0.45)
        )
        r_post = bpy.context.active_object
        r_post.data.materials.append(mat_lim_wood)
        bridge_parts.append(r_post)

# Continuous Handrail Beams (Tay vịn cong hai bên thành cầu)
for side_y in [-bridge_w/2 + 0.08, bridge_w/2 - 0.08]:
    for i in range(bridge_segs):
        tm = (i / (bridge_segs - 1)) - 0.5
        rx = tm * bridge_len
        rz = 0.85 + 1.25 * (1.0 - (2.0 * tm)**2) + 0.85
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(rx, side_y, rz),
            scale=(bridge_len / bridge_segs + 0.08, 0.10, 0.08)
        )
        h_rail = bpy.context.active_object
        h_rail.data.materials.append(mat_lim_wood)
        bridge_parts.append(h_rail)

# Central Arch Keystones/Support Trusses (Dầm vòng cung chịu lực dưới gầm cầu)
for sy in [-bridge_w/3, bridge_w/3]:
    for i in range(bridge_segs):
        tm = (i / (bridge_segs - 1)) - 0.5
        rx = tm * bridge_len
        rz = 0.85 + 1.25 * (1.0 - (2.0 * tm)**2) - 0.22
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(rx, sy, rz),
            scale=(bridge_len / bridge_segs + 0.08, 0.16, 0.28)
        )
        arch_beam = bpy.context.active_object
        arch_beam.data.materials.append(mat_lim_wood)
        bridge_parts.append(arch_beam)

obj_bridge = join_mesh_parts(bridge_parts[0], bridge_parts[1:])
obj_bridge.name = "Arch_Wooden_Bridge"
obj_bridge.data.name = "Arch_Wooden_Bridge_Mesh"
realm_collection.objects.link(obj_bridge)
post_process_kit_mesh(obj_bridge)


# ===========================================================================
# 3. Imperial_Pavilion_Hall
# Điện Ngự Triều 2 tầng mái đao cong + Bệ Trống Đồng 3 tầng
# ===========================================================================
print("[BLENDER-REALM-KIT] Đang tạo 3/6: Imperial_Pavilion_Hall...")
hall_parts = []

# Stone Terrace Plinth (Bệ nền tam cấp lát đá xanh Thanh Hóa)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 0.4),
    scale=(11.5, 9.5, 0.8)
)
p_base = bpy.context.active_object
p_base.data.materials.append(mat_thanhhoa_stone)
hall_parts.append(p_base)

# Front and Back Access Steps (Bậc tam cấp rồng chầu)
for sy in [-5.0, 5.0]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0, sy, 0.25),
        scale=(3.8, 1.2, 0.5)
    )
    steps = bpy.context.active_object
    steps.data.materials.append(mat_thanhhoa_stone)
    hall_parts.append(steps)

# 12 Stately Lim Wood Columns (Hệ 12 cột cái và cột quân gỗ lim đai đồng)
col_positions = [
    (-4.2, -3.2), (-1.4, -3.2), (1.4, -3.2), (4.2, -3.2),
    (-4.2, 0.0),                               (4.2, 0.0),
    (-4.2, 3.2),  (-1.4, 3.2),  (1.4, 3.2),  (4.2, 3.2),
    (-1.4, 0.0),  (1.4, 0.0)
]
for cx, cy in col_positions:
    # Lotus Stone Plinth base
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.42,
        depth=0.25,
        location=(cx, cy, 0.9)
    )
    c_base = bpy.context.active_object
    c_base.data.materials.append(mat_thanhhoa_stone)
    hall_parts.append(c_base)
    
    # Main Column Shaft (Cột gỗ lim đường kính 0.5m, cao 4.2m)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.26,
        depth=4.2,
        location=(cx, cy, 3.1)
    )
    c_shaft = bpy.context.active_object
    c_shaft.data.materials.append(mat_lim_wood)
    hall_parts.append(c_shaft)
    
    # Bronze Reinforcement Collars (Đai đồng chạm khắc)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.28,
        minor_radius=0.03,
        location=(cx, cy, 1.5)
    )
    c_band = bpy.context.active_object
    c_band.data.materials.append(mat_dongson_bronze)
    hall_parts.append(c_band)

# Entablature Beam Grid (Hệ thống xà hạ, xà thượng gỗ lim)
for y_line in [-3.2, 0.0, 3.2]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0, y_line, 5.25),
        scale=(9.4, 0.38, 0.38)
    )
    beam_x = bpy.context.active_object
    beam_x.data.materials.append(mat_lim_wood)
    hall_parts.append(beam_x)

for x_line in [-4.2, -1.4, 1.4, 4.2]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(x_line, 0, 5.35),
        scale=(0.38, 7.2, 0.38)
    )
    beam_y = bpy.context.active_object
    beam_y.data.materials.append(mat_lim_wood)
    hall_parts.append(beam_y)

# Lower Roof Tier (Tầng mái hạ - Mái hiên đao cong)
# Sweeping hip roof segments
for ex in [-5.6, 5.6]:
    for ey in [-4.5, 4.5]:
        bpy.ops.mesh.primitive_cone_add(
            radius1=0.22,
            radius2=0.02,
            depth=1.1,
            location=(ex, ey, 6.2),
            rotation=(0.4 * (1 if ey < 0 else -1), 0.5 * (1 if ex < 0 else -1), 0)
        )
        eave1 = bpy.context.active_object
        eave1.data.materials.append(mat_dongson_bronze)
        hall_parts.append(eave1)

bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 5.75),
    scale=(10.8, 8.6, 0.45)
)
roof1 = bpy.context.active_object
roof1.data.materials.append(mat_ancient_roof)
hall_parts.append(roof1)

# Upper Roof Tier (Tầng mái thượng - Mái cổ diêm chồng diêm 2 tầng)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 6.35),
    scale=(6.2, 4.8, 0.8)
)
clerestory = bpy.context.active_object
clerestory.data.materials.append(mat_lim_wood)
hall_parts.append(clerestory)

bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 7.0),
    scale=(7.6, 5.8, 0.5)
)
roof2 = bpy.context.active_object
roof2.data.materials.append(mat_ancient_roof)
hall_parts.append(roof2)

# 4 Upper Curved Eaves (Đao mái tầng trên)
for ex in [-4.1, 4.1]:
    for ey in [-3.1, 3.1]:
        bpy.ops.mesh.primitive_cone_add(
            radius1=0.20,
            radius2=0.02,
            depth=0.95,
            location=(ex, ey, 7.55),
            rotation=(0.45 * (1 if ey < 0 else -1), 0.55 * (1 if ex < 0 else -1), 0)
        )
        eave2 = bpy.context.active_object
        eave2.data.materials.append(mat_dongson_bronze)
        hall_parts.append(eave2)

# Central Ridge Finials (Bờ nóc kìm nóc hình chim Lạc hóa rồng)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 7.4),
    scale=(5.8, 0.4, 0.35)
)
ridge_hall = bpy.context.active_object
ridge_hall.data.materials.append(mat_ancient_roof)
hall_parts.append(ridge_hall)

# Royal Bronze Sun Disc on center roof top
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.48,
    depth=0.14,
    location=(0, 0, 7.8),
    rotation=(math.pi/2, 0, 0)
)
sun_disc = bpy.context.active_object
sun_disc.data.materials.append(mat_dongson_bronze)
hall_parts.append(sun_disc)

# Inside: Bệ Trống Đồng Đông Sơn 3 tầng (3-tier Dong Son Drum Pedestal at hall center)
# Tier 1 (Hạ)
bpy.ops.mesh.primitive_cylinder_add(radius=1.8, depth=0.35, location=(0, 0, 0.95), vertices=32)
p_t1 = bpy.context.active_object
p_t1.data.materials.append(mat_thanhhoa_stone)
hall_parts.append(p_t1)
# Tier 2 (Trung - Chạm thuyền chiến)
bpy.ops.mesh.primitive_cylinder_add(radius=1.45, depth=0.35, location=(0, 0, 1.30), vertices=32)
p_t2 = bpy.context.active_object
p_t2.data.materials.append(mat_thanhhoa_stone)
hall_parts.append(p_t2)
# Tier 3 (Thượng - Mặt trống đồng 14 tia)
bpy.ops.mesh.primitive_cylinder_add(radius=1.25, depth=0.30, location=(0, 0, 1.60), vertices=32)
p_t3 = bpy.context.active_object
p_t3.data.materials.append(mat_dongson_bronze)
hall_parts.append(p_t3)

obj_hall = join_mesh_parts(hall_parts[0], hall_parts[1:])
obj_hall.name = "Imperial_Pavilion_Hall"
obj_hall.data.name = "Imperial_Pavilion_Hall_Mesh"
realm_collection.objects.link(obj_hall)
post_process_kit_mesh(obj_hall)


# ===========================================================================
# 4. SouthGate_Bastion_NoThan
# Vọng lâu Cổng Nam + án thờ Nỏ Thần lẫy vuốt Rùa Vàng phát sáng + giá tên đồng 3 cạnh
# ===========================================================================
print("[BLENDER-REALM-KIT] Đang tạo 4/6: SouthGate_Bastion_NoThan...")
bastion_parts = []

# Heavy Laterite Bastion Gateway Body (Khối thành Cổng Nam đá ong dày dặn)
# Left Tower Buttress
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(-3.6, 0, 2.4),
    scale=(3.5, 4.8, 4.8)
)
left_butt = bpy.context.active_object
left_butt.data.materials.append(mat_citadel_laterite)
bastion_parts.append(left_butt)

# Right Tower Buttress
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(3.6, 0, 2.4),
    scale=(3.5, 4.8, 4.8)
)
right_butt = bpy.context.active_object
right_butt.data.materials.append(mat_citadel_laterite)
bastion_parts.append(right_butt)

# Central Arch Lintel (Vòm cuốn cổng thành rộng 3.8m cho quân binh xa giá qua lại)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 4.2),
    scale=(4.2, 4.8, 1.4)
)
arch_lintel = bpy.context.active_object
arch_lintel.data.materials.append(mat_citadel_laterite)
bastion_parts.append(arch_lintel)

# Top Bastion Platform (Sân thượng vọng lâu ngắm nhìn tiền duyên)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 4.95),
    scale=(10.8, 5.2, 0.3)
)
plat = bpy.context.active_object
plat.data.materials.append(mat_thanhhoa_stone)
bastion_parts.append(plat)

# Defensive Crenellations around bastion platform
for bx in [-4.8, -3.2, -1.6, 1.6, 3.2, 4.8]:
    for by in [-2.45, 2.45]:
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(bx, by, 5.5),
            scale=(0.95, 0.35, 0.8)
        )
        b_merlon = bpy.context.active_object
        b_merlon.data.materials.append(mat_citadel_laterite)
        bastion_parts.append(b_merlon)

# Watchtower Pavilion (Vọng Lâu canh gác trên tầng 2)
# 4 Corner lim wood pillars
for px, py in [(-2.2, -1.5), (-2.2, 1.5), (2.2, -1.5), (2.2, 1.5)]:
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.18,
        depth=2.8,
        location=(px, py, 6.4)
    )
    p_col = bpy.context.active_object
    p_col.data.materials.append(mat_lim_wood)
    bastion_parts.append(p_col)

# Watchtower Roof with 4 Curved Eaves (Mái che vọng lâu uốn cong 4 góc đao)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 7.85),
    scale=(5.8, 4.4, 0.4)
)
w_roof = bpy.context.active_object
w_roof.data.materials.append(mat_ancient_roof)
bastion_parts.append(w_roof)

for ex in [-3.1, 3.1]:
    for ey in [-2.4, 2.4]:
        bpy.ops.mesh.primitive_cone_add(
            radius1=0.18,
            radius2=0.02,
            depth=0.85,
            location=(ex, ey, 8.3),
            rotation=(0.4 * (1 if ey < 0 else -1), 0.5 * (1 if ex < 0 else -1), 0)
        )
        w_eave = bpy.context.active_object
        w_eave.data.materials.append(mat_dongson_bronze)
        bastion_parts.append(w_eave)

# In the center of the Watchtower: Án thờ Nỏ Thần Liên Châu (Linh Quang Kim Quy Thần Cơ)
# Table
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 5.55),
    scale=(2.0, 0.95, 0.9)
)
altar_t = bpy.context.active_object
altar_t.data.materials.append(mat_lim_wood)
bastion_parts.append(altar_t)

# Nỏ Thần Stock (Thân nỏ đồng dài 1.5m có rãnh)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(0, 0, 6.1),
    scale=(0.14, 1.5, 0.10)
)
nothan_stock = bpy.context.active_object
nothan_stock.data.materials.append(mat_dongson_bronze)
bastion_parts.append(nothan_stock)

# Nỏ Thần Bow Limbs (Cánh nỏ cong rộng 1.8m)
for side in [-1, 1]:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(side * 0.45, 0.55, 6.12),
        scale=(0.85, 0.09, 0.08),
        rotation=(0, side * 0.12, side * 0.28)
    )
    limb = bpy.context.active_object
    limb.data.materials.append(mat_dongson_bronze)
    bastion_parts.append(limb)

# Lẫy vuốt Rùa Vàng phát sáng rực rỡ (Emission #FFD700)
bpy.ops.mesh.primitive_cone_add(
    radius1=0.065,
    radius2=0.008,
    depth=0.32,
    location=(0, -0.1, 6.28),
    rotation=(math.pi/5, 0, 0)
)
claw = bpy.context.active_object
claw.data.materials.append(mat_crossbow_gold_emission)
bastion_parts.append(claw)

# Giá Binh Khí Mũi Tên Đồng Cổ Loa 3 Cạnh (Weapon rack with 3-bladed bronze arrows)
for side_x in [-0.75, 0.75]:
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.10,
        depth=0.55,
        location=(side_x, 0, 5.75)
    )
    quiv = bpy.context.active_object
    quiv.data.materials.append(mat_dongson_bronze)
    bastion_parts.append(quiv)
    
    for ai in range(3):
        bpy.ops.mesh.primitive_cone_add(
            radius1=0.035,
            radius2=0.002,
            depth=0.14,
            location=(side_x + (ai - 1)*0.04, 0, 6.18),
            vertices=3
        )
        tip = bpy.context.active_object
        tip.data.materials.append(mat_dongson_bronze)
        bastion_parts.append(tip)

obj_bastion = join_mesh_parts(bastion_parts[0], bastion_parts[1:])
obj_bastion.name = "SouthGate_Bastion_NoThan"
obj_bastion.data.name = "SouthGate_Bastion_NoThan_Mesh"
realm_collection.objects.link(obj_bastion)
post_process_kit_mesh(obj_bastion)


# ===========================================================================
# 5. VongNguyet_JadeWell_Courtyard
# Lầu Vọng Nguyệt + Giếng Ngọc Mị Châu + viên Minh Châu
# ===========================================================================
print("[BLENDER-REALM-KIT] Đang tạo 5/6: VongNguyet_JadeWell_Courtyard...")
courtyard_parts = []

# Stone Paved Courtyard Platform (Sân lát đá xanh dẫn vào Giếng Ngọc & Lầu Vọng Nguyệt)
bpy.ops.mesh.primitive_cylinder_add(
    radius=5.5,
    depth=0.35,
    location=(0, 0, 0.175),
    vertices=24
)
p_court = bpy.context.active_object
p_court.data.materials.append(mat_thanhhoa_stone)
courtyard_parts.append(p_court)

# Left Side: Lầu Vọng Nguyệt Lục Giác (Hexagonal Moon-Viewing Pavilion)
pavilion_center_x = -2.2
pavilion_center_y = 0.0

# 6 Wooden Columns on Hexagonal base
hex_r = 1.9
for hi in range(6):
    hang = (hi / 6.0) * math.pi * 2
    hx = pavilion_center_x + math.cos(hang) * hex_r
    hy = pavilion_center_y + math.sin(hang) * hex_r
    
    # Plinth
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.18,
        depth=0.20,
        location=(hx, hy, 0.45)
    )
    col_base = bpy.context.active_object
    col_base.data.materials.append(mat_thanhhoa_stone)
    courtyard_parts.append(col_base)
    
    # Column
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.12,
        depth=3.2,
        location=(hx, hy, 2.05)
    )
    col_p = bpy.context.active_object
    col_p.data.materials.append(mat_lim_wood)
    courtyard_parts.append(col_p)

# Hexagonal Roof with 6 Sweeping Eaves (Mái lầu lục giác cong vút)
bpy.ops.mesh.primitive_cone_add(
    radius1=2.6,
    radius2=0.2,
    depth=1.35,
    location=(pavilion_center_x, pavilion_center_y, 4.3),
    vertices=6
)
hex_roof = bpy.context.active_object
hex_roof.data.materials.append(mat_ancient_roof)
courtyard_parts.append(hex_roof)

# 6 Bronze Dragon Rafter Tips on Hexagonal Roof
for hi in range(6):
    hang = (hi / 6.0) * math.pi * 2
    hx = pavilion_center_x + math.cos(hang) * 2.7
    hy = pavilion_center_y + math.sin(hang) * 2.7
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.14,
        radius2=0.015,
        depth=0.65,
        location=(hx, hy, 4.8),
        rotation=(0.4 * math.sin(hang), 0.4 * math.cos(hang), 0)
    )
    r_tip = bpy.context.active_object
    r_tip.data.materials.append(mat_dongson_bronze)
    courtyard_parts.append(r_tip)

# Roof Pinnacle (Bầu hồ lô đồng trên đỉnh lầu vọng nguyệt)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.14,
    depth=0.65,
    location=(pavilion_center_x, pavilion_center_y, 5.25)
)
pinnacle = bpy.context.active_object
pinnacle.data.materials.append(mat_dongson_bronze)
courtyard_parts.append(pinnacle)

# Right Side: Giếng Ngọc Mị Châu Bát Giác (Octagonal Jade Well)
well_center_x = 2.4
well_center_y = 0.0

# Octagonal Stone Well Curb (Thành giếng đá cổ bát giác)
bpy.ops.mesh.primitive_cylinder_add(
    radius=1.35,
    depth=0.90,
    location=(well_center_x, well_center_y, 0.8),
    vertices=8
)
well_curb = bpy.context.active_object
well_curb.data.materials.append(mat_thanhhoa_stone)
courtyard_parts.append(well_curb)

# 8 Lotus Bud Stone Finials at well curb corners
for bi in range(8):
    bang = (bi / 8.0) * math.pi * 2
    bx = well_center_x + math.cos(bang) * 1.32
    by = well_center_y + math.sin(bang) * 1.32
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.075,
        radius2=0.01,
        depth=0.20,
        location=(bx, by, 1.35)
    )
    w_lotus = bpy.context.active_object
    w_lotus.data.materials.append(mat_thanhhoa_stone)
    courtyard_parts.append(w_lotus)

# Reflective Water Disc in well
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.95,
    depth=0.05,
    location=(well_center_x, well_center_y, 0.72),
    vertices=24
)
w_surf = bpy.context.active_object
w_surf.data.materials.append(mat_clear_well_water)
courtyard_parts.append(w_surf)

# Hovering Jade Pearl (Viên Minh Châu phát sáng ngọc bích #00f5d4)
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=0.24,
    location=(well_center_x, well_center_y, 1.45),
    segments=24,
    ring_count=16
)
pearl_mesh = bpy.context.active_object
pearl_mesh.data.materials.append(mat_jade_pearl_emission)
courtyard_parts.append(pearl_mesh)

# Halo Ring orbiting the pearl
bpy.ops.mesh.primitive_torus_add(
    major_radius=0.42,
    minor_radius=0.022,
    location=(well_center_x, well_center_y, 1.45),
    rotation=(math.pi/5, math.pi/4, 0)
)
halo_ring = bpy.context.active_object
halo_ring.data.materials.append(mat_jade_pearl_emission)
courtyard_parts.append(halo_ring)

# 4 Floating Jade Water Droplets
for di in range(4):
    dang = (di / 4.0) * math.pi * 2
    dx = well_center_x + math.cos(dang) * 0.45
    dy = well_center_y + math.sin(dang) * 0.45
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.045,
        location=(dx, dy, 1.45 + 0.08 * math.sin(di)),
        segments=12,
        ring_count=8
    )
    drop = bpy.context.active_object
    drop.data.materials.append(mat_jade_pearl_emission)
    courtyard_parts.append(drop)

obj_courtyard = join_mesh_parts(courtyard_parts[0], courtyard_parts[1:])
obj_courtyard.name = "VongNguyet_JadeWell_Courtyard"
obj_courtyard.data.name = "VongNguyet_JadeWell_Courtyard_Mesh"
realm_collection.objects.link(obj_courtyard)
post_process_kit_mesh(obj_courtyard)


# ===========================================================================
# 6. DaSon_Cliff_And_KimQuy
# Vách đá biển Dạ Sơn + tượng Thần Kim Quy nổi trên sóng nước
# ===========================================================================
print("[BLENDER-REALM-KIT] Đang tạo 6/6: DaSon_Cliff_And_KimQuy...")
cliff_turtle_parts = []

# Rugged Sea Clifftops and Fractured Granite Slabs (Vách đá biển Dạ Sơn hùng vĩ)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(-2.8, 0, 2.2),
    scale=(5.5, 9.2, 4.4)
)
cliff_main = bpy.context.active_object
cliff_main.data.materials.append(mat_dason_cliff)
cliff_turtle_parts.append(cliff_main)

# Stepped Sea Stack Outcroppings (Mỏm đá nhô ra mép biển)
bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(-0.8, -2.4, 1.6),
    scale=(3.2, 3.8, 3.2)
)
stack1 = bpy.context.active_object
stack1.data.materials.append(mat_dason_cliff)
cliff_turtle_parts.append(stack1)

bpy.ops.mesh.primitive_cube_add(
    size=1.0,
    location=(-0.6, 2.4, 1.2),
    scale=(3.4, 3.6, 2.4)
)
stack2 = bpy.context.active_object
stack2.data.materials.append(mat_dason_cliff)
cliff_turtle_parts.append(stack2)

# Swirling Ocean Surge & Parting Breaker Waves (Sóng biển thần rẽ sóng đón vua)
turtle_center_x = 2.8
turtle_center_y = 0.0

bpy.ops.mesh.primitive_cylinder_add(
    radius=2.6,
    depth=0.35,
    location=(turtle_center_x, turtle_center_y, 0.4),
    vertices=32
)
surge_disc = bpy.context.active_object
surge_disc.data.materials.append(mat_ocean_wave)
cliff_turtle_parts.append(surge_disc)

# 8 Wave Crest Scrolls surrounding turtle
for wi in range(8):
    wang = (wi / 8.0) * math.pi * 2
    wx = turtle_center_x + math.cos(wang) * 2.2
    wy = turtle_center_y + math.sin(wang) * 2.2
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.35,
        radius2=0.05,
        depth=0.55,
        location=(wx, wy, 0.65),
        rotation=(0.4, 0, wang + math.pi/2)
    )
    w_crest = bpy.context.active_object
    w_crest.data.materials.append(mat_ocean_wave)
    cliff_turtle_parts.append(w_crest)

# Tượng Thần Kim Quy (Golden Turtle God) nổi trên sóng
# Carapace (Mai rùa vàng linh thiêng vòm cao)
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=1.1,
    location=(turtle_center_x, turtle_center_y, 0.95),
    segments=28,
    ring_count=20
)
carapace = bpy.context.active_object
carapace.scale = (1.25, 0.92, 0.52)
carapace.data.materials.append(mat_divine_turtle_gold)
cliff_turtle_parts.append(carapace)

# Carapace Scute Plates (Tấm mai rùa lục giác)
for s_row in [-0.4, 0.0, 0.4]:
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.25,
        depth=0.10,
        location=(turtle_center_x + s_row, turtle_center_y, 1.32),
        vertices=6
    )
    scute = bpy.context.active_object
    scute.data.materials.append(mat_divine_turtle_gold)
    cliff_turtle_parts.append(scute)

# Carapace Wave Rim
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.2,
    minor_radius=0.09,
    location=(turtle_center_x, turtle_center_y, 0.82)
)
rim = bpy.context.active_object
rim.scale = (1.2, 0.92, 0.8)
rim.data.materials.append(mat_divine_turtle_gold)
cliff_turtle_parts.append(rim)

# Dragon-Turtle Head & Neck (Đầu rồng ngẩng cao uy nghiêm hướng vào đất liền)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.20,
    depth=0.75,
    location=(turtle_center_x - 1.35, turtle_center_y, 1.05),
    rotation=(0, -math.pi/4, 0),
    vertices=16
)
neck = bpy.context.active_object
neck.data.materials.append(mat_divine_turtle_gold)
cliff_turtle_parts.append(neck)

bpy.ops.mesh.primitive_uv_sphere_add(
    radius=0.35,
    location=(turtle_center_x - 1.75, turtle_center_y, 1.35),
    segments=18,
    ring_count=12
)
head = bpy.context.active_object
head.scale = (1.3, 0.88, 0.88)
head.data.materials.append(mat_divine_turtle_gold)
cliff_turtle_parts.append(head)

# Dragon Horn on head
bpy.ops.mesh.primitive_cone_add(
    radius1=0.08,
    radius2=0.01,
    depth=0.42,
    location=(turtle_center_x - 1.82, turtle_center_y, 1.68),
    rotation=(0, math.pi/6, 0)
)
horn = bpy.context.active_object
horn.data.materials.append(mat_divine_turtle_gold)
cliff_turtle_parts.append(horn)

# 4 Powerful Swimming Flippers (Bốn chân bơi uy mãnh trên sóng)
flipper_pos = [
    (turtle_center_x - 0.75, 0.95, 0.72, 0.5),
    (turtle_center_x - 0.75, -0.95, 0.72, -0.5),
    (turtle_center_x + 0.85, 0.90, 0.68, 1.1),
    (turtle_center_x + 0.85, -0.90, 0.68, -1.1),
]
for fx, fy, fz, f_rot in flipper_pos:
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(fx, fy, fz),
        scale=(0.75, 0.38, 0.14),
        rotation=(0, 0, f_rot)
    )
    flip = bpy.context.active_object
    flip.data.materials.append(mat_divine_turtle_gold)
    cliff_turtle_parts.append(flip)

# Auspicious Tail
bpy.ops.mesh.primitive_cone_add(
    radius1=0.14,
    radius2=0.015,
    depth=0.62,
    location=(turtle_center_x + 1.55, turtle_center_y, 0.75),
    rotation=(0, math.pi/2, 0)
)
tail = bpy.context.active_object
tail.data.materials.append(mat_divine_turtle_gold)
cliff_turtle_parts.append(tail)

obj_cliff_turtle = join_mesh_parts(cliff_turtle_parts[0], cliff_turtle_parts[1:])
obj_cliff_turtle.name = "DaSon_Cliff_And_KimQuy"
obj_cliff_turtle.data.name = "DaSon_Cliff_And_KimQuy_Mesh"
realm_collection.objects.link(obj_cliff_turtle)
post_process_kit_mesh(obj_cliff_turtle)


# ===========================================================================
# Verification & Export
# ===========================================================================
all_realm_objects = [
    obj_ramparts,
    obj_bridge,
    obj_hall,
    obj_bastion,
    obj_courtyard,
    obj_cliff_turtle
]

print("=" * 70)
print("[BLENDER-REALM-KIT] Kiểm tra 6 mesh của bộ Cổ Loa Realm Kit:")
for obj in all_realm_objects:
    verts = obj.data.vertices
    polys = obj.data.polygons
    min_z = min(v.co.z for v in verts)
    max_z = max(v.co.z for v in verts)
    print(f"  * {obj.name:<32} | {len(verts):>6} verts | {len(polys):>6} polys | Z: [{min_z:.3f}, {max_z:.3f}]")
print("=" * 70)

# Select only realm kit objects
deselect_all()
for obj in all_realm_objects:
    obj.select_set(True)

print(f"[BLENDER-REALM-KIT] Xuất GLB Draco nén -> {OUT_PATH_MODEL}")
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
print(f"[BLENDER-REALM-KIT] Xuất thành công: {file_size_bytes:,} bytes ({file_size_mb:.2f} MB)")

if file_size_mb >= 6.0:
    print(f"[BLENDER-REALM-KIT] CẢNH BÁO: Kích thước {file_size_mb:.2f} MB vượt ngưỡng 6 MB!")
else:
    print(f"[BLENDER-REALM-KIT] THÀNH CÔNG: Kích thước {file_size_mb:.2f} MB tối ưu hoàn hảo (< 6 MB)!")

# Mirror sync
shutil.copyfile(OUT_PATH_MODEL, OUT_PATH_MODELS)
shutil.copyfile(OUT_PATH_MODEL, OUT_PATH_ROOT_MODEL)
print(f"[BLENDER-REALM-KIT] Đã đồng bộ sang: {OUT_PATH_MODELS}")
print(f"[BLENDER-REALM-KIT] Đã đồng bộ sang: {OUT_PATH_ROOT_MODEL}")

print("[BLENDER-REALM-KIT] Hoàn tất 100% quy trình xuất bộ Kit Cõi Mở Cổ Loa!")
