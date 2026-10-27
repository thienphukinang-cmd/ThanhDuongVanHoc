import bpy
import math
import random
import os
import shutil
from mathutils import Vector, Euler

# ==========================================
# 1. DỌN DẸP SẠCH SCENE CŨ
# ==========================================
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

for col in [bpy.data.meshes, bpy.data.materials, bpy.data.textures, bpy.data.lights, bpy.data.cameras]:
    for block in col:
        if block.users == 0:
            col.remove(block)

# ==========================================
# 2. HỆ THỐNG BẦU TRỜI & ÁNH SÁNG HÒA DỊU
# ==========================================
scene = bpy.context.scene
try:
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
except:
    pass

# Tạo World Shader với bầu trời vật lý Hosek-Wilkie ấm áp
world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
wnodes = world.node_tree.nodes
wlinks = world.node_tree.links
wnodes.clear()

node_bg = wnodes.new(type='ShaderNodeBackground')
node_out = wnodes.new(type='ShaderNodeOutputWorld')
node_sky = wnodes.new(type='ShaderNodeTexSky')
node_sky.sky_type = 'HOSEK_WILKIE'
node_sky.sun_elevation = math.radians(14) # Nắng chiều tà dịu nhẹ
node_sky.sun_rotation = math.radians(45)
node_bg.inputs['Strength'].default_value = 0.65

wlinks.new(node_sky.outputs['Color'], node_bg.inputs['Color'])
wlinks.new(node_bg.outputs['Background'], node_out.inputs['Surface'])

# Đèn Mặt Trời chính (Key Light) bóng đổ cực mềm
bpy.ops.object.light_add(type='SUN', location=(15, -15, 12))
sun = bpy.context.active_object
sun.name = "Sun_ThanhMinh"
sun.data.energy = 3.2
sun.data.color = (1.0, 0.82, 0.62)
sun.data.angle = math.radians(8.0)
sun.rotation_euler = (math.radians(72), math.radians(10), math.radians(42))

# Đèn phụ trợ (Fill Light) làm dịu vùng tối
bpy.ops.object.light_add(type='SUN', location=(-12, 12, 15))
fill = bpy.context.active_object
fill.name = "Fill_SkyLight"
fill.data.energy = 0.7
fill.data.color = (0.65, 0.80, 1.0)
fill.rotation_euler = (math.radians(45), 0, math.radians(-135))

