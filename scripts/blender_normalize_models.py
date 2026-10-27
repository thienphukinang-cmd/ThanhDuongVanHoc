import bpy
import sys
import mathutils

def process_an_thu(filepath):
    print(f"\n================ [XỬ LÝ BLENDER] ÁN THƯ CỔ: {filepath} ================")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=filepath)
    
    mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not mesh_objs:
        print("[ERROR] Không tìm thấy mesh!", file=sys.stderr)
        return False
        
    bpy.ops.object.select_all(action='DESELECT')
    for o in mesh_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objs[0]
    
    if len(mesh_objs) > 1:
        bpy.ops.object.join()
        
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Đo kích thước ban đầu
    bbox = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    min_x = min(c.x for c in bbox)
    max_x = max(c.x for c in bbox)
    min_y = min(c.y for c in bbox)
    max_y = max(c.y for c in bbox)
    min_z = min(c.z for c in bbox)
    max_z = max(c.z for c in bbox)
    
    size_x = max_x - min_x
    size_y = max_y - min_y
    size_z = max_z - min_z
    
    print(f"[TRƯỚC SCALE] X: {size_x:.4f}m, Y: {size_y:.4f}m, Z: {size_z:.4f}m")
    
    # Chiều rộng của bàn (phải là chiều ngang mặt bàn)
    # Nếu size_y > size_x, xoay 90 độ để chiều rộng hướng theo trục X
    if size_y > size_x:
        obj.rotation_euler.z = 1.5707963  # 90 độ
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        bbox = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
        size_x = max(c.x for c in bbox) - min(c.x for c in bbox)
        size_y = max(c.y for c in bbox) - min(c.y for c in bbox)
    
    # Ép chiều rộng X đúng 1.5 mét
    scale_factor = 1.5 / max(size_x, 0.001)
    print(f"[SCALE FACTOR] Ép chiều rộng về 1.5m -> Nhân hệ số: {scale_factor:.4f}")
    obj.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    
    # Đặt lại tâm vật lý (Origin to Bottom Center):
    # Đáy chuẩn tại Y=0 trong Three.js (tương ứng Z=0 trong Blender)
    bbox = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    min_x = min(c.x for c in bbox)
    max_x = max(c.x for c in bbox)
    min_y = min(c.y for c in bbox)
    max_y = max(c.y for c in bbox)
    min_z = min(c.z for c in bbox)
    max_z = max(c.z for c in bbox)
    
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    bottom_z = min_z
    
    bpy.context.scene.cursor.location = mathutils.Vector((center_x, center_y, bottom_z))
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    
    # Đưa vật thể về gốc tọa độ thế giới (0, 0, 0)
    obj.location = (0, 0, 0)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    
    # Kiểm tra lại bounding box sau xử lý
    bbox_final = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    f_min_x = min(c.x for c in bbox_final)
    f_max_x = max(c.x for c in bbox_final)
    f_min_y = min(c.y for c in bbox_final)
    f_max_y = max(c.y for c in bbox_final)
    f_min_z = min(c.z for c in bbox_final)
    f_max_z = max(c.z for c in bbox_final)
    
    print(f"[SAU XỬ LÝ]")
    print(f"  Chiều rộng (X): {f_max_x - f_min_x:.4f}m (chuẩn 1.5m: span [{f_min_x:.4f}, {f_max_x:.4f}])")
    print(f"  Chiều sâu (Y):   {f_max_y - f_min_y:.4f}m (span [{f_min_y:.4f}, {f_max_y:.4f}])")
    print(f"  Chiều cao (Z):   {f_max_z - f_min_z:.4f}m (span [{f_min_z:.4f}, {f_max_z:.4f}])")
    print(f"  Đáy tại Z=0:     {f_min_z:.4f}m")
    
    # Xuất đè lại file gốc
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True,
        export_yup=True
    )
    print(f"✓ [THÀNH CÔNG] Đã lưu đè file Án Thư: {filepath}\n")
    return True

