#!/usr/bin/env python3
"""
scripts/pipeline_an_duong_vuong.py
Pipeline Tối Ưu Hóa An Dương Vương & Dựng Mô Hình Nỏ Thần Liên Châu
Bảo Tàng Văn Học Việt Nam 3D (Blender 5.2 + gltf-transform)

Quy trình tự động:
1. Nạp file an_duong_vuong.glb / ANDUONGVUONG.glb (47.074 verts, 49.786 tris, 42.75 MB).
2. Giảm đa giác qua Decimate modifier xuống ~12.500 tris.
3. Thu nhỏ 3 texture PNG về 1024px.
4. Nén texture sang chuẩn WebP qua gltf-transform -> xuất public/models/an_duong_vuong_web.glb.
5. Dựng và xuất mô hình Nỏ Thần Liên Châu (no_than_kim_quy.glb) với lẫy vuốt Thần Kim Quy.
"""

import bpy
import bmesh
import math
import os
import sys
import shutil
import subprocess
from mathutils import Vector, Euler

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODELS_DIR = os.path.join(PROJECT_ROOT, "public", "models")
ALT_MODELS_DIR = os.path.join(PROJECT_ROOT, "public", "model")

SRC_ADV_GLB = os.path.join(MODELS_DIR, "ANDUONGVUONG.glb")
ALT_SRC_ADV_GLB = os.path.join(MODELS_DIR, "an_duong_vuong.glb")
TEMP_DECIMATED_GLB = os.path.join(MODELS_DIR, "temp_an_duong_vuong_decimated.glb")
TARGET_ADV_WEB_GLB = os.path.join(MODELS_DIR, "an_duong_vuong_web.glb")
TARGET_CROSSBOW_GLB = os.path.join(MODELS_DIR, "no_than_kim_quy.glb")

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)
    new_col = bpy.data.collections.new("ADV_Collection")
    bpy.context.scene.collection.children.link(new_col)
    return new_col

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.35, emissive=(0, 0, 0, 1), emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()

    output = nodes.new(type='ShaderNodeOutputMaterial')
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])

    principled.inputs['Base Color'].default_value = base_color
    principled.inputs['Metallic'].default_value = metallic
    principled.inputs['Roughness'].default_value = roughness

    if 'Emission Color' in principled.inputs:
        principled.inputs['Emission Color'].default_value = emissive[:3] + (1.0,)
        if 'Emission Strength' in principled.inputs:
            principled.inputs['Emission Strength'].default_value = emissive_strength
    elif 'Emission' in principled.inputs:
        principled.inputs['Emission'].default_value = emissive

    return mat

