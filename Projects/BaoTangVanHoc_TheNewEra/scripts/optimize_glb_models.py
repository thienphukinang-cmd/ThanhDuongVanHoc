import bpy
import os
import sys

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "models"))
MAX_TRIANGLES = 15000
TARGET_RATIO = 0.28  # Giữ lại 28% số đa giác cho các model quá nặng

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0

def count_scene_triangles():
    total_tris = 0
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.data:
            total_tris += sum(len(p.vertices) - 2 for p in obj.data.polygons)
    return total_tris

def optimize_glb_file(filepath):
    clear_scene()
    size_before_mb = os.path.getsize(filepath) / (1024 * 1024)
    
    bpy.ops.import_scene.gltf(filepath=filepath)
    tris_before = count_scene_triangles()
    
    print(f"\n[KIỂM TRA] {os.path.basename(filepath)} | {size_before_mb:.2f} MB | {tris_before:,} triangles")
    
    if tris_before <= MAX_TRIANGLES and size_before_mb <= 5.0:
        print(" -> Đạt chuẩn Low-Poly, bỏ qua.")
        return

    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        
        # 1. Gộp đỉnh trùng và đồng bộ pháp tuyến (Normals)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.0005)
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # 2. Áp dụng Decimate nếu lưới quá dày
        obj_tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        if obj_tris > 2500:
            mod = obj.modifiers.new(name="LowPoly_Decimate", type='DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = TARGET_RATIO
            mod.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=mod.name)
            
        # 3. Làm mượt bề mặt
        bpy.ops.object.shade_smooth()
        obj.select_set(False)

    # Xuất đè file GLB đã tối ưu
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT'
    )
    
    tris_after = count_scene_triangles()
    size_after_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f" -> [ĐÃ TỐI ƯU] {tris_before:,} -> {tris_after:,} tris | {size_before_mb:.2f} MB -> {size_after_mb:.2f} MB")

def main():
    if not os.path.exists(MODELS_DIR):
        print(f"Không tìm thấy thư mục: {MODELS_DIR}")
        return

    for root, _, files in os.walk(MODELS_DIR):
        for file in files:
            if file.lower().endswith(".glb"):
                optimize_glb_file(os.path.join(root, file))

if __name__ == "__main__":
    main()