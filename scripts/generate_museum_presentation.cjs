/**
 * Script tao bo Slide thuyet trinh chuyen nghiep ve Bao Tang Van Hoc Ao 3D
 * Su dung pptxgenjs theo chuan Anthropic pptx skill
 */
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

async function createMuseumPresentation() {
  const pres = new pptxgen();

  // 1. Dinh nghia kich thuoc man hinh 16:9 widescreen chuan (10 x 5.625 inch)
  pres.layout = 'LAYOUT_16x9';

  // Thong tin Metadata
  pres.title = 'Bảo Tàng Văn Học Ảo 3D - Cõi Mở Di Sản';
  pres.subject = 'Thuyết Trình Giới Thiệu Dự Án Bảo Tàng Văn Học 3D';
  pres.author = 'BaoTang3D Architectural & Engineering Team';
  pres.company = 'BaoTang3D';

  // Bang mau chu dao (Theme Colors - Khong co dau # theo quy chuan pptx skill)
  const COLOR = {
    bgDark: '0D1117',
    bgDarkCard: '161D27',
    bgDarkBorder: '253043',
    bgLight: 'F8F9FA',
    bgLightCard: 'FFFFFF',
    borderLight: 'E5E7EB',
    goldAccent: 'D4AF37',
    goldDark: 'B8860B',
    emerald: '00A896',
    indigoBlue: '2563EB',
    crimsonRed: 'E63946',
    purpleAccent: '8B5CF6',
    textWhite: 'FFFFFF',
    textDark: '111827',
    textMutedDark: '6B7280',
    textMutedLight: '94A3B8',
    cardSubtle: 'F1F5F9'
  };

  const FONTS = {
    header: 'Cambria',
    body: 'Arial'
  };

  // Helper duong dan anh
  const imgAtriumOverview = path.resolve(__dirname, '../public/infographic_assets/shot_atrium_overview.png');
  const imgAtriumThienThu = path.resolve(__dirname, '../public/infographic_assets/shot_atrium_thienthu.png');
  const imgNamXuong = path.resolve(__dirname, '../public/infographic_assets/shot_nam_xuong.png');
  const imgChiaroscuroPortal = path.resolve(__dirname, '../public/infographic_assets/bt_3_chiaroscuro_portal.png');

  // ==========================================
  // SLIDE 1: BÌA CHÍNH (TITLE HERO SLIDE - DARK LUXURY)
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLOR.bgDark };

    // Khung vien the hien sang trong
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 0.4, w: 9.0, h: 4.825,
      rectRadius: 0.15,
      fill: { color: COLOR.bgDarkCard },
      line: { color: COLOR.bgDarkBorder, width: 1 }
    });

    // Tag / Badge dinh cao
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.9, y: 0.75, w: 4.4, h: 0.36,
      rectRadius: 0.08,
      fill: { color: '20293A' },
      line: { color: COLOR.goldAccent, width: 1 }
    });
    slide.addText('🏛️  BẢO TÀNG VĂN HỌC ẢO 3D • CÕI MỞ DI SẢN', {
      x: 0.9, y: 0.75, w: 4.4, h: 0.36,
      fontFace: FONTS.body, fontSize: 10, bold: true, color: COLOR.goldAccent,
      align: 'center', valign: 'middle', isTextBox: true, margin: 0
    });

    // Tieu de chinh
    slide.addText('HỒN THƠ NƯỚC VIỆT\nTRONG KHÔNG GIAN SỐ 3D', {
      x: 0.9, y: 1.35, w: 4.6, h: 1.45,
      fontFace: FONTS.header, fontSize: 26, bold: true, color: COLOR.textWhite,
      lineSpacing: 34, isTextBox: true, margin: 0
    });

    // Phu de thuyet minh
    slide.addText('Nền tảng Tái hiện Kiệt tác Văn học & Sử thi Dân tộc bằng Công nghệ WebGL 60+ FPS, Ánh sáng Chiaroscuro và Cõi Mở Thực tế Ảo 1:1.', {
      x: 0.9, y: 2.9, w: 4.5, h: 0.8,
      fontFace: FONTS.body, fontSize: 12, color: COLOR.textMutedLight,
      lineSpacing: 18, isTextBox: true, margin: 0
    });

    // Hop thong tin du an
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.9, y: 3.85, w: 4.5, h: 1.05,
      rectRadius: 0.08,
      fill: { color: '121822' },
      line: { color: '2A374D', width: 1 }
    });
    slide.addText([
      { text: 'Công nghệ: ', options: { bold: true, color: COLOR.goldAccent } },
      { text: 'Three.js • WebGL 60+ FPS • Custom GLSL • WebXR\n', options: { color: COLOR.textWhite } },
      { text: 'Quy mô: ', options: { bold: true, color: COLOR.goldAccent } },
      { text: 'Đại sảnh Hoàng Cung & 8 Cõi Triển Lãm Kiệt Tác\n', options: { color: COLOR.textWhite } },
      { text: 'Đặc vụ AI: ', options: { bold: true, color: COLOR.goldAccent } },
      { text: 'Biệt đội Mèo AI trấn thủ & Hướng dẫn viên tự động', options: { color: COLOR.textWhite } }
    ], {
      x: 1.05, y: 3.92, w: 4.2, h: 0.9,
      fontFace: FONTS.body, fontSize: 10, lineSpacing: 16, isTextBox: true, margin: 0
    });

    // Hero Image ben phai
    if (fs.existsSync(imgAtriumOverview)) {
      slide.addImage({
        path: imgAtriumOverview,
        x: 5.65, y: 0.75, w: 3.55, h: 3.35,
        rounding: true
      });
      // Chu thich duoi anh
      slide.addShape(pres.ShapeType.roundRect, {
        x: 5.65, y: 4.2, w: 3.55, h: 0.7,
        rectRadius: 0.08,
        fill: { color: '121822' },
        line: { color: COLOR.goldAccent, width: 1 }
      });
      slide.addText('Đại Sảnh Trung Tâm & Cuốn Sách 3D "Thiên Thư Sử Việt"\nKiến trúc Hoàng Cung Đông Sơn kết hợp Ánh Sáng Thể Tích', {
        x: 5.75, y: 4.25, w: 3.35, h: 0.6,
        fontFace: FONTS.body, fontSize: 9.5, color: COLOR.goldAccent,
        align: 'center', valign: 'middle', isTextBox: true, margin: 0
      });
    }

    slide.addNotes('Kính chào quý vị đại biểu, thầy cô và các bạn. Đây là bài thuyết trình giới thiệu dự án Bảo Tàng Văn Học Ảo 3D - Cõi Mở Di Sản. Dự án tiên phong ứng dụng công nghệ đồ họa không gian số WebGL và Three.js để số hóa, bảo tồn và thổi bùng sức sống mới cho các kiệt tác văn học Việt Nam.');
  }

  // ==========================================
  // SLIDE 2: TẦM NHÌN & SỨ MỆNH (LIGHT THEME)
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLOR.bgLight };

    // Tieu de slide
    slide.addText('TỔNG QUAN & BỐI CẢNH DỰ ÁN', {
      x: 0.8, y: 0.45, w: 8.4, h: 0.25,
      fontFace: FONTS.body, fontSize: 11, bold: true, color: COLOR.goldDark,
      isTextBox: true, margin: 0
    });
    slide.addText('Tầm Nhìn & Sứ Mệnh Chuyển Đổi Số Di Sản Văn Học', {
      x: 0.8, y: 0.72, w: 8.4, h: 0.45,
      fontFace: FONTS.header, fontSize: 22, bold: true, color: COLOR.textDark,
      isTextBox: true, margin: 0
    });

    // 3 The So Sanh & Giai Phap
    const cards = [
      {
        x: 0.8,
        tag: 'THÁCH THỨC HIỆN HỮU',
        tagColor: COLOR.crimsonRed,
        title: 'Văn Học Trên Trang Giấy',
        borderColor: 'FCA5A5',
        points: [
          'Giảng dạy chủ yếu qua kênh chữ viết và lời giảng một chiều.',
          'Học sinh gặp rào cản khi hình dung không gian lịch sử và phong tục cổ đại.',
          'Sự thiếu vắng tương tác trực quan khiến tác phẩm kinh điển dần xa lạ với Gen Z.'
        ]
      },
      {
        x: 3.8,
        tag: 'GIẢI PHÁP ĐỘT PHÁ',
        tagColor: COLOR.goldDark,
        title: 'Bảo Tàng Không Gian 3D',
        borderColor: COLOR.goldAccent,
        points: [
          'Tái hiện bối cảnh các kiệt tác văn học theo tỷ lệ 1:1 chân thực trên WebGL.',
          'Tính năng enterRealm cho phép người xem bước thẳng vào thế giới tác phẩm.',
          'Công nghệ tương tác thời gian thực: ngọn đèn Chiaroscuro, sóng nước, âm thanh 3D.'
        ]
      },
      {
        x: 6.8,
        tag: 'GIÁ TRỊ XÃ HỘI',
        tagColor: COLOR.emerald,
        title: 'Bảo Tồn & Khơi Nguồn Cảm Hứng',
        borderColor: '86EFAC',
        points: [
          'Công cụ hỗ trợ giảng dạy trực quan lý tưởng cho các trường học và giáo viên.',
          'Gìn giữ và tôn vinh những giá trị nhân văn cao đẹp của nền văn hiến dân tộc.',
          'Tiếp cận dễ dàng trên mọi thiết bị và nền tảng mà không cần cài đặt phần mềm.'
        ]
      }
    ];

    cards.forEach(c => {
      slide.addShape(pres.ShapeType.roundRect, {
        x: c.x, y: 1.35, w: 2.75, h: 2.65,
        rectRadius: 0.1,
        fill: { color: COLOR.bgLightCard },
        line: { color: c.borderColor, width: 1.2 }
      });

      slide.addText(c.tag, {
        x: c.x + 0.2, y: 1.5, w: 2.35, h: 0.25,
        fontFace: FONTS.body, fontSize: 9.5, bold: true, color: c.tagColor,
        isTextBox: true, margin: 0
      });

      slide.addText(c.title, {
        x: c.x + 0.2, y: 1.78, w: 2.35, h: 0.35,
        fontFace: FONTS.header, fontSize: 14, bold: true, color: COLOR.textDark,
        isTextBox: true, margin: 0
      });

      const bullets = c.points.map((pt, idx) => ({
        text: pt + (idx < c.points.length - 1 ? '\n\n' : ''),
        options: { bullet: true, color: '374151' }
      }));

      slide.addText(bullets, {
        x: c.x + 0.2, y: 2.22, w: 2.35, h: 1.65,
        fontFace: FONTS.body, fontSize: 10.5, lineSpacing: 15, isTextBox: true, margin: 0
      });
    });

    // Hang chi so thong ke (Stats Callout Row) o day
    const stats = [
      { num: '08+', label: 'Gian Triển Lãm Kiệt Tác', color: COLOR.goldDark },
      { num: '100%', label: 'Mô Hình PBR Chuẩn Hóa', color: COLOR.emerald },
      { num: '60+ FPS', label: 'Tối Ưu Đồ Họa WebGL', color: COLOR.indigoBlue },
      { num: '04 Chương', label: 'Hệ Thống Lore Học Thuật', color: COLOR.purpleAccent }
    ];

    stats.forEach((st, idx) => {
      const bx = 0.8 + idx * 2.2;
      slide.addShape(pres.ShapeType.roundRect, {
        x: bx, y: 4.15, w: 2.05, h: 0.95,
        rectRadius: 0.08,
        fill: { color: 'F1F5F9' },
        line: { color: COLOR.borderLight, width: 1 }
      });
      slide.addText(st.num, {
        x: bx, y: 4.22, w: 2.05, h: 0.45,
        fontFace: FONTS.header, fontSize: 20, bold: true, color: st.color,
        align: 'center', isTextBox: true, margin: 0
      });
      slide.addText(st.label, {
        x: bx, y: 4.68, w: 2.05, h: 0.35,
        fontFace: FONTS.body, fontSize: 9.5, color: COLOR.textDark,
        align: 'center', isTextBox: true, margin: 0
      });
    });

    slide.addNotes('Slide này nêu bật bối cảnh ra đời của dự án: chuyển hóa những áng văn thơ kinh điển vốn chỉ tiếp cận qua kênh văn bản tĩnh thành không gian 3D tương tác sống động, giải quyết thách thức giảng dạy và truyền cảm hứng.');
  }

  // ==========================================
  // SLIDE 3: KIẾN TRÚC ĐẠI SẢN & THIÊN THƯ SỬ VIỆT
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLOR.bgLight };

    slide.addText('KIẾN TRÚC TRUNG TÂM', {
      x: 0.8, y: 0.45, w: 8.4, h: 0.25,
      fontFace: FONTS.body, fontSize: 11, bold: true, color: COLOR.goldDark,
      isTextBox: true, margin: 0
    });
    slide.addText('Đại Sảnh Hoàng Cung & Cuốn Sách 3D "Thiên Thư Sử Việt"', {
      x: 0.8, y: 0.72, w: 8.4, h: 0.45,
      fontFace: FONTS.header, fontSize: 22, bold: true, color: COLOR.textDark,
      isTextBox: true, margin: 0
    });

    // Cot trai: 4 diem nhan kien truc
    const lobbyFeatures = [
      {
        title: 'Cuốn Sách Trung Tâm "Thiên Thư Sử Việt" 3D',
        desc: 'Mô hình 3D lơ lửng giữa không trung, tự động lật mở trang theo bước chân người xem, phát ra luồng hạt ánh sáng Hologram xoắn ốc chứa trích dẫn cổ thi.'
      },
      {
        title: 'Bệ Đài Sen Trống Đồng Đông Sơn',
        desc: 'Chạm khắc nổi tinh xảo hoa văn chim Lạc, mặt trời 14 tia sáng và cảnh giã gạo, biểu trưng cho cội nguồn văn hiến Lạc Long Quân & Âu Cơ.'
      },
      {
        title: 'Đại Cầu Thang Kép & Hàng Cột Lim Hoàng Gia',
        desc: 'Lối kiến trúc Bifurcated Staircase uốn lượn phong cách Indochine sang trọng, kết hợp hàng chục cột lim InstancedMesh tối ưu hóa GPU.'
      },
      {
        title: 'Hồ Sen Ánh Sáng & Hiệu Ứng Nắng Nghiêng (God Rays)',
        desc: 'Mặt nước gợn sóng phản chiếu lung linh, đàn cá chép bơi lội và luồng sáng thể tích rọi nghiêng từ giếng trời trên mái kính.'
      }
    ];

    lobbyFeatures.forEach((feat, idx) => {
      const fy = 1.35 + idx * 0.92;
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.8, y: fy, w: 4.7, h: 0.84,
        rectRadius: 0.08,
        fill: { color: COLOR.bgLightCard },
        line: { color: COLOR.borderLight, width: 1 }
      });

      slide.addText(feat.title, {
        x: 1.0, y: fy + 0.08, w: 4.35, h: 0.28,
        fontFace: FONTS.header, fontSize: 12.5, bold: true, color: COLOR.goldDark,
        isTextBox: true, margin: 0
      });
      slide.addText(feat.desc, {
        x: 1.0, y: fy + 0.36, w: 4.35, h: 0.42,
        fontFace: FONTS.body, fontSize: 9.8, color: '374151',
        lineSpacing: 14, isTextBox: true, margin: 0
      });
    });

    // Cot phai: Hinh anh thuc te Dai sanh & Thien Thu
    if (fs.existsSync(imgAtriumThienThu)) {
      slide.addImage({
        path: imgAtriumThienThu,
        x: 5.75, y: 1.35, w: 3.45, h: 2.65,
        rounding: true
      });
      slide.addShape(pres.ShapeType.roundRect, {
        x: 5.75, y: 4.1, w: 3.45, h: 0.95,
        rectRadius: 0.08,
        fill: { color: '101420' },
        line: { color: COLOR.goldAccent, width: 1 }
      });
      slide.addText('TÂM ĐIỂM ĐỊNH HƯỚNG KHÔNG GIAN BẢO TÀNG', {
        x: 5.85, y: 4.18, w: 3.25, h: 0.25,
        fontFace: FONTS.body, fontSize: 9.5, bold: true, color: COLOR.goldAccent,
        align: 'center', isTextBox: true, margin: 0
      });
      slide.addText('Đại sảnh giữ vai trò trục định hướng trung tâm, phân luồng giao thông thông thoáng dẫn lối trực tiếp tới 8 gian phòng triển lãm chuyên đề.', {
        x: 5.85, y: 4.45, w: 3.25, h: 0.52,
        fontFace: FONTS.body, fontSize: 9, color: COLOR.textMutedLight,
        align: 'center', lineSpacing: 13, isTextBox: true, margin: 0
      });
    }

    slide.addNotes('Đại sảnh bảo tàng là trái tim điều phối không gian, kết hợp hài hòa kiến trúc cổ truyền Đông Sơn, phong cách hoàng cung Indochine và nghệ thuật ánh sáng thể tích WebGL hiện đại.');
  }

  // ==========================================
  // SLIDE 4: 8 GIAN TRIỂN LÃM KIỆT TÁC (DARK THEME)
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLOR.bgDark };

    slide.addText('BẢN ĐỒ TRIỂN LÃM', {
      x: 0.8, y: 0.45, w: 8.4, h: 0.25,
      fontFace: FONTS.body, fontSize: 11, bold: true, color: COLOR.goldAccent,
      isTextBox: true, margin: 0
    });
    slide.addText('Hành Trình Qua 8 Cõi Triển Lãm Văn Học Bất Hủ', {
      x: 0.8, y: 0.72, w: 8.4, h: 0.45,
      fontFace: FONTS.header, fontSize: 22, bold: true, color: COLOR.textWhite,
      isTextBox: true, margin: 0
    });

    const halls = [
      {
        name: '1. Truyện Kiều',
        author: 'Nguyễn Du (Trung Đại)',
        desc: 'Đoạn trường tân thanh, lầu Ngưng Bích u hoài, cung đàn bạc mệnh và bức tượng nàng Kiều tuyệt sắc.',
        accent: COLOR.goldAccent
      },
      {
        name: '2. Con Gái Nam Xương',
        author: 'Nguyễn Dữ (Truyền Kỳ)',
        desc: 'Chiếc bóng oan khuất trên vách nứa, bến sông Hoàng Giang rực đuốc và Đàn Giải Oan kỳ ảo dưới thủy cung.',
        accent: COLOR.emerald
      },
      {
        name: '3. Nam Quốc Sơn Hà',
        author: 'Lý Thường Kiệt / Lý Công Uẩn',
        desc: 'Hào khí non sông sông Như Nguyệt, bài thơ thần định danh độc lập và chiếu dời đô Thăng Long ngàn năm.',
        accent: COLOR.indigoBlue
      },
      {
        name: '4. Thánh Gióng',
        author: 'Truyền Thuyết Dân Gian',
        desc: 'Tượng đài ngựa sắt phun lửa, lũy tre ngà gãy góc quật giặc và dấu chân khổng lồ cứu quốc.',
        accent: COLOR.crimsonRed
      },
      {
        name: '5. An Dương Vương',
        author: 'Thần Thoại Cổ Loa',
        desc: 'Cổ Loa thành ốc 9 vòng xoắn kỳ vĩ, nỏ thần Kim Quy bách phát bách trúng và bi kịch tình - hiếu.',
        accent: COLOR.purpleAccent
      },
      {
        name: '6. Sơn Tinh Thủy Tinh',
        author: 'Thần Thoại Dân Gian',
        desc: 'Đại chiến non Tản Viên và biển thẳm, thác lũ cuộn trào dâng nước với GLSL Shader sống động.',
        accent: '06D6A0'
      },
      {
        name: '7. Vợ Nhặt',
        author: 'Kim Lân (Hiện Thực 1945)',
        desc: 'Xóm ngụ cư nạn đói 1945, nồi cháo cám ấm áp tình mẫu tử và niềm tin son sắt vào ngọn cờ đỏ sao vàng.',
        accent: 'F59E0B'
      },
      {
        name: '8. Đây Thôn Vĩ Dạ',
        author: 'Hàn Mặc Tử / Ngô Tất Tố',
        desc: 'Vườn cau xứ Huế mộng ảo thuyền chở trăng kết hợp phân cảnh quật khởi đêm tối của Chị Dậu.',
        accent: 'EC4899'
      }
    ];

    halls.forEach((h, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const hx = 0.8 + col * 2.18;
      const hy = 1.35 + row * 1.85;

      slide.addShape(pres.ShapeType.roundRect, {
        x: hx, y: hy, w: 2.05, h: 1.72,
        rectRadius: 0.08,
        fill: { color: COLOR.bgDarkCard },
        line: { color: h.accent, width: 1.2 }
      });

      slide.addText(h.name, {
        x: hx + 0.12, y: hy + 0.1, w: 1.81, h: 0.3,
        fontFace: FONTS.header, fontSize: 12.5, bold: true, color: h.accent,
        isTextBox: true, margin: 0
      });

      slide.addText(h.author, {
        x: hx + 0.12, y: hy + 0.4, w: 1.81, h: 0.22,
        fontFace: FONTS.body, fontSize: 8.8, color: COLOR.textMutedLight, italic: true,
        isTextBox: true, margin: 0
      });

      slide.addText(h.desc, {
        x: hx + 0.12, y: hy + 0.66, w: 1.81, h: 0.95,
        fontFace: FONTS.body, fontSize: 9.3, color: 'D1D5DB', lineSpacing: 13.5,
        isTextBox: true, margin: 0
      });
    });

    slide.addNotes('8 phòng triển lãm tái hiện 8 tác phẩm tiêu biểu xuyên suốt tiến trình lịch sử văn học Việt Nam từ Thần thoại, Văn học Trung đại đến Hiện thực phê phán 1930-1945.');
  }

  // ==========================================
  // SLIDE 5: ĐỘT PHÁ CÕI MỞ (ENTERREALM & CHIAROSCURO)
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLOR.bgLight };

    slide.addText('CÔNG NGHỆ ĐỘT PHÁ', {
      x: 0.8, y: 0.45, w: 8.4, h: 0.25,
      fontFace: FONTS.body, fontSize: 11, bold: true, color: COLOR.goldDark,
      isTextBox: true, margin: 0
    });
    slide.addText('Cơ Chế "enterRealm": Xóa Bỏ Giới Hạn Phòng Trưng Bày', {
      x: 0.8, y: 0.72, w: 8.4, h: 0.45,
      fontFace: FONTS.header, fontSize: 22, bold: true, color: COLOR.textDark,
      isTextBox: true, margin: 0
    });

    // 2 anh ben trai
    if (fs.existsSync(imgNamXuong)) {
      slide.addImage({
        path: imgNamXuong,
        x: 0.8, y: 1.35, w: 3.9, h: 1.7,
        rounding: true
      });
    }
    if (fs.existsSync(imgChiaroscuroPortal)) {
      slide.addImage({
        path: imgChiaroscuroPortal,
        x: 0.8, y: 3.2, w: 3.9, h: 1.8,
        rounding: true
      });
    }

    // 4 cot tru cong nghe ben phai
    const techPillars = [
      {
        title: 'Cổng Dịch Chuyển Portal 2 Chiều',
        desc: 'Người dùng chỉ cần tiến lại gần Cổng Portal để bước thẳng từ bảo tàng vào cõi mở 360 độ rộng lớn với tỷ lệ thực tế 1:1.'
      },
      {
        title: 'Nghệ Thuật Ánh Sáng Chiaroscuro Đổ Bóng',
        desc: 'Tái hiện chiếc bóng oan khuất của Vũ Nương trên vách nứa sống động theo thời gian thực nhờ công nghệ PointLight & ShadowMap.'
      },
      {
        title: 'Mặt Nước Đêm & Hạt Lân Tinh (GLSL Shaders)',
        desc: 'Sóng sông Hoàng Giang cuộn sóng đêm, đàn đom đóm phát quang màu ngọc bích #00F5D4 và sương mù FogExp2 huyền ảo.'
      },
      {
        title: 'Hệ Thống Hitbox Box3 Chống Rơi Vực',
        desc: 'Invisible Colliders bọc quanh các bờ sông, vách núi và tường nứa, bảo đảm trải nghiệm di chuyển chân thực, không bao giờ rơi ra ngoài map.'
      }
    ];

    techPillars.forEach((p, idx) => {
      const py = 1.35 + idx * 0.92;
      slide.addShape(pres.ShapeType.roundRect, {
        x: 5.0, y: py, w: 4.2, h: 0.84,
        rectRadius: 0.08,
        fill: { color: COLOR.bgLightCard },
        line: { color: COLOR.borderLight, width: 1 }
      });

      slide.addText(p.title, {
        x: 5.15, y: py + 0.08, w: 3.9, h: 0.28,
        fontFace: FONTS.header, fontSize: 12.5, bold: true, color: COLOR.goldDark,
        isTextBox: true, margin: 0
      });
      slide.addText(p.desc, {
        x: 5.15, y: py + 0.36, w: 3.9, h: 0.42,
        fontFace: FONTS.body, fontSize: 9.8, color: '374151', lineSpacing: 14,
        isTextBox: true, margin: 0
      });
    });

    slide.addNotes('enterRealm là sáng tạo công nghệ độc bản của BaoTang3D: người dùng không chỉ xem hiện vật qua tủ kính mà thực sự bước vào chính không gian của tác phẩm, chứng kiến ánh đèn dầu hắt bóng bi kịch của Vũ Nương.');
  }

  // ==========================================
  // SLIDE 6: BIỆT ĐỘI MÈO AI & HỌC THUẬT LORE 4 CHƯƠNG
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLOR.bgLight };

    slide.addText('TƯƠNG TÁC ĐA PHƯƠNG TIỆN', {
      x: 0.8, y: 0.45, w: 8.4, h: 0.25,
      fontFace: FONTS.body, fontSize: 11, bold: true, color: COLOR.goldDark,
      isTextBox: true, margin: 0
    });
    slide.addText('Biệt Đội Mèo AI Trấn Thủ & Hệ Thống Lore 4 Chương', {
      x: 0.8, y: 0.72, w: 8.4, h: 0.45,
      fontFace: FONTS.header, fontSize: 22, bold: true, color: COLOR.textDark,
      isTextBox: true, margin: 0
    });

    const trioCols = [
      {
        x: 0.8,
        title: '🐾 Biệt Đội 6 Mèo AI Trấn Thủ',
        borderColor: COLOR.goldAccent,
        content: [
          'Hệ thống AI Swarm mang hình tượng văn hóa mèo Việt, phân công trách nhiệm tối ưu:',
          '• Mèo Mướp Trưởng Làng: Chỉ huy toàn diện và điều phối luồng tham quan.',
          '• Mèo Mun Tháp Đèn: Trấn giữ đài quan sát và điều tiết luồng sáng đêm.',
          '• Mèo Tam Thể Kiến Trúc: Giám sát quy hoạch không gian 3 lớp.',
          '• Mèo Trắng Đào Nương: Ngâm thơ và điều phối âm thanh cổ phong.',
          '• Mèo Vàng Thợ Rèn: Rèn đúc hiện vật và tối ưu mô hình 3D PBR.',
          '• Mèo Xiêm Tuần Đinh: Tuần tra va chạm và bảo vệ hiệu năng 60 FPS.'
        ]
      },
      {
        x: 3.8,
        title: '📜 Bảng Lụa Trắng & Lore 4 Chương',
        borderColor: COLOR.emerald,
        content: [
          'Mỗi hiện vật và không gian triển lãm đều tích hợp bảng lụa trắng phát sáng với 4 chương học thuật chuẩn mực:',
          '1. Bối Cảnh Lịch Sử: Hoàn cảnh sáng tác và bối cảnh thời đại của tác giả.',
          '2. Phân Tích Nghệ Thuật: Bút pháp ước lệ, thi pháp và nghệ thuật miêu tả.',
          '3. Trích Đoạn Tinh Hoa: Những câu thơ và lời thoại đắt giá nhất.',
          '4. Ý Nghĩa Thời Đại: Bài học nhân sinh và giá trị nhân đạo soi rọi hôm nay.'
        ]
      },
      {
        x: 6.8,
        title: '🎬 Auto-Tour & Mini-Quiz Tương Tác',
        borderColor: COLOR.indigoBlue,
        content: [
          'Trải nghiệm tham quan và học tập đa giác quan:',
          '• Cinematic Auto-Tour: Lộ trình camera lướt tự động mượt mà qua các góc nhìn điện ảnh đắt giá cho người thích rảnh tay.',
          '• Âm Thanh Định Vị 3D: PositionalAudio tái tạo tiếng ru hời, sóng vỗ, tiếng vó ngựa theo khoảng cách và hướng nhìn.',
          '• Mini-Quiz Tương Tác: Bộ câu hỏi trắc nghiệm kiến thức giúp củng cố bài học ngay trong không gian 3D.'
        ]
      }
    ];

    trioCols.forEach(tc => {
      slide.addShape(pres.ShapeType.roundRect, {
        x: tc.x, y: 1.35, w: 2.75, h: 3.7,
        rectRadius: 0.1,
        fill: { color: COLOR.bgLightCard },
        line: { color: tc.borderColor, width: 1.2 }
      });

      slide.addText(tc.title, {
        x: tc.x + 0.15, y: 1.5, w: 2.45, h: 0.35,
        fontFace: FONTS.header, fontSize: 13, bold: true, color: COLOR.textDark,
        isTextBox: true, margin: 0
      });

      const bullets = tc.content.map((txt, idx) => ({
        text: txt + (idx < tc.content.length - 1 ? '\n' : ''),
        options: {
          bold: idx === 0,
          color: idx === 0 ? COLOR.goldDark : '374151'
        }
      }));

      slide.addText(bullets, {
        x: tc.x + 0.15, y: 1.95, w: 2.45, h: 2.95,
        fontFace: FONTS.body, fontSize: 9.8, lineSpacing: 14.5, isTextBox: true, margin: 0
      });
    });

    slide.addNotes('Hệ thống Lore 4 chương cùng Biệt đội Mèo AI và Auto-Tour biến bảo tàng thành một lớp học Ngữ văn tương tác sinh động, vừa học vừa chơi nhưng bảo đảm tính học thuật sâu sắc.');
  }

  // ==========================================
  // SLIDE 7: TỐI ƯU HIỆU NĂNG WEBGL 60+ FPS (NATIVE CHART)
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLOR.bgDark };

    slide.addText('KỸ THUẬT & TỐI ƯU HÓA', {
      x: 0.8, y: 0.45, w: 8.4, h: 0.25,
      fontFace: FONTS.body, fontSize: 11, bold: true, color: COLOR.goldAccent,
      isTextBox: true, margin: 0
    });
    slide.addText('Kiến Trúc Kỹ Thuật WebGL 60+ FPS Mượt Mà', {
      x: 0.8, y: 0.72, w: 8.4, h: 0.45,
      fontFace: FONTS.header, fontSize: 22, bold: true, color: COLOR.textWhite,
      isTextBox: true, margin: 0
    });

    // Native Chart ben trai: So sanh hieu nang
    const chartData = [
      {
        name: 'Chưa tối ưu',
        labels: ['Draw Calls', 'GPU RAM (x10MB)', 'FPS (khung hình)'],
        values: [85, 180, 28]
      },
      {
        name: 'BaoTang3D Engine',
        labels: ['Draw Calls', 'GPU RAM (x10MB)', 'FPS (khung hình)'],
        values: [6, 42, 60]
      }
    ];

    slide.addChart(pres.ChartType.bar, chartData, {
      x: 0.8, y: 1.35, w: 4.4, h: 3.7,
      showTitle: true,
      title: 'So Sánh Hiệu Năng Đồ Họa WebGL',
      titleFontFace: FONTS.header,
      titleFontSize: 13,
      titleColor: COLOR.textWhite,
      showValue: true,
      dataLabelPosition: 'inEnd',
      dataLabelColor: COLOR.textWhite,
      chartColors: [COLOR.crimsonRed, COLOR.emerald],
      catAxisLabelColor: 'CADCFC',
      valAxisLabelColor: 'CADCFC',
      catAxisLabelFontFace: FONTS.body,
      valAxisLabelFontFace: FONTS.body,
      valGridLine: { color: '20293A', size: 1 },
      catGridLine: { style: 'none' },
      showLegend: true,
      legendPos: 'b',
      legendColor: COLOR.textWhite
    });

    // 4 The Giai Phap Ky Thuat ben phai
    const techSpecs = [
      {
        title: 'InstancedMesh Đột Phá',
        desc: 'Gộp hàng vạn chi tiết kiến trúc lặp lại (cột lim, đèn lồng, hoa sen, ngói đình) thành duy nhất 1 Draw Call tới card đồ họa.'
      },
      {
        title: 'Raycaster Culling 98%',
        desc: 'userData.ignoreRaycaster = true loại bỏ hoàn toàn các hạt lân tinh, tia sáng và mặt nước khỏi luồng tính toán click tương tác.'
      },
      {
        title: 'Zero-Allocation Render Loop',
        desc: 'Không cấp phát bộ nhớ động trong update(timeSec), triệt tiêu hoàn toàn hiện tượng khựng lag do Garbage Collector dọn RAM.'
      },
      {
        title: 'Quản Lý Vòng Đời Tự Động',
        desc: 'Hàm .dispose() thu hồi sạch sẽ Geometry, Texture và Shader khi chuyển cõi, loại trừ 100% nguy cơ rò rỉ bộ nhớ (Memory Leak).'
      }
    ];

    techSpecs.forEach((ts, idx) => {
      const ty = 1.35 + idx * 0.92;
      slide.addShape(pres.ShapeType.roundRect, {
        x: 5.4, y: ty, w: 3.8, h: 0.84,
        rectRadius: 0.08,
        fill: { color: COLOR.bgDarkCard },
        line: { color: COLOR.bgDarkBorder, width: 1 }
      });

      slide.addText(ts.title, {
        x: 5.55, y: ty + 0.08, w: 3.5, h: 0.28,
        fontFace: FONTS.header, fontSize: 12, bold: true, color: COLOR.goldAccent,
        isTextBox: true, margin: 0
      });
      slide.addText(ts.desc, {
        x: 5.55, y: ty + 0.36, w: 3.5, h: 0.42,
        fontFace: FONTS.body, fontSize: 9.5, color: 'D1D5DB', lineSpacing: 13.5,
        isTextBox: true, margin: 0
      });
    });

    slide.addNotes('Biểu đồ so sánh chỉ số đo đạc thực tế: BaoTang3D cắt giảm tới 93% số lượng Draw Calls và duy trì tốc độ 60 khung hình/giây mượt mà nhờ InstancedMesh và kỹ thuật quản trị tài nguyên chặt chẽ.');
  }

  // ==========================================
  // SLIDE 8: LỘ TRÌNH CHIẾN LƯỢC & TỔNG KẾT
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLOR.bgLight };

    slide.addText('LỘ TRÌNH CHIẾN LƯỢC', {
      x: 0.8, y: 0.45, w: 8.4, h: 0.25,
      fontFace: FONTS.body, fontSize: 11, bold: true, color: COLOR.goldDark,
      isTextBox: true, margin: 0
    });
    slide.addText('Lộ Trình Phát Triển & Kế Hoạch Mở Rộng 2026 - 2027', {
      x: 0.8, y: 0.72, w: 8.4, h: 0.45,
      fontFace: FONTS.header, fontSize: 22, bold: true, color: COLOR.textDark,
      isTextBox: true, margin: 0
    });

    // 4 Giai Doan
    const roadmap = [
      {
        phase: 'GIAI ĐOẠN 1',
        status: 'HOÀN THÀNH',
        statusColor: COLOR.emerald,
        title: 'Dựng Cốt Lõi 3D',
        items: [
          '• Đại Sảnh Hoàng Cung & Sách Thiên Thư 3D.',
          '• 8 Cõi Triển Lãm Kiệt Tác Văn Học.',
          '• Động cơ 60 FPS & Hitbox Box3 an toàn.'
        ]
      },
      {
        phase: 'GIAI ĐOẠN 2',
        status: 'HIỆN TẠI',
        statusColor: COLOR.indigoBlue,
        title: 'Trải Nghiệm Đa Giác Quan',
        items: [
          '• Biệt đội 6 Mèo AI trấn thủ tương tác.',
          '• Hệ thống Lore 4 chương & Quiz học tập.',
          '• Video Texture điện ảnh & Auto-Tour.'
        ]
      },
      {
        phase: 'GIAI ĐOẠN 3',
        status: 'QUÝ 3-4/2026',
        statusColor: COLOR.goldDark,
        title: 'Không Gian WebXR & VR',
        items: [
          '• Tương thích Apple Vision Pro & Quest.',
          '• Điều khiển bằng cử chỉ tay tự nhiên.',
          '• Âm thanh vòm Dolby Atmos không gian.'
        ]
      },
      {
        phase: 'GIAI ĐOẠN 4',
        status: 'NĂM 2027',
        statusColor: COLOR.purpleAccent,
        title: 'Cộng Đồng Multi-User AI',
        items: [
          '• Lớp học trực tuyến nhiều người tham gia.',
          '• AI Thuyết minh viên đa ngôn ngữ (En/Fr).',
          '• Tự do sáng tạo cõi văn học cá nhân.'
        ]
      }
    ];

    roadmap.forEach((rm, idx) => {
      const rx = 0.8 + idx * 2.18;
      slide.addShape(pres.ShapeType.roundRect, {
        x: rx, y: 1.35, w: 2.05, h: 2.65,
        rectRadius: 0.08,
        fill: { color: COLOR.bgLightCard },
        line: { color: COLOR.borderLight, width: 1.2 }
      });

      slide.addText(rm.phase, {
        x: rx + 0.12, y: 1.48, w: 1.81, h: 0.22,
        fontFace: FONTS.body, fontSize: 8.8, color: COLOR.textMutedDark, bold: true,
        isTextBox: true, margin: 0
      });

      slide.addText(rm.status, {
        x: rx + 0.12, y: 1.72, w: 1.81, h: 0.25,
        fontFace: FONTS.body, fontSize: 9.2, bold: true, color: rm.statusColor,
        isTextBox: true, margin: 0
      });

      slide.addText(rm.title, {
        x: rx + 0.12, y: 2.02, w: 1.81, h: 0.35,
        fontFace: FONTS.header, fontSize: 13, bold: true, color: COLOR.textDark,
        isTextBox: true, margin: 0
      });

      slide.addText(rm.items.join('\n\n'), {
        x: rx + 0.12, y: 2.45, w: 1.81, h: 1.4,
        fontFace: FONTS.body, fontSize: 9.3, color: '374151', lineSpacing: 13,
        isTextBox: true, margin: 0
      });
    });

    // Banner tong ket trang trong
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 4.15, w: 8.6, h: 0.95,
      rectRadius: 0.08,
      fill: { color: '101420' },
      line: { color: COLOR.goldAccent, width: 1 }
    });
    slide.addText('🏛️  BẢO TÀNG VĂN HỌC ẢO 3D — KẾT NỐI TINH HOA QUÁ KHỨ BẰNG CÔNG NGHỆ TƯƠNG LAI', {
      x: 0.9, y: 4.25, w: 8.4, h: 0.35,
      fontFace: FONTS.header, fontSize: 13, bold: true, color: COLOR.goldAccent,
      align: 'center', isTextBox: true, margin: 0
    });
    slide.addText('Dự án khẳng định sức sống bất diệt của văn chương Việt Nam trong kỷ nguyên số. Trân trọng cảm ơn sự quan tâm của quý vị!', {
      x: 0.9, y: 4.62, w: 8.4, h: 0.38,
      fontFace: FONTS.body, fontSize: 10, color: COLOR.textMutedLight,
      align: 'center', isTextBox: true, margin: 0
    });

    slide.addNotes('Lộ trình phát triển được định hướng rõ ràng từ WebGL nền tảng đến thực tế ảo WebXR và cộng đồng giáo dục số. Xin chân thành cảm ơn quý vị đã lắng nghe.');
  }

  // 3. Xuat file PPTX
  const outputPath = path.resolve(__dirname, '../BaoTangVanHoc3D_Presentation.pptx');
  await pres.writeFile({ fileName: outputPath });
  console.log(`[SUCCESS] Presentation exported to: ${outputPath}`);

  // 4. Ap dung Theme chuyen nghiep qua applyTheme script
  const { applyTheme } = require('../.agent/skills/pptx/scripts/apply_theme.cjs');
  const THEME = {
    name: 'VietnameseHeritageTheme',
    colors: {
      dk1: '111827',
      lt1: 'FFFFFF',
      dk2: '161D27',
      lt2: 'F8F9FA',
      accent1: 'D4AF37',
      accent2: '00A896',
      accent3: '2563EB',
      accent4: 'E63946',
      accent5: '8B5CF6',
      accent6: 'F59E0B',
      hlink: '2563EB',
      folHlink: '7C3AED'
    }
  };

  try {
    await applyTheme(outputPath, THEME);
    console.log('[SUCCESS] Theme applied successfully to presentation!');
  } catch (err) {
    console.warn('[WARNING] Note on applyTheme:', err.message);
  }
}

createMuseumPresentation().catch(err => {
  console.error('[ERROR] Failed to create presentation:', err);
  process.exit(1);
});