def process_dan_ty_ba(filepath):
    print(f"\n================ [XỬ LÝ BLENDER] ĐÀN TỲ BÀ: {filepath} ================")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=filepath)
    
    mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not mesh_objs:
        print("[ERROR] Không tìm thấy mesh!", file=sys.stderr)
        return False
        
    bpy.ops.object.select_all(action='DESELECT')
    for o in mesh_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objs[0]
    
    if len(mesh_objs) > 1:
        bpy.ops.object.join()
        
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Đo kích thước ban đầu
    bbox = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    min_x = min(c.x for c in bbox)
    max_x = max(c.x for c in bbox)
    min_y = min(c.y for c in bbox)
    max_y = max(c.y for c in bbox)
    min_z = min(c.z for c in bbox)
    max_z = max(c.z for c in bbox)
    
    size_x = max_x - min_x
    size_y = max_y - min_y
    size_z = max_z - min_z
    
    print(f"[TRƯỚC SCALE] X: {size_x:.4f}m, Y: {size_y:.4f}m, Z: {size_z:.4f}m")
    
    # Chiều dài của đàn tỳ bà là chiều dài lớn nhất
    max_length = max(size_x, size_y, size_z)
    
    # Ép chiều dài đúng 1.0 mét
    scale_factor = 1.0 / max(max_length, 0.001)
    print(f"[SCALE FACTOR] Ép chiều dài về 1.0m -> Nhân hệ số: {scale_factor:.4f}")
    obj.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    
    # Đặt lại tâm vật lý (Origin to Bottom Center):
    bbox = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    min_x = min(c.x for c in bbox)
    max_x = max(c.x for c in bbox)
    min_y = min(c.y for c in bbox)
    max_y = max(c.y for c in bbox)
    min_z = min(c.z for c in bbox)
    max_z = max(c.z for c in bbox)
    
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    bottom_z = min_z
    
    bpy.context.scene.cursor.location = mathutils.Vector((center_x, center_y, bottom_z))
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    
    # Đưa vật thể về gốc tọa độ thế giới (0, 0, 0)
    obj.location = (0, 0, 0)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    
    # Kiểm tra lại bounding box sau xử lý
    bbox_final = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    f_min_x = min(c.x for c in bbox_final)
    f_max_x = max(c.x for c in bbox_final)
    f_min_y = min(c.y for c in bbox_final)
    f_max_y = max(c.y for c in bbox_final)
    f_min_z = min(c.z for c in bbox_final)
    f_max_z = max(c.z for c in bbox_final)
    
    f_len = max(f_max_x - f_min_x, f_max_y - f_min_y, f_max_z - f_min_z)
    print(f"[SAU XỬ LÝ]")
    print(f"  Chiều dài lớn nhất: {f_len:.4f}m (chuẩn 1.0m)")
    print(f"  X: span [{f_min_x:.4f}, {f_max_x:.4f}]")
    print(f"  Y: span [{f_min_y:.4f}, {f_max_y:.4f}]")
    print(f"  Z: span [{f_min_z:.4f}, {f_max_z:.4f}] (Đáy tại Z=0: {f_min_z:.4f}m)")
    
    # Xuất đè lại file gốc
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True,
        export_yup=True
    )
    print(f"✓ [THÀNH CÔNG] Đã lưu đè file Đàn Tỳ Bà: {filepath}\n")
    return True

# Thực thi
an_thu_path = "D:/BaoTang3D/BaoTangVanHoc_TheNewEra/public/assets/models/rooms/kieu/an_thu.glb"
dan_ty_ba_path = "D:/BaoTang3D/BaoTangVanHoc_TheNewEra/public/assets/models/rooms/kieu/dan_ty_ba.glb"

process_an_thu(an_thu_path)
process_dan_ty_ba(dan_ty_ba_path)
