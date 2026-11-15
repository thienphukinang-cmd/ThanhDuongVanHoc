"""
scripts/blender_build_vonhat_kit.py
Blender Python (bpy) Asset Generator for "Vợ Nhặt – Kim Lân (1945)" Kit
Generates public/model/vonhat_kit.glb containing 6 cultural heritage meshes:
  1. XomNguCu_Gate
  2. CartTrack_Earth_Pedestal
  3. Trang_Thatched_Cottage
  4. Famine_Wedding_Meal
  5. GrainCart_And_FourBowls
  6. RedFlag_Revolution_Beacon

Compatible with Blender 4.x and Blender 5.2+ LTS.
"""

import bpy
import bmesh
import mathutils
from mathutils import Vector, Matrix, Euler
import math
import os
import shutil

print("[BLENDER-KIT] Starting Vợ Nhặt 3D Asset Kit Generation...")

BASE_DIR = r"D:\BaoTang3D"
OUT_PATH_MODEL = os.path.join(BASE_DIR, "public", "model", "vonhat_kit.glb")
OUT_PATH_MODELS = os.path.join(BASE_DIR, "public", "models", "vonhat_kit.glb")
OUT_PATH_ROOT_MODEL = os.path.join(BASE_DIR, "model", "vonhat_kit.glb")

os.makedirs(os.path.join(BASE_DIR, "public", "model"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "public", "models"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "model"), exist_ok=True)

# ---------------------------------------------------------------------------
# Scene Initialization
# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

kit_collection = bpy.data.collections.new("VoNhat_Kit_Collection")
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

mat_bamboo = create_pbr_material("Mat_Bamboo", base_color=hex_to_rgba("7C6E4E"), roughness=0.65)
mat_weathered_brick = create_pbr_material("Mat_Weathered_Brick", base_color=hex_to_rgba("6D4C41"), roughness=0.85)
mat_thatch = create_pbr_material("Mat_Thatch", base_color=hex_to_rgba("8D6E63"), roughness=0.90)
mat_earth = create_pbr_material("Mat_Earth", base_color=hex_to_rgba("4E342E"), roughness=0.85)
mat_clay_pot = create_pbr_material("Mat_Clay_Pot", base_color=hex_to_rgba("3E2723"), roughness=0.80)
mat_banana_leaf = create_pbr_material("Mat_Banana_Leaf", base_color=hex_to_rgba("33691E"), roughness=0.45)
mat_bran_soup = create_pbr_material("Mat_Bran_Soup", base_color=hex_to_rgba("795548"), roughness=0.50)
mat_lamp_brass = create_pbr_material("Mat_Lamp_Brass", base_color=hex_to_rgba("B78103"), metallic=0.75, roughness=0.35)
mat_lamp_flame = create_pbr_material("Mat_Lamp_Flame", base_color=hex_to_rgba("FFA000"), emission_color=hex_to_rgba("FF6F00"), emission_strength=4.0)
mat_cart_wood = create_pbr_material("Mat_Cart_Wood", base_color=hex_to_rgba("5D4037"), roughness=0.80)
mat_rice_bag = create_pbr_material("Mat_Rice_Bag", base_color=hex_to_rgba("A1887F"), roughness=0.75)
mat_red_flag = create_pbr_material("Mat_Red_Flag", base_color=hex_to_rgba("D32F2F"), roughness=0.40)
mat_gold_star = create_pbr_material("Mat_Gold_Star", base_color=hex_to_rgba("FFD700"), metallic=0.4, roughness=0.3, emission_color=hex_to_rgba("FFD700"), emission_strength=2.0)
mat_sprout_rice = create_pbr_material("Mat_Sprout_Rice", base_color=hex_to_rgba("689F38"), roughness=0.4)

def finalize_object(obj, name):
    obj.name = name
    kit_collection.objects.link(obj)
    
    # Calculate bounding box to ground pivot at bottom center
    bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_x = min(v.x for v in bbox)
    max_x = max(v.x for v in bbox)
    min_y = min(v.y for v in bbox)
    max_y = max(v.y for v in bbox)
    min_z = min(v.z for v in bbox)
    max_z = max(v.z for v in bbox)
    
    center_x = (min_x + max_x) / 2.0
    center_z = (min_z + max_z) / 2.0
    
    # Translate mesh vertices so bottom center is at (0, 0, 0)
    translation = Vector((-center_x, -min_y, -center_z))
    for v in obj.data.vertices:
        v.co += translation
        
    obj.data.update()
    
    # Auto smooth
    for poly in obj.data.polygons:
        poly.use_smooth = True
        
    return obj

