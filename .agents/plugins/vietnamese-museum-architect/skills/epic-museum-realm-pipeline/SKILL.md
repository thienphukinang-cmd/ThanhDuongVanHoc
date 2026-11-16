---
name: epic-museum-realm-pipeline
description: Quy trình chuẩn 6 giai đoạn kỹ thuật (tích hợp 15 kỹ năng chuyên sâu): Hard Purge 100%, Dynamic Adaptive Room Sizing, Kiến trúc Gian điện Đông Sơn PBR, Cõi mở 240mx240m địa hình liên tục getTerrainHeight(x, z), Chiaroscuro & Âm thanh 3D, Hitbox & WebGL 60+ FPS.
---

# Quy Trình Chuẩn 6 Giai Đoạn: Thiết Kế Phòng Triển Lãm & Cõi Mở Sử Thi (BaoTang3D)

Quy trình kỹ thuật toàn diện chuẩn hóa dành cho AI Agent chuyên trách kiến tạo các gian phòng triển lãm và cõi thế giới mở sử thi (`enterRealm`) cho mọi tác phẩm văn học lịch sử tại `BaoTang3D`.

---

## 1. TỔNG QUAN 15 KỸ NĂNG CHUYÊN SÂU ĐỒNG BỘ
1. **`museum-exhibition-curator`**: Quy hoạch gian điện, bố cục 3 lớp (Tiền - Trung - Hậu cảnh), giữ thông thoáng 100% trục đường đi trung tâm ($|X| \le 2.3\text{m}$).
2. **`threejs-auto-integrator`**: Nạp mô hình `.glb/.gltf` qua Draco, chuẩn hóa tỷ lệ theo mét thực tế, auto-grounding chạm khít bệ đá, bảo toàn quaternion gốc.
3. **`cultural-heritage-modeler`**: Dựng kiến trúc cung đình cổ phong Việt Nam (mái đao, bệ trống đồng, giếng đá, án thờ gỗ lim).
4. **`ornamental-relief-sculptor`**: Chạm khắc phù điêu đồng cổ hoa văn Đông Sơn, Chim Lạc, đoàn thuyền chiến.
5. **`environment-lighting-artist`**: Ánh sáng điện ảnh Chiaroscuro, ACESFilmic Tone Mapping, SpotLight thực có penumbra mềm, tuyệt đối không dùng hình nón giả.
6. **`shader-coloring-artist`**: Sinh texture thủ tục độ phân giải cao (`2048x2048`), shader mặt nước gợn sóng, vật liệu PBR rực rỡ chuẩn `sRGBColorSpace`.
7. **`water-mountain-vfx-sculptor`**: Xây dựng địa hình cõi mở $240\text{m} \times 240\text{m}$ qua hàm toán học liên tục `getTerrainHeight(x, z)` (gò đồi, hào sâu, sông suối, vách đá, biển khơi).
8. **`mesh-detailing-specialist`**: Tạo chi tiết vi mô (mũi tên đồng 3 cạnh, rìu lưỡi xéo, cánh lông ngỗng vẽ tay mềm mại viền alpha mờ).
9. **`interactive-lore-guide`**: Biên soạn hệ thống Lore Overlay học thuật 4 chương và câu đố trắc nghiệm tương tác Literary Quest.
10. **`camera-director`**: Đạo diễn chuyển động camera mượt mà (smooth zoom, tracking shot, cutscene book vortex).
11. **`educational-tour-guide-director`**: Lộ trình Auto-Tour dẫn đường tự động, liên kết mục lục Cuốn Sách Thiên Thư 3D tại Đại Sảnh.
12. **`audio-soundscape-director`**: Không gian âm thanh 3D `THREE.PositionalAudio`, tự động điều chỉnh âm lượng theo cự ly và fade-out khi rời phòng.
13. **`hitbox-collision-architect`**: Thiết lập Proxy Hitbox O(1), đăng ký vật cản `Box3` Collider vào `SpatialRegistry` với `padding = 1.5m`, 0% chồng chéo.
14. **`web-xr-teleport-controller`**: Bố trí các điểm neo dịch chuyển thực tế ảo WebXR phục vụ kính VR Headset.
15. **`fps-optimizer`**: Khóa hiệu năng 60+ FPS, triệt tiêu cấp phát bộ nhớ động trong vòng lặp animation, gán `userData.ignoreRaycaster = true`, quét sạch 100% NaN/Infinity.

