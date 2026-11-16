import os
import re

template_path = r'd:/BaoTang3D/.agent/skills/guizang-ppt-skill/assets/template.html'
output_path = r'd:/BaoTang3D/Thuyet-Trinh-Bao-Tang.html'

with open(template_path, 'r', encoding='utf-8') as f:
    template = f.read()

# Replace Title
template = re.sub(r'<title>.*?</title>', '<title>Giới thiệu Bảo tàng Trực tuyến Thánh Đường Văn Học · 7 Slides Presentation</title>', template)

# Custom Styles to inject before </style>
custom_styles = """
/* ============================================================
   CUSTOM STYLES FOR 7 SLIDES (STYLE A EDITORIAL MAGAZINE)
   ============================================================ */
:root {
  --color-gold: #D4AF37;
  --color-gold-light: #F3E5AB;
  --color-cyan: #00F5D4;
  --color-dark-card: rgba(16, 24, 36, 0.88);
  --color-border-gold: rgba(212, 175, 55, 0.55);
}

.slide .kicker {
  margin-top: 2.0vh;
  margin-bottom: 0.5vh;
  display: block;
  letter-spacing: 0.12em;
}

/* Slide 1 Cover Enhancements */
.cover-layout-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 2.5vw;
  align-items: center;
  margin-top: 3.0vh;
  height: 64vh;
}
.cover-left-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.8vh;
}
.cover-title-mega {
  font-family: var(--font-display);
  font-size: min(4.2vw, 58px);
  font-weight: 800;
  line-height: 1.12;
  color: #ffffff;
  letter-spacing: -0.01em;
  margin: 0;
  text-shadow: 0 4px 20px rgba(0,0,0,0.6);
}
.cover-title-mega span {
  color: var(--color-gold);
}
.cover-sub-lead {
  font-family: var(--font-serif);
  font-size: min(1.4vw, 21px);
  font-style: italic;
  color: var(--color-gold-light);
  line-height: 1.45;
  margin: 0;
}
.cover-desc-body {
  font-family: var(--font-sans);
  font-size: min(0.95vw, 15px);
  color: rgba(226, 232, 240, 0.88);
  line-height: 1.6;
  max-width: 42em;
  margin: 0;
}
.cover-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8vw;
  margin-top: 1.5vh;
}
.cover-tag-pill {
  font-family: var(--font-mono);
  font-size: 0.78vw;
  padding: 0.6vh 0.9vw;
  border-radius: 999px;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: var(--color-gold-light);
  font-weight: 600;
  letter-spacing: 0.05em;
}
.cover-right-hero-frame {
  width: 100%;
  height: 100%;
  max-height: 58vh;
  border-radius: 12px;
  overflow: hidden;
  border: 1.8px solid var(--color-border-gold);
  box-shadow: 0 20px 50px -15px rgba(0,0,0,0.8), 0 0 30px rgba(212, 175, 55, 0.2);
  background: #000;
}
.cover-right-hero-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Slide 2 Journey Flow */
.journey-compare-grid {
  display: grid;
  grid-template-columns: 1fr 48px 1fr;
  align-items: center;
  gap: 1.5vw;
  margin-top: 2.8vh;
  height: 60vh;
}
.journey-card {
  background: var(--color-dark-card);
  border: 1.5px solid var(--color-border-gold);
  border-radius: 10px;
  padding: 1.8vh 1.4vw 2.2vh 1.4vw;
  display: flex;
  flex-direction: column;
  gap: 1.2vh;
  height: 100%;
  justify-content: space-between;
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 36px -12px rgba(0,0,0,0.6);
  transition: transform 0.25s ease, border-color 0.25s ease;
}
.journey-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-cyan);
}
.journey-card-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(212, 175, 55, 0.35);
  background: #000;
}
.journey-card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.journey-arrow-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-gold);
  font-size: 2.2vw;
  font-weight: bold;
  user-select: none;
  animation: pulseArrow 2.2s infinite ease-in-out;
  text-shadow: 0 0 16px rgba(212, 175, 55, 0.7);
}

/* Slide 3 Two Themed Rooms */
.rooms-grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.2vw;
  margin-top: 2.8vh;
  height: 60vh;
}
.room-card-box {
  background: var(--paper-2);
  border-top: 3.5px solid var(--accent);
  border-radius: 8px;
  padding: 2.0vh 1.5vw;
  display: flex;
  flex-direction: column;
  gap: 1.2vh;
  box-shadow: 0 8px 24px -8px rgba(0,0,0,0.08);
  height: 100%;
  justify-content: space-between;
}
.room-card-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #000;
}
.room-card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Slide 4 Cat Island Multi-Agent */
.cat-layout-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 2.2vw;
  align-items: stretch;
  margin-top: 2.5vh;
  height: 61vh;
}
.cat-island-frame {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1.8px solid var(--color-border-gold);
  box-shadow: 0 16px 40px -12px rgba(0,0,0,0.7), 0 0 24px rgba(0, 245, 212, 0.2);
  background: #000;
}
.cat-island-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cat-roster-list {
  background: var(--color-dark-card);
  border: 1px solid var(--color-border-gold);
  border-radius: 12px;
  padding: 2.0vh 1.6vw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.8vh;
  backdrop-filter: blur(12px);
}
.cat-agent-item {
  display: flex;
  align-items: flex-start;
  gap: 0.8vw;
  padding-bottom: 0.7vh;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
}
.cat-agent-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.cat-avatar-badge {
  font-size: 1.3vw;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 0.1vh;
}
.cat-agent-name {
  font-family: var(--font-display);
  font-size: 0.98vw;
  font-weight: 700;
  color: var(--color-gold);
  line-height: 1.2;
}
.cat-agent-role {
  font-family: var(--font-mono);
  font-size: 0.72vw;
  color: var(--color-cyan);
  margin-left: 0.4vw;
  font-weight: 500;
}
.cat-agent-desc {
  font-family: var(--font-sans);
  font-size: 0.78vw;
  color: rgba(226, 232, 240, 0.85);
  line-height: 1.35;
  margin: 0.2vh 0 0 0;
}

/* Slide 5 Pipeline 4 Steps */
.steps-grid-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.4vw;
  margin-top: 3.0vh;
  width: 100%;
}
.step-card-box {
  background: var(--paper-2);
  border-top: 3.5px solid var(--accent);
  border-radius: 8px;
  padding: 2.4vh 1.3vw;
  display: flex;
  flex-direction: column;
  gap: 1.2vh;
  box-shadow: 0 6px 20px -6px rgba(0,0,0,0.08);
  position: relative;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.step-card-box:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px -6px rgba(0,0,0,0.12);
}
.step-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.step-badge-text {
  font-family: var(--font-mono);
  font-size: 0.85vw;
  font-weight: 700;
  color: var(--accent-ink);
  letter-spacing: 0.08em;
}
.step-icon-circle {
  width: 2.8vw;
  height: 2.8vw;
  border-radius: 50%;
  background: var(--paper);
  border: 1.5px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3vw;
  color: var(--accent-ink);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.step-card-title {
  font-family: var(--font-display);
  font-size: 1.08vw;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.28;
  margin: 0;
}
.step-card-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8vh;
}
.step-card-list li {
  font-family: var(--font-sans);
  font-size: 0.84vw;
  color: var(--text-body);
  line-height: 1.45;
  padding-left: 1.2em;
  position: relative;
}
.step-card-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--accent);
  font-weight: bold;
}

/* Slide 6 Pillars / Values */
.pillars-grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.0vw;
  margin-top: 3.0vh;
  width: 100%;
}
.pillar-card {
  background: var(--paper-2);
  border-top: 3.5px solid var(--accent);
  border-radius: 8px;
  padding: 3.0vh 1.8vw;
  display: flex;
  flex-direction: column;
  gap: 1.4vh;
  box-shadow: 0 8px 24px -8px rgba(0,0,0,0.08);
}
.pillar-number {
  font-family: var(--font-display);
  font-size: 2.6vw;
  font-weight: 800;
  color: var(--accent-ink);
  line-height: 1;
}
.pillar-title {
  font-family: var(--font-display);
  font-size: 1.25vw;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.3;
}
.pillar-desc {
  font-family: var(--font-sans);
  font-size: 0.88vw;
  color: var(--text-body);
  line-height: 1.55;
  margin: 0;
}

/* Slide 7 Closing CTA */
.cta-layout-grid {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 2.2vw;
  margin-top: 2.6vh;
  align-items: stretch;
  width: 100%;
}
.cta-left-panel {
  background: var(--color-dark-card);
  border: 1px solid var(--color-border-gold);
  border-radius: 12px;
  padding: 2.8vh 2.2vw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 36px -12px rgba(0,0,0,0.7);
}
.cta-heading {
  font-family: var(--font-display);
  font-size: 1.4vw;
  font-weight: 700;
  color: var(--color-gold);
  line-height: 1.3;
  margin: 0 0 1.2vh 0;
}
.cta-lead-text {
  font-family: var(--font-sans);
  font-size: 0.95vw;
  color: rgba(226, 232, 240, 0.94);
  line-height: 1.55;
  margin: 0 0 2vh 0;
}
.cta-feature-list {
  display: flex;
  flex-direction: column;
  gap: 1.1vh;
  margin-bottom: 2.5vh;
}
.cta-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.8vw;
  font-family: var(--font-sans);
  font-size: 0.86vw;
  color: rgba(226, 232, 240, 0.88);
  line-height: 1.45;
}
.cta-feature-bullet {
  color: var(--color-cyan);
  font-weight: bold;
  font-size: 1.05vw;
  flex-shrink: 0;
  line-height: 1.3;
}
.url-highlight-box {
  background: #090e18;
  border: 1.8px solid var(--color-cyan);
  border-radius: 9px;
  padding: 1.8vh 1.6vw;
  display: flex;
  flex-direction: column;
  gap: 0.7vh;
  box-shadow: 0 0 24px rgba(0, 245, 212, 0.2);
}
.url-box-label {
  font-family: var(--font-mono);
  font-size: 0.78vw;
  font-weight: 600;
  color: var(--color-cyan);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.url-box-link {
  font-family: var(--font-mono);
  font-size: 1.28vw;
  font-weight: 700;
  color: var(--color-gold);
  text-decoration: underline;
  word-break: break-all;
  display: inline-block;
  transition: color 0.2s ease, transform 0.2s ease;
}
.url-box-link:hover {
  color: #fff;
  transform: translateX(4px);
}
.url-box-sub {
  font-family: var(--font-sans);
  font-size: 0.8vw;
  color: rgba(148, 163, 184, 0.95);
  margin: 0;
}

.cta-right-panel {
  background: var(--color-dark-card);
  border: 1px solid var(--color-border-gold);
  border-radius: 12px;
  padding: 2.8vh 2.0vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 36px -12px rgba(0,0,0,0.7);
}
.qr-container-title {
  font-family: var(--font-display);
  font-size: 1.2vw;
  font-weight: 700;
  color: var(--color-gold);
  margin: 0 0 0.5vh 0;
}
.qr-container-subtitle {
  font-family: var(--font-sans);
  font-size: 0.82vw;
  color: rgba(148, 163, 184, 0.92);
  margin: 0 0 1.6vh 0;
}
.qr-frame-white {
  background: #ffffff;
  border: 2.5px solid var(--color-gold);
  border-radius: 12px;
  padding: 0.9vw;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 28px rgba(0,0,0,0.45);
}
.qr-frame-white img {
  width: 12.0vw;
  max-width: 200px;
  height: auto;
  display: block;
}
.qr-bottom-hint {
  font-family: var(--font-mono);
  font-size: 0.82vw;
  font-weight: 600;
  color: var(--color-cyan);
  margin: 1.6vh 0 0 0;
}
"""