# ---------------------------------------------------------------------------
# 1. XomNguCu_Gate: Cổng tre đan mộc mạc xóm ngụ cư + trụ gạch rêu phong
# ---------------------------------------------------------------------------
def build_xom_ngu_cu_gate():
    bm = bmesh.new()
    
    # 2 Trụ gạch cổ hai bên
    col_width = 0.6
    col_depth = 0.6
    col_height = 4.2
    span = 4.2 # Độ mở cổng
    
    for side in [-1, 1]:
        x_center = side * (span / 2.0 + col_width / 2.0)
        # Trụ chính
        geom = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector((col_width, col_depth, col_height)), verts=geom['verts'])
        bmesh.ops.translate(bm, vec=Vector((x_center, col_height / 2.0, 0)), verts=geom['verts'])
        
        # Đỉnh trụ gạch
        cap_geom = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector((col_width + 0.15, col_depth + 0.15, 0.3)), verts=cap_geom['verts'])
        bmesh.ops.translate(bm, vec=Vector((x_center, col_height + 0.15, 0)), verts=cap_geom['verts'])

    # Thanh xà ngang bằng tre lớn nối 2 trụ
    beam_geom = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.15, radius2=0.15, depth=span + 1.2)
    bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(math.pi / 2, 4, 'Y'), verts=beam_geom['verts'])
    bmesh.ops.translate(bm, vec=Vector((0, col_height - 0.2, 0)), verts=beam_geom['verts'])
    
    # Các nan tre đan chéo vòm cổng
    for i in range(-5, 6):
        x = i * 0.35
        slat = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8, radius1=0.04, radius2=0.04, depth=1.2)
        bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(0.3 if i % 2 == 0 else -0.3, 4, 'Z'), verts=slat['verts'])
        bmesh.ops.translate(bm, vec=Vector((x, col_height + 0.4, 0)), verts=slat['verts'])

    mesh = bpy.data.meshes.new("Mesh_XomNguCu_Gate")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("XomNguCu_Gate", mesh)
    obj.data.materials.append(mat_bamboo)
    obj.data.materials.append(mat_weathered_brick)
    return finalize_object(obj, "XomNguCu_Gate")

# ---------------------------------------------------------------------------
# 2. CartTrack_Earth_Pedestal: Bệ đá ong và đất nung 2 tầng in hằn vệt bánh xe bò
# ---------------------------------------------------------------------------
def build_earth_pedestal():
    bm = bmesh.new()
    
    # Tầng 1: Đất nung và đá ong rộng 4.2m x 4.2m x 0.35m
    p1 = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((4.2, 0.35, 4.2)), verts=p1['verts'])
    bmesh.ops.translate(bm, vec=Vector((0, 0.175, 0)), verts=p1['verts'])
    
    # Tầng 2: Đất nện cao thêm 0.35m (rộng 3.6m x 3.6m) -> Tổng chiều cao = 0.70m
    p2 = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((3.6, 0.35, 3.6)), verts=p2['verts'])
    bmesh.ops.translate(bm, vec=Vector((0, 0.525, 0)), verts=p2['verts'])
    
    # 2 Vệt bánh xe bò lún sâu trên mặt bệ đất
    for wheel_x in [-0.85, 0.85]:
        track = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector((0.18, 0.04, 3.4)), verts=track['verts'])
        bmesh.ops.translate(bm, vec=Vector((wheel_x, 0.705, 0)), verts=track['verts'])

    # Bông lúa vàng nảy mầm từ góc đất
    for lx, lz in [(-1.5, -1.5), (1.5, -1.5), (-1.5, 1.5), (1.5, 1.5)]:
        sprout = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8, radius1=0.05, radius2=0.01, depth=0.45)
        bmesh.ops.translate(bm, vec=Vector((lx, 0.90, lz)), verts=sprout['verts'])

    mesh = bpy.data.meshes.new("Mesh_CartTrack_Earth_Pedestal")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("CartTrack_Earth_Pedestal", mesh)
    obj.data.materials.append(mat_earth)
    obj.data.materials.append(mat_sprout_rice)
    return finalize_object(obj, "CartTrack_Earth_Pedestal")

