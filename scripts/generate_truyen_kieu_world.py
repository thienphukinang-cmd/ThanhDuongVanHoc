import bpy
import bmesh
import math
import os
import shutil

# ==============================================================================
# 1. DỌN SẠCH SCENE MẶC ĐỊNH CỦA BLENDER
# ==============================================================================
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def create_pbr_mat(name, base_color, roughness=0.5, metallic=0.0, emission_color=None, emission_strength=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission_color and emission_strength > 0:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = (*emission_color, 1.0)
                bsdf.inputs["Emission Strength"].default_value = emission_strength
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = (*emission_color, 1.0)
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            if hasattr(mat, 'blend_method'):
                mat.blend_method = 'BLEND'
    return mat

# Bảng vật liệu PBR Á Đông
mat_grass      = create_pbr_mat("Mat_CoNonThanhMinh", (0.12, 0.38, 0.16), roughness=0.85)
mat_stone_path = create_pbr_mat("Mat_DaXanhCo", (0.32, 0.35, 0.38), roughness=0.75)
mat_moss_stone = create_pbr_mat("Mat_MoDamTien", (0.22, 0.28, 0.22), roughness=0.9)
mat_wood_dark  = create_pbr_mat("Mat_GoLimCo", (0.22, 0.10, 0.05), roughness=0.35)
mat_wood_red   = create_pbr_mat("Mat_GoSonMai", (0.45, 0.12, 0.08), roughness=0.25)
mat_roof_tile  = create_pbr_mat("Mat_NgoiAmDuong", (0.15, 0.18, 0.24), roughness=0.45)
mat_gold       = create_pbr_mat("Mat_VangKimThoa", (0.95, 0.75, 0.22), roughness=0.18, metallic=0.9, emission_color=(0.4, 0.25, 0.05), emission_strength=0.4)
mat_pear_white = create_pbr_mat("Mat_HoaLeTrang", (0.96, 0.97, 1.0), roughness=0.3, emission_color=(0.85, 0.9, 1.0), emission_strength=0.6)
mat_peach_pink = create_pbr_mat("Mat_HoaDaoVuonThuy", (1.0, 0.48, 0.62), roughness=0.35, emission_color=(0.8, 0.25, 0.4), emission_strength=0.5)
mat_lotus_pink = create_pbr_mat("Mat_HoaSenDoanVien", (0.98, 0.55, 0.72), roughness=0.3, emission_color=(0.7, 0.2, 0.4), emission_strength=0.5)
mat_sail_cloth = create_pbr_mat("Mat_CanhBuomXa", (0.85, 0.78, 0.65), roughness=0.7)
mat_bronze     = create_pbr_mat("Mat_ChuongDong", (0.42, 0.32, 0.18), roughness=0.3, metallic=0.8)

def assign_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)

# ==============================================================================
# HÀM TIỆN ÍCH DỰNG KIẾN TRÚC CỔ TRUYỀN
# ==============================================================================
def create_oriental_pavilion(name, location, radius=4.0, height=3.8, tiers=1, roof_mat=mat_roof_tile):
    """Dựng Lầu / Đình cổ truyền có cột gỗ lim và mái đao cong"""
    pav_col = bpy.data.objects.new(name, None)
    scene.collection.objects.link(pav_col)
    pav_col.location = location

    # Bệ đá tam cấp
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius * 1.15, depth=0.45, location=(0, 0, 0.225))
    base = bpy.context.active_object
    base.name = f"{name}_Base"
    assign_mat(base, mat_stone_path)
    base.parent = pav_col

    # 6 Cột gỗ lim
    num_cols = 6
    col_r = radius * 0.82
    for i in range(num_cols):
        ang = (i / num_cols) * math.pi * 2
        cx = math.cos(ang) * col_r
        cy = math.sin(ang) * col_r
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.16, depth=height, location=(cx, cy, 0.45 + height / 2))
        col = bpy.context.active_object
        col.name = f"{name}_Col_{i}"
        assign_mat(col, mat_wood_red)
        col.parent = pav_col

    # Mái đao cong nhiều tầng
    for t in range(tiers):
        tz = 0.45 + height + t * 1.65
        tr = radius * (1.28 - t * 0.25)
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=tr, radius2=0.15, depth=1.6, location=(0, 0, tz + 0.8))
        roof = bpy.context.active_object
        roof.name = f"{name}_Roof_{t}"
        assign_mat(roof, roof_mat)
        roof.parent = pav_col

    # Hồ lô vàng trên đỉnh mái
    top_z = 0.45 + height + (tiers - 1) * 1.65 + 1.75
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.24, location=(0, 0, top_z))
    finial = bpy.context.active_object
    assign_mat(finial, mat_gold)
    finial.parent = pav_col

    return pav_col

