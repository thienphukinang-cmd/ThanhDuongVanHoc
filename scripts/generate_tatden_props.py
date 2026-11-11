import bpy
import bmesh
import math
import os
import mathutils

OUTPUT_DIR = os.path.abspath(os.path.join(os.getcwd(), "public", "models", "tatden"))


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def create_pbr_material(
    name,
    base_color,
    metallic=0.0,
    roughness=0.5,
    emission_color=None,
    emission_strength=0.0,
    alpha=1.0,
    transmission=0.0,
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = transmission
        if emission_color and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        mat.blend_method = 'BLEND' if hasattr(mat, 'blend_method') else mat.blend_method
    return mat


def finalize_and_export(filename):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # Center X/Y and ground min Z at 0 so export_yup=True lands bottom at Y=0
    mesh_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if mesh_objs:
        min_x = min_y = min_z = float('inf')
        max_x = max_y = -float('inf')
        for obj in mesh_objs:
            for corner in obj.bound_box:
                wc = obj.matrix_world @ mathutils.Vector(corner)
                min_x = min(min_x, wc.x)
                max_x = max(max_x, wc.x)
                min_y = min(min_y, wc.y)
                max_y = max(max_y, wc.y)
                min_z = min(min_z, wc.z)
        cx = (min_x + max_x) * 0.5
        cy = (min_y + max_y) * 0.5
        for obj in mesh_objs:
            obj.location.x -= cx
            obj.location.y -= cy
            obj.location.z -= min_z

    filepath = os.path.join(OUTPUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_materials='EXPORT',
    )
    print(f"[TatDen Props] Exported: {filepath} ({os.path.getsize(filepath)} bytes)")


def add_bevel(obj, width=0.008, segments=2):
    mod = obj.modifiers.new(name="Bevel", type='BEVEL')
    mod.width = width
    mod.segments = segments


# ==============================================================================
# 1. ĐÈN DẦU CỔ BẰNG ĐỒNG & CHỤP THỦY TINH MỜ (oil_lamp.glb)
# ==============================================================================
def build_oil_lamp():
    clear_scene()
    mat_aged_brass = create_pbr_material("AgedBrass", (0.48, 0.34, 0.14, 1.0), metallic=0.86, roughness=0.34)
    mat_dark_bronze = create_pbr_material("TarnishedBronze", (0.18, 0.12, 0.07, 1.0), metallic=0.78, roughness=0.45)
    mat_frosted_glass = create_pbr_material(
        "FrostedChimneyGlass",
        (0.76, 0.78, 0.80, 1.0),
        metallic=0.0,
        roughness=0.38,
        alpha=0.42,
        transmission=0.65,
    )
    mat_flame = create_pbr_material(
        "FlickeringWickFlame",
        (1.0, 0.62, 0.16, 1.0),
        metallic=0.0,
        roughness=0.2,
        emission_color=(1.0, 0.52, 0.12, 1.0),
        emission_strength=4.5,
    )
    mat_wick = create_pbr_material("CharredWick", (0.06, 0.05, 0.04, 1.0), metallic=0.0, roughness=0.95)

    # Tiered circular foot
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.145, depth=0.028, location=(0, 0, 0.014))
    foot1 = bpy.context.active_object
    foot1.data.materials.append(mat_dark_bronze)
    add_bevel(foot1, 0.005)

    bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=0.125, radius2=0.052, depth=0.055, location=(0, 0, 0.055))
    foot2 = bpy.context.active_object
    foot2.data.materials.append(mat_aged_brass)

    # Stem
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.034, depth=0.085, location=(0, 0, 0.125))
    stem = bpy.context.active_object
    stem.data.materials.append(mat_dark_bronze)

    # Bulged oil reservoir (lathe-like deformed UV sphere)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=16, radius=0.135, location=(0, 0, 0.235))
    reservoir = bpy.context.active_object
    reservoir.scale = (1.0, 1.0, 0.58)
    reservoir.data.materials.append(mat_aged_brass)

    # Top filler cap & neck ring
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.064, depth=0.042, location=(0, 0, 0.315))
    collar = bpy.context.active_object
    collar.data.materials.append(mat_dark_bronze)

    # Burner gallery crown (prongs holding chimney)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.072, depth=0.025, location=(0, 0, 0.348))
    gallery = bpy.context.active_object
    gallery.data.materials.append(mat_aged_brass)

    # Wick adjuster knob & stem
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.007, depth=0.055, rotation=(0, math.pi / 2, 0), location=(0.085, 0, 0.325))
    knob_stem = bpy.context.active_object
    knob_stem.data.materials.append(mat_aged_brass)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.017, depth=0.012, rotation=(0, math.pi / 2, 0), location=(0.115, 0, 0.325))
    knob = bpy.context.active_object
    knob.data.materials.append(mat_dark_bronze)

    # Carry handle loop on opposite side
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=8, major_radius=0.068, minor_radius=0.009, rotation=(math.pi / 2, 0, 0), location=(-0.135, 0, 0.23))
    handle = bpy.context.active_object
    handle.data.materials.append(mat_aged_brass)

    # Wick & small teardrop flame inside
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.012, depth=0.04, location=(0, 0, 0.365))
    wick = bpy.context.active_object
    wick.data.materials.append(mat_wick)

    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.016, radius2=0.001, depth=0.055, location=(0, 0, 0.405))
    flame = bpy.context.active_object
    flame.data.materials.append(mat_flame)

    # Frosted glass chimney with bulbous middle & narrow top
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.062, depth=0.30, location=(0, 0, 0.50))
    chimney = bpy.context.active_object
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=6)
    bm = bmesh.from_edit_mesh(chimney.data)
    for v in bm.verts:
        z_norm = (v.co.z + 0.15) / 0.30
        if z_norm < 0.35:
            bulge = 1.0 + math.sin((z_norm / 0.35) * math.pi) * 0.45
        else:
            bulge = 1.0 - (z_norm - 0.35) * 0.48
        v.co.x *= bulge
        v.co.y *= bulge
    bmesh.update_edit_mesh(chimney.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    mod_solid = chimney.modifiers.new(name="Solidify", type='SOLIDIFY')
    mod_solid.thickness = 0.004
    chimney.data.materials.append(mat_frosted_glass)

    finalize_and_export("oil_lamp.glb")


# ==============================================================================
# 2. TRÁP GỖ THU SƯU THUẾ, SỔ ĐINH BẠ & MÕ TRE ĐÌNH LÀNG (tax_artifacts.glb)
# ==============================================================================
def build_tax_artifacts():
    clear_scene()
    mat_dark_wood = create_pbr_material("DarkIronwood", (0.14, 0.08, 0.045, 1.0), metallic=0.05, roughness=0.52)
    mat_brass = create_pbr_material("TaxBoxBrass", (0.62, 0.44, 0.15, 1.0), metallic=0.88, roughness=0.28)
    mat_paper = create_pbr_material("AgedDoPaper", (0.68, 0.60, 0.44, 1.0), metallic=0.0, roughness=0.85)
    mat_ink_cover = create_pbr_material("LedgerCover", (0.12, 0.09, 0.07, 1.0), metallic=0.0, roughness=0.78)
    mat_bamboo = create_pbr_material("AgedBamboo", (0.42, 0.30, 0.14, 1.0), metallic=0.0, roughness=0.62)
    mat_bamboo_dark = create_pbr_material("BambooSlotDark", (0.07, 0.05, 0.03, 1.0), metallic=0.0, roughness=0.88)

    # A. Tráp gỗ thu sưu thuế (Left/Center: x=-0.16)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.16, 0.0, 0.11))
    chest = bpy.context.active_object
    chest.scale = (0.46, 0.30, 0.22)
    chest.data.materials.append(mat_dark_wood)
    add_bevel(chest, 0.01)

    # Lid slightly cracked open
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.16, 0.02, 0.235))
    lid = bpy.context.active_object
    lid.scale = (0.48, 0.32, 0.05)
    lid.rotation_euler = (-0.12, 0.0, 0.0)
    lid.data.materials.append(mat_dark_wood)
    add_bevel(lid, 0.008)

    # Brass corner strips & lock clasp
    for sx in (-0.38, 0.06):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, 0.0, 0.115))
        band = bpy.context.active_object
        band.scale = (0.025, 0.312, 0.225)
        band.data.materials.append(mat_brass)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.16, -0.156, 0.17))
    clasp = bpy.context.active_object
    clasp.scale = (0.07, 0.018, 0.09)
    clasp.data.materials.append(mat_brass)

    # B. Sổ đinh bạ & xấp thẻ bài sưu thuế trên nắp tráp & bên cạnh
    for idx, (lx, ly, lz, rz) in enumerate([
        (-0.18, 0.01, 0.275, 0.08),
        (-0.14, 0.02, 0.305, -0.05),
    ]):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(lx, ly, lz))
        ledger = bpy.context.active_object
        ledger.scale = (0.24, 0.18, 0.024)
        ledger.rotation_euler = (-0.12, 0.0, rz)
        ledger.data.materials.append(mat_paper if idx == 1 else mat_ink_cover)

    # Stacked bamboo tax tallies (thẻ bài sưu thuế)
    for t in range(5):
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(0.14 + t * 0.014, -0.10 + (t % 2) * 0.02, 0.012 + t * 0.008),
        )
        tally = bpy.context.active_object
        tally.scale = (0.045, 0.16, 0.010)
        tally.rotation_euler = (0.0, 0.0, 0.25 + t * 0.18)
        tally.data.materials.append(mat_bamboo)

    # C. Chiếc mõ tre đình làng & dùi gõ (Right: x=+0.26)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.075, depth=0.38, rotation=(math.pi / 2, 0, 0.35), location=(0.25, 0.04, 0.075))
    mo_body = bpy.context.active_object
    mo_body.data.materials.append(mat_bamboo)

    # Node rings on bamboo slit drum
    for offset in (-0.14, 0.14):
        rx = 0.25 - math.sin(0.35) * offset
        ry = 0.04 + math.cos(0.35) * offset
        bpy.ops.mesh.primitive_torus_add(
            major_segments=20,
            minor_segments=8,
            major_radius=0.077,
            minor_radius=0.008,
            rotation=(math.pi / 2, 0, 0.35),
            location=(rx, ry, 0.075),
        )
        ring = bpy.context.active_object
        ring.data.materials.append(mat_bamboo)

    # Resonator slit cutout visually represented on top of bamboo drum
    bpy.ops.mesh.primitive_cube_add(size=1.0, rotation=(0, 0, 0.35), location=(0.25, 0.04, 0.144))
    slit = bpy.context.active_object
    slit.scale = (0.022, 0.23, 0.018)
    slit.data.materials.append(mat_bamboo_dark)

    # Wooden striker mallet
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.012, depth=0.28, rotation=(math.pi / 2, 0, -0.45), location=(0.35, -0.09, 0.015))
    mallet_handle = bpy.context.active_object
    mallet_handle.data.materials.append(mat_dark_wood)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=0.028, location=(0.41, -0.20, 0.028))
    mallet_head = bpy.context.active_object
    mallet_head.data.materials.append(mat_dark_wood)

    finalize_and_export("tax_artifacts.glb")