# ---------------------------------------------------------------------------
# 3. Trang_Thatched_Cottage: Góc nhà tranh vách đất 3 gian của mẹ con Tràng
# ---------------------------------------------------------------------------
def build_thatched_cottage():
    bm = bmesh.new()
    
    # Nền đất nhà tranh: 4.8m x 3.8m
    floor = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((4.8, 0.15, 3.8)), verts=floor['verts'])
    bmesh.ops.translate(bm, vec=Vector((0, 0.075, 0)), verts=floor['verts'])
    
    # 4 Cột tre chống mái
    for cx in [-2.1, 2.1]:
        for cz in [-1.6, 1.6]:
            col = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.10, radius2=0.09, depth=2.8)
            bmesh.ops.translate(bm, vec=Vector((cx, 1.45, cz)), verts=col['verts'])

    # Vách đất trát rơm phía sau & hông trái
    back_wall = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((4.4, 2.2, 0.18)), verts=back_wall['verts'])
    bmesh.ops.translate(bm, vec=Vector((0, 1.25, -1.6)), verts=back_wall['verts'])
    
    side_wall = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((0.18, 2.2, 3.2)), verts=side_wall['verts'])
    bmesh.ops.translate(bm, vec=Vector((-2.1, 1.25, 0)), verts=side_wall['verts'])

    # Mái rạ dốc (Mái tranh)
    roof_w = 5.4
    roof_d = 4.4
    roof = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=4, radius1=3.4, radius2=0.2, depth=1.4)
    bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(math.pi / 4, 4, 'Y'), verts=roof['verts'])
    bmesh.ops.scale(bm, vec=Vector((0.85, 0.8, 0.7)), verts=roof['verts'])
    bmesh.ops.translate(bm, vec=Vector((0, 3.4, 0)), verts=roof['verts'])
    
    # Ang nước mưa ngoài sân
    ang = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=16, radius1=0.45, radius2=0.35, depth=0.65)
    bmesh.ops.translate(bm, vec=Vector((1.8, 0.45, 1.3)), verts=ang['verts'])

    mesh = bpy.data.meshes.new("Mesh_Trang_Thatched_Cottage")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("Trang_Thatched_Cottage", mesh)
    obj.data.materials.append(mat_thatch)
    obj.data.materials.append(mat_earth)
    obj.data.materials.append(mat_clay_pot)
    return finalize_object(obj, "Trang_Thatched_Cottage")

