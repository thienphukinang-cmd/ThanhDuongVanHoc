"""
Headless Blender Python script to generate 4 GLB 3D heritage & battlefield assets for:
  "Phòng Trưng Bày Nam Quốc Sơn Hà – Lý Thường Kiệt" & "Chiến Tuyến Sông Như Nguyệt"

Run via:
  blender --background --python scripts/generate_lythuongkiet_assets.py

Outputs to public/models/namquocsonha/:
  1. chieu_thu_nam_quoc.glb  - Golden silk imperial scroll on carved Ly dragon stand
  2. sa_ban_nhu_nguyet.glb   - Nhu Nguyet River tactical defense diorama (stakes, boats, camps)
  3. vu_khi_nha_ly.glb       - Ly dynasty weapon rack (truong dao, spears, tiger-mask shield, war drum)
  4. portal_nhu_nguyet.glb   - Truong Hong - Truong Hat river temple archway portal
"""

import os
import math
import random
import bpy
import bmesh
from mathutils import Vector

OUT_DIR = os.path.join("D:\\BaoTang3D", "public", "models", "namquocsonha")


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    return scene


def make_bsdf_material(
    name,
    base_color,
    roughness=0.55,
    metallic=0.0,
    emission=None,
    emission_strength=0.0,
    image_tex=None
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
        if image_tex is not None:
            tex_node = nodes.new(type='ShaderNodeTexImage')
            tex_node.image = image_tex
            tex_node.location = (-320, 260)
            links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def create_imperial_scroll_texture():
    """Create procedural golden silk & vermilion seal texture inside Blender."""
    w, h = 512, 256
    img = bpy.data.images.new(name="ChieuThuSilkTex", width=w, height=h, alpha=False)
    pixels = [0.0] * (w * h * 4)

    for y in range(h):
        ny = y / float(h - 1)
        for x in range(w):
            nx = x / float(w - 1)
            # Base warm imperial golden silk gradient with subtle woven shimmer
            wave = 0.03 * math.sin(nx * 45.0) * math.cos(ny * 28.0)
            edge_shade = 1.0 - 0.16 * (abs(nx - 0.5) * 1.4) ** 2
            r = min(1.0, max(0.0, (0.91 + wave) * edge_shade))
            g = min(1.0, max(0.0, (0.74 + wave * 0.8) * edge_shade))
            b = min(1.0, max(0.0, (0.31 + wave * 0.4) * edge_shade))

            # Double crimson & dark bronze border
            border_outer = (nx < 0.035 or nx > 0.965 or ny < 0.07 or ny > 0.93)
            border_inner = (0.048 < nx < 0.056 or 0.944 < nx < 0.952 or 0.10 < ny < 0.12 or 0.88 < ny < 0.90)
            if border_outer:
                r, g, b = 0.52, 0.10, 0.09
            elif border_inner:
                r, g, b = 0.32, 0.18, 0.05

            # Vermilion imperial seal box on left-bottom corner
            if 0.09 < nx < 0.19 and 0.18 < ny < 0.40:
                if nx < 0.102 or nx > 0.178 or ny < 0.205 or ny > 0.375 or (int(nx * 90 + ny * 90) % 3 == 0):
                    r, g, b = 0.72, 0.11, 0.09

            # Stylized calligraphy vertical ink column blocks (4 poem lines)
            for col_idx, cx in enumerate((0.30, 0.44, 0.58, 0.72)):
                if abs(nx - cx) < 0.024 and 0.20 < ny < 0.82:
                    gly = ((ny - 0.20) * 7.0) % 1.0
                    if 0.14 < gly < 0.82:
                        stroke_hash = math.sin((nx * 190.0) + col_idx * 3.1) * math.cos(ny * 150.0)
                        if stroke_hash > -0.15:
                            r, g, b = 0.14, 0.08, 0.04

            idx = (y * w + x) * 4
            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b
            pixels[idx + 3] = 1.0

    img.pixels.foreach_set(pixels)
    img.pack()
    return img


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
        ratio = max(0.12, (max_tris * 0.92) / tris)
        mod = joined.modifiers.new(name="AutoDecimate", type='DECIMATE')
        mod.decimate_type = 'COLLAPSE'
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)

    # Center X/Y and ground Z = 0 in Blender Z-up space (exports to Y-up via export_yup=True)
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
    print(f"[LyThuongKiet Assets] '{name}' final tris: {final_tris} (limit {max_tris})")
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
    print(f"[LyThuongKiet Assets] Exported {filepath} ({size_kb:.1f} KB)")


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


