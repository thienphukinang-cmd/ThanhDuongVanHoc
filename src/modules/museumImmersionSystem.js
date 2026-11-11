import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

/**
 * ============================================================================
 * MUSEUM IMMERSION SYSTEM - ÂM THANH 3D, THẺ THƠ TƯƠNG TÁC & WEBXR TELEPORT
 * 
 * Tích hợp 9 kỹ năng chuyên sâu:
 * 1. audio-soundscape-director: THREE.PositionalAudio + Bộ tổng hợp ngũ cung WebAudio
 * 2. interactive-lore-guide: Giao diện thẻ thơ sơn mài hoàng gia + Raycaster Artifacts
 * 3. web-xr-teleport-controller: Hỗ trợ VR Headset + Teleportation Rig 72+ FPS
 * 4. threejs-auto-integrator: Chuẩn hóa listeners, materials và event routing
 * 5. camera-director: Tách biệt Raycaster, hỗ trợ cả FPS PointerLock và chuột tự do
 * 6. environment-lighting-artist: Hiệu ứng ánh sáng hào quang thẻ thơ và teleport marker
 * 7. fps-optimizer: Tối ưu bộ nhớ, dọn dẹp oscillator, audio context pooling
 * 8. shader-coloring-artist: Bảng màu sơn mài đỏ then son, vàng hoàng tộc #fde047
 * 9. mesh-detailing-specialist: Vòng tròn đánh dấu Teleport và Laser beam tinh xảo
 * ============================================================================
 */

