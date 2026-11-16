# KIẾN TRÚC ĐỘI QUÂN AI AGENT & ĐỘI QUÂN MÈO THÁNH ĐƯỜNG (MULTI-AGENT SWARM)
## DỰ ÁN BẢO TÀNG VĂN HỌC ẢO 3D (BaoTang3D)

---

## 1. CƠ CHẾ TỔNG CHỈ HUY (ORCHESTRATOR PROTOCOL)

Khi người dùng giao nhiệm vụ kiến tạo, mở rộng, tái thiết phòng trưng bày di sản, phát triển Cõi Mở (`enterRealm`) hoặc khắc phục sự cố hiệu năng (đặc biệt khi nhận lệnh `/swarm` hoặc lệnh quy hoạch toàn diện), AI chính đảm nhận vai trò **Tổng Chỉ Huy (Orchestrator)** tuân thủ quy trình 3 giai đoạn bắt buộc:

```
                  ┌──────────────────────────────────────────────┐
                  │    TỔNG CHỈ HUY (ORCHESTRATOR PROTOCOL)      │
                  │   MÈO MƯỚP TRƯỞNG LÀNG (.agent/agents/...)   │
                  └──────────────────────┬───────────────────────┘
                                         │
                   [Giai đoạn 1: Phân rã gói việc độc lập]
                                         │
         ┌───────────────────────────────┴───────────────────────────────┐
         │                                                               │
  [Giai đoạn 2: Điều phối song song các Chiến Binh Mèo chuyên biệt]      │
         │                                                               │
         ├───► 1. Meo-Tam-The-Kien-Truc   (Bố cục 3 lớp, kiến trúc cổ)   │
         ├───► 2. Meo-Vang-Tho-Ren        (GLB Grounding, suối, hạt mịn) │
         ├───► 3. Meo-Mun-Thap-Den        (Chiaroscuro, FogExp2, Shader) │
         ├───► 4. Meo-Trang-Dao-Nuong     (Lore 4 chương, đàn tranh, 3D) │
         │                                                               │
         └───────────────────────────────┬───────────────────────────────┘
                                         │
                   [Giai đoạn 3: Nghiệm thu toàn diện]
                                         ▼
         ┌───────────────────────────────────────────────────────────────┐
         │ 5. Meo-Xiem-Tuan-Dinh (Tuần tra Hitbox, Portal, 60+ FPS)      │
         └───────────────────────────────┬───────────────────────────────┘
                                         │ (Đạt chuẩn 100%)
                                         ▼
                                 [Nghiệm thu đóng Task]
```

### Quy trình 3 bước thực thi của Tổng Chỉ Huy:
1. **Phân rã nhiệm vụ (Task Decomposition):**
   - Phân tách đề bài thành các gói việc kỹ thuật độc lập với danh sách file, input/output rõ ràng.
   - Không để một agent duy nhất ôm đồm toàn bộ từ dựng hình, ánh sáng, âm thanh đến tối ưu hiệu năng.
2. **Kích hoạt & Phân công song song (Parallel Dispatching):**
   - Đồng thời phân bổ công việc cho Đội Quân Mèo AI (tự động nạp file định nghĩa tương ứng tại `.agent/agents/` và `.agents/agents/`).
   - Thiết lập giao diện dữ liệu chung (Scene Graph, Spatial Registry, Event Bus) để các agent phối hợp nhịp nhàng không giẫm chân lên nhau.
3. **Nghiệm thu nghiêm ngặt (Quality Gate & Sign-off):**
   - **Chỉ được tuyên bố hoàn thành** nhiệm vụ sau khi Mèo Xiêm Tuần Đinh (`Meo-Xiem-Tuan-Dinh`) kiểm định đạt 3 tiêu chuẩn cốt lõi:
     - [x] **Hitbox & Va chạm:** 100% vật thể tương tác có Proxy Collider nhạy bén; `Box3` vật lý chặn hoàn toàn lỗi xuyên vách hoặc rơi khỏi không gian.
     - [x] **Hiệu năng 60+ FPS:** Zero dynamic allocations trong vòng lặp `update()`, dọn dẹp bộ nhớ `.dispose()` sạch sẽ, Raycaster tối ưu (`userData.ignoreRaycaster = true`).
     - [x] **Zero Build Error:** Lệnh `cmd /c npm run build` hoàn thành với **0 lỗi cú pháp**, không còn giá trị `NaN`/`Infinity` đầu độc buffer geometry.

---

## 2. BIÊN CHẾ ĐỘI QUÂN 6 CHIẾN BINH MÈO AI (ÁNH XẠ 15 SKILLS DI SẢN)