def create_blossom_tree(name, location, blossom_mat, scale=1.0):
    """Dựng cây cổ thụ (Lê trắng hoặc Đào hồng)"""
    tree_root = bpy.data.objects.new(name, None)
    scene.collection.objects.link(tree_root)
    tree_root.location = location

    # Thân cây uốn lượn nhẹ
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.35 * scale, radius2=0.12 * scale, depth=3.2 * scale, location=(0, 0, 1.6 * scale))
    trunk = bpy.context.active_object
    trunk.rotation_euler = (0.08, -0.06, 0.2)
    assign_mat(trunk, mat_wood_dark)
    trunk.parent = tree_root

    # Các chùm tán hoa
    offsets = [
        (0, 0, 3.3), (-0.9, 0.6, 2.8), (0.95, -0.5, 2.9),
        (0.6, 0.85, 3.1), (-0.75, -0.7, 2.7), (0, 0.9, 3.5)
    ]
    for idx, (ox, oy, oz) in enumerate(offsets):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.85 * scale, location=(ox * scale, oy * scale, oz * scale))
        canopy = bpy.context.active_object
        canopy.scale = (1.15, 1.15, 0.68)
        assign_mat(canopy, blossom_mat)
        canopy.parent = tree_root

    return tree_root

# ==============================================================================
# PHÂN CẢNH 1 (TRUNG TÂM & BẮC): TIẾT THANH MINH & NẤM MỘ ĐẠM TIÊN
# "Cỏ non xanh tận chân trời - Cành lê trắng điểm một vài bông hoa"
# ==============================================================================
# 1. Đồi cỏ non trung tâm (Bán kính 18m)
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=18.0, depth=0.6, location=(0, 0, -0.3))
meadow_center = bpy.context.active_object
meadow_center.name = "Zone1_DoiCoThanhMinh"
assign_mat(meadow_center, mat_grass)

# 2. Nhịp cầu gỗ cong bắc qua suối nhỏ dẫn tới mộ Đạm Tiên
for i in range(13):
    t = (i - 6) / 6.0  # -1 đến 1
    by = 10.0 + i * 0.9
    bz = math.cos(t * math.pi * 0.5) * 1.15
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, by, bz))
    plank = bpy.context.active_object
    plank.scale = (2.8, 0.42, 0.12)
    assign_mat(plank, mat_wood_red)

# 3. Gò đất & Nấm mộ Đạm Tiên rêu phong + Bia đá cổ + Lư hương
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=7.5, location=(0, 26.0, -1.2))
mound = bpy.context.active_object
mound.scale = (1.2, 1.2, 0.35)
mound.name = "Zone1_GoDatDamTien"
assign_mat(mound, mat_grass)

# Nấm mộ đá rêu phong
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1.8, location=(0, 27.5, 0.2))
tomb = bpy.context.active_object
tomb.scale = (1.0, 1.35, 0.65)
tomb.name = "Zone1_NamMoDamTien"
assign_mat(tomb, mat_moss_stone)

# Bia đá khắc tên Đạm Tiên
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 25.4, 0.85))
stele = bpy.context.active_object
stele.scale = (0.85, 0.18, 1.55)
stele.name = "Zone1_BiaDaDamTien"
assign_mat(stele, mat_stone_path)

# Lư hương đồng trước mộ
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.32, depth=0.45, location=(0, 24.4, 0.25))
burner = bpy.context.active_object
burner.name = "Zone1_LuHuongDamTien"
assign_mat(burner, mat_bronze)

# Hàng cây lê hoa trắng điểm xuyết quanh đồi Thanh Minh
create_blossom_tree("Zone1_CayLeTrang_01", (-5.5, 6.0, 0), mat_pear_white, scale=1.15)
create_blossom_tree("Zone1_CayLeTrang_02", (5.8, 7.5, 0), mat_pear_white, scale=1.05)
create_blossom_tree("Zone1_CayLeTrang_03", (-3.8, 26.5, 0.1), mat_pear_white, scale=1.25)
create_blossom_tree("Zone1_CayLeTrang_04", (4.2, 27.0, 0.1), mat_pear_white, scale=1.1)

# ==============================================================================
# PHÂN CẢNH 2 (PHÍA ĐÔNG - X = +24): VƯỜN THÚY & ĐÊM THỀ NGUYỀN KIM - KIỀU
# ==============================================================================
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=11.0, depth=0.5, location=(24.0, 0, -0.25))
zone2_island = bpy.context.active_object
zone2_island.name = "Zone2_DaoVuonThuy"
assign_mat(zone2_island, mat_grass)

# Đường đá nối từ Đồi Thanh Minh sang Vườn Thúy
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(14.5, 0, 0.05))
path_east = bpy.context.active_object
path_east.scale = (9.5, 2.6, 0.15)
assign_mat(path_east, mat_stone_path)

# Lầu Vọng Nguyệt Thề Nguyền
create_oriental_pavilion("Zone2_LauTheNguyen", (24.0, 0, 0), radius=4.2, height=3.6, tiers=1, roof_mat=mat_roof_tile)

# Bàn đá tròn + Đôi chén rượu thề + Chiếc Kim Thoa vàng lấp lánh
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1.1, depth=0.75, location=(24.0, 0, 0.82))
stone_table = bpy.context.active_object
assign_mat(stone_table, mat_stone_path)

