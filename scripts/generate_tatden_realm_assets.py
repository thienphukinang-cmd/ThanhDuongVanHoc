"""
Headless Blender Python script to generate 4 GLB 3D assets for
"Cõi Ngoại Cảnh: Làng Đông Xá (Tắt Đèn - Ngô Tất Tố)"
Runs via:
  blender --background --python scripts/generate_tatden_realm_assets.py
"""
import os
import math
import random
import bpy
import bmesh
from mathutils import Vector

OUT_DIR = os.path.join("D:\\BaoTang3D", "public", "models", "tatden")


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    return scene


def make_bsdf_material(name, base_color, roughness=0.75, metallic=0.0, emission=None, emission_strength=0.0, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def assign_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def tri_count_of_objects(objs):
    total = 0
    for obj in objs:
        if obj.type != 'MESH':
            continue
        for p in obj.data.polygons:
            total += max(1, len(p.vertices) - 2)
    return total


def join_and_decimate(objs, name, max_tris):
    mesh_objs = [o for o in objs if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in mesh_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objs[0]
    if len(mesh_objs) > 1:
        bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name

    tris = tri_count_of_objects([joined])
    if tris > max_tris:
        ratio = max(0.08, (max_tris * 0.92) / tris)
        mod = joined.modifiers.new(name="AutoDecimate", type='DECIMATE')
        mod.decimate_type = 'COLLAPSE'
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)

    # Đặt tâm X/Z = 0 và đáy Z = 0 trong không gian Z-up của Blender (xuất glTF Y-up)
    bpy.context.view_layer.update()
    bbox_corners = [joined.matrix_world @ Vector(c) for c in joined.bound_box]
    min_x = min(v.x for v in bbox_corners)
    max_x = max(v.x for v in bbox_corners)
    min_y = min(v.y for v in bbox_corners)
    max_y = max(v.y for v in bbox_corners)
    min_z = min(v.z for v in bbox_corners)

    cx = (min_x + max_x) * 0.5
    cy = (min_y + max_y) * 0.5
    joined.location.x -= cx
    joined.location.y -= cy
    joined.location.z -= min_z
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    final_tris = tri_count_of_objects([joined])
    print(f"[TatDen Realm Assets] '{name}' final tris: {final_tris} (limit {max_tris})")
    return joined


def export_glb(filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_materials='EXPORT'
    )
    size_kb = os.path.getsize(filepath) / 1024.0
    print(f"[TatDen Realm Assets] Exported {filepath} ({size_kb:.1f} KB)")


def add_cylinder(loc, radius, depth, mat, rot=(0, 0, 0), verts=14):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    assign_mat(obj, mat)
    return obj


def add_box(loc, scale_xyz, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.scale = scale_xyz
    bpy.ops.object.transform_apply(scale=True)
    assign_mat(obj, mat)
    return obj


def add_cone(loc, r1, r2, depth, mat, rot=(0, 0, 0), verts=14):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    assign_mat(obj, mat)
    return obj


# =============================================================================
# 1. PORTAL_TATDEN.GLB (< 10k tris): Cổng vòm gạch cổ rêu phong + tre nứa + đèn dầu
# =============================================================================
def build_portal_tatden():
    reset_scene()
    brick_mat = make_bsdf_material("OldMossBrick", (0.14, 0.11, 0.10), roughness=0.92)
    moss_mat = make_bsdf_material("PortalMoss", (0.10, 0.16, 0.08), roughness=0.95)
    bamboo_mat = make_bsdf_material("WeatheredBamboo", (0.18, 0.14, 0.08), roughness=0.82)
    brass_mat = make_bsdf_material("AntiqueLampBrass", (0.42, 0.28, 0.11), roughness=0.38, metallic=0.82)
    glass_mat = make_bsdf_material("FrostedGlass", (0.85, 0.72, 0.50), roughness=0.32, transmission=0.65, emission=(1.0, 0.56, 0.18), emission_strength=0.4)
    flame_mat = make_bsdf_material("PortalLampFlame", (1.0, 0.58, 0.16), roughness=0.2, emission=(1.0, 0.52, 0.12), emission_strength=3.6)

    parts = []
    # Hai trụ gạch cổ hai bên cổng
    for sx in (-1.75, 1.75):
        parts.append(add_box((sx, 0.0, 0.22), (1.05, 0.95, 0.44), brick_mat))
        parts.append(add_box((sx, 0.0, 1.95), (0.78, 0.72, 3.05), brick_mat))
        # Mảng rêu bám chân & thân trụ
        parts.append(add_box((sx * 0.95, 0.16, 0.55), (0.68, 0.54, 0.48), moss_mat))
        parts.append(add_box((sx * 1.02, -0.14, 2.35), (0.58, 0.48, 0.72), moss_mat))
        # Chóp trụ bậc giật cấp
        parts.append(add_box((sx, 0.0, 3.62), (0.94, 0.86, 0.28), brick_mat))

    # Vòm gạch cuốn bán nguyệt nối 2 trụ (từ Z = 3.2 lên Z = 4.95)
    arch_segs = 11
    for i in range(arch_segs):
        t = i / (arch_segs - 1)
        ang = math.pi * t
        ax = math.cos(ang) * 1.75
        az = 3.25 + math.sin(ang) * 1.65
        parts.append(add_box((ax, 0.0, az), (0.62, 0.72, 0.52), brick_mat, rot=(0, -ang + math.pi / 2, 0)))

    # Khung tre nứa xiêu vẹo gài ngang cột cổng & buộc xiên
    parts.append(add_cylinder((-2.28, 0.25, 2.25), 0.075, 4.7, bamboo_mat, rot=(0.06, 0.11, 0), verts=10))
    parts.append(add_cylinder((2.24, -0.22, 2.15), 0.07, 4.5, bamboo_mat, rot=(-0.05, -0.12, 0), verts=10))
    parts.append(add_cylinder((0.0, 0.34, 4.18), 0.065, 4.9, bamboo_mat, rot=(0, math.pi / 2 - 0.06, 0), verts=10))
    parts.append(add_cylinder((0.0, -0.32, 3.85), 0.055, 4.5, bamboo_mat, rot=(0, math.pi / 2 + 0.04, 0), verts=10))

    # Đèn dầu cổ treo lủng lẳng dưới đỉnh vòm cổng (Z ~ 3.95..4.55)
    parts.append(add_cylinder((0.0, 0.0, 4.65), 0.025, 0.45, brass_mat, verts=8))
    parts.append(add_cone((0.0, 0.0, 4.35), 0.22, 0.05, 0.14, brass_mat, verts=12))
    parts.append(add_cylinder((0.0, 0.0, 4.12), 0.13, 0.28, glass_mat, verts=12))
    parts.append(add_cone((0.0, 0.0, 4.10), 0.045, 0.005, 0.11, flame_mat, verts=8))
    parts.append(add_cylinder((0.0, 0.0, 3.92), 0.16, 0.14, brass_mat, verts=12))

    join_and_decimate(parts, "TatDen_Portal_Gate", max_tris=9500)
    export_glb(os.path.join(OUT_DIR, "portal_tatden.glb"))


# =============================================================================
# 2. NHA_CHI_DAU.GLB (< 14k tris): Túp lều tranh vách đất rách, chõng tre, nồi cháo cám, ổ chó
# =============================================================================
def build_nha_chi_dau():
    reset_scene()
    rng = random.Random(1939)
    mud_mat = make_bsdf_material("CrackedMudWall", (0.20, 0.14, 0.10), roughness=0.95)
    thatch_mat = make_bsdf_material("RottingThatch", (0.27, 0.21, 0.12), roughness=0.97)
    bamboo_mat = make_bsdf_material("RawBambooFrame", (0.24, 0.19, 0.10), roughness=0.84)
    clay_mat = make_bsdf_material("EarthenPot", (0.25, 0.12, 0.08), roughness=0.88)
    straw_mat = make_bsdf_material("PuppyStrawNest", (0.42, 0.34, 0.16), roughness=0.96)
    ember_mat = make_bsdf_material("WeakLampGlow", (1.0, 0.55, 0.14), roughness=0.25, emission=(1.0, 0.5, 0.1), emission_strength=2.4)

    parts = []
    # Nền đất nện gồ ghề
    parts.append(add_box((0.0, 0.0, 0.08), (7.6, 5.4, 0.16), mud_mat))

    # Vách đất phía sau & hai bên (nứt thủng để lộ cốt tre đan)
    parts.append(add_box((0.0, -2.15, 1.25), (6.6, 0.22, 2.2), mud_mat))
    parts.append(add_box((-3.25, 0.0, 1.25), (0.22, 4.3, 2.2), mud_mat))
    parts.append(add_box((3.25, -0.35, 1.25), (0.22, 3.6, 2.2), mud_mat))
    # Vách trước cửa vào xiêu vẹo, chừa khoảng cửa mở ra hiên +Y
    parts.append(add_box((-2.15, 1.25, 1.20), (2.2, 0.20, 2.1), mud_mat))
    parts.append(add_box((2.20, 1.25, 1.15), (2.1, 0.20, 2.0), mud_mat))

    # Hệ cột tre chống xiêu vẹo
    posts = [(-3.2, -2.1), (0.0, -2.1), (3.2, -2.1), (-3.15, 1.25), (-1.1, 1.25), (1.15, 1.25), (3.15, 1.25), (-3.0, 2.45), (3.0, 2.45)]
    for px, py in posts:
        tilt_x = (rng.random() - 0.5) * 0.08
        tilt_y = (rng.random() - 0.5) * 0.08
        parts.append(add_cylinder((px, py, 1.4), 0.085, 2.8, bamboo_mat, rot=(tilt_x, tilt_y, 0), verts=8))

    # Xà nóc & vì kèo tre
    parts.append(add_cylinder((0.0, -0.35, 3.45), 0.09, 7.6, bamboo_mat, rot=(0, math.pi / 2, 0), verts=8))

    # Mái tranh rách thủng nhiều lớp không đều nhau
    for side in (-1, 1):
        for seg in range(7):
            sx = -2.85 + seg * 0.95
            if side == 1 and seg == 4:
                # Lỗ thủng lớn trên mái tranh phơi rui mè tre
                parts.append(add_cylinder((sx, 0.75, 2.85), 0.045, 3.4, bamboo_mat, rot=(0.48, 0, 0), verts=7))
                continue
            sy = -0.35 + side * 1.65
            sz = 2.65 + (rng.random() - 0.5) * 0.08
            tilt = side * (-0.48 + (rng.random() - 0.5) * 0.06)
            parts.append(add_box((sx, sy, sz), (0.98, 3.35, 0.16), thatch_mat, rot=(tilt, 0, (rng.random() - 0.5) * 0.05)))

    # Chõng tre ngoài hiên (y = +1.9)
    parts.append(add_box((-1.65, 1.95, 0.44), (1.75, 0.92, 0.06), bamboo_mat))
    for lx in (-2.42, -0.88):
        for ly in (1.56, 2.34):
            parts.append(add_cylinder((lx, ly, 0.22), 0.038, 0.44, bamboo_mat, verts=7))
    # Gối nứa & nón rách trên chõng
    parts.append(add_cone((-1.35, 1.95, 0.56), 0.28, 0.03, 0.14, thatch_mat, verts=12))

    # Bếp kiềng & nồi đất nấu cháo cám trên hiên phải
    parts.append(add_cylinder((1.25, 1.95, 0.22), 0.24, 0.28, clay_mat, verts=12))
    parts.append(add_cylinder((1.25, 1.95, 0.37), 0.21, 0.04, bamboo_mat, verts=12))
    parts.append(add_cylinder((1.72, 1.85, 0.14), 0.16, 0.12, ember_mat, verts=10))
    # Bát sứt & gáo dừa bên cạnh
    parts.append(add_cone((0.72, 2.08, 0.12), 0.08, 0.13, 0.10, clay_mat, verts=10))

    # Ổ rơm đàn chó con (bên hiên trái ngoài cùng)
    parts.append(add_cylinder((-2.55, 2.02, 0.16), 0.44, 0.14, straw_mat, verts=14))
    parts.append(add_cylinder((-2.55, 2.02, 0.22), 0.34, 0.08, mud_mat, verts=12))
    # Bốn chó con nằm cuộn tròn đơn giản
    for pi in range(4):
        ang = pi * (math.pi * 0.5) + 0.3
        parts.append(add_box((-2.55 + math.cos(ang) * 0.14, 2.02 + math.sin(ang) * 0.14, 0.25), (0.14, 0.09, 0.08), clay_mat, rot=(0, 0, ang)))

    join_and_decimate(parts, "Nha_Chi_Dau", max_tris=13500)
    export_glb(os.path.join(OUT_DIR, "nha_chi_dau.glb"))


# =============================================================================
# 3. DINH_DONG_XA_NGHI_QUE.GLB (< 14k tris): Đình Đông Xá + Cổng nhà Nghị Quế uy nghiêm
# =============================================================================
def build_dinh_dong_xa_nghi_que():
    reset_scene()
    lim_mat = make_bsdf_material("LimIronwood", (0.09, 0.05, 0.03), roughness=0.48, metallic=0.08)
    brick_mat = make_bsdf_material("DarkBrick", (0.20, 0.10, 0.08), roughness=0.84)
    tile_mat = make_bsdf_material("GlazedDarkRoofTile", (0.12, 0.09, 0.09), roughness=0.62)
    stone_mat = make_bsdf_material("CarvedStonePlinth", (0.22, 0.22, 0.24), roughness=0.80)
    gold_mat = make_bsdf_material("GildedLacquerGold", (0.72, 0.52, 0.15), roughness=0.35, metallic=0.85)
    rattan_mat = make_bsdf_material("RattanWhip", (0.48, 0.35, 0.16), roughness=0.72)

    parts = []
    # Nền sân gạch tam cấp cao uy nghi
    parts.append(add_box((0.0, 0.0, 0.16), (10.8, 7.6, 0.32), stone_mat))
    parts.append(add_box((0.0, -0.35, 0.42), (9.6, 6.4, 0.22), brick_mat))

    # Tường gạch kiên cố bao cổng Nghị Quế bên phải & vách hậu đình
    parts.append(add_box((0.0, -3.15, 2.2), (9.4, 0.42, 3.6), brick_mat))
    parts.append(add_box((-4.5, -1.2, 2.2), (0.42, 4.0, 3.6), brick_mat))
    parts.append(add_box((4.5, -1.2, 2.2), (0.42, 4.0, 3.6), brick_mat))

    # Hệ 8 cột gỗ lim lớn kèm đế tảng đá xanh
    for cx in (-3.6, -1.2, 1.2, 3.6):
        for cy in (-2.0, 1.6):
            parts.append(add_cylinder((cx, cy, 0.62), 0.32, 0.24, stone_mat, verts=12))
            parts.append(add_cylinder((cx, cy, 2.35), 0.21, 3.4, lim_mat, verts=14))

    # Xà ngang & hoành phi sơn son thếp vàng
    parts.append(add_box((0.0, 1.6, 3.95), (8.6, 0.36, 0.42), lim_mat))
    parts.append(add_box((0.0, 1.82, 3.58), (2.8, 0.12, 0.68), gold_mat))

    # Mái đình 2 tầng đao cong uy nghiêm
    parts.append(add_box((0.0, -0.2, 4.55), (9.8, 6.2, 0.28), tile_mat))
    parts.append(add_box((0.0, 1.4, 4.25), (9.8, 2.4, 0.24), tile_mat, rot=(0.24, 0, 0)))
    parts.append(add_box((0.0, -1.8, 4.25), (9.8, 2.4, 0.24), tile_mat, rot=(-0.24, 0, 0)))
    # Hai đầu đao mái vểnh lên
    for sx in (-4.9, 4.9):
        parts.append(add_box((sx, 2.25, 4.35), (0.95, 0.75, 0.18), tile_mat, rot=(0.2, sx * -0.08, 0)))
        parts.append(add_box((sx, -2.65, 4.35), (0.95, 0.75, 0.18), tile_mat, rot=(-0.2, sx * -0.08, 0)))
    # Nóc mái thượng & lưỡng long / mặt nguyệt đỉnh đình
    parts.append(add_box((0.0, -0.2, 5.25), (6.2, 3.0, 0.32), tile_mat))
    parts.append(add_cylinder((0.0, -0.2, 5.65), 0.28, 0.14, gold_mat, rot=(math.pi / 2, 0, 0), verts=14))

    # Bàn thu sưu thuế hào lý trên hiên đình + tráp bạc sưu + roi mây + gông gỗ
    parts.append(add_box((0.0, 0.6, 0.96), (2.2, 1.05, 0.10), lim_mat))
    for lx in (-0.95, 0.95):
        for ly in (0.18, 1.02):
            parts.append(add_box((lx, ly, 0.72), (0.10, 0.10, 0.48), lim_mat))
    # Tráp thu sưu mạ đồng
    parts.append(add_box((-0.35, 0.62, 1.15), (0.48, 0.34, 0.24), gold_mat))
    # Roi mây đặt chéo
    parts.append(add_cylinder((0.45, 0.60, 1.03), 0.018, 1.15, rattan_mat, rot=(0, math.pi / 2, 0.28), verts=8))
    # Gông cùm gỗ dựng cạnh cột đình bên trái
    parts.append(add_box((-2.15, 1.25, 1.05), (1.35, 0.14, 0.22), lim_mat, rot=(0.22, 0, 0)))
    parts.append(add_box((-2.15, 1.28, 0.78), (1.35, 0.14, 0.22), lim_mat, rot=(0.22, 0, 0)))

    join_and_decimate(parts, "Dinh_Dong_Xa_Nghi_Que", max_tris=13500)
    export_glb(os.path.join(OUT_DIR, "dinh_dong_xa_nghi_que.glb"))


# =============================================================================
# 4. CHI_DAU_PHANKHANG.GLB (< 5k tris): Hình tượng Chị Dậu quật cường lao vào đêm tối
# =============================================================================
def build_chi_dau_phankhang():
    reset_scene()
    ao_nau_mat = make_bsdf_material("ChiDauBrownShirt", (0.20, 0.13, 0.09), roughness=0.88)
    vay_den_mat = make_bsdf_material("ChiDauBlackSkirt", (0.06, 0.06, 0.08), roughness=0.92)
    skin_mat = make_bsdf_material("WeatheredSkin", (0.48, 0.34, 0.25), roughness=0.72)
    khan_mat = make_bsdf_material("HeadScarf", (0.08, 0.07, 0.07), roughness=0.90)
    base_mat = make_bsdf_material("MudMoundBase", (0.14, 0.10, 0.07), roughness=0.96)

    parts = []
    # Mô đất bùn làm bệ tượng vững chãi (đáy Z=0)
    parts.append(add_cylinder((0.0, 0.0, 0.10), 0.78, 0.20, base_mat, verts=16))

    # Tư thế lao người quyết liệt về phía trước (+Y), chân trước khuỵu, chân sau đạp mạnh
    # Chân trái bước tới
    parts.append(add_cylinder((-0.18, 0.28, 0.56), 0.08, 0.80, skin_mat, rot=(-0.38, 0, 0), verts=10))
    # Chân phải đạp sau
    parts.append(add_cylinder((0.18, -0.32, 0.52), 0.08, 0.85, skin_mat, rot=(0.52, 0, 0), verts=10))
    # Váy đụp đen bay ngược về sau
    parts.append(add_cone((0.0, -0.06, 0.78), 0.42, 0.19, 0.82, vay_den_mat, rot=(0.24, 0, 0), verts=14))
    # Thân áo nâu rách chồm tới trước
    parts.append(add_cylinder((0.0, 0.12, 1.32), 0.21, 0.68, ao_nau_mat, rot=(-0.32, 0, 0), verts=12))
    # Tay phải vươn thẳng xé màn đêm, tay trái nắm chặt giữ lấy vạt áo/che chắn
    parts.append(add_cylinder((0.26, 0.42, 1.48), 0.06, 0.66, ao_nau_mat, rot=(math.pi * 0.36, 0, -0.25), verts=10))
    parts.append(add_cylinder((-0.24, 0.20, 1.24), 0.06, 0.56, ao_nau_mat, rot=(0.65, 0, 0.35), verts=10))
    # Đầu ngẩng cao hướng mặt về phía trước +Y, khăn mỏ quạ
    parts.append(add_cylinder((0.0, 0.28, 1.78), 0.125, 0.24, skin_mat, rot=(-0.15, 0, 0), verts=12))
    parts.append(add_cone((0.0, 0.25, 1.86), 0.16, 0.06, 0.22, khan_mat, rot=(0.25, 0, 0), verts=12))

    join_and_decimate(parts, "Chi_Dau_Phan_Khang", max_tris=4500)
    export_glb(os.path.join(OUT_DIR, "chi_dau_phankhang.glb"))


def main():
    build_portal_tatden()
    build_nha_chi_dau()
    build_dinh_dong_xa_nghi_que()
    build_chi_dau_phankhang()
    print("[TatDen Realm Assets] All 4 GLB models generated successfully.")


if __name__ == "__main__":
    main()
