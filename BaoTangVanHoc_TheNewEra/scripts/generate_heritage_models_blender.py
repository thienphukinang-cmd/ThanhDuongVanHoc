import bpy
import bmesh
import math
import os

OUTPUT_DIR = os.path.abspath(os.path.join(os.getcwd(), "public", "model", "heritage"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.4, emission_color=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission_color and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def export_glb(filename):
    filepath = os.path.join(OUTPUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True
    )
    print(f"[Blender Exporter] Da xuat thanh cong: {filepath}")

# 1. BỆ ĐÁ HOA SEN CHẠM KHẮC 2 TẦNG (lotus_pedestal_high.glb)
def build_lotus_pedestal():
    clear_scene()
    mat_stone = create_pbr_material("ThanhHoaStone", (0.12, 0.16, 0.22, 1.0), metallic=0.15, roughness=0.38)
    mat_lacquer = create_pbr_material("RoyalLacquer", (0.48, 0.06, 0.06, 1.0), metallic=0.35, roughness=0.22)
    mat_gold = create_pbr_material("ImperialGold", (0.98, 0.78, 0.15, 1.0), metallic=0.92, roughness=0.18, emission_color=(0.4, 0.25, 0.02, 1.0), emission_strength=0.25)

    # Chân đế bát giác
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.92, depth=0.26, location=(0, 0, 0.13))
    base = bpy.context.active_object
    base.data.materials.append(mat_stone)
    bpy.ops.object.modifier_add(type='BEVEL')
    base.modifiers["Bevel"].width = 0.03

    # Thân trụ sơn son
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.55, depth=0.68, location=(0, 0, 0.60))
    shaft = bpy.context.active_object
    shaft.data.materials.append(mat_lacquer)

    # Vòng 16 cánh sen vàng uốn cong
    petal_count = 16
    for i in range(petal_count):
        angle = (i / petal_count) * math.pi * 2
        px = math.cos(angle) * 0.64
        py = math.sin(angle) * 0.64
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.20, radius2=0.02, depth=0.45, location=(px, py, 1.02))
        petal = bpy.context.active_object
        petal.scale = (1.0, 0.38, 1.0)
        petal.rotation_euler = (math.sin(angle) * 0.45, -math.cos(angle) * 0.45, angle + math.pi / 2)
        petal.data.materials.append(mat_gold)

    # Mặt đĩa đồng đỡ hiện vật
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.74, depth=0.12, location=(0, 0, 1.22))
    top_plate = bpy.context.active_object
    top_plate.data.materials.append(mat_gold)

    export_glb("lotus_pedestal_high.glb")

# 2. CỔNG TAM QUAN MÁI ĐAO CONG VÚT (mai_dao_archway.glb)
def build_mai_dao_archway():
    clear_scene()
    mat_lacquer = create_pbr_material("PillarLacquer", (0.52, 0.05, 0.05, 1.0), metallic=0.3, roughness=0.25)
    mat_gold = create_pbr_material("ArchGold", (0.98, 0.80, 0.18, 1.0), metallic=0.9, roughness=0.2, emission_color=(0.35, 0.22, 0.02, 1.0), emission_strength=0.2)
    mat_roof = create_pbr_material("AncientTile", (0.22, 0.10, 0.06, 1.0), metallic=0.4, roughness=0.35)

    # 2 Cột trụ chính + 2 cột phụ
    pillar_positions = [(-2.85, 0, 2.4), (2.85, 0, 2.4), (-3.65, 0, 2.0), (3.65, 0, 2.0)]
    for idx, (x, y, h) in enumerate(pillar_positions):
        r = 0.28 if idx < 2 else 0.21
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=h * 2, location=(x, y, h))
        col = bpy.context.active_object
        col.data.materials.append(mat_lacquer)

        # Chân tảng đá sen bọc vàng
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=r * 1.45, depth=0.35, location=(x, y, 0.175))
        foot = bpy.context.active_object
        foot.data.materials.append(mat_gold)

    # Xà ngang & Đấu củng sơn thếp vàng
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 4.65))
    beam = bpy.context.active_object
    beam.scale = (8.2, 0.55, 0.38)
    beam.data.materials.append(mat_gold)

    # Mái đao 2 tầng uốn cong bằng lưới chia nhỏ
    for layer, (z_pos, width_scale) in enumerate([(5.15, 8.8), (5.85, 6.8)]):
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=24, y_subdivisions=8, size=1.0, location=(0, 0, z_pos))
        roof = bpy.context.active_object
        roof.scale = (width_scale, 1.85, 1.0)
        bpy.ops.object.mode_set(mode='EDIT')
        bm = bmesh.from_edit_mesh(roof.data)
        for v in bm.verts:
            # Uốn cong hai đầu đao vút lên trời theo hàm parabol bậc 4
            dist_x = abs(v.co.x) * 2.0
            v.co.z += (dist_x ** 3.2) * 0.42 - (abs(v.co.y) * 0.28)
        bmesh.update_edit_mesh(roof.data)
        bpy.ops.object.mode_set(mode='OBJECT')

        bpy.ops.object.modifier_add(type='SOLIDIFY')
        roof.modifiers["Solidify"].thickness = 0.18
        roof.data.materials.append(mat_roof)

    export_glb("mai_dao_archway.glb")

# 3. TRỐNG ĐỒNG ĐÔNG SƠN 3D (dong_son_drum_3d.glb)
def build_dong_son_drum():
    clear_scene()
    mat_bronze = create_pbr_material("DongSonBronze", (0.85, 0.62, 0.16, 1.0), metallic=0.88, roughness=0.24, emission_color=(0.25, 0.16, 0.02, 1.0), emission_strength=0.2)

    # Tạo biên dạng Trống Đồng (Tang trống phình, lưng eo, chân choãi)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.15, depth=0.95, location=(0, 0, 0.475))
    drum = bpy.context.active_object
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=6)
    bm = bmesh.from_edit_mesh(drum.data)
    for v in bm.verts:
        z_norm = (v.co.z + 0.475) / 0.95
        if z_norm > 0.65:
            scale_r = 1.08 + math.sin((z_norm - 0.65) * math.pi * 2.8) * 0.08
        elif z_norm > 0.25:
            scale_r = 0.88
        else:
            scale_r = 0.88 + (0.25 - z_norm) * 0.95
        v.co.x *= scale_r
        v.co.y *= scale_r
    bmesh.update_edit_mesh(drum.data)
    bpy.ops.object.mode_set(mode='OBJECT')
    drum.data.materials.append(mat_bronze)

    export_glb("dong_son_drum_3d.glb")

# 4. CỘT TRỤ CUNG ĐÌNH CÓ ĐẤU CỦNG (imperial_pillar_dougong.glb)
def build_imperial_pillar():
    clear_scene()
    mat_lacquer = create_pbr_material("ColLacquer", (0.50, 0.05, 0.05, 1.0), metallic=0.35, roughness=0.22)
    mat_gold = create_pbr_material("ColGold", (0.98, 0.78, 0.15, 1.0), metallic=0.9, roughness=0.2)

    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.42, depth=8.4, location=(0, 0, 4.2))
    col = bpy.context.active_object
    col.data.materials.append(mat_lacquer)

    # Chân đế & Đấu củng đỉnh cột
    for z_pos in [0.25, 8.15]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.62, depth=0.48, location=(0, 0, z_pos))
        cap = bpy.context.active_object
        cap.data.materials.append(mat_gold)

    export_glb("imperial_pillar_dougong.glb")

if __name__ == "__main__":
    build_lotus_pedestal()
    build_mai_dao_archway()
    build_dong_son_drum()
    build_imperial_pillar()