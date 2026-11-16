---
name: literature-realm-architect
description: Hướng dẫn kỹ thuật và quy trình chuẩn mực hợp nhất 15 phân hệ chuyên sâu để kiến tạo Cõi Thế Giới Mở (Open Story Realm - enterRealm) cho các kiệt tác văn học Việt Nam trong WebGL/Three.js đạt chuẩn 60+ FPS, ánh sáng Chiaroscuro đổ bóng sống động, Custom GLSL Shaders, Đàn Giải Oan & Thủy Cung kỳ ảo, Lore lụa trắng, 3D Positional Audio, Auto-Tour điện ảnh và Hitbox Colliders.
---

# Sổ Tay Kỹ Thuật Literature Realm Architect (15 Phân Hệ Kỹ Năng)

Tài liệu chuẩn mực dành cho AI Agent **LiteratureRealmArchitect** hướng dẫn chi tiết cách thức xây dựng một **Cõi Thế Giới Mở (`enterRealm`)** đưa người xem bước thẳng vào bối cảnh các kiệt tác văn học Việt Nam (Nam Xương, Kiều, Tắt Đèn, Thôn Vĩ Dạ, Nam Quốc Sơn Hà, v.v.).

---

## 1. TỔNG QUAN 15 PHÂN HỆ KỸ NĂNG ĐỒNG BỘ

| STT | Kỹ năng | Trách nhiệm chính trong Cõi Mở |
|---|---|---|
| 1 | `museum-exhibition-curator` | Giám tuyển không gian kép (Phòng trưng bày ➔ Cõi mở 360°), kịch bản và thông điệp tác phẩm |
| 2 | `threejs-auto-integrator` | Multi-Scene architecture, Dolly-Zoom Warp cutscene, lifecycle `enterRealm`/`exitRealm` |
| 3 | `cultural-heritage-modeler` | Chuẩn hóa mô hình 3D văn hóa tỷ lệ thực 1:1 (`prepareUnlitVividGlbModel`, `targetSpan`, `cleanNaN`) |
| 4 | `ornamental-relief-sculptor` | Chạm trổ bia đá lụa trắng, phù điêu hoa văn thời Lê/Nguyễn, hoành phi câu đối |
| 5 | `environment-lighting-artist` | Nghệ thuật Chiaroscuro tương phản cao, SkyDome 360°, sương đêm FogExp2, PointLight bập bùng, ShadowMap |
| 6 | `shader-coloring-artist` | Lập trình Custom GLSL Shaders mặt nước đêm cuộn sóng, vầng hào quang lân tinh, gradient tan biến |
| 7 | `water-mountain-vfx-sculptor` | Điêu khắc triền đê làng cổ, dòng sông vô tận, Đàn Giải Oan cờ phướn tỏa khói, kiệu hoa thủy cung |
| 8 | `mesh-detailing-specialist` | Chi tiết cỏ lau đung đưa, nứa vách đan nan, cầu gỗ rêu phong, trâm vàng xoay lơ lửng |
| 9 | `interactive-lore-guide` | Bảng thông tin khung gỗ cổ bọc lụa trắng, hệ thống UI Lore Overlay 4 chương học thuật chuẩn mực |
| 10 | `camera-director` | Đạo diễn máy quay điện ảnh, Cinematic Dolly-Zoom Cutscene, các góc quay tương tác giàu cảm xúc |
| 11 | `educational-tour-guide-director` | Hệ thống Auto-Tour tự động dẫn đường theo các nhịp kể chuyện đắt giá và đồng bộ voiceover |
| 12 | `audio-soundscape-director` | Không gian âm thanh đa tầng 3D PositionalAudio: tiếng dế đêm, gió rít vách tre, tiếng ru con, sóng Hoàng Giang |
| 13 | `hitbox-collision-architect` | Hệ thống va chạm vật lý Invisible Colliders, Proxy Hitbox Box3 chống xuyên vách và rơi sông |
| 14 | `web-xr-teleport-controller` | Rải điểm Teleport Marker cho kính thực tế ảo VR Headset, `userData.teleportFloor = true` |
| 15 | `fps-optimizer` | Tối ưu hóa 60+ FPS vững chắc, zero-allocation trong animation loop, InstancedMesh, `ignoreRaycaster = true` |