# Chiếc Kim Thoa (Trâm vàng đính ước) đặt trên bàn
bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.04, radius2=0.005, depth=0.65, location=(24.0, -0.2, 1.25))
hairpin = bpy.context.active_object
hairpin.rotation_euler = (0, 1.35, 0.4)
hairpin.name = "Zone2_KimThoaVang"
assign_mat(hairpin, mat_gold)

# Cây đào hồng rực rỡ trong Vườn Thúy
create_blossom_tree("Zone2_CayDaoVuonThuy_01", (20.5, 5.2, 0), mat_peach_pink, scale=1.2)
create_blossom_tree("Zone2_CayDaoVuonThuy_02", (28.2, -4.8, 0), mat_peach_pink, scale=1.15)

# ==============================================================================
# PHÂN CẢNH 3 (PHÍA TÂY - X = -24): LẦU NGƯNG BÍCH & CỬA BỂ CHIỀU HÔM
# "Buồn trông cửa bể chiều hôm - Thuyền ai thấp thoáng cánh buồm xa xa"
# ==============================================================================
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=11.0, depth=0.8, location=(-24.0, 0, -0.2))
zone3_cliff = bpy.context.active_object
zone3_cliff.name = "Zone3_BoBienNgungBich"
assign_mat(zone3_cliff, mat_stone_path)

# Đường đá nối sang Lầu Ngưng Bích
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-14.5, 0, 0.05))
path_west = bpy.context.active_object
path_west.scale = (9.5, 2.6, 0.15)
assign_mat(path_west, mat_stone_path)

# Lầu Ngưng Bích 2 tầng mái cong uy nghi
create_oriental_pavilion("Zone3_LauNgungBich", (-24.0, 0, 0.2), radius=4.6, height=4.2, tiers=2, roof_mat=mat_roof_tile)

# Con thuyền buồm thấp thoáng phía xa ngoài khơi (X = -46)
boat_root = bpy.data.objects.new("Zone3_ThuyenBuomXa", None)
scene.collection.objects.link(boat_root)
boat_root.location = (-46.0, 6.0, -0.1)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.3))
hull = bpy.context.active_object
hull.scale = (1.6, 4.8, 0.6)
assign_mat(hull, mat_wood_dark)
hull.parent = boat_root

bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 2.8))
sail = bpy.context.active_object
sail.scale = (0.2, 3.2, 4.2)
sail.rotation_euler = (0, math.pi / 2, 0.15)
assign_mat(sail, mat_sail_cloth)
sail.parent = boat_root

# ==============================================================================
# PHÂN CẢNH 4 (PHÍA NAM - Y = -26): SÔNG TIỀN ĐƯỜNG & AM GIÁC DUYÊN (ĐOÀN VIÊN)
# ==============================================================================
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=12.0, depth=0.5, location=(0, -26.0, -0.25))
zone4_island = bpy.context.active_object
zone4_island.name = "Zone4_DaoAmGiacDuyen"
assign_mat(zone4_island, mat_grass)

# Cầu đá qua sông Tiền Đường nối xuống Am Giác Duyên
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -16.0, 0.08))
path_south = bpy.context.active_object
path_south.scale = (2.8, 10.0, 0.18)
assign_mat(path_south, mat_stone_path)

# Am Giác Duyên thanh tịnh
create_oriental_pavilion("Zone4_AmGiacDuyen", (0, -26.0, 0), radius=4.5, height=3.8, tiers=1, roof_mat=mat_wood_dark)

# Đại Hồng Chung (Chuông đồng chùa Giác Duyên)
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.65, radius2=0.38, depth=1.35, location=(0, -26.0, 2.1))
bell = bpy.context.active_object
bell.name = "Zone4_ChuongDongGiacDuyen"
assign_mat(bell, mat_bronze)

# Hoa sen nở rộ quanh hồ nước Tiền Đường
lotus_coords = [(-4.5, -14.0), (4.8, -15.5), (-6.2, -19.0), (5.5, -20.0), (-3.5, -12.0), (3.8, -12.5)]
for idx, (lx, ly) in enumerate(lotus_coords):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.95, depth=0.04, location=(lx, ly, 0.02))
    pad = bpy.context.active_object
    assign_mat(pad, mat_grass)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.35, location=(lx, ly, 0.22))
    bloom = bpy.context.active_object
    assign_mat(bloom, mat_lotus_pink)

# ==============================================================================
# XUẤT FILE GLB CHUẨN CHO THREE.JS
# ==============================================================================
script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)
output_dir = os.path.join(project_dir, "public", "models")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "truyen_kieu_world.glb")

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True
)
print(f"[BLENDER SUCCESS] Đã xuất Thế giới Truyện Kiều 4 phân cảnh tại: {output_path}")

# Đồng thời sao lưu vào public/assets/models/ nếu thư mục đó tồn tại
assets_models = os.path.join(project_dir, "public", "assets", "models")
if os.path.exists(assets_models):
    shutil.copy2(output_path, os.path.join(assets_models, "truyen_kieu_world.glb"))
    print(f"[BLENDER SUCCESS] Đã đồng bộ sang: {assets_models}")
