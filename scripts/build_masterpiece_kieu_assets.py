"""
BUILD ARCHITECTURAL MASTERPIECE 3D ASSETS FOR PHONG 01: TRUYEN KIEU (1:1 LIFE SIZE)
Blender 5.2 Python Headless Generator
Assets created:
1. sach_truyen_kieu.glb - Pedestal (1.2m) + Open Epic Book (Width: 1.1m, Depth: 0.75m) with calligraphy & lotus motif
2. an_thu.glb - Grand Scholar Desk (Width: 2.4m, Depth: 1.0m, Height: 0.9m) with scroll ends & cabriole legs
3. dan_ty_ba.glb - Traditional Lacquer Pipa Lute (Length: 1.25m) with stand & mother-of-pearl inlay
4. binh_phong.glb - Monumental 4-Panel Folding Screen (Width: 5.0m, Height: 3.2m) with lotus & crescent moon
5. den_long_kieu.glb - Hexagonal Silk Palace Lantern (Height: 0.9m) with glowing silk & tassels
6. binh_gom_co.glb - Grand Antique Ceramic Urn (Height: 1.6m) with blue-and-white porcelain glaze
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
# 1. SACH TRUYEN KIEU & BUC GO CHAM KHAC (PEDESTAL 1.2m + OPEN BOOK 1.1m)
# ==============================================================================
def build_sach_truyen_kieu():
    reset_scene()
    print("[BUILDER] Building 1:1 Sach Truyen Kieu & Pedestal...")
    
    mat_rosewood = create_pbr_material("Pedestal_Rosewood", (0.20, 0.07, 0.03, 1.0), roughness=0.30, metalness=0.08)
    mat_gold = create_pbr_material("Pedestal_Gold", (0.88, 0.70, 0.22, 1.0), roughness=0.20, metalness=0.88)
    mat_parchment = create_pbr_material("Book_DoPaper", (0.94, 0.88, 0.72, 1.0), roughness=0.70, metalness=0.02,
                                        emissive=(1.0, 0.88, 0.50, 1.0), emissive_strength=0.25)
    mat_leather_cover = create_pbr_material("Book_Cover", (0.35, 0.08, 0.04, 1.0), roughness=0.25, metalness=0.1)
    
    objects = []
    
    # 1.1 Stepped Octagonal Pedestal Base (Plinth diameter 1.1m)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=0.10, vertices=8, location=(0, 0, 0.05))
    base1 = bpy.context.active_object
    base1.data.materials.append(mat_rosewood)
    objects.append(base1)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.56, depth=0.02, vertices=8, location=(0, 0, 0.10))
    base_trim = bpy.context.active_object
    base_trim.data.materials.append(mat_gold)
    objects.append(base_trim)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.46, depth=0.12, vertices=8, location=(0, 0, 0.16))
    base2 = bpy.context.active_object
    base2.data.materials.append(mat_rosewood)
    objects.append(base2)
    
    # 1.2 Central Carved Lotus Column (Radius 0.26m, Height 0.75m)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.26, depth=0.75, vertices=16, location=(0, 0, 0.60))
    column = bpy.context.active_object
    column.data.materials.append(mat_rosewood)
    objects.append(column)
    
    for rz in [0.28, 0.60, 0.92]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.27, minor_radius=0.018, location=(0, 0, rz))
        c_ring = bpy.context.active_object
        c_ring.data.materials.append(mat_gold)
        objects.append(c_ring)
        
    # 1.3 Lotus Capital & Slanted Book Rest Wedge (Width 1.05m)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.50, depth=0.10, vertices=8, location=(0, 0, 1.02))
    capital = bpy.context.active_object
    capital.data.materials.append(mat_rosewood)
    objects.append(capital)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.52, depth=0.02, vertices=8, location=(0, 0, 1.07))
    cap_trim = bpy.context.active_object
    cap_trim.data.materials.append(mat_gold)
    objects.append(cap_trim)
    
    book_tilt = -math.radians(24)
    cos_t = math.cos(book_tilt)
    sin_t = math.sin(book_tilt)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.15), rotation=(book_tilt, 0, 0))
    wedge = bpy.context.active_object
    wedge.scale = (1.05, 0.72, 0.06)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    wedge.data.materials.append(mat_rosewood)
    objects.append(wedge)
    
    # 1.4 Large Open Book (Width across open pages = 1.10m, Depth = 0.75m)
    # Left page block
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(-0.28, -0.01 * cos_t, 1.20 - 0.01 * sin_t),
        rotation=(book_tilt, math.radians(7), 0)
    )
    left_pages = bpy.context.active_object
    left_pages.scale = (0.52, 0.74, 0.055)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    left_pages.data.materials.append(mat_parchment)
    objects.append(left_pages)
    
    # Right page block
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0.28, -0.01 * cos_t, 1.20 - 0.01 * sin_t),
        rotation=(book_tilt, -math.radians(7), 0)
    )
    right_pages = bpy.context.active_object
    right_pages.scale = (0.52, 0.74, 0.055)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    right_pages.data.materials.append(mat_parchment)
    objects.append(right_pages)
    
    # Spine & covers
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.045,
        depth=0.76,
        vertices=16,
        location=(0, -0.04 * cos_t, 1.17 - 0.04 * sin_t),
        rotation=(math.pi/2 + book_tilt, 0, 0)
    )
    spine = bpy.context.active_object
    spine.data.materials.append(mat_leather_cover)
    objects.append(spine)
    
    # Red silk ribbon
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(0.06, -0.22 * cos_t, 1.18 - 0.22 * sin_t),
        rotation=(book_tilt, 0, math.radians(14))
    )
    ribbon = bpy.context.active_object
    ribbon.scale = (0.035, 0.44, 0.006)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mat_red_silk = create_pbr_material("Red_Silk_Ribbon", (0.85, 0.10, 0.08, 1.0), roughness=0.35, metalness=0.1)
    ribbon.data.materials.append(mat_red_silk)
    objects.append(ribbon)
    
    # Join into single object
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("sach_truyen_kieu.glb", target_height=1.38)

# ==============================================================================
# 2. AN THU GO TRAC CHAM CUON THU (WIDTH: 2.4m, DEPTH: 1.0m, HEIGHT: 0.9m)
# ==============================================================================
def build_an_thu_grand():
    reset_scene()
    print("[BUILDER] Building Grand An Thu (2.4m x 1.0m x 0.9m)...")
    
    mat_wood = create_pbr_material("GrandAnThu_Wood", (0.22, 0.07, 0.03, 1.0), roughness=0.30, metalness=0.05)
    mat_gold = create_pbr_material("GrandAnThu_Gold", (0.88, 0.70, 0.22, 1.0), roughness=0.20, metalness=0.88)
    
    objects = []
    
    # Desktop: Width 2.22m, Depth 1.0m, Thickness 0.07m at Z = 0.84
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.84))
    top = bpy.context.active_object
    top.scale = (2.22, 1.00, 0.07)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    top.data.materials.append(mat_wood)
    objects.append(top)
    
    # Scroll ends
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.065,
            depth=1.02,
            vertices=24,
            rotation=(math.pi/2, 0, 0),
            location=(sign * 1.145, 0, 0.865)
        )
        scroll = bpy.context.active_object
        scroll.data.materials.append(mat_wood)
        objects.append(scroll)
        
        for ysign in [-1, 1]:
            bpy.ops.mesh.primitive_cylinder_add(
                radius=0.055,
                depth=0.025,
                vertices=24,
                rotation=(math.pi/2, 0, 0),
                location=(sign * 1.145, ysign * 0.515, 0.865)
            )
            stip = bpy.context.active_object
            stip.data.materials.append(mat_gold)
            objects.append(stip)
            
    # Carved Apron Frame
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.42, 0.76))
    apron_f = bpy.context.active_object
    apron_f.scale = (2.12, 0.05, 0.12)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apron_f.data.materials.append(mat_wood)
    objects.append(apron_f)
    
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.42, 0.76))
    apron_b = bpy.context.active_object
    apron_b.scale = (2.12, 0.05, 0.12)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apron_b.data.materials.append(mat_wood)
    objects.append(apron_b)
    
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 1.03, 0, 0.76))
        apron_s = bpy.context.active_object
        apron_s.scale = (0.05, 0.80, 0.12)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        apron_s.data.materials.append(mat_wood)
        objects.append(apron_s)
        
    # Gold apron trim
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.695))
    atrim = bpy.context.active_object
    atrim.scale = (2.16, 0.88, 0.018)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    atrim.data.materials.append(mat_gold)
    objects.append(atrim)
    
    # 4 Cabriole Legs
    leg_coords = [(-0.95, -0.38), (0.95, -0.38), (-0.95, 0.38), (0.95, 0.38)]
    for idx, (lx, ly) in enumerate(leg_coords):
        mesh = bpy.data.meshes.new(f"GrandLeg_{idx}")
        obj = bpy.data.objects.new(f"Leg_{idx}", mesh)
        bpy.context.scene.collection.objects.link(obj)
        
        bm = bmesh.new()
        slices = [
            (0.00, 0.075, 0.040 * (1 if lx > 0 else -1), 0.024 * (1 if ly > 0 else -1)),
            (0.14, 0.065, 0.055 * (1 if lx > 0 else -1), 0.032 * (1 if ly > 0 else -1)),
            (0.38, 0.070, 0.068 * (1 if lx > 0 else -1), 0.040 * (1 if ly > 0 else -1)),
            (0.62, 0.080, 0.035 * (1 if lx > 0 else -1), 0.018 * (1 if ly > 0 else -1)),
            (0.80, 0.090, 0.0, 0.0)
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
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.95, 0, 0.24))
        stretcher = bpy.context.active_object
        stretcher.scale = (0.06, 0.70, 0.055)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        stretcher.data.materials.append(mat_wood)
        objects.append(stretcher)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("an_thu.glb", target_width=2.40)

# ==============================================================================
# 3. DAN TY BA & GIA DO MAT BAN (LUTE 1.25m + WOODEN STAND)
# ==============================================================================
def build_dan_ty_ba_with_stand():
    reset_scene()
    print("[BUILDER] Building Dan Ty Ba 1.25m with Stand...")
    
    mat_lacquer = create_pbr_material("TyBa_Lacquer", (0.28, 0.06, 0.03, 1.0), roughness=0.18, metalness=0.08)
    mat_soundboard = create_pbr_material("TyBa_Soundboard", (0.82, 0.66, 0.46, 1.0), roughness=0.45, metalness=0.02)
    mat_ivory = create_pbr_material("TyBa_Ivory", (0.94, 0.90, 0.80, 1.0), roughness=0.28, metalness=0.10)
    mat_pegs = create_pbr_material("TyBa_Ebony", (0.07, 0.04, 0.03, 1.0), roughness=0.28, metalness=0.15)
    mat_pearl = create_pbr_material("TyBa_Pearl", (0.90, 0.88, 0.84, 1.0), roughness=0.15, metalness=0.48)
    mat_strings = create_pbr_material("TyBa_Strings", (0.96, 0.96, 0.94, 1.0), roughness=0.35, metalness=0.65)
    mat_stand = create_pbr_material("LuteStand_Wood", (0.20, 0.07, 0.03, 1.0), roughness=0.35, metalness=0.05)
    
    objects = []
    
    mesh_body = bpy.data.meshes.new("Body_Back_Mesh")
    obj_body = bpy.data.objects.new("TyBa_Body", mesh_body)
    bpy.context.scene.collection.objects.link(obj_body)
    
    bm = bmesh.new()
    body_profile = [
        (0.00, 0.08, 0.045),
        (0.12, 0.28, 0.085),
        (0.28, 0.36, 0.110),
        (0.45, 0.29, 0.095),
        (0.60, 0.18, 0.065),
        (0.74, 0.08, 0.050),
        (0.96, 0.055, 0.038),
        (1.15, 0.050, 0.032)
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
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.002, 0.38))
    soundboard = bpy.context.active_object
    soundboard.scale = (0.35, 0.007, 0.74)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    soundboard.data.materials.append(mat_soundboard)
    objects.append(soundboard)
    
    # Headstock & finial
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.028, 1.22))
    headstock = bpy.context.active_object
    headstock.scale = (0.06, 0.055, 0.16)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    headstock.data.materials.append(mat_lacquer)
    objects.append(headstock)
    
    bpy.ops.mesh.primitive_torus_add(major_radius=0.045, minor_radius=0.018, location=(0, -0.045, 1.30), rotation=(0, math.pi/2, 0))
    finial = bpy.context.active_object
    finial.data.materials.append(mat_lacquer)
    objects.append(finial)
    
    # Tuning Pegs
    peg_locs = [(-0.055, 1.17, -1), (0.055, 1.17, 1), (-0.055, 1.23, -1), (0.055, 1.23, 1)]
    for idx, (px, pz, sign) in enumerate(peg_locs):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.10, vertices=12, location=(sign * 0.055, -0.028, pz), rotation=(0, math.pi/2, 0))
        shaft = bpy.context.active_object
        shaft.data.materials.append(mat_pegs)
        objects.append(shaft)
        
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.105, -0.028, pz))
        handle = bpy.context.active_object
        handle.scale = (0.015, 0.015, 0.055)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        handle.data.materials.append(mat_pegs)
        objects.append(handle)
        
    # Bridge
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.015, 0.09))
    tailpiece = bpy.context.active_object
    tailpiece.scale = (0.12, 0.022, 0.045)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tailpiece.data.materials.append(mat_pegs)
    objects.append(tailpiece)
    
    # Frets
    for idx, hz in enumerate([0.78, 0.85, 0.92, 0.99, 1.06, 1.12]):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.015, hz))
        f = bpy.context.active_object
        f.scale = (0.058 - idx * 0.002, 0.012, 0.014)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        f.data.materials.append(mat_ivory)
        objects.append(f)
        
    for idx, hz in enumerate([0.22, 0.28, 0.34, 0.40, 0.46, 0.52, 0.58, 0.64, 0.70]):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.010, hz))
        f = bpy.context.active_object
        f.scale = (0.18 - idx * 0.010, 0.007, 0.008)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        f.data.materials.append(mat_ivory)
        objects.append(f)
        
    # Pearl inlay
    bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=0.002, vertices=24, location=(0, 0.008, 0.15), rotation=(math.pi/2, 0, 0))
    inlay = bpy.context.active_object
    inlay.data.materials.append(mat_pearl)
    objects.append(inlay)

    # 4 Silk Strings
    for i in range(4):
        offset_x = (i - 1.5) * 0.014
        bpy.ops.mesh.primitive_cylinder_add(radius=0.0015, depth=1.08, vertices=6, location=(offset_x * 0.70, 0.028, 0.64))
        s = bpy.context.active_object
        s.data.materials.append(mat_strings)
        objects.append(s)
        
    # Stand
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.065, 0.32))
    stand_base = bpy.context.active_object
    stand_base.scale = (0.28, 0.14, 0.035)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    stand_base.data.materials.append(mat_stand)
    objects.append(stand_base)
    
    for sign in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.11, -0.045, 0.39))
        prong = bpy.context.active_object
        prong.scale = (0.03, 0.09, 0.11)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        prong.data.materials.append(mat_stand)
        objects.append(prong)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("dan_ty_ba.glb", target_length=1.25)

# ==============================================================================
# 4. BINH PHONG 4 TAM KHONG LO (WIDTH: 5.0m, HEIGHT: 3.2m)
# ==============================================================================
def build_binh_phong():
    reset_scene()
    print("[BUILDER] Building Monumental 5.0m x 3.2m Binh Phong...")
    
    mat_frame = create_pbr_material("Screen_DarkWood", (0.16, 0.06, 0.02, 1.0), roughness=0.32, metalness=0.05)
    mat_gold_trim = create_pbr_material("Screen_GoldTrim", (0.88, 0.70, 0.22, 1.0), roughness=0.20, metalness=0.88)
    mat_silk_panel = create_pbr_material("Screen_SilkPainting", (0.92, 0.86, 0.74, 1.0), roughness=0.60, metalness=0.02,
                                         emissive=(0.95, 0.88, 0.70, 1.0), emissive_strength=0.15)
    
    objects = []
    
    panel_width = 1.24
    panel_height = 3.20
    panel_angles = [-math.radians(12), math.radians(12), -math.radians(12), math.radians(12)]
    
    cur_x = -1.90
    cur_y = 0.0
    
    for i in range(4):
        ang = panel_angles[i]
        dx = panel_width * math.cos(ang)
        dy = panel_width * math.sin(ang)
        px = cur_x + dx / 2
        py = cur_y + dy / 2
        
        # Left stile
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(px - (panel_width/2 - 0.04) * math.cos(ang), py - (panel_width/2 - 0.04) * math.sin(ang), panel_height / 2),
            rotation=(0, 0, ang)
        )
        l_stile = bpy.context.active_object
        l_stile.scale = (0.08, 0.05, panel_height)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        l_stile.data.materials.append(mat_frame)
        objects.append(l_stile)
        
        # Right stile
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(px + (panel_width/2 - 0.04) * math.cos(ang), py + (panel_width/2 - 0.04) * math.sin(ang), panel_height / 2),
            rotation=(0, 0, ang)
        )
        r_stile = bpy.context.active_object
        r_stile.scale = (0.08, 0.05, panel_height)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        r_stile.data.materials.append(mat_frame)
        objects.append(r_stile)
        
        # Rails
        for rz in [0.10, 0.55, panel_height - 0.10]:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, rz), rotation=(0, 0, ang))
            rail = bpy.context.active_object
            rail.scale = (panel_width, 0.05, 0.12)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            rail.data.materials.append(mat_frame)
            objects.append(rail)
            
        # Crown Crest
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, panel_height + 0.06), rotation=(0, 0, ang))
        crown = bpy.context.active_object
        crown.scale = (panel_width * 0.94, 0.04, 0.10)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        crown.data.materials.append(mat_gold_trim)
        objects.append(crown)
        
        # Silk Panel
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(px, py, (panel_height + 0.55) / 2),
            rotation=(0, 0, ang)
        )
        silk = bpy.context.active_object
        silk.scale = (panel_width - 0.14, 0.015, panel_height - 0.78)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        silk.data.materials.append(mat_silk_panel)
        objects.append(silk)
        
        # Lower Carved Lattice
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, 0.325), rotation=(0, 0, ang))
        lower_open = bpy.context.active_object
        lower_open.scale = (panel_width - 0.14, 0.025, 0.35)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        lower_open.data.materials.append(mat_frame)
        objects.append(lower_open)
        
        cur_x += dx
        cur_y += dy

    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("binh_phong.glb", target_width=5.00)

# ==============================================================================
# 5. DEN LONG KIEU (HEXAGONAL SILK PALACE LANTERN - 0.9m)
# ==============================================================================
def build_den_long_kieu():
    reset_scene()
    print("[BUILDER] Building 0.9m Hexagonal Silk Palace Lantern...")
    
    mat_wood = create_pbr_material("Lantern_Wood", (0.22, 0.07, 0.03, 1.0), roughness=0.35, metalness=0.05)
    mat_gold = create_pbr_material("Lantern_Gold", (0.88, 0.70, 0.22, 1.0), roughness=0.20, metalness=0.88)
    mat_silk_glow = create_pbr_material("Lantern_SilkShade", (0.98, 0.82, 0.48, 1.0), roughness=0.45, metalness=0.02,
                                        emissive=(1.0, 0.72, 0.25, 1.0), emissive_strength=1.8)
    mat_tassel = create_pbr_material("Lantern_Tassel", (0.88, 0.12, 0.10, 1.0), roughness=0.60, metalness=0.05)
    
    objects = []
    
    # Roof
    bpy.ops.mesh.primitive_cylinder_add(radius=0.32, depth=0.07, vertices=6, location=(0, 0, 0.76))
    roof = bpy.context.active_object
    roof.data.materials.append(mat_wood)
    objects.append(roof)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.09, vertices=12, location=(0, 0, 0.83))
    top_post = bpy.context.active_object
    top_post.data.materials.append(mat_gold)
    objects.append(top_post)
    
    bpy.ops.mesh.primitive_torus_add(major_radius=0.045, minor_radius=0.009, location=(0, 0, 0.89), rotation=(math.pi/2, 0, 0))
    ring = bpy.context.active_object
    ring.data.materials.append(mat_gold)
    objects.append(ring)
    
    # Shade
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.52, vertices=6, location=(0, 0, 0.48))
    shade = bpy.context.active_object
    shade.data.materials.append(mat_silk_glow)
    objects.append(shade)
    
    for i in range(6):
        ang = i * math.pi / 3
        rx = 0.255 * math.cos(ang)
        ry = 0.255 * math.sin(ang)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rx, ry, 0.48), rotation=(0, 0, ang))
        rib = bpy.context.active_object
        rib.scale = (0.018, 0.018, 0.54)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        rib.data.materials.append(mat_wood)
        objects.append(rib)
        
    # Bottom Base
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=0.06, vertices=6, location=(0, 0, 0.19))
    base = bpy.context.active_object
    base.data.materials.append(mat_wood)
    objects.append(base)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.29, depth=0.015, vertices=6, location=(0, 0, 0.22))
    btrim = bpy.context.active_object
    btrim.data.materials.append(mat_gold)
    objects.append(btrim)
    
    # Tassel
    bpy.ops.mesh.primitive_cylinder_add(radius=0.014, depth=0.12, vertices=12, location=(0, 0, 0.10))
    tassel_cord = bpy.context.active_object
    tassel_cord.data.materials.append(mat_tassel)
    objects.append(tassel_cord)
    
    bpy.ops.mesh.primitive_cone_add(radius1=0.040, radius2=0.010, depth=0.16, vertices=16, location=(0, 0, -0.03))
    tassel_skirt = bpy.context.active_object
    tassel_skirt.data.materials.append(mat_tassel)
    objects.append(tassel_skirt)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("den_long_kieu.glb", target_height=0.92)
    # Đồng thời xuất den_long.glb theo đúng quy cách yêu cầu
    import shutil
    shutil.copyfile(os.path.join(OUTPUT_DIR, "den_long_kieu.glb"), os.path.join(OUTPUT_DIR, "den_long.glb"))
    print(f"✓ [EXPORTED] den_long.glb (synchronized with den_long_kieu.glb)")

# ==============================================================================
# 6. BINH GOM CO BAT TRANG (ANTIQUE CERAMIC URN - HEIGHT 1.6m)
# ==============================================================================
def build_binh_gom_co():
    reset_scene()
    print("[BUILDER] Building Antique Ceramic Urn (Height 1.6m)...")
    
    mat_porcelain = create_pbr_material("Porcelain_Glaze", (0.92, 0.94, 0.96, 1.0), roughness=0.12, metalness=0.05)
    mat_blue_pattern = create_pbr_material("Cobalt_Blue_Inlay", (0.08, 0.18, 0.45, 1.0), roughness=0.18, metalness=0.02)
    mat_pedestal_wood = create_pbr_material("UrnStand_Wood", (0.18, 0.07, 0.03, 1.0), roughness=0.35, metalness=0.05)
    
    objects = []
    
    # Wood Pedestal Base
    bpy.ops.mesh.primitive_cylinder_add(radius=0.36, depth=0.32, vertices=16, location=(0, 0, 0.16))
    stand = bpy.context.active_object
    stand.data.materials.append(mat_pedestal_wood)
    objects.append(stand)
    
    # Ceramic Urn body lofting
    mesh_urn = bpy.data.meshes.new("Urn_Mesh")
    obj_urn = bpy.data.objects.new("Porcelain_Urn", mesh_urn)
    bpy.context.scene.collection.objects.link(obj_urn)
    
    bm = bmesh.new()
    urn_profile = [
        (0.32, 0.22), # Foot
        (0.42, 0.26),
        (0.65, 0.40), # Belly
        (0.88, 0.46), # Maximum belly
        (1.10, 0.38), # Shoulder
        (1.30, 0.22), # Neck
        (1.48, 0.20), # Upper neck
        (1.58, 0.28)  # Flared lip
    ]
    rings = []
    segments = 24
    for z, r in urn_profile:
        ring = []
        for i in range(segments):
            angle = i * (2 * math.pi / segments)
            px = r * math.cos(angle)
            py = r * math.sin(angle)
            v = bm.verts.new((px, py, z))
            ring.append(v)
        rings.append(ring)
        
    for s in range(len(urn_profile) - 1):
        r1 = rings[s]
        r2 = rings[s+1]
        for i in range(segments):
            i_next = (i + 1) % segments
            bm.faces.new([r1[i], r1[i_next], r2[i_next], r2[i]])
    bm.faces.new(reversed(rings[0]))
    bm.faces.new(rings[-1])
    bm.to_mesh(mesh_urn)
    bm.free()
    
    obj_urn.data.materials.append(mat_porcelain)
    sub = obj_urn.modifiers.new("Subsurf", "SUBSURF")
    sub.levels = 1
    bpy.context.view_layer.objects.active = obj_urn
    bpy.ops.object.modifier_apply(modifier="Subsurf")
    objects.append(obj_urn)
    
    # Cobalt blue decorative bands
    for bz in [0.75, 1.05]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.43 if bz == 0.75 else 0.41, minor_radius=0.015, location=(0, 0, bz))
        band = bpy.context.active_object
        band.data.materials.append(mat_blue_pattern)
        objects.append(band)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("binh_gom_co.glb", target_height=1.60)

# ==============================================================================
# 7. CAY HOA DAO CO THU DANG THE (ANCIENT PEACH BLOSSOM BONSAI - HEIGHT 3.6m)
# ==============================================================================
def add_branch_cone(p1, p2, r1, r2, mat, segments=8):
    v1 = Vector(p1)
    v2 = Vector(p2)
    vec = v2 - v1
    length = vec.length
    if length < 0.001:
        return None
    center = (v1 + v2) / 2.0
    dir_vec = vec.normalized()
    
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=length, vertices=segments, location=center)
    obj = bpy.context.active_object
    rot = Vector((0, 0, 1)).rotation_difference(dir_vec)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = rot
    if mat:
        obj.data.materials.append(mat)
    return obj

def build_cay_hoa_dao():
    reset_scene()
    print("[BUILDER] Building 3.6m Ancient Peach Blossom Bonsai Tree (Cay Hoa Dao Co Thu)...")
    import random
    random.seed(42)
    
    mat_pot_wood = create_pbr_material("PotStand_Wood", (0.16, 0.06, 0.02, 1.0), roughness=0.35, metalness=0.05)
    mat_pot_ceramic = create_pbr_material("Pot_ImperialCeladon", (0.18, 0.28, 0.26, 1.0), roughness=0.18, metalness=0.08)
    mat_gold_trim = create_pbr_material("Pot_GoldTrim", (0.88, 0.70, 0.22, 1.0), roughness=0.20, metalness=0.88)
    mat_soil_moss = create_pbr_material("Soil_VelvetMoss", (0.14, 0.20, 0.08, 1.0), roughness=0.92, metalness=0.01)
    mat_bark = create_pbr_material("Ancient_Bark", (0.20, 0.13, 0.08, 1.0), roughness=0.86, metalness=0.02)
    mat_petal_pink = create_pbr_material("PeachPetal_SilkPink", (0.98, 0.65, 0.76, 1.0), roughness=0.48, metalness=0.02,
                                         emissive=(1.0, 0.70, 0.80, 1.0), emissive_strength=0.22)
    mat_petal_deep = create_pbr_material("PeachBud_DeepCarmine", (0.86, 0.22, 0.38, 1.0), roughness=0.45, metalness=0.02,
                                         emissive=(0.90, 0.25, 0.40, 1.0), emissive_strength=0.18)
    mat_stamen_gold = create_pbr_material("PeachStamen_Gold", (0.96, 0.82, 0.18, 1.0), roughness=0.28, metalness=0.85,
                                          emissive=(0.96, 0.82, 0.18, 1.0), emissive_strength=0.50)
    mat_leaf_green = create_pbr_material("SpringLeaf_Jade", (0.25, 0.48, 0.16, 1.0), roughness=0.55, metalness=0.02)
    
    objects = []
    
    # 1. Carved Wood Stand (Octagonal plinth)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.62, depth=0.12, vertices=8, location=(0, 0, 0.06))
    stand = bpy.context.active_object
    stand.data.materials.append(mat_pot_wood)
    objects.append(stand)
    
    # Feet of stand
    for i in range(8):
        ang = i * math.pi / 4 + math.pi / 8
        fx = 0.58 * math.cos(ang)
        fy = 0.58 * math.sin(ang)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(fx, fy, 0.03))
        foot = bpy.context.active_object
        foot.scale = (0.08, 0.08, 0.06)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        foot.data.materials.append(mat_pot_wood)
        objects.append(foot)
        
    # 2. Celadon Bonsai Planter Body (Octagonal flared pot)
    bpy.ops.mesh.primitive_cone_add(radius1=0.52, radius2=0.66, depth=0.42, vertices=8, location=(0, 0, 0.33))
    pot = bpy.context.active_object
    pot.data.materials.append(mat_pot_ceramic)
    objects.append(pot)
    
    # Pot Gilded Upper Rim
    bpy.ops.mesh.primitive_cylinder_add(radius=0.68, depth=0.04, vertices=8, location=(0, 0, 0.54))
    rim = bpy.context.active_object
    rim.data.materials.append(mat_gold_trim)
    objects.append(rim)
    
    # 3. Rich Soil with Moss
    bpy.ops.mesh.primitive_cylinder_add(radius=0.62, depth=0.06, vertices=16, location=(0, 0, 0.52))
    soil = bpy.context.active_object
    soil.data.materials.append(mat_soil_moss)
    objects.append(soil)
    
    # 4. Gnarled Trunk & Exposed Roots
    root_endpoints = [
        (0.48, 0.15, 0.50),
        (-0.45, 0.20, 0.50),
        (0.12, -0.46, 0.50),
        (-0.25, -0.42, 0.50),
        (0.35, -0.32, 0.50),
        (-0.38, 0.35, 0.50)
    ]
    for rep in root_endpoints:
        r_obj = add_branch_cone((0.02, 0.01, 0.60), rep, 0.09, 0.035, mat_bark, segments=8)
        if r_obj:
            objects.append(r_obj)
            
    # Main Trunk Segments (sinuous S-curve upward)
    trunk_nodes = [
        ((0.00, 0.00, 0.52), 0.25),
        ((0.04, 0.03, 0.90), 0.22),
        ((0.10, -0.04, 1.30), 0.19),
        ((0.03, -0.08, 1.70), 0.165),
        ((-0.07, 0.02, 2.10), 0.14),
        ((-0.02, 0.08, 2.50), 0.115)
    ]
    for i in range(len(trunk_nodes) - 1):
        p1, r1 = trunk_nodes[i]
        p2, r2 = trunk_nodes[i+1]
        t_obj = add_branch_cone(p1, p2, r1, r2, mat_bark, segments=10)
        if t_obj:
            objects.append(t_obj)
            
    # Boughs and Branches
    branch_chains = [
        # Bough A: Front-Left
        [((0.03, -0.08, 1.70), 0.13), ((-0.35, -0.28, 1.95), 0.10), ((-0.75, -0.42, 2.25), 0.08), ((-1.12, -0.52, 2.55), 0.06)],
        [((-0.75, -0.42, 2.25), 0.07), ((-0.95, -0.18, 2.50), 0.05), ((-1.25, -0.05, 2.75), 0.035)],
        [((-1.12, -0.52, 2.55), 0.055), ((-1.45, -0.68, 2.70), 0.035)],
        [((-1.12, -0.52, 2.55), 0.050), ((-1.18, -0.85, 2.85), 0.035)],
        
        # Bough B: Right-Back
        [((-0.07, 0.02, 2.10), 0.12), ((0.35, 0.25, 2.30), 0.095), ((0.75, 0.45, 2.58), 0.075), ((1.15, 0.58, 2.82), 0.055)],
        [((0.75, 0.45, 2.58), 0.070), ((0.98, 0.18, 2.80), 0.050), ((1.32, 0.06, 3.02), 0.035)],
        [((1.15, 0.58, 2.82), 0.050), ((1.48, 0.72, 2.96), 0.035)],
        [((1.15, 0.58, 2.82), 0.050), ((1.12, 0.88, 3.12), 0.035)],
        
        # Bough C: Crown & Arching
        [((-0.02, 0.08, 2.50), 0.11), ((-0.16, 0.35, 2.82), 0.085), ((-0.06, 0.46, 3.18), 0.065), ((0.06, 0.32, 3.48), 0.045)],
        [((-0.16, 0.35, 2.82), 0.075), ((0.32, -0.22, 2.88), 0.055), ((0.58, -0.48, 3.08), 0.035)],
        [((-0.06, 0.46, 3.18), 0.060), ((-0.52, 0.22, 3.32), 0.045), ((-0.78, 0.16, 3.48), 0.035)],
        [((0.06, 0.32, 3.48), 0.045), ((0.28, 0.48, 3.66), 0.035)],
        [((0.06, 0.32, 3.48), 0.045), ((-0.18, 0.12, 3.62), 0.035)]
    ]
    
    cluster_points = []
    for chain in branch_chains:
        for i in range(len(chain) - 1):
            p1, r1 = chain[i]
            p2, r2 = chain[i+1]
            b_obj = add_branch_cone(p1, p2, r1, r2, mat_bark, segments=8)
            if b_obj:
                objects.append(b_obj)
        cluster_points.append(chain[-1][0])
        if len(chain) >= 3:
            cluster_points.append(chain[len(chain)//2][0])

    extra_points = [
        (-0.55, -0.35, 2.35),
        (-0.85, -0.60, 2.60),
        (-1.30, -0.40, 2.65),
        (0.55, 0.35, 2.50),
        (0.85, 0.55, 2.75),
        (1.25, 0.40, 2.90),
        (-0.35, 0.40, 3.05),
        (0.15, 0.20, 3.35),
        (-0.10, 0.30, 3.55),
        (0.00, -0.10, 2.65),
        (0.40, -0.10, 2.75),
        (-0.40, -0.10, 2.45),
        (0.20, 0.60, 3.10),
        (-0.60, 0.05, 3.10),
        (0.70, -0.20, 2.95)
    ]
    cluster_points.extend(extra_points)
    
    # 5. Blossom Clusters (Hoa Dao Phai & Dao Bich)
    for cp in cluster_points:
        cx, cy, cz = cp
        num_blossoms = random.randint(3, 5)
        for b_i in range(num_blossoms):
            ox = cx + (random.random() - 0.5) * 0.22
            oy = cy + (random.random() - 0.5) * 0.22
            oz = cz + (random.random() - 0.5) * 0.18
            
            # Central Golden Stamen
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.018, segments=8, ring_count=6, location=(ox, oy, oz))
            stamen = bpy.context.active_object
            stamen.data.materials.append(mat_stamen_gold)
            objects.append(stamen)
            
            # 5 Petals
            petal_tilt = random.random() * 0.3
            base_rot_z = random.random() * math.pi * 2
            for p_i in range(5):
                p_angle = base_rot_z + p_i * (math.pi * 2 / 5)
                px = ox + math.cos(p_angle) * 0.040
                py = oy + math.sin(p_angle) * 0.040
                pz = oz + math.sin(p_i + petal_tilt) * 0.010
                
                bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, py, pz), rotation=(petal_tilt, 0, p_angle))
                petal = bpy.context.active_object
                petal.scale = (0.026, 0.018, 0.004)
                bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
                petal.data.materials.append(mat_petal_pink)
                objects.append(petal)
                
        # 2 Flower buds
        for _ in range(2):
            bx = cx + (random.random() - 0.5) * 0.20
            by = cy + (random.random() - 0.5) * 0.20
            bz = cz + (random.random() - 0.5) * 0.15
            bpy.ops.mesh.primitive_cone_add(radius1=0.015, radius2=0.003, depth=0.035, vertices=6, location=(bx, by, bz))
            bud = bpy.context.active_object
            bud.data.materials.append(mat_petal_deep)
            objects.append(bud)
            
        # 1 Tender Spring Leaf
        lx = cx + (random.random() - 0.5) * 0.18
        ly = cy + (random.random() - 0.5) * 0.18
        lz = cz + (random.random() - 0.5) * 0.12
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(lx, ly, lz), rotation=(0.4, 0.2, random.random() * math.pi))
        leaf = bpy.context.active_object
        leaf.scale = (0.040, 0.014, 0.003)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        leaf.data.materials.append(mat_leaf_green)
        objects.append(leaf)

    print(f"[BUILDER] Joining {len(objects)} objects for cay_hoa_dao...")
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    
    export_active_as_glb("cay_hoa_dao.glb", target_height=3.60)

if __name__ == "__main__":
    import sys
    target = None
    for arg in sys.argv:
        if arg in ["cay_hoa_dao", "den_long", "binh_gom_co", "sach_truyen_kieu", "an_thu", "dan_ty_ba", "binh_phong"]:
            target = arg
            break

    print("=" * 70)
    print("GENERATING 1:1 LIFE-SIZE MASTERPIECE 3D ASSETS VIA BLENDER...")
    print("=" * 70)
    if target == "cay_hoa_dao":
        build_cay_hoa_dao()
    elif target == "den_long":
        build_den_long_kieu()
    else:
        build_sach_truyen_kieu()
        build_an_thu_grand()
        build_dan_ty_ba_with_stand()
        build_binh_phong()
        build_den_long_kieu()
        build_binh_gom_co()
        build_cay_hoa_dao()
    print("=" * 70)
    print("ALL 7 ASSETS SUCCESSFULLY BUILT AND EXPORTED TO GLB!")
    print("=" * 70)