# ==============================================================================
# PHẦN 1: TỐI ƯU HÓA AN DƯƠNG VƯƠNG (DECIMATE ~12.500 TRIS & RESIZE TEXTURES)
# ==============================================================================
def optimize_an_duong_vuong():
    print("\n" + "=" * 70)
    print("▶ [BƯỚC 1] BẮT ĐẦU TỐI ƯU HÓA AN DƯƠNG VƯƠNG GLB QUA BLENDER")
    print("=" * 70)

    input_file = SRC_ADV_GLB
    if not os.path.exists(input_file):
        if os.path.exists(ALT_SRC_ADV_GLB):
            input_file = ALT_SRC_ADV_GLB
        else:
            print(f"[ERROR] Không tìm thấy file nguồn An Dương Vương tại {SRC_ADV_GLB}!", file=sys.stderr)
            return False

    # Đồng bộ an_duong_vuong.glb nếu chưa có
    if not os.path.exists(ALT_SRC_ADV_GLB) and input_file == SRC_ADV_GLB:
        try:
            shutil.copy2(SRC_ADV_GLB, ALT_SRC_ADV_GLB)
            print(f"  [SYNC] Đã tạo bản sao: {ALT_SRC_ADV_GLB}")
        except Exception as e:
            print(f"  [WARN] {e}")

    orig_size_mb = os.path.getsize(input_file) / (1024 * 1024)
    print(f"  - File nguồn: {input_file} ({orig_size_mb:.2f} MB)")

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=input_file)

    mesh_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not mesh_objs:
        print("[ERROR] Không tìm thấy Mesh trong file GLB!", file=sys.stderr)
        return False

    obj = mesh_objs[0]
    bpy.context.view_layer.objects.active = obj
    orig_verts = len(obj.data.vertices)
    orig_polys = len(obj.data.polygons)
    print(f"  - Thông số gốc: {orig_verts:,} đỉnh | {orig_polys:,} tam giác")

    # Giảm đa giác xuống ~12.500 tris (Tỷ lệ: 12500 / 49786 ≈ 0.251)
    target_ratio = 12500.0 / max(orig_polys, 1)
    mod = obj.modifiers.new(name="Decimate_Opt", type='DECIMATE')
    mod.ratio = target_ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)

    new_verts = len(obj.data.vertices)
    new_polys = len(obj.data.polygons)
    print(f"  - Sau Decimate: {new_verts:,} đỉnh | {new_polys:,} tam giác (Mục tiêu ~12.500 tris)")

    # Thu nhỏ 3 texture PNG sang 1024px
    for img in bpy.data.images:
        w, h = img.size[0], img.size[1]
        if w > 1024 or h > 1024:
            print(f"  - Resize texture {img.name}: {w}x{h} -> 1024x1024")
            try:
                img.scale(1024, 1024)
            except Exception as e:
                print(f"    [WARN] Lỗi scale {img.name}: {e}")

    # Xuất file trung gian
    bpy.ops.export_scene.gltf(
        filepath=TEMP_DECIMATED_GLB,
        export_format='GLB',
        export_apply=True
    )
    print(f"  - Đã xuất file trung gian: {TEMP_DECIMATED_GLB} ({os.path.getsize(TEMP_DECIMATED_GLB)/(1024*1024):.2f} MB)")

    # Nén WebP bằng gltf-transform
    print("\n▶ [BƯỚC 1.2] NÉN TEXTURES SANG WEBP QUA @gltf-transform/cli...")
    try:
        cmd = f'cmd.exe /c "npx @gltf-transform/cli webp \"{TEMP_DECIMATED_GLB}\" \"{TARGET_ADV_WEB_GLB}\" --quality 85"'
        ret = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if ret.returncode == 0 and os.path.exists(TARGET_ADV_WEB_GLB):
            new_size_mb = os.path.getsize(TARGET_ADV_WEB_GLB) / (1024 * 1024)
            pct = (orig_size_mb - new_size_mb) / orig_size_mb * 100
            print(f"✓ [HOÀN TẤT WEBP] {TARGET_ADV_WEB_GLB}: {orig_size_mb:.2f} MB -> {new_size_mb:.2f} MB (Giảm {pct:.1f}%)")

            # Đồng bộ sang public/model
            os.makedirs(ALT_MODELS_DIR, exist_ok=True)
            alt_web = os.path.join(ALT_MODELS_DIR, "an_duong_vuong_web.glb")
            shutil.copy2(TARGET_ADV_WEB_GLB, alt_web)
            print(f"  [SYNC] Đã đồng bộ: {alt_web}")
        else:
            print(f"[WARN] gltf-transform lỗi hoặc chưa hoàn tất: {ret.stderr}\nFallback copy file trung gian.")
            shutil.copy2(TEMP_DECIMATED_GLB, TARGET_ADV_WEB_GLB)
    except Exception as e:
        print(f"[WARN] Lỗi chạy gltf-transform: {e}")
        shutil.copy2(TEMP_DECIMATED_GLB, TARGET_ADV_WEB_GLB)

    if os.path.exists(TEMP_DECIMATED_GLB):
        os.remove(TEMP_DECIMATED_GLB)

    return True

