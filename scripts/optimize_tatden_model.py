import bpy
import os

INPUT_PATH = os.path.abspath(os.path.join(os.getcwd(), "model", "tatden.glb"))
OUTPUT_DIR = os.path.abspath(os.path.join(os.getcwd(), "public", "models"))
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "tatden.glb")


def optimize_tatden():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    print(f"[TatDen Optimizer] Importing {INPUT_PATH}...")
    bpy.ops.import_scene.gltf(filepath=INPUT_PATH)

    mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    for obj in mesh_objs:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        poly_count = len(obj.data.polygons)
        print(f"[TatDen Optimizer] Mesh '{obj.name}' original polygons: {poly_count}")

        # Target ~45,000 triangles for smooth 60 FPS WebGL rendering
        target_polys = 45000
        if poly_count > target_polys:
            ratio = max(0.02, min(1.0, target_polys / float(poly_count)))
            mod = obj.modifiers.new(name="DecimateTatDen", type='DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = ratio
            mod.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=mod.name)
            print(f"[TatDen Optimizer] Decimated '{obj.name}' -> {len(obj.data.polygons)} polygons (ratio={ratio:.4f})")

        # Apply transforms cleanly
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        obj.select_set(False)

    # Downscale oversized 4K textures to preserve 2GB VRAM and keep GLB lightweight
    for img in bpy.data.images:
        w, h = img.size[0], img.size[1]
        if w == 0 or h == 0:
            continue
        name_lower = img.name.lower()
        max_dim = 512 if ("rough" in name_lower or "metal" in name_lower or "normal" in name_lower) else 1024
        if w > max_dim or h > max_dim:
            scale = max_dim / float(max(w, h))
            new_w = max(64, int(w * scale))
            new_h = max(64, int(h * scale))
            img.scale(new_w, new_h)
            print(f"[TatDen Optimizer] Scaled image '{img.name}' {w}x{h} -> {new_w}x{new_h}")

    print(f"[TatDen Optimizer] Exporting optimized GLB -> {OUTPUT_PATH}")
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_PATH,
        export_format='GLB',
        export_yup=True,
        export_apply=True,
        export_image_format='JPEG',
        export_jpeg_quality=85,
        export_materials='EXPORT',
    )
    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f"[TatDen Optimizer] Done! File size: {size_mb:.2f} MB")


if __name__ == "__main__":
    optimize_tatden()