template = template.replace('</style>', custom_styles + '\n</style>')

# Build the 7 slides
slides_html = """
<!-- ============================================================
     SLIDE 1: Cover – Bìa mở đầu
     ============================================================ -->
<section class="slide hero dark" data-slide-id="cover-heritage">
  <div class="chrome">
    <div>BẢO TÀNG VĂN HỌC VIỆT NAM · 3D WEBGL VIRTUAL MUSEUM</div>
    <div>ACT I · 01 / 07</div>
  </div>

  <div class="cover-layout-grid">
    <div class="cover-left-content">
      <div class="kicker" style="margin-top: 0; color: var(--color-cyan);">DỰ ÁN DI SẢN VĂN HÓA SỐ HÓA & TRÍ TUỆ NHÂN TẠO</div>
      <h1 class="cover-title-mega">THÁNH ĐƯỜNG<br><span>VĂN HỌC</span></h1>
      <p class="cover-sub-lead">Bảo Tàng Văn Học Việt Nam 3D Trực Tuyến</p>
      <p class="cover-desc-body">
        Một kiệt tác không gian số hóa kết nối các trang văn kinh điển với công nghệ WebGL 60+ FPS, ánh sáng Chiaroscuro nghệ thuật và mô hình Multi-Agent AI tự trị tiên phong.
      </p>
      <div class="cover-tags-row">
        <span class="cover-tag-pill">🏛️ Kiến Trúc Đông Sơn</span>
        <span class="cover-tag-pill">⚡ 60+ FPS Three.js</span>
        <span class="cover-tag-pill">🐱 Đảo Mèo AI Swarm</span>
        <span class="cover-tag-pill">🌐 Trải Nghiệm Web 100%</span>
      </div>
    </div>

    <div class="cover-right-hero-frame">
      <img src="images/01_cover.png" alt="Toàn cảnh Đại Sảnh Thiên Thư" loading="eager">
    </div>
  </div>

  <div class="foot">
    <div>Phát triển bởi Đội Ngũ Kỹ Sư WebGL & AI Heritage Architects</div>
    <div>https://thanhduongvanhoc-ten.vercel.app/</div>
  </div>
</section>

<!-- ============================================================
     SLIDE 2: Hành trình từ Web vào Không gian 3D – Phần 1
     ============================================================ -->
<section class="slide hero dark" data-slide-id="journey-web-to-hall">
  <div class="chrome">
    <div>HÀNH TRÌNH KHỞI ĐẦU · TRUY CẬP TRỰC TUYẾN TỨC THÌ</div>
    <div>ACT II · 02 / 07</div>
  </div>

  <div class="kicker">TỪ TRÌNH DUYỆT ĐẾN ĐẠI SẢNH 3D</div>
  <h2 class="h-hero" style="font-size: min(3.0vw, 42px); margin-bottom: 0.4vh;">Hành Trình Bước Vào Thánh Đường Số</h2>
  <p class="lead" style="font-size: min(1.05vw, 16px); color: rgba(226, 232, 240, 0.85); margin-bottom: 1vh;">
    Chuyển hóa mượt mà từ cổng web Vercel trực quan đến không gian kiến trúc Đông Sơn tráng lệ
  </p>

  <div class="journey-compare-grid">
    <!-- Left: Web Entry -->
    <div class="journey-card">
      <div>
        <div style="font-family: var(--font-mono); font-size: 0.8vw; color: var(--color-cyan); font-weight: 700; margin-bottom: 0.6vh;">
          01 · ĐIỂM BẮT ĐẦU
        </div>
        <h3 style="font-family: var(--font-display); font-size: 1.15vw; color: var(--color-gold); margin: 0 0 1vh 0;">
          Truy Cập Trực Tiếp Trên Trình Duyệt
        </h3>
        <p style="font-family: var(--font-sans); font-size: 0.84vw; color: rgba(226, 232, 240, 0.88); line-height: 1.45; margin: 0 0 1.2vh 0;">
          Cổng vào web tải trong 2 giây, không cần cài đặt phần mềm phức tạp. Tối ưu hoàn hảo trên cả máy tính, laptop và điện thoại thông minh.
        </p>
      </div>
      <div class="journey-card-media">
        <img src="images/02_web_entry.png" alt="Giao diện Web Truy Cập" loading="lazy">
      </div>
    </div>

    <!-- Arrow -->
    <div class="journey-arrow-center">➔</div>

    <!-- Right: Exterior Hall -->
    <div class="journey-card">
      <div>
        <div style="font-family: var(--font-mono); font-size: 0.8vw; color: var(--color-cyan); font-weight: 700; margin-bottom: 0.6vh;">
          02 · ĐẠI SẢNH THIÊN THƯ
        </div>
        <h3 style="font-family: var(--font-display); font-size: 1.15vw; color: var(--color-gold); margin: 0 0 1vh 0;">
          Bước Vào Đại Sảnh Di Sản 3D
        </h3>
        <p style="font-family: var(--font-sans); font-size: 0.84vw; color: rgba(226, 232, 240, 0.88); line-height: 1.45; margin: 0 0 1.2vh 0;">
          Đại sảnh vòm kính Đông Sơn cao 18m, cuốn sách 3D 'Thiên Thư Sử Việt' lơ lửng giữa hồ sen non bộ và các trục hành lang dẫn tới từng phòng văn học.
        </p>
      </div>
      <div class="journey-card-media">
        <img src="images/03_exterior_hall.png" alt="Không gian Đại Sảnh Thiên Thư 3D" loading="lazy">
      </div>
    </div>
  </div>

  <div class="foot">
    <div>Nền tảng Three.js WebGL • Zero Latency • Tương thích mọi hệ điều hành</div>
    <div>Trang 02 / 07</div>
  </div>
</section>

<!-- ============================================================
     SLIDE 3: Khám phá Không gian Văn học Chuyên đề – Phần 2
     ============================================================ -->
<section class="slide light" data-slide-id="themed-exhibitions">
  <div class="chrome">
    <div>KHÔNG GIAN VĂN HỌC CHUYÊN ĐỀ · TÁI HIỆN BỐI CẢNH 1:1</div>
    <div>ACT III · 03 / 07</div>
  </div>

  <div class="kicker">DANH TÁC VĂN HỌC BẤT HỦ</div>
  <h2 class="h-hero" style="font-size: min(3.0vw, 42px); margin-bottom: 0.4vh;">Không Gian Văn Học Tái Hiện Sống Động</h2>
  <p class="lead" style="font-size: min(1.05vw, 16px); color: var(--text-secondary); margin-bottom: 1vh;">
    Nghệ thuật chiếu sáng Chiaroscuro, hiện vật 3D PBR Draco và thuyết minh học thuật 4 chương
  </p>

  <div class="rooms-grid-container">
    <!-- Room 1: Day Thon Vi Da -->
    <div class="room-card-box">
      <div>
        <div style="font-family: var(--font-mono); font-size: 0.82vw; color: var(--accent-ink); font-weight: 700; margin-bottom: 0.5vh;">
          PHÒNG 01 · THI CA LÃNG MẠN
        </div>
        <h3 class="step-card-title">Đây Thôn Vĩ Dạ (Hàn Mặc Tử)</h3>
        <p style="font-family: var(--font-sans); font-size: 0.84vw; color: var(--text-body); line-height: 1.45; margin: 0.8vh 0 1.2vh 0;">
          Không gian xứ Huế thơ mộng với vườn cau mướt quá xanh như ngọc, thuyền đậu bến sông trăng chở đầy ánh sáng và khói mờ sông Hương trữ tình.
        </p>
      </div>
      <div class="room-card-media">
        <img src="images/04_room_vida.png" alt="Phòng Đây Thôn Vĩ Dạ" loading="lazy">
      </div>
    </div>

    <!-- Room 2: An Duong Vuong -->
    <div class="room-card-box">
      <div>
        <div style="font-family: var(--font-mono); font-size: 0.82vw; color: var(--accent-ink); font-weight: 700; margin-bottom: 0.5vh;">
          PHÒNG 02 · TRUYỀN THUYẾT SỬ THI
        </div>
        <h3 class="step-card-title">An Dương Vương & Thành Cổ Loa</h3>
        <p style="font-family: var(--font-sans); font-size: 0.84vw; color: var(--text-body); line-height: 1.45; margin: 0.8vh 0 1.2vh 0;">
          Tái hiện sa bàn 9 vòng thành xoắn ốc bi tráng, tượng An Dương Vương uy nghi, nỏ thần Kim Quy lấp lánh và chiếc giếng ngọc minh oan muôn đời.
        </p>
      </div>
      <div class="room-card-media">
        <img src="images/05_room_coloa.png" alt="Phòng An Dương Vương Thành Cổ Loa" loading="lazy">
      </div>
    </div>
  </div>

  <div class="foot">
    <div>Mô hình 3D PBR chuẩn hóa tỷ lệ thực tế • Chiaroscuro Lighting • Lore 4 Chương</div>
    <div>Trang 03 / 07</div>
  </div>
</section>

<!-- ============================================================
     SLIDE 4: Điểm nhấn Công nghệ: Đảo Mèo AI Agent
     ============================================================ -->
<section class="slide hero dark" data-slide-id="cat-agent-swarm">
  <div class="chrome">
    <div>ĐIỂM NHẤN CÔNG NGHỆ · HỆ THỐNG ĐA TÁC TỬ MULTI-AGENT</div>
    <div>ACT IV · 04 / 07</div>
  </div>

  <div class="kicker">KIẾN TRÚC ĐA TÁC TỬ TỰ TRỊ</div>
  <h2 class="h-hero" style="font-size: min(3.0vw, 42px); margin-bottom: 0.4vh;">Đảo Mèo AI: Đội Quân 6 Agent Vận Hành Bảo Tàng</h2>
  <p class="lead" style="font-size: min(1.05vw, 16px); color: rgba(226, 232, 240, 0.85); margin-bottom: 1vh;">
    Mô hình Multi-Agent Swarm độc đáo nơi các AI Agent chuyên biệt tự động kiến tạo, kiểm thử và tương tác
  </p>

  <div class="cat-layout-grid">
    <!-- Left Hero 3D Diorama -->
    <div class="cat-island-frame">
      <img src="images/06_cat_island.png" alt="Đảo Mèo AI Isometric Diorama" loading="lazy">
    </div>

    <!-- Right Cat Agent Roster -->
    <div class="cat-roster-list">
      <!-- Cat 1 -->
      <div class="cat-agent-item">
        <span class="cat-avatar-badge">📜</span>
        <div>
          <span class="cat-agent-name">Mèo Mướp Trưởng Làng</span>
          <span class="cat-agent-role">Orchestrator · Tổng Chỉ Huy</span>
          <p class="cat-agent-desc">Điều phối toàn diện Swarm, phân rã mục tiêu và giám sát tiến độ thi công bảo tàng.</p>
        </div>
      </div>

      <!-- Cat 2 -->
      <div class="cat-agent-item">
        <span class="cat-avatar-badge">📐</span>
        <div>
          <span class="cat-agent-name">Mèo Tam Thể Kiến Trúc</span>
          <span class="cat-agent-role">Curator · Giám Tuyển Không Gian</span>
          <p class="cat-agent-desc">Quy hoạch 3 lớp không gian di sản, giữ đường giao thông thông thoáng 100%.</p>
        </div>
      </div>

      <!-- Cat 3 -->
      <div class="cat-agent-item">
        <span class="cat-avatar-badge">🔨</span>
        <div>
          <span class="cat-agent-name">Mèo Vàng Thợ Rèn</span>
          <span class="cat-agent-role">Sculptor · Kỹ Sư 3D PBR</span>
          <p class="cat-agent-desc">Điêu khắc, nén Draco PBR và chuẩn hóa mặt bằng chân mô hình tại Y = 0.</p>
        </div>
      </div>

      <!-- Cat 4 -->
      <div class="cat-agent-item">
        <span class="cat-avatar-badge">🏮</span>
        <div>
          <span class="cat-agent-name">Mèo Mun Thắp Đèn</span>
          <span class="cat-agent-role">Lighting & Shader Artist</span>
          <p class="cat-agent-desc">Nghệ thuật Chiaroscuro đổ bóng vách nứa, Custom GLSL Shader mặt nước và VFX hạt.</p>
        </div>
      </div>

      <!-- Cat 5 -->
      <div class="cat-agent-item">
        <span class="cat-avatar-badge">🎶</span>
        <div>
          <span class="cat-agent-name">Mèo Trắng Đào Nương</span>
          <span class="cat-agent-role">Lore & 3D Audio Director</span>
          <p class="cat-agent-desc">Biên soạn Lore 4 chương học thuật, mini-quiz và âm thanh không gian PositionalAudio.</p>
        </div>
      </div>

      <!-- Cat 6 -->
      <div class="cat-agent-item">
        <span class="cat-avatar-badge">🛡️</span>
        <div>
          <span class="cat-agent-name">Mèo Xiêm Tuần Đinh</span>
          <span class="cat-agent-role">Engine Guardian · 60+ FPS</span>
          <p class="cat-agent-desc">Quản lý collider Hitbox Box3, zero memory allocation và bảo vệ độ mượt 60 FPS.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="foot">
    <div>Mô hình Swarm Orchestration • Procedural Meow Audio • Zero-allocation Loop</div>
    <div>Trang 04 / 07</div>
  </div>
</section>

<!-- ============================================================
     SLIDE 5: Hướng dẫn Trải nghiệm Bảo tàng
     ============================================================ -->
<section class="slide light" data-slide-id="guide-experience">
  <div class="chrome">
    <div>CẨM NANG THAM QUAN · HƯỚNG DẪN TƯƠNG TÁC 3D</div>
    <div>ACT V · 05 / 07</div>
  </div>

  <div class="kicker">4 BƯỚC KHÁM PHÁ DỄ DÀNG</div>
  <h2 class="h-hero" style="font-size: min(3.0vw, 42px); margin-bottom: 0.4vh;">Hướng Dẫn Trải Nghiệm Bảo Tàng</h2>
  <p class="lead" style="font-size: min(1.05vw, 16px); color: var(--text-secondary); margin-bottom: 1vh;">
    Các thao tác trực quan giúp người xem làm chủ không gian ảo và bước vào cõi mở văn học
  </p>

  <div class="steps-grid-container">
    <!-- Step 1 -->
    <div class="step-card-box">
      <div class="step-header-row">
        <span class="step-badge-text">BƯỚC 01</span>
        <div class="step-icon-circle">📖</div>
      </div>
      <h3 class="step-card-title">Truy Cập & Chọn Phòng</h3>
      <ul class="step-card-list">
        <li>Mở trình duyệt web không cần cài đặt.</li>
        <li>Tương tác Cuốn Sách 3D Thiên Thư hoặc thanh Menu nhanh.</li>
        <li>Dịch chuyển tức thì đến phòng tác phẩm mong muốn.</li>
      </ul>
    </div>

    <!-- Step 2 -->
    <div class="step-card-box">
      <div class="step-header-row">
        <span class="step-badge-text">BƯỚC 02</span>
        <div class="step-icon-circle">🧭</div>
      </div>
      <h3 class="step-card-title">Di Chuyển Góc Nhìn 360°</h3>
      <ul class="step-card-list">
        <li>Sử dụng phím W-A-S-D hoặc phím mũi tên để đi lại.</li>
        <li>Giữ chuột trái để xoay góc nhìn 360 độ tự do.</li>
        <li>Kích hoạt chế độ Auto-Tour để xem lộ trình điện ảnh.</li>
      </ul>
    </div>

    <!-- Step 3 -->
    <div class="step-card-box">
      <div class="step-header-row">
        <span class="step-badge-text">BƯỚC 03</span>
        <div class="step-icon-circle">🔍</div>
      </div>
      <h3 class="step-card-title">Tương Tác Hiện Vật</h3>
      <ul class="step-card-list">
        <li>Click Raycaster vào hiện vật, tượng cổ và đạo cụ.</li>
        <li>Mở bảng thông tin Lore 4 chương phân tích chuyên sâu.</li>
        <li>Lắng nghe âm thanh không gian 3D tái hiện bối cảnh.</li>
      </ul>
    </div>

    <!-- Step 4 -->
    <div class="step-card-box">
      <div class="step-header-row">
        <span class="step-badge-text">BƯỚC 04</span>
        <div class="step-icon-circle">⛩️</div>
      </div>
      <h3 class="step-card-title">Cổng Dịch Chuyển & Cõi Mở</h3>
      <ul class="step-card-list">
        <li>Tiến đến các Portal ánh sáng đặt tại góc phòng.</li>
        <li>Bước vào Cõi Thế Giới Mở (enterRealm) tỷ lệ thực 1:1.</li>
        <li>Ghé thăm Đảo Mèo AI và đối thoại cùng các nhân vật.</li>
      </ul>
    </div>
  </div>

  <div class="foot">
    <div>Hỗ trợ bàn phím, chuột, màn hình cảm ứng điện thoại và kính thực tế ảo WebXR</div>
    <div>Trang 05 / 07</div>
  </div>
</section>

<!-- ============================================================
     SLIDE 6: Giá trị Kết nối Di sản & Công nghệ
     ============================================================ -->
<section class="slide light" data-slide-id="values-heritage-tech">
  <div class="chrome">
    <div>TẦM NHÌN DỰ ÁN · KẾT NỐI DI SẢN & TƯƠNG LAI</div>
    <div>ACT VI · 06 / 07</div>
  </div>

  <div class="kicker">GIÁ TRỊ CỐT LÕI</div>
  <h2 class="h-hero" style="font-size: min(3.0vw, 42px); margin-bottom: 0.4vh;">Giao Thoa Giữa Di Sản Văn Học & Công Nghệ Số</h2>
  <p class="lead" style="font-size: min(1.05vw, 16px); color: var(--text-secondary); margin-bottom: 1vh;">
    Sứ mệnh đưa văn học kinh điển Việt Nam tiếp cận thế hệ trẻ qua lăng kính tương tác 3D hiện đại
  </p>

  <div class="pillars-grid-container">
    <!-- Pillar 1 -->
    <div class="pillar-card">
      <div class="pillar-number">01</div>
      <h3 class="pillar-title">Trực Quan Hóa Tác Phẩm Kinh Điển</h3>
      <p class="pillar-desc">
        Chuyển thể những dòng thơ, án văn từ trang giấy thành không gian hình khối sống động. Người học được tận mắt ngắm nhìn lầu Ngưng Bích, thành Cổ Loa, bến sông Hoàng Giang theo tỷ lệ thực tế.
      </p>
    </div>

    <!-- Pillar 2 -->
    <div class="pillar-card">
      <div class="pillar-number">02</div>
      <h3 class="pillar-title">Trải Nghiệm Đa Giác Quan Không Cài Đặt</h3>
      <p class="pillar-desc">
        Xóa bỏ mọi rào cản phần mềm với công nghệ WebGL Three.js chạy mượt mà 60+ FPS trực tiếp trên trình duyệt. Kết hợp âm thanh định vị 3D và nghệ thuật ánh sáng Chiaroscuro lay động cảm xúc.
      </p>
    </div>

    <!-- Pillar 3 -->
    <div class="pillar-card">
      <div class="pillar-number">03</div>
      <h3 class="pillar-title">Ứng Dụng AI Sáng Tạo Trong Học Tập</h3>
      <p class="pillar-desc">
        Đội ngũ AI Agent đồng hành dẫn dắt, giải đáp kiến thức và chấm bài mini-quiz tự động. Thúc đẩy phương pháp tiếp cận văn học chủ động, hào hứng và đầy tự hào dân tộc cho thế hệ Gen Z.
      </p>
    </div>
  </div>

  <div class="foot">
    <div>Mô hình Giáo dục Văn học Số • Đổi mới sáng tạo trong bảo tồn di sản</div>
    <div>Trang 06 / 07</div>
  </div>
</section>

<!-- ============================================================
     SLIDE 7: Closing – Cổng Truy Cập & Trải Nghiệm Ngay
     ============================================================ -->
<section class="slide hero dark" data-slide-id="closing-cta" style="background-image: url('images/07_bg_closing.png'); background-size: cover; background-position: center;">
  <div class="chrome">
    <div>KẾT NỐI VĂN HÓA SỐ · TRẢI NGHIỆM TỨC THÌ</div>
    <div>ACT VII · 07 / 07</div>
  </div>

  <div class="kicker">BƯỚC VÀO THÁNH ĐƯỜNG VĂN HỌC NGAY HÔM NAY</div>
  <h2 class="h-hero" style="font-size: min(3.0vw, 42px); margin-bottom: 0.4vh;">Sẵn Sàng Khám Phá? Truy Cập Bảo Tàng Ngay!</h2>
  <p class="lead" style="font-size: min(1.05vw, 16px); color: rgba(226, 232, 240, 0.85); margin-bottom: 1vh;">
    Khám phá toàn bộ không gian di sản số hóa 3D hoàn toàn miễn phí trên trình duyệt máy tính và điện thoại
  </p>

  <div class="cta-layout-grid">
    <!-- Left Column: Inspiring CTA & Highlighted URL Box -->
    <div class="cta-left-panel">
      <div>
        <h3 class="cta-heading">Khám Phá Di Sản Văn Học Trong Kỷ Nguyên Số</h3>
        <p class="cta-lead-text">
          Thánh Đường Văn Học mở ra cánh cửa không gian vô tận, nơi những giá trị truyền thống trường tồn hòa quyện cùng công nghệ đỉnh cao.
        </p>
        <div class="cta-feature-list">
          <div class="cta-feature-item">
            <span class="cta-feature-bullet">✨</span>
            <span><strong>Trực tuyến 100% trên Web:</strong> Tương thích mọi trình duyệt hiện đại Chrome, Edge, Safari; không yêu cầu tải về.</span>
          </div>
          <div class="cta-feature-item">
            <span class="cta-feature-bullet">⚡</span>
            <span><strong>Hiệu năng mượt mà 60+ FPS:</strong> Nén mô hình Draco PBR, công nghệ Three.js tiên tiến vận hành ổn định.</span>
          </div>
          <div class="cta-feature-item">
            <span class="cta-feature-bullet">🐱</span>
            <span><strong>Đội quân 6 Mèo AI Agent:</strong> Sẵn sàng chào đón, trò chuyện và dẫn tour tại Làng Sáng Tạo Đảo Mèo.</span>
          </div>
        </div>
      </div>

      <!-- Prominent URL Container -->
      <div class="url-highlight-box">
        <span class="url-box-label">🔗 ĐƯỜNG LINK TRUY CẬP CHÍNH THỨC (VERCEL DEPLOYED):</span>
        <a href="https://thanhduongvanhoc-ten.vercel.app/" target="_blank" rel="noopener noreferrer" class="url-box-link">
          https://thanhduongvanhoc-ten.vercel.app/
        </a>
        <p class="url-box-sub">
          Tên miền dự phòng: <code>thanhduongvanhoc-thienphu1.vercel.app</code> • Nhấp chuột để mở web ngay
        </p>
      </div>
    </div>

    <!-- Right Column: Delicate White QR Code Frame -->
    <div class="cta-right-panel">
      <h3 class="qr-container-title">QUÉT MÃ QR CODE</h3>
      <p class="qr-container-subtitle">Mở Camera điện thoại hoặc Zalo để quét</p>

      <!-- Khung vuông trống nền trắng viền vàng kim tinh tế -->
      <div class="qr-frame-white">
        <img src="images/qr_thanhduongvanhoc.png" alt="Mã QR Truy Cập Bảo Tàng 3D" loading="lazy">
      </div>

      <p class="qr-bottom-hint">
        ⚡ TRẢI NGHIỆM TỨC THÌ TRÊN DI ĐỘNG<br>
        <span style="font-size: 0.72vw; color: rgba(226, 232, 240, 0.75); font-weight: normal;">Hỗ trợ iOS • Android • Tablet • Laptop</span>
      </p>
    </div>
  </div>

  <div class="foot">
    <div>Bản quyền © 2026 Thánh Đường Văn Học 3D • Dự án Di sản Văn hóa Số</div>
    <div>Nhấn phím <strong>P</strong> để bật Chế độ Thuyết trình (Presenter Mode)</div>
  </div>
</section>
"""