---

## 2. CHI TIẾT 6 GIAI ĐOẠN THỰC THI

### GIAI ĐOẠN 1: HARD PURGE 100%, KHÓA 5 LỖI THỊ GIÁC & QUY HOẠCH TỰ ĐỘNG
1. **Hard Purge (Clean Slate 100%):**
   - Loại bỏ triệt để mọi `Group`, `Mesh`, `Light`, `PositionalAudio` cũ ra khỏi `Scene`.
   - Gọi đệ quy `.geometry.dispose()`, `.material.dispose()` và `.texture.dispose()` để giải phóng VRAM/RAM.
2. **Khóa 5 Lỗi Hiển Thị Cũ:**
   - ❌ **CẤM** tạo thanh xà ngang / dầm nâu chạy ngang tầm ngực xuyên qua lòng phòng.
   - ❌ **CẤM** dùng khối hình nón (`ConeGeometry`) màu vàng đục úp từ trần xuống làm tia sáng giả.
   - ❌ **CẤM** xếp các khối hộp chữ nhật màu xám (`BoxGeometry`) cao lênh khênh quanh tâm phòng gây che khuất tượng chính.
   - ❌ **CẤM** dùng `PointsMaterial` mặc định không có texture khiến hạt biến thành các ô vuông trắng thô cứng.
   - ❌ **CẤM** để mặt sàn màu be trơn tuột hoặc các cây cột lệch màu (trắng/đỏ lẫn lộn).
3. **Dynamic Adaptive Room Sizing:**
   ```javascript
   export function calculateAdaptiveRoomBounds(clusters = [], options = {}) {
     const minCorridor = options.minCorridor ?? 3.5; // Hành lang thông thủy >= 3.5m
     const minWidth = options.minWidth ?? 20.0;
     const minLength = options.minLength ?? 26.0;
     const minHeight = options.minHeight ?? 8.5;

     const totalBox = new THREE.Box3();
     clusters.forEach((c) => {
       if (c.box) totalBox.union(c.box);
     });

     const spanX = Math.max(Math.abs(totalBox.min.x), Math.abs(totalBox.max.x)) * 2;
     const spanZ = Math.max(Math.abs(totalBox.min.z), Math.abs(totalBox.max.z)) * 2;
     const spanY = totalBox.max.y;

     const width = Math.max(minWidth, Math.ceil(spanX + minCorridor * 2));
     const length = Math.max(minLength, Math.ceil(spanZ + minCorridor * 2));
     const height = Math.max(minHeight, Math.ceil(spanY + 0.5));

     return { width, length, height, totalBox };
   }
   ```

---

### GIAI ĐOẠN 2: KIẾN TRÚC GIAN ĐIỆN CỔ KÍNH & CHẤT LIỆU DI SẢN
1. **Sàn Đá Xanh Khảm Trống Đồng Đông Sơn (`2048x2048` CanvasTexture):**
   - Lát gạch đá xanh Thanh Hóa tối màu (`#262930`, `roughness: 0.55`).
   - Chính giữa tâm phòng khảm chìm Trống Đồng Đông Sơn ánh vàng kim (`#d4af37`), mặt trời 14 tia, vành 16 chim Lạc bay liệng.
   - Gán `map`, `bumpMap` (`bumpScale: 0.02`), `roughnessMap` tạo bề mặt phù điêu nổi chân thực.