// 1. KHO DỮ LIỆU THUYẾT MINH & TRÍCH ĐOẠN THƠ HOÀNG GIA CHO CÁC HIỆN VẬT
export const ARTIFACT_LORE_DATABASE = {
  lobby_dongSonDrum: {
    room: 'ĐẠI SẢNH HOÀNG CUNG • BẢO TÀNG VĂN HỌC',
    title: 'Đài Trống Đồng Đông Sơn - Ngọc Lũ',
    subtitle: 'Bảo vật ngàn năm kết tinh nền văn minh lúa nước sông Hồng',
    poem: [
      '“Trống đồng một thuở vang bờ cõi,',
      'Hồn nước ngàn năm đọng nét hoa.',
      'Mười bốn tia sao bừng nhật nguyệt,',
      'Lạc Hồng muôn thuở vững âu ca.”'
    ],
    description: 'Trống Đồng Ngọc Lũ là đỉnh cao nghệ thuật đúc đồng thời kỳ Hùng Vương. Mặt trống đúc nổi mặt trời 14 tia sáng, bao quanh bởi các vành chim Lạc bay ngược chiều kim đồng hồ, tái hiện sống động tín ngưỡng thờ mặt trời và khát vọng thái bình của dân tộc.'
  },
  lobby_mural_namQuocSonHa: {
    room: 'HÀNH LANG VĂN HIẾN • BẢO TÀNG',
    title: 'Bản Tuyên Ngôn Độc Lập Đầu Tiên',
    subtitle: 'Nam Quốc Sơn Hà • Thái úy Lý Thường Kiệt (1077)',
    poem: [
      '“Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.”'
    ],
    description: 'Bài thơ thần vang vọng bên dòng sông Như Nguyệt năm 1077, khẳng định chủ quyền lãnh thổ bất khả xâm phạm của nước Đại Việt và ý chí quật cường đè bẹp quân xâm lược phương Bắc.'
  },
  lobby_mural_hichTuongSi: {
    room: 'HÀNH LANG VĂN HIẾN • BẢO TÀNG',
    title: 'Hịch Tướng Sĩ • Hưng Đạo Đại Vương',
    subtitle: 'Khí phách Đông A ba lần đại phá quân Nguyên Mông',
    poem: [
      '“Ta thường tới bữa quên ăn,',
      'Nửa đêm vỗ gối, ruột đau như cắt,',
      'Nước mắt đầm đìa, chỉ căm tức rằng',
      'Chưa xả thịt lột da, nuốt gan uống máu quân thù!”'
    ],
    description: 'Hịch Tướng Sĩ là áng văn chính luận bất hủ của Quốc công Tiết chế Trần Hưng Đạo, hiệu triệu lòng yêu nước và tinh thần quyết chiến quyết thắng bảo vệ xã tắc non sông.'
  },
  lobby_mural_binhNgoDaiCao: {
    room: 'HÀNH LANG VĂN HIẾN • BẢO TÀNG',
    title: 'Bình Ngô Đại Cáo • Nguyễn Trãi',
    subtitle: 'Bản Tuyên Ngôn Độc Lập thứ hai của dân tộc (1428)',
    poem: [
      '“Từng nghe: Việc nhân nghĩa cốt ở yên dân,',
      'Quân điếu phạt trước lo trừ bạo.',
      'Như nước Đại Việt ta từ trước,',
      'Vốn xưng nền văn hiến đã lâu.”'
    ],
    description: 'Áng thiên cổ hùng văn do Nguyễn Trãi thừa lệnh vua Lê Thái Tổ tuyên cáo kết thúc 20 năm kháng chiến chống giặc Minh, mở ra kỷ nguyên độc lập tự chủ huy hoàng cho Đại Việt.'
  },
  lobby_mural_doanTruongTanThanh: {
    room: 'HÀNH LANG VĂN HIẾN • BẢO TÀNG',
    title: 'Kiệt Tác Đoạn Trường Tân Thanh',
    subtitle: 'Đại thi hào Nguyễn Du (1765 – 1820)',
    poem: [
      '“Trăm năm trong cõi người ta,',
      'Chữ tài chữ mệnh khéo là ghét nhau.',
      'Trải qua một cuộc bể dâu,',
      'Những điều trông thấy mà đau đớn lòng.”'
    ],
    description: 'Đỉnh cao chói lọi của văn học chữ Nôm và tiếng Việt trung đại, kết tinh tấm lòng nhân đạo bao la của Nguyễn Du trước thân phận con người và kiếp tài hoa bạc mệnh.'
  },
  truyenKieu_hoCam: {
    room: 'CÕI THƠ TRUYỆN KIỀU • NGUYỄN DU',
    title: 'Đàn Hồ Cầm Đêm Thề Nguyền',
    subtitle: 'Hiện vật biểu tượng cho tài sắc và tiếng lòng Thúy Kiều',
    poem: [
      '“Trong như tiếng hạc bay qua,',
      'Đục như nước suối mới sa nửa vời.',
      'Tiếng khoan như gió thoảng ngoài,',
      'Tiếng mau sầm sập như trời đổ mưa.”'
    ],
    description: 'Cung đàn Hồ Cầm do Thúy Kiều so dây trong đêm thề nguyền dưới trăng cùng Kim Trọng tại hiên Lãm Thúy. Tiếng đàn vừa thanh tao trong trẻo vừa chất chứa dự cảm về mười lăm năm lưu lạc trần ai.'
  },
  truyenKieu_kimThoa: {
    room: 'CÕI THƠ TRUYỆN KIỀU • NGUYỄN DU',
    title: 'Trâm Vàng Kim Thoa & Khăn Hồng',
    subtitle: 'Tín vật định tình bên hiên Lãm Thúy',
    poem: [
      '“Cành đào thoắt rụng tay tiên,',
      'Chàng Kim vội vã nâng lên gửi lời.',
      'Trăm năm tạc một chữ đồng,',
      'Đến xương thịt nát, tấm lòng chưa phai.”'
    ],
    description: 'Chiếc trâm vàng vướng trên cành đào chiều thanh minh trở thành sợi dây tơ hồng gắn kết mối tình đầu trong sáng giữa người quốc sắc và kẻ thiên tài.'
  },
  sonTinh_tanVien: {
    room: 'ĐẠI CẢNH SƠN TINH - THỦY TINH',
    title: 'Tản Viên Sơn Thánh • Chúa Miền Non Cao',
    subtitle: 'Biểu tượng ý chí trị thủy bất khuất của dân tộc Văn Lang',
    poem: [
      '“Núi cao sông hãy còn dài,',
      'Năm năm báo oán đời đời đánh ghen.',
      'Nước dâng cao lên bao nhiêu,',
      'Đồi núi Tản Viên lại dâng cao lên bấy nhiêu!”'
    ],
    description: 'Tái hiện cuộc đối đầu nghìn thu giữa Sơn Tinh ngự trên đỉnh núi cao (Y = 42m) và Thủy Tinh cuộn sóng thần (Y = 18.5m), ngợi ca sức mạnh dời non lấp bể chế ngự thiên tai của tổ tiên.'
  },
  sonTinh_thuyTinh: {
    room: 'ĐẠI CẢNH SƠN TINH - THỦY TINH',
    title: 'Đông Hải Thủy Thần • Chúa Vùng Nước Thẳm',
    subtitle: 'Cơn thịnh nộ đại hồng thủy và sóng dữ cuộn trào',
    poem: [
      '“Hô phong hoán vũ dậy trời mây,',
      'Sóng thần cuộn xiết ngập bờ cây.',
      'Đông Hải đùng đùng dâng nước lũ,',
      'Quyết chiến Tản Viên chuyển đất này!”'
    ],
    description: 'Thủy Thần dâng nước sông Hồng và biển Đông cuộn sóng đánh thẳng vào vách núi Tản Viên, tượng trưng cho bão lũ khắc nghiệt miền nhiệt đới.'
  },
  anDuongVuong_noThan: {
    room: 'THÀNH CỔ LOA • AN DƯƠNG VƯƠNG',
    title: 'Nỏ Thần Liên Châu (Linh Quang Thần Cơ)',
    subtitle: 'Vũ khí thần cơ giữ vững non sông Âu Lạc • Cao Lỗ chế tạo',
    poem: [
      '“Một phát tên bay muôn giặc ngã,',
      'Cơ đồ Âu Lạc vững ngàn thu.',
      'Nỏ thần vô ý trao tay giặc,',
      'Nên nỗi cơ đồ đắm biển sâu...”'
    ],
    description: 'Nỏ thần do tướng Cao Lỗ chế tạo với lẫy nỏ bằng vuốt rùa vàng Kim Quy, mỗi phát bắn hàng vạn mũi tên đồng xé gió đẩy lui quân Triệu Đà, để lại bài học xương máu về tinh thần cảnh giác.'
  },
  anDuongVuong_giengNgoc: {
    room: 'THÀNH CỔ LOA • AN DƯƠNG VƯƠNG',
    title: 'Giếng Ngọc Mỵ Châu - Trọng Thủy',
    subtitle: 'Nước mắt nàng Mỵ Châu và ngọc trai sáng ngời',
    poem: [
      '“Lông ngỗng rải đường ngây thơ dẫn lối,',
      'Máu rơi xuống biển hóa châu sa.',
      'Nước giếng Cổ Loa rửa ngọc sáng,',
      'Chứng cho tình bạc xót lòng ta.”'
    ],
    description: 'Hạt ngọc trai mò ở Biển Đông đem rửa bằng nước giếng Cổ Loa thì sáng ngời rực rỡ, minh oan cho trái tim trong sáng của nàng công chúa ngây thơ.'
  },
  voNhat_nieuChao: {
    room: 'XÓM NGỤ CƯ • VỢ NHẶT (KIM LÂN)',
    title: 'Nồi Cháo Cám Đêm Tân Hôn',
    subtitle: 'Ánh sáng tình người và khát vọng sống giữa nạn đói 1945',
    poem: [
      '“Bát cháo cám nghẹn ngào trong cổ họng,',
      'Tiếng trống thúc thuế dồn dập ngoài xa.',
      'Trong tâm trí Tràng bừng lên hình ảnh,',
      'Đoàn người phá kho thóc và cờ đỏ bay qua.”'
    ],
    description: 'Bữa cơm đón dâu nghèo khó nhưng chan chứa tình mẹ thương con của bà cụ Tứ, nhen nhóm niềm tin mãnh liệt vào cách mạng và sự đổi đời.'
  },
  voNhat_denDau: {
    room: 'XÓM NGỤ CƯ • VỢ NHẶT (KIM LÂN)',
    title: 'Ngọn Đèn Dầu Tân Hôn',
    subtitle: 'Ngọn lửa xua tan u tối nghèo khổ của Tràng và Vợ',
    poem: [
      '“Hai hào dầu thắp sáng gian nhà rách,',
      'Nụ cười hé nở giữa chiều tà.',
      'Dù trong đói khát cùng đường tận,',
      'Hạnh phúc vẫn về sưởi ấm ta.”'
    ],
    description: 'Tràng bỏ ra hai hào mua dầu thắp sáng căn nhà rách nát, biểu hiện của sự trân trọng hạnh phúc gia đình và khao khát một mái ấm lương thiện.'
  },
  tatDen_centerStatue: {
    room: 'PHÒNG 302 • TẮT ĐÈN (NGÔ TẤT TỐ)',
    title: 'Chị Dậu & Bức Họa Đêm Đen',
    subtitle: 'Hình tượng người phụ nữ nông dân phản kháng giữa ách sưu thuế',
    poem: [
      '“Chị vùng chạy ra ngoài giữa lúc trời tối như mực',
      'và như cái tiền đồ của chị vậy!”',
      '— Chương kết, Tắt Đèn (1939)'
    ],
    description: 'Tượng đài trung tâm khắc họa sức phản kháng mãnh liệt của Chị Dậu khi quật ngã tên cai lệ và người nhà lý trưởng để bảo vệ chồng, đối diện với khoảng đêm đặc quánh biểu trưng cho bế tắc xã hội thực dân nửa phong kiến.',
    styleTheme: 'giay_do'
  },
  tatDen_taxArtifacts: {
    room: 'KHU 1 • ĐÌNH LÀNG ĐÔNG XÁ',
    title: 'Tráp Sưu Thuế, Sổ Đinh Bạ & Mõ Tre',
    subtitle: 'Khí cụ bức bách của bọn cường hào hào lý mùa sưu thuế',
    poem: [
      '“Tiếng trống, tiếng tù và, tiếng mõ rền vang…',
      'Thằng Mới, thằng Lệ gào thét thúc sưu suốt đêm thâu dưới ánh đuốc đình làng.”'
    ],
    description: 'Chiếc tráp gỗ lim của lý trưởng đựng bạc sưu, xấp thẻ đinh kiểm soát cả suất sưu người đã khuất (chú Hợi) và chiếc mõ tre khua vang dồn đẩy người dân làng Đông Xá vào bước đường cùng.',
    styleTheme: 'giay_do'
  },
  tatDen_peasantHearth: {
    room: 'KHU 2 • MÁI TRANH NHÀ CHỊ DẬU',
    title: 'Nia Rách, Nồi Cháo Cám & Bát Sứt',
    subtitle: 'Cảnh bần hàn cùng cực ngày phải dứt ruột bán con, bán chó',
    poem: [
      '“Cái Tỉu, cái Tỵ bưng bát cháo cám nguội ngắt;',
      'Mẹ con ôm nhau khóc ngất bên vách đất tàn tạ gió lùa.”'
    ],
    description: 'Những đồ vật thô mộc, sứt mẻ phơi bày tận cùng đói nghèo của gia đình Chị Dậu — khi miếng ăn chỉ còn nồi cháo cám loãng trước giờ phải bán đi giọt máu ruột thịt để gom tiền nộp sưu cho chồng.',
    styleTheme: 'giay_do'
  },
  tatDen_oilLamp: {
    room: 'KHU 2 • BIỂU TƯỢNG TẮT ĐÈN',
    title: 'Ngọn Đèn Dầu Sắp Tắt',
    subtitle: 'Ánh lửa le lói sắp lụi tàn trước gió đêm bạo tàn',
    poem: [
      '“Ngọn đèn dầu lạc chập chờn dưới túp lều tranh;',
      'Một chút ánh sáng mong manh rồi cũng phụt tắt giữa màn đêm.”'
    ],
    description: 'Chiếc đèn đồng cũ với chụp thủy tinh ám khói vừa là nguồn sáng duy nhất nơi xó bếp nghèo, vừa là ẩn dụ nghệ thuật cho nhan đề “Tắt Đèn” — nơi hy vọng nhỏ nhoi bị dập vùi bởi bóng tối áp bức.',
    styleTheme: 'giay_do'
  },
  tatDenRealm_nhaChiDau: {
    room: 'CÕI LÀNG ĐÔNG XÁ • PHÂN KHU 2',
    title: 'Túp Lều Tranh & Nồi Cháo Cám Nghẹn Đắng',
    subtitle: 'Bi kịch bán con, bán đàn chó giữa cơn đói rách nát của gia đình Chị Dậu',
    poem: [
      '“Cháo chín rồi, chị Bắc xuống đây…',
      'Thằng Dần khóc đòi ăn bên chõng tre, ổ rơm đàn chó con kêu ư ử trước giờ chia lìa.”'
    ],
    description: 'Dưới mái rạ thủng nát lộ cốt tre đan và ánh đèn dầu leo lắt trước gió lùa, từng chi tiết nồi đất cháo cám, cái rá, chiếc nón mê gợi lại giây phút Chị Dậu đứt ruột bế cái Tí đi bán lấy hai đồng bạc nộp sưu.',
    styleTheme: 'giay_do'
  },
  tatDenRealm_nhaNghiQue: {
    room: 'CÕI LÀNG ĐÔNG XÁ • CỔNG NHÀ NGHỊ QUẾ',
    title: 'Dinh Cơ Nghị Quế & Sự Đối Lập Giai Cấp',
    subtitle: 'Tường gạch uy nghiêm, gỗ lim sơn son thếp vàng đối lập mái tranh xơ xác',
    poem: [
      '“Cổng gạch cao vút, hai con chó dữ sủa vang sân gạch;',
      'Hai đồng bạc ném lạnh tanh xuống thềm trước ánh mắt khinh miệt của vợ chồng tên địa chủ.”'
    ],
    description: 'Cụm kiến trúc bề thế với hệ cột gỗ lim đen bóng, phù điêu hổ phù và hoành phi thếp vàng phơi bày sự giàu sang tàn nhẫn của tầng lớp cường hào bóc lột nông dân đến tận xương tủy.',
    styleTheme: 'giay_do'
  },
  tatDenRealm_sanDinh: {
    room: 'CÕI LÀNG ĐÔNG XÁ • SÂN ĐÌNH THÚC SƯU',
    title: 'Sân Đình Đêm Sưu Thuế & Tinh Thần “Tức Nước Vỡ Bờ”',
    subtitle: 'Trống ngũ liên, mõ tre dồn dập, gông cùm và khoảnh khắc phản kháng quật cường',
    poem: [
      '“Tức nước vỡ bờ! Mày trói ngay chồng bà đi, bà cho mày xem!”',
      '— Chương XVIII, Tắt Đèn (Ngô Tất Tố)'
    ],
    description: 'Giữa sân đình rực lửa đuốc với bàn thu sưu, sổ đinh bạ, roi mây và gông cùm, khi tên cai lệ sấn vào định lôi anh Dậu, Chị Dậu đã vùng lên túm cổ, ấn dúi tên cai lệ và quật ngã người nhà lý trưởng xuống thềm.',
    styleTheme: 'giay_do'
  },
  tatDenRealm_canhDongDem: {
    room: 'CÕI LÀNG ĐÔNG XÁ • CÁNH ĐỒNG ĐÊM',
    title: 'Cánh Đồng Chiêm Trũng & Đêm “Tối Như Mực”',
    subtitle: 'Cái kết bi phẫn mở ra bi kịch và khát vọng thoát khỏi màn đêm nô lệ',
    poem: [
      '“Chị vùng chạy ra ngoài giữa lúc trời tối như mực',
      'và như cái tiền đồ của chị vậy!”',
      '— Chương kết, Tắt Đèn (Ngô Tất Tố)'
    ],
    description: 'Trên bờ ruộng bùn lầy ngập nước gió lạnh buốt giá dưới bầu trời đêm đặc quánh không một ánh sao, luồng sáng Volumetric God Rays rọi xuống dáng hình quật cường của Chị Dậu như khẳng định phẩm chất thanh cao không thể vùi dập.',
    styleTheme: 'giay_do'
  },
  nqsh_lyThuongKiet: {
    room: 'PHÒNG 202 • NAM QUỐC SƠN HÀ — LÝ THƯỜNG KIỆT',
    title: 'Thái Úy Lý Thường Kiệt (1019 – 1105)',
    subtitle: 'Danh tướng kiệt xuất triều Lý • Tác giả tương truyền bản Tuyên ngôn Độc lập đầu tiên',
    hanzi: [
      '南國山河南帝居',
      '截然定分在天書',
      '如何逆虜來侵犯',
      '汝等行看取敗虛'
    ],
    phonetic: [
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.'
    ],
    dichTho: [
      'Sông núi nước Nam, vua Nam ở,',
      'Rành rành định phận tại sách trời.',
      'Cớ sao lũ giặc sang xâm phạm,',
      'Chúng bay sẽ bị đánh tơi bời.'
    ],
    dichNghia: 'Sông núi nước Nam là nơi vua nước Nam ở; ranh giới, phận nước đã được định rõ ràng rành mạch ở sách trời. Cớ sao bọn giặc bạo ngược lại dám kéo sang xâm phạm? Rồi chúng bay hãy chờ mà xem việc chuốc lấy thất bại tan tành!',
    biography: 'Lý Thường Kiệt (1019–1105), quê ở phường Thái Hòa, kinh thành Thăng Long. Ông giữ chức Phụ quốc Thái úy triều Lý, nổi tiếng với chiến lược “Tiên phát chế nhân” (đánh sang đất Tống năm 1075–1076) và cuộc phòng ngự đại thắng trên phòng tuyến sông Như Nguyệt năm 1077, buộc quân Tống phải rút lui và công nhận chủ quyền Đại Việt.',
    description: 'Pho tượng khắc họa uy phong lẫm liệt của Thái úy Lý Thường Kiệt trên bệ đá hoa sen thời Lý, tay giữ đốc kiếm nhìn thẳng về chiến tuyến sông Như Nguyệt.',
    styleTheme: 'chieu_lua'
  },
  nqsh_chieuThu: {
    room: 'CÁNH TRÁI • BẢN TUYÊN NGÔN ĐỘC LẬP ĐẦU TIÊN',
    title: 'Chiếu Thư “Nam Quốc Sơn Hà” (Thiên Thư)',
    subtitle: 'Bài thơ thần vang lên từ đền Trương Hống – Trương Hát bên sông Như Nguyệt (1077)',
    hanzi: [
      '南國山河南帝居',
      '截然定分在天書',
      '如何逆虜來侵犯',
      '汝等行看取敗虛'
    ],
    phonetic: [
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.'
    ],
    dichTho: [
      'Sông núi nước Nam, vua Nam ở,',
      'Rành rành định phận tại sách trời.',
      'Cớ sao lũ giặc sang xâm phạm,',
      'Chúng bay sẽ bị đánh tơi bời.'
    ],
    dichNghia: 'Nước Nam có chủ quyền bất khả xâm phạm được định sẵn trong sách trời; mọi thế lực xâm lăng tất yếu phải chuốc lấy thất bại nhục nhã.',
    biography: 'Theo Đại Việt sử ký toàn thư, vào đêm tối trên phòng tuyến sông Như Nguyệt năm 1077, Lý Thường Kiệt cho người vào đền thờ hai vị thần sông Trương Hống – Trương Hát ngâm vang bốn câu thơ thất ngôn tứ tuyệt, làm nức lòng quân sĩ Đại Việt và khiến quân Tống kinh hãi tan rã.',
    description: 'Cuộn chiếu lụa vàng đặt trang trọng trên giá rồng thời Lý chạm khắc tinh xảo, là hiện vật trung tâm của Bản Tuyên Ngôn Độc Lập Đầu Tiên.',
    styleTheme: 'chieu_lua'
  },
  nqsh_saBan: {
    room: 'CÁNH PHẢI • CHIẾN TUYẾN SÔNG NHƯ NGUYỆT',
    title: 'Sa Bàn Phòng Tuyến Sông Như Nguyệt (1077)',
    subtitle: 'Bố trận liên hoàn trên sông Cầu: Lũy đất, cọc gỗ nhọn và thủy binh Đại Việt',
    hanzi: [
      '南國山河南帝居',
      '截然定分在天書',
      '如何逆虜來侵犯',
      '汝等行看取敗虛'
    ],
    phonetic: [
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.'
    ],
    dichTho: [
      'Sông núi nước Nam, vua Nam ở,',
      'Rành rành định phận tại sách trời.',
      'Cớ sao lũ giặc sang xâm phạm,',
      'Chúng bay sẽ bị đánh tơi bời.'
    ],
    dichNghia: 'Chủ quyền lãnh thổ sông núi Đại Việt là chân lý thiêng liêng không thể lay chuyển, kết tinh thành chiến lũy bất khả xâm phạm bên bờ Nam sông Như Nguyệt.',
    biography: 'Lý Thường Kiệt cho đắp lũy đất cao dọc bờ Nam sông Như Nguyệt (đoạn sông Cầu qua Bắc Ninh ngày nay), đóng hàng vạn cọc tre gỗ nhọn dưới mép nước ngăn kỵ binh và bè mảng giặc Tống vượt sông, tạo thế trận giam chân đại quân Quách Quỳ.',
    description: 'Sa bàn tái hiện toàn cảnh dòng sông uốn lượn, hệ thống cọc phòng tuyến, doanh trại bộ binh và đoàn chiến thuyền tuần tiễu Đại Việt.',
    styleTheme: 'chieu_lua'
  },
  nqsh_vuKhi: {
    room: 'CÁNH PHẢI • CHIẾN TUYẾN SÔNG NHƯ NGUYỆT',
    title: 'Binh Khí Triều Lý & Trống Trận Như Nguyệt',
    subtitle: 'Trường đao, giáo mác, khiên mây chạm hổ phù và trống đồng/trống trận Đại Việt',
    hanzi: [
      '南國山河南帝居',
      '截然定分在天書',
      '如何逆虜來侵犯',
      '汝等行看取敗虛'
    ],
    phonetic: [
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.'
    ],
    dichTho: [
      'Sông núi nước Nam, vua Nam ở,',
      'Rành rành định phận tại sách trời.',
      'Cớ sao lũ giặc sang xâm phạm,',
      'Chúng bay sẽ bị đánh tơi bời.'
    ],
    dichNghia: 'Sức mạnh quân sự Đại Việt kết hợp cùng khí phách chính nghĩa đã bảo vệ vững chắc nền độc lập của dân tộc trước hơn 10 vạn quân xâm lược.',
    biography: 'Dưới triều Lý, quân đội được tổ chức tinh nhuệ với lực lượng Cấm quân và Lộ quân, trang bị trường đao, giáo dài, khiên mây sơn son chạm Hổ Phù và hệ thống trống trận truyền lệnh vượt sông tập kích đêm vào doanh trại quân Tống.',
    description: 'Giá binh khí sơn son thếp vàng trưng bày trường đao, giáo mác thép rèn, khiên mây Hổ Phù và trống trận triều Lý.',
    styleTheme: 'chieu_lua'
  },
  nqsh_denTruongHong: {
    room: 'CÕI NGOẠI CẢNH • ĐỀN TRƯƠNG HỐNG – TRƯƠNG HÁT',
    title: 'Đền Thờ Trương Hống – Trương Hát Bên Bờ Sông Như Nguyệt',
    subtitle: 'Nơi vang lên lời thơ thần “Nam quốc sơn hà” trong đêm kháng Tống (1077)',
    hanzi: [
      '南國山河南帝居',
      '截然定分在天書',
      '如何逆虜來侵犯',
      '汝等行看取敗虛'
    ],
    phonetic: [
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.'
    ],
    dichTho: [
      'Sông núi nước Nam, vua Nam ở,',
      'Rành rành định phận tại sách trời.',
      'Cớ sao lũ giặc sang xâm phạm,',
      'Chúng bay sẽ bị đánh tơi bời.'
    ],
    dichNghia: 'Thiên thư đã định rõ chủ quyền nước Nam thuộc về người Nam; quân giặc xâm lăng ắt tự chuốc lấy diệt vong.',
    biography: 'Trương Hống và Trương Hát là hai vị tướng tài thời Triệu Việt Vương, sau hiển thánh làm thần hộ quốc bên sông Như Nguyệt (Tam Giang). Trong chiến dịch 1077, tiếng ngâm thơ vang lên từ ngôi đền cổ đã thổi bùng hào khí quyết thắng của đại quân Lý Thường Kiệt.',
    description: 'Ngôi đền cổ thời Lý mái đao cong phát sáng vàng kim bên bờ Nam sông Như Nguyệt, vang vọng tiếng ngâm thơ thiêng liêng giữa màn đêm.',
    styleTheme: 'chieu_lua'
  },
  nqsh_chienThuyen: {
    room: 'CÕI NGOẠI CẢNH • PHÒNG TUYẾN SÔNG NHƯ NGUYỆT',
    title: 'Đoàn Chiến Thuyền Đại Việt & Lũy Cọc Gỗ Như Nguyệt',
    subtitle: 'Cuộc tập kích đêm vượt sông đánh tan đại doanh Quách Quỳ (Xuân 1077)',
    hanzi: [
      '南國山河南帝居',
      '截然定分在天書',
      '如何逆虜來侵犯',
      '汝等行看取敗虛'
    ],
    phonetic: [
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.'
    ],
    dichTho: [
      'Sông núi nước Nam, vua Nam ở,',
      'Rành rành định phận tại sách trời.',
      'Cớ sao lũ giặc sang xâm phạm,',
      'Chúng bay sẽ bị đánh tơi bời.'
    ],
    dichNghia: 'Bài thơ khẳng định chủ quyền lãnh thổ và khí phách quật cường, tiếp thêm sức mạnh để thủy bộ Đại Việt đánh trận quyết định trên sông Như Nguyệt.',
    biography: 'Sau nhiều tháng cầm cự, lợi dụng lúc sĩ khí quân Tống suy sụp vì nghe tiếng thơ thần từ đền Trương Hống – Trương Hát và thiếu lương thảo, Thái úy Lý Thường Kiệt hạ lệnh nổi trống trận, cho chiến thuyền chở quân bất ngờ vượt sông đánh úp đồn trại giặc trong đêm.',
    description: 'Đội chiến thuyền rồng cờ đại chữ “Lý” giương buồm dưới ánh trăng, ánh lửa đuốc phản chiếu rực rỡ trên sóng nước Như Nguyệt.',
    styleTheme: 'chieu_lua'
  },
  thanhgiong_statue: {
    room: 'PHÒNG 101 • PHÙ ĐỔNG THIÊN VƯƠNG — THÁNH GIÓNG',
    title: 'Tượng Đài Phù Đổng Thiên Vương',
    subtitle: 'Người anh hùng làng Gióng vươn vai thành tráng sĩ, cưỡi ngựa sắt phun lửa đánh tan giặc Ân',
    poem: [
      '“Bỗng nhiên chú bé vươn vai lớn bổng,',
      'Thành tráng sĩ oai phong lẫm liệt,',
      'Mặc áo giáp sắt, đội mũ sắt, tay cầm roi sắt,',
      'Nhảy lên mình ngựa sắt phun lửa xông thẳng ra trận tiền.”'
    ],
    description: 'Pho tượng đồng – sắt rèn đặt trang trọng trên Bệ Đá Trống Đồng Ngọc Lũ khắc họa khoảnh khắc Phù Đổng Thiên Vương thúc ngựa sắt tung hoành, tượng trưng cho sức mạnh quật khởi phi thường của dân tộc Văn Lang trước giặc ngoại xâm.',
    styleTheme: 'dong_son_giay_do'
  },
  thanhgiong_village: {
    room: 'PHÂN KHU 1 • LÀNG PHÙ ĐỔNG & THUỞ ẤU THƠ',
    title: 'Dấu Chân Khổng Lồ, Nia Tre & 7 Nong Cơm 3 Nong Cà',
    subtitle: 'Sự ra đời kỳ lạ và tình làng nghĩa xóm nuôi dưỡng người anh hùng',
    poem: [
      '“Bảy nong cơm, ba nong cà,',
      'Uống một hơi nước cạn đà khúc sông.',
      'Bà con góp gạo nuôi Gióng,',
      'Thương con dân Việt một lòng diệt Ân.”'
    ],
    description: 'Phiến đá cổ còn in dấu chân khổng lồ ngoài đồng cùng chiếc nia tre đan thủ công và 7 nong cơm, 3 nong cà giản dị — biểu tượng cho sự kết tinh sức mạnh từ cơm gạo, mồ hôi và tấm lòng đoàn kết của nhân dân Văn Lang.',
    styleTheme: 'dong_son_giay_do'
  },
  thanhgiong_forge: {
    room: 'PHÂN KHU 2 • LỜI SỨ GIẢ & LÒ RÈN VŨ KHÍ',
    title: 'Loa Đồng Sứ Giả, Roi Sắt & Lò Rèn Vũ Khí',
    subtitle: 'Tiếng nói đầu tiên cất lên vì nước: “Ông về tâu với Vua…”',
    poem: [
      '“Ông về tâu với Vua đúc cho ta một con ngựa sắt,',
      'Làm cho ta một cái roi sắt và một tấm áo giáp sắt,',
      'Ta sẽ phá tan lũ giặc này!”'
    ],
    description: 'Chiếc loa đồng cổ của sứ giả Hùng Vương bên bếp lò rực hồng đúc giáp sắt, roi sắt gãy — ghi dấu tiếng nói đầu tiên đầy khí phách của cậu bé lên ba khi đất nước lâm nguy.',
    styleTheme: 'dong_son_giay_do'
  },
  thanhgiong_battlefield: {
    room: 'CÕI SỬ THI • CHIẾN TRƯỜNG GIẶC ÂN & RỪNG TRE ĐẰNG NGÀ',
    title: 'Chiến Trường Tre Đằng Ngà & Dấu Vó Ngựa Sắt',
    subtitle: 'Roi sắt gãy, tráng sĩ nhổ từng cụm tre ngà vàng óng quật tan quân xâm lược',
    poem: [
      '“Roi sắt gãy, Gióng bèn nhổ những cụm tre cạnh đường',
      'Quật vào giặc. Giặc tan vỡ, đám tàn quân giẫm đạp lên nhau chạy trốn,',
      'Lửa ngựa sắt thiêu cháy rừng tre thành sắc vàng óng ánh.”'
    ],
    description: 'Khung cảnh chiến trận hào hùng nơi những thân tre đằng ngà rực vàng dưới ánh hoàng hôn lửa cháy và hố vó ngựa sắt rực than hồng dẫn lối từ đồng bằng lên triền núi Sóc Sơn.',
    styleTheme: 'dong_son_giay_do'
  },
  thanhgiong_socson_armor: {
    room: 'ĐỈNH NÚI SÓC SƠN • KHÚC KHẢI HOÀN BẤT TỬ',
    title: 'Mảnh Áo Giáp Sắt Trên Đỉnh Núi Sóc Sơn',
    subtitle: 'Đánh tan giặc Ân, Thánh Gióng cởi bỏ áo giáp sắt và bay thẳng về trời',
    poem: [
      '“Giặc tan rồi, ngựa sắt phi lên đỉnh Sóc Sơn,',
      'Gióng cởi bỏ áo giáp sắt để lại giữa mây ngàn,',
      'Cùng ngựa thần bay vút lên trời xanh bất tử.”'
    ],
    description: 'Bộ giáp sắt cổ lưu lại trên phiến đá thiêng đỉnh Sóc Sơn giữa ánh hào quang và mây khói bảng lảng — biểu tượng cho lý tưởng cứu nước vô tư, đánh giặc xong không màng công danh phú quý.',
    styleTheme: 'dong_son_giay_do'
  },
  thanhgiong_ascension: {
    room: 'ĐỈNH NÚI SÓC SƠN • THIÊN ĐÌNH',
    title: 'Phù Đổng Thiên Vương – Hóa Thánh Bất Tử',
    subtitle: 'Dứt chiến bào sắt nơi đỉnh núi thiêng, cưỡi ngựa rực lửa bay vút vào vòm trời hào quang',
    poem: [
      '“Dẹp tan lũ giặc Ân tàn bạo,',
      'Gióng lên đỉnh Sóc cởi giáp bào,',
      'Ngựa sắt hí vang bừng biển lửa,',
      'Vút bay theo ánh rạng thiên cao.”'
    ],
    description: 'Từ phiến đá đỉnh Sóc Sơn nơi bộ giáp sắt cổ còn lưu dấu, Thánh Gióng thúc ngựa sắt băng qua luồng mây vàng và vòng xoáy lửa thần, hóa thành Đức Thánh bất tử giữa vòm hào quang trời Nam.',
    styleTheme: 'dong_son_giay_do'
  }
};
ARTIFACT_LORE_DATABASE.thanh_giong = ARTIFACT_LORE_DATABASE.thanhgiong_statue;