# ---------------------------------------------------------------------------
# 4. Famine_Wedding_Meal: Mâm cơm ngày đói trên chõng tre + Nồi chè khoán
# ---------------------------------------------------------------------------
def build_wedding_meal():
    bm = bmesh.new()
    
    # Chiếc chõng tre tân hôn (dài 1.9m x rộng 1.1m x cao 0.55m)
    bed_top = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((1.9, 0.08, 1.1)), verts=bed_top['verts'])
    bmesh.ops.translate(bm, vec=Vector((0, 0.55, 0)), verts=bed_top['verts'])
    
    # 4 Chân chõng bằng tre
    for leg_x in [-0.85, 0.85]:
        for leg_z in [-0.45, 0.45]:
            leg = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=10, radius1=0.06, radius2=0.05, depth=0.55)
            bmesh.ops.translate(bm, vec=Vector((leg_x, 0.275, leg_z)), verts=leg['verts'])

    # Cái mẹt rách (đường kính 0.75m)
    met = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=20, radius1=0.38, radius2=0.35, depth=0.03)
    bmesh.ops.translate(bm, vec=Vector((0, 0.605, 0)), verts=met['verts'])
    
    # Nồi chè khoán (cháo cám) đất nung đậy vung lá chuối
    pot = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=16, radius1=0.18, radius2=0.14, depth=0.22)
    bmesh.ops.translate(bm, vec=Vector((-0.12, 0.72, 0)), verts=pot['verts'])
    
    # Vung lá chuối đậy nồi
    leaf_lid = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=16, radius1=0.20, radius2=0.02, depth=0.04)
    bmesh.ops.translate(bm, vec=Vector((-0.12, 0.84, 0)), verts=leaf_lid['verts'])
    
    # Rổ rau chuối thái rối
    veg_basket = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.13, radius2=0.09, depth=0.08)
    bmesh.ops.translate(bm, vec=Vector((0.15, 0.65, -0.1)), verts=veg_basket['verts'])
    
    # Đĩa muối trắng
    salt_plate = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.08, radius2=0.06, depth=0.03)
    bmesh.ops.translate(bm, vec=Vector((0.15, 0.63, 0.12)), verts=salt_plate['verts'])

    # Ngọn đèn dầu Hoa Kỳ đêm tân hôn
    lamp_base = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.07, radius2=0.05, depth=0.10)
    bmesh.ops.translate(bm, vec=Vector((0.55, 0.64, 0)), verts=lamp_base['verts'])
    lamp_glass = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.04, radius2=0.06, depth=0.16)
    bmesh.ops.translate(bm, vec=Vector((0.55, 0.77, 0)), verts=lamp_glass['verts'])
    
    # Ngọn lửa đèn dầu phát sáng
    flame = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8, radius1=0.02, radius2=0.001, depth=0.05)
    bmesh.ops.translate(bm, vec=Vector((0.55, 0.74, 0)), verts=flame['verts'])

    mesh = bpy.data.meshes.new("Mesh_Famine_Wedding_Meal")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("Famine_Wedding_Meal", mesh)
    obj.data.materials.append(mat_bamboo)
    obj.data.materials.append(mat_clay_pot)
    obj.data.materials.append(mat_banana_leaf)
    obj.data.materials.append(mat_lamp_flame)
    return finalize_object(obj, "Famine_Wedding_Meal")

# ---------------------------------------------------------------------------
# 5. GrainCart_And_FourBowls: Xe bò chở thóc & 4 bát bánh đúc đầu chợ
# ---------------------------------------------------------------------------
def build_grain_cart_and_four_bowls():
    bm = bmesh.new()
    
    # Khung xe bò đẩy tay (dài 2.2m x rộng 1.2m)
    cart_bed = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((2.2, 0.12, 1.1)), verts=cart_bed['verts'])
    bmesh.ops.translate(bm, vec=Vector((0, 0.55, 0)), verts=cart_bed['verts'])
    
    # 2 Bánh xe gỗ nan hoa lớn
    wheel_r = 0.55
    for wz in [-0.62, 0.62]:
        wheel_rim = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=24, radius1=wheel_r, radius2=wheel_r, depth=0.08)
        bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(math.pi / 2, 4, 'X'), verts=wheel_rim['verts'])
        bmesh.ops.translate(bm, vec=Vector((0, wheel_r, wz)), verts=wheel_rim['verts'])

    # Tay kéo xe bò
    for handle_z in [-0.4, 0.4]:
        handle = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8, radius1=0.04, radius2=0.03, depth=1.6)
        bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(math.pi / 2, 4, 'Y'), verts=handle['verts'])
        bmesh.ops.translate(bm, vec=Vector((1.6, 0.55, handle_z)), verts=handle['verts'])

    # Các bao thóc trên thùng xe
    for bx in [-0.5, 0.2]:
        for bz in [-0.25, 0.25]:
            bag = bmesh.ops.create_cube(bm, size=1.0)
            bmesh.ops.scale(bm, vec=Vector((0.6, 0.35, 0.45)), verts=bag['verts'])
            bmesh.ops.translate(bm, vec=Vector((bx, 0.78, bz)), verts=bag['verts'])

    # Chiếc chõng quán nước đầu chợ với 4 bát bánh đúc
    table = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((1.1, 0.06, 0.9)), verts=table['verts'])
    bmesh.ops.translate(bm, vec=Vector((-1.6, 0.45, 0)), verts=table['verts'])
    
    # 4 Bát bánh đúc
    for idx, (bowl_x, bowl_z) in enumerate([(-1.45, -0.2), (-1.75, -0.2), (-1.45, 0.2), (-1.75, 0.2)]):
        bowl = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.08, radius2=0.04, depth=0.06)
        bmesh.ops.translate(bm, vec=Vector((bowl_x, 0.51, bowl_z)), verts=bowl['verts'])

    mesh = bpy.data.meshes.new("Mesh_GrainCart_And_FourBowls")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("GrainCart_And_FourBowls", mesh)
    obj.data.materials.append(mat_cart_wood)
    obj.data.materials.append(mat_rice_bag)
    obj.data.materials.append(mat_clay_pot)
    return finalize_object(obj, "GrainCart_And_FourBowls")