def add_uv_sphere(loc, radius, scale_xyz, mat, segs=12, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=radius, location=loc)
    obj = bpy.context.active_object
    obj.scale = scale_xyz
    bpy.ops.object.transform_apply(scale=True)
    assign_mat(obj, mat)
    return obj


def add_curved_eave_horn(loc, sign_x, sign_y, mat):
    """Ly-dynasty upturned roof eave horn using small stacked tapered segments."""
    objs = []
    for s in range(4):
        t = s / 3.0
        px = loc[0] + sign_x * (t * 0.42)
        py = loc[1] + sign_y * (t * 0.22)
        pz = loc[2] + (t ** 1.65) * 0.38
        w = 0.28 * (1.0 - t * 0.55)
        d = 0.22 * (1.0 - t * 0.55)
        objs.append(add_box((px, py, pz), (w, d, 0.10), mat, rot=(sign_y * -0.25 * t, sign_x * -0.45 * t, 0)))
    return objs


# =============================================================================
# 1. CHIEU_THU_NAM_QUOC.GLB: Cuộn chiếu thư lụa vàng đặt trên giá rồng thời Lý
# =============================================================================
def build_chieu_thu_nam_quoc():
    reset_scene()
    crimson_lacquer = make_bsdf_material("CrimsonLacquer", (0.54, 0.11, 0.11), roughness=0.28, metallic=0.18)
    imperial_gold = make_bsdf_material(
        "ImperialGold",
        (0.83, 0.68, 0.21),
        roughness=0.22,
        metallic=0.88,
        emission=(0.55, 0.42, 0.08),
        emission_strength=0.18
    )
    jade_mat = make_bsdf_material("ImperialJade", (0.14, 0.48, 0.36), roughness=0.25, metallic=0.1)
    silk_tex = create_imperial_scroll_texture()
    silk_mat = make_bsdf_material(
        "GoldenSilkScroll",
        (0.95, 0.85, 0.52),
        roughness=0.45,
        metallic=0.08,
        emission=(0.28, 0.20, 0.05),
        emission_strength=0.15,
        image_tex=silk_tex
    )
    vermilion_mat = make_bsdf_material("VermilionSeal", (0.72, 0.10, 0.09), roughness=0.5)
    dark_wood = make_bsdf_material("LimWoodBase", (0.14, 0.08, 0.05), roughness=0.45)

    parts = []

    # 1. Đế giá rồng giật cấp sơn son thếp vàng (Z: 0 -> 0.24)
    parts.append(add_box((0, 0, 0.05), (1.76, 0.86, 0.10), dark_wood))
    parts.append(add_box((0, 0, 0.14), (1.62, 0.72, 0.08), crimson_lacquer))
    parts.append(add_box((0, 0, 0.19), (1.68, 0.76, 0.03), imperial_gold))

    # 2. Hai trụ giá đỡ chạm rồng thời Lý uốn lượn hai bên (X = ±0.58)
    for sx in (-0.58, 0.58):
        # Chân trụ hình cánh sen
        parts.append(add_box((sx, 0.0, 0.30), (0.18, 0.56, 0.18), crimson_lacquer))
        # Thân rồng uốn hình chữ S nâng đỡ bệ nghiêng
        for seg in range(7):
            u = seg / 6.0
            sy = -0.18 + u * 0.36
            sz = 0.38 + math.sin(u * math.pi) * 0.28 + u * 0.22
            r_seg = 0.055 * (1.0 - 0.2 * u)
            parts.append(add_uv_sphere((sx, sy, sz), r_seg, (1.0, 1.35, 1.15), imperial_gold, segs=10, rings=7))
        # Đầu rồng thời Lý hướng về phía trước (+Y) với mào lửa uốn cong
        parts.append(add_box((sx, -0.24, 0.54), (0.11, 0.20, 0.12), imperial_gold, rot=(0.35, 0, 0)))
        parts.append(add_cone((sx, -0.32, 0.64), 0.045, 0.008, 0.18, imperial_gold, rot=(-0.55, 0, 0), verts=8))
        # Đuôi rồng vút lên phía sau (-Y)
        parts.append(add_cone((sx, 0.24, 0.80), 0.05, 0.01, 0.22, imperial_gold, rot=(0.45, 0, 0), verts=8))

    # Thanh xà ngang nối 2 giá rồng
    parts.append(add_cylinder((0, -0.02, 0.48), 0.036, 1.24, crimson_lacquer, rot=(0, math.pi / 2, 0), verts=10))
    parts.append(add_cylinder((0, 0.16, 0.64), 0.036, 1.24, crimson_lacquer, rot=(0, math.pi / 2, 0), verts=10))

    # 3. Tấm lụa vàng trải nghiêng (góc ~30 độ ngửa mặt hướng về -Y trong Blender = +Z phía người xem trong Three.js)
    tilt_rad = 0.52
    scroll_center = Vector((0, 0.02, 0.62))
    surf_normal = Vector((0, -math.sin(tilt_rad), math.cos(tilt_rad)))

    # Khung đỡ lụa sơn son
    parts.append(add_box((0, 0.02, 0.60), (1.34, 0.72, 0.035), crimson_lacquer, rot=(tilt_rad, 0, 0)))

    # Bề mặt cuộn chiếu thư lụa vàng (dùng plane subdivided uốn nhẹ 2 mép)
    bm = bmesh.new()
    nx_segs, ny_segs = 18, 10
    w_scr, h_scr = 1.28, 0.68
    verts_grid = []
    for j in range(ny_segs + 1):
        row = []
        v = j / float(ny_segs)
        ly = (v - 0.5) * h_scr
        for i in range(nx_segs + 1):
            u = i / float(nx_segs)
            lx = (u - 0.5) * w_scr
            # Soft silk wave + curled margins near left/right rollers
            curl = 0.022 * math.sin(u * math.pi * 3.0) + 0.03 * (abs(u - 0.5) * 2.0) ** 3
            lz = curl
            # Rotate by tilt_rad around X
            ry = ly * math.cos(tilt_rad) - lz * math.sin(tilt_rad)
            rz = ly * math.sin(tilt_rad) + lz * math.cos(tilt_rad)
            vert = bm.verts.new((lx, scroll_center.y + ry, scroll_center.z + 0.028 + rz))
            row.append((vert, u, v))
        verts_grid.append(row)

    uv_layer = bm.loops.layers.uv.new("UVMap")
    for j in range(ny_segs):
        for i in range(nx_segs):
            v00, u00, w00 = verts_grid[j][i]
            v10, u10, w10 = verts_grid[j][i + 1]
            v11, u11, w11 = verts_grid[j + 1][i + 1]
            v01, u01, w01 = verts_grid[j + 1][i]
            face = bm.faces.new((v00, v10, v11, v01))
            uvs = ((u00, w00), (u10, w10), (u11, w11), (u01, w01))
            for loop, uv in zip(face.loops, uvs):
                loop[uv_layer].uv = uv

    mesh_scroll = bpy.data.meshes.new("GoldenScrollSilkMesh")
    bm.to_mesh(mesh_scroll)
    bm.free()
    scroll_obj = bpy.data.objects.new("GoldenScrollSilk", mesh_scroll)
    bpy.context.collection.objects.link(scroll_obj)
    assign_mat(scroll_obj, silk_mat)
    parts.append(scroll_obj)

    # 4. Hai trục cuộn tròn 2 bên chiếu thư bọc ngọc & vàng (X = ±0.66)
    for sx in (-0.66, 0.66):
        parts.append(add_cylinder((sx, scroll_center.y, scroll_center.z + 0.02), 0.055, 0.78, silk_mat, rot=(math.pi / 2 + tilt_rad, 0, 0), verts=16))
        # Hai đầu bịt ngọc & vàng nhô ra khỏi cuộn lụa
        for end_s in (-0.43, 0.43):
            ey = scroll_center.y + end_s * math.cos(tilt_rad)
            ez = scroll_center.z + 0.02 + end_s * math.sin(tilt_rad)
            parts.append(add_cylinder((sx, ey, ez), 0.042, 0.11, jade_mat, rot=(math.pi / 2 + tilt_rad, 0, 0), verts=12))
            parts.append(add_cylinder((sx, ey + math.copysign(0.05, end_s) * math.cos(tilt_rad), ez + math.copysign(0.05, end_s) * math.sin(tilt_rad)), 0.048, 0.035, imperial_gold, rot=(math.pi / 2 + tilt_rad, 0, 0), verts=12))

    # 5. Ấn triện Thiên Thư nổi 3D & dải nẹp vàng đầu chiếu
    seal_pos = scroll_center + surf_normal * 0.038 + Vector((-0.44, -0.15 * math.cos(tilt_rad), -0.15 * math.sin(tilt_rad)))
    bar_pos = scroll_center + surf_normal * 0.038 + Vector((0.0, 0.25 * math.cos(tilt_rad), 0.25 * math.sin(tilt_rad)))
    parts.append(add_box(tuple(seal_pos), (0.14, 0.14, 0.018), vermilion_mat, rot=(tilt_rad, 0, 0)))
    parts.append(add_box(tuple(bar_pos), (0.34, 0.06, 0.025), imperial_gold, rot=(tilt_rad, 0, 0)))

    join_and_decimate(parts, "Chieu_Thu_Nam_Quoc", max_tris=9500)
    export_glb(os.path.join(OUT_DIR, "chieu_thu_nam_quoc.glb"))


