import math
import os
import shutil
import bpy
from mathutils import Vector

INPUT_PATH = os.path.abspath(os.path.join("D:\\BaoTang3D", "model", "thanhgiong.glb"))
PRIMARY_OUTPUT = os.path.abspath(os.path.join("D:\\BaoTang3D", "public", "models", "thanhgiong.glb"))
MIRROR_OUTPUTS = [
    os.path.abspath(os.path.join("D:\\BaoTang3D", "public", "model", "thanhgiong.glb")),
    os.path.abspath(os.path.join("D:\\BaoTang3D", "public", "models", "thanh_giong.glb")),
    os.path.abspath(os.path.join("D:\\BaoTang3D", "public", "model", "thanh_giong.glb")),
]

TARGET_TRIS = 42000


def optimize_thanhgiong():
    assert os.path.exists(INPUT_PATH), f"Source GLB missing: {INPUT_PATH}"
    os.makedirs(os.path.dirname(PRIMARY_OUTPUT), exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    print(f"[ThanhGiong Optimizer] Importing {INPUT_PATH} (read-only source)...")
    bpy.ops.import_scene.gltf(filepath=INPUT_PATH)

    mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    assert mesh_objs, "No mesh objects found in thanhgiong.glb"

    total_orig_tris = 0
    for obj in mesh_objs:
        obj.data.calc_loop_triangles()
        total_orig_tris += len(obj.data.loop_triangles)

    for obj in mesh_objs:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Apply existing rotation/scale first so centering & grounding operate in world space
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

        obj.data.calc_loop_triangles()
        orig_tris = len(obj.data.loop_triangles)
        print(f"[ThanhGiong Optimizer] Mesh '{obj.name}' orig tris={orig_tris}, verts={len(obj.data.vertices)}")

        if total_orig_tris > TARGET_TRIS and orig_tris > 200:
            ratio = max(0.015, min(1.0, TARGET_TRIS / float(total_orig_tris)))
            mod = obj.modifiers.new(name="DecimateThanhGiong", type="DECIMATE")
            mod.decimate_type = "COLLAPSE"
            mod.ratio = ratio
            mod.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=mod.name)

        obj.data.calc_loop_triangles()
        print(
            f"[ThanhGiong Optimizer] Mesh '{obj.name}' decimated tris={len(obj.data.loop_triangles)}, "
            f"verts={len(obj.data.vertices)}, uv_layers={len(obj.data.uv_layers)}"
        )
        obj.select_set(False)

    # Center scene horizontally (X/Y in Blender Z-up) and ground min_z = 0
    bpy.context.view_layer.update()
    min_x, max_x = 1e9, -1e9
    min_y, max_y = 1e9, -1e9
    min_z = 1e9
    for obj in mesh_objs:
        for corner in obj.bound_box:
            wc = obj.matrix_world @ Vector(corner)
            min_x = min(min_x, wc.x)
            max_x = max(max_x, wc.x)
            min_y = min(min_y, wc.y)
            max_y = max(max_y, wc.y)
            min_z = min(min_z, wc.z)

    cx = (min_x + max_x) * 0.5
    cy = (min_y + max_y) * 0.5
    for obj in mesh_objs:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        obj.location.x -= cx
        obj.location.y -= cy
        obj.location.z -= min_z
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        obj.select_set(False)

    # Verify finite vertex coordinates
    for obj in mesh_objs:
        for v in obj.data.vertices:
            assert all(math.isfinite(c) for c in v.co), f"Non-finite vertex in {obj.name}"

    # Downscale oversized 4K PBR textures cleanly:
    # baseColor -> 1024px, normal & metallicRoughness -> 512px
    for img in bpy.data.images:
        w, h = img.size[0], img.size[1]
        if w <= 0 or h <= 0:
            continue
        name_lower = img.name.lower()
        is_aux_map = ("normal" in name_lower) or ("nor_" in name_lower) or ("rough" in name_lower) or ("metal" in name_lower)
        max_dim = 512 if is_aux_map else 1024
        if max(w, h) > max_dim:
            scale = max_dim / float(max(w, h))
            new_w = max(64, int(round(w * scale)))
            new_h = max(64, int(round(h * scale)))
            img.scale(new_w, new_h)
            img.pack()
            print(f"[ThanhGiong Optimizer] Scaled '{img.name}' {w}x{h} -> {new_w}x{new_h}")

    print(f"[ThanhGiong Optimizer] Exporting optimized GLB -> {PRIMARY_OUTPUT}")
    bpy.ops.export_scene.gltf(
        filepath=PRIMARY_OUTPUT,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=88,
        export_animations=False,
    )

    for mirror in MIRROR_OUTPUTS:
        os.makedirs(os.path.dirname(mirror), exist_ok=True)
        shutil.copy2(PRIMARY_OUTPUT, mirror)
        print(f"[ThanhGiong Optimizer] Synced -> {mirror}")

    size_mb = os.path.getsize(PRIMARY_OUTPUT) / (1024.0 * 1024.0)
    print(f"[ThanhGiong Optimizer] Done! Final size: {size_mb:.2f} MB")


if __name__ == "__main__":
    optimize_thanhgiong()