# ==============================================================================
# PHẦN 2: DỰNG MÔ HÌNH NỎ THẦN LIÊN CHÂU (no_than_kim_quy.glb)
# ==============================================================================
def build_no_than_kim_quy():
    print("\n" + "=" * 70)
    print("▶ [BƯỚC 2] DỰNG MÔ HÌNH NỎ THẦN LIÊN CHÂU (no_than_kim_quy.glb)")
    print("=" * 70)
    reset_scene()

    # Vật liệu PBR Sử thi
    mat_ancient_bronze = create_pbr_material(
        "Mat_AncientBronze",
        base_color=(0.28, 0.22, 0.16, 1.0),
        metallic=0.85,
        roughness=0.28
    )
    mat_lacquered_wood = create_pbr_material(
        "Mat_LacqueredWood",
        base_color=(0.18, 0.08, 0.04, 1.0),
        metallic=0.20,
        roughness=0.30
    )
    mat_divine_gold = create_pbr_material(
        "Mat_DivineGold",
        base_color=(0.95, 0.78, 0.22, 1.0),
        metallic=0.92,
        roughness=0.18,
        emissive=(0.35, 0.25, 0.05, 1.0),
        emissive_strength=0.3
    )
    mat_kim_quy_claw = create_pbr_material(
        "Mat_KimQuyClaw",
        base_color=(0.45, 0.92, 0.75, 1.0),
        metallic=0.35,
        roughness=0.20,
        emissive=(0.15, 0.65, 0.50, 1.0),
        emissive_strength=1.8
    )

    parts = []

    # 1. Bệ đỡ giá nỏ bằng gỗ mun chạm hoa sen
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.65, depth=0.18, location=(0, 0, 0.09))
    ped_base = bpy.context.active_object
    ped_base.data.materials.append(mat_ancient_bronze)
    parts.append(ped_base)

    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.18, depth=0.72, location=(0, 0, 0.54))
    ped_pillar = bpy.context.active_object
    ped_pillar.data.materials.append(mat_lacquered_wood)
    parts.append(ped_pillar)

    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.22, depth=0.08, location=(0, 0, 0.94))
    ped_top = bpy.context.active_object
    ped_top.data.materials.append(mat_divine_gold)
    parts.append(ped_top)

    # 2. Thân nỏ (Stock/Tiller) bằng gỗ mun viền đồng
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.05))
    stock = bpy.context.active_object
    stock.name = "Crossbow_Stock"
    stock.scale = (0.16, 1.75, 0.14)
    stock.data.materials.append(mat_lacquered_wood)
    parts.append(stock)

    # Bọc viền đồng đầu và đuôi nỏ
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.85, 1.05))
    cap_front = bpy.context.active_object
    cap_front.scale = (0.18, 0.08, 0.16)
    cap_front.data.materials.append(mat_divine_gold)
    parts.append(cap_front)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.85, 1.05))
    cap_rear = bpy.context.active_object
    cap_rear.scale = (0.18, 0.08, 0.16)
    cap_rear.data.materials.append(mat_divine_gold)
    parts.append(cap_rear)

    # 3. Cánh nỏ cong vút (Crossbow Bow Arms) sải rộng 2.1m
    bpy.ops.mesh.primitive_torus_add(
        major_radius=1.05,
        minor_radius=0.048,
        major_segments=36,
        minor_segments=10,
        location=(0, 0.75, 1.06)
    )
    bow_arms = bpy.context.active_object
    bow_arms.name = "Crossbow_Arms"
    bow_arms.rotation_euler = (math.pi / 2, 0, 0)
    bow_arms.scale = (1.0, 0.42, 1.0)
    bow_arms.data.materials.append(mat_ancient_bronze)
    parts.append(bow_arms)

    # 2 Đầu cánh nỏ bịt vàng chạm khắc đầu rồng
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.065, radius2=0.02, depth=0.22, location=(side * 1.05, 0.72, 1.06))
        tip = bpy.context.active_object
        tip.rotation_euler = (0, side * math.pi / 2, 0)
        tip.data.materials.append(mat_divine_gold)
        parts.append(tip)

    # Dây nỏ tơ tằm bện chỉ vàng căng gắt
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.008, depth=1.12, location=(side * 0.52, 0.36, 1.13))
        cord = bpy.context.active_object
        cord.rotation_euler = (math.radians(52), side * math.radians(-58), 0)
        cord.data.materials.append(mat_divine_gold)
        parts.append(cord)

    # 4. Hộp rãnh phóng vạn mũi tên liên châu (Multi-Arrow Rack)
    for track_i in range(5):
        track_x = (track_i - 2) * 0.028
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(track_x, 0.25, 1.14))
        track_mesh = bpy.context.active_object
        track_mesh.scale = (0.012, 1.1, 0.015)
        track_mesh.data.materials.append(mat_divine_gold)
        parts.append(track_mesh)

        # Mũi tên đồng Cổ Loa trên rãnh
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.006, depth=0.88, location=(track_x, 0.38, 1.16))
        arrow_shaft = bpy.context.active_object
        arrow_shaft.rotation_euler = (math.pi / 2, 0, 0)
        arrow_shaft.data.materials.append(mat_ancient_bronze)
        parts.append(arrow_shaft)

        # Đầu mũi tên đồng hình ba cạnh sắc bén
        bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.024, radius2=0.002, depth=0.09, location=(track_x, 0.84, 1.16))
        arrow_head = bpy.context.active_object
        arrow_head.rotation_euler = (-math.pi / 2, 0, 0)
        arrow_head.data.materials.append(mat_divine_gold)
        parts.append(arrow_head)

    # 5. LẪY NỎ BẰNG VUỐT THẦN KIM QUY PHÁT SÁNG (BẢO VẬT TRẤN QUỐC)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.045, radius2=0.008, depth=0.24, location=(0, -0.06, 1.20))
    claw = bpy.context.active_object
    claw.name = "KimQuy_Claw_Trigger"
    claw.rotation_euler = (math.radians(-32), 0, 0)
    claw.data.materials.append(mat_kim_quy_claw)
    parts.append(claw)

    # Khung lẫy nỏ bọc vàng
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.065, depth=0.08, location=(0, -0.06, 1.12))
    claw_housing = bpy.context.active_object
    claw_housing.data.materials.append(mat_divine_gold)
    parts.append(claw_housing)

    # 6. Gộp mesh, chuẩn hóa tâm đáy Z = 0 và xuất GLB
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        if p and p.name in bpy.data.objects:
            p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    final_obj = bpy.context.view_layer.objects.active
    final_obj.name = "No_Than_Lien_Chau"

    bpy.ops.object.shade_smooth()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Bounding Box
    bbox = [final_obj.matrix_world @ Vector(c) for c in final_obj.bound_box]
    min_z = min(v.z for v in bbox)
    center_x = (min(v.x for v in bbox) + max(v.x for v in bbox)) / 2
    center_y = (min(v.y for v in bbox) + max(v.y for v in bbox)) / 2

    final_obj.location = (-center_x, -center_y, -min_z)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    # Xuất GLB
    bpy.ops.export_scene.gltf(
        filepath=TARGET_CROSSBOW_GLB,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True
    )
    print(f"✓ [EXPORTED] Đã xuất Nỏ Thần: {TARGET_CROSSBOW_GLB} ({os.path.getsize(TARGET_CROSSBOW_GLB):,} bytes)")

    # Đồng bộ sang public/model
    alt_cb = os.path.join(ALT_MODELS_DIR, "no_than_kim_quy.glb")
    shutil.copy2(TARGET_CROSSBOW_GLB, alt_cb)
    print(f"  [SYNC] Đã đồng bộ: {alt_cb}")

    return True

def main():
    print("=================================================================")
    print(" PIPELINE AN DƯƠNG VƯƠNG & NỎ THẦN LIÊN CHÂU (BLENDER + GLTF-TRANSFORM)")
    print("=================================================================")
    ok1 = optimize_an_duong_vuong()
    ok2 = build_no_than_kim_quy()
    if ok1 and ok2:
        print("\n=================================================================")
        print("✓ HOÀN TẤT XUẤT SẮC TOÀN BỘ PIPELINE BƯỚC 1!")
        print("=================================================================")
    else:
        print("\n[WARN] Có lỗi trong quá trình thực hiện pipeline!", file=sys.stderr)

if __name__ == "__main__":
    main()
