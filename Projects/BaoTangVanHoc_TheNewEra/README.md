# BẢO TÀNG VĂN HỌC - THE NEW ERA
## HỆ THỐNG ĐIỀU KHIỂN DUAL CAMERA (FIRST-PERSON WALKER & FREECAM)

### 1. Giới Thiệu Module CameraController
File: [`CameraController.js`](file:///d:/BaoTang3D/Projects/BaoTangVanHoc_TheNewEra/src/controls/CameraController.js) tích hợp `PointerLockControls` chuẩn Three.js, kết nối trực tiếp với [`cameraManager.js`](file:///d:/BaoTang3D/Projects/BaoTangVanHoc_TheNewEra/src/controls/cameraManager.js) và [`main.js`](file:///d:/BaoTang3D/Projects/BaoTangVanHoc_TheNewEra/src/main.js).

---

### 2. Hai Chế Độ Điều Khiển (Dual Camera Modes)

#### CHẾ ĐỘ 1: First-Person Walker (Đi bộ tầm mắt 1.8m)
* **Phím điều khiển**:
  * `W / A / S / D`: Di chuyển tiến / lùi / trái / phải theo mặt phẳng ngang.
  * `Di chuột`: Điều hướng góc nhìn 360 độ (chuột bị khóa PointerLock).
  * `Space`: Nhảy nhẹ khi đang ở trên mặt sàn.
* **Vật lý & Giới hạn va chạm**:
  * Trọng lực tự nhiên: $g = 24\text{m/s}^2$.
  * Cao độ mắt khóa cứng tại $Y = 1.8\text{m}$ so với mặt sàn đang đứng (hỗ trợ sàn Tầng 1 $0\text{m}$, Tầng 2 $10\text{m}$, Tầng 3 $20\text{m}$).
  * Giới hạn sàn tuyệt đối: $Y \ge 1.8\text{m}$ (không bao giờ rơi xuống vực thẳm).

#### CHẾ ĐỘ 2: Freecam (Spectator / Fly Mode)
* **Phím điều khiển**:
  * `W / A / S / D`: Bay tự do 3D theo đúng hướng vector mắt nhìn.
  * `Space`: Bay thẳng lên cao (+Y / Ascend).
  * `Shift`: Hạ thẳng xuống (-Y / Descend).
* **Vật lý**:
  * Bỏ qua trọng lực ($v_y = 0$).
  * Tắt mọi va chạm: Cho phép camera bay qua trần nhà, giếng trời, đỉnh mái vòm $Y = 40\text{m}$ và chui vào mọi ngóc ngách để kiểm tra hình khối.

---

### 3. Cơ Chế Chuyển Đổi (Toggle Mechanism)
* **Phím nóng `V`**: Chuyển đổi qua lại tức thì giữa Walker và Freecam.
* **Nút bấm trên HUD**: `🔄 Đổi Mode (Phím V)` và `🔒 Khóa Chuột (FPS)` trên bảng điều khiển.
* **Console Log thời gian thực**:
  * `Mode: First-Person Walker Activated`
  * `Mode: Freecam Activated`
* **Chỉ dẫn HUD dưới chân màn hình**: Hiển thị rõ chế độ đang bật, hướng dẫn phím bấm và trạng thái khóa chuột.

---

### 4. Quy Tắc Tự Động Kiểm Tra & Lập Trình Phòng Ngừa
* Toàn bộ sự kiện bàn phím, con trỏ chuột, tính toán vector và vòng lặp `update(delta)` đều được bao bọc trong `try...catch` và sử dụng toán tử an toàn `?.`, `??`.
* Tốc độ di chuyển nhân trực tiếp với `delta time` giúp chuyển động mượt mà ở mọi mức FPS.
* Đã vượt qua bước kiểm thử bắt buộc `npx vite build` (36 modules, 0 lỗi).
