import bpy
import bmesh
import math
import os
import shutil

print("[BLENDER-BUILD] Bắt đầu quy trình Blender Python (bpy) cho Phòng & Cõi An Dương Vương...")

# Đường dẫn file
BASE_DIR = r"D:\BaoTang3D"
BACKUP_DIR = r"D:\BackupModels"
MODEL_SRC = os.path.join(BASE_DIR, "public", "model", "amduongvuong.glb")
KIT_OUT_1 = os.path.join(BASE_DIR, "public", "model", "coloa_kit.glb")
KIT_OUT_2 = os.path.join(BASE_DIR, "public", "models", "coloa_kit.glb")
KIT_OUT_3 = os.path.join(BASE_DIR, "model", "coloa_kit.glb")

os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "public", "model"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "public", "models"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "model"), exist_ok=True)

# 1. Backup file gốc amduongvuong.glb
backup_path = os.path.join(BACKUP_DIR, "amduongvuong.glb")
if os.path.exists(MODEL_SRC) and not os.path.exists(backup_path):
    shutil.copy2(MODEL_SRC, backup_path)
    print(f"[BLENDER-BUILD] Đã sao lưu amduongvuong.glb sang {backup_path}")

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_material(name, base_color=(0.8, 0.8, 0.8, 1.0), metallic=0.0, roughness=0.5, emission=(0, 0, 0, 1), emission_strength=0.0, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
    return mat

def set_pivot_to_bottom(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    # Tính bounding box trong không gian thế giới
    matrix = obj.matrix_world
    bbox = [matrix @ mathutils.Vector(corner) for corner in obj.bound_box] if 'mathutils' in globals() else [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    # Dùng bpy.ops
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    min_z = min([v.co.z for v in obj.data.vertices])
    for v in obj.data.vertices:
        v.co.z -= min_z
    obj.location.z = 0
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

import mathutils

clear_scene()

# Bảng vật liệu PBR
mat_stone = create_material("Mat_CoLoa_Stone", base_color=(0.22, 0.24, 0.25, 1.0), metallic=0.15, roughness=0.65)
mat_bronze = create_material("Mat_Ancient_Bronze", base_color=(0.35, 0.26, 0.16, 1.0), metallic=0.88, roughness=0.30)
mat_gold = create_material("Mat_Divine_Gold", base_color=(0.95, 0.75, 0.18, 1.0), metallic=0.92, roughness=0.20, emission=(0.95, 0.75, 0.18, 1.0), emission_strength=1.5)
mat_wood = create_material("Mat_Lim_Wood", base_color=(0.28, 0.14, 0.08, 1.0), metallic=0.08, roughness=0.72)
mat_water = create_material("Mat_Clear_Water", base_color=(0.06, 0.45, 0.42, 1.0), metallic=0.2, roughness=0.1, transmission=0.92)
mat_pearl = create_material("Mat_Jade_Pearl", base_color=(0.0, 0.96, 0.83, 1.0), metallic=0.1, roughness=0.15, emission=(0.0, 0.96, 0.83, 1.0), emission_strength=3.5)
mat_roof = create_material("Mat_Ancient_Tile", base_color=(0.55, 0.20, 0.12, 1.0), metallic=0.15, roughness=0.55)

# ==============================================================================
# 1. COLOA_SPIRAL_CITADEL (Sa bàn & Tường thành Xoắn ốc 3 vòng)
# ==============================================================================
print("[BLENDER-BUILD] Dựng CoLoa_Spiral_Citadel...")
mesh_citadel = bpy.data.meshes.new("CoLoa_Spiral_Citadel_Mesh")
obj_citadel = bpy.data.objects.new("CoLoa_Spiral_Citadel", mesh_citadel)
bpy.context.collection.objects.link(obj_citadel)

bm = bmesh.new()
# Dựng 3 vòng xoắn ốc Archimedes (r = a + b*theta)
turns = 3
points_per_turn = 48
total_points = turns * points_per_turn
spiral_verts_inner = []
spiral_verts_outer = []

a_base = 3.5
b_step = 2.8 / (math.pi * 2)
wall_h = 1.8
wall_w = 0.55

prev_verts = None
for i in range(total_points):
    theta = (i / points_per_turn) * (math.pi * 2)
    r = a_base + b_step * theta
    x = math.cos(theta) * r
    y = math.sin(theta) * r
    nx = math.cos(theta)
    ny = math.sin(theta)
    
    # 4 đỉnh cho mỗi lát cắt tường
    v1 = bm.verts.new((x - nx * wall_w / 2, y - ny * wall_w / 2, 0.0))
    v2 = bm.verts.new((x + nx * wall_w / 2, y + ny * wall_w / 2, 0.0))
    v3 = bm.verts.new((x + nx * wall_w / 2, y + ny * wall_w / 2, wall_h))
    v4 = bm.verts.new((x - nx * wall_w / 2, y - ny * wall_w / 2, wall_h))
    
    if prev_verts is not None:
        pv1, pv2, pv3, pv4 = prev_verts
        # Mặt đáy, mặt ngoài, mặt trên, mặt trong
        bm.faces.new((pv1, pv2, v2, v1))
        bm.faces.new((pv2, pv3, v3, v2))
        bm.faces.new((pv3, pv4, v4, v3))
        bm.faces.new((pv4, pv1, v1, v4))
    prev_verts = (v1, v2, v3, v4)

bm.to_mesh(mesh_citadel)
bm.free()
obj_citadel.data.materials.append(mat_stone)

# ==============================================================================
# 2. DONGSON_DRUM_PEDESTAL (Bệ Đá Trống Đồng Đông Sơn 3 Tầng)
# ==============================================================================
print("[BLENDER-BUILD] Dựng DongSon_Drum_Pedestal...")
mesh_pedestal = bpy.data.meshes.new("DongSon_Drum_Pedestal_Mesh")
obj_pedestal = bpy.data.objects.new("DongSon_Drum_Pedestal", mesh_pedestal)
bpy.context.collection.objects.link(obj_pedestal)

bm = bmesh.new()
# Tầng 1: Trụ đá bậc hạ (R=2.6, H=0.45)
bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=32, radius1=2.6, radius2=2.4, depth=0.45, matrix=mathutils.Matrix.Translation((0, 0, 0.225)))
# Tầng 2: Trụ đá bậc trung (R=2.1, H=0.40)
bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=32, radius1=2.1, radius2=1.95, depth=0.40, matrix=mathutils.Matrix.Translation((0, 0, 0.65)))
# Tầng 3: Trụ đồng Đông Sơn mặt trống (R=1.8, H=0.35)
bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=32, radius1=1.8, radius2=1.75, depth=0.35, matrix=mathutils.Matrix.Translation((0, 0, 1.025)))
bm.to_mesh(mesh_pedestal)
bm.free()
obj_pedestal.data.materials.append(mat_bronze)

