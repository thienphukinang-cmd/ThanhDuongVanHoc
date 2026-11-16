---
name: heritage-room-pipeline
description: Quy trình kỹ thuật 6 bước tự động hóa trọn gói để xóa sạch, tái thiết lập, sinh mô hình Blender Python (bpy), chuẩn hóa GLB Draco PBR, chống va chạm Box3, chiếu sáng Chiaroscuro 60+ FPS, tích hợp Lore 4 chương và tự kiểm thử E2E cho bất kỳ phòng triển lãm văn học 3D nào trong BaoTang3D.
---

# Sổ Tay Vận Hành: Heritage Room Pipeline (BaoTang3D)

Quy chuẩn kỹ thuật dành cho Kỹ sư trưởng WebGL kiêm Kỹ sư tự động hóa 3D để thiết kế hoặc tái thiết lập (Clean Slate Rebuild) một phòng triển lãm văn học 3D hoặc cõi mở (Realm) từ con số 0.

---

## 1. GIAI ĐOẠN 0: CLEAN-SLATE HARD PURGE (XÓA SẠCH & DỌN RÁC)
Trước khi dựng mới hoặc sửa đổi lớn, phải dọn sạch triệt để phòng cũ:
```javascript
export function purgeExistingRoom(scene, roomGroup) {
  if (!roomGroup) return;
  roomGroup.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => disposeMaterial(m));
      } else if (child.material) {
        disposeMaterial(child.material);
      }
    }
  });
  scene.remove(roomGroup);
}
function disposeMaterial(mat) {
  mat.map?.dispose();
  mat.normalMap?.dispose();
  mat.roughnessMap?.dispose();
  mat.metalnessMap?.dispose();
  mat.dispose();
}
```

---

## 2. GIAI ĐOẠN 1: TỰ ĐỘNG HÓA BLENDER PYTHON (`bpy` + `bmesh`)
1. Viết script `scripts/blender_build_<room>_kit.py` tạo các mesh di sản chi tiết:
   - Cổng vòm, bệ đá hoa văn trống đồng, đao đình hoa sen, tường thành, vũ khí cổ, giếng nước.
   - Gán vật liệu Principled BSDF với PBR Maps.
2. Xuất nén Draco:
   ```bash
   blender --background --python scripts/blender_build_<room>_kit.py
   ```
3. Đồng bộ file `.glb` ra:
   - `public/model/<room>_kit.glb`
   - `public/models/<room>_kit.glb`
   - `model/<room>_kit.glb`

---

## 3. GIAI ĐOẠN 2: CHUẨN HÓA MÔ HÌNH & AUTO-GROUNDING
1. Giữ nguyên quaternion gốc từ Blender (`[0.7071068, 0, 0, 0.7071068]`).
2. Ép đáy mô hình chạm khít mặt sàn hoặc mặt bệ:
   ```javascript
   const box = new THREE.Box3().setFromObject(modelMesh);
   modelMesh.position.y += (groundY - box.min.y);
   ```
3. Quét sạch `NaN` / `Infinity` trong BufferAttribute Position và Normal.

---

## 4. GIAI ĐOẠN 3: PHÂN KHU & CHỐNG CHỒNG CHÉO (`Box3` PAIRWISE CLEARANCE)
1. Chia phòng thành 3 phân khu: Tâm điểm, Cánh tả, Cánh hữu & Hậu cảnh.
2. Bắt buộc kiểm tra ma trận va chạm:
   ```javascript
   export function validateRoomSpatialLayout(roomGroup) {
     // Duyệt tất cả các cặp phần tử chính:
     // deltaX = Math.max(0, boxB.min.x - boxA.max.x, boxA.min.x - boxB.max.x)
     // deltaZ = Math.max(0, boxB.min.z - boxA.max.z, boxA.min.z - boxB.max.z)
     // clearance = Math.sqrt(deltaX^2 + deltaZ^2)
     // Bắt buộc: clearance >= 1.5m (0% va chạm)
   }
   ```
3. Giữ thông thoáng trục giao thông trung tâm $|X| \le 2.3\text{m}$.

---

## 5. GIAI ĐOẠN 4: CHIAROSCURO 60+ FPS & ÂM THANH 3D
1. Ánh sáng: Cặp SpotLight vàng kim (`#ffaa33`) rọi hiện vật chính + đèn ngọc lam (`#00f5d4`) huyền bí.
2. `userData.ignoreRaycaster = true` trên 100% hạt VFX, mặt nước, god rays.
3. Không cấp phát bộ nhớ động (`new Vector3`, `new Box3`) trong vòng lặp render.

---

## 6. GIAI ĐOẠN 5: LORE 4 CHƯƠNG & HITBOX RAYCASTER
1. Đầy đủ 4 chương: Hoàn cảnh lịch sử, Thi pháp nghệ thuật, Biểu tượng nhân vật, Bài học di sản.
2. Nhả Pointer Lock khi mở popup, phím ESC/[X] đóng nhanh, camera zoom mượt mà.
3. Bọc hiện vật bằng Hitbox vô hình (`transparent: true, opacity: 0, depthWrite: false`) để click chuột chính xác 100%.

---

## 7. GIAI ĐOẠN 6: KIỂM THỬ TỰ ĐỘNG & TỰ VÁ LỖI (SELF-HEALING)
Chạy lệnh kiểm chứng toàn diện trước khi bàn giao:
```bash
node scripts/heritage_pipeline_runner.mjs verify <tên_phòng>
```
Đạt chuẩn khi:
- Cú pháp Decorator & Lore hợp lệ (`node --check`).
- Unit tests & Box3 clearance $\ge 1.5\text{m}$ vượt qua 100%.
- Vite production build thành công không có warning/error.
