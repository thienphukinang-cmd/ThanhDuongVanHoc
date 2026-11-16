---
name: grand-lobby-architect
description: >-
  Hướng dẫn kỹ thuật và quy trình chuẩn 6 bước kiến tạo Đại Sảnh Bảo Tàng Văn Học 3D (Grand Lobby),
  Cuốn Sách Trung Tâm "Thiên Thư Sử Việt" 3D Pop-up Hologram và Hệ Thống Hành Lang Dẫn Lối Đa Giác Quan (60+ FPS).
---

# Kỹ Thuật Kiến Tạo Đại Sảnh & Cuốn Sách Di Sản 3D "Thiên Thư Sử Việt"

Quy trình chuẩn hóa dành cho Kỹ Sư WebGL kiêm Giám Đốc Nghệ Thuật Không Gian Bảo Tàng Ảo (BaoTang3D), tổng hòa **14 kỹ năng chuyên sâu**:
`museum-exhibition-curator`, `cultural-heritage-modeler`, `ornamental-relief-sculptor`, `environment-lighting-artist`, `shader-coloring-artist`, `water-mountain-vfx-sculptor`, `mesh-detailing-specialist`, `interactive-lore-guide`, `camera-director`, `educational-tour-guide-director`, `audio-soundscape-director`, `hitbox-collision-architect`, `web-xr-teleport-controller`, `fps-optimizer`.

---

## 1. QUY HOẠCH KHÔNG GIAN ĐẠI SẢNH & TỌA ĐỘ CHUẨN
- **Tâm điểm sảnh $(0, 0, 0)$:** Bệ đá cẩm thạch Imperial Nero Marquina 2 tầng, chạm nổi Trống đồng Đông Sơn và Đài sen vàng 16 cánh dát vàng hoàng cung.
- **Cuốn Sách Khổ Lớn ($6.2\text{m} \times 3.8\text{m}$):** Nâng bổng lơ lửng tại $Y = 1.6\text{m} - 1.8\text{m}$, nhấp nhô theo hàm sin:
  $$Y(t) = Y_{\text{base}} + \sin(1.5t) \times 0.08$$
- **Trục giao thông an toàn ($|X| \le 2.3\text{m}$):** Trục dẫn lối trên thảm đỏ từ đại môn Nam đến tâm sảnh và cầu thang chữ Y luôn thông thoáng 100%.
- **2 Góc sảnh đối xứng:** Hồ sen non bộ tại $(-14.5, 0, -13.5)$ (Tây-Bắc) và $(14.5, 0, -13.5)$ (Đông-Bắc).

---

## 2. VOLUMETRIC GOD RAYS & DẢI HẠT KÝ TỰ XOẮN ỐC
- **Cột sáng God Rays:** Trụ nón cụt `CylinderGeometry(5.2, 2.2, 26.0, 32, 1, true)` hắt sáng lên giếng trời thông tầng 32m. Vật liệu `MeshBasicMaterial` với `AdditiveBlending`, `depthWrite: false`, `userData.ignoreRaycaster = true`.
- **Hạt ký tự xoắn ốc (Spiral Particle Vortex):** Hệ thống `THREE.Points` (380 hạt) chữ Quốc ngữ & chữ Nôm cổ bay xoắn ốc phễu kép:
  $$\begin{cases}
    r(y) = r_0 + \left(\frac{y}{26}\right) \times 1.8 \\
    \theta(t) = \theta_0 + \omega \cdot t \\
    x(t) = r(y) \cos(\theta(t)), \quad z(t) = r(y) \sin(\theta(t))
  \end{cases}$$

---