# ==========================================
# 3. THƯ VIỆN VẬT LIỆU PROCEDURAL TINH XẢO
# ==========================================
def build_ground_material():
    mat = bpy.data.materials.new(name="Mat_DatCoChiTiet")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.88

    coord = nodes.new('ShaderNodeTexCoord')
    noise_macro = nodes.new('ShaderNodeTexNoise')
    noise_macro.inputs['Scale'].default_value = 3.5
    noise_macro.inputs['Detail'].default_value = 10.0
    noise_macro.inputs['Roughness'].default_value = 0.65

    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (0.07, 0.18, 0.05, 1)
    e1 = ramp.color_ramp.elements.new(0.55)
    e1.color = (0.14, 0.34, 0.09, 1)
    ramp.color_ramp.elements[1].position = 0.8
    ramp.color_ramp.elements[1].color = (0.26, 0.45, 0.12, 1)

    noise_micro = nodes.new('ShaderNodeTexNoise')
    noise_micro.inputs['Scale'].default_value = 85.0
    noise_micro.inputs['Detail'].default_value = 15.0

    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.45
    bump.inputs['Distance'].default_value = 0.05

    links.new(coord.outputs['Object'], noise_macro.inputs['Vector'])
    links.new(noise_macro.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(coord.outputs['Object'], noise_micro.inputs['Vector'])
    links.new(noise_micro.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

def build_bark_material():
    mat = bpy.data.materials.new(name="Mat_VoCayCoThu")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.92

    coord = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (4.0, 4.0, 0.6)

    wave = nodes.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'Z'
    wave.inputs['Scale'].default_value = 6.0
    wave.inputs['Distortion'].default_value = 14.0
    wave.inputs['Detail'].default_value = 12.0

    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.06, 0.035, 0.02, 1)
    ramp.color_ramp.elements[1].color = (0.22, 0.14, 0.09, 1)

    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.85
    bump.inputs['Distance'].default_value = 0.04

    links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], wave.inputs['Vector'])
    links.new(wave.outputs['Color'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(wave.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

def build_foliage_material(name, c_dark, c_light):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.65
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = 0.35

    coord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 28.0
    noise.inputs['Detail'].default_value = 12.0

    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = c_dark
    ramp.color_ramp.elements[1].color = c_light

    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.55
    bump.inputs['Distance'].default_value = 0.03

    links.new(coord.outputs['Object'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

def build_water_material():
    mat = bpy.data.materials.new(name="Mat_NuocSuoiGợnSóng")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.03, 0.16, 0.18, 1)
    bsdf.inputs["Roughness"].default_value = 0.04
    bsdf.inputs["Metallic"].default_value = 0.15

    coord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 35.0
    noise.inputs['Detail'].default_value = 8.0

    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.12
    bump.inputs['Distance'].default_value = 0.01

    links.new(coord.outputs['Object'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

def build_stone_material():
    mat = bpy.data.materials.new(name="Mat_DaCoReuPhong")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.85

    coord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 12.0
    noise.inputs['Detail'].default_value = 15.0

    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.18, 0.22, 0.16, 1)
    ramp.color_ramp.elements[1].color = (0.42, 0.40, 0.37, 1)

    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.75

    links.new(coord.outputs['Object'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

mat_ground = build_ground_material()
mat_bark = build_bark_material()
mat_pear = build_foliage_material("Mat_HoaLeTrang", (0.75, 0.78, 0.82, 1), (0.98, 0.98, 1.0, 1))
mat_peach = build_foliage_material("Mat_HoaDaoXuan", (0.65, 0.22, 0.32, 1), (0.96, 0.58, 0.68, 1))
mat_leaf = build_foliage_material("Mat_LaXanh", (0.06, 0.22, 0.06, 1), (0.22, 0.46, 0.14, 1))
mat_water = build_water_material()
mat_stone = build_stone_material()
mat_wood_red = build_foliage_material("Mat_GoSonDo", (0.32, 0.05, 0.03, 1), (0.52, 0.10, 0.06, 1))

tex_disp = bpy.data.textures.new("Tex_OrganicDisplace", type='CLOUDS')
tex_disp.noise_scale = 0.45
tex_disp.noise_depth = 4

# ==========================================
# 4. ĐỊA HÌNH CHI TIẾT CAO & DÒNG SUỐI ĐÁ CUỘI
# ==========================================
def get_river_x(y):
    return 3.2 * math.sin(y * 0.16) + 0.7 * math.cos(y * 0.35)

def get_terrain_z(x, y):
    rx = get_river_x(y)
    dist = abs(x - rx)
    if dist < 2.3:
        return -0.65 * math.cos((dist / 2.3) * (math.pi / 2))
    else:
        macro = 0.75 * math.sin(x * 0.18) * math.cos(y * 0.18) + 0.35 * math.sin(x * 0.08 - y * 0.12)
        micro = 0.08 * math.sin(x * 1.7) * math.cos(y * 1.7) + 0.04 * math.sin(x * 3.5 + y * 2.8)
        blend = min(1.0, (dist - 2.3) / 2.5)
        return max(-0.05, (macro + micro) * blend)

bpy.ops.mesh.primitive_grid_add(x_subdivisions=150, y_subdivisions=150, size=42, location=(0, 0, 0))
ground = bpy.context.active_object
ground.name = "DiaHinh_ThanhMinh"
ground.data.materials.append(mat_ground)

for v in ground.data.vertices:
    v.co.z = get_terrain_z(v.co.x, v.co.y)
bpy.ops.object.shade_smooth()

bpy.ops.mesh.primitive_plane_add(size=42, location=(0, 0, -0.16))
water = bpy.context.active_object
water.name = "MatNuocSuoi"
water.data.materials.append(mat_water)

random.seed(42)
for i in range(45):
    ry = random.uniform(-18, 18)
    if abs(ry) < 1.8: continue
    side = random.choice([-1, 1])
    rx = get_river_x(ry) + side * random.uniform(1.8, 2.7)
    rz = get_terrain_z(rx, ry) - 0.05

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=random.uniform(0.18, 0.48), location=(rx, ry, rz))
    rock = bpy.context.active_object
    rock.scale = (random.uniform(0.8, 1.5), random.uniform(0.8, 1.4), random.uniform(0.4, 0.75))
    rock.rotation_euler = (random.uniform(0, 3), random.uniform(0, 3), random.uniform(0, 3))
    rock.data.materials.append(mat_stone)
    bpy.ops.object.shade_smooth()
    mod = rock.modifiers.new("RockDetail", 'DISPLACE')
    mod.texture = tex_disp
    mod.strength = 0.15

# ==========================================
# 5. CẦU GỖ CỔ TRANG
# ==========================================
bridge_cx = get_river_x(0)
bridge_len = 5.6
num_planks = 26
for i in range(num_planks):
    t = (i / (num_planks - 1)) - 0.5
    bx = bridge_cx + t * bridge_len
    bz = 0.8 * math.cos(t * math.pi) - 0.05
    ang = -math.atan(-0.8 * math.pi * math.sin(t * math.pi) / bridge_len)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, 0, bz))
    plank = bpy.context.active_object
    plank.scale = (0.11, 0.85, 0.035)
    plank.rotation_euler = (0, ang, random.uniform(-0.015, 0.015))
    plank.data.materials.append(mat_bark)
    bev = plank.modifiers.new("Bevel", 'BEVEL')
    bev.width = 0.01

    if i % 4 == 0 or i == num_planks - 1:
        for side in [-0.8, 0.8]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.6, location=(bx, side, bz + 0.3))
            post = bpy.context.active_object
            post.data.materials.append(mat_wood_red)

for side in [-0.8, 0.8]:
    for i in range(num_planks - 1):
        t1, t2 = (i / (num_planks - 1)) - 0.5, ((i + 1) / (num_planks - 1)) - 0.5
        x1, x2 = bridge_cx + t1 * bridge_len, bridge_cx + t2 * bridge_len
        z1, z2 = 0.8 * math.cos(t1 * math.pi) + 0.45, 0.8 * math.cos(t2 * math.pi) + 0.45
        cx, cz = (x1 + x2)/2, (z1 + z2)/2
        l = math.hypot(x2 - x1, z2 - z1)
        ang = math.atan2(z2 - z1, x2 - x1)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=l, location=(cx, side, cz))
        rail = bpy.context.active_object
        rail.rotation_euler = (0, math.pi/2 - ang, 0)
        rail.data.materials.append(mat_wood_red)

# ==========================================
# 6. MỘ ĐẠM TIÊN
# ==========================================
tx, ty = bridge_cx + 4.5, -4.5
tz = get_terrain_z(tx, ty)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=0.95, location=(tx, ty, tz + 0.1))
tomb = bpy.context.active_object
tomb.scale = (1.25, 0.95, 0.5)
tomb.data.materials.append(mat_ground)
bpy.ops.object.shade_smooth()
mod_t = tomb.modifiers.new("TombRough", 'DISPLACE')
mod_t.texture = tex_disp
mod_t.strength = 0.18

bpy.ops.mesh.primitive_cube_add(size=1, location=(tx - 0.85, ty, tz + 0.45))
stele = bpy.context.active_object
stele.scale = (0.1, 0.38, 0.55)
stele.rotation_euler = (0.05, -0.08, math.radians(18))
stele.data.materials.append(mat_stone)
bev_s = stele.modifiers.new("Bevel", 'BEVEL')
bev_s.width = 0.02

# ==========================================
# 7. CÂY CỔ THỤ PHÂN NHÁNH, CÓ RỄ & VỎ SẦN SÙI
# ==========================================
def create_detailed_ancient_tree(x, y, z, mat_canopy, scale=1.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.22*scale, depth=1.6*scale, location=(x, y, z + 0.75*scale))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_bark)
    for v in trunk.data.vertices:
        h_ratio = (v.co.z + 0.8*scale) / (1.6*scale)
        taper = 1.15 - 0.45 * h_ratio
        v.co.x = v.co.x * taper + 0.12 * math.sin(h_ratio * math.pi)
        v.co.y = v.co.y * taper + 0.08 * math.cos(h_ratio * math.pi)
    bpy.ops.object.shade_smooth()
    sub = trunk.modifiers.new("Subsurf", 'SUBSURF')
    sub.levels = 2
    disp = trunk.modifiers.new("BarkDisplace", 'DISPLACE')
    disp.texture = tex_disp
    disp.strength = 0.05 * scale

    top_x, top_y, top_z = x + 0.12, y - 0.08, z + 1.45*scale

    for r_idx in range(3):
        r_ang = r_idx * (2 * math.pi / 3) + random.uniform(-0.3, 0.3)
        rx = x + math.cos(r_ang) * 0.22 * scale
        ry = y + math.sin(r_ang) * 0.22 * scale
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.14*scale, radius2=0.04*scale, depth=0.6*scale, location=(rx, ry, z + 0.2*scale))
        root = bpy.context.active_object
        root.rotation_euler = (math.sin(r_ang)*0.6, -math.cos(r_ang)*0.6, 0)
        root.data.materials.append(mat_bark)
        bpy.ops.object.shade_smooth()

    num_branches = 3
    for b_idx in range(num_branches):
        b_ang = b_idx * (2 * math.pi / num_branches) + random.uniform(-0.4, 0.4)
        b_tilt = random.uniform(0.45, 0.75)
        b_len = random.uniform(1.0, 1.35) * scale

        dir_vec = Vector((math.sin(b_tilt)*math.cos(b_ang), math.sin(b_tilt)*math.sin(b_ang), math.cos(b_tilt)))
        b_center = Vector((top_x, top_y, top_z)) + dir_vec * (b_len * 0.45)
        b_tip = Vector((top_x, top_y, top_z)) + dir_vec * b_len

        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.13*scale, radius2=0.04*scale, depth=b_len, location=b_center)
        branch = bpy.context.active_object
        branch.rotation_euler = dir_vec.to_track_quat('Z', 'Y').to_euler()
        branch.data.materials.append(mat_bark)
        bpy.ops.object.shade_smooth()

        for c_idx in range(4):
            offset = Vector((random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4), random.uniform(-0.15, 0.25))) * scale
            c_rad = random.uniform(0.45, 0.75) * scale
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=c_rad, location=b_tip + offset)
            canopy = bpy.context.active_object
            canopy.scale = (1.15, 1.15, 0.68)
            canopy.data.materials.append(mat_canopy)
            bpy.ops.object.shade_smooth()
            c_disp = canopy.modifiers.new("FoliageCloud", 'DISPLACE')
            c_disp.texture = tex_disp
            c_disp.strength = 0.22 * scale