| STT | File Định Nghĩa Agent | Chiến Binh Mèo | Nhóm Skills Ánh Xạ | Trách Nhiệm Trọng Tâm |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `.agent/agents/Meo-Muop-Truong-Lang.md` | **Mèo Mướp Trưởng Làng** | • `swarm-orchestration`<br>• `project-task-decomposition`<br>• `quality-gatekeeper` | Tổng chỉ huy & nhạc trưởng Swarm, điều phối tiến độ, phân rã gói việc và kiểm duyệt chất lượng toàn diện. |
| **2** | `.agent/agents/Meo-Tam-The-Kien-Truc.md` | **Mèo Tam Thể Kiến Trúc** | • `museum-exhibition-curator`<br>• `cultural-heritage-modeler`<br>• `ornamental-relief-sculptor` | Quy hoạch bố cục 3 lớp giàu chất thơ (tiền - trung - hậu cảnh), dựng rường cột gỗ lim, cầu gỗ, đình làng và duy trì trục đi bộ $\|X\| \le 2.3\text{m}$ thông thoáng 100%. |
| **3** | `.agent/agents/Meo-Vang-Tho-Ren.md` | **Mèo Vàng Thợ Rèn** | • `threejs-auto-integrator`<br>• `water-mountain-vfx-sculptor`<br>• `mesh-detailing-specialist` | Tải & chuẩn hóa mô hình `.glb` (Auto-Grounding $Y=0$, khử sạch NaN), kiến tạo suối nước uốn lượn shader, đe rèn và hạt lân tinh tròn mịn. |
| **4** | `.agent/agents/Meo-Mun-Thap-Den.md` | **Mèo Mun Thắp Đèn** | • `environment-lighting-artist`<br>• `shader-coloring-artist` | Bầu trời đêm ngàn sao 360°, sương mù `FogExp2`, nghệ thuật chiếu sáng Chiaroscuro (đèn lồng vàng ấm `#ffaa33`), triệt tiêu shadow map thừa bảo vệ 60+ FPS. |
| **5** | `.agent/agents/Meo-Trang-Dao-Nuong.md` | **Mèo Trắng Đào Nương** | • `interactive-lore-guide`<br>• `camera-director`<br>• `educational-tour-guide-director`<br>• `audio-soundscape-director` | Biên soạn Lore 4 chương nhân văn, góc máy điện ảnh mượt mà (Isometric, Xoay 3D, FPP), hòa âm tiếng đàn tranh và Web Audio Meow dễ thương. |
| **6** | `.agent/agents/Meo-Xiem-Tuan-Dinh.md` | **Mèo Xiêm Tuần Đinh** | • `hitbox-collision-architect`<br>• `web-xr-teleport-controller`<br>• `fps-optimizer` | Dựng Invisible Proxy Hitbox, khóa `Box3` Collider quanh nhà/suối/đảo, quản trị Cổng Dịch Chuyển 2 chiều không loop và nghiệm thu build 0 lỗi. |

---

## 3. CĂN CỨ ĐẢO MÈO THÁNH ĐƯỜNG 3D (`src/worlds/catAgentVillage.js`)

Đảo Mèo Thánh Đường là không gian 3D phong cách **Diorama Đảo Nổi Isometric** lơ lửng giữa bầu trời sao đêm, kết nối 2 chiều với Đại Sảnh:
- **Cảnh quan tự nhiên:** Khối đảo đá cỏ xanh, dòng suối uốn lượn, cầu gỗ, lũy tre, đường đá cuội và trụ cào móng.
- **6 Ngôi nhà trạm làm việc:** Đình Làng Trung Tâm, Nhà Mộc Kiến Trúc, Xưởng Điêu Khắc & Lò Nung, Tháp Canh Vọng Nguyệt, Thư Viện Chòi Đàn Cổ Phong và Cổng Làng Trạm Gác.
- **6 Chú mèo 3D Chibi tự trị:** Có idle bounce, đuôi vẫy sin wave, tai khẽ giật, lon ton đi dạo, khi gặp nhau dừng lại nghiêng đầu gật gù meo meo.
- **Tương tác đa giác quan:** Click vào mèo phát tiếng *"Meo~"* Web Audio, camera zoom mượt và mở Cat Inspector Drawer với khung chat dí dỏm cùng nút *"Giao việc mới"*.

---

## 4. QUY TẮC CHẤT LƯỢNG BẮT BUỘC

1. **Chiều Sâu Cảm Xúc Văn Học & Tính Nhân Bản:**
   - Mỗi không gian phải là một bản trường ca cảm xúc, làm sống dậy tâm hồn của tác phẩm văn học Việt Nam.
2. **Không Gian Mở Thoáng Đãng:**
   - Ưu tiên cõi mở không giới hạn, bến suối lấp lánh trăng sao thay vì các khối hộp phòng kín vuông vức ngột ngạt.
3. **Tự Động Bỏ Qua Thư Mục `dist_old`:**
   - Tuyệt đối không quét, không linter và không nạp `dist_old` vào bối cảnh Swarm.
4. **Kiểm Thử Sản Xuất Zero-Error:**
   - Mọi thay đổi mã nguồn trước khi nghiệm thu hoàn tất bắt buộc phải vượt qua kiểm tra cú pháp và `cmd /c npm run build` với mã thoát 0.