/**
 * ============================================================================
 * PHẦN 1: AUDIO SOUNDSCAPE DIRECTOR (ÂM THANH KHÔNG GIAN 3D & NGŨ CUNG)
 * ============================================================================
 */
export class MuseumSpatialAudioDirector {
  constructor(camera, existingListener = null) {
    this.camera = camera;

    // Tái sử dụng AudioListener nếu camera đã có để tránh trùng lặp AudioContext
    if (existingListener) {
      this.listener = existingListener;
    } else {
      const found = this.camera?.children?.find(c => c.isAudioListener);
      if (found) {
        this.listener = found;
      } else {
        this.listener = new THREE.AudioListener();
        this.camera?.add(this.listener);
      }
    }

    this.audioLoader = new THREE.AudioLoader();
    this.positionalSources = new Map();
    this.cachedProceduralBuffers = new Map();
    this.pendingProceduralRecs = [];
    this.synthInterval = null;
    this.activeOscillators = [];
    this.isUnlocked = false;

    this._setupAutoUnlock();
  }

  _ensureProceduralBufferReady(rec) {
    if (!rec || rec.isLoadedFile || !rec.isProcedural) return;
    let buf = null;
    if (rec.isThanhGiongProcedural) {
      buf = this._createThanhGiongPositionalBuffer(rec.fallbackTheme);
    } else if (rec.isNqshProcedural) {
      buf = this._createNqshPositionalBuffer(rec.fallbackTheme);
    } else {
      buf = this._createTatDenPositionalBuffer(rec.fallbackTheme);
    }
    if (buf) {
      rec.posAudio.setBuffer(buf);
      rec.posAudio.setLoop(true);
      rec.isLoadedFile = true;
    }
  }