for i in range(24):
    tx = random.uniform(-15, 15)
    ty = random.uniform(-15, 15)
    if abs(tx - get_river_x(ty)) < 3.2: continue
    if math.hypot(tx - (bridge_cx + 4.5), ty - (-4.5)) < 2.8: continue

    tz = get_terrain_z(tx, ty)
    sc = random.uniform(0.8, 1.35)
    roll = random.random()
    if roll < 0.48:
        mat_c = mat_pear
    elif roll < 0.78:
        mat_c = mat_peach
    else:
        mat_c = mat_leaf
    create_detailed_ancient_tree(tx, ty, tz, mat_c, sc)

for i in range(60):
    gx = random.uniform(-14, 14)
    gy = random.uniform(-14, 14)
    if abs(gx - get_river_x(gy)) < 2.5: continue
    gz = get_terrain_z(gx, gy)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=random.uniform(0.12, 0.28), location=(gx, gy, gz + 0.05))
    shrub = bpy.context.active_object
    shrub.scale = (1.2, 1.2, 0.6)
    shrub.data.materials.append(mat_leaf if random.random() < 0.75 else mat_pear)
    bpy.ops.object.shade_smooth()
    s_disp = shrub.modifiers.new("ShrubDisp", 'DISPLACE')
    s_disp.texture = tex_disp
    s_disp.strength = 0.15