---

## 2. QUY TRÌNH TRIỂN KHAI 5 GIAI ĐOẠN CHI TIẾT

### GIAI ĐOẠN 1: BẦU TRỜI ĐÊM 360° & HIỆN TRƯỜNG "CHIẾC BÓNG TRÊN VÁCH"

#### 1.1. SkyDome 360° & Sương mù đêm
- Sử dụng hình cầu ngược `THREE.SphereGeometry(120, 32, 32)` với vật liệu `MeshBasicMaterial({ side: THREE.BackSide })`.
- Gradient màu đêm huyền hoặc: Đỉnh vòm chàm thẫm `#050811`, chân trời xanh đêm `#0d1117`.
- Trăng khuyết treo nghiêng góc $35^\circ$, phát hào quang dịu nhẹ `DirectionalLight` lam bạc (`0x88aaff`, `intensity: 0.6`).
- Sương mù chiều sâu:
  ```javascript
  const nightFog = new THREE.FogExp2(0x0d1117, 0.022);
  ```

#### 1.2. Kỹ thuật Chiaroscuro & Bóng Đổ Sống Động
- Đặt ngọn đèn dầu `PointLight(0xff7b00, 2.8, 12, 1.8)` bên trong gian nhà.
- Bật `castShadow = true` trên ngọn đèn:
  ```javascript
  oilLampLight.castShadow = true;
  oilLampLight.shadow.mapSize.width = 1024;
  oilLampLight.shadow.mapSize.height = 1024;
  oilLampLight.shadow.camera.near = 0.1;
  oilLampLight.shadow.camera.far = 15;
  oilLampLight.shadow.bias = -0.002;
  ```
- Rung rinh ánh lửa tự nhiên trong vòng lặp animation `update(time)`:
  ```javascript
  const flicker = Math.sin(time * 7.5) * 0.28 + Math.cos(time * 13.0) * 0.14 + Math.sin(time * 23.0) * 0.08;
  oilLampLight.intensity = baseIntensity + flicker;
  oilLampLight.position.x = basePos.x + Math.sin(time * 5.0) * 0.015;
  ```
- Bức vách nứa phía sau đón trọn bóng: `wallMesh.receiveShadow = true`.
- Nhân vật Vũ Nương (`nguoicogainamxuong.glb`): toàn bộ Mesh bên trong bật `mesh.castShadow = true`.

---

### GIAI ĐOẠN 2: TÍCH HỢP MÔ HÌNH VĂN HÓA TỶ LỆ THỰC 1:1

#### 2.1. Chuẩn hóa tỷ lệ & vị trí
```javascript
import { loadGlbCached, prepareUnlitVividGlbModel } from '../utils/modelLoaderHelper.js';

loadGlbCached(['/models/nguoicogainamxuong.glb', '/model/nguoicogainamxuong.glb'], {
  onSuccess: (gltf) => {
    const model = gltf.scene;
    // Chuẩn hóa theo chiều cao thực tế 1:1
    prepareUnlitVividGlbModel(model, {
      targetSpan: 1.85,      // Tỷ lệ thực 1:1 cho nhân vật Vũ Nương
      groundAtYZero: true,   // Chân chạm khít mặt sàn
      centerXZ: true,
      cleanNaN: true,
      preserveSRGB: true
    });
    
    // Bật bóng đổ cho nhân vật
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    cottageGroup.add(model);
  }
});
```

---

### GIAI ĐOẠN 3: BẾN HOÀNG GIANG, ĐÀN GIẢI OAN & ẢO ẢNH THỦY CUNG

#### 3.1. Custom GLSL Water Shader cho sông Hoàng Giang
- Vertex Shader: Gợn sóng lăn tăn đa hướng bằng tổng các sóng điều hòa.
- Fragment Shader: Phản chiếu ánh trăng bạc trên nền nước đêm xanh đen, độ trong suốt tăng dần theo độ sâu, viền bọt sóng ven bờ cát.
- Uniforms: `uTime`, `uMoonDir`, `uWaterColor`, `uFoamColor`.

#### 3.2. Đàn Giải Oan uy nghiêm
- Bệ đá rêu phong hình bát giác chạm phù điêu sóng nước thủy ba thời Lê.
- Lư hương đồng cổ tỏa khói trầm particle bay lượn (`THREE.Points`).
- Cờ phướn ngũ sắc phấp phới trong gió đêm.
- Chiếc Trâm Vàng phát quang `#ffd35c` lơ lửng xoay tròn trên bệ đàn.