  _setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        const startLoopers = () => {
          this.isUnlocked = true;
          // Tổng hợp lười (lazy) các AudioBuffer thủ công chỉ khi người dùng thực sự tương tác
          for (let i = 0; i < this.pendingProceduralRecs.length; i++) {
            this._ensureProceduralBufferReady(this.pendingProceduralRecs[i]);
          }
          this.pendingProceduralRecs.length = 0;

          this.positionalSources.forEach((rec) => {
            if (rec.autoPlayLoop && !rec.isLoadedFile && rec.isProcedural) {
              this._ensureProceduralBufferReady(rec);
            }
            if (rec.autoPlayLoop && rec.posAudio?.buffer && !rec.posAudio.isPlaying) {
              try {
                rec.posAudio.play();
              } catch (_) {}
            }
          });
        };

        if (this.listener?.context && this.listener.context.state === 'suspended') {
          this.listener.context.resume().then(startLoopers).catch(() => {});
        } else {
          startLoopers();
        }
      } catch (e) {}

      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('click', unlock, { once: true, passive: true });
  }

  /**
   * Tổng hợp AudioBuffer vòng lặp 4 giây cho nguồn THREE.PositionalAudio dự phòng (Tắt Đèn)
   */
  _createTatDenPositionalBuffer(theme) {
    const cacheKey = `tatden_${theme}`;
    if (this.cachedProceduralBuffers.has(cacheKey)) {
      return this.cachedProceduralBuffers.get(cacheKey);
    }
    const ctx = this.listener?.context;
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate || 44100;
    const duration = 4.0;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (theme === 'tatden_tax' || theme === 'tatden_realm_drum') {
      // Tiếng trống ngũ liên & tiếng mõ tre thúc sưu dồn dập, inh ỏi tại sân đình
      const fastDrum = theme === 'tatden_realm_drum';
      const tapRate = fastDrum ? 3.0 : 1.0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const beatPhase = (t * tapRate) % 1.0;
        const woodTap = Math.exp(-beatPhase * 32.0) * Math.sin(2 * Math.PI * 510 * beatPhase) * (fastDrum ? 0.55 : 0.42);
        const drumPhase = (t * (fastDrum ? 2.0 : 1.0) + 0.25) % 1.0;
        const drumThud = Math.exp(-drumPhase * 8.5) * Math.sin(2 * Math.PI * 76 * drumPhase) * (fastDrum ? 0.65 : 0.52);
        const accent = fastDrum ? Math.exp(-((t * 0.5) % 1.0) * 6.0) * Math.sin(2 * Math.PI * 108 * t) * 0.22 : 0;
        data[i] = (woodTap + drumThud + accent) * 0.52;
      }
    } else if (theme === 'tatden_wind' || theme === 'tatden_realm_shack') {
      // Tiếng gió rít qua vách nứa, tiếng thở dài & tiếng nức nở khe khẽ trong đêm
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const noise = Math.random() * 2 - 1;
        lp += 0.035 * (noise - lp);
        const howl = 0.45 + 0.55 * Math.sin(2 * Math.PI * 0.25 * t) ** 2;
        const whistle = Math.sin(2 * Math.PI * (290 + Math.sin(2 * Math.PI * 0.5 * t) * 45) * t) * 0.07 * howl;
        // Âm nấc/thở dài nhẹ ở túp lều tranh
        const sobEnv = theme === 'tatden_realm_shack' ? Math.max(0, Math.sin(Math.PI * ((t % 2.0) / 2.0))) ** 3 : 0;
        const sobTone = theme === 'tatden_realm_shack'
          ? Math.sin(2 * Math.PI * (340 - (t % 2.0) * 45) * t) * sobEnv * 0.095
          : 0;
        data[i] = (lp * 0.65 + whistle) * howl * 0.42 + sobTone;
      }
    } else if (theme === 'tatden_realm_field') {
      // Tiếng gió đồng hoang lạnh buốt kết hợp nhịp tim đập dồn cuối truyện
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const noise = Math.random() * 2 - 1;
        lp += 0.025 * (noise - lp);
        const windEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * t);
        const hbCycle = t % 0.8;
        const lub = Math.exp(-hbCycle * 22.0) * Math.sin(2 * Math.PI * 54 * hbCycle) * 0.58;
        const dubPhase = Math.max(0, hbCycle - 0.18);
        const dub = hbCycle >= 0.18 ? Math.exp(-dubPhase * 26.0) * Math.sin(2 * Math.PI * 46 * dubPhase) * 0.44 : 0;
        data[i] = lp * windEnv * 0.45 + lub + dub;
      }
    } else {
      // Âm hưởng trầm hùng sâu lắng quanh tượng Chị Dậu
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.25 * t);
        const d1 = Math.sin(2 * Math.PI * 65.41 * t) * 0.32;
        const d2 = Math.sin(2 * Math.PI * 98.0 * t) * 0.22;
        const d3 = Math.sin(2 * Math.PI * 130.81 * t) * 0.14;
        data[i] = (d1 + d2 + d3) * env * 0.4;
      }
    }
    this.cachedProceduralBuffers.set(cacheKey, buffer);
    return buffer;
  }

  /**
   * Tổng hợp AudioBuffer vòng lặp 4 giây cho nguồn THREE.PositionalAudio cõi Nam Quốc Sơn Hà
   */
  _createNqshPositionalBuffer(theme) {
    const cacheKey = `nqsh_${theme}`;
    if (this.cachedProceduralBuffers.has(cacheKey)) {
      return this.cachedProceduralBuffers.get(cacheKey);
    }
    const ctx = this.listener?.context;
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate || 44100;
    const duration = 4.0;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (theme === 'nqsh_war_drum') {
      // Tiếng trống trận hào hùng: nhịp trống cái trầm sâu & hồi trống thúc dồn
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const p1 = (t * 1.5) % 1.0;
        const mainBeat = Math.exp(-p1 * 6.5) * Math.sin(2 * Math.PI * (64 - p1 * 18) * p1) * 0.72;
        const p2 = (t * 3.0 + 0.35) % 1.0;
        const subBeat = Math.exp(-p2 * 14.0) * Math.sin(2 * Math.PI * 92 * p2) * 0.34;
        const rim = Math.exp(-((t * 1.5 + 0.5) % 1.0) * 24.0) * Math.sin(2 * Math.PI * 360 * t) * 0.14;
        data[i] = (mainBeat + subBeat + rim) * 0.52;
      }
    } else if (theme === 'nqsh_river_waves') {
      // Tiếng sóng vỗ sông Như Nguyệt êm ả trong đêm
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const noise = Math.random() * 2 - 1;
        lp += 0.028 * (noise - lp);
        const swell1 = 0.45 + 0.55 * Math.sin(2 * Math.PI * 0.25 * t) ** 2;
        const swell2 = 0.35 + 0.65 * Math.sin(2 * Math.PI * 0.5 * t + 1.1) ** 2;
        data[i] = lp * (swell1 * 0.65 + swell2 * 0.35) * 0.44;
      }
    } else {
      // nqsh_temple_poem: Chuông đồng đền thần & âm hưởng ngâm thơ linh thiêng trong đêm
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const bellPhase = (t * 0.25) % 1.0;
        const bell = Math.exp(-bellPhase * 2.2) * (
          Math.sin(2 * Math.PI * 220.0 * t) * 0.36 +
          Math.sin(2 * Math.PI * 440.0 * t) * 0.14 +
          Math.sin(2 * Math.PI * 660.0 * t) * 0.06
        );
        // Âm vang giọng ngâm ngũ cung trầm ấm
        const chantEnv = Math.max(0, Math.sin(Math.PI * ((t % 2.0) / 2.0))) ** 1.4;
        const vibrato = 1.0 + Math.sin(2 * Math.PI * 4.5 * t) * 0.008;
        const chantBase = 146.83 * vibrato;
        const chant = (
          Math.sin(2 * Math.PI * chantBase * t) * 0.26 +
          Math.sin(2 * Math.PI * chantBase * 2.0 * t) * 0.14 +
          Math.sin(2 * Math.PI * chantBase * 3.0 * t) * 0.06
        ) * chantEnv;
        data[i] = (bell + chant) * 0.48;
      }
    }
    this.cachedProceduralBuffers.set(cacheKey, buffer);
    return buffer;
  }

  /**
   * Tổng hợp AudioBuffer vòng lặp 4 giây cho nguồn THREE.PositionalAudio Phòng 101 & Cõi Sóc Sơn (Thánh Gióng)
   */
  _createThanhGiongPositionalBuffer(theme) {
    const cacheKey = `thanhgiong_${theme}`;
    if (this.cachedProceduralBuffers.has(cacheKey)) {
      return this.cachedProceduralBuffers.get(cacheKey);
    }
    const ctx = this.listener?.context;
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate || 44100;
    const duration = 4.0;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (theme === 'thanhgiong_village') {
      // Sáo trúc đồng quê ngũ cung + tiếng dế gáy trưa hè + âm ngân lời ru êm ái
      const fluteNotes = [523.25, 587.33, 659.25, 587.33, 440.0, 523.25, 392.0, 440.0];
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const slot = Math.min(fluteNotes.length - 1, Math.floor((t / duration) * fluteNotes.length));
        const notePhase = ((t / duration) * fluteNotes.length) % 1.0;
        const fluteEnv = Math.sin(Math.PI * notePhase) ** 0.85;
        const vib = 1.0 + Math.sin(2 * Math.PI * 5.0 * t) * 0.012;
        const f = fluteNotes[slot] * vib;
        const flute = (Math.sin(2 * Math.PI * f * t) * 0.24 + Math.sin(4 * Math.PI * f * t) * 0.06) * fluteEnv;
        const cricketBurst = Math.max(0, Math.sin(2 * Math.PI * 1.5 * t)) ** 6;
        const cricketPulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 28.0 * t);
        const cricket = Math.sin(2 * Math.PI * 4150.0 * t) * cricketBurst * cricketPulse * 0.045;
        const lullabyEnv = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.25 * t);
        const lullaby = (Math.sin(2 * Math.PI * 196.0 * t) * 0.14 + Math.sin(2 * Math.PI * 293.66 * t) * 0.08) * lullabyEnv;
        const noise = Math.random() * 2 - 1;
        lp += 0.02 * (noise - lp);
        data[i] = (flute + cricket + lullaby + lp * 0.08) * 0.55;
      }
    } else if (theme === 'thanhgiong_forge') {
      // Tiếng loa đồng sứ giả + búa nện đe rèn giáp sắt + tiếng than lò rực cháy
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const anvilPhase = (t * 1.5) % 1.0;
        const hammerEnv = Math.exp(-anvilPhase * 16.0);
        const anvilRing = (
          Math.sin(2 * Math.PI * 920.0 * anvilPhase) * 0.32 +
          Math.sin(2 * Math.PI * 1480.0 * anvilPhase) * 0.20 +
          Math.sin(2 * Math.PI * 2240.0 * anvilPhase) * 0.10
        ) * hammerEnv;
        const hornCycle = (t * 0.5) % 1.0;
        const hornEnv = hornCycle < 0.55 ? Math.sin((hornCycle / 0.55) * Math.PI) ** 0.7 : 0;
        const hornBase = 146.83 * (1.0 + 0.015 * Math.sin(2 * Math.PI * 4.0 * t));
        const horn = (
          Math.sin(2 * Math.PI * hornBase * t) * 0.28 +
          Math.sin(2 * Math.PI * hornBase * 2.0 * t) * 0.16 +
          Math.sin(2 * Math.PI * hornBase * 3.0 * t) * 0.09
        ) * hornEnv;
        const noise = Math.random() * 2 - 1;
        lp += 0.08 * (noise - lp);
        const fire = lp * 0.16;
        data[i] = (anvilRing + horn + fire) * 0.55;
      }
    } else if (theme === 'thanhgiong_realm_summit') {
      // Gió đỉnh núi Sóc Sơn + chuông đồng thiêng bay về trời
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const noise = Math.random() * 2 - 1;
        lp += 0.026 * (noise - lp);
        const windMod = 0.45 + 0.55 * Math.sin(2 * Math.PI * 0.25 * t) ** 2;
        const windAir = lp * windMod * 0.42;
        const bellPhase = (t * 0.25) % 1.0;
        const bellEnv = Math.exp(-bellPhase * 1.9);
        const bell = (
          Math.sin(2 * Math.PI * 196.0 * t) * 0.34 +
          Math.sin(2 * Math.PI * 392.0 * t) * 0.18 +
          Math.sin(2 * Math.PI * 588.0 * t) * 0.09 +
          Math.sin(2 * Math.PI * 980.0 * t) * 0.04
        ) * bellEnv;
        const shimmer = Math.sin(2 * Math.PI * 293.66 * t) * 0.08 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t));
        data[i] = (windAir + bell + shimmer) * 0.56;
      }
    } else {
      // thanhgiong_hero / thanhgiong_realm_battle: Trống đồng Đông Sơn xuất trận + hí ngựa sắt & lửa chiến trận
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const drumPhase = (t * 1.5) % 1.0;
        const drum = Math.exp(-drumPhase * 7.2) * (
          Math.sin(2 * Math.PI * (62.0 - drumPhase * 16.0) * drumPhase) * 0.68 +
          Math.sin(2 * Math.PI * 295.0 * drumPhase) * 0.14
        );
        const subPhase = (t * 3.0 + 0.25) % 1.0;
        const subDrum = Math.exp(-subPhase * 13.0) * Math.sin(2 * Math.PI * 88.0 * subPhase) * 0.30;
        const neighCycle = (t * 0.25) % 1.0;
        const neighEnv = (neighCycle > 0.35 && neighCycle < 0.72)
          ? Math.sin(((neighCycle - 0.35) / 0.37) * Math.PI) ** 0.9
          : 0;
        const neighFreq = 520.0 - (neighCycle - 0.35) * 320.0 + Math.sin(2 * Math.PI * 22.0 * t) * 35.0;
        const neigh = (
          Math.sin(2 * Math.PI * neighFreq * t) * 0.16 +
          Math.sin(2 * Math.PI * neighFreq * 1.5 * t) * 0.08
        ) * neighEnv;
        const noise = Math.random() * 2 - 1;
        lp += 0.045 * (noise - lp);
        const battleWind = lp * (0.4 + 0.6 * Math.sin(2 * Math.PI * 0.5 * t) ** 2) * 0.26;
        data[i] = (drum + subDrum + neigh + battleWind) * 0.54;
      }
    }

    this.cachedProceduralBuffers.set(cacheKey, buffer);
    return buffer;
  }

  /**
   * Gắn nguồn âm thanh 3D (THREE.PositionalAudio) vào một vật thể trung tâm
   */
  attachPositionalSound(key, targetObject3D, {
    audioUrl = null,
    fallbackTheme = 'truyenKieu',
    refDistance = 6,
    maxDistance = 38,
    volume = 0.65
  } = {}) {
    if (!targetObject3D || !this.listener) return null;

    const posAudio = new THREE.PositionalAudio(this.listener);
    posAudio.setRefDistance(refDistance);
    posAudio.setMaxDistance(maxDistance);
    posAudio.setRolloffFactor(1.35);
    posAudio.setVolume(volume);

    targetObject3D.add(posAudio);

    const isTatDenProcedural = !audioUrl && typeof fallbackTheme === 'string' && fallbackTheme.startsWith('tatden_');
    const isNqshProcedural = !audioUrl && typeof fallbackTheme === 'string' && fallbackTheme.startsWith('nqsh_');
    const isThanhGiongProcedural = !audioUrl && typeof fallbackTheme === 'string' && fallbackTheme.startsWith('thanhgiong_');
    const isProcedural = isTatDenProcedural || isNqshProcedural || isThanhGiongProcedural;
    const record = {
      key,
      posAudio,
      fallbackTheme,
      isLoadedFile: false,
      autoPlayLoop: isProcedural,
      isProcedural,
      isNqshProcedural,
      isThanhGiongProcedural
    };

    if (audioUrl) {
      this.audioLoader.load(
        audioUrl,
        (buffer) => {
          posAudio.setBuffer(buffer);
          posAudio.setLoop(true);
          record.isLoadedFile = true;
        },
        undefined,
        () => {
          record.isLoadedFile = false;
        }
      );
    } else if (isProcedural) {
      // Trì hoãn tổng hợp 176.4k audio samples cho đến khi người dùng tương tác mở khóa AudioContext
      if (this.isUnlocked || this.listener.context?.state === 'running') {
        this._ensureProceduralBufferReady(record);
        if (record.isLoadedFile) {
          try {
            posAudio.play();
          } catch (_) {}
        }
      } else {
        this.pendingProceduralRecs.push(record);
      }
    }

    this.positionalSources.set(key, record);
    return posAudio;
  }

  /** Gỡ bỏ hoàn toàn một nguồn PositionalAudio khi thoát cõi truyện */
  detachPositionalSound(key) {
    const rec = this.positionalSources.get(key);
    if (!rec) return;
    const pendingIdx = this.pendingProceduralRecs.indexOf(rec);
    if (pendingIdx !== -1) {
      this.pendingProceduralRecs.splice(pendingIdx, 1);
    }
    try {
      if (rec.posAudio?.isPlaying) rec.posAudio.stop();
      rec.posAudio?.source?.stop?.();
    } catch (_) {}
    try {
      rec.posAudio?.disconnect?.();
      rec.posAudio?.panner?.disconnect?.();
      rec.posAudio?.gain?.disconnect?.();
      rec.posAudio?.parent?.remove?.(rec.posAudio);
    } catch (_) {}
    this.positionalSources.delete(key);
  }

  /**
   * Kích hoạt âm thanh khi bước vào phòng (enterRealm)
   */
  playRealmSoundscape(key) {
    this.stopAllSounds();
    const record = this.positionalSources.get(key);
    const theme = record?.fallbackTheme || key;

    try {
      if (this.listener?.context?.state === 'suspended') {
        this.listener.context.resume().catch(() => {});
      }
    } catch (_) {}

    if (record?.isLoadedFile && record.posAudio && !record.posAudio.isPlaying) {
      record.posAudio.play();
    } else {
      this._startProceduralSoundscape(theme);
    }
  }

  /**
   * Bộ tổng hợp âm thanh WebAudio dự phòng chuẩn thang âm ngũ cung Việt Nam
   */
  _startProceduralSoundscape(theme) {
    if (!this.listener?.context) return;
    const ctx = this.listener.context;

    // Cấu hình thang âm ngũ cung đặc thù theo từng phòng văn học
    let notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // Mặc định Đàn Kiều
    let oscType = 'sine';
    let tempoMs = 1800;
    let baseGain = 0.055;

    if (theme.includes('sonTinh') || theme.includes('tanVien')) {
      // Sơn Tinh: Âm cồng chiêng trầm hùng & tiếng gió đại hải
      notes = [82.41, 110.0, 130.81, 146.83, 164.81, 196.0];
      oscType = 'triangle';
      tempoMs = 2200;
      baseGain = 0.075;
    } else if (theme.includes('anDuong') || theme.includes('coloa')) {
      // An Dương Vương: Âm khánh đồng Cổ Loa & chuông chùa
      notes = [196.0, 220.0, 261.63, 329.63, 392.0];
      oscType = 'sine';
      tempoMs = 2400;
      baseGain = 0.06;
    } else if (theme.includes('voNhat')) {
      // Vợ Nhặt: Âm sáo trúc đồng quê trầm lắng
      notes = [329.63, 392.0, 440.0, 523.25, 659.25];
      oscType = 'sine';
      tempoMs = 2000;
      baseGain = 0.045;
    }

    this.synthInterval = setInterval(() => {
      if (ctx.state !== 'running') return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freq = notes[Math.floor(Math.random() * notes.length)];
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(baseGain, ctx.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 2.3);

        this.activeOscillators.push(osc);
        setTimeout(() => {
          const idx = this.activeOscillators.indexOf(osc);
          if (idx !== -1) this.activeOscillators.splice(idx, 1);
        }, 2400);
      } catch (_) {}
    }, tempoMs);
  }

  /**
   * Hiệu ứng âm thanh một lần khi kích hoạt Cutscene Ngước Nhìn Hóa Thánh trên đỉnh Sóc Sơn
   */
  playThanhGiongAscensionFanfare() {
    if (typeof window !== 'undefined' && window.audioManager?.isMuted) return;
    if ((this.listener?.getMasterVolume?.() ?? 1) <= 0.001) return;
    const ctx = this.listener?.context;
    if (!ctx) return;

    const triggerNow = () => {
      if (typeof window !== 'undefined' && window.audioManager?.isMuted) return;
      if ((this.listener?.getMasterVolume?.() ?? 1) <= 0.001) return;

      try {
        const now = ctx.currentTime;
        const dest = this.listener?.getInput?.() || ctx.destination;
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.42, now);
        masterGain.connect(dest);

        const createdNodes = [masterGain];
        const trackOsc = (osc, endTime, cleanupMaster = false) => {
          this.activeOscillators.push(osc);
          osc.onended = () => {
            const idx = this.activeOscillators.indexOf(osc);
            if (idx !== -1) this.activeOscillators.splice(idx, 1);
            try { osc.disconnect(); } catch (_) {}
            if (cleanupMaster) {
              for (let i = 0; i < createdNodes.length; i++) {
                try { createdNodes[i].disconnect(); } catch (_) {}
              }
            }
          };
          osc.start(now);
          osc.stop(endTime);
        };

        const scheduleTone = (type, startOffset, duration, freqSetup, peakGain, cleanupMaster = false) => {
          const t0 = now + startOffset;
          const t1 = t0 + duration;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type;
          freqSetup(osc, t0, t1);
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peakGain), t0 + Math.min(0.06, duration * 0.25));
          gain.gain.exponentialRampToValueAtTime(0.0001, t1);
          osc.connect(gain);
          gain.connect(masterGain);
          createdNodes.push(gain);
          trackOsc(osc, t1 + 0.04, cleanupMaster);
        };

        // 1. Tiếng ngựa sắt hí vang vút lên trời (FM frequency sweep)
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const neighOsc = ctx.createOscillator();
        const neighGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(22.0, now);
        lfoGain.gain.setValueAtTime(28.0, now);
        neighOsc.type = 'sawtooth';
        neighOsc.frequency.setValueAtTime(420.0, now + 0.04);
        neighOsc.frequency.exponentialRampToValueAtTime(760.0, now + 0.34);
        neighOsc.frequency.exponentialRampToValueAtTime(360.0, now + 0.95);
        neighGain.gain.setValueAtTime(0.0001, now + 0.04);
        neighGain.gain.exponentialRampToValueAtTime(0.14, now + 0.16);
        neighGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.98);
        lfo.connect(lfoGain);
        lfoGain.connect(neighOsc.frequency);
        neighOsc.connect(neighGain);
        neighGain.connect(masterGain);
        createdNodes.push(lfoGain, neighGain);
        trackOsc(lfo, now + 1.02);
        trackOsc(neighOsc, now + 1.02);

        // 2. Hồi trống đồng Đông Sơn giục trận (4 nhịp trầm + âm đồng ngân)
        const drumTimes = [0.0, 0.20, 0.40, 0.62];
        for (let i = 0; i < drumTimes.length; i++) {
          const dt = drumTimes[i];
          scheduleTone('sine', dt, 0.28, (o, t0, t1) => {
            o.frequency.setValueAtTime(98.0, t0);
            o.frequency.exponentialRampToValueAtTime(46.0, t1);
          }, i === 3 ? 0.42 : 0.30);
          scheduleTone('triangle', dt, 0.24, (o, t0) => {
            o.frequency.setValueAtTime(286.0, t0);
          }, 0.08);
        }

        // 3. Hợp âm ngũ cung hào hùng vút cao (C4 - G4 - A4 - D5 - E5)
        const chord = [
          { freq: 261.63, delay: 0.48, dur: 2.1, gain: 0.14 },
          { freq: 392.00, delay: 0.56, dur: 2.05, gain: 0.12 },
          { freq: 440.00, delay: 0.64, dur: 2.0, gain: 0.11 },
          { freq: 587.33, delay: 0.74, dur: 1.95, gain: 0.11 },
          { freq: 659.25, delay: 0.84, dur: 1.9, gain: 0.10 }
        ];
        for (let i = 0; i < chord.length; i++) {
          const n = chord[i];
          scheduleTone('sine', n.delay, n.dur, (o, t0) => {
            o.frequency.setValueAtTime(n.freq, t0);
          }, n.gain, i === chord.length - 1);
        }
      } catch (_) {}
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(triggerNow).catch(() => {});
    } else {
      triggerNow();
    }
  }

  /**
   * Dừng toàn bộ âm thanh khi rời phòng (exitRealm)
   */
  stopAllSounds() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }

    this.activeOscillators.forEach((osc) => {
      try { osc.stop(); } catch (_) {}
    });
    this.activeOscillators = [];

    this.positionalSources.forEach((rec) => {
      if (rec.posAudio && rec.posAudio.isPlaying) {
        try { rec.posAudio.stop(); } catch (_) {}
      }
    });
  }
}

