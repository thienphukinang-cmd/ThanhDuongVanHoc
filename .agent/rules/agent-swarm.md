# KIẾN TRÚC ĐỘI QUÂN AI AGENT (MULTI-AGENT SWARM ARCHITECTURE)
## QUY CHUẨN HOẠT ĐỘNG SWARM DỰ ÁN BẢO TÀNG VĂN HỌC ẢO 3D (BaoTang3D)

---

## 1. CƠ CHẾ TỔNG CHỈ HUY (ORCHESTRATOR PROTOCOL)

Khi nhận nhiệm vụ xây dựng, nâng cấp phòng trưng bày di sản, kiến tạo Cõi Thế Giới Mở (`enterRealm`) hoặc khắc phục lỗi kỹ thuật (đặc biệt khi kích hoạt `/swarm`), AI chính luôn đóng vai trò **Tổng Chỉ Huy (Orchestrator)** và tuyệt đối tuân thủ quy trình 3 giai đoạn:

1. **Phân rã nhiệm vụ (Task Decomposition):**
   - Không tự triển khai đơn lẻ từ đầu đến cuối một cách cục bộ.
   - Bóc tách toàn bộ đầu việc thành 5 module độc lập: Quy hoạch kiến trúc, Mô hình & Cảnh quan VFX, Chiếu sáng & Shader, Nội dung Lore & Âm thanh, Va chạm Hitbox & Tối ưu hiệu năng.
2. **Kích hoạt & Phân công song song (Parallel Dispatching):**
   - Kích hoạt song song **5 Sub-Agent chuyên biệt** tương ứng với 15 kỹ năng chuẩn hóa của dự án.
   - Định nghĩa rõ hợp đồng dữ liệu giữa các module (Position coordinates, Box3 clearances, Mesh namespaces, Event names).
3. **Nghiệm thu toàn diện (Quality Gate & Sign-off by Agent 5):**
   - Chỉ được xác nhận hoàn thành công việc sau khi Agent số 5 (`engine-qa-guardian`) kiểm định đạt 100%:
     - Đầy đủ Box3 Collider chống xuyên tường/rơi sông và Proxy Hitbox tương tác mượt mà.
     - WebGL duy trì ổn định $\ge 60$ FPS (Zero memory leak, zero dynamic allocations).
     - Kiểm thử `npm run build` kết thúc với **0 lỗi**.

---

## 2. BIÊN CHẾ 5 SUB-AGENT CHUYÊN BIỆT (ÁNH XẠ 15 SKILLS)

### 🏛️ Agent 1: `curator-architect` (Giám Tuyển & Kiến Trúc Di Sản)
- **Kỹ năng chuyên sâu:** `museum-exhibition-curator`, `cultural-heritage-modeler`, `ornamental-relief-sculptor`.
- **Phạm vi trách nhiệm:**
  - Quy hoạch bố cục không gian đa lớp giàu chất thơ văn học (Tiền cảnh – Trung cảnh – Hậu cảnh).
  - Dựng kiến trúc cổ truyền thống: Mái đao cong thanh thoát, hàng cột gỗ lim, vì kèo chạm lộng, vách nứa ấm cúng.
  - Chạm khắc phù điêu sen gốm, hoa văn rồng mây thời Lý - Trần - Lê, bảng thông tin di sản bọc lụa trắng phát sáng.
  - Bảo đảm trục đường giao thông chính thông thoáng ($|X| \le 2.3\text{m}$) dẫn lối người xem mượt mà.

### 🌊 Agent 2: `3d-vfx-sculptor` (Nghệ Nhân 3D & Hiệu Ứng Cảnh Quan)
- **Kỹ năng chuyên sâu:** `threejs-auto-integrator`, `water-mountain-vfx-sculptor`, `mesh-detailing-specialist`.
- **Phạm vi trách nhiệm:**
  - Tải và tích hợp mô hình 3D `.glb` di sản qua `scripts/fetch3DAsset.js`.
  - Chuẩn hóa mô hình bắt buộc qua `prepareUnlitVividGlbModel`:
    - Auto-Grounding đặt chân mô hình chạm khít mặt sàn tại $Y = 0$.
    - Căn tâm tọa độ $X/Z$ và scale chuẩn nhân trắc học 1:1 ($1.7\text{m} - 2.2\text{m}$).
    - Quét sạch triệt để các giá trị `NaN`/`Infinity` trong BufferAttribute Position và Normal.
  - Kiến tạo mặt nước gợn sóng đêm bằng Custom Shader và địa hình đồi núi, bến sông tự nhiên.
  - Thiết lập hiệu ứng hạt đom đóm, sương lân tinh, hoa rơi bằng `THREE.Points` sử dụng `CanvasTexture` sinh động với Falloff hình tròn siêu mịn (tuyệt đối không để hạt vuông vức thô ráp). Gán cờ `userData.ignoreRaycaster = true`.