# Replace SLIDES_HERE in template
if '<!-- SLIDES_HERE -->' in template:
    template = template.replace('<!-- SLIDES_HERE -->', slides_html)
else:
    template = re.sub(r'<div id="deck">.*?</div>', f'<div id="deck">\\n{slides_html}\\n</div>', template, flags=re.DOTALL)

# Build SPEAKER_NOTES array for 7 Slides in Presenter Mode
speaker_notes_code = """
const SPEAKER_NOTES = [
  {
    id: 'cover-heritage',
    title: 'Thánh Đường Văn Học - Trang Bìa Khởi Đầu',
    section: 'Khởi đầu',
    minutes: 1.5,
    purpose: 'Tuyên bố tầm nhìn dự án: Kết nối văn học dân tộc với công nghệ 3D WebGL và AI Swarm',
    talk: [
      'Kính thưa quý vị đại biểu, thầy cô và các bạn trẻ yêu văn học.',
      'Hôm nay, tôi vô cùng tự hào được đại diện nhóm kiến trúc sư số giới thiệu dự án: Thánh Đường Văn Học - Bảo tàng Văn học Việt Nam 3D Trực tuyến đầu tiên.',
      'Đây không chỉ là một bảo tàng số đơn thuần, mà là một không gian nghệ thuật tương tác đa giác quan, nơi các kiệt tác văn học kinh điển được tái sinh bằng công nghệ WebGL 60+ FPS và trí tuệ nhân tạo.'
    ],
    transition: 'Ngay sau đây, xin mời quý vị cùng trải nghiệm hành trình khởi đầu từ trình duyệt web bước thẳng vào đại sảnh.',
    cue: 'Nhấn mạnh cụm từ THÁNH ĐƯỜNG VĂN HỌC và chỉ vào ảnh bìa kiến trúc Đông Sơn'
  },
  {
    id: 'journey-web-to-hall',
    title: 'Hành Trình Từ Web Đến Đại Sảnh 3D',
    section: 'Hành trình',
    minutes: 2.0,
    purpose: 'Làm nổi bật tính tiện lợi vượt trội (Web 100%, không cần cài đặt) và vẻ đẹp hùng tráng của Đại Sảnh Thiên Thư',
    talk: [
      'Một trong những rào cản lớn nhất của các ứng dụng 3D trước đây là dung lượng nặng và yêu cầu cài đặt phần mềm phức tạp.',
      'Với Thánh Đường Văn Học, chúng tôi giải quyết triệt để vấn đề này: chỉ cần một cú nhấp chuột vào link web Vercel, toàn bộ bảo tàng sẽ sẵn sàng trong chưa đầy 2 giây.',
      'Người xem bước qua cánh cửa không gian, choáng ngợp trước Đại Sảnh Thiên Thư cao 18m với mái vòm Đông Sơn uy nghiêm và cuốn sách 3D lơ lửng giữa hồ sen non bộ.'
    ],
    transition: 'Từ đại sảnh trung tâm, các trục hành lang sẽ dẫn lối chúng ta bước vào các không gian chuyên đề kiệt tác.',
    cue: 'Chỉ tay từ khung ảnh Web bên trái sang khung ảnh Đại Sảnh 3D bên phải theo chiều mũi tên'
  },
  {
    id: 'themed-exhibitions',
    title: 'Không Gian Văn Học Tái Hiện Sống Động',
    section: 'Triển lãm',
    minutes: 2.5,
    purpose: 'Giới thiệu chiều sâu văn hóa và kỹ thuật 3D qua hai phòng tiêu biểu: Đây Thôn Vĩ Dạ và An Dương Vương',
    talk: [
      'Tại đây, mỗi phòng trưng bày là một thế giới riêng biệt được tái hiện tỉ mỉ theo tỷ lệ thực 1:1.',
      'Bên trái là không gian thơ mộng của Đây Thôn Vĩ Dạ: quý vị sẽ cảm nhận làn gió xứ Huế, vườn cau mướt ngọc và ánh trăng non bảng lảng trên dòng sông Hương.',
      'Bên phải là không gian sử thi bi tráng của An Dương Vương và Thành Cổ Loa: với sa bàn 9 vòng thành xoáy ốc, tượng nỏ thần Kim Quy lấp lánh và chiếc giếng ngọc minh oan.',
      'Mỗi hiện vật đều kết nối với bảng lụa Lore 4 chương và âm thanh không gian 3D chân thực.'
    ],
    transition: 'Đằng sau vẻ đẹp tráng lệ ấy là sự vận hành nhịp nhàng của một hệ thống công nghệ vô cùng độc đáo: Đảo Mèo AI Agent.',
    cue: 'Nhấn mạnh sự đối lập nghệ thuật: một bên lãng mạn trữ tình, một bên sử thi hào hùng'
  },
  {
    id: 'cat-agent-swarm',
    title: 'Đảo Mèo AI: Đội Quân 6 Agent Vận Hành',
    section: 'Công nghệ',
    minutes: 2.5,
    purpose: 'Làm nổi bật điểm nhấn công nghệ sáng tạo: Kiến trúc Đa tác tử (Multi-Agent Swarm) với 6 chú mèo AI chuyên trách',
    talk: [
      'Điểm độc đáo chưa từng có ở bất kỳ bảo tàng nào chính là Đảo Mèo AI - một diorama 3D nổi lơ lửng giữa trời sao đêm.',
      'Chúng tôi xây dựng hệ thống Multi-Agent Swarm gồm 6 chú mèo tự trị: Mèo Mướp Trưởng Làng làm Orchestrator tổng chỉ huy và Mèo Tam Thể quy hoạch kiến trúc 3 lớp.',
      'Mèo Vàng Thợ Rèn điêu khắc tối ưu Draco PBR, trong khi Mèo Mun Thắp Đèn phụ trách nghệ thuật ánh sáng Chiaroscuro và shader sóng nước.',
      'Cùng với Mèo Trắng Đào Nương biên soạn Lore 4 chương và Mèo Xiêm Tuần Đinh quản lý va chạm Hitbox, bảo đảm toàn bộ hệ thống vận hành 60+ FPS mượt mà.'
    ],
    transition: 'Sau khi chiêm ngưỡng không gian và công nghệ, quý vị có thể tự mình làm chủ mọi thao tác chỉ với 4 bước đơn giản.',
    cue: 'Chỉ vào ảnh Đảo Mèo Isometric và lần lượt đọc tên từng chú mèo đại diện cho các module kỹ thuật'
  },
  {
    id: 'guide-experience',
    title: 'Hướng Dẫn Trải Nghiệm Bảo Tàng 3D',
    section: 'Hướng dẫn',
    minutes: 2.0,
    purpose: 'Cung cấp cẩm nang 4 bước tương tác trực quan: chọn phòng, di chuyển 360, nhấp hiện vật và vào cõi mở',
    talk: [
      'Việc tham quan bảo tàng diễn ra vô cùng tự nhiên và thân thiện.',
      'Bước 1: Chọn phòng qua Cuốn Sách Thiên Thư hoặc thanh Menu nhanh.',
      'Bước 2: Di chuyển tự do 360 độ bằng chuột và phím WASD, hoặc chọn Auto-Tour để camera tự dẫn đường điện ảnh.',
      'Bước 3: Nhấp chuột vào bất kỳ hiện vật nào để mở ra bảng Lore 4 chương và lắng nghe âm thanh không gian.',
      'Bước 4: Bước qua các cổng Portal ánh sáng để hòa mình vào Cõi Thế Giới Mở tỷ lệ 1:1 và trò chuyện cùng các chú mèo AI.'
    ],
    transition: 'Những trải nghiệm trực quan này tạo nên giá trị cốt lõi bền vững cho dự án.',
    cue: 'Lướt nhanh qua 4 thẻ quy trình trên màn hình'
  },
  {
    id: 'values-heritage-tech',
    title: 'Giao Thoa Giữa Di Sản & Công Nghệ',
    section: 'Giá trị',
    minutes: 2.0,
    purpose: 'Khẳng định 3 giá trị cốt lõi: Trực quan hóa tác phẩm, trải nghiệm không cài đặt và ứng dụng AI sáng tạo',
    talk: [
      'Thánh Đường Văn Học được kiến tạo dựa trên 3 trụ cột giá trị vững chắc:',
      'Thứ nhất, trực quan hóa tác phẩm kinh điển: biến những trang sách văn học trừu tượng thành không gian thực tế sống động.',
      'Thứ hai, trải nghiệm đa giác quan không cần cài đặt: đưa công nghệ WebGL Three.js tiên tiến đến mọi học sinh, sinh viên trên khắp cả nước.',
      'Thứ ba, ứng dụng AI sáng tạo trong giáo dục: biến việc học văn từ thụ động thành hành trình khám phá chủ động đầy say mê.'
    ],
    transition: 'Và cánh cửa Thánh Đường Văn Học đang rộng mở chào đón quý vị ngay bây giờ.',
    cue: 'Nhấn mạnh tầm quan trọng của việc bảo tồn và lan tỏa di sản văn hóa cho thế hệ tương lai'
  },
  {
    id: 'closing-cta',
    title: 'Sẵn Sàng Khám Phá? Truy Cập Bảo Tàng Ngay!',
    section: 'Kết nối',
    minutes: 1.5,
    purpose: 'Kêu gọi hành động, cung cấp đường link Vercel chính thức và mã QR quét điện thoại trải nghiệm tức thì',
    talk: [
      'Dự án hiện đã được phát hành chính thức trên toàn cầu tại địa chỉ: thanhduongvanhoc-ten.vercel.app.',
      'Quý vị có thể nhấp chuột trực tiếp vào liên kết bên trái màn hình.',
      'Hoặc đơn giản hơn, hãy mở camera điện thoại hoặc Zalo để quét mã QR tại khung trắng viền vàng bên phải.',
      'Chỉ sau 2 giây, quý vị sẽ bước chân vào Thánh Đường Văn Học 3D.',
      'Xin chân thành cảm ơn quý vị đã chú ý lắng nghe!'
    ],
    transition: 'Mời khán giả đặt câu hỏi và trực tiếp mở điện thoại trải nghiệm thử không gian bảo tàng.',
    cue: 'Hướng tay về phía mã QR và sẵn sàng mở trang web demo trực tiếp'
  }
];
window.__SPEAKER_NOTES__ = SPEAKER_NOTES;
"""

template = re.sub(r'const SPEAKER_NOTES\s*=\s*\[[\s\S]*?\];\s*window\.__SPEAKER_NOTES__\s*=\s*SPEAKER_NOTES;', speaker_notes_code.strip(), template)

# Add URL parameter / Hash initialization to support ?slide=N and #N
init_slide_patch = """
/* Support ?slide=N and #N hash navigation on load */
(function() {
  const p = new URLSearchParams(location.search);
  const s = p.get('slide');
  if (s && !isNaN(parseInt(s))) {
    const target = Math.max(0, Math.min(total - 1, parseInt(s) - 1));
    setTimeout(() => go(target, {force: true}), 60);
  } else if (location.hash) {
    const h = parseInt(location.hash.replace('#', ''));
    if (!isNaN(h)) {
      const target = Math.max(0, Math.min(total - 1, h));
      setTimeout(() => go(target, {force: true}), 60);
    }
  }
})();
"""

if 'addEventListener("popstate"' in template:
    template = template.replace('addEventListener("popstate"', init_slide_patch + '\naddEventListener("popstate"')
else:
    template = template.replace('go(0);', 'go(0);\n' + init_slide_patch)

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(template)

print(f"Successfully generated 7-slide deck at {output_path}!")
