import bpy
import bmesh
import math
import os

OUTPUT_DIR = os.path.abspath(os.path.join(os.getcwd(), "public", "model", "heritage"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

ALT_OUTPUT_DIR = os.path.abspath(os.path.join(os.getcwd(), "..", "BaoTangVanHoc_TheNewEra", "public", "model", "heritage"))
if os.path.exists(os.path.dirname(ALT_OUTPUT_DIR)):
    os.makedirs(ALT_OUTPUT_DIR, exist_ok=True)

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
    # Chọn tất cả các object và apply transform
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    filepath = os.path.join(OUTPUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_apply=True
    )
    print(f"[Blender Exporter] Da xuat thanh cong: {filepath}")
    if os.path.exists(ALT_OUTPUT_DIR):
        alt_path = os.path.join(ALT_OUTPUT_DIR, filename)
        try:
            import shutil
            shutil.copyfile(filepath, alt_path)
            print(f"[Blender Exporter] Da dong bo sang: {alt_path}")
        except Exception as e:
            print(f"[Blender Exporter] Loi dong bo {alt_path}: {e}")

# =============================================================================
# 1. KHUNG TRANH PHÙ ĐIÊU SƠN SON THẾP VÀNG 3D (wall_lacquer_frame_3d.glb)
# Chuẩn trục Blender: X = Rộng (3.6m), Z = Cao (2.1m), Y = Chiều sâu/Dày (0.06m)
# Khi xuất sang glTF/Three.js: X = Rộng (3.6m), Y = Cao (2.1m), Z = Chiều sâu (0.06m)
# =============================================================================
def build_wall_lacquer_frame():
    clear_scene()
    mat_gold = create_pbr_material("FrameGold", (0.95, 0.78, 0.18, 1.0), metallic=0.92, roughness=0.18, emission_color=(0.25, 0.18, 0.02, 1.0), emission_strength=0.15)
    mat_lacquer = create_pbr_material("FrameLacquer", (0.45, 0.05, 0.05, 1.0), metallic=0.30, roughness=0.25)

    frame_w = 3.6
    frame_h = 2.1
    rim_w = 0.14
    depth = 0.06  # Chỉ dày 6cm, ốp sát mặt tường phẳng

    # 1. Viền ngoài thếp vàng (Top, Bottom, Left, Right)
    # Trên & Dưới
    for z_sign in [-1, 1]:
        z_pos = z_sign * (frame_h / 2 - rim_w / 2)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -depth / 2, z_pos))
        bar = bpy.context.active_object
        bar.scale = (frame_w, depth, rim_w)
        bar.data.materials.append(mat_gold)

    # Trái & Phải
    for x_sign in [-1, 1]:
        x_pos = x_sign * (frame_w / 2 - rim_w / 2)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x_pos, -depth / 2, 0))
        bar = bpy.context.active_object
        bar.scale = (rim_w, depth, frame_h - rim_w * 2)
        bar.data.materials.append(mat_gold)

    # 2. Đường phào chỉ sơn mài son thẫm bên trong (Inner trim)
    inner_t = 0.06
    inner_depth = depth * 0.85
    for z_sign in [-1, 1]:
        z_pos = z_sign * (frame_h / 2 - rim_w - inner_t / 2)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -inner_depth / 2, z_pos))
        bar = bpy.context.active_object
        bar.scale = (frame_w - rim_w * 2, inner_depth, inner_t)
        bar.data.materials.append(mat_lacquer)

    for x_sign in [-1, 1]:
        x_pos = x_sign * (frame_w / 2 - rim_w - inner_t / 2)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x_pos, -inner_depth / 2, 0))
        bar = bpy.context.active_object
        bar.scale = (inner_t, inner_depth, frame_h - (rim_w + inner_t) * 2)
        bar.data.materials.append(mat_lacquer)

    # 3. 4 Góc hoa văn cánh sen hồi văn dát vàng (Rosettes góc phẳng)
    for cx in [-1, 1]:
        for cz in [-1, 1]:
            x_pos = cx * (frame_w / 2 - rim_w / 2)
            z_pos = cz * (frame_h / 2 - rim_w / 2)
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.10, depth=depth + 0.015, location=(x_pos, -depth / 2 - 0.005, z_pos))
            rosette = bpy.context.active_object
            rosette.rotation_euler = (math.pi / 2, 0, 0)
            rosette.data.materials.append(mat_gold)

    export_glb("wall_lacquer_frame_3d.glb")