#### 3.3. Ảo ảnh Thủy Cung "Vũ Nương trở về giữa dòng sông"
- Hệ thống hạt lân tinh ngọc bích `#00f5d4` và đốm hoa đăng bay vút lên từ lòng sông.
- Mô hình/hình khối kiệu hoa, cờ quạt, võng lọng lụa là rực rỡ ẩn hiện giữa làn sương khói mờ ảo.
- Lập trình tan biến theo khoảng cách người chơi:
  ```javascript
  const dist = playerPos.distanceTo(riverBankPos);
  // Khi người chơi tiến sát mép sông (< 6m), ảo ảnh tan biến vào hư không
  const fade = THREE.MathUtils.clamp((dist - 3.5) / 5.0, 0.0, 1.0);
  apparitionMaterial.opacity = fade * maxOpacity;
  ```

---

### GIAI ĐOẠN 4: BẢNG LỤA TRẮNG, LORE 4 CHƯƠNG & ÂM THANH 3D

#### 4.1. Bảng thông tin lụa trắng
- Khung gỗ mun chạm khắc mộc mạc, dải lụa trắng mềm mại buông rủ phát sáng dịu dàng.
- Vẽ Canvas Texture độ phân giải cao: Tiêu đề thư pháp, tóm tắt tác phẩm, hoa văn truyền thống.
- Đăng ký Raycaster click mở UI Lore Overlay.

#### 4.2. Khung Lore 4 chương chuẩn mực
- **Chương 1: Bối cảnh & Tác giả:** Nguyễn Dữ, thế kỷ XVI, trích *Truyền Kỳ Mạn Lục*.
- **Chương 2: Bi kịch chiếc bóng:** Chiếc bóng trên vách nứa — nút thắt của hiểu lầm và bi kịch gia đình phong kiến.
- **Chương 3: Thế giới kỳ ảo Thủy Cung:** Sự cứu rỗi của Linh Phi và khát vọng giải oan rửa sạch nhục nhã.
- **Chương 4: Giá trị nhân đạo:** Vẻ đẹp đức hạnh của người phụ nữ Việt Nam và tiếng chuông cảnh tỉnh về sự hoài nghi mù quáng.

#### 4.3. Âm thanh không gian 3D `THREE.PositionalAudio`
- Âm thanh gian nhà: Gió rít qua khe nứa, dế đêm rả rích, tiếng ru con u buồn (`audioRefDistance: 3m`).
- Âm thanh bến sông: Tiếng nước vỗ bờ, nhạc lễ giải oan huyền hoặc xa xăm (`audioRefDistance: 6m`).

---

### GIAI ĐOẠN 5: AUTO-TOUR, HITBOX COLLISION & TỐI ƯU 60+ FPS

#### 5.1. Tuyến Auto-Tour 3 chặng đắt giá
1. **Chặng 1: Triền đê làng Nam Xương:** Toàn cảnh đêm trăng, gió lay cỏ lau, hướng nhìn về gian nhà ấm ánh đèn dầu.
2. **Chặng 2: Gian nhà tranh & Chiếc bóng trên vách:** Cận cảnh gian nhà, đĩa đèn dầu bập bùng, chiếc bóng Vũ Nương in hằn lên vách nứa.
3. **Chặng 3: Bến Hoàng Giang & Đàn Giải Oan:** Lướt ra mặt nước bến sông, chiêm ngưỡng Đàn Giải Oan, Trâm Vàng và ảo ảnh đoàn kiệu Thủy Cung rực rỡ.

#### 5.2. Hitbox Collision & Raycasting
- Tạo mặt phẳng vô hình `MeshBasicMaterial({ visible: false })` bao quanh bờ sông để chặn người chơi rơi xuống nước.
- Tạo `Box3` Proxy Hitbox bọc quanh vách nứa và đồ đạc để ngăn xuyên tường.
- Gán `userData.ignoreRaycaster = true` cho toàn bộ Particles, sương mù, mặt nước và God Rays.
- Zero-allocation trong vòng lặp animation `update(delta, time)`.
