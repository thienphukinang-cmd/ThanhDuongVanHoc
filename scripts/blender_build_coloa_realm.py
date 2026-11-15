import bpy
import bmesh
import math
import os
import shutil
from mathutils import Matrix, Vector

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_mat(name, color, roughness=0.6, metallic=0.1, emissive=(0,0,0,1), emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emissive
            bsdf.inputs['Emission Strength'].default_value = emissive_strength
    return mat

def set_pivot_to_bottom(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    # Apply transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Calculate min z
    min_z = min((obj.matrix_world @ v.co).z for v in obj.data.vertices)
    # Move origin to bottom center
    bpy.ops.object.mode_set(mode='OBJECT')
    for v in obj.data.vertices:
        v.co.z -= min_z
    obj.data.update()
    obj.location.z = 0.0
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def auto_smooth(obj, angle_deg=35.0):
    for f in obj.data.polygons:
        f.use_smooth = True
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(angle_deg)

def build_kit():
    clear_scene()

    # Materials
    mat_stone = create_mat("M_StoneLaterite", (0.33, 0.22, 0.18, 1.0), roughness=0.85, metallic=0.05)
    mat_rammed = create_mat("M_RammedEarth", (0.42, 0.28, 0.20, 1.0), roughness=0.92, metallic=0.02)
    mat_wood = create_mat("M_LimWood", (0.15, 0.08, 0.05, 1.0), roughness=0.65, metallic=0.15)
    mat_tile = create_mat("M_RoofTileRed", (0.55, 0.12, 0.08, 1.0), roughness=0.70, metallic=0.05)
    mat_bronze = create_mat("M_AntiqueBronze", (0.65, 0.45, 0.22, 1.0), roughness=0.40, metallic=0.85)
    mat_gold_glow = create_mat("M_GoldGlow", (1.0, 0.75, 0.15, 1.0), roughness=0.25, metallic=0.95, emissive=(1.0, 0.70, 0.10, 1.0), emissive_strength=3.5)
    mat_jade = create_mat("M_JadeCyan", (0.05, 0.85, 0.75, 1.0), roughness=0.15, metallic=0.20, emissive=(0.0, 0.95, 0.85, 1.0), emissive_strength=2.8)
    mat_water = create_mat("M_DeepWater", (0.08, 0.22, 0.35, 1.0), roughness=0.10, metallic=0.40)

    # 1. Spiral_Citadel_Ramparts (Curved wall with battlements and stone base)
    bm1 = bmesh.new()
    segments = 16
    radius = 12.0
    wall_w = 2.4
    wall_h = 3.8
    for i in range(segments):
        a1 = (i / segments) * (math.pi * 0.45)
        a2 = ((i + 1) / segments) * (math.pi * 0.45)
        
        # 4 bottom vertices, 4 top vertices
        r_in = radius - wall_w * 0.5
        r_out = radius + wall_w * 0.5
        v1 = bm1.verts.new((math.cos(a1) * r_in, math.sin(a1) * r_in, 0))
        v2 = bm1.verts.new((math.cos(a1) * r_out, math.sin(a1) * r_out, 0))
        v3 = bm1.verts.new((math.cos(a2) * r_out, math.sin(a2) * r_out, 0))
        v4 = bm1.verts.new((math.cos(a2) * r_in, math.sin(a2) * r_in, 0))

        v5 = bm1.verts.new((math.cos(a1) * r_in, math.sin(a1) * r_in, wall_h))
        v6 = bm1.verts.new((math.cos(a1) * r_out, math.sin(a1) * r_out, wall_h))
        v7 = bm1.verts.new((math.cos(a2) * r_out, math.sin(a2) * r_out, wall_h))
        v8 = bm1.verts.new((math.cos(a2) * r_in, math.sin(a2) * r_in, wall_h))

        # Faces
        bm1.faces.new((v1, v2, v3, v4)) # Bottom
        bm1.faces.new((v5, v8, v7, v6)) # Top
        bm1.faces.new((v1, v5, v6, v2)) # Start cap / inner
        bm1.faces.new((v2, v6, v7, v3)) # Outer wall
        bm1.faces.new((v3, v7, v8, v4)) # End cap
        bm1.faces.new((v4, v8, v5, v1)) # Inner wall

        # Alternating crenellation on outer edge
        if i % 2 == 0:
            c_h = 0.75
            cv1 = bm1.verts.new((math.cos(a1) * (r_out - 0.5), math.sin(a1) * (r_out - 0.5), wall_h))
            cv2 = bm1.verts.new((math.cos(a1) * r_out, math.sin(a1) * r_out, wall_h))
            cv3 = bm1.verts.new((math.cos(a2) * r_out, math.sin(a2) * r_out, wall_h))
            cv4 = bm1.verts.new((math.cos(a2) * (r_out - 0.5), math.sin(a2) * (r_out - 0.5), wall_h))

            cv5 = bm1.verts.new((math.cos(a1) * (r_out - 0.5), math.sin(a1) * (r_out - 0.5), wall_h + c_h))
            cv6 = bm1.verts.new((math.cos(a1) * r_out, math.sin(a1) * r_out, wall_h + c_h))
            cv7 = bm1.verts.new((math.cos(a2) * r_out, math.sin(a2) * r_out, wall_h + c_h))
            cv8 = bm1.verts.new((math.cos(a2) * (r_out - 0.5), math.sin(a2) * (r_out - 0.5), wall_h + c_h))
            try:
                bm1.faces.new((cv5, cv8, cv7, cv6))
                bm1.faces.new((cv1, cv5, cv6, cv2))
                bm1.faces.new((cv2, cv6, cv7, cv3))
                bm1.faces.new((cv3, cv7, cv8, cv4))
                bm1.faces.new((cv4, cv8, cv5, cv1))
            except Exception:
                pass

    mesh1 = bpy.data.meshes.new("Spiral_Citadel_Ramparts")
    bm1.to_mesh(mesh1)
    bm1.free()
    obj1 = bpy.data.objects.new("Spiral_Citadel_Ramparts", mesh1)
    obj1.data.materials.append(mat_stone)
    bpy.context.collection.objects.link(obj1)
    set_pivot_to_bottom(obj1)
    auto_smooth(obj1)

    # 2. Arch_Wooden_Bridge (Curved bridge over moat)
    bm2 = bmesh.new()
    b_len = 10.0
    b_w = 3.2
    b_segs = 12
    for j in range(b_segs):
        t1 = j / b_segs
        t2 = (j + 1) / b_segs
        x1 = (t1 - 0.5) * b_len
        x2 = (t2 - 0.5) * b_len
        y1_arch = math.sin(t1 * math.pi) * 1.4
        y2_arch = math.sin(t2 * math.pi) * 1.4
        
        # Deck
        d_th = 0.25
        bv1 = bm2.verts.new((x1, -b_w*0.5, y1_arch))
        bv2 = bm2.verts.new((x1, b_w*0.5, y1_arch))
        bv3 = bm2.verts.new((x2, b_w*0.5, y2_arch))
        bv4 = bm2.verts.new((x2, -b_w*0.5, y2_arch))

        bv5 = bm2.verts.new((x1, -b_w*0.5, y1_arch + d_th))
        bv6 = bm2.verts.new((x1, b_w*0.5, y1_arch + d_th))
        bv7 = bm2.verts.new((x2, b_w*0.5, y2_arch + d_th))
        bv8 = bm2.verts.new((x2, -b_w*0.5, y2_arch + d_th))

        bm2.faces.new((bv1, bv2, bv3, bv4))
        bm2.faces.new((bv5, bv8, bv7, bv6))
        bm2.faces.new((bv1, bv5, bv6, bv2))
        bm2.faces.new((bv2, bv6, bv7, bv3))
        bm2.faces.new((bv3, bv7, bv8, bv4))
        bm2.faces.new((bv4, bv8, bv5, bv1))

        # Railings on both sides
        r_h = 0.85
        for side_sign in [-1, 1]:
            ry = side_sign * (b_w * 0.5 - 0.1)
            rv1 = bm2.verts.new((x1, ry, y1_arch + d_th))
            rv2 = bm2.verts.new((x2, ry, y2_arch + d_th))
            rv3 = bm2.verts.new((x2, ry, y2_arch + d_th + r_h))
            rv4 = bm2.verts.new((x1, ry, y1_arch + d_th + r_h))
            bm2.faces.new((rv1, rv2, rv3, rv4))

    mesh2 = bpy.data.meshes.new("Arch_Wooden_Bridge")
    bm2.to_mesh(mesh2)
    bm2.free()
    obj2 = bpy.data.objects.new("Arch_Wooden_Bridge", mesh2)
    obj2.data.materials.append(mat_wood)
    bpy.context.collection.objects.link(obj2)
    set_pivot_to_bottom(obj2)
    auto_smooth(obj2)

    # 3. Imperial_Pavilion_Hall (Palace hall with curved hip roof + Dong Son pedestal)
    bm3 = bmesh.new()
    # 3-tier stepped base
    bmesh.ops.create_cube(bm3, size=1.0, matrix=Matrix.Diagonal((14.0, 10.0, 0.45, 1.0)))
    bmesh.ops.translate(bm3, verts=bm3.verts, vec=(0, 0, 0.225))
    
    # 2nd tier
    v_tier2 = bmesh.ops.create_cube(bm3, size=1.0, matrix=Matrix.Diagonal((12.0, 8.4, 0.45, 1.0)))['verts']
    bmesh.ops.translate(bm3, verts=v_tier2, vec=(0, 0, 0.675))

    # Dong Son circular drum pedestal at center
    v_drum = bmesh.ops.create_cone(bm3, cap_ends=True, cap_tris=False, segments=24, radius1=2.8, radius2=2.8, depth=0.8)['verts']
    bmesh.ops.translate(bm3, verts=v_drum, vec=(0, 0, 1.30))

    # 8 Lim wood columns
    col_rad = 0.32
    col_h = 4.8
    for cx in [-4.5, 4.5]:
        for cy in [-3.2, -1.0, 1.0, 3.2]:
            v_col = bmesh.ops.create_cone(bm3, cap_ends=True, cap_tris=False, segments=12, radius1=col_rad, radius2=col_rad, depth=col_h)['verts']
            bmesh.ops.translate(bm3, verts=v_col, vec=(cx, cy, 0.9 + col_h * 0.5))

    # Curved eaves roof (Mái đao cong vút)
    roof_w = 16.0
    roof_l = 12.0
    roof_h = 2.4
    eave_up = 1.2
    rv1 = bm3.verts.new((-roof_w*0.5, -roof_l*0.5, 0.9 + col_h + eave_up))
    rv2 = bm3.verts.new((roof_w*0.5, -roof_l*0.5, 0.9 + col_h + eave_up))
    rv3 = bm3.verts.new((roof_w*0.5, roof_l*0.5, 0.9 + col_h + eave_up))
    rv4 = bm3.verts.new((-roof_w*0.5, roof_l*0.5, 0.9 + col_h + eave_up))
    
    # Ridge
    ridge_w = 8.0
    ridge_l = 4.0
    ridge_z = 0.9 + col_h + roof_h + 1.2
    rv5 = bm3.verts.new((-ridge_w*0.5, -ridge_l*0.5, ridge_z))
    rv6 = bm3.verts.new((ridge_w*0.5, -ridge_l*0.5, ridge_z))
    rv7 = bm3.verts.new((ridge_w*0.5, ridge_l*0.5, ridge_z))
    rv8 = bm3.verts.new((-ridge_w*0.5, ridge_l*0.5, ridge_z))

    bm3.faces.new((rv1, rv2, rv6, rv5)) # South slope
    bm3.faces.new((rv2, rv3, rv7, rv6)) # East hip
    bm3.faces.new((rv3, rv4, rv8, rv7)) # North slope
    bm3.faces.new((rv4, rv1, rv5, rv8)) # West hip
    bm3.faces.new((rv5, rv6, rv7, rv8)) # Ridge top

    mesh3 = bpy.data.meshes.new("Imperial_Pavilion_Hall")
    bm3.to_mesh(mesh3)
    bm3.free()
    obj3 = bpy.data.objects.new("Imperial_Pavilion_Hall", mesh3)
    obj3.data.materials.append(mat_wood)
    obj3.data.materials.append(mat_tile)
    bpy.context.collection.objects.link(obj3)
    set_pivot_to_bottom(obj3)
    auto_smooth(obj3)

    # 4. SouthGate_Bastion_NoThan (Fortress watchtower + Altar with Crossbow & Arrows)
    bm4 = bmesh.new()
    # Watchtower stone bastion base
    v_b = bmesh.ops.create_cube(bm4, size=1.0, matrix=Matrix.Diagonal((8.0, 6.0, 4.2, 1.0)))['verts']
    bmesh.ops.translate(bm4, verts=v_b, vec=(0, 0, 2.1))

    # Archway cutout portal in bastion
    # Upper platform altar
    v_altar = bmesh.ops.create_cube(bm4, size=1.0, matrix=Matrix.Diagonal((2.6, 1.4, 0.85, 1.0)))['verts']
    bmesh.ops.translate(bm4, verts=v_altar, vec=(0, 0, 4.2 + 0.425))

    # Nỏ Thần stock (tiller)
    v_stock = bmesh.ops.create_cube(bm4, size=1.0, matrix=Matrix.Diagonal((0.14, 1.8, 0.12, 1.0)))['verts']
    bmesh.ops.translate(bm4, verts=v_stock, vec=(0, 0, 4.2 + 0.95))

    # Crossbow prod (limbs)
    v_prod = bmesh.ops.create_cube(bm4, size=1.0, matrix=Matrix.Diagonal((2.4, 0.12, 0.14, 1.0)))['verts']
    bmesh.ops.translate(bm4, verts=v_prod, vec=(0, 0.8, 4.2 + 0.95))

    # Glowing turtle claw trigger (Lẫy vuốt Rùa Vàng)
    v_claw = bmesh.ops.create_cone(bm4, cap_ends=True, radius1=0.08, radius2=0.02, depth=0.28, segments=8)['verts']
    bmesh.ops.translate(bm4, verts=v_claw, vec=(0, -0.2, 4.2 + 1.08))

    # Arrow racks with 3-bladed bronze arrowheads
    for ax in [-0.9, 0.9]:
        v_rack = bmesh.ops.create_cube(bm4, size=1.0, matrix=Matrix.Diagonal((0.15, 0.8, 1.1, 1.0)))['verts']
        bmesh.ops.translate(bm4, verts=v_rack, vec=(ax, 0, 4.2 + 0.55))

    mesh4 = bpy.data.meshes.new("SouthGate_Bastion_NoThan")
    bm4.to_mesh(mesh4)
    bm4.free()
    obj4 = bpy.data.objects.new("SouthGate_Bastion_NoThan", mesh4)
    obj4.data.materials.append(mat_stone)
    obj4.data.materials.append(mat_bronze)
    obj4.data.materials.append(mat_gold_glow)
    bpy.context.collection.objects.link(obj4)
    set_pivot_to_bottom(obj4)
    auto_smooth(obj4)

    # 5. VongNguyet_JadeWell_Courtyard (Octagonal well + courtyard terrace)
    bm5 = bmesh.new()
    # Courtyard terrace
    v_terrace = bmesh.ops.create_cube(bm5, size=1.0, matrix=Matrix.Diagonal((9.0, 9.0, 0.35, 1.0)))['verts']
    bmesh.ops.translate(bm5, verts=v_terrace, vec=(0, 0, 0.175))

    # Octagonal well curb
    well_r = 1.6
    well_h = 1.0
    v_curb = bmesh.ops.create_cone(bm5, cap_ends=True, cap_tris=False, segments=8, radius1=well_r, radius2=well_r, depth=well_h)['verts']
    bmesh.ops.translate(bm5, verts=v_curb, vec=(0, 0, 0.35 + well_h * 0.5))

    # Inner well shaft
    v_inner = bmesh.ops.create_cone(bm5, cap_ends=True, cap_tris=False, segments=8, radius1=well_r - 0.28, radius2=well_r - 0.28, depth=well_h * 0.9)['verts']
    bmesh.ops.translate(bm5, verts=v_inner, vec=(0, 0, 0.35 + well_h * 0.5 + 0.1))

    # Floating Jade Pearl (Minh Châu)
    v_pearl = bmesh.ops.create_icosphere(bm5, radius=0.22, subdivisions=2)['verts']
    bmesh.ops.translate(bm5, verts=v_pearl, vec=(0, 0, 0.35 + 0.55))

    mesh5 = bpy.data.meshes.new("VongNguyet_JadeWell_Courtyard")
    bm5.to_mesh(mesh5)
    bm5.free()
    obj5 = bpy.data.objects.new("VongNguyet_JadeWell_Courtyard", mesh5)
    obj5.data.materials.append(mat_stone)
    obj5.data.materials.append(mat_jade)
    bpy.context.collection.objects.link(obj5)
    set_pivot_to_bottom(obj5)
    auto_smooth(obj5)

    # 6. DaSon_Cliff_And_KimQuy (Sea cliff headland + Giant Golden Turtle God)
    bm6 = bmesh.new()
    # Massive rugged rock cliff
    v_cliff = bmesh.ops.create_cube(bm6, size=1.0, matrix=Matrix.Diagonal((16.0, 12.0, 6.0, 1.0)))['verts']
    bmesh.ops.translate(bm6, verts=v_cliff, vec=(0, -4.0, 3.0))

    # Golden Turtle God carapace (high dome)
    v_shell = bmesh.ops.create_icosphere(bm6, radius=3.2, subdivisions=2)['verts']
    for v in v_shell:
        v.co.z *= 0.65
        v.co.y *= 1.35
    bmesh.ops.translate(bm6, verts=v_shell, vec=(0, 8.0, 1.8))

    # Dragon-horned turtle head
    v_head = bmesh.ops.create_icosphere(bm6, radius=1.0, subdivisions=2)['verts']
    for v in v_head:
        v.co.z *= 0.8
        v.co.y *= 1.4
    bmesh.ops.translate(bm6, verts=v_head, vec=(0, 12.5, 2.6))

    # 4 swimming flippers
    for fx in [-2.8, 2.8]:
        for fy in [6.5, 9.8]:
            v_flip = bmesh.ops.create_cube(bm6, size=1.0, matrix=Matrix.Diagonal((1.6, 1.2, 0.25, 1.0)))['verts']
            bmesh.ops.translate(bm6, verts=v_flip, vec=(fx, fy, 1.1))

    mesh6 = bpy.data.meshes.new("DaSon_Cliff_And_KimQuy")
    bm6.to_mesh(mesh6)
    bm6.free()
    obj6 = bpy.data.objects.new("DaSon_Cliff_And_KimQuy", mesh6)
    obj6.data.materials.append(mat_stone)
    obj6.data.materials.append(mat_gold_glow)
    bpy.context.collection.objects.link(obj6)
    set_pivot_to_bottom(obj6)
    auto_smooth(obj6)

    # Export to public/model/coloa_realm_kit.glb with Draco compression
    out_dir = os.path.abspath("public/model")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "coloa_realm_kit.glb")

    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_apply=True,
        export_yup=True
    )
    print(f"[Blender] Successfully exported {out_path}, size: {os.path.getsize(out_path)} bytes")

    # Mirror to public/models/ and model/
    for mirror_dir in ["public/models", "model"]:
        m_dir = os.path.abspath(mirror_dir)
        os.makedirs(m_dir, exist_ok=True)
        m_path = os.path.join(m_dir, "coloa_realm_kit.glb")
        shutil.copyfile(out_path, m_path)
        print(f"[Blender] Mirrored to {m_path}")

if __name__ == '__main__':
    build_kit()
