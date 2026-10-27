"""
BUILD FULL MASTERPIECE 3D ASSETS FOR PHONG 01: TRUYEN KIEU
Blender 5.2 Python Headless Generator
Assets created:
1. sach_truyen_kieu.glb - Pedestal (1.1m) + Open Truyen Kieu Book (0.8m) with calligraphy & lotus motif
2. an_thu.glb - Grand Scholar Desk (Width: 2.2m, Depth: 0.9m, Height: 0.85m) with scroll ends & cabriole legs
3. dan_ty_ba.glb - Traditional Lacquer Pipa Lute (Length: 1.15m) with mother-of-pearl inlay
4. binh_phong.glb - 4-Panel Folding Screen (Width: 3.6m, Height: 2.6m) with carved lotus & crescent moon
5. den_long_kieu.glb - Hexagonal Silk Palace Lantern (Height: 0.8m)
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector

OUTPUT_DIR = r"D:\BaoTang3D\BaoTangVanHoc_TheNewEra\public\assets\models\rooms\kieu"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in bpy.data.collections:
        bpy.data.collections.remove(c)
    col = bpy.data.collections.new("Collection")
    bpy.context.scene.collection.children.link(col)
    return col

def create_pbr_material(name, base_color, roughness=0.35, metalness=0.05, emissive=(0, 0, 0, 1), emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    output = nodes.new(type='ShaderNodeOutputMaterial')
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    
    principled.inputs['Base Color'].default_value = base_color
    principled.inputs['Roughness'].default_value = roughness
    principled.inputs['Metallic'].default_value = metalness
    
    # Emissive
    if 'Emission Color' in principled.inputs:
        principled.inputs['Emission Color'].default_value = emissive[:3] + (1.0,)
        if 'Emission Strength' in principled.inputs:
            principled.inputs['Emission Strength'].default_value = emissive_strength
    elif 'Emission' in principled.inputs:
        principled.inputs['Emission'].default_value = emissive
        
    return mat

def export_active_as_glb(filename, target_width=None, target_length=None, target_height=None):
    obj = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    
    dim = obj.dimensions
    scale_factor = 1.0
    if target_width is not None and dim.x > 0.001:
        scale_factor = target_width / dim.x
    elif target_length is not None:
        max_dim = max(dim.x, dim.y, dim.z)
        if max_dim > 0.001:
            scale_factor = target_length / max_dim
    elif target_height is not None and dim.z > 0.001:
        scale_factor = target_height / dim.z
        
    obj.scale = (obj.scale.x * scale_factor, obj.scale.y * scale_factor, obj.scale.z * scale_factor)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Origin to bottom center
    bbox = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    min_z = min(v.z for v in bbox)
    center_x = (min(v.x for v in bbox) + max(v.x for v in bbox)) / 2
    center_y = (min(v.y for v in bbox) + max(v.y for v in bbox)) / 2
    
    obj.location = (-center_x, -center_y, -min_z)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    
    out_path = os.path.join(OUTPUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f"✓ [EXPORTED] {filename} -> {obj.dimensions.x:.2f}m x {obj.dimensions.y:.2f}m x {obj.dimensions.z:.2f}m ({os.path.getsize(out_path):,} bytes)")

# ==============================================================================
# 1. SACH TRUYEN KIEU & BUC GO CHAM KHAC (PEDESTAL + OPEN EPIC BOOK)
# ==============================================================================
def build_sach_truyen_kieu():
    reset_scene()
    print("[BUILDER] Building Sach Truyen Kieu & Pedestal...")
    
    mat_rosewood = create_pbr_material("Pedestal_Rosewood", (0.22, 0.08, 0.04, 1.0), roughness=0.32, metalness=0.05)
    mat_gold = create_pbr_material("Pedestal_Gold", (0.85, 0.68, 0.22, 1.0), roughness=0.22, metalness=0.85)
    mat_parchment = create_pbr_material("Book_DoPaper", (0.92, 0.85, 0.70, 1.0), roughness=0.75, metalness=0.02,
                                        emissive=(1.0, 0.88, 0.50, 1.0), emissive_strength=0.18)
    mat_leather_cover = create_pbr_material("Book_LacquerCover", (0.35, 0.10, 0.05, 1.0), roughness=0.25, metalness=0.1)
    
    objects = []
    
    # 1.1 Octagonal Stepped Pedestal Base (Bục đế bát giác chạm khắc)
    # Bottom stepped plinth
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=0.08, vertices=8, location=(0, 0, 0.04))
    base1 = bpy.context.active_object
    base1.data.materials.append(mat_rosewood)
    objects.append(base1)
    
    # Gold trim on base
    bpy.ops.mesh.primitive_cylinder_add(radius=0.46, depth=0.015, vertices=8, location=(0, 0, 0.08))
    base_trim = bpy.context.active_object
    base_trim.data.materials.append(mat_gold)
    objects.append(base_trim)
    
    # Second tier
    bpy.ops.mesh.primitive_cylinder_add(radius=0.38, depth=0.10, vertices=8, location=(0, 0, 0.13))
    base2 = bpy.context.active_object
    base2.data.materials.append(mat_rosewood)
    objects.append(base2)
    
    # 1.2 Central Carved Column (Trụ bục chạm hoa sen)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.72, vertices=16, location=(0, 0, 0.54))
    column = bpy.context.active_object
    column.data.materials.append(mat_rosewood)
    objects.append(column)
    
    # Column decorative rings (Vòng chỉ vàng)
    for rz in [0.22, 0.54, 0.86]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.23, minor_radius=0.015, location=(0, 0, rz))
        c_ring = bpy.context.active_object
        c_ring.data.materials.append(mat_gold)
        objects.append(c_ring)
        
    # 1.3 Capital Table Top (Mặt bục đỡ sách hình hoa sen)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.08, vertices=8, location=(0, 0, 0.94))
    capital = bpy.context.active_object
    capital.data.materials.append(mat_rosewood)
    objects.append(capital)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.43, depth=0.015, vertices=8, location=(0, 0, 0.98))
    cap_trim = bpy.context.active_object
    cap_trim.data.materials.append(mat_gold)
    objects.append(cap_trim)
    
    # Slanted book rest wedge (Giá nghiêng 22 độ đỡ sách)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.05), rotation=(-math.radians(22), 0, 0))
    wedge = bpy.context.active_object
    wedge.scale = (0.75, 0.50, 0.05)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    wedge.data.materials.append(mat_rosewood)
    objects.append(wedge)
    
    # 1.4 Large Open Book "Truyen Kieu" (Cuốn Sách Truyện Kiều Khổ Lớn)
    # Left & Right arched pages
    book_tilt = -math.radians(22)
    cos_t = math.cos(book_tilt)
    sin_t = math.sin(book_tilt)
    
    # Left page block
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(-0.21, -0.01 * cos_t, 1.08 - 0.01 * sin_t),
        rotation=(book_tilt, math.radians(6), 0)
    )
    left_pages = bpy.context.active_object
    left_pages.scale = (0.39, 0.54, 0.04)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    left_pages.data.materials.append(mat_parchment)
    objects.append(left_pages)
    
    # Right page block
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0.21, -0.01 * cos_t, 1.08 - 0.01 * sin_t),
        rotation=(book_tilt, -math.radians(6), 0)
    )
    right_pages = bpy.context.active_object
    right_pages.scale = (0.39, 0.54, 0.04)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    right_pages.data.materials.append(mat_parchment)
    objects.append(right_pages)
    
    # Book spine & covers (Gáy sách bọc da sơn then)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.035,
        depth=0.56,
        vertices=16,
        location=(0, -0.03 * cos_t, 1.06 - 0.03 * sin_t),
        rotation=(math.pi/2 + book_tilt, 0, 0)
    )
    spine = bpy.context.active_object
    spine.data.materials.append(mat_leather_cover)
    objects.append(spine)
    
    # Silk ribbon bookmark (Dải ruy băng lụa đỏ đánh dấu trang)
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0.04, -0.15 * cos_t, 1.06 - 0.15 * sin_t),
        rotation=(book_tilt, 0, math.radians(12))
    )
    ribbon = bpy.context.active_object
    ribbon.scale = (0.025, 0.32, 0.005)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mat_red_silk = create_pbr_material("Red_Silk_Ribbon", (0.80, 0.12, 0.10, 1.0), roughness=0.35, metalness=0.1)
    ribbon.data.materials.append(mat_red_silk)
    objects.append(ribbon)
    
    # Join into single object
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("sach_truyen_kieu.glb", target_height=1.22)

# ==============================================================================
# 2. AN THU GO TRAC CHAM CUON THU (GRAND SCHOLAR DESK - 2.2m x 0.9m x 0.85m)
# ==============================================================================
def build_an_thu_grand():
    reset_scene()
    print("[BUILDER] Building Grand An Thu...")
    
    mat_wood = create_pbr_material("GrandAnThu_Wood", (0.24, 0.08, 0.04, 1.0), roughness=0.32, metalness=0.05)
    mat_gold = create_pbr_material("GrandAnThu_Gold", (0.85, 0.68, 0.22, 1.0), roughness=0.22, metalness=0.85)
    
    objects = []
    
    # Desktop: Width 2.0m, Depth 0.9m, Thickness 0.06m at Z = 0.81
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.81))
    top = bpy.context.active_object
    top.scale = (2.02, 0.90, 0.06)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    top.data.materials.append(mat_wood)
    objects.append(top)
    
    # Scroll ends (2 Đầu cuốn thư uốn cong)
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.055,
            depth=0.92,
            vertices=24,
            rotation=(math.pi/2, 0, 0),
            location=(sign * 1.035, 0, 0.835)
        )
        scroll = bpy.context.active_object
        scroll.data.materials.append(mat_wood)
        objects.append(scroll)
        
        # Gold tips on scrolls
        for ysign in [-1, 1]:
            bpy.ops.mesh.primitive_cylinder_add(
                radius=0.045,
                depth=0.02,
                vertices=24,
                rotation=(math.pi/2, 0, 0),
                location=(sign * 1.035, ysign * 0.465, 0.835)
            )
            stip = bpy.context.active_object
            stip.data.materials.append(mat_gold)
            objects.append(stip)
            
    # Carved Apron Frame (Yếm bàn rộng bề thế)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.38, 0.74))
    apron_f = bpy.context.active_object
    apron_f.scale = (1.92, 0.045, 0.10)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apron_f.data.materials.append(mat_wood)
    objects.append(apron_f)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.38, 0.74))
    apron_b = bpy.context.active_object
    apron_b.scale = (1.92, 0.045, 0.10)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apron_b.data.materials.append(mat_wood)
    objects.append(apron_b)
    
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.94, 0, 0.74))
        apron_s = bpy.context.active_object
        apron_s.scale = (0.045, 0.72, 0.10)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        apron_s.data.materials.append(mat_wood)
        objects.append(apron_s)
        
    # Gold apron trim
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.685))
    atrim = bpy.context.active_object
    atrim.scale = (1.96, 0.80, 0.015)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    atrim.data.materials.append(mat_gold)
    objects.append(atrim)
    
    # 4 Cabriole Legs (Chân quỳ nghê uốn lượn)
    leg_coords = [(-0.86, -0.34), (0.86, -0.34), (-0.86, 0.34), (0.86, 0.34)]
    for idx, (lx, ly) in enumerate(leg_coords):
        mesh = bpy.data.meshes.new(f"GrandLeg_{idx}")
        obj = bpy.data.objects.new(f"Leg_{idx}", mesh)
        bpy.context.scene.collection.objects.link(obj)
        
        bm = bmesh.new()
        slices = [
            (0.00, 0.065, 0.035 * (1 if lx > 0 else -1), 0.020 * (1 if ly > 0 else -1)),
            (0.12, 0.055, 0.048 * (1 if lx > 0 else -1), 0.028 * (1 if ly > 0 else -1)),
            (0.35, 0.060, 0.060 * (1 if lx > 0 else -1), 0.035 * (1 if ly > 0 else -1)),
            (0.58, 0.070, 0.030 * (1 if lx > 0 else -1), 0.015 * (1 if ly > 0 else -1)),
            (0.76, 0.078, 0.0, 0.0)
        ]
        ring_verts = []
        for z, w, ox, oy in slices:
            half = w / 2
            v1 = bm.verts.new((lx + ox - half, ly + oy - half, z))
            v2 = bm.verts.new((lx + ox + half, ly + oy - half, z))
            v3 = bm.verts.new((lx + ox + half, ly + oy + half, z))
            v4 = bm.verts.new((lx + ox - half, ly + oy + half, z))
            ring_verts.append([v1, v2, v3, v4])
            
        for s in range(len(slices) - 1):
            r1 = ring_verts[s]
            r2 = ring_verts[s+1]
            bm.faces.new([r1[0], r1[1], r2[1], r2[0]])
            bm.faces.new([r1[1], r1[2], r2[2], r2[1]])
            bm.faces.new([r1[2], r1[3], r2[3], r2[2]])
            bm.faces.new([r1[3], r1[0], r2[0], r2[3]])
        bm.faces.new([ring_verts[0][3], ring_verts[0][2], ring_verts[0][1], ring_verts[0][0]])
        bm.faces.new(ring_verts[-1])
        bm.to_mesh(mesh)
        bm.free()
        
        obj.data.materials.append(mat_wood)
        sub = obj.modifiers.new("Subsurf", "SUBSURF")
        sub.levels = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="Subsurf")
        objects.append(obj)
        
    # Side Stretcher Brackets
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.86, 0, 0.22))
        stretcher = bpy.context.active_object
        stretcher.scale = (0.055, 0.62, 0.05)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        stretcher.data.materials.append(mat_wood)
        objects.append(stretcher)

    # Join and export
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("an_thu.glb", target_width=2.20)

# ==============================================================================
# 3. DAN TY BA & GIA DO MAT BAN (LUTE 1.15m + WOODEN STAND)
# ==============================================================================
def build_dan_ty_ba_with_stand():
    reset_scene()
    print("[BUILDER] Building Dan Ty Ba with Stand...")
    
    mat_lacquer = create_pbr_material("TyBa_Lacquer", (0.30, 0.07, 0.03, 1.0), roughness=0.20, metalness=0.08)
    mat_soundboard = create_pbr_material("TyBa_Soundboard", (0.80, 0.65, 0.46, 1.0), roughness=0.48, metalness=0.02)
    mat_ivory = create_pbr_material("TyBa_Ivory", (0.92, 0.88, 0.78, 1.0), roughness=0.30, metalness=0.10)
    mat_pegs = create_pbr_material("TyBa_Ebony", (0.08, 0.05, 0.04, 1.0), roughness=0.30, metalness=0.15)
    mat_pearl = create_pbr_material("TyBa_Pearl", (0.88, 0.85, 0.80, 1.0), roughness=0.18, metalness=0.45)
    mat_strings = create_pbr_material("TyBa_Strings", (0.95, 0.95, 0.92, 1.0), roughness=0.40, metalness=0.60)
    mat_stand = create_pbr_material("LuteStand_Wood", (0.22, 0.08, 0.04, 1.0), roughness=0.35, metalness=0.05)
    
    objects = []
    
    # Pear body mesh
    mesh_body = bpy.data.meshes.new("Body_Back_Mesh")
    obj_body = bpy.data.objects.new("TyBa_Body", mesh_body)
    bpy.context.scene.collection.objects.link(obj_body)
    
    bm = bmesh.new()
    body_profile = [
        (0.00, 0.07, 0.040),
        (0.10, 0.25, 0.075),
        (0.24, 0.32, 0.095),
        (0.40, 0.26, 0.085),
        (0.55, 0.16, 0.060),
        (0.68, 0.07, 0.045),
        (0.88, 0.05, 0.035),
        (1.05, 0.045, 0.030)
    ]
    rings = []
    segments = 16
    for z, w, d in body_profile:
        ring = []
        rx = w / 2.0
        for i in range(segments):
            angle = i * (2 * math.pi / segments)
            if angle <= math.pi:
                px = rx * math.cos(angle)
                py = 0.0
            else:
                px = rx * math.cos(angle)
                py = -d * math.sin(angle - math.pi)
            v = bm.verts.new((px, py, z))
            ring.append(v)
        rings.append(ring)
        
    for s in range(len(body_profile) - 1):
        r1 = rings[s]
        r2 = rings[s+1]
        for i in range(segments):
            i_next = (i + 1) % segments
            bm.faces.new([r1[i], r1[i_next], r2[i_next], r2[i]])
    bm.faces.new(reversed(rings[0]))
    bm.faces.new(rings[-1])
    bm.to_mesh(mesh_body)
    bm.free()
    
    obj_body.data.materials.append(mat_lacquer)
    sub = obj_body.modifiers.new("Subsurf", "SUBSURF")
    sub.levels = 1
    bpy.context.view_layer.objects.active = obj_body
    bpy.ops.object.modifier_apply(modifier="Subsurf")
    objects.append(obj_body)
    
    # Soundboard
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.002, 0.35))
    soundboard = bpy.context.active_object
    soundboard.scale = (0.31, 0.006, 0.68)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    soundboard.data.materials.append(mat_soundboard)
    objects.append(soundboard)
    
    # Headstock & finial
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.025, 1.12))
    headstock = bpy.context.active_object
    headstock.scale = (0.055, 0.05, 0.14)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    headstock.data.materials.append(mat_lacquer)
    objects.append(headstock)
    
    bpy.ops.mesh.primitive_torus_add(major_radius=0.04, minor_radius=0.016, location=(0, -0.04, 1.19), rotation=(0, math.pi/2, 0))
    finial = bpy.context.active_object
    finial.data.materials.append(mat_lacquer)
    objects.append(finial)
    
    # 4 Ebony Tuning Pegs
    peg_locs = [(-0.05, 1.07, -1), (0.05, 1.07, 1), (-0.05, 1.13, -1), (0.05, 1.13, 1)]
    for idx, (px, pz, sign) in enumerate(peg_locs):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.007, depth=0.09, vertices=12, location=(sign * 0.05, -0.025, pz), rotation=(0, math.pi/2, 0))
        shaft = bpy.context.active_object
        shaft.data.materials.append(mat_pegs)
        objects.append(shaft)
        
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.095, -0.025, pz))
        handle = bpy.context.active_object
        handle.scale = (0.014, 0.014, 0.05)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        handle.data.materials.append(mat_pegs)
        objects.append(handle)
        
    # Bridge & Tailpiece
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.014, 0.08))
    tailpiece = bpy.context.active_object
    tailpiece.scale = (0.11, 0.020, 0.04)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tailpiece.data.materials.append(mat_pegs)
    objects.append(tailpiece)
    
    # Frets (Xiang & Pin)
    xiang_heights = [0.72, 0.78, 0.84, 0.90, 0.96, 1.02]
    for idx, hz in enumerate(xiang_heights):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.014, hz))
        f = bpy.context.active_object
        f.scale = (0.052 - idx * 0.002, 0.011, 0.013)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        f.data.materials.append(mat_ivory)
        objects.append(f)
        
    pin_heights = [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65]
    for idx, hz in enumerate(pin_heights):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.009, hz))
        f = bpy.context.active_object
        f.scale = (0.16 - idx * 0.008, 0.006, 0.007)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        f.data.materials.append(mat_ivory)
        objects.append(f)
        
    # Mother of pearl inlay
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.002, vertices=24, location=(0, 0.007, 0.14), rotation=(math.pi/2, 0, 0))
    inlay = bpy.context.active_object
    inlay.data.materials.append(mat_pearl)
    objects.append(inlay)

    # 4 Silk Strings
    for i in range(4):
        offset_x = (i - 1.5) * 0.013
        bpy.ops.mesh.primitive_cylinder_add(radius=0.0014, depth=0.98, vertices=6, location=(offset_x * 0.65, 0.026, 0.58))
        s = bpy.context.active_object
        s.data.materials.append(mat_strings)
        objects.append(s)
        
    # Elegant Wooden Table Stand (Giá đỡ đàn bằng gỗ chạm hoa sen đặt trên mặt bàn)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.06, 0.30))
    stand_base = bpy.context.active_object
    stand_base.scale = (0.24, 0.12, 0.03)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    stand_base.data.materials.append(mat_stand)
    objects.append(stand_base)
    
    # 2 Stand prongs
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.10, -0.04, 0.36))
        prong = bpy.context.active_object
        prong.scale = (0.025, 0.08, 0.10)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        prong.data.materials.append(mat_stand)
        objects.append(prong)

    # Join and export
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("dan_ty_ba.glb", target_length=1.15)

# ==============================================================================
# 4. BINH PHONG 4 TAM (4-PANEL FOLDING SCREEN - 3.6m x 2.6m)
# ==============================================================================
def build_binh_phong():
    reset_scene()
    print("[BUILDER] Building 4-Panel Folding Screen (Binh Phong)...")
    
    mat_frame = create_pbr_material("Screen_DarkWood", (0.18, 0.07, 0.03, 1.0), roughness=0.35, metalness=0.05)
    mat_gold_trim = create_pbr_material("Screen_GoldTrim", (0.85, 0.68, 0.22, 1.0), roughness=0.22, metalness=0.85)
    mat_silk_panel = create_pbr_material("Screen_SilkPainting", (0.90, 0.84, 0.72, 1.0), roughness=0.65, metalness=0.02,
                                         emissive=(0.95, 0.88, 0.70, 1.0), emissive_strength=0.10)
    
    objects = []
    
    # 4 Panels arranged in a subtle zigzag fold
    # Total width ~3.6m, each panel ~0.90m wide, 2.60m tall
    # Angles: -12, +12, -12, +12 degrees
    panel_width = 0.88
    panel_height = 2.60
    panel_angles = [-math.radians(14), math.radians(14), -math.radians(14), math.radians(14)]
    
    # Compute center offsets so panels connect at hinges
    cur_x = -1.35
    cur_y = 0.0
    
    for i in range(4):
        ang = panel_angles[i]
        dx = panel_width * math.cos(ang)
        dy = panel_width * math.sin(ang)
        px = cur_x + dx / 2
        py = cur_y + dy / 2
        
        # Outer Frame (Vertical stiles & horizontal rails)
        # Left stile
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(px - (panel_width/2 - 0.035) * math.cos(ang), py - (panel_width/2 - 0.035) * math.sin(ang), panel_height / 2),
            rotation=(0, 0, ang)
        )
        l_stile = bpy.context.active_object
        l_stile.scale = (0.07, 0.045, panel_height)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        l_stile.data.materials.append(mat_frame)
        objects.append(l_stile)
        
        # Right stile
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(px + (panel_width/2 - 0.035) * math.cos(ang), py + (panel_width/2 - 0.035) * math.sin(ang), panel_height / 2),
            rotation=(0, 0, ang)
        )
        r_stile = bpy.context.active_object
        r_stile.scale = (0.07, 0.045, panel_height)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        r_stile.data.materials.append(mat_frame)
        objects.append(r_stile)
        
        # Top & Bottom & Mid rails
        for rz in [0.08, 0.45, panel_height - 0.08]:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, rz), rotation=(0, 0, ang))
            rail = bpy.context.active_object
            rail.scale = (panel_width, 0.045, 0.10)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            rail.data.materials.append(mat_frame)
            objects.append(rail)
            
        # Top Crown Crest (Đỉnh chạm hoa văn mây)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, panel_height + 0.05), rotation=(0, 0, ang))
        crown = bpy.context.active_object
        crown.scale = (panel_width * 0.92, 0.035, 0.08)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        crown.data.materials.append(mat_gold_trim)
        objects.append(crown)
        
        # Center Silk Panel (Tranh lụa vẽ hoa sen & trăng khuyết)
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(px, py, (panel_height + 0.45) / 2),
            rotation=(0, 0, ang)
        )
        silk = bpy.context.active_object
        silk.scale = (panel_width - 0.12, 0.012, panel_height - 0.65)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        silk.data.materials.append(mat_silk_panel)
        objects.append(silk)
        
        # Lower Carved Openwork Panel (Chấn song chạm thủng phía dưới)
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(px, py, 0.265),
            rotation=(0, 0, ang)
        )
        lower_open = bpy.context.active_object
        lower_open.scale = (panel_width - 0.12, 0.02, 0.27)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        lower_open.data.materials.append(mat_frame)
        objects.append(lower_open)
        
        cur_x += dx
        cur_y += dy

    # Join and export
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("binh_phong.glb", target_width=3.60)

# ==============================================================================
# 5. DEN LONG KIEU (HEXAGONAL SILK PALACE LANTERN - 0.8m)
# ==============================================================================
def build_den_long_kieu():
    reset_scene()
    print("[BUILDER] Building Hexagonal Silk Palace Lantern...")
    
    mat_wood = create_pbr_material("Lantern_Wood", (0.24, 0.08, 0.04, 1.0), roughness=0.35, metalness=0.05)
    mat_gold = create_pbr_material("Lantern_Gold", (0.85, 0.68, 0.22, 1.0), roughness=0.22, metalness=0.85)
    mat_silk_glow = create_pbr_material("Lantern_SilkShade", (0.95, 0.78, 0.45, 1.0), roughness=0.50, metalness=0.02,
                                        emissive=(1.0, 0.70, 0.25, 1.0), emissive_strength=1.2)
    mat_tassel = create_pbr_material("Lantern_Tassel", (0.85, 0.15, 0.10, 1.0), roughness=0.60, metalness=0.05)
    
    objects = []
    
    # 5.1 Hexagonal Roof Cap (Mái ngói lục giác cong đầu đao)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=0.06, vertices=6, location=(0, 0, 0.72))
    roof = bpy.context.active_object
    roof.data.materials.append(mat_wood)
    objects.append(roof)
    
    # Top Finial & Suspension Ring
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.08, vertices=12, location=(0, 0, 0.78))
    top_post = bpy.context.active_object
    top_post.data.materials.append(mat_gold)
    objects.append(top_post)
    
    bpy.ops.mesh.primitive_torus_add(major_radius=0.04, minor_radius=0.008, location=(0, 0, 0.84), rotation=(math.pi/2, 0, 0))
    ring = bpy.context.active_object
    ring.data.materials.append(mat_gold)
    objects.append(ring)
    
    # 5.2 Glowing Silk Shade (Lồng đèn lục giác phát sáng ấm áp)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.46, vertices=6, location=(0, 0, 0.46))
    shade = bpy.context.active_object
    shade.data.materials.append(mat_silk_glow)
    objects.append(shade)
    
    # 6 Vertical wooden ribs on corners
    for i in range(6):
        ang = i * math.pi / 3
        rx = 0.225 * math.cos(ang)
        ry = 0.225 * math.sin(ang)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rx, ry, 0.46), rotation=(0, 0, ang))
        rib = bpy.context.active_object
        rib.scale = (0.015, 0.015, 0.48)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        rib.data.materials.append(mat_wood)
        objects.append(rib)
        
    # 5.3 Bottom Base Frame
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.05, vertices=6, location=(0, 0, 0.20))
    base = bpy.context.active_object
    base.data.materials.append(mat_wood)
    objects.append(base)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.26, depth=0.012, vertices=6, location=(0, 0, 0.23))
    btrim = bpy.context.active_object
    btrim.data.materials.append(mat_gold)
    objects.append(btrim)
    
    # 5.4 Red Silk Hanging Tassel (Tua rua lụa đỏ dưới đáy đèn)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.10, vertices=12, location=(0, 0, 0.12))
    tassel_cord = bpy.context.active_object
    tassel_cord.data.materials.append(mat_tassel)
    objects.append(tassel_cord)
    
    bpy.ops.mesh.primitive_cone_add(radius1=0.035, radius2=0.008, depth=0.15, vertices=16, location=(0, 0, 0.00))
    tassel_skirt = bpy.context.active_object
    tassel_skirt.data.materials.append(mat_tassel)
    objects.append(tassel_skirt)

    # Join and export
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("den_long_kieu.glb", target_height=0.85)

if __name__ == "__main__":
    print("=" * 70)
    print("GENERATING ALL 5 KIEU MASTERPIECE 3D ASSETS VIA BLENDER...")
    print("=" * 70)
    build_sach_truyen_kieu()
    build_an_thu_grand()
    build_dan_ty_ba_with_stand()
    build_binh_phong()
    build_den_long_kieu()
    print("=" * 70)
    print("ALL 5 ASSETS SUCCESSFULLY BUILT AND EXPORTED TO GLB!")
    print("=" * 70)