# ==========================================
# 8. CAMERA & HIỂN THỊ RENDERED
# ==========================================
bpy.ops.object.camera_add(location=(bridge_cx - 1.5, -11.5, 2.8), rotation=(math.radians(78), 0, math.radians(-8)))
cam = bpy.context.active_object
scene.camera = cam

if hasattr(bpy.context, 'screen') and bpy.context.screen:
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'RENDERED'
                    space.shading.use_scene_lights = True
                    space.shading.use_scene_world = True

# ==========================================
# 8.5. TỐI ƯU CỰC ĐOAN: DECIMATE GIẢM >= 50% ĐA GIÁC & GỘP MESH THEO VẬT LIỆU
# ==========================================
print("[OPTIMIZATION] Bắt đầu giảm 55% vertex (Decimate) và gộp toàn bộ mesh tĩnh...")

# 1. Áp dụng Decimate Modifier giảm 55% đa giác cho mọi mesh
for obj in list(bpy.data.objects):
    if obj.type == 'MESH' and len(obj.data.vertices) > 20:
        try:
            mod = obj.modifiers.new(name="Decimate_50Pct", type='DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = 0.45  # Giảm 55% số lượng vertex/đa giác nhưng giữ nguyên hình khối
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier="Decimate_50Pct")
        except Exception as e:
            pass