# =============================================================================
# 2. SA_BAN_NHU_NGUYET.GLB: Sa bàn chiến thuật phòng tuyến sông Như Nguyệt
# =============================================================================
def build_sa_ban_nhu_nguyet():
    reset_scene()
    rng = random.Random(1077)
    frame_wood = make_bsdf_material("DioramaLacquerFrame", (0.48, 0.10, 0.09), roughness=0.35, metallic=0.15)
    gold_trim = make_bsdf_material("DioramaGoldTrim", (0.83, 0.68, 0.21), roughness=0.25, metallic=0.86)
    river_mat = make_bsdf_material("NhuNguyetRiver", (0.04, 0.14, 0.26), roughness=0.15, metallic=0.35, emission=(0.02, 0.08, 0.16), emission_strength=0.45)
    south_bank = make_bsdf_material("SouthBankEarth", (0.16, 0.20, 0.12), roughness=0.88)
    north_bank = make_bsdf_material("NorthBankRock", (0.14, 0.15, 0.18), roughness=0.90)
    stake_wood = make_bsdf_material("WoodenStake", (0.26, 0.17, 0.09), roughness=0.82)
    boat_wood = make_bsdf_material("WarBoatHull", (0.28, 0.15, 0.07), roughness=0.65)
    sail_red = make_bsdf_material("DaiVietSail", (0.68, 0.14, 0.12), roughness=0.72)
    camp_tent = make_bsdf_material("CommandCamp", (0.62, 0.48, 0.24), roughness=0.75)

    parts = []

    # 1. Khung bệ sa bàn hình chữ nhật chạm chỉ vàng (2.4m x 1.6m)
    parts.append(add_box((0, 0, 0.06), (2.42, 1.62, 0.12), frame_wood))
    parts.append(add_box((0, 0, 0.13), (2.46, 1.66, 0.03), gold_trim))

    # 2. Lòng sông Như Nguyệt uốn lượn chính giữa
    parts.append(add_box((0, 0, 0.145), (2.28, 1.48, 0.02), river_mat))

    # 3. Bờ Nam (phòng tuyến Đại Việt, Y < -0.15) & Bờ Bắc (núi đất phía Bắc, Y > +0.25)
    for ix in range(14):
        x = -1.04 + ix * 0.16
        meander = math.sin(x * 2.2) * 0.12
        # Bờ Nam có lũy đất đắp cao
        south_len = 0.55 + meander
        parts.append(add_box((x, -0.74 + south_len * 0.5, 0.19), (0.17, south_len, 0.09), south_bank))
        # Lũy phòng thủ đất đắp (rampart ridge)
        parts.append(add_box((x, -0.34 + meander, 0.26), (0.17, 0.18, 0.11), south_bank))

        # Bờ Bắc đồi núi trùng điệp
        north_len = 0.48 - meander * 0.7
        parts.append(add_box((x, 0.74 - north_len * 0.5, 0.19), (0.17, north_len, 0.09), north_bank))
        if ix % 2 == 0:
            peak_h = 0.18 + rng.random() * 0.16
            parts.append(add_cone((x, 0.56 - meander * 0.3, 0.23 + peak_h * 0.5), 0.14, 0.03, peak_h, north_bank, verts=7))

    # 4. Hàng cọc gỗ nhọn đóng dày dọc phòng tuyến bờ Nam cắm chéo về phía sông (+Y)
    for row in range(2):
        for i in range(18):
            sx = -1.02 + i * 0.12 + (row * 0.05)
            meander = math.sin(sx * 2.2) * 0.12
            sy = -0.18 + meander - row * 0.09
            parts.append(add_cone((sx, sy, 0.23), 0.016, 0.002, 0.19, stake_wood, rot=(-0.45, 0, 0), verts=6))

    # 5. Doanh trại & Chòi canh chỉ huy Đại Việt ở bờ Nam
    camp_positions = [(-0.68, -0.52), (-0.15, -0.56), (0.45, -0.50), (0.82, -0.48)]
    for cx, cy in camp_positions:
        # Lều trại chóp nhọn
        parts.append(add_cone((cx, cy, 0.31), 0.12, 0.015, 0.18, camp_tent, verts=4))
        # Cọc cờ nhỏ chỉ huy
        parts.append(add_cylinder((cx + 0.08, cy + 0.04, 0.36), 0.006, 0.26, gold_trim, verts=6))
        parts.append(add_box((cx + 0.12, cy + 0.04, 0.45), (0.07, 0.006, 0.055), sail_red))

    # Chòi canh gỗ 2 tầng trung tâm bờ Nam
    parts.append(add_box((0.12, -0.45, 0.32), (0.16, 0.16, 0.18), stake_wood))
    parts.append(add_cone((0.12, -0.45, 0.46), 0.15, 0.015, 0.12, frame_wood, rot=(0, 0, math.pi / 4), verts=4))

    # 6. Đội 5 chiến thuyền Đại Việt tuần tra trên mặt sông
    boats = [(-0.75, 0.04, 0.12), (-0.32, 0.12, -0.08), (0.08, -0.01, 0.18), (0.50, 0.08, -0.14), (0.85, 0.02, 0.08)]
    for bx, by, rot_z in boats:
        # Thân thuyền mũi nhọn
        parts.append(add_box((bx, by, 0.175), (0.24, 0.075, 0.055), boat_wood, rot=(0, 0, rot_z)))
        parts.append(add_cone((bx + math.cos(rot_z) * 0.14, by + math.sin(rot_z) * 0.14, 0.185), 0.036, 0.005, 0.08, gold_trim, rot=(0, math.pi / 2, rot_z), verts=6))
        # Cột buồm & cánh buồm đỏ son
        parts.append(add_cylinder((bx, by, 0.29), 0.006, 0.22, stake_wood, verts=6))
        parts.append(add_box((bx + 0.015, by, 0.30), (0.01, 0.13, 0.15), sail_red, rot=(0, 0, rot_z)))

    join_and_decimate(parts, "Sa_Ban_Nhu_Nguyet", max_tris=12000)
    export_glb(os.path.join(OUT_DIR, "sa_ban_nhu_nguyet.glb"))


