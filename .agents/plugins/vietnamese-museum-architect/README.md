# Vietnamese Literature 3D Museum & AI Cinema Creator (Plugin)

## 📌 Giới Thiệu
Plugin đóng gói hoàn chỉnh hệ sinh thái **AI Agent Kỹ Sư Trưởng WebGL kiêm Đạo Diễn Điện Ảnh Văn Học AI** (`heritage_cinema_architect`) cho dự án **Bảo Tàng Văn Học Ảo 3D (BaoTang3D)**.

Agent làm chủ **Hệ Thống Sáng Tạo Kép (Dual-Track Creative Pipeline)**:
1. **Pipeline A (Kiến trúc Bảo tàng 3D WebGL):** Quy hoạch không gian, mô hình PBR Draco, ánh sáng Chiaroscuro, Cổng dịch chuyển Portal, âm thanh 3D PositionalAudio, hệ thống Lore học thuật 4 chương và WebXR.
2. **Pipeline B (Điện ảnh Văn học AI):** Chuyển thể kịch bản thơ, tạo hình nhân vật nhất quán (Character Consistency), lồng tiếng AI cảm xúc cao, phối khí ngũ cung cổ phong và tích hợp Video 3D Texture vào phòng trưng bày.

---

## 📂 Cấu Trúc Đóng Gói (Package Structure)

```text
.agents/plugins/vietnamese-museum-architect/
├── plugin.json                              # Khai báo manifest định danh plugin, version, skills, agents, rules
├── README.md                                # Tài liệu hướng dẫn sử dụng và vận hành
├── agents/
│   └── heritage_cinema_architect.md         # Khai báo Agent độc lập với đầy đủ vai trò, công cụ và quy trình
├── skills/
│   ├── museum-architect/
│   │   └── SKILL.md                         # Sổ tay kỹ thuật 4 bước dựng bảo tàng WebGL 60+ FPS
│   └── ai-cinema-director/
│       └── SKILL.md                         # Sổ tay kỹ thuật 4 bước sản xuất phim văn học AI & 3D Video Texture
└── rules/
    └── AGENTS.md                            # Quy tắc bất di bất dịch về hiệu năng, an toàn hình học & self-healing
```

---

## 🚀 Cách Thức Kích Hoạt & Sử Dụng Agent

### 1. Kích hoạt trong Hội thoại (Prompt Direct)
Bạn có thể ra lệnh trực tiếp cho AI trong hội thoại Antigravity:
* *"Hãy quy hoạch và dựng phòng trưng bày 3D mới cho tác phẩm [Tên tác phẩm] chuẩn 60+ FPS."*
* *"Hãy viết kịch bản phân cảnh phim văn học AI cho phân đoạn [Trích đoạn thơ/văn xuôi] kèm gợi ý phối khí cổ phong."*
* *"Hãy tạo màn chiếu Video 3D Texture và bảng Lore học thuật 4 chương cho phòng [Tên tác phẩm]."*

### 2. Ủy quyền tác vụ (Subagent Delegation)
Khi thực hiện các tác vụ phức tạp, hệ thống có thể gọi Subagent:
```json
{
  "TypeName": "heritage_cinema_architect",
  "Role": "Lead Heritage WebGL Architect & Cinema Director",
  "Prompt": "Quy hoạch và tích hợp phòng trưng bày mới đạt chuẩn WebGL 60+ FPS..."
}
```

---

## 🛠 Bộ Công Cụ Tự Động Hóa (CLI Toolkit)

Hệ thống đi kèm bộ script tự động hóa kiểm tra và giám sát trạng thái bảo tàng:

```bash
# Kiểm tra ma trận trạng thái toàn bộ các phòng trưng bày & tài nguyên video/infographic
node scripts/run_heritage_pipeline.js status

# Tự động quét và kiểm chứng cú pháp (Self-Healing Syntax Verification) toàn bộ mã nguồn
node scripts/run_heritage_pipeline.js verify

# Liệt kê danh sách các phòng trưng bày hiện có
node scripts/run_heritage_pipeline.js list-rooms
```

---

## 🛡 Bộ Quy Tắc Bất Di Bất Dịch (Zero-Tolerance Rules)
- **Hiệu năng 60+ FPS:** Bắt buộc dùng `THREE.InstancedMesh` cho vật thể lặp lại $\ge 3$. Luôn gán `userData.ignoreRaycaster = true` cho VFX/hạt/mặt nước.
- **Zero-allocation:** Không cấp phát bộ nhớ động (`new THREE.Vector3()`, `new THREE.Box3()`) trong vòng lặp `update()`.
- **An toàn hình học (Zero NaN Poisoning):** Mọi Geometry phải gọi `computeVertexNormals()`, `computeBoundingBox()`, `computeBoundingSphere()` và quét sạch `NaN`/`Infinity`.
- **Chuẩn hóa tỷ lệ:** Nạp mô hình 3D qua `prepareUnlitVividGlbModel` (`targetSpan`, $Y=0$, căn giữa $X/Z$).
- **Trục đường đi thông thoáng:** Giữ trống tuyệt đối $|X| \le 2.3\text{m}$ trên thảm đỏ trung tâm.