/**
 * ============================================================================
 * PHẦN 2: INTERACTIVE LORE GUIDE (GIAO DIỆN THẺ THƠ SƠN MÀI HOÀNG GIA)
 * ============================================================================
 */
export class MuseumInteractiveLoreGuide {
  constructor(camera, domElement = document.body) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.interactiveArtifacts = [];
    this.isOpen = false;

    this._injectLoreOverlayDOM();
    this._bindEvents();
  }

  _injectLoreOverlayDOM() {
    if (typeof document === 'undefined') return;
    let existing = document.getElementById('museum-lore-overlay');
    if (existing) {
      this.overlayEl = existing;
      return;
    }

    const style = document.createElement('style');
    style.id = 'museum-lore-style';
    style.textContent = `
      #museum-lore-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 4, 18, 0.78);
        backdrop-filter: blur(8px);
        z-index: 99999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.28s ease;
        font-family: "Times New Roman", Georgia, serif;
      }
      #museum-lore-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .lore-card {
        max-width: 640px;
        width: 90%;
        background: linear-gradient(145deg, #1f0707 0%, #2e0d16 55%, #12030a 100%);
        border: 3px solid #fde047;
        box-shadow: 0 0 45px rgba(234, 179, 8, 0.45), inset 0 0 24px rgba(253, 224, 71, 0.2);
        border-radius: 14px;
        padding: 30px 36px;
        color: #fdf2f8;
        transform: translateY(18px) scale(0.96);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
      }
      #museum-lore-overlay.active .lore-card {
        transform: translateY(0) scale(1);
      }
      .lore-room-tag {
        color: #f472b6;
        font-size: 13px;
        letter-spacing: 2.5px;
        text-transform: uppercase;
        font-family: "Segoe UI", sans-serif;
        font-weight: 700;
        margin-bottom: 6px;
      }
      .lore-title {
        color: #fde047;
        font-size: 28px;
        font-weight: bold;
        margin: 0 0 6px 0;
        letter-spacing: 0.5px;
        text-shadow: 0 0 16px rgba(253, 224, 71, 0.35);
      }
      .lore-subtitle {
        color: #fbcfe8;
        font-size: 16px;
        font-style: italic;
        margin-bottom: 18px;
      }
      .lore-poem-box {
        background: rgba(0, 0, 0, 0.42);
        border-left: 4px solid #fde047;
        padding: 16px 22px;
        margin: 16px 0;
        font-size: 20px;
        line-height: 1.65;
        color: #fef08a;
        font-style: italic;
        border-radius: 0 8px 8px 0;
      }
      .lore-desc {
        font-family: "Segoe UI", sans-serif;
        font-size: 15.5px;
        line-height: 1.65;
        color: #f8fafc;
        margin-bottom: 24px;
      }
      .lore-close-btn {
        background: linear-gradient(90deg, #ca8a04, #eab308);
        color: #1a0505;
        border: none;
        padding: 10px 24px;
        font-size: 14.5px;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
        float: right;
        box-shadow: 0 0 16px rgba(234, 179, 8, 0.4);
        transition: transform 0.15s ease;
      }
      .lore-close-btn:hover {
        transform: scale(1.04);
      }
      /* Phong cách Giấy Dó Cổ cho Phòng Trưng Bày Tắt Đèn (Ngô Tất Tố) */
      .lore-card.giay-do-theme {
        background:
          radial-gradient(circle at 20% 15%, rgba(255, 248, 224, 0.45), transparent 55%),
          linear-gradient(155deg, #efe0bc 0%, #dfc693 52%, #cdb079 100%);
        border: 3px double #5a391b;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.72), inset 0 0 38px rgba(102, 65, 28, 0.28);
        color: #26180d;
      }
      .lore-card.giay-do-theme::before {
        content: "TẮT ĐÈN • 1939";
        position: absolute;
        top: 16px;
        right: 22px;
        border: 2px solid #8c221b;
        color: #8c221b;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.4px;
        opacity: 0.78;
        transform: rotate(-3deg);
      }
      .lore-card.giay-do-theme .lore-room-tag {
        color: #7c2d12;
      }
      .lore-card.giay-do-theme .lore-title {
        color: #2c1708;
        text-shadow: none;
      }
      .lore-card.giay-do-theme .lore-subtitle {
        color: #5c3d22;
      }
      .lore-card.giay-do-theme .lore-poem-box {
        background: rgba(94, 62, 29, 0.09);
        border-left: 4px solid #7c2d12;
        color: #3a2310;
      }
      .lore-card.giay-do-theme .lore-desc {
        color: #2f1f13;
      }
      .lore-card.giay-do-theme .lore-close-btn {
        background: linear-gradient(90deg, #5a381b, #7c4d26);
        color: #f6e7c8;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      /* Phong cách Chiếu Lụa Cổ Hoàng Kim cho Nam Quốc Sơn Hà – Lý Thường Kiệt */
      .lore-card.chieu-lua-theme {
        max-width: 720px;
        max-height: 86vh;
        overflow-y: auto;
        background:
          radial-gradient(circle at 18% 12%, rgba(255, 251, 232, 0.55), transparent 58%),
          linear-gradient(160deg, #f8e9be 0%, #ebd08c 48%, #d7b25c 100%);
        border: 4px double #8b1e1e;
        box-shadow: 0 22px 54px rgba(0, 0, 0, 0.8), inset 0 0 42px rgba(139, 30, 30, 0.22);
        color: #2b1408;
      }
      .lore-card.chieu-lua-theme::before {
        content: "THIÊN THƯ • 1077";
        position: absolute;
        top: 16px;
        right: 22px;
        border: 2px solid #8b1e1e;
        background: rgba(139, 30, 30, 0.10);
        color: #8b1e1e;
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.5px;
        transform: rotate(-3deg);
      }
      .lore-card.chieu-lua-theme .lore-room-tag {
        color: #8b1e1e;
      }
      .lore-card.chieu-lua-theme .lore-title {
        color: #4f0e0e;
        text-shadow: 0 1px 0 rgba(255, 245, 210, 0.7);
      }
      .lore-card.chieu-lua-theme .lore-subtitle {
        color: #5c3114;
      }
      .lore-card.chieu-lua-theme .lore-poem-box {
        background: rgba(139, 30, 30, 0.08);
        border-left: 4px solid #8b1e1e;
        color: #3a1808;
        font-size: 16px;
        line-height: 1.55;
      }
      .chieu-lua-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 600px) {
        .chieu-lua-grid { grid-template-columns: 1fr; }
      }
      .chieu-lua-sec-label {
        font-family: "Segoe UI", sans-serif;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.2px;
        color: #8b1e1e;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .chieu-lua-hanzi {
        font-size: 19px;
        font-weight: 700;
        letter-spacing: 3px;
        color: #5c0b0b;
        font-style: normal;
      }
      .chieu-lua-meaning {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px dashed rgba(139, 30, 30, 0.35);
        font-family: "Segoe UI", sans-serif;
        font-size: 14px;
        font-style: normal;
        color: #3a1f0e;
      }
      .lore-card.chieu-lua-theme .lore-desc {
        color: #2f180b;
        font-size: 14.5px;
      }
      .lore-card.chieu-lua-theme .lore-close-btn {
        background: linear-gradient(90deg, #8b1e1e, #b83324);
        color: #fef3c7;
        box-shadow: 0 4px 14px rgba(139, 30, 30, 0.45);
      }
      /* Phong cách Bản Khắc Đồng Cổ Đông Sơn / Giấy Dó cho Phòng 101 & Cõi Thánh Gióng */
      .lore-card.dong-son-giay-do-theme {
        background:
          radial-gradient(circle at 15% 15%, rgba(255, 244, 212, 0.55), transparent 55%),
          radial-gradient(circle at 85% 88%, rgba(31, 78, 67, 0.14), transparent 55%),
          linear-gradient(155deg, #f3e4bf 0%, #e1c487 52%, #cda762 100%);
        border: 4px double #7c4d18;
        box-shadow: 0 22px 54px rgba(0, 0, 0, 0.8), inset 0 0 42px rgba(146, 64, 14, 0.24), inset 0 0 0 2px rgba(45, 90, 76, 0.28);
        color: #261609;
      }
      .lore-card.dong-son-giay-do-theme::before {
        content: "ĐÔNG SƠN • PHÙ ĐỔNG";
        position: absolute;
        top: 16px;
        right: 22px;
        border: 2px solid #9a3412;
        background: rgba(154, 52, 18, 0.10);
        color: #9a3412;
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.4px;
        transform: rotate(-3deg);
      }
      .lore-card.dong-son-giay-do-theme .lore-room-tag {
        color: #1f4e43;
        padding-right: 150px;
      }
      .lore-card.dong-son-giay-do-theme .lore-title {
        color: #5c1d0c;
        text-shadow: 0 1px 0 rgba(255, 245, 210, 0.75);
      }
      .lore-card.dong-son-giay-do-theme .lore-subtitle {
        color: #6b3f16;
      }
      .lore-card.dong-son-giay-do-theme .lore-poem-box {
        background: rgba(124, 77, 24, 0.10);
        border-left: 4px solid #b45309;
        color: #3a1f0a;
      }
      .lore-card.dong-son-giay-do-theme .lore-desc {
        color: #2b180a;
      }
      .lore-card.dong-son-giay-do-theme .lore-close-btn {
        background: linear-gradient(90deg, #9a3412, #c2410c);
        color: #fef3c7;
        box-shadow: 0 4px 14px rgba(154, 52, 18, 0.45);
      }
    `;
    document.head.appendChild(style);

    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'museum-lore-overlay';
    this.overlayEl.innerHTML = `
      <div class="lore-card" id="museum-lore-card">
        <div class="lore-room-tag" id="lore-room"></div>
        <h2 class="lore-title" id="lore-title"></h2>
        <div class="lore-subtitle" id="lore-subtitle"></div>
        <div class="lore-poem-box" id="lore-poem"></div>
        <div class="lore-desc" id="lore-desc"></div>
        <button class="lore-close-btn" id="lore-close-btn">Đóng thẻ [ESC]</button>
      </div>
    `;
    document.body.appendChild(this.overlayEl);

    this.overlayEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === this.overlayEl || e.target.id === 'lore-close-btn') {
        this.hideLoreCard();
      }
    });
  }

  /**
   * Đăng ký một hiện vật 3D tương tác với Lore Key tương ứng
   */
  registerArtifact(object3D, loreKey) {
    if (!object3D) return;
    object3D.userData.loreKey = loreKey;
    object3D.userData.isLoreArtifact = true;
    object3D.userData.ignoreRaycaster = false;

    object3D.traverse((child) => {
      if (child.isMesh) {
        child.userData.loreKey = loreKey;
        child.userData.isLoreArtifact = true;
        child.userData.ignoreRaycaster = false;
      }
    });

    if (!this.interactiveArtifacts.includes(object3D)) {
      this.interactiveArtifacts.push(object3D);
    }
  }

  showLoreCard(loreKey) {
    const data = ARTIFACT_LORE_DATABASE[loreKey];
    if (!data || !this.overlayEl) return;

    const cardEl = document.getElementById('museum-lore-card');
    if (cardEl) {
      cardEl.classList.toggle('giay-do-theme', data.styleTheme === 'giay_do');
      cardEl.classList.toggle('chieu-lua-theme', data.styleTheme === 'chieu_lua');
      cardEl.classList.toggle('dong-son-giay-do-theme', data.styleTheme === 'dong_son_giay_do');
    }

    document.getElementById('lore-room').textContent = `◈ ${data.room} ◈`;
    document.getElementById('lore-title').textContent = data.title;
    document.getElementById('lore-subtitle').textContent = data.subtitle;

    const poemEl = document.getElementById('lore-poem');
    if (data.hanzi || data.phonetic || data.dichTho) {
      const hanziHtml = (data.hanzi || []).join('<br/>');
      const phoneticHtml = (data.phonetic || []).join('<br/>');
      const dichThoHtml = (data.dichTho || []).join('<br/>');
      poemEl.innerHTML = `
        <div class="chieu-lua-grid">
          <div>
            <div class="chieu-lua-sec-label">Nguyên tác chữ Hán</div>
            <div class="chieu-lua-hanzi">${hanziHtml}</div>
          </div>
          <div>
            <div class="chieu-lua-sec-label">Phiên âm Hán – Việt</div>
            <div>${phoneticHtml}</div>
          </div>
        </div>
        <div style="margin-top: 10px;">
          <div class="chieu-lua-sec-label">Dịch thơ</div>
          <div>${dichThoHtml}</div>
        </div>
        ${data.dichNghia ? `<div class="chieu-lua-meaning"><strong>Dịch nghĩa:</strong> ${data.dichNghia}</div>` : ''}
      `;
    } else {
      const poemLines = Array.isArray(data.poem) ? data.poem : [String(data.poem || '')];
      poemEl.innerHTML = poemLines.join('<br/>');
    }

    const descEl = document.getElementById('lore-desc');
    if (data.biography) {
      descEl.innerHTML = `<p style="margin:0 0 8px 0;"><strong>Tiểu sử &amp; Bối cảnh:</strong> ${data.biography}</p><p style="margin:0;"><strong>Hiện vật:</strong> ${data.description}</p>`;
    } else {
      descEl.textContent = data.description;
    }

    this.overlayEl.classList.add('active');
    this.isOpen = true;

    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  hideLoreCard() {
    if (!this.overlayEl) return;
    this.overlayEl.classList.remove('active');
    this.isOpen = false;
  }

  _bindEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('pointerdown', (e) => {
      const hasProxies = Boolean(window.__museumHitboxManager?.clickProxies?.length);
      if (this.isOpen || (this.interactiveArtifacts.length === 0 && !hasProxies)) return;
      if (e.target.closest('#museum-lore-overlay') || e.target.closest('#director-hud')) return;

      const cam = this.camera || window.__camera;
      if (!cam) return;

      if (document.pointerLockElement) {
        this.mouse.set(0, 0);
      } else {
        const canvas = document.querySelector('canvas');
        const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth || 1, height: window.innerHeight || 1 };
        this.mouse.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
      }

      this.raycaster.setFromCamera(this.mouse, cam);

      // Ưu tiên quét qua các hộp Proxy Hitbox chuẩn của MuseumHitboxManager (Skill: hitbox-collision-architect)
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        const proxyHit = window.__museumHitboxManager.raycastInteractiveHitboxes(this.raycaster, 36);
        if (proxyHit && proxyHit.object?.userData?.loreKey) {
          e.stopPropagation();
          if (typeof proxyHit.object.userData.onFocusCamera === 'function') {
            proxyHit.object.userData.onFocusCamera();
          }
          this.showLoreCard(proxyHit.object.userData.loreKey);
          return;
        }
      }

      const hits = this.raycaster.intersectObjects(this.interactiveArtifacts, true)
        .filter((h) => {
          let cur = h.object;
          while (cur) {
            if (cur.visible === false) return false;
            cur = cur.parent;
          }
          return true;
        });

      if (hits.length > 0 && hits[0].distance <= 36) {
        let curr = hits[0].object;
        let loreKey = null;
        let onFocusCamera = null;
        while (curr) {
          if (curr.userData && curr.userData.loreKey) {
            loreKey = curr.userData.loreKey;
            onFocusCamera = curr.userData.onFocusCamera || null;
            break;
          }
          curr = curr.parent;
        }
        if (loreKey) {
          e.stopPropagation();
          if (typeof onFocusCamera === 'function') {
            onFocusCamera();
          }
          this.showLoreCard(loreKey);
        }
      }
    }, true); // Bắt ở capture phase để xử lý trước khi camera xoay

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        e.stopPropagation();
        this.hideLoreCard();
      }
    });
  }
}