# =============================================================================
# 3. VU_KHI_NHA_LY.GLB: Giá trưng bày trường đao, giáo mác, khiên mây hổ phù & trống trận
# =============================================================================
def build_vu_khi_nha_ly():
    reset_scene()
    crimson_wood = make_bsdf_material("WeaponRackCrimson", (0.50, 0.10, 0.10), roughness=0.35, metallic=0.15)
    dark_wood = make_bsdf_material("PoleWood", (0.22, 0.12, 0.06), roughness=0.68)
    steel_mat = make_bsdf_material("ForgedSteel", (0.76, 0.80, 0.85), roughness=0.22, metallic=0.92)
    gold_mat = make_bsdf_material("RoyalGold", (0.83, 0.68, 0.21), roughness=0.24, metallic=0.88)
    rattan_mat = make_bsdf_material("WovenRattan", (0.58, 0.43, 0.22), roughness=0.80)
    drum_skin = make_bsdf_material("DrumParchment", (0.82, 0.72, 0.52), roughness=0.72)

    parts = []

    # 1. Đế giá binh khí giật cấp (Z: 0 -> 0.16)
    parts.append(add_box((0, 0, 0.05), (2.25, 0.78, 0.10), dark_wood))
    parts.append(add_box((-0.25, 0, 0.13), (1.55, 0.56, 0.06), crimson_wood))

    # 2. Khung giá gỗ sơn son chạm đầu rồng (trái-giữa: X from -0.95 to +0.45)
    for px in (-0.90, 0.40):
        parts.append(add_box((px, 0, 1.02), (0.10, 0.12, 1.78), crimson_wood))
        parts.append(add_box((px, 0, 0.20), (0.18, 0.36, 0.14), gold_mat))
        # Đầu rồng vàng ở 2 đầu xà ngang trên cùng
        sign = -1 if px < 0 else 1
        parts.append(add_cone((px + sign * 0.16, 0, 1.88), 0.065, 0.012, 0.26, gold_mat, rot=(0, sign * -1.25, 0), verts=8))

    # Thanh xà ngang đỡ vũ khí
    parts.append(add_box((-0.25, 0, 1.84), (1.68, 0.11, 0.12), crimson_wood))
    parts.append(add_box((-0.25, 0, 0.92), (1.36, 0.08, 0.08), crimson_wood))
    parts.append(add_box((-0.25, 0, 0.28), (1.36, 0.18, 0.06), gold_mat))

    # 3. Trường đao & Giáo mác thời Lý dựng trên giá (4 cây đứng: 2 trường đao + 2 giáo dài)
    # 2 Trường đao ở giữa trái
    for kx in (-0.68, -0.46):
        parts.append(add_cylinder((kx, 0.02, 1.05), 0.022, 1.72, dark_wood, verts=8))
        # Chuôi bảo vệ đồng vàng
        parts.append(add_cylinder((kx, 0.02, 1.76), 0.052, 0.04, gold_mat, verts=10))
        # Lưỡi trường đao cong sắc bén
        parts.append(add_box((kx + 0.018, 0.02, 2.02), (0.075, 0.016, 0.52), steel_mat, rot=(0, -0.08, 0)))
        parts.append(add_cone((kx + 0.04, 0.02, 2.31), 0.042, 0.005, 0.16, steel_mat, rot=(0, -0.25, 0), verts=6))

    # 2 Ngọn giáo mác ở phía bên phải giá
    for sx in (0.04, 0.22):
        parts.append(add_cylinder((sx, 0.02, 1.12), 0.02, 1.86, dark_wood, verts=8))
        parts.append(add_cylinder((sx, 0.02, 1.98), 0.036, 0.06, gold_mat, verts=8))
        parts.append(add_cone((sx, 0.02, 2.18), 0.048, 0.003, 0.36, steel_mat, verts=6))
        # Tua đỏ cổ giáo
        parts.append(add_cone((sx, 0.02, 1.92), 0.055, 0.022, 0.14, crimson_wood, verts=8))

    # 4. Khiên mây tròn chạm Hổ Phù đặt chính giữa giá (X = -0.23, Y = -0.14, Z = 0.96)
    shield_x, shield_y, shield_z = -0.23, -0.15, 0.96
    parts.append(add_cylinder((shield_x, shield_y, shield_z), 0.36, 0.045, rattan_mat, rot=(math.pi / 2, 0, 0), verts=20))
    # Vành đồng viền khiên
    parts.append(add_cylinder((shield_x, shield_y - 0.01, shield_z), 0.37, 0.028, gold_mat, rot=(math.pi / 2, 0, 0), verts=20))
    parts.append(add_cylinder((shield_x, shield_y - 0.022, shield_z), 0.26, 0.022, crimson_wood, rot=(math.pi / 2, 0, 0), verts=18))
    # Chạm Hổ Phù 3D chính giữa khiên
    parts.append(add_uv_sphere((shield_x, shield_y - 0.04, shield_z), 0.11, (1.1, 0.55, 1.1), gold_mat, segs=12, rings=8))
    for side in (-1, 1):
        parts.append(add_uv_sphere((shield_x + side * 0.065, shield_y - 0.075, shield_z + 0.035), 0.026, (1.2, 0.7, 0.8), crimson_wood, segs=8, rings=6))
        parts.append(add_box((shield_x + side * 0.07, shield_y - 0.07, shield_z + 0.08), (0.06, 0.02, 0.025), gold_mat, rot=(0, side * 0.4, 0)))

    # 5. Trống Trận sơn son thếp vàng đặt trên giá gỗ bên phải (X = +0.78)
    drum_x = 0.78
    # Giá chân chữ X đỡ trống trận
    for lx in (-0.18, 0.18):
        parts.append(add_box((drum_x + lx, 0, 0.32), (0.055, 0.48, 0.06), dark_wood))
        parts.append(add_box((drum_x + lx, 0, 0.48), (0.05, 0.06, 0.46), crimson_wood, rot=(0.45, 0, 0)))
        parts.append(add_box((drum_x + lx, 0, 0.48), (0.05, 0.06, 0.46), crimson_wood, rot=(-0.45, 0, 0)))
    # Tang trống sơn son phình giữa
    parts.append(add_cylinder((drum_x, 0, 0.62), 0.26, 0.44, crimson_wood, rot=(math.pi / 2, 0, 0), verts=18))
    parts.append(add_cylinder((drum_x, 0, 0.62), 0.27, 0.12, gold_mat, rot=(math.pi / 2, 0, 0), verts=18))
    # Hai mặt da trống
    parts.append(add_cylinder((drum_x, -0.225, 0.62), 0.22, 0.02, drum_skin, rot=(math.pi / 2, 0, 0), verts=18))
    parts.append(add_cylinder((drum_x, 0.225, 0.62), 0.22, 0.02, drum_skin, rot=(math.pi / 2, 0, 0), verts=18))
    # Đinh tán đồng quanh tang trống
    for i in range(10):
        ang = (i / 10.0) * math.pi * 2
        parts.append(add_uv_sphere((drum_x + math.cos(ang) * 0.24, -0.18, 0.62 + math.sin(ang) * 0.24), 0.014, (1, 1, 1), gold_mat, segs=6, rings=5))

    join_and_decimate(parts, "Vu_Khi_Nha_Ly", max_tris=12000)
    export_glb(os.path.join(OUT_DIR, "vu_khi_nha_ly.glb"))