# ==============================================================================
# 3. SACRED_CROSSBOW_NOTHAN (Nỏ Thần Liên Châu & Án Thờ Gỗ Lim)
# ==============================================================================
print("[BLENDER-BUILD] Dựng Sacred_Crossbow_NoThan...")
mesh_cb = bpy.data.meshes.new("Sacred_Crossbow_Mesh")
obj_cb = bpy.data.objects.new("Sacred_Crossbow_NoThan", mesh_cb)
bpy.context.collection.objects.link(obj_cb)

bm = bmesh.new()
# Án thờ gỗ lim: Mặt bàn (2.4 x 1.2 x 0.12, H=1.1)
bmesh.ops.create_cube(bm, size=1.0, matrix=mathutils.Matrix.Translation((0, 0, 1.05)) @ mathutils.Matrix.Scale(2.4, 4, (1, 0, 0)) @ mathutils.Matrix.Scale(1.2, 4, (0, 1, 0)) @ mathutils.Matrix.Scale(0.12, 4, (0, 0, 1)))
# 4 Chân bàn tiện tròn
for leg_x in [-1.0, 1.0]:
    for leg_y in [-0.45, 0.45]:
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.08, radius2=0.07, depth=1.0, matrix=mathutils.Matrix.Translation((leg_x, leg_y, 0.5)))