# 2. Gộp toàn bộ mesh có chung vật liệu thành 1 mesh duy nhất (Đá cuội, thân cây, hoa, địa hình)
mat_groups = {}
for obj in list(bpy.data.objects):
    if obj.type == 'MESH':
        mat_key = obj.data.materials[0].name if obj.data.materials else "DefaultMat"
        if mat_key not in mat_groups:
            mat_groups[mat_key] = []
        mat_groups[mat_key].append(obj)

for mat_name, objs in mat_groups.items():
    if len(objs) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        try:
            bpy.ops.object.join()
            objs[0].name = f"Unified_{mat_name}"
            print(f"[BLENDER JOIN] Đã gộp {len(objs)} vật thể vật liệu [{mat_name}] thành 1 khối duy nhất!")
        except Exception as e:
            print(f"Join error on {mat_name}: {e}")

print("Đã hoàn tất Decimate 55% và gộp khối toàn diện cho cảnh Tiết Thanh Minh!")

# ==========================================
# 9. XUẤT FILE GLB CHO THREE.JS
# ==========================================
script_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in locals() else os.getcwd()
project_dir = os.path.dirname(script_dir) if os.path.basename(script_dir) == 'scripts' else script_dir
output_dir = os.path.join(project_dir, "public", "models")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "thanh_minh_scene.glb")

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True
)
print(f"[BLENDER SUCCESS] Đã xuất mô hình Tiết Thanh Minh thành công tại: {output_path}")

# Đồng thời sao lưu vào dist/models và public/assets/models nếu thư mục tồn tại
for extra_dir in [os.path.join(project_dir, "dist", "models"), os.path.join(project_dir, "public", "assets", "models")]:
    if os.path.exists(os.path.dirname(extra_dir)):
        os.makedirs(extra_dir, exist_ok=True)
        try:
            shutil.copy2(output_path, os.path.join(extra_dir, "thanh_minh_scene.glb"))
            print(f"[BLENDER SUCCESS] Đã đồng bộ sang: {extra_dir}")
        except Exception as e:
            pass