2. **Vách Gỗ Lim Tối Màu & Hệ Cột Đồng Bộ 100%:**
   - Hệ vách khép kín gỗ lim tối màu (`#24140e`), gắn phù điêu đồng cổ chạm nổi hoa văn chim Lạc và thuyền chiến Đông Sơn.
   - Hệ 8 cột gỗ lim tròn (`#3b1e14`) đồng nhất với đai đồng vàng cổ (`#d4af37`), đặt trên chân tảng đá xanh chạm cánh sen tạo tác bằng `THREE.LatheGeometry`.
3. **Cổng Thành Cổ Đại & Bảng Thông Tin Đồng Cổ:**
   - Dựng Cổng Đá Rêu Phong (`CoLoa_Portal_Gate`) mái đao cong vút cổ đại, chừa khoảng thông thủy lối vào rộng $\ge 4.0\text{m}$. Hai bên trụ cổng đắp nổi phù điêu Thần Kim Quy và Chim Lạc.
   - Bảng Thông Tin bằng đồng xanh patin cổ đặt bên phải lối vào (cách cổng $\ge 1.8\text{m}$), tách biệt hoàn toàn khỏi luồng di chuyển trung tâm.

---

### GIAI ĐOẠN 3: ĐIỂM NHẤN TRUNG TÂM & PHÂN KHU HIỆN VẬT CHUYÊN SỬ
1. **Phân Khu Trung Tâm — Bệ Trống Đồng 3 Tầng & Tượng Chủ Đạo:**
   - Bệ Đá Trống Đồng 3 Tầng: Tầng 1 đá xanh, Tầng 2 Trống Đồng Đông Sơn chạm nổi, Tầng 3 đài sen nâng tượng.
   - Nạp mô hình `.glb` qua `GLTFLoader` + `DRACOLoader`, giữ nguyên quaternion gốc. Dùng `THREE.Box3` tự động scale chiều cao chuẩn cân đối ($3.2\text{m} - 3.6\text{m}$) và căn đáy `box.min.y` chạm khít mặt trên bệ đá (`Auto-Grounding` 100%).
   - Tinh chỉnh PBR `Material.001`: `metalness: 0.75`, `roughness: 0.40`, `envMapIntensity: 1.3`.
   - **Sa Bàn Thu Nhỏ Tầm Nhìn Thông Thoáng:** 3 vòng tường thành đá xoắn ốc Archimedes liền mạch (`ExtrudeGeometry`) có chiều cao thấp ($0.3\text{m} - 0.45\text{m}$), giữ tầm nhìn 100% xuyên suốt phòng.
2. **Cánh Trái — Gian Thờ Vũ Khí & Kho Binh Khí:**
   - Án thờ gỗ lim lớn trưng bày bảo vật (Nỏ Thần Liên Châu / Gươm Thần / Giáp Trụ). Lẫy vuốt rùa vàng phát hào quang (`emissive: 0xffaa00`, intensity: 1.5).
   - Giá binh khí trưng bày giáo đồng, rìu lưỡi xéo và hàng trăm mũi tên đồng 3 cạnh bằng `THREE.InstancedMesh`.
3. **Cánh Phải — Giếng Ngọc & Di Vật Huyền Thoại:**
   - Giếng đá xanh bát giác cổ kính. Nước trong vắt qua `MeshPhysicalMaterial` (`transmission: 0.85`, `roughness: 0.1`).
   - Dưới đáy đặt ngọc Minh Châu phát sáng ngọc bích (`#00f5d4`) cùng 1 `PointLight` hắt vệt sáng lung linh lên thành giếng.

---

### GIAI ĐOẠN 4: CÕI THẾ GIỚI MỞ (`enterRealm`) 240M x 240M
1. **Hàm Độ Cao Toàn Cục Liên Tục `getTerrainHeight(x, z)`:**
   - Gò đồi trung tâm: $Y = 2.0\text{m} \to 4.5\text{m}$ tại tâm $(0, 0)$.
   - 3 vòng hào nước sâu xoay quanh thành: $Y = -1.2\text{m}$ (mặt nước hào $Y = -0.30\text{m}$). Cầu gỗ lim bắc qua hào tại các trục chính.
   - Thung lũng đường mòn phía Nam: $Y = 2.2\text{m} \to 1.5\text{m}$.
   - Vách đá bờ biển Dạ Sơn: $Y = 1.5\text{m} \to 6.0\text{m}$ dựng đứng tại cực Nam, cắt xuống mặt biển $Y = 0.0\text{m}$, đáy biển sâu $Y = -4.0\text{m}$.