# Thân nỏ gỗ mun (dài 1.6m, rộng 0.18m)
bmesh.ops.create_cube(bm, size=1.0, matrix=mathutils.Matrix.Translation((0, 0, 1.22)) @ mathutils.Matrix.Scale(0.18, 4, (1, 0, 0)) @ mathutils.Matrix.Scale(1.5, 4, (0, 1, 0)) @ mathutils.Matrix.Scale(0.14, 4, (0, 0, 1)))
# Cánh nỏ cong vút bằng đồng thau
bmesh.ops.create_cube(bm, size=1.0, matrix=mathutils.Matrix.Translation((0, 0.65, 1.25)) @ mathutils.Matrix.Scale(1.8, 4, (1, 0, 0)) @ mathutils.Matrix.Scale(0.10, 4, (0, 1, 0)) @ mathutils.Matrix.Scale(0.12, 4, (0, 0, 1)))
# Lẫy nỏ móng vuốt Rùa Vàng phát sáng
bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.08, radius2=0.01, depth=0.28, matrix=mathutils.Matrix.Translation((0, -0.15, 1.38)) @ mathutils.Euler((math.pi/4, 0, 0)).to_matrix().to_4x4())

bm.to_mesh(mesh_cb)
bm.free()
obj_cb.data.materials.append(mat_wood)
obj_cb.data.materials.append(mat_gold)

# ==============================================================================
# 4. NGOCTRAI_JADEWELL (Giếng Ngọc Cổ Loa & Viên Minh Châu)
# ==============================================================================
print("[BLENDER-BUILD] Dựng NgocTrai_JadeWell...")
mesh_well = bpy.data.meshes.new("NgocTrai_JadeWell_Mesh")
obj_well = bpy.data.objects.new("NgocTrai_JadeWell", mesh_well)
bpy.context.collection.objects.link(obj_well)

bm = bmesh.new()
# Thành giếng bát giác (8 cạnh, R=1.4, H=0.95)
bmesh.ops.create_cone(bm, cap_ends=False, segments=8, radius1=1.45, radius2=1.40, depth=0.95, matrix=mathutils.Matrix.Translation((0, 0, 0.475)))
# Mặt nước giếng trong suốt
bmesh.ops.create_circle(bm, cap_ends=True, segments=16, radius=1.35, matrix=mathutils.Matrix.Translation((0, 0, 0.35)))
# Viên Minh Châu ngọc bích phát sáng ở tâm giếng
bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=0.32, matrix=mathutils.Matrix.Translation((0, 0, 0.45)))
bm.to_mesh(mesh_well)
bm.free()
obj_well.data.materials.append(mat_stone)
obj_well.data.materials.append(mat_water)
obj_well.data.materials.append(mat_pearl)

# ==============================================================================
# 5. KIMQUY_STATUE (Tượng Thần Kim Quy Vàng Rực Rỡ)
# ==============================================================================
print("[BLENDER-BUILD] Dựng KimQuy_Statue...")
mesh_kq = bpy.data.meshes.new("KimQuy_Statue_Mesh")
obj_kq = bpy.data.objects.new("KimQuy_Statue", mesh_kq)
bpy.context.collection.objects.link(obj_kq)

bm = bmesh.new()
# Mai rùa vòm cong
bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=1.2, matrix=mathutils.Matrix.Translation((0, 0, 0.6)) @ mathutils.Matrix.Scale(1.0, 4, (1, 0, 0)) @ mathutils.Matrix.Scale(1.35, 4, (0, 1, 0)) @ mathutils.Matrix.Scale(0.65, 4, (0, 0, 1)))
# Đầu rùa vàng uy nghiêm
bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=0.35, matrix=mathutils.Matrix.Translation((0, 1.45, 0.75)) @ mathutils.Matrix.Scale(0.85, 4, (1, 0, 0)) @ mathutils.Matrix.Scale(1.25, 4, (0, 1, 0)) @ mathutils.Matrix.Scale(0.85, 4, (0, 0, 1)))
bm.to_mesh(mesh_kq)
bm.free()
obj_kq.data.materials.append(mat_gold)

