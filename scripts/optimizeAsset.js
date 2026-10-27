/**
 * ASSET OPTIMIZER SCRIPT (BLENDER HEADLESS ENGINE)
 * Technical Director & Lead Architect
 * 
 * Quy trình tối ưu hóa asset 3D bằng Blender CLI:
 * 1. Đọc biến môi trường BLENDER_PATH từ .env
 * 2. Khởi chạy Blender ở chế độ không đồ họa (Headless / Background mode: blender -b -P script.py)
 * 3. Đặt lại tâm vật lý (Origin to Bottom Center): Đảm bảo đáy của bàn/đàn nằm chuẩn ở tọa độ Y=0 (chống lún sàn)
 * 4. Chuẩn hóa tỷ lệ (Scale):
 *    - an_thu.glb: Ép chiều rộng đúng 1.5m
 *    - dan_ty_ba.glb: Ép chiều dài đúng 1.0m
 * 5. Áp dụng các thay đổi (Apply Transform) và xuất đè lại file .glb gốc
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tìm thư mục gốc dự án
export function findProjectRoot() {
  let curr = __dirname;
  while (curr && curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'package.json')) || fs.existsSync(path.join(curr, 'vite.config.js'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  const fallback = 'D:\\BaoTang3D\\BaoTangVanHoc_TheNewEra';
  return fs.existsSync(fallback) ? fallback : process.cwd();
}

export const PROJECT_ROOT = findProjectRoot();

// Đọc file .env
export function loadEnv() {
  const envPaths = [
    path.join(PROJECT_ROOT, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
    'D:\\BaoTang3D\\.env',
    'D:\\BaoTang3D\\BaoTangVanHoc_TheNewEra\\.env'
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1].trim();
            let value = (match[2] || '').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      } catch (err) {
        console.warn(`[WARN] Không thể đọc file .env tại ${envPath}:`, err.message);
      }
    }
  }
}

loadEnv();

// Tìm kiếm executable Blender
export function resolveBlenderExecutable() {
  const candidates = [
    process.env.BLENDER_PATH,
    'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
    'blender'
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === 'blender') {
      try {
        const res = spawnSync('blender', ['--version'], { encoding: 'utf8', shell: true });
        if (res.status === 0) return 'blender';
      } catch {
        continue;
      }
    } else if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Sinh script Python tối ưu hóa và chuẩn hóa kích thước cho Blender
 */
export function generateBlenderPythonScript(inputFile, outputFile, options = {}) {
  const normalizedInput = inputFile.replace(/\\/g, '/');
  const normalizedOutput = outputFile.replace(/\\/g, '/');
  const targetWidth = options.targetWidth || 0;
  const targetLength = options.targetLength || 0;
  const decimateRatio = options.decimateRatio || 1.0;

  return `
import bpy
import sys
import mathutils

print("[BLENDER OPTIMIZER] Khởi tạo môi trường Headless Blender...")

# 1. Làm sạch scene
bpy.ops.wm.read_factory_settings(use_empty=True)

input_path = "${normalizedInput}"
output_path = "${normalizedOutput}"
target_width = ${targetWidth}
target_length = ${targetLength}
decimate_ratio = ${decimateRatio}

print(f"[BLENDER OPTIMIZER] Đang nạp GLB: {input_path}")
try:
    bpy.ops.import_scene.gltf(filepath=input_path)
except Exception as e:
    print(f"[ERROR] Không thể import GLB: {e}", file=sys.stderr)
    sys.exit(1)

mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not mesh_objs:
    print("[ERROR] Không tìm thấy đối tượng Mesh nào trong file!", file=sys.stderr)
    sys.exit(1)

print(f"[BLENDER OPTIMIZER] Tìm thấy {len(mesh_objs)} mesh objects")

# Chọn tất cả các mesh và gom (join) nếu có nhiều mesh để xử lý đồng nhất
bpy.ops.object.select_all(action='DESELECT')
for obj in mesh_objs:
    obj.select_set(True)
bpy.context.view_layer.objects.active = mesh_objs[0]

if len(mesh_objs) > 1:
    print("[BLENDER OPTIMIZER] Gộp các mesh con thành một khối thống nhất (giữ nguyên vật liệu)...")
    bpy.ops.object.join()

active_obj = bpy.context.view_layer.objects.active

# Áp dụng transform ban đầu
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Gộp các đỉnh quá gần & đồng nhất pháp tuyến normals
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0005)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')

# Tính toán Bounding Box hiện tại
bbox = [active_obj.matrix_world @ mathutils.Vector(corner) for corner in active_obj.bound_box]
min_x = min(c.x for c in bbox)
max_x = max(c.x for c in bbox)
min_y = min(c.y for c in bbox)
max_y = max(c.y for c in bbox)
min_z = min(c.z for c in bbox)
max_z = max(c.z for c in bbox)

size_x = max_x - min_x
size_y = max_y - min_y
size_z = max_z - min_z

print(f"[BLENDER OPTIMIZER] Kích thước gốc: Rộng(X)={size_x:.3f}m, Sâu(Y)={size_y:.3f}m, Cao(Z)={size_z:.3f}m")

# 2. Chuẩn hóa tỷ lệ (Scale):
scale_factor = 1.0
if target_width > 0:
    # Ép an_thu.glb về chiều rộng đúng 1.5m (trục X)
    scale_factor = target_width / max(size_x, 0.001)
    print(f"[BLENDER OPTIMIZER] Ép chiều rộng về {target_width}m (Scale Factor: {scale_factor:.4f})")
elif target_length > 0:
    # Ép dan_ty_ba.glb về chiều dài đúng 1.0m (chiều lớn nhất trong không gian)
    max_dim = max(size_x, size_y, size_z)
    scale_factor = target_length / max(max_dim, 0.001)
    print(f"[BLENDER OPTIMIZER] Ép chiều dài về {target_length}m (Scale Factor: {scale_factor:.4f})")

if abs(scale_factor - 1.0) > 0.0001:
    active_obj.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# 3. Đặt lại tâm vật lý (Origin to Bottom Center):
# Đảm bảo đáy của bàn/đàn nằm chuẩn ở tọa độ Y=0 (chống lún sàn trong Three.js)
bbox_new = [active_obj.matrix_world @ mathutils.Vector(corner) for corner in active_obj.bound_box]
new_min_x = min(c.x for c in bbox_new)
new_max_x = max(c.x for c in bbox_new)
new_min_y = min(c.y for c in bbox_new)
new_max_y = max(c.y for c in bbox_new)
new_min_z = min(c.z for c in bbox_new)
new_max_z = max(c.z for c in bbox_new)

# Trong Blender: Z là trục đứng (khi export glTF yup=True sẽ thành Y trong Three.js)
# Tâm X = (min_x + max_x) / 2
# Tâm Y = (min_y + max_y) / 2
# Đáy Z = new_min_z
bpy.context.scene.cursor.location = mathutils.Vector((
    (new_min_x + new_max_x) / 2.0,
    (new_min_y + new_max_y) / 2.0,
    new_min_z
))
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# Đưa đối tượng về gốc tọa độ thế giới (0, 0, 0)
active_obj.location = (0, 0, 0)
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

# 4. Decimate nếu cần tối ưu polygon
if decimate_ratio < 0.99 and len(active_obj.data.polygons) > 200:
    mod = active_obj.modifiers.new(name="Auto_Decimate", type='DECIMATE')
    mod.ratio = decimate_ratio
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)

# Dọn dẹp block rác
for block in bpy.data.meshes:
    if block.users == 0:
        bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0:
        bpy.data.materials.remove(block)

# 5. Xuất đè lại file GLB
print(f"[BLENDER OPTIMIZER] Xuất file GLB tối ưu về: {output_path}")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_apply=True,
    export_yup=True
)
print("[BLENDER OPTIMIZER SUCCESS] Hoàn tất tối ưu hóa Blender 100%!")
`;
}