## 3. ĐỘNG CƠ 4 CHƯƠNG & 3D POP-UP HOLOGRAM NỔI
1. **Trang Khai Từ:** Pop-up Hologram đóa sen vàng 12 cánh hé nở tỏa hào quang lân tinh.
2. **Chương I – Hào Khí Ngàn Năm:** Hologram rặng tre đằng ngà, ngựa sắt rực lửa chồm lên và sóng sông Như Nguyệt. Nút bấm: `[ Khám phá Thánh Gióng ]` & `[ Đến Nam Quốc Sơn Hà ]`.
3. **Chương II – Tiếng Lòng Nhân Đạo:** Hologram ngọn đèn dầu hắt bóng chiếc bóng Vũ Nương trên vách nứa và mặt nước Hoàng Giang xanh ngọc lấp lánh. Nút bấm: `[ Bước vào cõi Nam Xương ]`.
4. **Chương III – Ánh Trăng & Bóng Tối:** Hologram hàng cau nắng mai Vĩ Dạ, thuyền chở trăng lung linh và mái tranh nghèo Tắt Đèn. Nút bấm: `[ Dạo bước Thôn Vĩ Dạ ]` & `[ Tham quan phòng Tắt Đèn ]`.
5. **Ấn Triện Đỏ "Du Ngoạn Tự Động":** Gắn góc dưới sách kích hoạt Auto-Tour toàn bảo tàng (`window.__autoTour.toggleTour()`).
6. **Smooth Zoom Camera:** Click vào trang sách kích hoạt `cameraManager.smoothZoomToFocus()` căn góc nhìn đọc sách.

---

## 4. TIỂU CẢNH HỒ SEN NON BỘ & CUSTOM WATER SHADER
- **Custom Water Shader:**
  ```glsl
  // Vertex wave
  float wave = sin(pos.x * 4.5 + uTime * 2.2) * 0.024 + cos(pos.y * 4.5 + uTime * 1.8) * 0.024;
  pos.z += wave;

  // Fragment Caustics
  float caustic = pow(clamp(sin(vUv.x * 24.0 + uTime * 2.5) * sin(vUv.y * 24.0 + uTime * 2.0) * 0.5 + 0.5, 0.0, 1.0), 4.0) * 0.45;
  vec3 finalColor = mix(uDeepColor, uShallowColor, depthMix) + uSunHighlight * caustic;
  ```
- **Lá sen & Hoa sen:** Dập dềnh bồng bềnh nhẹ trên mặt nước (`THREE.InstancedMesh`).
- **Đèn đá Á Đông:** Tỏa ánh sáng ấm áp $2700\text{K}$ `PointLight`.

---

## 5. HÀNH LANG "DÒNG CHẢY VĂN HỌC"
- **Hàng cột gỗ lim & Đèn lồng:** 2 hàng cột chạm mây cuốn dọc hành lang Nam (`THREE.InstancedMesh` 1 Draw Call).
- **Tranh phù điêu & Thư pháp:** Tranh dân gian Đông Hồ, dải lụa thư pháp kèm `SpotLight` Chiaroscuro.
- **5 Tủ kính Bảo vật Văn chương:** Bút lông cán trúc, nghiên mực đá tự nhiên, bản Kiều Nôm mộc bản, nón quai thao, đèn dầu men lam Bát Tràng cổ.
- **VFX "Dòng Sông Chữ":** 420 hạt ánh kim và lam ngọc trôi lững lờ trên trần hành lang ở $Y = 9.2\text{m}$.

---

## 6. TIÊU CHUẨN HIỆU NĂNG 60+ FPS & HITBOX
- **Zero dynamic memory allocation:** Không cấp phát bộ nhớ động trong vòng lặp animation render.
- **Tối ưu Raycaster:** `userData.ignoreRaycaster = true` trên 100% hạt VFX, god rays, mặt nước.
- **Hitbox cản va chạm:** Bọc Proxy Hitbox `Box3` cho bệ sách, hồ sen, hàng cột và tủ kính; chống đi xuyên vật thể 100%.
- **WebXR Teleport:** Bố trí các điểm đánh dấu Teleport (`isTeleportFloor = true`).
- **WebAudio API:** Tổng hợp âm thanh sột soạt lật giấy Dó cổ truyền và nhã nhạc cung đình thanh tao.
