import bpy
import math
import os

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "models"))
ADV_INPUT = os.path.join(MODELS_DIR, "an_duong_vuong.glb")
ADV_OUTPUT = os.path.join(MODELS_DIR, "an_duong_vuong_web.glb")
CROSSBOW_OUTPUT = os.path.join(MODELS_DIR, "no_than_kim_quy.glb")

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0

def optimize_an_duong_vuong_glb():
    if not os.path.exists(ADV_INPUT):
        print(f"[CẢNH BÁO] Hãy đặt file an_duong_vuong.glb vào: {ADV_INPUT}")
        return

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=ADV_INPUT)

    # Xử lý node_0 (47,074 vertices / 49,786 tris) và chuẩn hóa góc xoay [0.7071, 0, 0, 0.7071]
    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Áp dụng góc xoay gốc để đưa về trục đứng chuẩn
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Gộp đỉnh trùng và sửa hướng pháp tuyến
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.0004)
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')

        # Giảm đa giác từ ~49.786 tris xuống ~12.500 tris (ratio = 0.25) giữ nguyên UV PBR
        mod = obj.modifiers.new(name="Web_LowPoly", type='DECIMATE')
        mod.decimate_type = 'COLLAPSE'
        mod.ratio = 0.25
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.object.shade_smooth()
        obj.select_set(False)

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=ADV_OUTPUT,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT'
    )
    print(f"[HOÀN TẤT] Đã tối ưu tượng An Dương Vương: {ADV_OUTPUT}")

def build_no_than_kim_quy_glb():
    reset_scene()

    def make_mat(name, color, metallic, roughness, emission=None, strength=0.0):
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (*color, 1.0)
            bsdf.inputs["Metallic"].default_value = metallic
            bsdf.inputs["Roughness"].default_value = roughness
            if emission and "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
                bsdf.inputs["Emission Strength"].default_value = strength
        return mat

    mat_bronze = make_mat("CoLoa_Bronze", (0.25, 0.18, 0.11), 0.88, 0.32)
    mat_wood = make_mat("Ironwood_Lacquer", (0.38, 0.08, 0.06), 0.25, 0.28)
    mat_claw = make_mat("KimQuy_Divine_Claw", (1.0, 0.78, 0.22), 0.95, 0.15, (1.0, 0.65, 0.1), 2.5)

    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "NoThan_KimQuy_Root"
    parts = []

    # 1. Bệ đá Loa Thành chạm đồng (Z: 0 -> 0.9m)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.95, depth=0.35, location=(0, 0, 0.175))
    base = bpy.context.active_object
    base.data.materials.append(mat_bronze)
    parts.append(base)

    bpy.ops.mesh.primitive_box_add(size=1.0, location=(0, 0, 0.65))
    stand = bpy.context.active_object
    stand.scale = (0.55, 0.85, 0.65)
    stand.data.materials.append(mat_wood)
    parts.append(stand)

    # 2. Thân Nỏ Thần Liên Châu & Cánh Cung Đồng
    bpy.ops.mesh.primitive_box_add(size=1.0, location=(0, 0.1, 1.25))
    stock = bpy.context.active_object
    stock.scale = (0.16, 1.45, 0.14)
    stock.rotation_euler = (math.radians(15), 0, 0)
    stock.data.materials.append(mat_wood)
    parts.append(stock)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.95, minor_radius=0.055, location=(0, 0.55, 1.38))
    bow_arc = bpy.context.active_object
    bow_arc.scale = (1.15, 0.45, 1.0)
    bow_arc.rotation_euler = (math.radians(15), 0, 0)
    bow_arc.data.materials.append(mat_bronze)
    parts.append(bow_arc)

    # 3. Lẫy Nỏ Vuốt Rùa Vàng Kim Quy phát sáng
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.065, radius2=0.008, depth=0.28, location=(0, -0.35, 1.22))
    claw_trigger = bpy.context.active_object
    claw_trigger.rotation_euler = (math.radians(-35), 0, 0)
    claw_trigger.data.materials.append(mat_claw)
    parts.append(claw_trigger)

    # 4. Chùm tên đồng Liên Châu lắp sẵn trên rãnh
    for idx in range(-2, 3):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=10, radius=0.015, depth=1.15,
            location=(idx * 0.045, 0.35, 1.34)
        )
        arrow = bpy.context.active_object
        arrow.rotation_euler = (math.radians(105), 0, 0)
        arrow.data.materials.append(mat_claw)
        parts.append(arrow)

    for obj in parts:
        obj.parent = root

    os.makedirs(MODELS_DIR, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(
        filepath=CROSSBOW_OUTPUT,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT'
    )
    print(f"[HOÀN TẤT] Đã xuất Nỏ Thần Liên Châu: {CROSSBOW_OUTPUT}")

if __name__ == "__main__":
    optimize_an_duong_vuong_glb()
    build_no_than_kim_quy_glb()