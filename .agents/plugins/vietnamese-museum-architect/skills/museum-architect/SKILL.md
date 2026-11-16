---
name: museum-architect
description: Hướng dẫn kỹ thuật và quy trình chuẩn 4 giai đoạn dựng Bảo Tàng Văn Học Ảo 3D (BaoTang3D) đạt chuẩn WebGL 60+ FPS, ánh sáng Chiaroscuro, nén Draco, âm thanh 3D và WebXR.
---

# Sổ Tay Kỹ Thuật Museum Architect (BaoTang3D)

Tài liệu hướng dẫn kỹ thuật chuẩn mực dành cho Kỹ sư trưởng WebGL trong việc quy hoạch, thiết kế kiến trúc, dựng mô hình 3D PBR, lập trình hiệu ứng ánh sáng điện ảnh và tối ưu hóa 60+ FPS cho **Bảo Tàng Văn Học Ảo 3D**.

---

## 1. QUY HOẠCH KHÔNG GIAN BẢO TÀNG (SPATIAL PLANNING)

### 1.1. Bố cục 3 lớp đa tầng (Layered Spatial Composition)
- **Tiền cảnh (Foreground):**
  - Thảm đỏ gấm hoa văn Trống Đồng dẫn hướng từ cửa vào.
  - Bảng biển tên phòng gỗ sơn son thếp vàng hoặc chạm khắc đá cổ.
  - Trục giao thông chính: Tuyệt đối giữ trống khoảng $|X| \le 2.3\text{m}$ để người xem di chuyển mượt mà tới các khu vực trọng tâm.
- **Trung cảnh (Midground):**
  - Bệ tượng đài hiện vật chính (tượng nhân vật văn học, ngựa sắt, nỏ thần, sa bàn).
  - Bể hoa sen nước trong, rùa đá đội bia, chậu cây thế cổ thụ.
- **Hậu cảnh (Background):**
  - Cổng Dịch Chuyển Portal kết nối không gian cõi mở (Story Realm).
  - Vách tường phù điêu chạm khắc các điển tích văn học, mành tre, bình phong Indochine.

### 1.2. Phân tầng niên biểu lịch sử (Chronological Zoning)
- **Tầng 1 (Văn học Dân gian, Cổ đại & Trung đại):**
  - *Truyền thuyết & Sử thi:* Thánh Gióng, Sơn Tinh - Thủy Tinh, An Dương Vương & Nỏ Thần Cổ Loa.
  - *Văn học Trung đại:* Nam Quốc Sơn Hà, Chuyện Người Con Gái Nam Xương, Truyện Kiều (Nguyễn Du), Bình Ngô Đại Cáo.
- **Tầng 2 (Văn học Cận - Hiện đại & Hiện thực phê phán):**
  - Tắt Đèn (Ngô Tất Tố), Vợ Nhặt (Kim Lân), Chí Phèo & Lão Hạc (Nam Cao), Rừng Xà Nu.
- **Tầng 3 (Phong trào Thơ Mới & Văn học Đổi mới):**
  - Đây Thôn Vĩ Dạ (Hàn Mặc Tử), Tràng Giang (Huy Cận), Tây Tiến (Quang Dũng), Chiếc Thuyền Ngoài Xa.

---

## 2. NẠP & CHUẨN HÓA MÔ HÌNH 3D (.GLB/.GLTF)

### 2.1. Tra cứu và tải mô hình tự động
Sử dụng script tích hợp sẵn trong dự án:
```bash
# Tìm kiếm tài nguyên CC0 trên Poly Haven và WebGL repos
node scripts/fetch3DAsset.js search <từ_khóa>

# Tải tài nguyên theo ID hoặc URL
node scripts/fetch3DAsset.js polyhaven <asset_id> <tên_chuẩn_hóa>
node scripts/fetch3DAsset.js url <glb_url> <tên_chuẩn_hóa>
```