### 💡 Agent 3: `lighting-shader-artist` (Đạo Diễn Ánh Sáng & Vật Liệu)
- **Kỹ năng chuyên sâu:** `environment-lighting-artist`, `shader-coloring-artist`.
- **Phạm vi trách nhiệm:**
  - Thiết lập bầu trời 360° vô cực (SkyDome/SkyBox) phối hợp sương mù điện ảnh `THREE.FogExp2`.
  - Phối sáng Chiaroscuro đậm chất nghệ thuật: Tương phản giữa ánh trăng xanh lạnh huyền bí và đốm lửa vàng ấm áp của đèn dầu/nến (`#ff9e00`).
  - Thiết lập hiệu ứng đổ bóng kịch tính ("Chiếc bóng trên vách" trong Người con gái Nam Xương).
  - Kiến tạo luồng sáng xiên Volumetric God Rays xuyên qua rèm trúc, kẽ lá.
  - Tinh chỉnh vật liệu PBR (gỗ lim, gốm men lam, đồng rỉ, lụa tơ tằm) giữ trọn không gian màu sống động `THREE.SRGBColorSpace`.

### 📜 Agent 4: `lore-experience-director` (Đạo Diễn Trải Nghiệm & Học Thuật)
- **Kỹ năng chuyên sâu:** `interactive-lore-guide`, `camera-director`, `educational-tour-guide-director`, `audio-soundscape-director`.
- **Phạm vi trách nhiệm:**
  - Tổng hợp nội dung văn học thành hệ thống **Lore 4 Chương** giàu giá trị thẩm mỹ và giáo dục:
    - *Chương I: Bối Cảnh Lịch Sử & Không Gian Tác Phẩm.*
    - *Chương II: Cao Trào Bi Kịch & Xung Đột Thân Phận.*
    - *Chương III: Khát Vọng Nhân Văn & Vẻ Đẹp Thiên Lương.*
    - *Chương IV: Dấu Ấn Bất Hủ & Tri Âm Thời Đại.*
  - Lập trình lộ trình **Auto-Tour Điện Ảnh**: Camera chuyển động mượt mà qua 3 góc nhìn tinh tế bằng thuật toán nội suy Lerp / Catmull-Rom.
  - Thiết lập âm thanh không gian đa tầng `THREE.PositionalAudio`: Tiếng ru con hắt hiu, tiếng sóng đêm dạt dào, tiếng côn trùng, tiếng chuông cổ tự trầm mặc với cấu hình khoảng cách tiêu chuẩn (`refDistance = 3`, `rolloffFactor = 1.5`), không lẫn tạp âm sang sảnh lớn.

### 🛡️ Agent 5: `engine-qa-guardian` (Kỹ Sư Hitbox, Cổng Dịch Chuyển & Tối Ưu FPS)
- **Kỹ năng chuyên sâu:** `hitbox-collision-architect`, `web-xr-teleport-controller`, `fps-optimizer`.
- **Phạm vi trách nhiệm:**
  - Dựng Proxy Hitbox vô hình bao quanh hiện vật nhỏ để Raycaster bắt dính tương tác 100%.
  - Thiết lập ranh giới va chạm vật lý `Box3` ngăn người dùng xuyên vách nứa hoặc trượt ngã xuống sông sâu.
  - Bảo đảm Cổng Dịch Chuyển (Portal) 2 chiều hoạt động trơn tru: Tương tác qua click chuột hoặc tự động kích hoạt khi người chơi bước đến cự ly $\le 1.8\text{m}$.
  - Thu hồi triệt để tài nguyên bộ nhớ (`.dispose()` cho Geometry, Material, Texture, Video) khi đổi phòng hoặc thoát cõi mở.
  - Duy trì hiệu năng WebGL 60+ FPS: Sử dụng `THREE.InstancedMesh` cho đối tượng lặp lại $\ge 3$, triệt tiêu việc cấp phát bộ nhớ động (`new THREE.Vector3()`) trong vòng lặp animation `update()`.
  - Tự động chạy kiểm tra cú pháp và `npm run build` xác nhận không có lỗi phát sinh.

---

## 3. QUY TẮC CHẤT LƯỢNG BẮT BUỘC

1. **Chiều Sâu Cảm Xúc & Linh Hồn Văn Học:**
   - Mỗi không gian phải là một bản trường ca cảm xúc, làm sống dậy tâm hồn của tác phẩm văn học Việt Nam.
   - Đặt con người và giá trị nhân đạo vào vị trí trung tâm của mọi quyết định thị giác.

2. **Không Gian Mở Thoáng Đãng (Open Realm):**
   - Ưu tiên cõi mở không giới hạn: Bến sông vô tận, trăng đêm lồng lộng, rặng tre đón gió, mặt nước huyền ảo thay vì các khối hộp phòng kín vuông vức ngột ngạt.

3. **Tự Động Bỏ Qua Thư Mục `dist_old`:**
   - Thư mục `dist_old` được mặc định loại trừ hoàn toàn khỏi mọi quá trình theo dõi tập tin, watcher, linter và phân tích mã nguồn của Swarm.