# =============================================================================
# 4. PORTAL_NHU_NGUYET.GLB: Cổng dịch chuyển kiến trúc Đền Trương Hống - Trương Hát
# =============================================================================
def build_portal_nhu_nguyet():
    reset_scene()
    stone_mat = make_bsdf_material("LyBlueStone", (0.14, 0.18, 0.25), roughness=0.80, metallic=0.08)
    crimson_col = make_bsdf_material("LyCrimsonLacquer", (0.55, 0.11, 0.11), roughness=0.30, metallic=0.18)
    gold_mat = make_bsdf_material(
        "LyImperialGold",
        (0.84, 0.69, 0.21),
        roughness=0.22,
        metallic=0.88,
        emission=(0.62, 0.45, 0.08),
        emission_strength=0.28
    )
    roof_tile = make_bsdf_material("LyGlazedRoofTile", (0.18, 0.08, 0.08), roughness=0.45, metallic=0.15)
    lantern_glow = make_bsdf_material("ShrineLanternGlow", (1.0, 0.78, 0.28), roughness=0.2, emission=(1.0, 0.74, 0.20), emission_strength=3.2)

    parts = []

    # 1. Nền đá xanh tam cấp hai bên cổng (chừa lối bước qua giữa X in [-1.5, 1.5])
    for sx in (-2.05, 2.05):
        parts.append(add_box((sx, 0, 0.16), (1.35, 1.55, 0.32), stone_mat))
        parts.append(add_box((sx, 0, 0.38), (1.10, 1.25, 0.14), gold_mat))
        # Chân tảng đá chạm sen
        parts.append(add_cylinder((sx, -0.35, 0.56), 0.32, 0.22, stone_mat, verts=10))
        parts.append(add_cylinder((sx, 0.35, 0.56), 0.32, 0.22, stone_mat, verts=10))

        # Cặp cột gỗ sơn son thếp vàng hai bên cổng
        for sy in (-0.35, 0.35):
            parts.append(add_cylinder((sx, sy, 2.25), 0.21, 3.25, crimson_col, verts=14))
            # Đai đồng vàng quanh thân cột
            for hz in (0.85, 2.20, 3.65):
                parts.append(add_cylinder((sx, sy, hz), 0.235, 0.14, gold_mat, verts=14))

    # Thềm bậc thấp ở giữa để bước qua dễ dàng
    parts.append(add_box((0, 0, 0.05), (3.1, 1.45, 0.10), stone_mat))

    # 2. Xà ngang sơn son + Vòm đao chạm rồng & vân mây thời Lý
    parts.append(add_box((0, 0, 3.92), (5.5, 1.10, 0.36), crimson_col))
    parts.append(add_box((0, 0, 3.72), (5.6, 1.16, 0.08), gold_mat))

    # Vòm cung vàng bên trong khe cổng mở
    arch_segs = 11
    for i in range(arch_segs):
        t = i / (arch_segs - 1)
        ang = math.pi * t
        ax = math.cos(ang) * 1.48
        az = 2.65 + math.sin(ang) * 1.15
        parts.append(add_box((ax, 0, az), (0.34, 0.26, 0.22), gold_mat, rot=(0, ang - math.pi / 2, 0)))

    # 3. Mái đao cong 2 tầng thời Lý (Tầng hạ & Tầng thượng)
    # Tầng hạ
    parts.append(add_box((0, 0, 4.30), (6.3, 1.75, 0.22), roof_tile))
    parts.append(add_box((0, 0.56, 4.20), (6.3, 0.72, 0.16), roof_tile, rot=(-0.22, 0, 0)))
    parts.append(add_box((0, -0.56, 4.20), (6.3, 0.72, 0.16), roof_tile, rot=(0.22, 0, 0)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.extend(add_curved_eave_horn((sx * 3.05, sy * 0.72, 4.24), sx, sy, gold_mat))

    # Cổ diêm & Tầng thượng
    parts.append(add_box((0, 0, 4.65), (4.1, 1.05, 0.48), crimson_col))
    parts.append(add_box((0, -0.56, 4.65), (2.2, 0.08, 0.38), gold_mat))  # Hoành phi đền thần mặt trước
    parts.append(add_box((0, 0, 5.05), (4.8, 1.45, 0.20), roof_tile))
    parts.append(add_box((0, 0.44, 4.97), (4.8, 0.58, 0.15), roof_tile, rot=(-0.24, 0, 0)))
    parts.append(add_box((0, -0.44, 4.97), (4.8, 0.58, 0.15), roof_tile, rot=(0.24, 0, 0)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.extend(add_curved_eave_horn((sx * 2.30, sy * 0.58, 5.00), sx, sy, gold_mat))

    # Bờ nóc & Lưỡng long chầu mặt nhật / lá đề thời Lý trên đỉnh mái
    parts.append(add_box((0, 0, 5.26), (3.8, 0.22, 0.18), gold_mat))
    # Lá đề / viên minh châu chính giữa đỉnh nóc
    parts.append(add_cylinder((0, 0, 5.52), 0.20, 0.09, gold_mat, rot=(math.pi / 2, 0, 0), verts=14))
    parts.append(add_uv_sphere((0, 0, 5.52), 0.11, (1, 1, 1), lantern_glow, segs=10, rings=8))
    # Hai rồng chầu hai bên đỉnh nóc
    for sx in (-0.82, 0.82):
        parts.append(add_box((sx, 0, 5.44), (0.68, 0.14, 0.16), gold_mat, rot=(0, -sx * 0.22, 0)))
        parts.append(add_cone((sx * 0.65, 0, 5.54), 0.07, 0.01, 0.20, gold_mat, rot=(0, sx * 0.7, 0), verts=8))

    # 4. Đèn lồng đền thần phát sáng treo 2 bên cổng
    for sx in (-1.22, 1.22):
        parts.append(add_cylinder((sx, -0.45, 3.45), 0.02, 0.48, gold_mat, verts=8))
        parts.append(add_cylinder((sx, -0.45, 3.16), 0.14, 0.24, lantern_glow, verts=10))
        parts.append(add_cone((sx, -0.45, 3.32), 0.20, 0.04, 0.12, crimson_col, verts=10))

    join_and_decimate(parts, "Portal_Nhu_Nguyet", max_tris=12000)
    export_glb(os.path.join(OUT_DIR, "portal_nhu_nguyet.glb"))


def main():
    build_chieu_thu_nam_quoc()
    build_sa_ban_nhu_nguyet()
    build_vu_khi_nha_ly()
    build_portal_nhu_nguyet()
    print("[LyThuongKiet Assets] All 4 GLB models generated successfully.")


if __name__ == "__main__":
    main()
