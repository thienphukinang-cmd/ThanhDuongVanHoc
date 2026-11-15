import bpy
import math
import os

OUTPUT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "models", "thuy_kieu_statue.glb"))

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0

def create_pbr_material(name, base_color, metallic, roughness, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def add_smooth_subsurf(obj, levels=2):
    mod = obj.modifiers.new(name="Subsurf", type='SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()

def build_thuy_kieu_statue():
    reset_scene()

    # Khởi tạo bảng vật liệu PBR truyền thống
    mat_jade = create_pbr_material("Jade_Stone", (0.16, 0.38, 0.30), 0.05, 0.25)
    mat_gold = create_pbr_material("Lacquer_Gold", (0.88, 0.68, 0.22), 0.92, 0.22, (0.35, 0.22, 0.05), 0.15)
    mat_silk = create_pbr_material("Silk_Brocade", (0.72, 0.56, 0.38), 0.15, 0.45)
    mat_bronze = create_pbr_material("Bronze_Patina", (0.28, 0.22, 0.16), 0.80, 0.35)

    # Tạo Root Empty tại tâm mặt đất (0, 0, 0)
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "ThuyKieu_Statue_Root"

    parts = []

    # 1. Bệ đá hoa sen 2 tầng (Cao 0.45m, đáy chạm Z = 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.85, depth=0.25, location=(0, 0, 0.125))
    base_lower = bpy.context.active_object
    base_lower.name = "Pedestal_Lower"
    base_lower.data.materials.append(mat_jade)
    parts.append(base_lower)

    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.68, depth=0.20, location=(0, 0, 0.35))
    base_upper = bpy.context.active_object
    base_upper.name = "Pedestal_LotusCore"
    base_upper.data.materials.append(mat_bronze)
    parts.append(base_upper)

    # Vòng cánh sen thếp vàng quanh bệ
    num_petals = 12
    for i in range(num_petals):
        angle = (2 * math.pi / num_petals) * i
        px = math.cos(angle) * 0.70
        py = math.sin(angle) * 0.70
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.18, location=(px, py, 0.36))
        petal = bpy.context.active_object
        petal.scale = (0.55, 1.15, 0.85)
        petal.rotation_euler = (0.35, 0, angle + math.pi / 2)
        petal.data.materials.append(mat_gold)
        parts.append(petal)

    # 2. Thân áo lụa cổ phục & tà áo rủ (Z từ 0.45m đến 1.75m)
    bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=0.52, radius2=0.22, depth=0.95, location=(0, 0, 0.92))
    robe_skirt = bpy.context.active_object
    robe_skirt.name = "Robe_Lower"
    robe_skirt.scale = (1.0, 0.82, 1.0)
    robe_skirt.data.materials.append(mat_silk)
    add_smooth_subsurf(robe_skirt, 1)
    parts.append(robe_skirt)

    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.21, depth=0.52, location=(0, 0, 1.55))
    torso = bpy.context.active_object
    torso.name = "Torso_Upper"
    torso.scale = (0.95, 0.72, 1.0)
    torso.data.materials.append(mat_silk)
    add_smooth_subsurf(torso, 1)
    parts.append(torso)

    # Đai lưng thếp vàng
    bpy.ops.mesh.primitive_torus_add(major_radius=0.21, minor_radius=0.035, location=(0, 0, 1.36))
    sash = bpy.context.active_object
    sash.scale = (1.0, 0.78, 1.2)
    sash.data.materials.append(mat_gold)
    parts.append(sash)

    # 3. Đầu, búi tóc & trâm cài vàng
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.16, location=(0, 0.02, 1.98))
    head = bpy.context.active_object
    head.name = "Head"
    head.scale = (0.88, 0.95, 1.12)
    head.rotation_euler = (0.12, 0, -0.08)  # Hơi cúi đầu trầm tư nhìn đàn
    head.data.materials.append(mat_silk)
    add_smooth_subsurf(head, 1)
    parts.append(head)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.11, location=(0, -0.08, 2.12))
    hair_bun = bpy.context.active_object
    hair_bun.name = "Hair_Bun"
    hair_bun.data.materials.append(mat_bronze)
    parts.append(hair_bun)

    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.012, depth=0.36, location=(0, -0.08, 2.13))
    hairpin = bpy.context.active_object
    hairpin.rotation_euler = (0, math.radians(78), 0)
    hairpin.data.materials.append(mat_gold)
    parts.append(hairpin)

    # 4. Hai tay áo rộng nâng đàn
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cone_add(
            vertices=20, radius1=0.16, radius2=0.08, depth=0.55,
            location=(side * 0.26, 0.12, 1.52)
        )
        sleeve = bpy.context.active_object
        sleeve.rotation_euler = (math.radians(55), side * math.radians(-22), 0)
        sleeve.data.materials.append(mat_silk)
        add_smooth_subsurf(sleeve, 1)
        parts.append(sleeve)

    # 5. Đàn Tỳ Bà (Pipa) đặt chéo trước ngực
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.22, location=(-0.05, 0.24, 1.48))
    pipa_body = bpy.context.active_object
    pipa_body.name = "Pipa_Body"
    pipa_body.scale = (0.72, 0.25, 1.35)
    pipa_body.rotation_euler = (0, math.radians(-28), math.radians(-12))
    pipa_body.data.materials.append(mat_gold)
    add_smooth_subsurf(pipa_body, 1)
    parts.append(pipa_body)

    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.028, depth=0.58, location=(0.14, 0.26, 1.78))
    pipa_neck = bpy.context.active_object
    pipa_neck.name = "Pipa_Neck"
    pipa_neck.rotation_euler = (0, math.radians(-28), math.radians(-12))
    pipa_neck.data.materials.append(mat_bronze)
    parts.append(pipa_neck)

    # Gắn toàn bộ chi tiết vào Root và chuẩn hóa Normals
    for obj in parts:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        obj.parent = root
        obj.select_set(False)

    # Đảm bảo thư mục tồn tại và xuất GLB
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
    print(f"[HOÀN TẤT] Đã xuất tượng Thúy Kiều tại: {OUTPUT_PATH}")

if __name__ == "__main__":
    build_thuy_kieu_statue()