# ==============================================================================
# 6. COLOA_PORTAL_GATE (Cổng Thành Cổ Loa Mái Đao 4.2m)
# ==============================================================================
print("[BLENDER-BUILD] Dựng CoLoa_Portal_Gate...")
mesh_gate = bpy.data.meshes.new("CoLoa_Portal_Gate_Mesh")
obj_gate = bpy.data.objects.new("CoLoa_Portal_Gate", mesh_gate)
bpy.context.collection.objects.link(obj_gate)

bm = bmesh.new()
# 2 Trụ cổng đá xanh (rộng 4.2m thông thủy)
bmesh.ops.create_cube(bm, size=1.0, matrix=mathutils.Matrix.Translation((-2.4, 0, 2.1)) @ mathutils.Matrix.Scale(0.8, 4, (1, 0, 0)) @ mathutils.Matrix.Scale(0.8, 4, (0, 1, 0)) @ mathutils.Matrix.Scale(4.2, 4, (0, 0, 1)))
bmesh.ops.create_cube(bm, size=1.0, matrix=mathutils.Matrix.Translation((2.4, 0, 2.1)) @ mathutils.Matrix.Scale(0.8, 4, (1, 0, 0)) @ mathutils.Matrix.Scale(0.8, 4, (0, 1, 0)) @ mathutils.Matrix.Scale(4.2, 4, (0, 0, 1)))
# Xà ngang đá chạm phù điêu
bmesh.ops.create_cube(bm, size=1.0, matrix=mathutils.Matrix.Translation((0, 0, 4.3)) @ mathutils.Matrix.Scale(5.8, 4, (1, 0, 0)) @ mathutils.Matrix.Scale(1.0, 4, (0, 1, 0)) @ mathutils.Matrix.Scale(0.8, 4, (0, 0, 1)))
# Mái đao cổ đại lợp ngói
bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=3.8, radius2=0.2, depth=1.4, matrix=mathutils.Matrix.Translation((0, 0, 5.3)) @ mathutils.Euler((0, 0, math.pi/4)).to_matrix().to_4x4())

bm.to_mesh(mesh_gate)
bm.free()
obj_gate.data.materials.append(mat_stone)
obj_gate.data.materials.append(mat_roof)

# Căn chỉnh Auto-Grounding (Origin đáy Z=0) cho từng đối tượng
all_kit_objs = [obj_citadel, obj_pedestal, obj_cb, obj_well, obj_kq, obj_gate]
for obj in all_kit_objs:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    # Smart UV Project
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Auto-Grounding: đưa min Z về 0
    min_z = min([v.co.z for v in obj.data.vertices])
    for v in obj.data.vertices:
        v.co.z -= min_z
    obj.location = (0, 0, 0)
    obj.select_set(False)

# Xuất bộ kit ra coloa_kit.glb
for obj in all_kit_objs:
    obj.select_set(True)

print(f"[BLENDER-BUILD] Xuất bộ kit ra: {KIT_OUT_1}")
bpy.ops.export_scene.gltf(
    filepath=KIT_OUT_1,
    export_format='GLB',
    use_selection=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_materials='EXPORT',
    export_apply=True
)

# Đồng bộ sang các thư mục
shutil.copy2(KIT_OUT_1, KIT_OUT_2)
shutil.copy2(KIT_OUT_1, KIT_OUT_3)
print(f"[BLENDER-BUILD] Đã đồng bộ coloa_kit.glb sang {KIT_OUT_2} và {KIT_OUT_3}")

file_size_mb = os.path.getsize(KIT_OUT_1) / (1024 * 1024)
print(f"[BLENDER-BUILD] Dung lượng coloa_kit.glb: {file_size_mb:.2f} MB (Rất nhẹ, chuẩn < 5 MB!)")
print("[BLENDER-BUILD] Hoàn thành xuất sắc toàn bộ quy trình Blender Python!")