### 2.2. Chuẩn hóa tỷ lệ và tọa độ qua `prepareUnlitVividGlbModel`
Mọi mô hình 3D nạp vào không gian bắt buộc phải qua hàm helper `prepareUnlitVividGlbModel` (`src/utils/modelLoaderHelper.js`):
```javascript
import { prepareUnlitVividGlbModel } from '../utils/modelLoaderHelper.js';

// Cấu hình chuẩn hóa
const preparedModel = prepareUnlitVividGlbModel(gltf.scene, {
  targetSpan: 2.2,       // Chiều cao/sải rộng chuẩn mét thực tế (VD: tượng người ~ 1.8m - 2.2m)
  groundAtYZero: true,   // Tự động căn chỉnh chân mô hình đặt khít mặt sàn Y = 0
  centerXZ: true,        // Căn giữa trọng tâm hình học tại tâm tọa độ cục bộ
  cleanNaN: true,        // Quét sạch NaN / Infinity trong BufferAttribute để ngừa lỗi màn hình đen
  preserveSRGB: true     // Giữ màu sắc rực rỡ, chuẩn sRGB Color Space
});
```

---

## 3. NGHỆ THUẬT ÁNH SÁNG CHIAROSCURO & CỔNG DỊCH CHUYỂN PORTAL

### 3.1. Thiết lập ánh sáng điện ảnh Chiaroscuro
- Kết hợp tương phản cao giữa bóng đổ kịch tính và luồng sáng tiêu điểm:
  - **SpotLight:** Tạo chùm sáng rọi từ trên trần xuống tượng nhân vật trung tâm (`angle: Math.PI / 6`, `penumbra: 0.6`).
  - **PointLight ấm áp cổ điển:** Màu vàng hoàng gia (`0xd4af37`), cường độ vừa phải tại đèn lồng và nến cổ.
  - **PointLight lam ngọc:** Màu xanh ngọc (`0x00f5d4`) tạo điểm nhấn huyền bí tại Cổng Portal và nỏ thần / giếng ngọc.
- Sương mù chiều sâu:
  ```javascript
  scene.fog = new THREE.FogExp2(0x06080c, 0.015);
  ```

### 3.2. Cổng Dịch Chuyển Không Gian (Multi-Scene Spatial Portals)
- Tạo vòng xoáy hạt ánh sáng ngọc bích quanh khung vòm cổng.
- Gắn cờ tương tác và đăng ký hitbox va chạm dịch chuyển hai chiều:
  ```javascript
  portalMesh.userData = {
    isPortal: true,
    targetRealm: 'anDuongVuongRealm',
    promptText: 'Bước vào Cõi Mở Cổ Loa – Dạ Sơn'
  };
  ```

---

## 4. ÂM THANH 3D, LORE HỌC THUẬT & TRẢI NGHIỆM WEBXR

### 4.1. Âm thanh không gian 3D (`PositionalAudio`)
```javascript
const sound = new THREE.PositionalAudio(audioListener);
audioLoader.load('/audio/tieng_song_bien_dason.mp3', (buffer) => {
  sound.setBuffer(buffer);
  sound.setRefDistance(4);
  sound.setRolloffFactor(1.2);
  sound.setLoop(true);
  sound.setVolume(0.7);
  sound.play();
});
artifactGroup.add(sound);
```

### 4.2. Khung Lore Học Thuật 4 Chương Chuẩn Mực
Mỗi không gian văn học cần tích hợp bảng Lore với đầy đủ 4 chương:
1. **Chương 1:** Bối cảnh sáng tác & Hoàn cảnh lịch sử thời đại.
2. **Chương 2:** Bút pháp nghệ thuật, thi pháp & thủ pháp tượng trưng.
3. **Chương 3:** Hình tượng nhân vật trung tâm & Những nghịch lý bi tráng.
4. **Chương 4:** Di sản văn hóa, giá trị nhân sinh & Bài học thời đại.

---

## 5. BẢO CHỨNG HIỆU NĂNG WEBGL 60+ FPS

- **InstancedMesh:** Gom nhóm tất cả chi tiết kiến trúc lặp lại (cột gỗ, đèn lồng, gạch hoa, lá sen, vệt nắng nghiêng).
- **Raycaster Optimization:** Luôn gán `userData.ignoreRaycaster = true` trên các đối tượng nền, mặt nước, hạt bụi, god rays.
- **Zero Allocation in Loop:** Không khởi tạo `new Vector3`, `new Box3` hay biến đối tượng mới trong hàm `update(timeSec)`.
- **Kiểm thử cú pháp độc lập:**
  ```bash
  node --check src/modules/<tên_phòng>RoomDecorator.js
  ```