2. **5 Phân Khu Cảnh Quan:**
   - *Khu 1 (Trung tâm):* Thành 3 vòng xoắn ốc & Điện Ngự Triều đặt tượng vua cao 4.2m.
   - *Khu 2 (Cổng Nam):* Vọng lâu Pháo đài Nỏ Thần và giá tên đồng.
   - *Khu 3 (Tây Nội Thành):* Lầu Vọng Nguyệt & Giếng Ngọc Mị Châu.
   - *Khu 4 (Trung gian):* Rừng trúc Phong Khê đung đưa theo gió (`InstancedMesh` + GPU Wind Shader) & Đường rải lông ngỗng trắng mềm mại (CanvasTexture 256x256, không hạt vuông).
   - *Khu 5 (Cực Nam):* Vách đá Biển Dạ Sơn, sóng gầm gào hoàng hôn, luồng hào quang vàng kim rẽ đôi mặt nước và Thần Kim Quy uy nghiêm nổi lên.

---

### GIAI ĐOẠN 5: ÁNH SÁNG CHIAROSCURO, ÂM THANH 3D & ĐẠO DIỄN TƯƠNG TÁC
1. **Ánh Sáng Chiaroscuro Điện Ảnh:**
   - Cấu hình `renderer.toneMapping = THREE.ACESFilmicToneMapping` (`toneMappingExposure = 1.1`).
   - Chiếu 2 `THREE.SpotLight` hổ phách (`#ffbe55`, `penumbra: 0.7`) rọi thẳng tượng trung tâm và Nỏ Thần. Ánh sáng ngọc bích (`#00f5d4`) từ Giếng Ngọc.
2. **Âm Thanh Không Gian 3D (`THREE.PositionalAudio`):**
   - Định vị tiếng trống đồng Đông Sơn ở tâm phòng, tiếng dây nỏ ngân ở cánh trái, tiếng gió rừng trúc và tiếng sóng biển gầm vang ở hậu cảnh.
   - Tự động `fade-out` mượt mà về 0 khi người xem bước ra khỏi phòng hoặc cõi mở.
3. **Smooth Camera Zoom, Lore Overlay 4 Chương & WebXR:**
   - Click hiện vật kích hoạt `camera-director` thu phóng mượt mà, mở bảng Lore Overlay 4 chương học thuật kèm Quiz trắc nghiệm (bấm `ESC` hoặc `X` đóng).
   - Tích hợp lộ trình thuyết minh tự động `Auto-Tour` và các điểm neo dịch chuyển WebXR VR.

---

### GIAI ĐOẠN 6: VA CHẠM VẬT LÝ, HITBOX RAYCASTER & TỐI ƯU 60+ FPS
1. **Proxy Hitbox & Tối Ưu Raycaster:**
   - Tạo Proxy Hitbox vô hình cho toàn bộ các điểm tương tác chính.
   - Gán `userData.ignoreRaycaster = true` trên 100% hạt VFX, sương mù, mặt nước và đèn trần.
2. **Khóa Box3 Collider:**
   - Đăng ký tường, cột, bệ đá, sa bàn, án thờ, vách đá vào `SpatialRegistry` với `padding = 1.5m`.
3. **Self-Healing Geometry & Production Build:**
   - Hàm `prepGeo(geometry)`: Gọi `computeVertexNormals()`, `computeBoundingBox()`, `computeBoundingSphere()`, quét sạch `NaN`/`Infinity`.
   - Zero-allocation trong vòng lặp animation `update(timeSec)`.
   - Chạy test kiểm thử độc lập và đảm bảo `npm run build` thành công 100% với Exit Code 0.