# ---------------------------------------------------------------------------
# 6. RedFlag_Revolution_Beacon: Lá cờ đỏ sao vàng trên triền đê phá kho thóc
# ---------------------------------------------------------------------------
def build_red_flag_beacon():
    bm = bmesh.new()
    
    # Triền đê bằng đất rộng 3.6m x cao 1.2m x sâu 2.4m
    dike = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=2.0, radius2=1.4, depth=1.2)
    bmesh.ops.translate(bm, vec=Vector((0, 0.6, 0)), verts=dike['verts'])
    
    # Cột cờ bằng tre cao 5.4m
    pole = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.08, radius2=0.04, depth=5.4)
    bmesh.ops.translate(bm, vec=Vector((0, 3.9, 0)), verts=pole['verts'])
    
    # Lá cờ đỏ phấp phới (rộng 2.4m x cao 1.6m)
    flag = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((2.4, 1.6, 0.02)), verts=flag['verts'])
    bmesh.ops.translate(bm, vec=Vector((1.25, 5.2, 0)), verts=flag['verts'])
    
    # Ngôi sao vàng 5 cánh ở tâm lá cờ
    star = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=10, radius1=0.45, radius2=0.18, depth=0.05)
    bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(math.pi / 2, 4, 'X'), verts=star['verts'])
    bmesh.ops.translate(bm, vec=Vector((1.25, 5.2, 0.02)), verts=star['verts'])

    mesh = bpy.data.meshes.new("Mesh_RedFlag_Revolution_Beacon")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("RedFlag_Revolution_Beacon", mesh)
    obj.data.materials.append(mat_earth)
    obj.data.materials.append(mat_bamboo)
    obj.data.materials.append(mat_red_flag)
    obj.data.materials.append(mat_gold_star)
    return finalize_object(obj, "RedFlag_Revolution_Beacon")

# ---------------------------------------------------------------------------
# Build all components
# ---------------------------------------------------------------------------
build_xom_ngu_cu_gate()
build_earth_pedestal()
build_thatched_cottage()
build_wedding_meal()
build_grain_cart_and_four_bowls()
build_red_flag_beacon()

# Select all created kit objects
bpy.ops.object.select_all(action='DESELECT')
for obj in kit_collection.objects:
    obj.select_set(True)
scene.view_layers[0].objects.active = kit_collection.objects[0]

# Export GLTF / GLB (Draco compression)
print(f"[BLENDER-KIT] Exporting GLB to {OUT_PATH_MODEL}...")
try:
    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH_MODEL,
        export_format='GLB',
        use_selection=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_apply=True,
        export_yup=True
    )
    print(f"[BLENDER-KIT] Export successful: {OUT_PATH_MODEL}")
except Exception as e:
    print(f"[BLENDER-KIT] Draco export failed, exporting standard GLB: {e}")
    bpy.ops.export_scene.gltf(
        filepath=OUT_PATH_MODEL,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True
    )

# Sync copies to public/models/ and model/
for dest in [OUT_PATH_MODELS, OUT_PATH_ROOT_MODEL]:
    try:
        shutil.copyfile(OUT_PATH_MODEL, dest)
        print(f"[BLENDER-KIT] Synced to {dest}")
    except Exception as e:
        print(f"[BLENDER-KIT] Sync notice for {dest}: {e}")

print("[BLENDER-KIT] ALL VỢ NHẶT KIT ASSETS GENERATED SUCCESSFULLY!")