# ==============================================================================
# 3. NIA TRE RÁCH, NỒI ĐẤT NẤU CHÁO CÁM & BÁT SỨT (peasant_hearth.glb)
# ==============================================================================
def build_peasant_hearth():
    clear_scene()
    mat_bamboo_worn = create_pbr_material("WornBambooTray", (0.34, 0.24, 0.12, 1.0), metallic=0.0, roughness=0.82)
    mat_soot_clay = create_pbr_material("SootEarthenware", (0.12, 0.09, 0.07, 1.0), metallic=0.0, roughness=0.88)
    mat_hearth_stone = create_pbr_material("CharredClayStone", (0.20, 0.16, 0.13, 1.0), metallic=0.0, roughness=0.92)
    mat_chipped_bowl = create_pbr_material("ChippedCeramic", (0.52, 0.49, 0.43, 1.0), metallic=0.0, roughness=0.58)
    mat_ash = create_pbr_material("ColdHearthAsh", (0.14, 0.14, 0.15, 1.0), metallic=0.0, roughness=0.95)
    mat_porridge = create_pbr_material("BranPorridge", (0.35, 0.27, 0.16, 1.0), metallic=0.0, roughness=0.72)

    # A. Chiếc nia tre rách đặt nghiêng bên trái (x = -0.24)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.26, depth=0.025, location=(-0.26, 0.05, 0.02))
    tray_disc = bpy.context.active_object
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(tray_disc.data)
    # Create ragged torn notch on one edge
    for v in bm.verts:
        if v.co.x < -0.12 and v.co.y > 0.08:
            v.co.x *= 0.62
            v.co.y *= 0.72
            v.co.z -= 0.008
    bmesh.update_edit_mesh(tray_disc.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    tray_disc.rotation_euler = (0.08, 0.16, 0.3)
    tray_disc.data.materials.append(mat_bamboo_worn)

    # Broken bamboo rim arc
    bpy.ops.mesh.primitive_torus_add(
        major_segments=24,
        minor_segments=8,
        major_radius=0.26,
        minor_radius=0.015,
        location=(-0.26, 0.05, 0.032),
    )
    tray_rim = bpy.context.active_object
    tray_rim.rotation_euler = (0.08, 0.16, 0.3)
    tray_rim.data.materials.append(mat_bamboo_worn)

    # B. Ba ông đầu rau (clay hearth stones) + tro bếp + nồi đất nấu cháo cám (x = +0.16)
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.17, depth=0.02, location=(0.16, 0.0, 0.01))
    ash_bed = bpy.context.active_object
    ash_bed.data.materials.append(mat_ash)

    for i in range(3):
        ang = (i / 3.0) * math.pi * 2.0 + 0.4
        sx = 0.16 + math.cos(ang) * 0.105
        sy = math.sin(ang) * 0.105
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.045, radius2=0.028, depth=0.12, location=(sx, sy, 0.06))
        stone = bpy.context.active_object
        stone.data.materials.append(mat_hearth_stone)

    # Soot-blackened earthenware pot sitting on the 3 stones
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.145, location=(0.16, 0.0, 0.175))
    pot = bpy.context.active_object
    pot.scale = (1.0, 1.0, 0.85)
    pot.data.materials.append(mat_soot_clay)

    # Pot rim
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=8, major_radius=0.10, minor_radius=0.016, location=(0.16, 0.0, 0.285))
    pot_rim = bpy.context.active_object
    pot_rim.data.materials.append(mat_soot_clay)

    # Thin bran porridge surface inside pot
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.09, depth=0.015, location=(0.16, 0.0, 0.255))
    porridge = bpy.context.active_object
    porridge.data.materials.append(mat_porridge)

    # C. Chiếc bát sứt & đôi đũa tre đặt phía trước (x = -0.02, y = -0.22)
    bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=0.036, radius2=0.072, depth=0.062, location=(-0.02, -0.22, 0.031))
    bowl = bpy.context.active_object
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(bowl.data)
    # Create a noticeable chip along one rim edge
    for v in bm.verts:
        if v.co.z > 0.015 and v.co.x > 0.04 and v.co.y < -0.02:
            v.co.z -= 0.018
    bmesh.update_edit_mesh(bowl.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    bowl.data.materials.append(mat_chipped_bowl)

    for c_idx in range(2):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=8,
            radius=0.004,
            depth=0.22,
            rotation=(math.pi / 2, 0, 0.85 + c_idx * 0.08),
            location=(0.06 + c_idx * 0.015, -0.25, 0.006),
        )
        chopstick = bpy.context.active_object
        chopstick.data.materials.append(mat_bamboo_worn)

    finalize_and_export("peasant_hearth.glb")


if __name__ == "__main__":
    build_oil_lamp()
    build_tax_artifacts()
    build_peasant_hearth()
