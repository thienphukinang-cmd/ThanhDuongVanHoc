import bpy
import math
import os

OUTPUT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "models", "thanh_giong_statue.glb"))

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0

def make_pbr_mat(name, color, metallic, roughness, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def smooth_subsurf(obj, levels=1):
    mod = obj.modifiers.new(name="Subsurf", type='SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()

def build_thanh_giong_statue():
    reset_scene()

    # Bảng vật liệu PBR Sử Thi
    mat_iron = make_pbr_mat("Iron_Armor", (0.18, 0.20, 0.24), 0.92, 0.28)
    mat_bronze = make_pbr_mat("DongSon_Bronze", (0.26, 0.19, 0.12), 0.85, 0.38)
    mat_gold_bamboo = make_pbr_mat("Ivory_Bamboo_Gold", (0.85, 0.68, 0.20), 0.88, 0.22, (0.35, 0.25, 0.05), 0.2)
    mat_fire = make_pbr_mat("Sacred_Fire_Ember", (0.95, 0.26, 0.05), 0.1, 0.4, (1.0, 0.32, 0.02), 2.8)

    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "ThanhGiong_Hero_Root"
    parts = []

    # 1. Bệ đá Trống Đồng & Vân Mây Lửa (Z: 0 -> 0.55m)
    bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=1.25, depth=0.30, location=(0, 0, 0.15))
    pedestal_base = bpy.context.active_object
    pedestal_base.data.materials.append(mat_bronze)
    parts.append(pedestal_base)

    bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=0.98, depth=0.25, location=(0, 0, 0.425))
    pedestal_top = bpy.context.active_object
    pedestal_top.data.materials.append(mat_iron)
    parts.append(pedestal_top)

    # Vòng vân mây lửa cuộn quanh chân ngựa
    for i in range(8):
        ang = (2 * math.pi / 8) * i
        cx, cy = math.cos(ang) * 0.72, math.sin(ang) * 0.72
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.24, location=(cx, cy, 0.62))
        cloud = bpy.context.active_object
        cloud.scale = (1.3, 0.8, 0.65)
        cloud.rotation_euler = (0.2, 0.3, ang)
        cloud.data.materials.append(mat_fire if i % 2 == 0 else mat_bronze)
        smooth_subsurf(cloud, 1)
        parts.append(cloud)

    # 2. Ngựa Sắt Chồm Lên (Iron Warhorse rearing at 38 degrees)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.36, depth=1.35, location=(0, 0.10, 1.35))
    horse_body = bpy.context.active_object
    horse_body.rotation_euler = (math.radians(-52), 0, 0)
    horse_body.scale = (0.88, 1.05, 1.0)
    horse_body.data.materials.append(mat_iron)
    smooth_subsurf(horse_body, 1)
    parts.append(horse_body)

    # Cổ và Đầu Ngựa Sắt phun lửa
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.26, radius2=0.16, depth=0.72, location=(0, 0.62, 2.02))
    horse_neck = bpy.context.active_object
    horse_neck.rotation_euler = (math.radians(-25), 0, 0)
    horse_neck.data.materials.append(mat_iron)
    smooth_subsurf(horse_neck, 1)
    parts.append(horse_neck)

    bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=0.18, radius2=0.09, depth=0.52, location=(0, 0.88, 2.28))
    horse_head = bpy.context.active_object
    horse_head.rotation_euler = (math.radians(-75), 0, 0)
    horse_head.data.materials.append(mat_iron)
    parts.append(horse_head)

    # Luồng lửa thần phun từ miệng Ngựa Sắt
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.16, radius2=0.02, depth=0.65, location=(0, 1.28, 2.18))
    fire_breath = bpy.context.active_object
    fire_breath.rotation_euler = (math.radians(82), 0, 0)
    fire_breath.data.materials.append(mat_fire)
    parts.append(fire_breath)

    # 4 Chân Ngựa Sắt (2 chân sau trụ vững, 2 chân trước tung vó)
    for side in (-1, 1):
        # Chân sau
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.11, depth=0.88, location=(side * 0.24, -0.35, 0.85))
        back_leg = bpy.context.active_object
        back_leg.rotation_euler = (math.radians(18), 0, 0)
        back_leg.data.materials.append(mat_iron)
        parts.append(back_leg)

        # Chân trước tung vó
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.095, depth=0.78, location=(side * 0.24, 0.72, 1.58))
        front_leg = bpy.context.active_object
        front_leg.rotation_euler = (math.radians(-65), side * 0.12, 0)
        front_leg.data.materials.append(mat_iron)
        parts.append(front_leg)

    # 3. Thánh Gióng Mặc Giáp Sắt Cưỡi Ngựa
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.24, radius2=0.31, depth=0.68, location=(0, -0.02, 1.98))
    hero_torso = bpy.context.active_object
    hero_torso.scale = (1.05, 0.78, 1.0)
    hero_torso.data.materials.append(mat_iron)
    smooth_subsurf(hero_torso, 1)
    parts.append(hero_torso)

    # Đầu & Nón Sắt Thánh Gióng
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=14, radius=0.16, location=(0, -0.02, 2.48))
    hero_head = bpy.context.active_object
    hero_head.data.materials.append(mat_bronze)
    parts.append(hero_head)

    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.28, radius2=0.02, depth=0.22, location=(0, -0.02, 2.62))
    iron_helmet = bpy.context.active_object
    iron_helmet.data.materials.append(mat_gold_bamboo)
    parts.append(iron_helmet)

    # 4. Cụm Tre Ngà Đằng Ngà Vung Cao Bên Tay Phải
    for b_idx in range(-1, 2):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12, radius=0.042, depth=2.15,
            location=(0.38 + b_idx * 0.05, 0.15, 2.45 + b_idx * 0.08)
        )
        bamboo = bpy.context.active_object
        bamboo.rotation_euler = (math.radians(-28), math.radians(22 + b_idx * 6), 0)
        bamboo.data.materials.append(mat_gold_bamboo)
        parts.append(bamboo)

    # Chuẩn hóa pháp tuyến (Normals) và gắn vào Root
    for obj in parts:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        obj.parent = root
        obj.select_set(False)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_PATH,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT'
    )
    print(f"[HOÀN TẤT] Đã xuất tượng Thánh Gióng tại: {OUTPUT_PATH}")

if __name__ == "__main__":
    build_thanh_giong_statue()