/**
 * ============================================================================
 * PHẦN 3: WEBXR TELEPORT CONTROLLER (VR BUTTON & DỊCH CHUYỂN TỨC THỜI 72+ FPS)
 * ============================================================================
 */
export function setupMuseumWebXRTeleport(renderer, scene, cameraRig, walkableFloors = []) {
  if (!renderer || typeof document === 'undefined') return null;

  renderer.xr.enabled = true;
  const vrButton = VRButton.createButton(renderer);
  vrButton.style.zIndex = '9990';
  vrButton.style.bottom = '24px';
  vrButton.style.right = '24px';
  vrButton.style.left = 'auto';
  vrButton.style.opacity = '0.85';
  vrButton.style.borderRadius = '8px';
  vrButton.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.4)';
  document.body.appendChild(vrButton);

  // Vòng tròn đánh dấu điểm đáp Teleport phát sáng trên mặt sàn bảo tàng
  const markerGroup = new THREE.Group();
  markerGroup.name = 'VR_Teleport_Marker';

  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.56, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    })
  );
  ringMesh.position.y = 0.04;

  const coreGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    })
  );
  coreGlow.position.y = 0.045;

  markerGroup.add(ringMesh, coreGlow);
  markerGroup.visible = false;
  if (scene) scene.add(markerGroup);

  // Tia chỉ tay cầm VR (Controller 0)
  const controller = renderer.xr.getController(0);
  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -10)
  ]);
  const rayLine = new THREE.Line(
    rayGeo,
    new THREE.LineBasicMaterial({ color: 0x38bdf8 })
  );
  controller.add(rayLine);

  if (scene) {
    scene.add(controller);
  } else if (cameraRig) {
    cameraRig.add(controller);
  }

  const vrRaycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  let validTargetPoint = null;

  controller.addEventListener('selectend', () => {
    if (validTargetPoint && renderer.xr.isPresenting) {
      if (cameraRig) {
        cameraRig.position.set(validTargetPoint.x, cameraRig.position.y, validTargetPoint.z);
      }
      markerGroup.visible = false;
    }
  });

  let currentScene = scene;
  let currentWalkableFloors = Array.isArray(walkableFloors) ? [...walkableFloors] : [];

  const updateVRTeleport = () => {
    if (!renderer.xr.isPresenting || currentWalkableFloors.length === 0) {
      markerGroup.visible = false;
      return;
    }

    tempMatrix.identity().extractRotation(controller.matrixWorld);
    vrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    vrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const hits = vrRaycaster.intersectObjects(currentWalkableFloors, true);
    if (hits.length > 0 && hits[0].distance <= 25) {
      validTargetPoint = hits[0].point;
      markerGroup.position.copy(validTargetPoint);
      markerGroup.visible = true;
    } else {
      validTargetPoint = null;
      markerGroup.visible = false;
    }
  };

  const setTargetContext = (nextScene, nextFloors = []) => {
    if (nextScene && nextScene !== currentScene) {
      currentScene = nextScene;
      nextScene.add(controller);
      nextScene.add(markerGroup);
    }
    if (Array.isArray(nextFloors) && nextFloors.length > 0) {
      currentWalkableFloors = nextFloors;
    }
  };

  return { controller, markerGroup, updateVRTeleport, setTargetContext };
}

/**
 * ============================================================================
 * FACTORY HÀM KHỞI TẠO TẬP TRUNG HỆ THỐNG ĐA GIÁC QUAN
 * ============================================================================
 */
export function createMuseumImmersionSystem({
  renderer = null,
  scene = null,
  camera = null,
  cameraRig = null,
  walkableFloors = []
} = {}) {
  const spatialAudio = new MuseumSpatialAudioDirector(camera);
  const loreGuide = new MuseumInteractiveLoreGuide(camera);
  const xrTeleport = renderer ? setupMuseumWebXRTeleport(renderer, scene, cameraRig || camera, walkableFloors) : null;

  const immersion = {
    spatialAudio,
    loreGuide,
    xrTeleport,
    update: () => {
      xrTeleport?.updateVRTeleport?.();
    }
  };

  if (typeof window !== 'undefined') {
    window.__museumImmersion = immersion;
    window.__spatialAudio = spatialAudio;
    window.__loreGuide = loreGuide;
  }

  return immersion;
}
