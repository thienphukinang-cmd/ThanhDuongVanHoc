"""
Headless Blender Python script to generate 3 GLB heritage & portal assets for Room 101 ("Thánh Gióng"):
  1. public/models/thanhgiong/dau_chan_va_nia_tre.glb
  2. public/models/thanhgiong/vu_khi_sat_va_loa_su_gia.glb
  3. public/models/thanhgiong/portal_soc_son.glb

Run via:
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --python scripts/generate_thanhgiong_assets.py
"""

import math
import os
import random
import bpy
import bmesh
from mathutils import Vector

OUT_DIR = os.path.join("D:\\BaoTang3D", "public", "models", "thanhgiong")


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    return scene


def ensure_uv(obj):
    if obj.type != "MESH" or len(obj.data.uv_layers) > 0:
        return
    me = obj.data
    uv_layer = me.uv_layers.new(name="UVMap")
    min_x = min((v.co.x for v in me.vertices), default=-0.5)
    max_x = max((v.co.x for v in me.vertices), default=0.5)
    min_y = min((v.co.y for v in me.vertices), default=-0.5)
    max_y = max((v.co.y for v in me.vertices), default=0.5)
    min_z = min((v.co.z for v in me.vertices), default=-0.5)
    max_z = max((v.co.z for v in me.vertices), default=0.5)
    dx = max(0.001, max_x - min_x)
    dy = max(0.001, max_y - min_y)
    dz = max(0.001, max_z - min_z)
    for poly in me.polygons:
        n = poly.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if az >= ax and az >= ay:
                u = (co.x - min_x) / dx
                v = (co.y - min_y) / dy
            elif ax >= ay:
                u = (co.y - min_y) / dy
                v = (co.z - min_z) / dz
            else:
                u = (co.x - min_x) / dx
                v = (co.z - min_z) / dz
            uv_layer.data[li].uv = (u, v)


