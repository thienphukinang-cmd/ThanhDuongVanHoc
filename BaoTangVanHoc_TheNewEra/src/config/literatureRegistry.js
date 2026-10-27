/**
 * LITERATURE REGISTRY (DANH MỤC DỮ LIỆU CHUẨN HÓA 15 TÁC PHẨM VĂN HỌC & DIORAMA ENGINE)
 * Lead Architect & Art Director WebGL Specification
 * 
 * Quy hoạch 15 không gian trưng bày tiểu cảnh (Diorama) phân bổ đều cho 3 tầng:
 * - TẦNG 1: Văn học Dân gian & Sử thi (Ánh sáng Vàng đồng / Lửa thiêng, Sàn Đất nung / Sỏi rêu)
 * - TẦNG 2: Văn học Trung đại (Ánh sáng Lam ngọc / Hổ phách, Sàn Gỗ trắc cổ)
 * - TẦNG 3: Văn học Cận - Hiện đại (Ánh sáng Trắng bạc / Đỏ son, Sàn Gạch vỡ / Xi măng cổ)
 * 
 * Bổ sung Schema:
 * - atmosphere: { primaryColor, secondaryColor, lightIntensity, fogDensity, particleType }
 * - dioramaAssets: Mảng 2-3 mô hình đặc trưng kèm scale chuẩn (1.8m - 3.0m cho vật chính), offset và prompt Tripo API
 */