# =============================================================================
# 2. VÁCH BÌNH PHONG SONG GỖ CHỮ THỌ (wall_lattice_screen_3d.glb)
# Chuẩn trục Blender: X = Rộng (1.6m), Z = Cao (4.2m), Y = Chiều sâu/Dày (0.05m)
# Khi xuất sang glTF/Three.js: X = Rộng (1.6m), Y = Cao (4.2m), Z = Chiều sâu (0.05m)
# =============================================================================
def build_wall_lattice_screen():
    clear_scene()
    mat_wood = create_pbr_material("CarvedRosewood", (0.35, 0.12, 0.06, 1.0), metallic=0.18, roughness=0.32)
    mat_gold = create_pbr_material("LatticeGold", (0.96, 0.82, 0.20, 1.0), metallic=0.90, roughness=0.20, emission_color=(0.25, 0.18, 0.02, 1.0), emission_strength=0.20)

    screen_w = 1.60
    screen_h = 4.20
    frame_t = 0.09
    depth = 0.05  # Chỉ dày 5cm, phẳng áp sát tường

    # 1. Khung bao gỗ lim xung quanh
    # Trên & Dưới
    for z_sign in [-1, 1]:
        z_pos = z_sign * (screen_h / 2 - frame_t / 2)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -depth / 2, z_pos))
        bar = bpy.context.active_object
        bar.scale = (screen_w, depth, frame_t)
        bar.data.materials.append(mat_wood)

    # Trái & Phải
    for x_sign in [-1, 1]:
        x_pos = x_sign * (screen_w / 2 - frame_t / 2)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x_pos, -depth / 2, 0))
        bar = bpy.context.active_object
        bar.scale = (frame_t, depth, screen_h - frame_t * 2)
        bar.data.materials.append(mat_wood)

    # 2. Hệ nan song gỗ đứng (Vertical lattice bars chạy dọc Z)
    v_bars = 7
    inner_w = screen_w - frame_t * 2
    inner_h = screen_h - frame_t * 2
    v_spacing = inner_w / (v_bars + 1)
    for i in range(v_bars):
        x_pos = -inner_w / 2 + (i + 1) * v_spacing
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x_pos, -depth / 2, 0))
        bar = bpy.context.active_object
        bar.scale = (0.028, depth * 0.75, inner_h)
        bar.data.materials.append(mat_wood)

    # 3. Hệ nan song gỗ ngang (Horizontal crossbars chạy ngang X)
    h_bars = 15
    h_spacing = inner_h / (h_bars + 1)
    for i in range(h_bars):
        z_pos = -inner_h / 2 + (i + 1) * h_spacing
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -depth / 2, z_pos))
        bar = bpy.context.active_object
        bar.scale = (inner_w, depth * 0.75, 0.028)
        bar.data.materials.append(mat_wood)

    # 4. Phù điêu chữ Thọ tròn trung tâm dát vàng (nằm trong mặt phẳng XZ)
    medallion_z = 0.0
    # Vòng tròn viền ngoài
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.42, depth=depth + 0.015, location=(0, -depth / 2 - 0.005, medallion_z))
    ring_outer = bpy.context.active_object
    ring_outer.rotation_euler = (math.pi / 2, 0, 0)
    ring_outer.data.materials.append(mat_gold)

    # Lõi gỗ
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.36, depth=depth + 0.02, location=(0, -depth / 2 - 0.008, medallion_z))
    ring_inner = bpy.context.active_object
    ring_inner.rotation_euler = (math.pi / 2, 0, 0)
    ring_inner.data.materials.append(mat_wood)

    # Họa tiết chữ Thọ hình học đan chéo thếp vàng
    for angle_deg in [0, 45, 90, 135]:
        rad = math.radians(angle_deg)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -depth / 2 - 0.015, medallion_z))
        bar = bpy.context.active_object
        bar.rotation_euler = (0, rad, 0)
        bar.scale = (0.56, depth * 0.4, 0.038)
        bar.data.materials.append(mat_gold)

    # Vòng tròn tâm
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.12, depth=depth + 0.025, location=(0, -depth / 2 - 0.015, medallion_z))
    hub = bpy.context.active_object
    hub.rotation_euler = (math.pi / 2, 0, 0)
    hub.data.materials.append(mat_gold)

    export_glb("wall_lattice_screen_3d.glb")

