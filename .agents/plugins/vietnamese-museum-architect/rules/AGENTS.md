# Tiêu Chuẩn Kỹ Thuật Heritage Cinema Architect & Literature Realm Architect (BaoTang3D)

Khi hoạt động trong vai trò Kỹ Sư Trưởng WebGL kiêm Đạo Diễn Điện Ảnh Văn Học AI hoặc Kỹ Sư Trưởng Cõi Thế Giới Mở (Literature Realm Architect), Agent phải tuân thủ nghiêm ngặt các quy tắc sau:

---

## 1. TIÊU CHUẨN HIỆU NĂNG WEBGL 60+ FPS
- **InstancedMesh:** Sử dụng `THREE.InstancedMesh` cho mọi chi tiết lặp lại từ 3 đối tượng trở lên (hàng cột lim, đèn lồng, lá sen, hoa sen, chậu cây thế, vệt nắng nghiêng, cỏ lau).
- **Tối ưu Raycaster:** Luôn gán `userData.ignoreRaycaster = true` trên toàn bộ hệ thống hạt (particles), mặt nước, god rays, đèn trần và hiệu ứng nền để người dùng click tương tác mượt mà không bị giật lag.
- **Zero-allocation:** Tuyệt đối không cấp phát bộ nhớ động trong vòng lặp animation `update(timeSec)` (không `new THREE.Vector3()`, `new THREE.Box3()`, `new THREE.Matrix4()` mỗi frame).

---

## 2. CHUẨN HÓA HÌNH HỌC & TRÁNH LỖI ĐEN MÀN HÌNH (ZERO NAN POISONING)
- Mọi Geometry tạo ra bắt buộc gọi `computeVertexNormals()`, `computeBoundingBox()`, `computeBoundingSphere()`.
- Quét sạch triệt để các giá trị `NaN` và `Infinity` trong BufferAttribute Position và Normal trước khi add vào Scene.
- Bọc code khởi tạo bằng `try...catch` an toàn và sử dụng Optional Chaining (`?.`).

---

## 3. CHUẨN HÓA MÔ HÌNH 3D .GLB/.GLTF
- Bắt buộc chuẩn hóa tỷ lệ và tọa độ qua `prepareUnlitVividGlbModel` (`src/utils/modelLoaderHelper.js`).
- Đưa chân mô hình chạm khít mặt sàn tại $Y = 0$, căn giữa $X/Z$ và scale theo mét thực tế qua `targetSpan` (nhân vật 1:1 từ 1.7m - 2.2m).
- Tắt đổ bóng nặng không cần thiết (`castShadow = false`, `receiveShadow = false`), ngoại trừ các phân cảnh đặc tả Chiaroscuro chủ đích (như "Chiếc bóng trên vách").
- Bảo toàn không gian màu rực rỡ chuẩn `THREE.SRGBColorSpace`.

---

## 4. BỐ CỤC KHÔNG GIAN & TRỤC GIAO THÔNG
- Trục đường đi trung tâm ($|X| \le 2.3\text{m}$) trên thảm đỏ dẫn lối đến các phòng và đại cầu thang phải luôn thông thoáng 100%, không đặt vật cản lớn.
- Bố cục hài hòa 3 lớp (Tiền cảnh – Trung cảnh – Hậu cảnh). Kết hợp đan xen giữa yếu tố Tĩnh (tượng, phù điêu) và yếu tố Động (cá chép, sương mù, lá rơi, đom đóm, sóng nước).

---

## 5. TIÊU CHUẨN CÕI THẾ GIỚI MỞ 15 KỸ NĂNG (`enterRealm` / `exitRealm`)
- **SkyDome 360° & FogExp2:** Bầu trời 360 độ huyền hoặc, xóa bỏ ranh giới phòng kín khi vào cõi mở.
- **Bóng đổ Chiaroscuro:** Thiết lập PointLight lung linh kết hợp ShadowMap để tạo hiệu ứng chiếc bóng sống động in hằn lên vách nứa.
- **Custom Shaders & VFX:** GLSL shader mặt nước sóng cuộn đêm, hạt lân tinh ngọc bích `#00f5d4` và đại cảnh thủy cung ẩn hiện/tan biến theo khoảng cách người xem.
- **Bảng lụa trắng & Lore 4 chương:** Bảng thông tin khung gỗ cổ bọc lụa trắng phát sáng, kết nối UI Lore Overlay chuẩn mực và mini-quiz.
- **Âm thanh 3D & Auto-Tour:** PositionalAudio đa tầng (tiếng ru, côn trùng, sóng vỗ, nhạc lễ) và tuyến dẫn đường điện ảnh 3 chặng đắt giá.
- **Hitbox vật lý & WebXR:** Invisible Colliders, Proxy Box3 chống xuyên vách/rơi sông, và hỗ trợ WebXR teleport.

---

## 6. TIÊU CHUẨN TÍCH HỢP PHIM VĂN HỌC AI & ÂM THANH 3D
- Video Texture trong không gian 3D phải quản lý vòng đời phát thông minh (chỉ phát khi người xem ở cự ly tương tác $\le 8\text{m}$, tự động tạm dừng khi ở xa $\ge 12\text{m}$ để tối ưu CPU/GPU).
- Âm thanh không gian `PositionalAudio` phải cấu hình đúng `refDistance` và `rolloffFactor`, không làm rè hoặc xung đột với nhạc nền Đại Sảnh.
- Lore Overlay học thuật phải đầy đủ 4 chương và cấu trúc Quiz chuẩn mực.

---

## 7. KIỂM CHỨNG ĐỘC LẬP (SELF-HEALING)
- Luôn chạy `node --check` kiểm tra cú pháp sau khi viết hoặc chỉnh sửa bất kỳ file script nào.
- Tuyệt đối không làm thay đổi hoặc phá vỡ code vận hành hiện tại của bảo tàng.