/**
 * Hàm thực thi tối ưu hóa mô hình bằng Blender Headless
 */
export async function optimizeModelWithBlender(targetFile, options = {}) {
  const blenderExe = resolveBlenderExecutable();
  if (!blenderExe) {
    throw new Error("Không tìm thấy Blender Executable. Vui lòng kiểm tra BLENDER_PATH trong file .env!");
  }

  if (!fs.existsSync(targetFile)) {
    throw new Error(`File không tồn tại: ${targetFile}`);
  }

  const origSizeKB = (fs.statSync(targetFile).size / 1024).toFixed(1);
  console.log(`[BLENDER PROCESS] Bắt đầu gọt tỉa mô hình: ${path.basename(targetFile)} (${origSizeKB} KB)...`);
  console.log(`- Blender Path: ${blenderExe}`);

  const tempPyScript = path.join(PROJECT_ROOT, `temp_optimize_${Date.now()}.py`);
  const pyCode = generateBlenderPythonScript(targetFile, targetFile, options);

  try {
    fs.writeFileSync(tempPyScript, pyCode, 'utf8');
    const result = spawnSync(blenderExe, ['-b', '-P', tempPyScript], {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
      windowsHide: true
    });

    if (result.status !== 0) {
      console.error("[BLENDER STDERR]", result.stderr || result.stdout);
      throw new Error(`Blender thoát với mã lỗi: ${result.status}`);
    }

    const newSizeKB = (fs.statSync(targetFile).size / 1024).toFixed(1);
    console.log(`%c✓ [BLENDER TỐI ƯU THÀNH CÔNG] ${path.basename(targetFile)} -> Kích thước mới: ${newSizeKB} KB`, "color: #39e58c; font-weight: bold;");
    return true;
  } finally {
    if (fs.existsSync(tempPyScript)) {
      try { fs.unlinkSync(tempPyScript); } catch {}
    }
  }
}

// Xử lý khi chạy script trực tiếp từ CLI
if (process.argv[1] && process.argv[1].endsWith('optimizeAsset.js')) {
  const args = process.argv.slice(2);
  let targetFile = args[0] || path.resolve(PROJECT_ROOT, 'public/assets/models/rooms/kieu/an_thu.glb');
  let targetWidth = 0;
  let targetLength = 0;

  if (targetFile.includes('an_thu')) targetWidth = 1.5;
  if (targetFile.includes('dan_ty_ba')) targetLength = 1.0;

  optimizeModelWithBlender(targetFile, { targetWidth, targetLength })
    .then(() => console.log("[DONE] Tối ưu hóa hoàn tất."))
    .catch(err => console.error("[ERROR]", err.message));
}