# =============================================================================
# 3. PHÙ ĐIÊU MẶT NGUYỆT TRỐNG ĐỒNG ĐẮP NỔI (wall_dong_son_medallion.glb)
# Chuẩn trục Blender: X = Rộng (2.2m), Z = Cao (2.2m), Y = Chiều sâu/Dày (0.06m)
# Khi xuất sang glTF/Three.js: X = Rộng (2.2m), Y = Cao (2.2m), Z = Chiều sâu (0.06m)
# =============================================================================
def build_wall_dong_son_medallion():
    clear_scene()
    mat_bronze = create_pbr_material("BronzeMedallion", (0.86, 0.65, 0.18, 1.0), metallic=0.88, roughness=0.24, emission_color=(0.20, 0.14, 0.02, 1.0), emission_strength=0.15)
    mat_dark = create_pbr_material("DarkBronzeRelief", (0.32, 0.20, 0.10, 1.0), metallic=0.75, roughness=0.40)

    depth = 0.06
    radius = 1.10

    # 1. Đĩa mặt nguyệt đế lồi (nằm trong mặt phẳng XZ)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=(0, -depth / 2, 0))
    base_disk = bpy.context.active_object
    base_disk.rotation_euler = (math.pi / 2, 0, 0)
    base_disk.data.materials.append(mat_dark)

    # 2. Vành gờ bậc thang giật cấp ngoài cùng thếp vàng
    bpy.ops.mesh.primitive_torus_add(major_radius=radius * 0.94, minor_radius=0.035, major_segments=48, minor_segments=12, location=(0, -depth - 0.005, 0))
    rim = bpy.context.active_object
    rim.rotation_euler = (math.pi / 2, 0, 0)
    rim.data.materials.append(mat_bronze)

    # 3. Vành 14 chim Lạc bay ngược chiều kim đồng hồ (trong mặt phẳng XZ)
    bird_count = 14
    for i in range(bird_count):
        a = (i / bird_count) * math.pi * 2
        px = math.cos(a) * (radius * 0.74)
        pz = math.sin(a) * (radius * 0.74)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.08, radius2=0.015, depth=0.18, location=(px, -depth - 0.01, pz))
        bird = bpy.context.active_object
        bird.scale = (0.5, 0.35, 1.1)
        bird.rotation_euler = (0, -a + math.pi / 2, 0)
        bird.data.materials.append(mat_bronze)

    # 4. Vành hoa văn răng cưa thứ hai
    bpy.ops.mesh.primitive_torus_add(major_radius=radius * 0.52, minor_radius=0.025, major_segments=40, minor_segments=10, location=(0, -depth - 0.01, 0))
    mid_ring = bpy.context.active_object
    mid_ring.rotation_euler = (math.pi / 2, 0, 0)
    mid_ring.data.materials.append(mat_bronze)

    # 5. Ngôi sao 14 cánh mặt trời Đông Sơn đắp nổi ở tâm (trong mặt phẳng XZ)
    star_points = 14
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.20, depth=depth + 0.02, location=(0, -depth / 2 - 0.01, 0))
    sun_hub = bpy.context.active_object
    sun_hub.rotation_euler = (math.pi / 2, 0, 0)
    sun_hub.data.materials.append(mat_bronze)

    for i in range(star_points):
        a = (i / star_points) * math.pi * 2
        px = math.cos(a) * 0.34
        pz = math.sin(a) * 0.34
        bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.055, radius2=0.01, depth=0.26, location=(px, -depth - 0.015, pz))
        ray = bpy.context.active_object
        ray.scale = (0.7, 0.35, 0.9)
        ray.rotation_euler = (0, -a + math.pi / 2, 0)
        ray.data.materials.append(mat_bronze)

    export_glb("wall_dong_son_medallion.glb")

if __name__ == "__main__":
    build_wall_lacquer_frame()
    build_wall_lattice_screen()
    build_wall_dong_son_medallion()