def make_bsdf_material(
    name,
    base_color,
    roughness=0.55,
    metallic=0.0,
    emission=None,
    emission_strength=0.0,
    image_tex=None,
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
            tex_node = nodes.new(type="ShaderNodeTexImage")
            tex_node.image = image_tex
            tex_node.location = (-320, 240)
            links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def assign_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


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


def add_torus(loc, major_r, minor_r, mat, rot=(0, 0, 0), major_segs=20, minor_segs=8):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=major_segs,
        minor_segments=minor_segs,
        major_radius=major_r,
        minor_radius=minor_r,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.active_object
    assign_mat(obj, mat)
    return obj


def tri_count_of_objects(objs):
    total = 0
    for obj in objs:
        if obj.type != "MESH":
            continue
        obj.data.calc_loop_triangles()
        total += len(obj.data.loop_triangles)
    return total


def finalize_and_export(objs, name, filepath, max_tris=10000, preserve_ground_y0=True):
    mesh_objs = [o for o in objs if o.type == "MESH"]
    for o in mesh_objs:
        ensure_uv(o)

    bpy.ops.object.select_all(action="DESELECT")
    for o in mesh_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objs[0]
    if len(mesh_objs) > 1:
        bpy.ops.object.join()

    joined = bpy.context.view_layer.objects.active
    joined.name = name

    tris = tri_count_of_objects([joined])
    if tris > max_tris:
        ratio = max(0.20, (max_tris * 0.92) / float(tris))
        mod = joined.modifiers.new(name="AutoDecimate", type="DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=mod.name)

    bpy.context.view_layer.update()
    corners = [joined.matrix_world @ Vector(c) for c in joined.bound_box]
    min_x = min(v.x for v in corners)
    max_x = max(v.x for v in corners)
    min_y = min(v.y for v in corners)
    max_y = max(v.y for v in corners)
    min_z = min(v.z for v in corners)
    max_z = max(v.z for v in corners)

    joined.location.x -= (min_x + max_x) * 0.5
    joined.location.y -= (min_y + max_y) * 0.5
    if preserve_ground_y0:
        joined.location.z -= min_z
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    for v in joined.data.vertices:
        assert all(math.isfinite(c) for c in v.co), f"Non-finite vertex in {name}"

    final_tris = tri_count_of_objects([joined])
    print(
        f"[ThanhGiong Assets] '{name}' tris={final_tris}/{max_tris}, "
        f"size=({max_x - min_x:.2f} x {max_y - min_y:.2f} x {max_z - min_z:.2f})m"
    )

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=88,
        export_animations=False,
    )
    print(f"[ThanhGiong Assets] Exported {filepath} ({os.path.getsize(filepath) / 1024.0:.1f} KB)")
    return joined


def create_basalt_footprint_texture():
    w, h = 256, 256
    img = bpy.data.images.new(name="BasaltFootprintTex", width=w, height=h, alpha=False)
    pixels = [0.0] * (w * h * 4)
    for y in range(h):
        ny = y / float(h - 1)
        for x in range(w):
            nx = x / float(w - 1)
            grain = 0.04 * math.sin(nx * 54.0 + ny * 32.0) + 0.03 * math.cos(nx * 96.0 - ny * 72.0)
            # Subtle mossy tint around edges and weathered granite-basalt base
            edge_moss = max(0.0, (abs(nx - 0.5) * 2.0 - 0.65) * 0.45 + (abs(ny - 0.5) * 2.0 - 0.65) * 0.45)
            r = min(1.0, max(0.0, 0.22 + grain - edge_moss * 0.08))
            g = min(1.0, max(0.0, 0.23 + grain + edge_moss * 0.14))
            b = min(1.0, max(0.0, 0.21 + grain - edge_moss * 0.06))
            idx = (y * w + x) * 4
            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def create_woven_bamboo_texture():
    w, h = 256, 256
    img = bpy.data.images.new(name="WovenBambooTex", width=w, height=h, alpha=False)
    pixels = [0.0] * (w * h * 4)
    for y in range(h):
        for x in range(w):
            cx = (x // 16) % 2
            cy = (y // 16) % 2
            fx = (x % 16) / 16.0
            fy = (y % 16) / 16.0
            is_warp = (cx ^ cy) == 0
            strip_shade = math.sin((fy if is_warp else fx) * math.pi)
            base = 0.55 + 0.22 * strip_shade
            r = min(1.0, base * 1.08)
            g = min(1.0, base * 0.86)
            b = min(1.0, base * 0.42)
            idx = (y * w + x) * 4
            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def create_temple_plaque_texture():
    w, h = 256, 128
    img = bpy.data.images.new(name="PhuDongPlaqueTex", width=w, height=h, alpha=False)
    pixels = [0.0] * (w * h * 4)
    for y in range(h):
        ny = y / float(h - 1)
        for x in range(w):
            nx = x / float(w - 1)
            r, g, b = 0.46, 0.08, 0.07
            if nx < 0.05 or nx > 0.95 or ny < 0.10 or ny > 0.90:
                r, g, b = 0.85, 0.68, 0.22
            elif (0.08 < nx < 0.10 or 0.90 < nx < 0.92 or 0.16 < ny < 0.20 or 0.80 < ny < 0.84):
                r, g, b = 0.72, 0.55, 0.16
            else:
                # Stylized golden Ngoc Lu sun medallion in center
                dx = (nx - 0.5) * 2.0
                dy = ny - 0.5
                dist = math.sqrt(dx * dx + dy * dy)
                ang = math.atan2(dy, dx)
                if dist < 0.24 or (0.24 <= dist < 0.36 and math.cos(ang * 12.0) > 0.35):
                    r, g, b = 0.92, 0.75, 0.24
            idx = (y * w + x) * 4
            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b
            pixels[idx + 3] = 1.0
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


# =============================================================================
# 1. DAU_CHAN_VA_NIA_TRE.GLB: Bàn chân khổng lồ trên đá cổ, nia tre, 7 nong cơm & 3 nong cà
# =============================================================================
def build_dau_chan_va_nia_tre():
    reset_scene()
    basalt_tex = create_basalt_footprint_texture()
    woven_tex = create_woven_bamboo_texture()

    basalt_mat = make_bsdf_material("AncientBasalt", (0.26, 0.26, 0.25), roughness=0.90, image_tex=basalt_tex)
    footprint_dark_mat = make_bsdf_material("FootprintImprint", (0.14, 0.15, 0.13), roughness=0.94)
    bamboo_mat = make_bsdf_material("WovenBamboo", (0.76, 0.60, 0.28), roughness=0.72, image_tex=woven_tex)
    bamboo_rim_mat = make_bsdf_material("BambooRim", (0.58, 0.41, 0.16), roughness=0.62)
    terracotta_mat = make_bsdf_material("VillageBowl", (0.50, 0.24, 0.14), roughness=0.68)
    rice_mat = make_bsdf_material("SteamedRice", (0.95, 0.93, 0.85), roughness=0.82)
    eggplant_mat = make_bsdf_material("PickledEggplant", (0.48, 0.24, 0.42), roughness=0.36)

    parts = []

    # 1. Phiến đá bazan cổ khổng lồ có vết bàn chân lún sâu (x: -0.45..+0.45, y: -0.60..+0.60)
    bm = bmesh.new()
    nx, ny = 30, 36
    slab_w, slab_d, slab_h = 1.38, 1.48, 0.30
    verts_top = []
    verts_bot = []

    # Định nghĩa vùng lún bàn chân khổng lồ trên mặt đá (gót ở y=-0.34, mũi ở y=+0.15, 5 ngón chân)
    toes = [
        (-0.14, 0.34, 0.082),  # ngón cái to
        (-0.04, 0.37, 0.062),
        (0.05, 0.35, 0.056),
        (0.13, 0.31, 0.050),
        (0.20, 0.26, 0.044),
    ]

    for j in range(ny + 1):
        row_t, row_b = [], []
        v_norm = j / float(ny)
        py = (v_norm - 0.5) * slab_d
        for i in range(nx + 1):
            u_norm = i / float(nx)
            px = (u_norm - 0.5) * slab_w
            # Rugged stone silhouette edge jitter
            edge_r = max(abs(u_norm - 0.5) * 2.0, abs(v_norm - 0.5) * 2.0)
            ridge = 0.016 * math.sin(px * 9.0 + py * 7.0) + 0.010 * math.cos(px * 17.0 - py * 13.0)
            bevel = max(0.0, edge_r - 0.80) * 0.25

            # Footprint depression math
            fx = px + 0.12  # shift footprint slightly left on slab
            depth_foot = 0.0
            # Heel pocket
            d_heel = ((fx - 0.02) / 0.16) ** 2 + ((py + 0.32) / 0.18) ** 2
            if d_heel < 1.0:
                depth_foot = max(depth_foot, (1.0 - d_heel) * 0.105)
            # Forefoot ball & arch
            d_ball = ((fx - 0.0) / 0.21) ** 2 + ((py - 0.08) / 0.22) ** 2
            if d_ball < 1.0:
                depth_foot = max(depth_foot, (1.0 - d_ball) * 0.11)
            # Midsole bridge
            if -0.25 < py < 0.05 and -0.11 < fx < 0.16:
                arch_factor = 1.0 - ((fx - 0.03) / 0.15) ** 2
                if arch_factor > 0:
                    depth_foot = max(depth_foot, arch_factor * 0.082)
            # 5 sculpted giant toes
            for tx, ty, tr in toes:
                dt = ((fx - tx) / tr) ** 2 + ((py - ty) / (tr * 1.15)) ** 2
                if dt < 1.0:
                    depth_foot = max(depth_foot, (1.0 - dt) * 0.095)

            top_z = max(0.08, slab_h + ridge - bevel - depth_foot)
            vt = bm.verts.new((px - 0.28, py, top_z))
            vb = bm.verts.new((px - 0.28, py, 0.0))
            row_t.append((vt, u_norm, v_norm, depth_foot > 0.025))
            row_b.append(vb)
        verts_top.append(row_t)
        verts_bot.append(row_b)

    uv_layer = bm.loops.layers.uv.new("UVMap")
    for j in range(ny):
        for i in range(nx):
            v00, u00, w00, d00 = verts_top[j][i]
            v10, u10, w10, d10 = verts_top[j][i + 1]
            v11, u11, w11, d11 = verts_top[j + 1][i + 1]
            v01, u01, w01, d01 = verts_top[j + 1][i]
            ft = bm.faces.new((v00, v10, v11, v01))
            ft.material_index = 1 if (d00 or d10 or d11 or d01) else 0
            for lp, uv in zip(ft.loops, ((u00, w00), (u10, w10), (u11, w11), (u01, w01))):
                lp[uv_layer].uv = uv

            fb = bm.faces.new((verts_bot[j][i], verts_bot[j + 1][i], verts_bot[j + 1][i + 1], verts_bot[j][i + 1]))
            fb.material_index = 0

    # Side perimeter walls
    for i in range(nx):
        bm.faces.new((verts_bot[0][i], verts_bot[0][i + 1], verts_top[0][i + 1][0], verts_top[0][i][0]))
        bm.faces.new((verts_top[ny][i][0], verts_top[ny][i + 1][0], verts_bot[ny][i + 1], verts_bot[ny][i]))
    for j in range(ny):
        bm.faces.new((verts_top[j][0][0], verts_top[j + 1][0][0], verts_bot[j + 1][0], verts_bot[j][0]))
        bm.faces.new((verts_bot[j][nx], verts_bot[j + 1][nx], verts_top[j + 1][nx][0], verts_top[j][nx][0]))

    stone_me = bpy.data.meshes.new("GiantFootprintStoneMesh")
    bm.to_mesh(stone_me)
    bm.free()
    stone_me.materials.append(basalt_mat)
    stone_me.materials.append(footprint_dark_mat)
    stone_obj = bpy.data.objects.new("GiantFootprintStone", stone_me)
    bpy.context.collection.objects.link(stone_obj)
    parts.append(stone_obj)

    # 2. Nia tre đan nan thủ công đặt cạnh phiến đá (bên phải: x = +0.76, y = -0.10)
    nia_x, nia_y = 0.80, -0.05
    parts.append(add_cone((nia_x, nia_y, 0.045), 0.46, 0.36, 0.08, bamboo_mat, rot=(math.pi, 0, 0), verts=22))
    parts.append(add_cylinder((nia_x, nia_y, 0.015), 0.36, 0.025, bamboo_mat, verts=22))
    parts.append(add_torus((nia_x, nia_y, 0.085), 0.46, 0.024, bamboo_rim_mat, major_segs=24, minor_segs=6))
    # Rattan binding strips along rim
    for k in range(8):
        ang = (k / 8.0) * math.pi * 2.0
        parts.append(
            add_box(
                (nia_x + math.cos(ang) * 0.46, nia_y + math.sin(ang) * 0.46, 0.085),
                (0.026, 0.045, 0.055),
                bamboo_rim_mat,
                rot=(0, 0, ang),
            )
        )

    # 3. 7 nong cơm đầy đặn & 3 nong cà pháo muối đặt trên nia tre và mâm gỗ bên cạnh
    rice_positions = [
        (nia_x - 0.16, nia_y + 0.16, 0.045),
        (nia_x + 0.06, nia_y + 0.18, 0.045),
        (nia_x + 0.22, nia_y + 0.02, 0.045),
        (nia_x - 0.02, nia_y - 0.02, 0.045),
        (nia_x - 0.22, nia_y - 0.08, 0.045),
        (nia_x + 0.14, nia_y - 0.20, 0.045),
        (nia_x - 0.10, nia_y - 0.24, 0.045),
    ]
    for rx, ry, rz in rice_positions:
        # Small bamboo/earthen tray + heaped white rice mound
        parts.append(add_cylinder((rx, ry, rz + 0.018), 0.095, 0.028, terracotta_mat, verts=12))
        parts.append(add_uv_sphere((rx, ry, rz + 0.032), 0.078, (1.0, 1.0, 0.72), rice_mat, segs=10, rings=6))

    # 3 nong cà muối phía trước (trên nia nhỏ ở phía trước bên phải: x = 0.65..1.05, y = +0.52)
    cà_positions = [(0.56, 0.56), (0.78, 0.60), (1.00, 0.54)]
    for cx, cy in cà_positions:
        parts.append(add_cone((cx, cy, 0.04), 0.09, 0.06, 0.065, terracotta_mat, rot=(math.pi, 0, 0), verts=12))
        for k in range(3):
            ka = k * 2.1
            parts.append(
                add_uv_sphere(
                    (cx + math.cos(ka) * 0.026, cy + math.sin(ka) * 0.026, 0.068),
                    0.024,
                    (1.0, 1.0, 0.9),
                    eggplant_mat,
                    segs=8,
                    rings=5,
                )
            )

    finalize_and_export(parts, "Dau_Chan_Va_Nia_Tre", os.path.join(OUT_DIR, "dau_chan_va_nia_tre.glb"), max_tris=9000)


# =============================================================================
# 2. VU_KHI_SAT_VA_LOA_SU_GIA.GLB: Loa đồng sứ giả, roi sắt gãy, đe rèn, búa & giáp sắt
# =============================================================================
def build_vu_khi_sat_va_loa_su_gia():
    reset_scene()
    stone_hearth = make_bsdf_material("ForgeStone", (0.19, 0.18, 0.20), roughness=0.90)
    charred_wood = make_bsdf_material("AnvilTimber", (0.18, 0.11, 0.07), roughness=0.78)
    forged_iron = make_bsdf_material("ForgedIron", (0.24, 0.25, 0.28), roughness=0.38, metallic=0.88)
    broken_tip = make_bsdf_material("BrokenIronTip", (0.45, 0.46, 0.50), roughness=0.28, metallic=0.92)
    hot_ember = make_bsdf_material(
        "GlowingCoals",
        (0.95, 0.28, 0.04),
        roughness=0.80,
        emission=(1.0, 0.26, 0.02),
        emission_strength=2.8,
    )
    hot_armor_edge = make_bsdf_material(
        "HotForgedEdge",
        (0.88, 0.34, 0.06),
        roughness=0.35,
        metallic=0.65,
        emission=(1.0, 0.32, 0.04),
        emission_strength=1.5,
    )
    dongson_bronze = make_bsdf_material("DongSonBronze", (0.76, 0.58, 0.20), roughness=0.28, metallic=0.86)
    crimson_cradle = make_bsdf_material("EnvoyCradle", (0.50, 0.10, 0.09), roughness=0.45, metallic=0.12)

    parts = []
    rng = random.Random(101)

    # 1. Bệ đá lò rèn than đỏ rực ở bên phải (X = +0.48, Y = 0)
    parts.append(add_box((0.50, 0.0, 0.08), (1.18, 0.96, 0.16), stone_hearth))
    # Thành lò rèn phía sau rực than hồng
    parts.append(add_box((0.68, 0.14, 0.24), (0.68, 0.52, 0.18), stone_hearth))
    parts.append(add_box((0.68, 0.14, 0.32), (0.52, 0.38, 0.04), hot_ember))
    for _ in range(14):
        ex = 0.68 + rng.uniform(-0.22, 0.22)
        ey = 0.14 + rng.uniform(-0.15, 0.15)
        parts.append(add_uv_sphere((ex, ey, 0.345), rng.uniform(0.025, 0.048), (1.2, 1.0, 0.65), hot_ember, segs=7, rings=5))

    # 2. Khúc gỗ kê & Đe sắt thợ rèn nặng ở trung tâm trước lò rèn (X = +0.26, Y = -0.20)
    parts.append(add_cylinder((0.24, -0.22, 0.34), 0.19, 0.36, charred_wood, verts=12))
    # Thân đe sắt & sừng đe
    parts.append(add_box((0.24, -0.22, 0.56), (0.38, 0.18, 0.11), forged_iron))
    parts.append(add_box((0.24, -0.22, 0.64), (0.44, 0.21, 0.07), forged_iron))
    parts.append(add_cone((0.52, -0.22, 0.64), 0.085, 0.015, 0.24, forged_iron, rot=(0, math.pi / 2, 0), verts=10))
    # Búa rèn sắt gác chéo trên mặt đe
    parts.append(add_cylinder((0.22, -0.20, 0.70), 0.018, 0.44, charred_wood, rot=(math.pi / 2, 0.0, 0.55), verts=8))
    parts.append(add_box((0.32, -0.14, 0.715), (0.14, 0.075, 0.075), forged_iron, rot=(0, 0, 0.55)))

    # 3. Bộ Áo Giáp Sắt tôi nóng đặt trên giá đỡ phía sau lò rèn (X = +0.62, Y = +0.22)
    parts.append(add_cylinder((0.72, 0.24, 0.68), 0.026, 0.78, forged_iron, verts=8))
    parts.append(add_box((0.72, 0.24, 0.94), (0.44, 0.04, 0.05), forged_iron))
    # Giáp ngực chạm viền đỏ nóng
    parts.append(add_cylinder((0.72, 0.24, 0.80), 0.17, 0.42, forged_iron, verts=12))
    parts.append(add_torus((0.72, 0.24, 0.82), 0.175, 0.016, hot_armor_edge, major_segs=14, minor_segs=5))
    for sx in (-0.20, 0.20):
        parts.append(add_uv_sphere((0.72 + sx, 0.24, 0.95), 0.085, (1.1, 0.9, 0.7), forged_iron, segs=8, rings=6))

    # 4. Giá trưng bày Loa Đồng Sứ Giả & Roi Sắt Gãy bên trái (X = -0.58)
    parts.append(add_box((-0.62, 0.0, 0.08), (0.98, 0.86, 0.16), stone_hearth))
    parts.append(add_box((-0.62, 0.0, 0.19), (0.86, 0.72, 0.06), crimson_cradle))

    # Loa Đồng Sứ Giả Hùng Vương (flared bronze herald horn resting slightly tilted)
    horn_base_x, horn_y, horn_z = -0.78, 0.14, 0.30
    parts.append(add_cone((horn_base_x + 0.18, horn_y, horn_z + 0.04), 0.045, 0.17, 0.48, dongson_bronze, rot=(0, math.pi * 0.46, 0), verts=16))
    parts.append(add_torus((horn_base_x + 0.42, horn_y, horn_z + 0.07), 0.17, 0.018, dongson_bronze, rot=(0, math.pi * 0.46, 0), major_segs=18, minor_segs=6))
    parts.append(add_cylinder((horn_base_x - 0.10, horn_y, horn_z + 0.01), 0.025, 0.22, dongson_bronze, rot=(0, math.pi * 0.46, 0), verts=10))
    parts.append(add_torus((horn_base_x + 0.05, horn_y, horn_z + 0.03), 0.055, 0.012, dongson_bronze, rot=(0, math.pi * 0.46, 0), major_segs=14, minor_segs=5))

    # Roi Sắt Gãy đôi (two fractured iron rod halves crossing at slight jagged angle)
    parts.append(add_cylinder((-0.80, -0.18, 0.26), 0.028, 0.46, forged_iron, rot=(0, math.pi / 2, 0.16), verts=8))
    parts.append(add_cone((-0.56, -0.14, 0.26), 0.030, 0.008, 0.09, broken_tip, rot=(0, math.pi / 2, 0.16), verts=7))
    parts.append(add_cylinder((-0.34, -0.22, 0.26), 0.028, 0.40, forged_iron, rot=(0, math.pi / 2, -0.22), verts=8))
    parts.append(add_cone((-0.52, -0.18, 0.26), 0.030, 0.008, 0.08, broken_tip, rot=(0, -math.pi / 2, -0.22), verts=7))
    # Tay cầm roi bọc đồng
    parts.append(add_cylinder((-1.02, -0.21, 0.26), 0.036, 0.10, dongson_bronze, rot=(0, math.pi / 2, 0.16), verts=10))

    finalize_and_export(parts, "Vu_Khi_Sat_Va_Loa_Su_Gia", os.path.join(OUT_DIR, "vu_khi_sat_va_loa_su_gia.glb"), max_tris=10000)


# =============================================================================
# 3. PORTAL_SOC_SON.GLB: Cổng đền Phù Đổng + Vòm Tre Đằng Ngà + Vòng Hào Quang Lửa Thiêng
#    CLEAR OPENING REQUIRED: width >= 2.6m (X in [-1.55, +1.55] = 3.1m), height >= 3.4m (Z >= 3.65m)
# =============================================================================
def build_portal_soc_son():
    reset_scene()
    plaque_tex = create_temple_plaque_texture()

    stone_mat = make_bsdf_material("SocSonBlueStone", (0.16, 0.19, 0.24), roughness=0.84, metallic=0.06)
    crimson_col = make_bsdf_material("PhuDongCrimson", (0.55, 0.10, 0.09), roughness=0.32, metallic=0.14)
    bronze_patina = make_bsdf_material("BronzePatina", (0.48, 0.56, 0.36), roughness=0.36, metallic=0.72)
    temple_gold = make_bsdf_material("PhuDongGold", (0.88, 0.70, 0.20), roughness=0.22, metallic=0.88)
    roof_tile = make_bsdf_material("PhuDongRoofTile", (0.20, 0.09, 0.08), roughness=0.48, metallic=0.12)
    ivory_bamboo = make_bsdf_material(
        "TreDangNga",
        (0.86, 0.72, 0.22),
        roughness=0.45,
        emission=(0.24, 0.18, 0.02),
        emission_strength=0.18,
    )
    bamboo_leaf = make_bsdf_material("BambooLeafGoldGreen", (0.58, 0.66, 0.20), roughness=0.65)
    fire_halo = make_bsdf_material(
        "SacredFireHalo",
        (1.0, 0.45, 0.08),
        roughness=0.22,
        emission=(1.0, 0.38, 0.04),
        emission_strength=2.8,
    )
    plaque_mat = make_bsdf_material(
        "PhuDongPlaque",
        (0.85, 0.65, 0.25),
        roughness=0.35,
        metallic=0.30,
        image_tex=plaque_tex,
    )

    parts = []

    # 1. Chân tảng đá hai bên cổng (X = ±2.05m -> giữ khoảng thông thủy giữa |X| <= 1.55m hoàn toàn trống)
    for sx in (-2.05, 2.05):
        parts.append(add_box((sx, 0.0, 0.16), (1.15, 1.35, 0.32), stone_mat))
        parts.append(add_box((sx, 0.0, 0.36), (0.95, 1.15, 0.10), bronze_patina))
        for sy in (-0.34, 0.34):
            parts.append(add_cylinder((sx, sy, 0.49), 0.25, 0.16, stone_mat, verts=12))
            # Cột gỗ sơn son thếp vàng/đồng rêu cao tới Z = 4.02m
            parts.append(add_cylinder((sx, sy, 2.26), 0.175, 3.44, crimson_col, verts=14))
            for hz in (0.90, 2.25, 3.65):
                parts.append(add_cylinder((sx, sy, hz), 0.195, 0.12, bronze_patina, verts=14))

    # Ngưỡng đá siêu mỏng thấp ngang mặt sàn (height = 0.03m) không cản bước chân
    parts.append(add_box((0.0, 0.0, 0.015), (3.10, 1.20, 0.03), stone_mat))

    # 2. Xà ngang thượng tầng hoàn toàn cao >= 3.74m (từ 3.74m lên 4.18m) -> thông thủy 3.74m > 3.4m
    parts.append(add_box((0.0, 0.0, 3.96), (5.30, 1.05, 0.44), crimson_col))
    parts.append(add_box((0.0, 0.0, 3.75), (5.40, 1.12, 0.07), bronze_patina))
    parts.append(add_box((0.0, -0.54, 4.02), (1.95, 0.06, 0.56), plaque_mat))

    # Mái đao Phù Đổng 2 tầng uốn cong
    parts.append(add_box((0.0, 0.0, 4.30), (6.00, 1.65, 0.20), roof_tile))
    parts.append(add_box((0.0, 0.50, 4.21), (6.00, 0.68, 0.15), roof_tile, rot=(-0.22, 0, 0)))
    parts.append(add_box((0.0, -0.50, 4.21), (6.00, 0.68, 0.15), roof_tile, rot=(0.22, 0, 0)))
    for sgn_x in (-1, 1):
        for sgn_y in (-1, 1):
            for s in range(4):
                t = s / 3.0
                ex = sgn_x * (2.85 + t * 0.44)
                ey = sgn_y * (0.68 + t * 0.22)
                ez = 4.26 + (t ** 1.6) * 0.36
                parts.append(add_box((ex, ey, ez), (0.26 * (1 - t * 0.5), 0.20 * (1 - t * 0.5), 0.10), temple_gold, rot=(sgn_y * -0.22 * t, sgn_x * -0.42 * t, 0)))

    # Cổ diêm & Tầng mái thượng
    parts.append(add_box((0.0, 0.0, 4.65), (3.85, 0.96, 0.44), crimson_col))
    parts.append(add_box((0.0, 0.0, 5.02), (4.55, 1.38, 0.18), roof_tile))
    parts.append(add_box((0.0, 0.42, 4.94), (4.55, 0.56, 0.14), roof_tile, rot=(-0.24, 0, 0)))
    parts.append(add_box((0.0, -0.42, 4.94), (4.55, 0.56, 0.14), roof_tile, rot=(0.24, 0, 0)))
    parts.append(add_box((0.0, 0.0, 5.20), (3.55, 0.22, 0.16), temple_gold))
    parts.append(add_uv_sphere((0.0, 0.0, 5.44), 0.16, (1.0, 0.6, 1.2), fire_halo, segs=10, rings=7))

    # 3. Hai khóm Tre Đằng Ngà uốn vòm vàng óng 2 bên ngoài cổng (X = ±2.75..±1.85, không lấn vào X in [-1.55, 1.55])
    for side in (-1, 1):
        for stalk_idx, y_off in enumerate((-0.26, 0.0, 0.26)):
            segs = 6
            for s in range(segs):
                t = s / float(segs)
                t_next = (s + 1) / float(segs)
                # Base outside at +-2.70m, rising straight to 2.6m then arching gently inward at top (min |X| = 1.65m at Z=3.8m)
                x1 = side * (2.68 - (max(0.0, t - 0.35) ** 1.45) * 1.45 - stalk_idx * 0.04)
                x2 = side * (2.68 - (max(0.0, t_next - 0.35) ** 1.45) * 1.45 - stalk_idx * 0.04)
                z1 = t * 4.15
                z2 = t_next * 4.15
                mx, mz = (x1 + x2) * 0.5, (z1 + z2) * 0.5
                seg_len = math.hypot(x2 - x1, z2 - z1)
                tilt = math.atan2(x1 - x2, z2 - z1)
                parts.append(add_cylinder((mx, y_off, mz), 0.055 - t * 0.018, seg_len * 1.02, ivory_bamboo, rot=(0, tilt, 0), verts=8))
                # Bamboo joint ring
                parts.append(add_torus((x2, y_off, z2), 0.058 - t * 0.018, 0.010, bronze_patina, rot=(0, tilt, 0), major_segs=10, minor_segs=4))
                # Leaf clusters only near upper arch (Z >= 3.2m)
                if s >= 4:
                    parts.append(add_cone((x2 - side * 0.14, y_off + 0.12, z2 + 0.06), 0.09, 0.005, 0.38, bamboo_leaf, rot=(0.4, -side * 1.1, 0), verts=5))
                    parts.append(add_cone((x2 - side * 0.10, y_off - 0.14, z2 + 0.10), 0.08, 0.005, 0.34, bamboo_leaf, rot=(-0.4, -side * 1.2, 0), verts=5))

    # 4. Vòng Hào Quang Lửa Thiêng hình bán nguyệt mở bên dưới để giữ lối đi >= 3.1m x 3.7m thông thoáng tuyệt đối
    # Tâm vòng hào quang ở (0, 0, 2.48), bán kính 1.76m, góc từ -18° -> +198° (đỉnh vòm 4.24m)
    halo_cx, halo_cz, halo_r = 0.0, 2.48, 1.76
    halo_segs = 18
    for i in range(halo_segs):
        t = i / float(halo_segs - 1)
        ang = math.radians(-15.0 + t * 210.0)
        hx = halo_cx + math.cos(ang) * halo_r
        hz = halo_cz + math.sin(ang) * halo_r
        # Flame-bar segment tangent to arch
        parts.append(add_box((hx, 0.0, hz), (0.34, 0.10, 0.11), fire_halo, rot=(0, -(ang + math.pi / 2), 0)))
        if i % 2 == 0:
            fx = halo_cx + math.cos(ang) * (halo_r + 0.18)
            fz = halo_cz + math.sin(ang) * (halo_r + 0.18)
            parts.append(add_cone((fx, 0.0, fz), 0.075, 0.005, 0.28, fire_halo, rot=(0, math.pi / 2 - ang, 0), verts=6))

    finalize_and_export(parts, "Portal_Soc_Son", os.path.join(OUT_DIR, "portal_soc_son.glb"), max_tris=11500)


# =============================================================================
# 4. GIAP_SAT_SOC_SON.GLB: Bộ áo giáp sắt Phù Đổng để lại trên đỉnh núi Sóc Sơn
# =============================================================================
def build_giap_sat_soc_son():
    reset_scene()
    rock_pad = make_bsdf_material("SocSonAltarRock", (0.20, 0.19, 0.18), roughness=0.90)
    hammered_iron = make_bsdf_material("ForgedAncientIron", (0.22, 0.24, 0.27), roughness=0.38, metallic=0.88)
    dark_iron_plate = make_bsdf_material("DarkIronLamel", (0.14, 0.15, 0.18), roughness=0.45, metallic=0.84)
    bronze_gold_trim = make_bsdf_material(
        "DongSonGoldTrim",
        (0.77, 0.61, 0.15),  # #c59b27
        roughness=0.25,
        metallic=0.88,
        emission=(0.55, 0.42, 0.08),
        emission_strength=0.28,
    )
    sacred_amber_sheen = make_bsdf_material(
        "ArmorSacredSheen",
        (0.86, 0.68, 0.22),
        roughness=0.20,
        metallic=0.82,
        emission=(0.82, 0.56, 0.12),
        emission_strength=0.55,
    )
    crimson_tassel = make_bsdf_material("PhuDongCrimsonCloth", (0.52, 0.10, 0.09), roughness=0.68)

    parts = []

    # 1. Tảng đá dẹt kê giáp + trụ giá đỡ bằng sắt rèn & đồng cổ (Z = 0 -> 0.14)
    parts.append(add_cylinder((0.0, 0.0, 0.06), 0.52, 0.12, rock_pad, verts=14))
    parts.append(add_cylinder((0.0, 0.0, 0.13), 0.40, 0.04, bronze_gold_trim, verts=16))
    parts.append(add_cylinder((0.0, 0.0, 0.56), 0.032, 0.88, dark_iron_plate, verts=10))
    parts.append(add_box((0.0, 0.0, 0.84), (0.62, 0.045, 0.045), dark_iron_plate))

    # 2. Thân áo giáp sắt ghép phiến Đông Sơn (Segmented Iron Breastplate & Backplate)
    for tier in range(4):
        tz = 0.44 + tier * 0.115
        r_tier = 0.21 + tier * 0.014
        parts.append(add_cylinder((0.0, 0.0, tz), r_tier, 0.11, hammered_iron, verts=14))
        parts.append(add_torus((0.0, 0.0, tz + 0.05), r_tier + 0.006, 0.010, bronze_gold_trim, major_segs=16, minor_segs=5))

    # Vạt giáp hông xòe hai bên & trước (segmented tassets)
    for ang_deg in (-55, -20, 20, 55, 130, 180, 230):
        ang = math.radians(ang_deg)
        tx = math.sin(ang) * 0.23
        ty = -math.cos(ang) * 0.20
        parts.append(
            add_box(
                (tx, ty, 0.30),
                (0.11, 0.025, 0.20),
                dark_iron_plate,
                rot=(0.14 * math.cos(ang), 0.14 * math.sin(ang), ang),
            )
        )
        parts.append(
            add_box(
                (tx * 1.03, ty * 1.03, 0.21),
                (0.115, 0.028, 0.025),
                bronze_gold_trim,
                rot=(0.14 * math.cos(ang), 0.14 * math.sin(ang), ang),
            )
        )

    # Hộ tâm phiến & Mặt Trống Đồng Ngọc Lũ tỏa ánh vàng trên ngực giáp (-Y = mặt trước Three.js +Z)
    parts.append(add_cylinder((0.0, -0.225, 0.68), 0.125, 0.038, bronze_gold_trim, rot=(math.pi / 2, 0, 0), verts=16))
    parts.append(add_uv_sphere((0.0, -0.242, 0.68), 0.052, (1.0, 0.55, 1.0), sacred_amber_sheen, segs=12, rings=8))

    # Thắt lưng chiến binh khóa đồng vàng
    parts.append(add_torus((0.0, 0.0, 0.42), 0.228, 0.022, crimson_tassel, major_segs=18, minor_segs=6))
    parts.append(add_box((0.0, -0.235, 0.42), (0.11, 0.035, 0.085), bronze_gold_trim))

    # 3. Bộ Giáp Vai Nhiều Lớp (Layered Iron Pauldrons flanking left & right shoulders)
    for side in (-1, 1):
        for layer in range(3):
            px = side * (0.28 + layer * 0.048)
            pz = 0.85 - layer * 0.075
            tilt = side * -(0.28 + layer * 0.24)
            parts.append(add_uv_sphere((px, 0.0, pz), 0.115 - layer * 0.012, (0.95, 1.35, 0.42), hammered_iron, segs=12, rings=7))
            parts.append(
                add_torus(
                    (px + side * 0.015, 0.0, pz - 0.01),
                    0.112 - layer * 0.012,
                    0.010,
                    bronze_gold_trim,
                    rot=(0, tilt, 0),
                    major_segs=14,
                    minor_segs=4,
                )
            )

    # 4. Cổ áo giáp & Mũ Sắt Phù Đổng chạm mào đồng (Battle Helmet atop armor neck/stand)
    parts.append(add_cylinder((0.0, 0.0, 0.90), 0.13, 0.08, bronze_gold_trim, verts=14))
    # Chóp mũ sắt úp trên đỉnh giá (Z ~ 1.08..1.30)
    parts.append(add_uv_sphere((0.0, 0.0, 1.11), 0.145, (0.94, 1.10, 0.96), hammered_iron, segs=14, rings=10))
    # Vành mũ đồng Đông Sơn & hộ mi giữa trán
    parts.append(add_torus((0.0, 0.0, 1.06), 0.148, 0.016, bronze_gold_trim, major_segs=18, minor_segs=5))
    parts.append(add_box((0.0, -0.155, 1.05), (0.045, 0.030, 0.12), bronze_gold_trim))
    # Tấm che má 2 bên mũ
    for side in (-1, 1):
        parts.append(add_box((side * 0.135, -0.02, 0.99), (0.025, 0.09, 0.12), dark_iron_plate, rot=(0, side * 0.18, 0)))
    # Mào đồng Phù Đổng & tua lông đỏ trên đỉnh mũ
    parts.append(add_box((0.0, 0.01, 1.24), (0.032, 0.22, 0.08), sacred_amber_sheen, rot=(-0.15, 0, 0)))
    parts.append(add_cone((0.0, 0.02, 1.32), 0.028, 0.005, 0.11, bronze_gold_trim, verts=8))
    parts.append(add_box((0.0, 0.13, 1.21), (0.025, 0.09, 0.07), crimson_tassel, rot=(0.45, 0, 0)))

    finalize_and_export(parts, "Giap_Sat_Soc_Son", os.path.join(OUT_DIR, "giap_sat_soc_son.glb"), max_tris=8000)


def main():
    build_dau_chan_va_nia_tre()
    build_vu_khi_sat_va_loa_su_gia()
    build_portal_soc_son()
    build_giap_sat_soc_son()
    print("[ThanhGiong Assets] All 4 GLB models generated successfully.")


if __name__ == "__main__":
    main()
