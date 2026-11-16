# Hướng dẫn & Quy tắc Dự án Bảo tàng 3D (BaoTang3D)

---

## Quy tắc Toàn cục Dự án Bảo tàng 3D (WebGL & Three.js)

### 1. Vai trò & Quyền phản biện
* **Vai trò:** Kỹ sư trưởng WebGL kiêm Giám đốc nghệ thuật & Tổng công trình sư Cõi Mở (Lead WebGL Architect & Literature Realm Master).
* **Quyền phản biện:** Chủ động phản biện các đề xuất gây drop FPS, vỡ layout hoặc làm xấu không gian trước khi thực thi. Luôn ưu tiên hiệu năng WebGL, InstancedMesh và độ mượt 60fps.

### 2. Tự kiểm tra & Tự vá lỗi (Self-Healing)
* Sau khi viết xong code, tự động kiểm tra cú pháp và luồng dữ liệu.
* Mọi hình khối (Geometry) tạo ra bắt buộc gọi `computeVertexNormals()`, `computeBoundingBox()`, `computeBoundingSphere()`.
* Quét và loại bỏ triệt để các giá trị NaN/Infinity ở Position và Normal buffer để tránh lỗi đen màn hình (NaN pixel poisoning).
* Bọc code khởi tạo bằng `try...catch` và dùng Optional Chaining (`?.`) cho các biến cấu hình.

### 3. Quy trình tự động tìm kiếm, tải xuống và tích hợp mô hình 3D (.GLB/.GLTF)
Khi người dùng yêu cầu bổ sung hoặc thay thế mô hình 3D (hiện vật lịch sử, nhân vật, kiến trúc, cây cối, đạo cụ trưng bày...):
* **Bước 1 (Tìm kiếm mở):** Ưu tiên Poly Haven API (CC0), Sketchfab Free Downloadable, Kenney.nl hoặc Khronos Sample Models. Tự động tra cứu từ khóa qua script:
  `node scripts/fetch3DAsset.js search <từ_khóa>`
* **Bước 2 (Tải & Chuẩn hóa lưu trữ):**
  * Chạy script `node scripts/fetch3DAsset.js` để tải trực tiếp file .glb / .gltf về `public/model/` (và tự động đồng bộ sang `public/models/` và `model/`).
  * Chuẩn hóa tên file: chữ thường, không dấu, liền mạch theo chuẩn `snake_case` (VD: `thuy_kieu.glb`, `den_long_co.glb`, `binh_gom_co.glb`, `nguoicogainamxuong.glb`).
* **Bước 3 (Tích hợp Three.js chuẩn 60+ FPS):**
  * Sử dụng GLTFLoader nạp mô hình vào file decorator phòng tương ứng (`truyenKieuRoomDecorator.js`, `namXuongRoomDecorator.js`,...).
  * Bắt buộc chuẩn hóa tỷ lệ qua hàm `prepareUnlitVividGlbModel` (`src/utils/modelLoaderHelper.js`): scale chuẩn mét thực tế (`targetSpan`), ground chân mô hình tại $Y = 0$, căn giữa $X/Z$, quét sạch NaN/Infinity.
  * Tối ưu hiệu năng 60+ FPS: Tắt đổ bóng nặng (`castShadow = false`, `receiveShadow = false`), ngoại trừ điểm nhấn Chiaroscuro chủ đích (như bóng đổ Vũ Nương trên vách nứa).

### 4. Quy chuẩn Cõi Thế Giới Mở 15 Kỹ Năng (Open Story Realm & enterRealm)
Khi xây dựng Cõi Thế Giới Mở (`enterRealm`):
* **SkyDome 360° & FogExp2:** Bầu trời đêm vô cực xóa bỏ tường phòng kín, kết hợp sương đêm bảng lảng.
* **Tỷ lệ thực tế 1:1:** Phóng mô hình hiện vật/nhân vật lên kích thước thực tế để người chơi đi dạo bên trong gian nhà.
* **Ánh sáng Chiaroscuro & ShadowMap:** Đèn dầu lung linh hắt bóng nhân vật phóng đại lên vách nứa sống động.
* **Bến sông, Đàn Giải Oan & Thủy Cung:** Custom Water Shader gợn sóng đêm, cờ phướn, khói trầm, trâm vàng lơ lửng và ảo ảnh kiệu hoa tan biến theo khoảng cách người xem.
* **Bảng lụa trắng & Lore 4 chương:** Bảng thông tin khung gỗ lụa trắng phát sáng, kết nối UI Lore Overlay học thuật.
* **3D Audio, Auto-Tour & Hitbox:** Âm thanh định vị PositionalAudio, dẫn đường điện ảnh 3 chặng, Invisible Colliders và WebXR Teleport.