export const LITERATURE_REGISTRY = [
  // =========================================================================
  // TẦNG 1: VĂN HỌC DÂN GIAN & SỬ THI (ELEVATION Y = 0.0)
  // Sàn tiểu cảnh: Đất nung / sỏi rêu cổ đại
  // =========================================================================
  {
    id: 'thanh_giong',
    name: 'Thánh Gióng',
    author: 'Dân gian Việt Nam',
    era: 'Văn học Dân gian & Sử thi',
    floor: 1,
    roomIndex: 0, // Cánh Tây-Nam
    themeColor: 0xe67e22, // Vàng đồng rực lửa
    quote: 'Gióng nhổ từng bụi tre đằng ngà quất tan giặc Ân, cởi áo giáp bay về trời, non nước thái bình muôn thuở.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0xe67e22,
      secondaryColor: 0xc0392b,
      lightIntensity: 2.2,
      fogDensity: 0.015,
      particleType: 'embers'
    },
    dioramaAssets: [
      {
        file: 'ngua_sat.glb',
        name: 'Ngựa sắt thần phù',
        scale: 2.5,
        offset: { x: 0.0, y: 0.0, z: 0.8 },
        prompt: 'An ancient Vietnamese mythical iron horse statue, dark burnished metal with golden engravings, valiant warrior warhorse, game-ready 3D asset'
      },
      {
        file: 'bui_tre_dang_nga.glb',
        name: 'Bụi tre đằng ngà',
        scale: 2.8,
        offset: { x: -1.3, y: 0.0, z: -0.6 },
        prompt: 'A cluster of golden yellow bamboo stalks with lush leaves, Vietnamese legendary bamboo, stylized PBR 3D model'
      },
      {
        file: 'ao_giap_sat.glb',
        name: 'Chiến giáp & mũ sắt',
        scale: 1.6,
        offset: { x: 1.2, y: 0.0, z: 0.5 },
        prompt: 'Ancient Vietnamese iron armor suit and helmet on wooden armor stand, bronze details, epic folklore'
      }
    ]
  },
  {
    id: 'son_tinh_thuy_tinh',
    name: 'Sơn Tinh – Thủy Tinh',
    author: 'Dân gian Việt Nam',
    era: 'Thần thoại & Truyền thuyết Cổ đại',
    floor: 1,
    roomIndex: 1, // Cánh Tây-Bắc
    themeColor: 0x2980b9, // Lam ngọc bão tố
    quote: 'Nước dâng cao bao nhiêu, núi cao lên bấy nhiêu – Bản hùng ca bất diệt chinh phục thiên nhiên của người Việt cổ.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0x2980b9,
      secondaryColor: 0x16a085,
      lightIntensity: 2.0,
      fogDensity: 0.02,
      particleType: 'fog'
    },
    dioramaAssets: [
      {
        file: 'dinh_tan_vien.glb',
        name: 'Đỉnh núi Tản Viên',
        scale: 2.4,
        offset: { x: 0.0, y: 0.0, z: -0.8 },
        prompt: 'Majestic miniature Tan Vien mountain rock peak, mossy cliffs and bonsai pine trees, Vietnamese folklore 3D diorama'
      },
      {
        file: 'voi_chin_nga.glb',
        name: 'Lễ vật voi chín ngà',
        scale: 2.0,
        offset: { x: 1.2, y: 0.0, z: 0.8 },
        prompt: 'Mythological sacred nine-tusked elephant sculpture, white ivory, ancient royal ceremonial artifact'
      },
      {
        file: 'cot_song_thuy_tinh.glb',
        name: 'Cột sóng cuộn Thủy Tinh',
        scale: 2.2,
        offset: { x: -1.2, y: 0.0, z: 0.6 },
        prompt: 'Stylized swirling stormy ocean tidal wave vortex column, jade blue water foam, dynamic 3D asset'
      }
    ]
  },
  {
    id: 'an_duong_vuong',
    name: 'Truyện An Dương Vương & Mỵ Châu – Trọng Thủy',
    author: 'Truyền thuyết Cổ thành',
    era: 'Truyền thuyết Lịch sử',
    floor: 1,
    roomIndex: 2, // Cánh Bắc - Đại Gian
    themeColor: 0xd35400, // Đỏ đồng bi tráng
    quote: 'Nỏ thần vô ý trao tay giặc – Bi kịch dựng nước và bài học cảnh giác muôn đời vọng lại từ ngàn xưa nơi Cổ Loa thành.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0xd35400,
      secondaryColor: 0x8e44ad,
      lightIntensity: 2.1,
      fogDensity: 0.015,
      particleType: 'dust'
    },
    dioramaAssets: [
      {
        file: 'no_than_kim_quy.glb',
        name: 'Nỏ thần Linh Quang Kim Quy',
        scale: 2.0,
        offset: { x: 0.0, y: 0.2, z: 0.5 },
        prompt: 'Ancient Vietnamese legendary divine crossbow with golden magic trigger and claw, bronze mechanisms, royal relic'
      },
      {
        file: 'thanh_co_loa.glb',
        name: 'Thành ốc Cổ Loa thu nhỏ',
        scale: 2.6,
        offset: { x: -1.3, y: 0.0, z: -0.7 },
        prompt: 'Spiral citadel ancient brick stone rampart bastion of Co Loa with watchtower, weathered clay masonry'
      },
      {
        file: 'rua_vang.glb',
        name: 'Kim Quy Thần Thú',
        scale: 1.4,
        offset: { x: 1.1, y: 0.0, z: 0.7 },
        prompt: 'Mythical golden turtle deity Kim Quy resting on engraved bronze plinth, gleaming polished bronze'
      }
    ]
  },
  {
    id: 'su_tich_trau_cau',
    name: 'Sự tích Trầu Cau',
    author: 'Cổ tích dân gian',
    era: 'Truyện Cổ tích Việt Nam',
    floor: 1,
    roomIndex: 3, // Cánh Đông-Bắc
    themeColor: 0x27ae60, // Xanh trầu keo sơn
    quote: 'Miếng trầu là đầu câu chuyện – Biểu tượng son sắt cho tình nghĩa anh em hòa thuận, vợ chồng thủy chung gắn bó.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0x27ae60,
      secondaryColor: 0xd35400,
      lightIntensity: 1.8,
      fogDensity: 0.012,
      particleType: 'leaves'
    },
    dioramaAssets: [
      {
        file: 'cay_cau_va_day_trau.glb',
        name: 'Thân cau & Dây trầu quấn',
        scale: 2.8,
        offset: { x: -0.8, y: 0.0, z: -0.5 },
        prompt: 'A slender tropical areca palm tree with verdant betel vine climbing tightly around trunk, Vietnamese folklore'
      },
      {
        file: 'tang_da_voi.glb',
        name: 'Tảng đá vôi hóa thân',
        scale: 1.8,
        offset: { x: 0.8, y: 0.0, z: 0.6 },
        prompt: 'Weathered white limestone boulder monolith covered in green moss, natural rock diorama sculpture'
      },
      {
        file: 'coi_trau_dong.glb',
        name: 'Cơi trầu & bình vôi cổ',
        scale: 1.0,
        offset: { x: 0.2, y: 0.0, z: 1.2 },
        prompt: 'Antique Vietnamese ornate bronze betel tray with carved brass lime jar and betel knife, traditional folk art'
      }
    ]
  },
  {
    id: 'de_dat_de_nuoc',
    name: 'Đẻ đất đẻ nước',
    author: 'Sử thi Mường',
    era: 'Sử thi Dân tộc Cổ đại',
    floor: 1,
    roomIndex: 4, // Cánh Đông-Nam
    themeColor: 0xc0392b, // Lửa thiêng khởi nguyên
    quote: 'Bản tráng ca khởi nguyên huyền vĩ về cội nguồn trời đất, sự sinh sôi của vạn vật và hành trình khai sơn lập địa.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0xc0392b,
      secondaryColor: 0xf39c12,
      lightIntensity: 2.3,
      fogDensity: 0.02,
      particleType: 'embers'
    },
    dioramaAssets: [
      {
        file: 'trong_dong_dong_son.glb',
        name: 'Trống đồng cổ đại',
        scale: 2.0,
        offset: { x: 0.0, y: 0.0, z: 0.4 },
        prompt: 'Ancient Dong Son bronze drum, concentric geometric engravings, sun star motif, antique green patina'
      },
      {
        file: 'cay_chu_dong.glb',
        name: 'Cây Chu Đồng vũ trụ',
        scale: 2.7,
        offset: { x: -1.2, y: 0.0, z: -0.6 },
        prompt: 'Mythological sacred bronze cosmic tree of life from Muong epic poetry, ancient branches, bronze leaves'
      },
      {
        file: 'dinh_lua_thieng.glb',
        name: 'Đỉnh lửa thiêng khai sơn',
        scale: 1.5,
        offset: { x: 1.2, y: 0.0, z: 0.6 },
        prompt: 'Ancient tribal stone fire brazier with burning embers and primordial flame, ceremonial shrine'
      }
    ]
  },

  // =========================================================================
  // TẦNG 2: VĂN HỌC TRUNG ĐẠI (ELEVATION Y = 10.0)
  // Sàn tiểu cảnh: Gỗ trắc cổ sơn mài bóng mạ đồng
  // =========================================================================
  {
    id: 'truyen_kieu',
    name: 'Truyện Kiều',
    author: 'Đại thi hào Nguyễn Du (1765 – 1820)',
    era: 'Truyện thơ Nôm (Văn học Trung đại)',
    floor: 2,
    roomIndex: 0, // Cánh Tây-Nam (Phòng mẫu 01)
    themeColor: 0x39e58c, // Lam ngọc bích phát sáng
    quote: 'Đoạn trường tân thanh – Khúc ca bi tráng về tài mệnh tương đố, tấm lòng nhân đạo bao la và khát vọng tự do ngút trời.',
    portalReady: true, // ĐÃ KẾT NỐI KIEUWORLD
    atmosphere: {
      primaryColor: 0xffb703, // Cam hổ phách ấm áp (Warm Amber)
      secondaryColor: 0x2a1b38, // Tím than chạng vạng u buồn (Deep Violet)
      moonlightColor: 0xe8f0ff, // Ánh trăng thu bàng bạc dịu mát
      lightIntensity: 2.0,
      fogDensity: 0.015,
      particleType: 'petals' // Cánh hoa đào rơi / Bụi thời gian
    },
    dioramaAssets: [
      {
        file: 'binh_phong.glb',
        name: 'Bình phong gỗ chạm hoa sen',
        scale: 1.8,
        offset: { x: 0.0, y: 0.0, z: -1.2 },
        prompt: 'A traditional Asian wooden folding screen room divider, carved lotus pattern, dark wood, elegant, game-ready 3D asset'
      },
      {
        file: 'an_thu.glb',
        name: 'Án thư cổ gỗ gụ',
        scale: 1.2,
        offset: { x: 0.0, y: 0.0, z: 0.0 },
        prompt: 'An elegant antique Vietnamese scholar desk, carved dark mahogany wood, traditional Asian furniture, highly detailed, game-ready 3D model'
      },
      {
        file: 'ban_tho_tho.glb',
        name: 'Lọ hoa sen & Khay mực bút lông',
        scale: 0.45,
        offset: { x: -0.35, y: 0.70, z: 0.0 },
        prompt: 'A vintage ceramic vase with blooming lotus flowers next to a traditional inkstone and calligraphy brush, game-ready 3D prop'
      },
      {
        file: 'dan_ty_ba.glb',
        name: 'Đàn Tỳ Bà khảm xà cừ',
        scale: 0.95,
        offset: { x: 0.25, y: 0.70, z: 0.05 },
        prompt: 'An antique Vietnamese lacquer Pipa lute, traditional musical instrument, dark red mahogany wood, mother-of-pearl floral inlay, clean topology, game-ready 3D asset'
      }
    ]
  },
  {
    id: 'nam_quoc_son_ha',
    name: 'Nam quốc sơn hà',
    author: 'Tương truyền Lý Thường Kiệt (1019 – 1105)',
    era: 'Thơ ca Trung đại (Thời Lý)',
    floor: 2,
    roomIndex: 1, // Cánh Tây-Bắc
    themeColor: 0xf1c40f, // Hoàng kim đế vương
    quote: 'Nam quốc sơn hà Nam đế cư, tiệt nhiên định phận tại thiên thư – Bản tuyên ngôn độc lập đầu tiên khẳng định chủ quyền sông núi.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0xf1c40f,
      secondaryColor: 0xbdc3c7,
      lightIntensity: 2.2,
      fogDensity: 0.012,
      particleType: 'dust'
    },
    dioramaAssets: [
      {
        file: 'bia_da_than_phap.glb',
        name: 'Bia đá thần phán Định phận',
        scale: 2.3,
        offset: { x: 0.0, y: 0.0, z: -0.8 },
        prompt: 'Ancient royal stone stele monolith on carved turtle base, inscribed with golden classical poetry characters'
      },
      {
        file: 'kiem_lenh_trieu_ly.glb',
        name: 'Bảo kiếm lệnh triều Lý',
        scale: 1.8,
        offset: { x: 1.1, y: 0.3, z: 0.8 },
        prompt: 'Imperial Ly dynasty ceremonial dragon commander sword resting on lacquered gold stand, ancient steel blade'
      },
      {
        file: 'trong_chien_tran.glb',
        name: 'Trống trận phòng tuyến Như Nguyệt',
        scale: 1.9,
        offset: { x: -1.2, y: 0.0, z: 0.7 },
        prompt: 'Traditional red lacquered wooden battle drum on carved frame, golden dragon patterns, fortress garrison'
      }
    ]
  },
  {
    id: 'hich_tuong_si',
    name: 'Hịch tướng sĩ',
    author: 'Hưng Đạo Đại Vương Trần Quốc Tuấn (1228 – 1300)',
    era: 'Văn nghị luận Trung đại (Thời Trần)',
    floor: 2,
    roomIndex: 2, // Cánh Bắc - Đại Gian
    themeColor: 0xe74c3c, // Khí phách Đông A rực lửa
    quote: 'Ta thường tới bữa quên ăn, nửa đêm vỗ gối, ruột đau như cắt, nước mắt đầm đìa... – Hào khí Đông A bách chiến bách thắng.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0xe74c3c,
      secondaryColor: 0x34495e,
      lightIntensity: 2.5,
      fogDensity: 0.018,
      particleType: 'embers'
    },
    dioramaAssets: [
      {
        file: 'coc_go_bach_dang.glb',
        name: 'Cọc nhọn Bạch Đằng bọc sắt',
        scale: 2.8,
        offset: { x: -0.9, y: 0.0, z: -0.4 },
        prompt: 'Heavy ancient sharpened iron-tipped wooden battle stake from Bach Dang river, barnacles and weathered wood'
      },
      {
        file: 'khien_va_chien_kich.glb',
        name: 'Khiên đồng & Chiến kích thời Trần',
        scale: 2.1,
        offset: { x: 1.1, y: 0.0, z: 0.6 },
        prompt: 'Tran dynasty bronze circular warrior shield and steel halberd spear stand, martial heroic heritage'
      },
      {
        file: 'gia_duoc_dong_a.glb',
        name: 'Tháp đuốc chiến lũy Đông A',
        scale: 2.0,
        offset: { x: 0.1, y: 0.0, z: 1.2 },
        prompt: 'Ancient wrought iron war torch brazier with blazing embers, battlefield fortification prop'
      }
    ]
  },
  {
    id: 'binh_ngo_dai_cao',
    name: 'Bình Ngô đại cáo',
    author: 'Đại thi hào Nguyễn Trãi (1380 – 1442)',
    era: 'Văn cáo Trung đại (Thời Hậu Lê)',
    floor: 2,
    roomIndex: 3, // Cánh Đông-Bắc
    themeColor: 0xe67e22, // Hổ phách đại nghĩa
    quote: 'Đem đại nghĩa để thắng hung tàn, lấy chí nhân để thay cường bạo – Thiên cổ hùng văn muôn đời vang vọng.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0xe67e22,
      secondaryColor: 0xf1c40f,
      lightIntensity: 2.2,
      fogDensity: 0.014,
      particleType: 'dust'
    },
    dioramaAssets: [
      {
        file: 'ban_chieu_thu_lam_son.glb',
        name: 'Bàn nghiên bút & Chiếu thư Lam Sơn',
        scale: 2.0,
        offset: { x: 0.0, y: 0.0, z: 0.3 },
        prompt: 'Imperial wooden scholar desk with unrolled golden silk scroll decree, stone inkwell, calligraphy brush on jade rest'
      },
      {
        file: 'co_lenh_khoi_nghia.glb',
        name: 'Đại kỳ khởi nghĩa Lam Sơn',
        scale: 2.7,
        offset: { x: -1.3, y: 0.0, z: -0.7 },
        prompt: 'Embroidered silk military command banner flag on tall dark bamboo spear, Lam Son uprising insignia'
      },
      {
        file: 'an_tin_hoang_de.glb',
        name: 'Ngọc tỷ Bình Ngô',
        scale: 1.1,
        offset: { x: 1.1, y: 0.0, z: 0.8 },
        prompt: 'Imperial royal gold seal with dragon finial handle on red silk velvet pedestal cushion, ancient dynasties'
      }
    ]
  },
  {
    id: 'nguoi_con_gai_nam_xuong',
    name: 'Chuyện người con gái Nam Xương',
    author: 'Nguyễn Dữ (Thế kỷ XVI)',
    era: 'Truyền kỳ mạn lục',
    floor: 2,
    roomIndex: 4, // Cánh Đông-Nam
    themeColor: 0x9b59b6, // Tím sương khói Hoàng Giang
    quote: 'Nỗi oan tiết liệt của người phụ nữ đức hạnh, bóng mờ ảo vọng trên vách tường và bến Hoàng Giang sương khói ngút ngàn.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0x9b59b6,
      secondaryColor: 0x3498db,
      lightIntensity: 1.8,
      fogDensity: 0.025,
      particleType: 'fog'
    },
    dioramaAssets: [
      {
        file: 'chiec_den_dau_co.glb',
        name: 'Đèn dầu in bóng vách tường',
        scale: 1.6,
        offset: { x: 0.8, y: 0.0, z: 0.9 },
        prompt: 'Antique brass oil lamp casting silhouette shadow against wooden partition screen, bittersweet folk legend'
      },
      {
        file: 'tram_cai_ngoc.glb',
        name: 'Trâm ngọc bích & Hộp trang điểm',
        scale: 1.0,
        offset: { x: -0.9, y: 0.0, z: 1.1 },
        prompt: 'Exquisite antique jade hairpin with pearl drop and carved mother-of-pearl jewelry box, heirloom of womanhood'
      },
      {
        file: 'thuyen_nan_song_hoang.glb',
        name: 'Thuyền nan bến Hoàng Giang',
        scale: 2.4,
        offset: { x: -0.3, y: 0.0, z: -0.8 },
        prompt: 'Small traditional rustic wooden sampan boat resting on misty river reeds, Hoang Giang river tragedy'
      }
    ]
  },

  // =========================================================================
  // TẦNG 3: VĂN HỌC CẬN – HIỆN ĐẠI (ELEVATION Y = 20.0)
  // Sàn tiểu cảnh: Nền gạch vỡ / Xi măng rêu phong thời chiến
  // =========================================================================
  {
    id: 'chi_pheo',
    name: 'Chí Phèo',
    author: 'Nam Cao (1915 – 1951)',
    era: 'Hiện thực phê phán (1930 – 1945)',
    floor: 3,
    roomIndex: 0, // Cánh Tây-Nam
    themeColor: 0xc0392b, // Đỏ son bi phẫn
    quote: 'Ai cho tao lương thiện? – Tiếng kêu đòi lương tri nhức nhối xé toang đêm tối làng Vũ Đại trước bờ vực tha hóa.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0xc0392b,
      secondaryColor: 0xd35400,
      lightIntensity: 2.0,
      fogDensity: 0.018,
      particleType: 'dust'
    },
    dioramaAssets: [
      {
        file: 'lo_gach_cu.glb',
        name: 'Lò gạch cũ hoang phế',
        scale: 2.8,
        offset: { x: -0.9, y: 0.0, z: -0.6 },
        prompt: 'Weathered abandoned old red clay brick kiln with crumbling archway and wild weeds, Vu Dai village realism'
      },
      {
        file: 'chai_ruou_va_chong_tre.glb',
        name: 'Chõng tre & Chai rượu sứt',
        scale: 1.8,
        offset: { x: 0.9, y: 0.0, z: 0.6 },
        prompt: 'Old rustic bamboo cot bed with broken glass rice wine bottle and chipped tea bowl, rural Vietnam 1930s'
      },
      {
        file: 'bat_chao_hanh.glb',
        name: 'Bát cháo hành Thị Nở',
        scale: 0.9,
        offset: { x: 0.1, y: 0.0, z: 1.1 },
        prompt: 'Traditional clay bowl of steaming onion porridge with rough ceramic spoon on wooden stool, poignant human warmth'
      }
    ]
  },
  {
    id: 'tat_den',
    name: 'Tắt đèn',
    author: 'Ngô Tất Tố (1893 – 1954)',
    era: 'Hiện thực phê phán',
    floor: 3,
    roomIndex: 1, // Cánh Tây-Bắc
    themeColor: 0x34495e, // Đen xám nông thôn bế tắc
    quote: 'Bức tranh đêm đen nghẹt thở của nông thôn Việt Nam trước cách mạng và ngọn lửa quật khởi bừng cháy của chị Dậu.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0x34495e,
      secondaryColor: 0x7f8c8d,
      lightIntensity: 1.5,
      fogDensity: 0.028,
      particleType: 'fog'
    },
    dioramaAssets: [
      {
        file: 'ngon_den_dau_mua_gio.glb',
        name: 'Đèn dầu leo lét trong bão đêm',
        scale: 1.4,
        offset: { x: 0.8, y: 0.0, z: 0.8 },
        prompt: 'Small rusty tin kerosene lamp with dim glass chimney flickering in the dark, rural poverty 1930s'
      },
      {
        file: 'cui_go_nhot_suu.glb',
        name: 'Gông cùm sưu thuế',
        scale: 2.4,
        offset: { x: -1.0, y: 0.0, z: -0.6 },
        prompt: 'Oppressive heavy wooden prison stocks and cage beam for peasant tax collection, bleak colonial realism'
      },
      {
        file: 'non_la_rach_va_don_ganh.glb',
        name: 'Nón lá rách & Đòn gánh tre',
        scale: 1.8,
        offset: { x: 0.1, y: 0.0, z: 1.2 },
        prompt: 'Tattered conical leaf hat and curved bamboo shoulder yoke pole with baskets, enduring peasant mother'
      }
    ]
  },
  {
    id: 'so_do',
    name: 'Số đỏ',
    author: 'Vũ Trọng Phụng (1912 – 1939)',
    era: 'Tiểu thuyết trào phúng Hiện đại',
    floor: 3,
    roomIndex: 2, // Cánh Bắc - Đại Gian
    themeColor: 0x8e44ad, // Tím trào phúng kịch cỡm
    quote: 'Kiệt tác trào phúng đỉnh cao vạch trần xã hội Âu hóa rởm đời, nhố nhăng đồi bại của một thời thị dân nửa mùa.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0x8e44ad,
      secondaryColor: 0xe74c3c,
      lightIntensity: 2.4,
      fogDensity: 0.01,
      particleType: 'dust'
    },
    dioramaAssets: [
      {
        file: 'manocanh_ngay_tho.glb',
        name: 'Ma-nơ-canh mốt "Ngây Thơ"',
        scale: 2.1,
        offset: { x: -0.9, y: 0.0, z: 0.4 },
        prompt: '1930s flamboyant Indochine art deco tailor mannequin wearing eccentric modern reform European suit'
      },
      {
        file: 'vot_tennis_va_mu_phot.glb',
        name: 'Vợt quần vợt & Mũ phớt Xuân',
        scale: 1.5,
        offset: { x: 0.9, y: 0.0, z: 0.7 },
        prompt: 'Vintage wooden tennis racket and stylish felt fedora hat on velvet brass stool, satirical bourgeois Hanoi'
      },
      {
        file: 'xe_keo_tay_co.glb',
        name: 'Xe kéo tay tư sản Hà thành',
        scale: 2.6,
        offset: { x: 0.1, y: 0.0, z: -0.8 },
        prompt: 'Antique Hanoi two-wheeled rickshaw carriage with red lacquered accents and wooden canopy, 1930s urban'
      }
    ]
  },
  {
    id: 'vo_nhat',
    name: 'Vợ nhặt',
    author: 'Kim Lân (1920 – 2007)',
    era: 'Văn học Hiện thực Cách mạng',
    floor: 3,
    roomIndex: 3, // Cánh Đông-Bắc
    themeColor: 0xd35400, // Hoàng hôn nạn đói ấm áp tình người
    quote: 'Sức sống kỳ diệu, tình người cưu mang và niềm tin hướng về sự sống trước thềm nạn đói kinh hoàng 1945.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0xd35400,
      secondaryColor: 0xf39c12,
      lightIntensity: 1.8,
      fogDensity: 0.022,
      particleType: 'dust'
    },
    dioramaAssets: [
      {
        file: 'xe_bo_cho_lua.glb',
        name: 'Chiếc xe bò đẩy tay của Tràng',
        scale: 2.7,
        offset: { x: -0.8, y: 0.0, z: -0.4 },
        prompt: 'Rustic wooden hand-pulled ox cart wheelbarrow with worn wooden wheels, 1945 famine era, poignant history'
      },
      {
        file: 'noi_chao_cam.glb',
        name: 'Nồi cháo cám ấm áp tình người',
        scale: 1.4,
        offset: { x: 0.9, y: 0.0, z: 0.6 },
        prompt: 'Blackened rough earthenware pot of bran porridge steaming on crude clay wood-burning stove'
      },
      {
        file: 'den_dau_hai_hao.glb',
        name: 'Đèn dầu cưới hai hào',
        scale: 0.9,
        offset: { x: 0.1, y: 0.0, z: 1.2 },
        prompt: 'Humble two-dime kerosene wedding lamp on rough wooden crate table, warm beacon of hope in darkness'
      }
    ]
  },
  {
    id: 'day_thon_vi_da',
    name: 'Đây thôn Vĩ Dạ',
    author: 'Hàn Mặc Tử (1912 – 1940)',
    era: 'Phong trào Thơ Mới (1932 – 1945)',
    floor: 3,
    roomIndex: 4, // Cánh Đông-Nam
    themeColor: 0x1abc9c, // Trắng bạc ngọc bích sương mờ
    quote: 'Sao anh không về chơi thôn Vĩ? – Bức tranh xứ Huế thơ mộng mờ sương và nỗi hoài niệm u uẩn, khắc khoải tình đời.',
    portalReady: false,
    atmosphere: {
      primaryColor: 0x1abc9c,
      secondaryColor: 0x16a085,
      lightIntensity: 2.0,
      fogDensity: 0.022,
      particleType: 'fog'
    },
    dioramaAssets: [
      {
        file: 'hang_cau_muot_xanh.glb',
        name: 'Hàng cau nắng mới Vĩ Dạ',
        scale: 2.9,
        offset: { x: -1.1, y: 0.0, z: -0.6 },
        prompt: 'A pair of graceful slender green areca palm trees with morning sunlight dewdrops, poetic garden of Vi Da'
      },
      {
        file: 'thuyen_trang_song_huong.glb',
        name: 'Thuyền chở trăng sông Hương',
        scale: 2.4,
        offset: { x: 0.9, y: 0.0, z: 0.4 },
        prompt: 'A slender wooden river boat sampan floating over misty calm water ripples under moonlit night, poetic romance'
      },
      {
        file: 'khung_cua_la_truc.glb',
        name: 'Lá trúc che ngang mặt chữ điền',
        scale: 2.2,
        offset: { x: 0.0, y: 0.0, z: -1.2 },
        prompt: 'Traditional bamboo lattice window frame with silhouetted bamboo leaves, nostalgic Hue architecture'
      }
    ]
  }
];

export default LITERATURE_REGISTRY;
