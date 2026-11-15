import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import {
  PLAQUE_LORE_DATABASE,
  SYNTHESIZED_ROOM_LORE,
  getSynthesizedPlaqueLore,
  normalizePlaqueStyleTheme,
  generateHeritageIllustrationDataUri
} from '../config/plaqueLoreSynthesis.js';
import {
  isObjectIgnoredByRaycaster,
  isObjectHierarchyVisible
} from './museumHitboxSystem.js';

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

  _buildProceduralAudioBuffer(recOrTheme) {
    const rec = typeof recOrTheme === 'string'
      ? { fallbackTheme: recOrTheme, key: recOrTheme }
      : (recOrTheme || {});
    const theme = rec.fallbackTheme || rec.key || '';
    const keyLower = String(rec.key || '').toLowerCase();
    const themeLower = String(theme || '').toLowerCase();

    if (rec.isThanhGiongProcedural || themeLower.startsWith('thanhgiong_')) {
      return this._createThanhGiongPositionalBuffer(theme);
    }
    if (rec.isNqshProcedural || themeLower.startsWith('nqsh_')) {
      return this._createNqshPositionalBuffer(theme);
    }
    if (
      rec.isNamXuongProcedural ||
      themeLower.startsWith('namxuong_') ||
      themeLower.startsWith('nam_xuong_') ||
      themeLower.includes('namxuong') ||
      keyLower.startsWith('namxuong_') ||
      keyLower.startsWith('nam_xuong_') ||
      keyLower.includes('namxuong')
    ) {
      const nxTheme = (theme && theme !== 'truyenKieu') ? theme : (rec.key || 'namxuong_realm_cottage_lullaby');
      return this._createNamXuongPositionalBuffer(nxTheme);
    }
    if (
      rec.isViDaProcedural ||
      themeLower.startsWith('vida_') ||
      themeLower.startsWith('daythonvida') ||
      themeLower === 'day_thon_vi_da' ||
      keyLower.startsWith('vida_')
    ) {
      const viDaTheme = (theme && theme !== 'truyenKieu') ? theme : (rec.key || 'vida_realm_garden_wind');
      return this._createDayThonViDaPositionalBuffer(viDaTheme);
    }
    return this._createTatDenPositionalBuffer(theme);
  }

  _ensureProceduralBufferReady(rec) {
    if (!rec || rec.isLoadedFile || !rec.isProcedural) return;
    const buf = this._buildProceduralAudioBuffer(rec);
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
   * Tổng hợp AudioBuffer vòng lặp cho nguồn THREE.PositionalAudio Phòng 204 & Cõi Thế Giới Mở Chuyện Người Con Gái Nam Xương
   */
  _createNamXuongPositionalBuffer(theme) {
    const cacheKey = `namxuong_${theme}`;
    if (this.cachedProceduralBuffers.has(cacheKey)) {
      return this.cachedProceduralBuffers.get(cacheKey);
    }
    const ctx = this.listener?.context;
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate || 44100;
    const lower = String(theme || '').toLowerCase();
    const isRealmKey = lower.includes('namxuong_realm_') || lower.includes('nam_xuong_realm_');
    const duration = isRealmKey ? 6.0 : 4.0;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (
      lower === 'namxuong_realm_cottage_lullaby' ||
      lower.includes('cottage_lullaby') ||
      lower.includes('lullaby') ||
      lower.includes('ru_con')
    ) {
      // 1. 'namxuong_realm_cottage_lullaby': Tiếng đêm côn trùng rả rích, gió luồn qua vách nứa, hòa tiếng ru con nghẹn ngào đơn côi của người mẹ trẻ
      let lpWind = 0;
      let lpBreath = 0;
      // Giai điệu ru con ngũ cung Bắc Bộ nghẹn ngào (A3, C4, D4, E4, D4, C4, A3, G3)
      const lullabyNotes = [220.0, 261.63, 293.66, 329.63, 293.66, 261.63, 220.0, 196.0];

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Gió luồn qua vách nứa (dải trầm-trung với tiếng rít gió nhẹ)
        const nWind = Math.random() * 2 - 1;
        lpWind += 0.024 * (nWind - lpWind);
        const windSwell = 0.35 + 0.65 * Math.sin(2 * Math.PI * (1 / duration) * t) ** 2;
        const whistle = Math.sin(2 * Math.PI * (310 + 40 * Math.sin(2 * Math.PI * 0.4 * t)) * t) * 0.024 * windSwell;
        const cottageWind = (lpWind * 0.24 + whistle) * windSwell;

        // Tiếng đêm côn trùng rả rích (tiếng dế/côn trùng đêm kêu ngắt quãng theo nhịp)
        const cricketBurst = Math.max(0, Math.sin(2 * Math.PI * 1.6 * t)) ** 5;
        const cricketPulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 32.0 * t);
        const cricket = Math.sin(2 * Math.PI * 4250.0 * t) * cricketBurst * cricketPulse * 0.038;
        const subCricket = Math.sin(2 * Math.PI * 4980.0 * t) * (Math.max(0, Math.sin(2 * Math.PI * 2.2 * t + 0.7)) ** 6) * 0.022;

        // Tiếng ru con nghẹn ngào đơn côi của người mẹ trẻ (ấm áp, hơi nghẹn ở cuối câu)
        const seg = (t / duration) * lullabyNotes.length;
        const slot = Math.min(lullabyNotes.length - 1, Math.floor(seg));
        const phase = seg % 1.0;
        const noteEnv = phase < 0.84 ? Math.sin(Math.PI * (phase / 0.84)) ** 1.35 : 0;
        const vib = 1.0 + Math.sin(2 * Math.PI * 4.6 * t) * 0.012 * Math.min(1.0, phase * 2.5);
        const f0 = lullabyNotes[slot] * vib;

        // Mô phỏng thanh âm giọng hát ru ấm áp (họa âm cơ bản, âm bội 2 & 3)
        const voiceTone = (
          Math.sin(2 * Math.PI * f0 * t) * 0.24 +
          Math.sin(4 * Math.PI * f0 * t) * 0.09 +
          Math.sin(6 * Math.PI * f0 * t) * 0.03
        ) * noteEnv;

        // Hơi thở nhẹ ngắt quãng như tiếng nấc nghẹn ngào
        const nBreath = Math.random() * 2 - 1;
        lpBreath += 0.06 * (nBreath - lpBreath);
        const sighEnv = (phase > 0.65 && phase < 0.85) ? Math.sin(Math.PI * ((phase - 0.65) / 0.20)) ** 2 : 0;
        const sigh = (nBreath - lpBreath) * 0.028 * sighEnv;

        data[i] = (cottageWind * 0.65 + (cricket + subCricket) * 0.55 + (voiceTone + sigh) * 0.75) * 0.62;
      }
    } else if (
      lower === 'namxuong_realm_river_waves' ||
      lower.includes('river_waves') ||
      lower.includes('song_hoang_giang') ||
      lower.includes('waves')
    ) {
      // 2. 'namxuong_realm_river_waves': Tiếng sóng nước sông Hoàng Giang vỗ triền đê mênh mang, lạnh lẽo giữa đêm đông
      let lpWave = 0;
      let lpHiss = 0;

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Tiếng sóng nước vỗ triền đê: hai tầng sóng lớn cuộn dồn nhịp nhàng
        const nWave = Math.random() * 2 - 1;
        lpWave += 0.026 * (nWave - lpWave);
        const swell1 = 0.40 + 0.60 * Math.sin(2 * Math.PI * (1 / duration) * t) ** 2;
        const swell2 = 0.35 + 0.65 * Math.sin(2 * Math.PI * (2 / duration) * t + 1.2) ** 2;
        const riverLap = lpWave * (swell1 * 0.62 + swell2 * 0.38) * 0.42;

        // Bọt sóng xô bờ và hạt nước lăn tăn
        const nHiss = Math.random() * 2 - 1;
        lpHiss += 0.12 * (nHiss - lpHiss);
        const waveCrest = Math.max(0, Math.sin(2 * Math.PI * (1 / duration) * t - 0.25)) ** 3;
        const spray = (nHiss - lpHiss) * waveCrest * 0.055;

        // Gió đêm đông buốt giá mênh mang trên mặt sông
        const coldDrone = (Math.sin(2 * Math.PI * 52.0 * t) * 0.05 + Math.sin(2 * Math.PI * 78.0 * t) * 0.03) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.25 * t));
        const winterWind = Math.sin(2 * Math.PI * (460 + 35 * Math.sin(2 * Math.PI * 0.2 * t)) * t) * 0.016 * swell1;

        data[i] = (riverLap + spray + coldDrone + winterWind) * 0.64;
      }
    } else if (
      lower === 'namxuong_realm_ritual_music' ||
      lower.includes('ritual_music') ||
      lower.includes('dan_giai_oan') ||
      lower.includes('ritual') ||
      lower.includes('nhac_le')
    ) {
      // 3. 'namxuong_realm_ritual_music': Tiếng nhạc lễ giải oan trầm hùng, chuông đồng & khói hương bảng lảng trên bến sông
      const ritualNotes = [174.61, 196.0, 220.0, 261.63, 220.0, 196.0];
      let lpIncense = 0;

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Tiếng chuông đồng cổ đại ngân vang trầm hùng (họa âm không điều hòa chuông đồng Việt)
        const bellCycle = (t / (duration * 0.5)) % 1.0;
        const bellEnv = Math.exp(-bellCycle * 2.8);
        const bell = (
          Math.sin(2 * Math.PI * 174.61 * t) * 0.32 +
          Math.sin(2 * Math.PI * 349.23 * t) * 0.18 +
          Math.sin(2 * Math.PI * 523.25 * t) * 0.08 +
          Math.sin(2 * Math.PI * 873.08 * t) * 0.04
        ) * bellEnv;

        // Tiếng nhạc lễ giải oan trầm mặc (nhịp gõ đồng & đàn tang lễ cổ truyền)
        const seg = (t / duration) * ritualNotes.length;
        const slot = Math.min(ritualNotes.length - 1, Math.floor(seg));
        const phase = seg % 1.0;
        const chantEnv = Math.exp(-phase * 2.5) * Math.sin(Math.PI * Math.min(1.0, phase * 6.0));
        const fChant = ritualNotes[slot];
        const ritualMelody = (
          Math.sin(2 * Math.PI * fChant * t) * 0.22 +
          Math.sin(4 * Math.PI * fChant * t) * 0.07
        ) * chantEnv;

        // Khói hương bảng lảng mờ ảo (tiếng gió thiêng & shimmer dải cao êm đềm)
        const nIncense = Math.random() * 2 - 1;
        lpIncense += 0.02 * (nIncense - lpIncense);
        const incenseAir = lpIncense * (0.45 + 0.55 * Math.sin(2 * Math.PI * (1 / duration) * t) ** 2) * 0.22;
        const shimmer = Math.sin(2 * Math.PI * 698.46 * t) * 0.035 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t));

        data[i] = (bell * 0.55 + ritualMelody * 0.58 + incenseAir + shimmer) * 0.62;
      }
    } else if (lower === 'namxuong_river') {
      // Sóng nước sông Hoàng Giang vỗ nhẹ trong đêm + âm vang thủy cung huyền ảo
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const noise = Math.random() * 2 - 1;
        lp += 0.024 * (noise - lp);
        const wave1 = 0.42 + 0.58 * Math.sin(2 * Math.PI * 0.25 * t) ** 2;
        const wave2 = 0.35 + 0.65 * Math.sin(2 * Math.PI * 0.5 * t + 0.9) ** 2;
        const chimeEnv = Math.exp(-((t * 0.5) % 1.0) * 3.2);
        const chime = (
          Math.sin(2 * Math.PI * 523.25 * t) * 0.07 +
          Math.sin(2 * Math.PI * 659.25 * t) * 0.05
        ) * chimeEnv;
        data[i] = lp * (wave1 * 0.6 + wave2 * 0.4) * 0.42 + chime;
      }
    } else {
      // namxuong_cottage: Gió đêm qua vách nứa + giai điệu đàn bầu/lời ru u buồn ngũ cung
      const notes = [220.0, 261.63, 293.66, 329.63, 293.66, 261.63, 220.0, 196.0];
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const noise = Math.random() * 2 - 1;
        lp += 0.028 * (noise - lp);
        const windEnv = 0.38 + 0.62 * Math.sin(2 * Math.PI * 0.25 * t) ** 2;
        const slot = Math.min(notes.length - 1, Math.floor((t / duration) * notes.length));
        const notePhase = ((t / duration) * notes.length) % 1.0;
        const noteEnv = Math.sin(Math.PI * notePhase) ** 1.1;
        const vib = 1.0 + Math.sin(2 * Math.PI * 4.5 * t) * 0.012;
        const f = notes[slot] * vib;
        const danBau = (Math.sin(2 * Math.PI * f * t) * 0.22 + Math.sin(4 * Math.PI * f * t) * 0.06) * noteEnv;
        data[i] = lp * windEnv * 0.28 + danBau * 0.65;
      }
    }

    // Crossfade nhẹ 40ms ở biên vòng lặp để tránh tiếng tách (click)
    const fadeSamples = Math.min(Math.floor(sampleRate * 0.04), Math.floor(length * 0.08));
    for (let i = 0; i < fadeSamples; i++) {
      const w = i / fadeSamples;
      data[i] *= w;
      data[length - 1 - i] *= w;
    }

    this.cachedProceduralBuffers.set(cacheKey, buffer);
    return buffer;
  }

  /**
   * Tổng hợp AudioBuffer vòng lặp cho nguồn THREE.PositionalAudio Phòng 302 & Cõi Thế Giới Mở Đây Thôn Vĩ Dạ
   */
  _createDayThonViDaPositionalBuffer(theme) {
    const cacheKey = `vida_${theme}`;
    if (this.cachedProceduralBuffers.has(cacheKey)) {
      return this.cachedProceduralBuffers.get(cacheKey);
    }
    const ctx = this.listener?.context;
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate || 44100;
    const lower = String(theme || '').toLowerCase();
    const isRealmKey = lower.includes('vida_realm_');
    const duration = isRealmKey ? 6.0 : 4.0;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (lower === 'vida_realm_mist_recital' || lower.includes('mist') || lower.includes('recital') || lower.includes('suong')) {
      // Cõi mộng sương khói: tiếng sáo trúc vang vọng mờ ảo hòa tiếng gió đêm trên bến sương khói
      const fluteNotes = [440.0, 392.0, 349.23, 293.66, 349.23, 293.66];
      const echoSamples = Math.floor(sampleRate * 0.36);
      const dryFlute = new Float32Array(length);
      let lpWind = 0;
      let lpBreath = 0;

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const nWind = Math.random() * 2 - 1;
        lpWind += 0.016 * (nWind - lpWind);
        const nightSwell = 0.40 + 0.60 * Math.sin(2 * Math.PI * (1 / duration) * t) ** 2;
        const nightWind = lpWind * nightSwell * 0.28;

        const seg = (t / duration) * fluteNotes.length;
        const slot = Math.min(fluteNotes.length - 1, Math.floor(seg));
        const phase = seg % 1.0;
        // Sáo trúc ngân êm, có khoảng lặng mờ ảo cuối mỗi câu
        const activeEnv = phase < 0.82 ? Math.sin(Math.PI * (phase / 0.82)) ** 1.25 : 0;
        const vib = 1.0 + Math.sin(2 * Math.PI * 4.6 * t) * 0.010 * Math.min(1, phase * 3.0);
        const f = fluteNotes[slot] * vib;

        const nBreath = Math.random() * 2 - 1;
        lpBreath += 0.085 * (nBreath - lpBreath);
        const breathNoise = (nBreath - lpBreath) * 0.035 * activeEnv;

        const fluteTone = (
          Math.sin(2 * Math.PI * f * t) * 0.20 +
          Math.sin(4 * Math.PI * f * t) * 0.045 +
          Math.sin(6 * Math.PI * f * t) * 0.015
        ) * activeEnv + breathNoise;

        dryFlute[i] = fluteTone;
        const echoIdx = (i - echoSamples + length) % length;
        const echoFlute = dryFlute[echoIdx] * 0.34;

        data[i] = (nightWind + fluteTone * 0.72 + echoFlute) * 0.60;
      }
    } else if (lower === 'vida_realm_garden_wind' || lower.includes('garden') || lower.includes('vuon') || lower.includes('bamboo')) {
      // Vườn Vĩ Dạ ban mai: tiếng gió nhẹ lùa qua tàu cau, lá trúc xào xạc kết hợp tiếng chim hót ban mai thưa thoáng
      let lpWind = 0;
      let lpRustle = 0;
      const morningNotes = [587.33, 659.25, 783.99, 659.25, 587.33, 523.25];
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const n1 = Math.random() * 2 - 1;
        lpWind += 0.024 * (n1 - lpWind);
        const breeze = 0.38 + 0.62 * Math.sin(2 * Math.PI * (1 / duration) * t) ** 2;
        const gust = 0.55 + 0.45 * Math.sin(2 * Math.PI * (2 / duration) * t + 0.8);
        const palmWind = lpWind * breeze * 0.24;

        // Tiếng lá trúc & tàu cau xào xạc nhẹ ở dải trung-cao
        const n2 = Math.random() * 2 - 1;
        lpRustle += 0.18 * (n2 - lpRustle);
        const leafRustle = (n2 - lpRustle) * (0.025 + 0.035 * breeze * gust);

        // Tiếng chim hót ban mai thưa thoáng (2 nhịp luyến tự nhiên trong vòng lặp)
        let bird = 0;
        const c1 = (t - 0.85) / 0.32;
        if (c1 >= 0 && c1 <= 1) {
          const env1 = Math.sin(Math.PI * c1) ** 1.4;
          const f1 = 1980 + 480 * Math.sin(Math.PI * c1) + 180 * Math.sin(2 * Math.PI * 16.0 * t);
          bird += Math.sin(2 * Math.PI * f1 * t) * env1 * 0.055;
        }
        const c2 = (t - 3.70) / 0.36;
        if (c2 >= 0 && c2 <= 1) {
          const env2 = Math.sin(Math.PI * c2) ** 1.5;
          const f2 = 2240 - 320 * c2 + 210 * Math.sin(2 * Math.PI * 14.0 * t);
          bird += Math.sin(2 * Math.PI * f2 * t) * env2 * 0.05;
        }

        const slot = Math.min(morningNotes.length - 1, Math.floor((t / duration) * morningNotes.length));
        const notePhase = ((t / duration) * morningNotes.length) % 1.0;
        const chimeEnv = Math.exp(-notePhase * 4.2) * Math.sin(Math.PI * Math.min(1, notePhase * 8));
        const chime = Math.sin(2 * Math.PI * morningNotes[slot] * t) * chimeEnv * (isRealmKey ? 0.055 : 0.11);

        data[i] = (palmWind + leafRustle + bird + chime) * 0.64;
      }
    } else {
      // vida_realm_river_zither / Bến sông trăng: tiếng sóng nước sông Hương vỗ mạn thuyền êm ái hòa quyện tiếng đàn tranh Huế ngũ cung sâu lắng
      let lp = 0;
      const hueNotes = isRealmKey
        ? [293.66, 349.23, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63]
        : [293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 261.63];
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const noise = Math.random() * 2 - 1;
        lp += 0.020 * (noise - lp);
        const wave1 = 0.42 + 0.58 * Math.sin(2 * Math.PI * (1 / duration) * t) ** 2;
        const wave2 = 0.36 + 0.64 * Math.sin(2 * Math.PI * (2 / duration) * t + 0.7) ** 2;
        const riverLap = lp * (wave1 * 0.62 + wave2 * 0.38) * 0.34;
        const hullSoft = Math.sin(2 * Math.PI * 98.0 * t) * 0.018 * (wave1 * wave2);

        const slot = Math.min(hueNotes.length - 1, Math.floor((t / duration) * hueNotes.length));
        const notePhase = ((t / duration) * hueNotes.length) % 1.0;
        const pluckEnv = Math.exp(-notePhase * 3.1) * Math.sin(Math.PI * Math.min(1, notePhase * 7));
        const vib = 1.0 + Math.sin(2 * Math.PI * 4.2 * t) * 0.0085;
        const f = hueNotes[slot] * vib;
        const zither = (
          Math.sin(2 * Math.PI * f * t) * 0.21 +
          Math.sin(4 * Math.PI * f * t) * 0.075 +
          Math.sin(6 * Math.PI * f * t) * 0.025
        ) * pluckEnv;

        data[i] = (riverLap + hullSoft + zither) * 0.62;
      }
    }

    // Crossfade nhẹ 40ms ở biên vòng lặp để tránh tiếng tách (click)
    const fadeSamples = Math.min(Math.floor(sampleRate * 0.04), Math.floor(length * 0.08));
    for (let i = 0; i < fadeSamples; i++) {
      const w = i / fadeSamples;
      data[i] *= w;
      data[length - 1 - i] *= w;
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

    const keyStr = String(key || '');
    const resolvedFallbackTheme = (fallbackTheme && fallbackTheme !== 'truyenKieu')
      ? fallbackTheme
      : (keyStr.startsWith('vida_')
        ? keyStr
        : (keyStr.startsWith('namxuong_') || keyStr.startsWith('nam_xuong_') ? keyStr : fallbackTheme));

    const isTatDenProcedural = !audioUrl && typeof resolvedFallbackTheme === 'string' && resolvedFallbackTheme.startsWith('tatden_');
    const isNqshProcedural = !audioUrl && typeof resolvedFallbackTheme === 'string' && resolvedFallbackTheme.startsWith('nqsh_');
    const isThanhGiongProcedural = !audioUrl && typeof resolvedFallbackTheme === 'string' && resolvedFallbackTheme.startsWith('thanhgiong_');
    const isNamXuongProcedural = !audioUrl && typeof resolvedFallbackTheme === 'string' && (
      resolvedFallbackTheme.startsWith('namxuong_') ||
      resolvedFallbackTheme.startsWith('nam_xuong_') ||
      resolvedFallbackTheme === 'nguoi_con_gai_nam_xuong'
    );
    const isViDaProcedural = !audioUrl && typeof resolvedFallbackTheme === 'string' && (
      resolvedFallbackTheme.startsWith('vida_') ||
      resolvedFallbackTheme.startsWith('dayThonViDa') ||
      resolvedFallbackTheme === 'day_thon_vi_da'
    );
    const isProcedural = isTatDenProcedural || isNqshProcedural || isThanhGiongProcedural || isNamXuongProcedural || isViDaProcedural;
    const record = {
      key,
      posAudio,
      fallbackTheme: resolvedFallbackTheme,
      isLoadedFile: false,
      autoPlayLoop: isProcedural,
      isProcedural,
      isNqshProcedural,
      isThanhGiongProcedural,
      isNamXuongProcedural,
      isViDaProcedural
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
    } else if (theme.includes('namXuong') || theme.includes('nam_xuong') || theme.includes('namxuong') || theme.includes('hoangGiang')) {
      // Nam Xương: Âm hưởng đàn bầu / sáo trầm ai oán bên bến Hoàng Giang
      notes = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0];
      oscType = 'sine';
      tempoMs = 2100;
      baseGain = 0.048;
    } else if (theme.includes('dayThonViDa') || theme.includes('day_thon_vi_da') || theme.includes('vi_da') || theme.includes('vida')) {
      // Đây Thôn Vĩ Dạ: Âm hưởng đàn tranh / sáo trúc xứ Huế bàng bạc mộng ảo
      notes = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
      oscType = 'sine';
      tempoMs = 1950;
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
function getObjectRootScene(obj) {
  let cur = obj;
  while (cur) {
    if (cur.isScene) return cur;
    cur = cur.parent;
  }
  return null;
}

export class MuseumInteractiveLoreGuide {
  constructor(camera, domElement = document.body) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.interactiveArtifacts = [];
    this.isOpen = false;
    this._hoveredTarget = null;
    this._isHoveringPlaque = false;
    this._lastHoverRaycastMs = 0;
    this._openedInScene = null;
    this._openedInRealm = false;
    this._pendingRestoreCamera = null;

    this._injectLoreOverlayDOM();
    this._bindEvents();
  }

  _injectLoreOverlayDOM() {
    if (typeof document === 'undefined') return;
    let existing = document.getElementById('museum-lore-overlay');
    if (existing) {
      this.overlayEl = existing;
      this.hoverPromptEl = document.getElementById('lore-hover-prompt');
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
        padding: 18px;
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
        max-width: 740px;
        width: 92%;
        max-height: 88vh;
        overflow-y: auto;
        background: linear-gradient(145deg, #1f0707 0%, #2e0d16 55%, #12030a 100%);
        border: 3px solid #fde047;
        box-shadow: 0 0 45px rgba(234, 179, 8, 0.45), inset 0 0 24px rgba(253, 224, 71, 0.2);
        border-radius: 14px;
        padding: 28px 34px;
        color: #fdf2f8;
        transform: translateY(18px) scale(0.96);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        box-sizing: border-box;
      }
      .lore-card::-webkit-scrollbar {
        width: 7px;
      }
      .lore-card::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.45);
        border-radius: 4px;
      }
      #museum-lore-overlay.active .lore-card {
        transform: translateY(0) scale(1);
      }
      .lore-room-tag {
        color: #f472b6;
        font-size: 12.5px;
        letter-spacing: 2px;
        text-transform: uppercase;
        font-family: "Segoe UI", sans-serif;
        font-weight: 700;
        margin-bottom: 6px;
        padding-right: 165px;
      }
      .lore-title {
        color: #fde047;
        font-size: 27px;
        font-weight: bold;
        margin: 0 0 6px 0;
        letter-spacing: 0.4px;
        text-shadow: 0 0 16px rgba(253, 224, 71, 0.35);
      }
      .lore-subtitle {
        color: #fbcfe8;
        font-size: 15.5px;
        font-style: italic;
        margin-bottom: 12px;
      }
      .lore-meta-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 14px;
      }
      .lore-meta-pill {
        font-family: "Segoe UI", sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(253, 224, 71, 0.14);
        border: 1px solid rgba(253, 224, 71, 0.4);
        color: #fef08a;
      }
      .lore-illustration-wrap {
        margin: 12px 0 16px 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(253, 224, 71, 0.35);
        background: rgba(0, 0, 0, 0.32);
        text-align: center;
      }
      .lore-illustration-img {
        display: block;
        width: 100%;
        max-height: 220px;
        object-fit: contain;
        background: rgba(15, 10, 8, 0.25);
      }
      .lore-illustration-fallback {
        padding: 24px 16px;
        font-family: "Segoe UI", sans-serif;
        font-size: 13.5px;
        font-style: italic;
        opacity: 0.85;
      }
      .lore-illustration-caption {
        font-family: "Segoe UI", sans-serif;
        font-size: 12px;
        font-style: italic;
        padding: 6px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        opacity: 0.88;
      }
      .lore-poem-box {
        background: rgba(0, 0, 0, 0.42);
        border-left: 4px solid #fde047;
        padding: 14px 20px;
        margin: 14px 0;
        font-size: 18.5px;
        line-height: 1.62;
        color: #fef08a;
        font-style: italic;
        border-radius: 0 8px 8px 0;
      }
      .lore-desc {
        font-family: "Segoe UI", sans-serif;
        font-size: 15px;
        line-height: 1.68;
        color: #f8fafc;
        margin-bottom: 20px;
      }
      .lore-desc p {
        margin: 0 0 10px 0;
      }
      .lore-desc p:last-child {
        margin-bottom: 0;
      }
      .lore-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.15);
      }
      .lore-footer-hint {
        font-family: "Segoe UI", sans-serif;
        font-size: 12px;
        opacity: 0.78;
      }
      .lore-close-btn {
        background: linear-gradient(90deg, #ca8a04, #eab308);
        color: #1a0505;
        border: none;
        padding: 10px 22px;
        font-size: 14px;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 0 16px rgba(234, 179, 8, 0.4);
        transition: transform 0.15s ease;
        flex-shrink: 0;
      }
      .lore-close-btn:hover {
        transform: scale(1.04);
      }

      /* 1. Phong cách Giấy Dó Cổ (giay_do) */
      .lore-card.giay-do-theme {
        background:
          radial-gradient(circle at 20% 15%, rgba(255, 248, 224, 0.45), transparent 55%),
          linear-gradient(155deg, #efe0bc 0%, #dfc693 52%, #cdb079 100%);
        border: 3px double #5a391b;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.72), inset 0 0 38px rgba(102, 65, 28, 0.28);
        color: #26180d;
      }
      .lore-card.giay-do-theme::before {
        content: attr(data-badge);
        position: absolute;
        top: 16px;
        right: 22px;
        border: 2px solid #8c221b;
        color: #8c221b;
        background: rgba(140, 34, 27, 0.08);
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.4px;
        opacity: 0.85;
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
      .lore-card.giay-do-theme .lore-meta-pill {
        background: rgba(90, 57, 27, 0.12);
        border-color: rgba(90, 57, 27, 0.35);
        color: #4a2c12;
      }
      .lore-card.giay-do-theme .lore-illustration-wrap {
        border-color: rgba(90, 57, 27, 0.45);
        background: rgba(124, 77, 38, 0.08);
      }
      .lore-card.giay-do-theme .lore-illustration-caption {
        border-top-color: rgba(90, 57, 27, 0.22);
        color: #4a2c12;
      }
      .lore-card.giay-do-theme .lore-poem-box {
        background: rgba(94, 62, 29, 0.09);
        border-left: 4px solid #7c2d12;
        color: #3a2310;
      }
      .lore-card.giay-do-theme .lore-desc {
        color: #2f1f13;
      }
      .lore-card.giay-do-theme .lore-card-footer {
        border-top-color: rgba(90, 57, 27, 0.24);
      }
      .lore-card.giay-do-theme .lore-close-btn {
        background: linear-gradient(90deg, #5a381b, #7c4d26);
        color: #f6e7c8;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      /* 2. Phong cách Chiếu Lụa Hoàng Kim (lua_hoang_kim / chieu_lua) */
      .lore-card.chieu-lua-theme,
      .lore-card.lua-hoang-kim-theme {
        background:
          radial-gradient(circle at 18% 12%, rgba(255, 251, 232, 0.55), transparent 58%),
          linear-gradient(160deg, #f8e9be 0%, #ebd08c 48%, #d7b25c 100%);
        border: 4px double #8b1e1e;
        box-shadow: 0 22px 54px rgba(0, 0, 0, 0.8), inset 0 0 42px rgba(139, 30, 30, 0.22);
        color: #2b1408;
      }
      .lore-card.chieu-lua-theme::before,
      .lore-card.lua-hoang-kim-theme::before {
        content: attr(data-badge);
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
      .lore-card.chieu-lua-theme .lore-room-tag,
      .lore-card.lua-hoang-kim-theme .lore-room-tag {
        color: #8b1e1e;
      }
      .lore-card.chieu-lua-theme .lore-title,
      .lore-card.lua-hoang-kim-theme .lore-title {
        color: #4f0e0e;
        text-shadow: 0 1px 0 rgba(255, 245, 210, 0.7);
      }
      .lore-card.chieu-lua-theme .lore-subtitle,
      .lore-card.lua-hoang-kim-theme .lore-subtitle {
        color: #5c3114;
      }
      .lore-card.chieu-lua-theme .lore-meta-pill,
      .lore-card.lua-hoang-kim-theme .lore-meta-pill {
        background: rgba(139, 30, 30, 0.10);
        border-color: rgba(139, 30, 30, 0.35);
        color: #6b1515;
      }
      .lore-card.chieu-lua-theme .lore-illustration-wrap,
      .lore-card.lua-hoang-kim-theme .lore-illustration-wrap {
        border-color: rgba(139, 30, 30, 0.40);
        background: rgba(139, 30, 30, 0.06);
      }
      .lore-card.chieu-lua-theme .lore-illustration-caption,
      .lore-card.lua-hoang-kim-theme .lore-illustration-caption {
        border-top-color: rgba(139, 30, 30, 0.22);
        color: #5c3114;
      }
      .lore-card.chieu-lua-theme .lore-poem-box,
      .lore-card.lua-hoang-kim-theme .lore-poem-box {
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
      .lore-card.chieu-lua-theme .lore-desc,
      .lore-card.lua-hoang-kim-theme .lore-desc {
        color: #2f180b;
        font-size: 14.5px;
      }
      .lore-card.chieu-lua-theme .lore-card-footer,
      .lore-card.lua-hoang-kim-theme .lore-card-footer {
        border-top-color: rgba(139, 30, 30, 0.25);
      }
      .lore-card.chieu-lua-theme .lore-close-btn,
      .lore-card.lua-hoang-kim-theme .lore-close-btn {
        background: linear-gradient(90deg, #8b1e1e, #b83324);
        color: #fef3c7;
        box-shadow: 0 4px 14px rgba(139, 30, 30, 0.45);
      }

      /* 3. Phong cách Bia Đá Rêu Phong (da_reu_phong) */
      .lore-card.da-reu-phong-theme {
        background:
          radial-gradient(circle at 18% 15%, rgba(92, 114, 88, 0.26), transparent 56%),
          radial-gradient(circle at 86% 85%, rgba(217, 164, 65, 0.14), transparent 55%),
          linear-gradient(155deg, #373e38 0%, #2a312b 54%, #1f2520 100%);
        border: 3px double #5c7258;
        box-shadow: 0 22px 54px rgba(0, 0, 0, 0.85), inset 0 0 38px rgba(74, 112, 68, 0.25), inset 0 0 0 1px rgba(217, 164, 65, 0.28);
        color: #f3e7c8;
      }
      .lore-card.da-reu-phong-theme::before {
        content: attr(data-badge);
        position: absolute;
        top: 16px;
        right: 22px;
        border: 2px solid #d9a441;
        background: rgba(217, 164, 65, 0.14);
        color: #f3c86a;
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.4px;
        transform: rotate(-3deg);
      }
      .lore-card.da-reu-phong-theme .lore-room-tag {
        color: #a9c7a1;
      }
      .lore-card.da-reu-phong-theme .lore-title {
        color: #f8e5b2;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.65);
      }
      .lore-card.da-reu-phong-theme .lore-subtitle {
        color: #d1c29a;
      }
      .lore-card.da-reu-phong-theme .lore-meta-pill {
        background: rgba(92, 114, 88, 0.25);
        border-color: rgba(217, 164, 65, 0.45);
        color: #f3e7c8;
      }
      .lore-card.da-reu-phong-theme .lore-illustration-wrap {
        border-color: rgba(92, 114, 88, 0.75);
        background: rgba(22, 27, 23, 0.65);
      }
      .lore-card.da-reu-phong-theme .lore-illustration-caption {
        border-top-color: rgba(92, 114, 88, 0.45);
        color: #d1c29a;
      }
      .lore-card.da-reu-phong-theme .lore-poem-box {
        background: rgba(20, 26, 21, 0.55);
        border-left: 4px solid #d9a441;
        color: #f6e4b5;
      }
      .lore-card.da-reu-phong-theme .lore-desc {
        color: #ede3ca;
      }
      .lore-card.da-reu-phong-theme .lore-card-footer {
        border-top-color: rgba(92, 114, 88, 0.42);
      }
      .lore-card.da-reu-phong-theme .lore-close-btn {
        background: linear-gradient(90deg, #b88224, #d9a441);
        color: #1c201c;
        box-shadow: 0 4px 14px rgba(217, 164, 65, 0.35);
      }

      /* 4. Phong cách Bản Khắc Đồng Cổ Đông Sơn / Giấy Dó cho hiện vật Phòng 101 */
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
        content: attr(data-badge);
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
      }
      .lore-card.dong-son-giay-do-theme .lore-title {
        color: #5c1d0c;
        text-shadow: 0 1px 0 rgba(255, 245, 210, 0.75);
      }
      .lore-card.dong-son-giay-do-theme .lore-subtitle {
        color: #6b3f16;
      }
      .lore-card.dong-son-giay-do-theme .lore-meta-pill {
        background: rgba(154, 52, 18, 0.10);
        border-color: rgba(154, 52, 18, 0.35);
        color: #7c2d12;
      }
      .lore-card.dong-son-giay-do-theme .lore-illustration-wrap {
        border-color: rgba(124, 77, 24, 0.45);
        background: rgba(124, 77, 24, 0.08);
      }
      .lore-card.dong-son-giay-do-theme .lore-illustration-caption {
        border-top-color: rgba(124, 77, 24, 0.24);
        color: #5c3114;
      }
      .lore-card.dong-son-giay-do-theme .lore-poem-box {
        background: rgba(124, 77, 24, 0.10);
        border-left: 4px solid #b45309;
        color: #3a1f0a;
      }
      .lore-card.dong-son-giay-do-theme .lore-desc {
        color: #2b180a;
      }
      .lore-card.dong-son-giay-do-theme .lore-card-footer {
        border-top-color: rgba(124, 77, 24, 0.25);
      }
      .lore-card.dong-son-giay-do-theme .lore-close-btn {
        background: linear-gradient(90deg, #9a3412, #c2410c);
        color: #fef3c7;
        box-shadow: 0 4px 14px rgba(154, 52, 18, 0.45);
      }

      /* 5. Phong cách Dải Lụa Trắng / Giấy Dó Huyền Ảo (lua_trang) */
      .lore-card.lua-trang-theme {
        background:
          radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.92), transparent 56%),
          radial-gradient(circle at 88% 85%, rgba(0, 255, 204, 0.10), transparent 52%),
          linear-gradient(155deg, #fcfaf4 0%, #f1ece0 52%, #e4dcc8 100%);
        border: 3px double #8a7f6b;
        box-shadow:
          0 24px 58px rgba(6, 12, 24, 0.82),
          0 0 34px rgba(147, 197, 253, 0.24),
          inset 0 0 36px rgba(255, 255, 255, 0.72),
          inset 0 0 0 1px rgba(29, 77, 89, 0.22);
        color: #1a2033;
      }
      .lore-card.lua-trang-theme::before {
        content: attr(data-badge);
        position: absolute;
        top: 16px;
        right: 22px;
        border: 2px solid #1d4d59;
        background: rgba(29, 77, 89, 0.08);
        color: #1d4d59;
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.4px;
        transform: rotate(-3deg);
      }
      .lore-card.lua-trang-theme .lore-room-tag {
        color: #1d4d59;
      }
      .lore-card.lua-trang-theme .lore-title {
        color: #13192b;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
      }
      .lore-card.lua-trang-theme .lore-subtitle {
        color: #434b63;
      }
      .lore-card.lua-trang-theme .lore-meta-pill {
        background: rgba(29, 77, 89, 0.09);
        border-color: rgba(29, 77, 89, 0.28);
        color: #173e48;
      }
      .lore-card.lua-trang-theme .lore-illustration-wrap {
        border-color: rgba(29, 77, 89, 0.35);
        background: rgba(19, 25, 43, 0.06);
      }
      .lore-card.lua-trang-theme .lore-illustration-caption {
        border-top-color: rgba(29, 77, 89, 0.18);
        color: #364158;
      }
      .lore-card.lua-trang-theme .lore-poem-box {
        background: linear-gradient(90deg, rgba(29, 77, 89, 0.09), rgba(255, 255, 255, 0.45));
        border-left: 4px solid #1d4d59;
        color: #192438;
        font-size: 17px;
      }
      .lore-card.lua-trang-theme .lore-desc {
        color: #1f273c;
      }
      .lore-card.lua-trang-theme .lore-card-footer {
        border-top-color: rgba(29, 77, 89, 0.22);
      }
      .lore-card.lua-trang-theme .lore-close-btn {
        background: linear-gradient(90deg, #1d4d59, #296a7a);
        color: #fcfaf4;
        box-shadow: 0 4px 14px rgba(29, 77, 89, 0.35);
      }

      /* 6. Phong cách Ngọc Bích Vĩ Dạ & Lụa Trắng Huế (ngoc_vi_da) */
      .lore-card.ngoc-vi-da-theme {
        background:
          radial-gradient(circle at 16% 12%, rgba(255, 255, 255, 0.94), transparent 56%),
          radial-gradient(circle at 86% 86%, rgba(16, 185, 129, 0.14), transparent 54%),
          linear-gradient(155deg, #f5fbf7 0%, #e4f3eb 52%, #cfe8dc 100%);
        border: 3px double #0f766e;
        box-shadow:
          0 24px 58px rgba(4, 24, 20, 0.80),
          0 0 36px rgba(52, 211, 153, 0.24),
          inset 0 0 38px rgba(255, 255, 255, 0.78),
          inset 0 0 0 1px rgba(15, 118, 110, 0.24);
        color: #112a22;
      }
      .lore-card.ngoc-vi-da-theme::before {
        content: attr(data-badge);
        position: absolute;
        top: 16px;
        right: 22px;
        border: 2px solid #0f766e;
        background: rgba(15, 118, 110, 0.09);
        color: #0f766e;
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.4px;
        transform: rotate(-3deg);
      }
      .lore-card.ngoc-vi-da-theme .lore-room-tag {
        color: #0f766e;
      }
      .lore-card.ngoc-vi-da-theme .lore-title {
        color: #0b3b30;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85);
      }
      .lore-card.ngoc-vi-da-theme .lore-subtitle {
        color: #2d5a4c;
      }
      .lore-card.ngoc-vi-da-theme .lore-meta-pill {
        background: rgba(15, 118, 110, 0.10);
        border-color: rgba(15, 118, 110, 0.30);
        color: #0d5c55;
      }
      .lore-card.ngoc-vi-da-theme .lore-illustration-wrap {
        border-color: rgba(15, 118, 110, 0.38);
        background: rgba(15, 42, 34, 0.06);
      }
      .lore-card.ngoc-vi-da-theme .lore-illustration-caption {
        border-top-color: rgba(15, 118, 110, 0.20);
        color: #264d41;
      }
      .lore-card.ngoc-vi-da-theme .lore-poem-box {
        background: linear-gradient(120deg, rgba(15, 118, 110, 0.10), rgba(255, 255, 255, 0.62));
        border-left: 4px solid #0f766e;
        color: #103329;
        font-family: "Palatino Linotype", "Book Antiqua", "Times New Roman", Georgia, serif;
        font-size: 17.5px;
        line-height: 1.66;
        letter-spacing: 0.2px;
      }
      .lore-card.ngoc-vi-da-theme .lore-desc {
        color: #16332b;
      }
      .lore-card.ngoc-vi-da-theme .lore-card-footer {
        border-top-color: rgba(15, 118, 110, 0.22);
      }
      .lore-card.ngoc-vi-da-theme .lore-close-btn {
        background: linear-gradient(90deg, #0f766e, #059669);
        color: #f4fbf7;
        box-shadow: 0 4px 14px rgba(15, 118, 110, 0.35);
      }
      .lore-poem-stanza {
        margin-bottom: 12px;
      }
      .lore-poem-stanza:last-child {
        margin-bottom: 0;
      }
      .lore-poem-stanza-label {
        font-family: "Segoe UI", sans-serif;
        font-size: 11px;
        font-weight: 700;
        font-style: normal;
        letter-spacing: 1.1px;
        text-transform: uppercase;
        opacity: 0.72;
        margin-bottom: 3px;
      }
      .lore-poem-quote {
        margin-top: 12px;
        padding-top: 9px;
        border-top: 1px dashed rgba(15, 118, 110, 0.32);
        font-family: "Segoe UI", sans-serif;
        font-size: 13px;
        font-style: italic;
        opacity: 0.88;
      }

      /* Khối 4 mục học thuật có cấu trúc cho Lore Card */
      .lore-sections-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        margin-top: 6px;
      }
      .lore-section-card {
        padding: 11px 14px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(253, 224, 71, 0.24);
      }
      .lore-card.lua-trang-theme .lore-section-card,
      .lore-card.ngoc-vi-da-theme .lore-section-card,
      .lore-card.giay-do-theme .lore-section-card {
        background: rgba(255, 255, 255, 0.62);
        border: 1px solid rgba(29, 77, 89, 0.22);
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
      }
      .lore-card.ngoc-vi-da-theme .lore-section-card {
        background: rgba(255, 255, 255, 0.72);
        border-color: rgba(15, 118, 110, 0.25);
      }
      .lore-card.giay-do-theme .lore-section-card {
        border-color: rgba(90, 57, 27, 0.25);
        background: rgba(255, 248, 229, 0.56);
      }
      .lore-section-heading {
        font-family: "Segoe UI", sans-serif;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.4px;
        margin-bottom: 5px;
        color: #fde047;
      }
      .lore-card.lua-trang-theme .lore-section-heading {
        color: #164450;
      }
      .lore-card.ngoc-vi-da-theme .lore-section-heading {
        color: #0f766e;
      }
      .lore-card.giay-do-theme .lore-section-heading {
        color: #7c2d12;
      }
      .lore-section-body {
        font-family: "Segoe UI", sans-serif;
        font-size: 14.2px;
        line-height: 1.62;
        margin: 0;
      }

      /* Hover prompt tinh tế khi đưa chuột / tâm ngắm vào Bảng Thông Tin 3D */
      #lore-hover-prompt {
        position: fixed;
        bottom: 66px;
        left: 50%;
        transform: translateX(-50%) translateY(8px);
        background: rgba(16, 12, 10, 0.90);
        color: #fef3c7;
        border: 1px solid rgba(253, 224, 71, 0.65);
        border-radius: 999px;
        padding: 7px 16px;
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
        pointer-events: none;
        z-index: 9995;
        opacity: 0;
        transition: opacity 0.18s ease, transform 0.18s ease;
        white-space: nowrap;
      }
      #lore-hover-prompt.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    `;
    document.head.appendChild(style);

    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'museum-lore-overlay';
    this.overlayEl.innerHTML = `
      <div class="lore-card" id="museum-lore-card" data-badge="BẢO TÀNG VĂN HỌC">
        <div class="lore-room-tag" id="lore-room"></div>
        <h2 class="lore-title" id="lore-title"></h2>
        <div class="lore-subtitle" id="lore-subtitle"></div>
        <div class="lore-meta-pills" id="lore-meta"></div>
        <div class="lore-illustration-wrap" id="lore-illustration-wrap">
          <img class="lore-illustration-img" id="lore-illustration-img" alt="Minh họa tác phẩm văn học" />
          <div class="lore-illustration-fallback" id="lore-illustration-fallback" style="display:none;"></div>
          <div class="lore-illustration-caption" id="lore-illustration-caption"></div>
        </div>
        <div class="lore-poem-box" id="lore-poem"></div>
        <div class="lore-desc" id="lore-desc"></div>
        <div class="lore-card-footer">
          <span class="lore-footer-hint">Nhấn ESC hoặc nút đóng để quay lại không gian trưng bày</span>
          <button class="lore-close-btn" id="lore-close-btn">Đóng thẻ [ESC]</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlayEl);

    if (!document.getElementById('lore-hover-prompt')) {
      const promptEl = document.createElement('div');
      promptEl.id = 'lore-hover-prompt';
      document.body.appendChild(promptEl);
      this.hoverPromptEl = promptEl;
    } else {
      this.hoverPromptEl = document.getElementById('lore-hover-prompt');
    }

    this.overlayEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === this.overlayEl || e.target.id === 'lore-close-btn') {
        this.hideLoreCard();
      }
    });
  }

  /**
   * Tra cứu dữ liệu tư liệu từ cả ARTIFACT_LORE_DATABASE và plaqueLoreSynthesis.js
   */
  _resolveLoreEntry(loreKey, extraMeta = {}) {
    if (!loreKey && !extraMeta?.roomId) return null;
    const key = loreKey ? String(loreKey).trim() : '';

    if (key && ARTIFACT_LORE_DATABASE[key]) {
      return ARTIFACT_LORE_DATABASE[key];
    }
    const synthDirect = key ? getSynthesizedPlaqueLore(key) : null;
    if (synthDirect) return synthDirect;

    if (key && PLAQUE_LORE_DATABASE[key]) return PLAQUE_LORE_DATABASE[key];
    if (key && SYNTHESIZED_ROOM_LORE[key]) return SYNTHESIZED_ROOM_LORE[key];

    if (extraMeta?.roomId) {
      return getSynthesizedPlaqueLore(extraMeta.roomId);
    }
    return null;
  }

  /**
   * Đăng ký một hiện vật hoặc Bảng Thông Tin 3D tương tác với Lore Key tương ứng
   */
  registerArtifact(object3D, loreKey) {
    if (!object3D) return;
    if (object3D.isLight || object3D.userData?.isPlaqueSpotLight === true || object3D.userData?.isLightTarget === true) {
      object3D.userData.ignoreRaycaster = true;
      return;
    }

    // Nếu truyền root của Information Plaque, tự động chuyển hướng sang plaqueProxy để không bật raycaster cho vỏ/đèn
    if (object3D.userData?.isInfoPlaqueRoot && object3D.userData?.plaqueProxy) {
      const proxy = object3D.userData.plaqueProxy;
      proxy.userData.loreKey = loreKey || proxy.userData.loreKey || object3D.userData.loreKey;
      proxy.userData.isPlaqueProxy = true;
      proxy.userData.isLoreArtifact = true;
      proxy.userData.ignoreRaycaster = false;
      if (!this.interactiveArtifacts.includes(proxy)) {
        this.interactiveArtifacts.push(proxy);
      }
      return;
    }

    object3D.userData.loreKey = loreKey || object3D.userData.loreKey;
    object3D.userData.isLoreArtifact = true;
    if (object3D.userData.ignoreRaycaster !== true) {
      object3D.userData.ignoreRaycaster = false;
    }

    object3D.traverse((child) => {
      if (child === object3D) return;
      if (
        child.isLight ||
        child.userData?.isPlaqueSpotLight === true ||
        child.userData?.isLightTarget === true ||
        child.userData?.ignoreRaycaster === true
      ) {
        child.userData.ignoreRaycaster = true;
        return;
      }
      if (child.isMesh) {
        child.userData.loreKey = loreKey || child.userData.loreKey;
        child.userData.isLoreArtifact = true;
        child.userData.ignoreRaycaster = false;
      }
    });

    if (!this.interactiveArtifacts.includes(object3D)) {
      this.interactiveArtifacts.push(object3D);
    }
  }

  unregisterArtifact(object3D) {
    if (!object3D || !Array.isArray(this.interactiveArtifacts)) return;
    const idx = this.interactiveArtifacts.indexOf(object3D);
    if (idx !== -1) {
      this.interactiveArtifacts.splice(idx, 1);
    }
  }

  showLoreCard(loreKey, extraMeta = {}) {
    const data = this._resolveLoreEntry(loreKey, extraMeta);
    if (!data || !this.overlayEl) return;

    const currentScene = typeof window !== 'undefined'
      ? (window.__app?.activeScene || window.__activeScene || null)
      : null;
    this._openedInScene = currentScene;

    const keyStr = String(loreKey || '');
    const inRealm = this._isInStoryRealm(extraMeta) || Boolean(
      extraMeta?.isRealmArtifact ||
      (extraMeta?.realm && extraMeta.realm !== 'museum') ||
      keyStr.includes('_realm') ||
      keyStr.startsWith('namxuong_realm_') ||
      keyStr.startsWith('nam_xuong_realm_') ||
      keyStr.startsWith('vida_realm_') ||
      (currentScene && typeof window !== 'undefined' && window.__app?.scene && currentScene !== window.__app.scene)
    );
    this._openedInRealm = inRealm;

    const camMgr = typeof window !== 'undefined' ? window.__museumCameraManager : null;
    const cam = this.camera || camMgr?.camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (inRealm && cam) {
      const fwd = new THREE.Vector3();
      cam.getWorldDirection(fwd);
      this._realmSavedCameraPose = {
        position: cam.position.clone(),
        target: cam.position.clone().addScaledVector(fwd, 4.5)
      };
    } else {
      this._realmSavedCameraPose = null;
    }

    if (typeof extraMeta?.onRestoreCamera === 'function') {
      this._pendingRestoreCamera = extraMeta.onRestoreCamera;
    }

    this._clearHoverFeedback();

    const rawTheme = extraMeta.styleTheme || data.styleTheme || 'default';
    const normTheme = rawTheme === 'dong_son_giay_do'
      ? 'dong_son_giay_do'
      : normalizePlaqueStyleTheme(rawTheme);

    const cardEl = document.getElementById('museum-lore-card');
    if (cardEl) {
      cardEl.classList.toggle('giay-do-theme', rawTheme === 'giay_do' || (data.styleTheme && normTheme === 'giay_do'));
      cardEl.classList.toggle('lua-trang-theme', rawTheme === 'lua_trang' || normTheme === 'lua_trang');
      cardEl.classList.toggle('ngoc-vi-da-theme', rawTheme === 'ngoc_vi_da' || normTheme === 'ngoc_vi_da');
      cardEl.classList.toggle('chieu-lua-theme', rawTheme === 'chieu_lua' || normTheme === 'lua_hoang_kim');
      cardEl.classList.toggle('lua-hoang-kim-theme', normTheme === 'lua_hoang_kim');
      cardEl.classList.toggle('da-reu-phong-theme', rawTheme === 'da_reu_phong' || normTheme === 'da_reu_phong');
      cardEl.classList.toggle('dong-son-giay-do-theme', rawTheme === 'dong_son_giay_do');

      const defaultBadge = rawTheme === 'giay_do'
        ? 'BẢN IN GIẤY DÓ'
        : (normTheme === 'ngoc_vi_da'
          ? 'NGỌC BÍCH • THƠ MỚI 1938'
          : (normTheme === 'lua_trang'
            ? 'DẢI LỤA TRẮNG • THẾ KỶ XVI'
            : (rawTheme === 'chieu_lua'
              ? 'THIÊN THƯ • 1077'
              : (rawTheme === 'dong_son_giay_do' ? 'ĐÔNG SƠN • PHÙ ĐỔNG' : 'BẢO TÀNG VĂN HỌC'))));
      cardEl.dataset.badge = String(data.badgeLabel || defaultBadge).normalize('NFC');
    }

    document.getElementById('lore-room').textContent = `◈ ${data.room || 'BẢO TÀNG VĂN HỌC VIỆT NAM'} ◈`;
    document.getElementById('lore-title').textContent = data.title || 'Tác phẩm Văn học';
    document.getElementById('lore-subtitle').textContent = data.subtitle || '';

    // Metadata pills (tác giả, niên đại, mã khu vực)
    const metaEl = document.getElementById('lore-meta');
    if (metaEl) {
      const pills = [];
      if (data.author) {
        pills.push(`✍️ ${data.author}${data.years ? ` (${data.years})` : ''}`);
      }
      if (data.publicationYear) {
        pills.push(`📅 ${data.publicationYear}`);
      }
      if (data.sectorCode) {
        pills.push(`🏛️ ${data.sectorCode}`);
      }
      metaEl.innerHTML = pills.map((p) => `<span class="lore-meta-pill">${p}</span>`).join('');
      metaEl.style.display = pills.length > 0 ? 'flex' : 'none';
    }

    // Khối ảnh minh họa di sản (Data URI SVG hoặc ảnh minh họa + fallback an toàn)
    const illWrap = document.getElementById('lore-illustration-wrap');
    const illImg = document.getElementById('lore-illustration-img');
    const illFallback = document.getElementById('lore-illustration-fallback');
    const illCaption = document.getElementById('lore-illustration-caption');
    if (illWrap && illImg && illFallback) {
      const fallbackSvg = generateHeritageIllustrationDataUri({
        id: data.roomId || data.id || loreKey || 'default',
        title: data.title || 'Di Sản Văn Học',
        styleTheme: rawTheme === 'dong_son_giay_do' ? 'da_reu_phong' : normTheme,
        badgeLabel: data.badgeLabel || 'BẢO TÀNG VĂN HỌC'
      });
      const primarySrc = data.illustrationUrl || fallbackSvg;
      illImg.style.display = 'block';
      illFallback.style.display = 'none';
      illImg.alt = data.illustrationCaption || `Minh họa ${data.title || 'tác phẩm'}`;

      illImg.onerror = () => {
        if (illImg.src !== fallbackSvg) {
          illImg.src = fallbackSvg;
          return;
        }
        illImg.style.display = 'none';
        illFallback.textContent = data.illustrationCaption || `◈ Tư liệu trưng bày: ${data.title || ''} ◈`;
        illFallback.style.display = 'block';
      };
      illImg.src = primarySrc;

      if (illCaption) {
        const cap = data.illustrationCaption || `Minh họa trưng bày: ${data.title || ''}`;
        illCaption.textContent = cap;
        illCaption.style.display = cap ? 'block' : 'none';
      }
      illWrap.style.display = 'block';
    }

    // Nguyên tác / Phiên âm / Dịch thơ / Dịch nghĩa / Trích đoạn
    const poemEl = document.getElementById('lore-poem');
    if (poemEl) {
      if (data.hanzi || data.phonetic || data.dichTho || data.dichNghia) {
        const hanziHtml = (data.hanzi || []).join('<br/>');
        const phoneticHtml = (data.phonetic || []).join('<br/>');
        const dichThoHtml = (data.dichTho || []).join('<br/>');
        poemEl.innerHTML = `
          <div class="chieu-lua-grid">
            ${hanziHtml ? `<div><div class="chieu-lua-sec-label">Nguyên tác chữ Hán</div><div class="chieu-lua-hanzi">${hanziHtml}</div></div>` : ''}
            ${phoneticHtml ? `<div><div class="chieu-lua-sec-label">Phiên âm Hán – Việt</div><div>${phoneticHtml}</div></div>` : ''}
          </div>
          ${dichThoHtml ? `<div style="margin-top: 10px;"><div class="chieu-lua-sec-label">Dịch thơ</div><div>${dichThoHtml}</div></div>` : ''}
          ${data.dichNghia ? `<div class="chieu-lua-meaning"><strong>Dịch nghĩa:</strong> ${data.dichNghia}</div>` : ''}
        `;
        poemEl.style.display = 'block';
      } else if (Array.isArray(data.poem) ? data.poem.length > 0 : Boolean(data.poem)) {
        const poemLines = Array.isArray(data.poem) ? data.poem : [String(data.poem || '')];
        const hasBlankSeparators = poemLines.some((line) => String(line || '').trim() === '');
        if (hasBlankSeparators) {
          const stanzas = [];
          let current = [];
          for (let i = 0; i < poemLines.length; i++) {
            const line = String(poemLines[i] || '');
            if (line.trim() === '') {
              if (current.length > 0) {
                stanzas.push(current);
                current = [];
              }
            } else {
              current.push(line);
            }
          }
          if (current.length > 0) stanzas.push(current);
          const stanzaHtml = stanzas.map((lines, idx) => `
            <div class="lore-poem-stanza">
              ${stanzas.length > 1 ? `<div class="lore-poem-stanza-label">Khổ ${idx + 1}</div>` : ''}
              <div>${lines.join('<br/>')}</div>
            </div>
          `).join('');
          poemEl.innerHTML = `${stanzaHtml}${data.quote ? `<div class="lore-poem-quote">${data.quote}</div>` : ''}`;
        } else {
          poemEl.innerHTML = `${poemLines.join('<br/>')}${data.quote ? `<div class="lore-poem-quote">${data.quote}</div>` : ''}`;
        }
        poemEl.style.display = 'block';
      } else {
        poemEl.innerHTML = '';
        poemEl.style.display = 'none';
      }
    }

    // Tư liệu nghiên cứu đầy đủ (4 phần học thuật nếu có) & Tiểu sử bối cảnh
    const descEl = document.getElementById('lore-desc');
    if (descEl) {
      if (Array.isArray(data.sections) && data.sections.length > 0) {
        const cardsHtml = data.sections.map((sec) => {
          const heading = sec.title || sec.heading || '';
          const body = sec.content || sec.body || '';
          return `
            <div class="lore-section-card">
              <div class="lore-section-heading">◈ ${heading}</div>
              <p class="lore-section-body">${body}</p>
            </div>
          `;
        }).join('');
        descEl.innerHTML = `<div class="lore-sections-grid">${cardsHtml}</div>`;
      } else {
        const parts = [];
        if (data.summary && data.researchText && data.summary !== data.researchText) {
          parts.push(`<p><strong>Khái quát:</strong> ${data.summary}</p>`);
        }
        const mainResearch = data.researchText || data.description || data.summary;
        if (mainResearch) {
          parts.push(`<p><strong>Tư liệu nghiên cứu:</strong> ${mainResearch}</p>`);
        }
        if (data.biography) {
          parts.push(`<p><strong>Tiểu sử &amp; Bối cảnh:</strong> ${data.biography}</p>`);
        }
        descEl.innerHTML = parts.join('');
      }
    }

    this.overlayEl.classList.add('active');
    this.isOpen = true;

    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  hideLoreCard({ restoreCamera = true } = {}) {
    if (!this.overlayEl) return;
    const wasOpen = this.isOpen;
    this.overlayEl.classList.remove('active');
    this.isOpen = false;
    this._clearHoverFeedback();

    const currentScene = typeof window !== 'undefined'
      ? (window.__app?.activeScene || window.__activeScene || null)
      : null;
    const sameScene = !this._openedInScene || !currentScene || this._openedInScene === currentScene;
    const restoreCb = this._pendingRestoreCamera;
    const wasInRealm = this._openedInRealm;
    const realmPose = this._realmSavedCameraPose;

    this._openedInScene = null;
    this._openedInRealm = false;
    this._realmSavedCameraPose = null;
    this._pendingRestoreCamera = null;

    const camMgr = typeof window !== 'undefined' ? window.__museumCameraManager : null;
    if (restoreCamera && sameScene) {
      if (typeof restoreCb === 'function') {
        try {
          restoreCb();
        } catch (_) {}
      }
      if (wasOpen || camMgr?._isPlaqueFocusActive || camMgr?.cameraController?.isFocusZooming) {
        // Trong cõi mở, kiểm tra _savedFocusState có hợp lệ không (tránh lệch tọa độ sang bảo tàng)
        if (wasInRealm && camMgr?._savedFocusState && camMgr.camera && realmPose) {
          const dist = camMgr._savedFocusState.position.distanceTo(camMgr.camera.position);
          if (dist > 45.0) {
            camMgr._savedFocusState.position.copy(realmPose.position);
            camMgr._savedFocusState.target.copy(realmPose.target);
          }
        }
        camMgr?.restoreFromFocus?.({ smooth: true, duration: 0.52 });
      } else if (wasInRealm && realmPose && camMgr?.camera) {
        if (typeof camMgr.setView === 'function') {
          camMgr.setView({ position: realmPose.position, target: realmPose.target }, false);
        }
      }
    } else {
      camMgr?.cameraController?.cancelFocusZoom?.(false);
      if (camMgr) {
        camMgr._savedFocusState = null;
        camMgr._isPlaqueFocusActive = false;
        camMgr._isRestoringFocus = false;
      }
    }

    // Đảm bảo không bị lệch floor height trong cõi mở sau khi đóng thẻ
    if (wasInRealm && camMgr?.camera) {
      const cam = camMgr.camera;
      if (typeof camMgr.cameraController?.getFloorHeightAt === 'function') {
        const fh = camMgr.cameraController.getFloorHeightAt(cam.position.x, cam.position.z);
        if (typeof fh === 'number' && !Number.isNaN(fh)) {
          const eyeH = camMgr.cameraController?.eyeHeight || 1.65;
          if (cam.position.y < fh + eyeH * 0.75) {
            cam.position.y = fh + eyeH;
          }
        }
      }
    }
  }

  _isInStoryRealm(meta = null) {
    if (meta?.realm && meta.realm !== 'museum') return true;
    if (meta?.isRealmArtifact) return true;
    const key = String(meta?.loreKey || '');
    if (
      key.includes('_realm') ||
      key.startsWith('namxuong_realm_') ||
      key.startsWith('nam_xuong_realm_') ||
      key.startsWith('vida_realm_')
    ) return true;
    if (typeof window === 'undefined') return false;
    const activeScene = window.__app?.activeScene || window.__activeScene || null;
    const mainScene = window.__app?.scene || window.__app?.mainScene || null;
    if (activeScene && mainScene && activeScene !== mainScene) return true;
    if (window.__namXuongScene && activeScene === window.__namXuongScene) return true;
    if (window.__dayThonViDaScene && activeScene === window.__dayThonViDaScene) return true;
    if (window.__storyRealmMode || window.__activeRealm || window.__currentStoryRealm) return true;
    const camMgr = window.__museumCameraManager;
    if (typeof camMgr?.cameraController?.floorHeightProvider === 'function') return true;
    return false;
  }

  _syncCameraTargetBeforeRealmFocus(camMgr, meta = null) {
    if (!camMgr?.camera) return;
    const inRealm = this._isInStoryRealm(meta);
    const cam = camMgr.camera;
    const ctrlTarget = camMgr.controls?.target;
    const isStaleTarget = Boolean(
      ctrlTarget &&
      (inRealm || camMgr.cameraController?.controls?.isLocked || ctrlTarget.distanceTo(cam.position) > 30.0)
    );

    if (!this.isOpen && (inRealm || isStaleTarget) && !camMgr._isPlaqueFocusActive) {
      camMgr._savedFocusState = null;
      camMgr._isRestoringFocus = false;
    }

    if (ctrlTarget && isStaleTarget) {
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      ctrlTarget.copy(cam.position).addScaledVector(dir, 4.5);
    }
  }

  _extractLoreMetadataFromHit(hitObj) {
    let curr = hitObj;
    let loreKey = null;
    let roomId = null;
    let styleTheme = null;
    let realm = null;
    let onFocusCamera = null;
    let onRestoreCamera = null;
    let isPlaque = false;
    let isArtifact3D = false;
    let isBookPortal = false;
    let isReturnPortal = false;
    let isRealmArtifact = false;
    let targetRoot = hitObj;

    while (curr) {
      if (curr.userData?.isPlaqueProxy) isPlaque = true;
      if (curr.userData?.isArtifact3D) isArtifact3D = true;
      if (curr.userData?.isBookPortal || curr.userData?.isTeleportBook) isBookPortal = true;
      if (curr.userData?.isReturnPortal) isReturnPortal = true;
      if (curr.userData?.isRealmArtifact || curr.userData?.realm) isRealmArtifact = true;
      if (!realm && curr.userData?.realm) realm = curr.userData.realm;
      if (!loreKey && curr.userData?.loreKey) {
        loreKey = curr.userData.loreKey;
        targetRoot = curr;
      }
      if (!roomId && curr.userData?.roomId) roomId = curr.userData.roomId;
      if (!styleTheme && curr.userData?.styleTheme) styleTheme = curr.userData.styleTheme;
      if (!onFocusCamera && typeof curr.userData?.onFocusCamera === 'function') {
        onFocusCamera = curr.userData.onFocusCamera;
      }
      if (!onRestoreCamera && typeof curr.userData?.onRestoreCamera === 'function') {
        onRestoreCamera = curr.userData.onRestoreCamera;
      }
      curr = curr.parent;
    }

    if (!isRealmArtifact && typeof loreKey === 'string' && loreKey.includes('_realm')) {
      isRealmArtifact = true;
    }

    return {
      loreKey,
      roomId,
      styleTheme,
      realm,
      onFocusCamera,
      onRestoreCamera,
      isPlaque,
      isArtifact3D,
      isBookPortal,
      isReturnPortal,
      isRealmArtifact,
      targetRoot
    };
  }

  _performLoreRaycast(maxDistance = 36) {
    const cam = this.camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return null;

    const activeScene = typeof window !== 'undefined'
      ? (window.__app?.activeScene || window.__activeScene || null)
      : null;
    const isSameActiveScene = (obj) => {
      if (!activeScene || !obj) return true;
      const objScene = getObjectRootScene(obj);
      return !objScene || objScene === activeScene;
    };

    this.raycaster.setFromCamera(this.mouse, cam);

    let proxyCandidate = null;
    if (typeof window !== 'undefined' && window.__museumHitboxManager?.raycastInteractiveHitboxes) {
      const hit = window.__museumHitboxManager.raycastInteractiveHitboxes(this.raycaster, maxDistance, {
        prioritizePlaques: true
      });
      if (
        hit &&
        hit.object &&
        !isObjectIgnoredByRaycaster(hit.object) &&
        isSameActiveScene(hit.object) &&
        (!hit.object.userData?.linkedVisualObject || isSameActiveScene(hit.object.userData.linkedVisualObject))
      ) {
        const meta = this._extractLoreMetadataFromHit(hit.object);
        // Không giành quyền click sách dịch chuyển (PortalInteraction) hoặc cổng thoát cõi truyện
        if ((meta.loreKey || meta.roomId) && !meta.isReturnPortal && !(meta.isBookPortal && !meta.isPlaque)) {
          proxyCandidate = { hit, meta };
        }
      }
    }

    // Nếu proxyHit là Bảng Thông Tin 3D -> ưu tiên tuyệt đối
    if (proxyCandidate?.meta?.isPlaque) {
      return proxyCandidate;
    }

    let artifactCandidate = null;
    if (this.interactiveArtifacts.length > 0) {
      const hits = this.raycaster.intersectObjects(this.interactiveArtifacts, true);
      let firstArtifact = null;
      let firstPlaqueArtifact = null;

      for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        if (!h || h.distance > maxDistance) continue;
        if (!isObjectHierarchyVisible(h.object)) continue;
        if (isObjectIgnoredByRaycaster(h.object)) continue;
        if (!isSameActiveScene(h.object)) continue;

        const meta = this._extractLoreMetadataFromHit(h.object);
        if (!meta.loreKey && !meta.roomId) continue;
        if (meta.isReturnPortal) continue;
        if (meta.isBookPortal && !meta.isPlaque) continue;

        if (!firstArtifact) firstArtifact = { hit: h, meta };
        if (meta.isPlaque) {
          firstPlaqueArtifact = { hit: h, meta };
          break;
        }
      }

      if (firstPlaqueArtifact && (!firstArtifact || firstPlaqueArtifact.hit.distance <= firstArtifact.hit.distance + 0.55)) {
        artifactCandidate = firstPlaqueArtifact;
      } else {
        artifactCandidate = firstArtifact;
      }
    }

    if (artifactCandidate?.meta?.isPlaque) {
      if (!proxyCandidate || artifactCandidate.hit.distance <= proxyCandidate.hit.distance + 0.55) {
        return artifactCandidate;
      }
    }
    if (proxyCandidate && artifactCandidate) {
      return proxyCandidate.hit.distance <= artifactCandidate.hit.distance ? proxyCandidate : artifactCandidate;
    }
    return proxyCandidate || artifactCandidate || null;
  }

  _clearHoverFeedback() {
    if (this._isHoveringPlaque && typeof document !== 'undefined') {
      const canvas = document.querySelector('canvas');
      if (canvas && canvas.style.cursor === 'pointer') {
        canvas.style.cursor = '';
      }
      if (document.body.style.cursor === 'pointer') {
        document.body.style.cursor = '';
      }
    }
    this._hoveredTarget = null;
    this._isHoveringPlaque = false;
    if (this.hoverPromptEl) {
      this.hoverPromptEl.classList.remove('visible');
    }
  }

  _updateHoverFeedback() {
    if (typeof document === 'undefined' || this.isOpen) {
      this._clearHoverFeedback();
      return;
    }

    const candidate = this._performLoreRaycast(28);
    if (!candidate) {
      this._clearHoverFeedback();
      return;
    }

    const { hit, meta } = candidate;
    const keyStr = String(meta.loreKey || '');
    const isPlaque =
      meta.isPlaque ||
      meta.isArtifact3D ||
      meta.isRealmArtifact ||
      Boolean(meta.realm) ||
      keyStr.startsWith('plaque_') ||
      keyStr.startsWith('nam_xuong_') ||
      keyStr.startsWith('vida_') ||
      keyStr.includes('_realm');
    if (!isPlaque || meta.isReturnPortal) {
      this._clearHoverFeedback();
      return;
    }

    this._hoveredTarget = hit.object;
    this._isHoveringPlaque = true;

    if (!document.pointerLockElement) {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.style.cursor = 'pointer';
    }

    if (this.hoverPromptEl) {
      const entry = this._resolveLoreEntry(meta.loreKey, { roomId: meta.roomId });
      const titleText = entry?.title || 'Bảng Thông Tin Tác Phẩm';
      this.hoverPromptEl.textContent = `📜 Click để đọc tư liệu: ${titleText}`;
      this.hoverPromptEl.classList.add('visible');
    }
  }

  updateHover() {
    if (typeof document === 'undefined' || this.isOpen) return;
    if (!document.pointerLockElement) return;
    const now = performance.now();
    if (now - this._lastHoverRaycastMs < 90) return;
    this._lastHoverRaycastMs = now;
    this.mouse.set(0, 0);
    this._updateHoverFeedback();
  }

  _bindEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('pointermove', (e) => {
      if (this.isOpen) return;
      const now = performance.now();
      if (now - this._lastHoverRaycastMs < 55) return;
      this._lastHoverRaycastMs = now;

      if (document.pointerLockElement) {
        this.mouse.set(0, 0);
      } else {
        const canvas = document.querySelector('canvas');
        const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth || 1, height: window.innerHeight || 1 };
        this.mouse.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
      }
      this._updateHoverFeedback();
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const hasProxies = Boolean(window.__museumHitboxManager?.clickProxies?.length);
      if (this.isOpen || (this.interactiveArtifacts.length === 0 && !hasProxies)) return;
      if (e.target.closest('#museum-lore-overlay, #director-hud, [id*="realm-hud"], [id*="realm-top-hud"], [id*="tour-banner"]')) return;

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

      const candidate = this._performLoreRaycast(36);
      if (!candidate) return;

      const { hit, meta } = candidate;
      const resolvedKey = meta.loreKey || (meta.roomId ? `plaque_${meta.roomId}` : null);
      if (!resolvedKey) return;

      e.stopPropagation();

      const keyStr = String(resolvedKey || '');
      const camMgr = window.__museumCameraManager;
      const isRealmCtx = this._isInStoryRealm(meta) || keyStr.includes('_realm') || keyStr.startsWith('namxuong_realm_') || keyStr.startsWith('nam_xuong_realm_');
      if (camMgr) {
        this._syncCameraTargetBeforeRealmFocus(camMgr, meta);
      }

      let customRestore = meta.onRestoreCamera || null;
      if (typeof meta.onFocusCamera === 'function') {
        const ret = meta.onFocusCamera(hit.object, { camMgr, hit, meta });
        if (!customRestore && typeof ret === 'function') {
          customRestore = ret;
        }
      } else if (
        meta.isPlaque ||
        meta.isArtifact3D ||
        isRealmCtx ||
        hit.object?.userData?.focusPoint ||
        hit.object?.userData?.linkedVisualObject?.userData?.isInfoPlaqueRoot ||
        keyStr.startsWith('vida_') ||
        keyStr.startsWith('nam_xuong_') ||
        keyStr.startsWith('namxuong_')
      ) {
        if (camMgr) {
          if (isRealmCtx && typeof camMgr.computeObjectFocusPose === 'function') {
            const pose = camMgr.computeObjectFocusPose(hit.object, {
              approachFromCamera: true,
              distance: hit.object?.userData?.focusDistance ?? (meta.isPlaque ? 2.25 : 3.2)
            });
            if (pose) {
              const floorY = camMgr.cameraController?.getFloorHeightAt?.(pose.position.x, pose.position.z);
              if (typeof floorY === 'number' && !Number.isNaN(floorY)) {
                pose.position.y = Math.max(pose.position.y, floorY + 1.15);
              }
              camMgr.smoothZoomToFocus?.(pose.position, pose.target, { duration: 0.72 });
            } else {
              camMgr.smoothZoomToFocus?.(hit.object, { duration: 0.72, approachFromCamera: true });
            }
          } else {
            camMgr.smoothZoomToFocus?.(hit.object, { duration: 0.72 });
          }
        }
      }

      this.showLoreCard(resolvedKey, {
        roomId: meta.roomId,
        styleTheme: meta.styleTheme,
        realm: meta.realm,
        isRealmArtifact: isRealmCtx,
        onRestoreCamera: customRestore
      });
    }, true); // Bắt ở capture phase để xử lý trước khi camera xoay

    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.code === 'Escape') && this.isOpen) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        this.hideLoreCard();
      }
    }, true);
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
  markerGroup.userData.ignoreRaycaster = true;
  markerGroup.traverse((c) => {
    c.userData.ignoreRaycaster = true;
  });
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
  rayLine.userData.ignoreRaycaster = true;
  controller.add(rayLine);

  if (scene) {
    scene.add(controller);
  } else if (cameraRig) {
    cameraRig.add(controller);
  }

  const vrRaycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const worldNormal = new THREE.Vector3();
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
  const extraWalkableFloors = new Set();

  const isHitWalkableSurface = (hit) => {
    if (!hit || !hit.object || hit.distance > 25) return false;
    if (!isObjectHierarchyVisible(hit.object)) return false;
    if (isObjectIgnoredByRaycaster(hit.object)) return false;

    if (hit.face?.normal) {
      normalMatrix.getNormalMatrix(hit.object.matrixWorld);
      worldNormal.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize();
      if (worldNormal.y < 0.55) return false;
    }

    let curr = hit.object;
    let isExplicitWalkable = false;
    let isInsideNamXuong = false;
    let isInsideViDa = false;
    while (curr) {
      const ud = curr.userData || {};
      if (ud.isTeleportBlocked === true || ud.isWater === true || ud.isParticle === true) {
        return false;
      }
      if (
        ud.isNamXuongWalkable === true ||
        ud.isViDaWalkable === true ||
        ud.isTeleportFloor === true ||
        ud.isWalkableFloor === true
      ) {
        isExplicitWalkable = true;
      }
      if (
        ud.isNamXuongRoom === true ||
        ud.roomId === 'nguoi_con_gai_nam_xuong' ||
        /namxuong/i.test(curr.name || '')
      ) {
        isInsideNamXuong = true;
      }
      if (
        ud.isViDaRoom === true ||
        ud.isDayThonViDaRoom === true ||
        ud.roomId === 'day_thon_vi_da' ||
        /daythonvida|vi_da|vida/i.test(curr.name || '')
      ) {
        isInsideViDa = true;
      }
      curr = curr.parent;
    }

    if ((isInsideNamXuong || isInsideViDa) && !isExplicitWalkable) return false;
    return true;
  };

  const updateVRTeleport = () => {
    const targets = extraWalkableFloors.size > 0
      ? [...currentWalkableFloors, ...extraWalkableFloors]
      : currentWalkableFloors;
    if (!renderer.xr.isPresenting || targets.length === 0) {
      markerGroup.visible = false;
      return;
    }

    tempMatrix.identity().extractRotation(controller.matrixWorld);
    vrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    vrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const hits = vrRaycaster.intersectObjects(targets, true);
    let bestHit = null;
    for (let i = 0; i < hits.length; i++) {
      if (isHitWalkableSurface(hits[i])) {
        bestHit = hits[i];
        break;
      }
    }

    if (bestHit) {
      validTargetPoint = bestHit.point;
      markerGroup.position.copy(validTargetPoint);
      markerGroup.visible = true;
    } else {
      validTargetPoint = null;
      markerGroup.visible = false;
    }
  };

  const addWalkableFloor = (obj) => {
    if (!obj) return;
    if (!currentWalkableFloors.includes(obj)) {
      extraWalkableFloors.add(obj);
    }
  };

  const removeWalkableFloor = (obj) => {
    if (!obj) return;
    extraWalkableFloors.delete(obj);
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

  return {
    controller,
    markerGroup,
    updateVRTeleport,
    setTargetContext,
    addWalkableFloor,
    removeWalkableFloor
  };
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
      loreGuide?.updateHover?.();
    }
  };

  if (typeof window !== 'undefined') {
    window.__museumImmersion = immersion;
    window.__spatialAudio = spatialAudio;
    window.__loreGuide = loreGuide;
  }

  return immersion;
}
