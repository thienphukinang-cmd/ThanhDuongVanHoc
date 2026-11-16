// hienThuCacLoreAndAudio.js — Lore, Camera & Soundscape System cho Hiên Thư Các (Tầng 2)
// Phục vụ: 6 Cuốn Sách Tuyển Tập Tinh Hoa Văn Học • Lore Overlay Cổ Phong • Web Audio Đàn Tranh & Lật Trang • Camera Focus
// Tác giả: Mèo Trắng Đào Nương (trangdaonuong)

import * as THREE from 'three';

/**
 * Tự vá lỗi & chuẩn hóa hình khối Three.js (chuẩn AGENTS.md / GEMINI.md)
 */
function prepGeo(geo) {
  if (!geo) return geo;
  try {
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    const posAttr = geo.attributes?.position;
    if (posAttr) {
      const arr = posAttr.array;
      const len = posAttr.count * posAttr.itemSize;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      posAttr.needsUpdate = true;
    }
    const normAttr = geo.attributes?.normal;
    if (normAttr) {
      const arr = normAttr.array;
      const len = normAttr.count * normAttr.itemSize;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      normAttr.needsUpdate = true;
    }
  } catch (_) {}
  return geo;
}

/**
 * CƠ SỞ DỮ LIỆU 6 CUỐN SÁCH "TUYỂN TẬP TINH HOA VĂN HỌC ĐẠI VIỆT"
 */
export const HIEN_THU_CAC_BOOKS = [
  {
    id: 'nam_quoc_son_ha',
    title: 'Nam Quốc Sơn Hà',
    subtitle: 'Bản Tuyên Ngôn Độc Lập Đầu Tiên Của Dân Tộc',
    author: 'Thái úy Lý Thường Kiệt',
    period: 'Triều Lý (1077)',
    location: 'Phòng tuyến Sông Như Nguyệt',
    coverColor: 0x8b1e1e, // Đỏ chu sa
    badgeColor: '#e11d48',
    category: 'Tuyên Ngôn Khởi Nguyên',
    originalExcerpt: `南國山河南帝居
截然定分在天書
如何逆虜來侵犯
汝等行看取敗虛`,
    transliteration: `Nam quốc sơn hà Nam đế cư,
Tiệt nhiên định phận tại thiên thư.
Như hà nghịch lỗ lai xâm phạm,
Nhữ đẳng hành khan thủ bại hư.`,
    poeticTranslation: `Sông núi nước Nam vua Nam ở,
Rành rành định phận tại sách trời.
Cớ sao lũ giặc sang xâm phạm,
Chúng bay sẽ bị đánh tơi bời!`,
    commentary: `Vào đêm mùa xuân năm Đinh Tỵ (1077), khi quân Tống do Quách Quỳ chỉ huy đang giằng co quyết liệt bên bờ bắc sông Như Nguyệt, bài thơ thần đã vang lên từ đền thờ Trương Hống, Trương Hát. Lời thơ sấm truyền khẳng định chủ quyền lãnh thổ là ý trời bất khả xâm phạm, thức tỉnh sĩ khí ba quân, đập tan mộng bành trướng của đế chế phong kiến phương Bắc, mở ra kỷ nguyên độc lập tự chủ rực rỡ của Đại Việt.`,
    readingQuestions: [
      { q: 'Tại sao lại dùng chữ "Nam đế cư" thay vì "Nam vương"?', a: 'Chữ "Đế" đặt ngang hàng với Hoàng đế phương Bắc, khẳng định Đại Việt là một đế quốc độc lập có thiên mệnh riêng, xóa bỏ tư duy thần phục phiên thuộc.' },
      { q: 'Cụm từ "Thiên thư" mang hàm ý gì?', a: 'Là sách trời, biểu tượng cho quy luật tự nhiên và công lý vũ trụ. Xâm phạm non sông nước Nam là đi ngược lại đạo trời tất chuốc lấy bại vong.' }
    ]
  },
  {
    id: 'hich_tuong_si',
    title: 'Hịch Tướng Sĩ (Dụ Chư Tỳ Tướng Hịch Văn)',
    subtitle: 'Thiên Hùng Văn Kết Tinh Hào Khí Đông A',
    author: 'Tiết chế Quốc công Trần Hưng Đạo',
    period: 'Triều Trần (1284)',
    location: 'Kinh thành Thăng Long',
    coverColor: 0x1e3a8a, // Lam sẫm triều đình
    badgeColor: '#2563eb',
    category: 'Hào Khí Quân Sự',
    originalExcerpt: `余常聞之：紀信以身代死而脫高帝，
由余以背受戈而蔽昭王...
我常臨食忘餐，中夜撫枕；涕泗交橫，心肝如割；
常慨未得食肉寢皮，茹血吞肝。
雖百骸委於荒草，千裹於馬革，吾亦甘心焉！`,
    transliteration: `Dư thường văn chi: Kỷ Tín dĩ thân đại tử nhi thoát Cao Đế,
Do Vu dĩ bối thụ qua nhi tế Chiêu Vương...
Ngã thường lâm thực vong xan, trung dạ phủ chẩm; thế tứ giao hoành, tâm can như cát;
Thường khái vị đắc thực nhục tẩm bì, nhự huyết thôn can.
Tuy bách hài ủy ư hoang thảo, thiên quả ư mã cách, ngô diệc cam tâm yên!`,
    poeticTranslation: `Ta thường nghe: Kỷ Tín đem mình chết thay, cứu thoát cho Cao Đế; Do Vu chìa lưng chịu giáo, che chở cho Chiêu Vương...
Ta thường tới bữa quên ăn, nửa đêm vỗ gối; ruột đau như cắt, nước mắt đầm đìa; chỉ căm tức chưa xả thịt lột da, nuốt gan uống máu quân thù.
Dẫu cho trăm thân này phơi ngoài nội cỏ, nghìn xác này gói trong da ngựa, ta cũng vui lòng...`,
    commentary: `Bản hịch văn bất hủ ra đời trước cuộc kháng chiến chống quân Nguyên Mông lần thứ hai (1285). Bằng ngòi bút sắc bén như gươm giáo và tấm lòng trung liệt cháy bỏng, Hưng Đạo Đại Vương đã đánh thức lòng tự trọng, tinh thần trách nhiệm và lòng yêu nước thiêng liêng của toàn thể tướng sĩ, thổi bùng lên ngọn lửa Hào khí Đông A ba lần quét sạch vó ngựa bách chiến bách thắng của đế quốc Mông Cổ.`,
    readingQuestions: [
      { q: 'Ý nghĩa của hình tượng "Trăm thân phơi nội cỏ, nghìn xác bọc da ngựa"?', a: 'Thể hiện khí phách xả thân vì nghĩa lớn của bậc danh tướng: xem nhẹ cái chết cá nhân trước sự tồn vong của xã tắc non sông.' },
      { q: 'Nghệ thuật tương phản được sử dụng ra sao trong bản hịch?', a: 'Tác giả đối lập sâu sắc giữa sự hy sinh của các bậc trung thần nghĩa sĩ với lối sống an nhàn hưởng lạc cầu an của một bộ phận tướng lĩnh, từ đó thức tỉnh lương tri của họ.' }
    ]
  },
  {
    id: 'bach_dang_giang_phu',
    title: 'Bạch Đằng Giang Phú',
    subtitle: 'Khúc Hùng Ca Tráng Lệ Trên Cửa Sông Lịch Sử',
    author: 'Hàn lâm Học sĩ Trương Hán Siêu',
    period: 'Triều Trần (Thế kỷ XIV)',
    location: 'Sông Bạch Đằng',
    coverColor: 0x0f766e, // Xanh ngọc bích sông nước
    badgeColor: '#0d9488',
    category: 'Phú Cổ Điển',
    originalExcerpt: `客有：張帆乘風，浪浪追月。
朝發艅艎兮沅湘，暮宿浩蕩兮武穴...
白藤江兮泱泱，波浩蕩兮流長。
此江之所以名，乃千載之戰場！`,
    transliteration: `Khách hữu: Trương phàm thừa phong, lãng lãng truy nguyệt.
Triêu phát dư hoàng hề Nguyên Tương, mộ túc hạo đãng hề Vũ Huyệt...
Bạch Đằng giang hề ương ương, ba hạo đãng hề lưu trường.
Thử giang chi sở dĩ danh, nãi thiên tải chi chiến trường!`,
    poeticTranslation: `Khách có kẻ:
Giương buồm giong gió chơi vơi,
Lướt bể chơi trăng mải miết.
Sớm gõ thuyền chừ Nguyên Tương,
Chiều ngao du chừ Vũ Huyệt...
Sông Bạch Đằng cuồn cuộn sóng trào,
Bến bờ lịch sử muôn thuở nghìn thu.
Chiến tích xưa còn vang dội muôn cõi,
Non sông hiểm trở cốt ở đức cao!`,
    commentary: `Trương Hán Siêu đứng trước dòng sông Bạch Đằng lịch sử — nơi từng vùi xác quân Nam Hán của Ngô Quyền và đạo thủy binh Ô Mã Nhi triều Nguyên — để hoài niệm về những trang sử oanh liệt. Kết luận sâu sắc nhất của áng phú đúc kết chân lý muôn đời: non sông hiểm yếu là do trời đất tạo tác, nhưng thắng bại trường tồn của quốc gia cốt ở đạo đức và lòng dân.`,
    readingQuestions: [
      { q: 'Câu văn đúc kết triết lý cốt lõi của áng phú là gì?', a: '"Quả dĩ quan hề hà hiểm, duy đức hề thị ỷ" — Non sông hiểm trở thực là che chở, nhưng chỉ có đức lớn của con người mới là chỗ dựa muôn đời.' },
      { q: 'Tâm thế của nhân vật "Khách" trong bài phú?', a: 'Tâm hồn phóng khoáng, say mê cảnh sắc non sông đất nước và mang nỗi trăn trở sâu xa trước thời cuộc và lịch sử.' }
    ]
  },
  {
    id: 'binh_ngo_dai_cao',
    title: 'Bình Ngô Đại Cáo',
    subtitle: 'Bản Tuyên Ngôn Thiên Cổ Hùng Văn Nhân Nghĩa',
    author: 'Danh nhân Văn hóa Thế giới Nguyễn Trãi',
    period: 'Hậu Lê (1428)',
    location: 'Đông Đô (Thăng Long)',
    coverColor: 0xb45309, // Vàng nâu cổ phong
    badgeColor: '#d97706',
    category: 'Thiên Cổ Hùng Văn',
    originalExcerpt: `蓋聞：仁義之舉，要在于安民；
吊伐之師，莫先于去暴。
惟我大越之國，素稱文獻之邦。
山川之封域既殊，南北之風俗亦異。
自趙丁李陳之肇造我國，
與漢唐宋元而各帝一方。`,
    transliteration: `Cái văn: Nhân nghĩa chi cử, yếu tại vu an dân;
Điếu phạt chi sư, mạc tiên vu khử bạo.
Duy ngã Đại Việt chi quốc, tố xưng văn hiến chi bang.
Sơn xuyên chi phong vực ký thù, Nam Bắc chi phong tục diệc dị.
Tự Triệu, Đinh, Lý, Trần chi triệu tạo ngã quốc,
Dữ Hán, Đường, Tống, Nguyên nhi các đế nhất phương.`,
    poeticTranslation: `Từng nghe:
Việc nhân nghĩa cốt ở yên dân,
Quân điếu phạt trước lo trừ bạo.
Như nước Đại Việt ta từ trước,
Vốn xưng nền văn hiến đã lâu.
Núi sông bờ cõi đã chia,
Phong tục Bắc Nam cũng khác.
Từ Triệu, Đinh, Lý, Trần bao đời gây nền độc lập,
Cùng Hán, Đường, Tống, Nguyên mỗi bên xưng đế một phương...`,
    commentary: `Thay lời Bình Định Vương Lê Lợi sau chiến thắng giặc Minh xâm lược (1427), Nguyễn Trãi đã chấp bút nên bản cáo trạng đanh thép và bản tuyên ngôn độc lập thứ hai của nước Việt. Tác phẩm đặt tư tưởng "Nhân nghĩa an dân" làm kim chỉ nam, khẳng định Đại Việt là một thực thể độc lập có bề dày văn hiến, phong tục, lãnh thổ và lịch sử sánh ngang cùng các triều đại phong kiến phương Bắc.`,
    readingQuestions: [
      { q: 'Tư tưởng "Nhân nghĩa" của Nguyễn Trãi có điểm gì tiến bộ vượt bậc?', a: 'Nhân nghĩa không dừng lại ở đạo lý Nho gia trừu tượng mà gắn liền với "An dân" (lo cho cuộc sống của nhân dân) và "Trừ bạo" (đánh đuổi giặc ngoại xâm tàn bạo).' },
      { q: 'Các yếu tố cấu thành chủ quyền quốc gia được nêu trong bài?', a: 'Gồm 5 yếu tố cốt lõi: Nền văn hiến lâu đời, Cương vực lãnh thổ riêng, Phong tục tập quán độc đáo, Lịch sử các triều đại độc lập và Những anh hùng hào kiệt đời nào cũng có.' }
    ]
  },
  {
    id: 'truyen_kieu',
    title: 'Đoạn Trường Tân Thanh (Truyện Kiều)',
    subtitle: 'Đỉnh Cao Thi Ca & Tiếng Kêu Thương Thân Phận Con Người',
    author: 'Đại thi hào Dân tộc Nguyễn Du',
    period: 'Triều Nguyễn (Đầu thế kỷ XIX)',
    location: 'Bắc Thành - Nghi Xuân (Hà Tĩnh)',
    coverColor: 0x4c1d95, // Tím mực nho sinh
    badgeColor: '#7c3aed',
    category: 'Kiệt Tác Thi Ca',
    originalExcerpt: `Trăm năm trong cõi người ta,
Chữ tài chữ mệnh khéo là ghét nhau.
Trải qua một cuộc bể dâu,
Những điều trông thấy mà đau đớn lòng.
Lạ gì bỉ sắc tư phong,
Trời xanh quen thói má hồng đánh ghen...`,
    transliteration: `Làn thu thủy nét xuân sơn,
Hoa ghen thua thắm liễu hờn kém xanh.
Một hai nghiêng nước nghiêng thành,
Sắc đành đòi một tài đành họa hai.
Thông minh vốn sẵn tính trời,
Pha nghề thi họa đủ mùi ca ngâm.
Cung thương lầu bậc ngũ âm,
Nghề riêng ăn đứt hồ cầm một trương...`,
    poeticTranslation: `Thiện căn ở tại lòng ta,
Chữ tâm kia mới bằng ba chữ tài.
Lời quê chắp nhặt dông dài,
Mua vui cũng được một vài trống canh.`,
    commentary: `Kiệt tác 3254 câu thơ lục bát của Nguyễn Du là viên ngọc sáng nhất của thi ca dân tộc, được dịch ra hơn 30 thứ tiếng trên thế giới. Tác phẩm là tiếng kêu đứt ruột xót thương cho thân phận người phụ nữ tài sắc trong xã hội phong kiến, đồng thời cất lên tiếng nói tố cáo thế lực đồng tiền tàn bạo, ngợi ca khát vọng tình yêu tự do và niềm tin bất diệt vào chữ "Tâm" nhân ái.`,
    readingQuestions: [
      { q: 'Cặp phạm trù "Tài" và "Mệnh" được Nguyễn Du lý giải thế nào?', a: 'Là bi kịch hiện sinh của kiếp người tài hoa nhưng bất hạnh trong xã hội tao loạn; song cuối cùng tác phẩm đề cao chữ "Tâm" như cội nguồn giải thoát mọi oan khổ.' },
      { q: 'Đóng góp lớn nhất của Truyện Kiều đối với tiếng Việt là gì?', a: 'Nâng thể thơ Lục bát dân gian lên tầm nghệ thuật kinh điển, làm giàu có vốn từ ngữ, ngữ điệu và sức biểu cảm uyển chuyển của ngôn ngữ dân tộc.' }
    ]
  },
  {
    id: 'tuyen_ngon_doc_lap',
    title: 'Tuyên Ngôn Độc Lập (1945)',
    subtitle: 'Bản Tuyên Ngôn Khai Sinh Nước Việt Nam Dân Chủ Cộng Hòa',
    author: 'Chủ tịch Hồ Chí Minh',
    period: 'Ngày 2 tháng 9 năm 1945',
    location: 'Quảng trường Ba Đình, Hà Nội',
    coverColor: 0x854d0e, // Vàng sao son đỏ
    badgeColor: '#ca8a04',
    category: 'Văn Kiện Thời Đại Mới',
    originalExcerpt: `“Tất cả mọi người đều sinh ra có quyền bình đẳng. Tạo hóa cho họ những quyền không ai có thể xâm phạm được; trong những quyền ấy, có quyền được sống, quyền tự do và quyền mưu cầu hạnh phúc.”
Lời bất hủ ấy ở trong bản Tuyên ngôn Độc lập năm 1776 của nước Mỹ. Suy rộng ra, câu ấy có ý nghĩa là: tất cả các dân tộc trên thế giới đều sinh ra bình đẳng, dân tộc nào cũng có quyền sống, quyền sung sướng và quyền tự do.`,
    transliteration: `Bản Tuyên ngôn Nhân quyền và Dân quyền của Cách mạng Pháp năm 1791 cũng nói:
“Người ta sinh ra tự do và bình đẳng về quyền lợi; và phải luôn luôn được tự do và bình đẳng về quyền lợi.”
Đó là những lẽ phải không ai chối cãi được.`,
    poeticTranslation: `“Nước Việt Nam có quyền hưởng tự do và độc lập, và sự thật đã thành một nước tự do độc lập.
Toàn thể dân tộc Việt Nam quyết đem tất cả tinh thần và lực lượng, tính mạng và của cải để giữ vững quyền tự do, độc lập ấy!”`,
    commentary: `Tại Quảng trường Ba Đình lịch sử vào ngày 2/9/1945, Bản Tuyên Ngôn Độc Lập đã được Chủ tịch Hồ Chí Minh đọc trước quốc dân đồng bào và toàn thế giới. Bằng lập luận chặt chẽ, chứng cứ lịch sử không thể chối cãi và ngôn từ đanh thép, bản tuyên ngôn đã chấm dứt hơn 80 năm ách đô hộ của thực dân Pháp và hàng nghìn năm chế độ phong kiến, mở ra kỷ nguyên độc lập dân tộc gắn liền với tự do, hạnh phúc.`,
    readingQuestions: [
      { q: 'Nghệ thuật viện dẫn 2 bản Tuyên ngôn của Mỹ và Pháp có ý nghĩa gì?', a: 'Tạo cơ sở pháp lý quốc tế vững chắc, dùng chính lý tưởng nhân quyền của phương Tây để bảo vệ quyền tự do thiêng liêng của dân tộc Việt Nam.' },
      { q: 'Khái niệm "Quyền dân tộc tự quyết" được phát triển thế nào?', a: 'Từ "Quyền con người" của cá nhân, Hồ Chí Minh đã nâng lên thành "Quyền độc lập của cả một dân tộc", đóng góp to lớn cho phong trào giải phóng thuộc địa trên toàn cầu.' }
    ]
  }
];

/**
 * BỘ TỔNG HỢP ÂM THANH PROCEDURAL WEB AUDIO (HIEN THU CAC SOUNDSCAPE)
 * Bao gồm: Tiếng lật trang sách (page flip), tiếng rót trà nóng, tiếng chuông đàn tranh ngũ cung
 */
class HienThuCacAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.ambientGain = null;
    this.isAmbientPlaying = false;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    } catch (_) {}
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Phát tiếng lật trang giấy xào xạc chân thực (Realistic Crisp Page-Flip SFX)
   */
  playPageFlipSound() {
    this.resume();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.22;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Tạo tiếng ồn giấy sột soạt tự nhiên
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      // Bộ lọc dải thông quét tần số mô phỏng nếp giấy cong lật qua
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2600, t);
      filter.frequency.exponentialRampToValueAtTime(750, t + 0.18);
      filter.Q.setValueAtTime(3.2, t);

      // Envelope âm lượng
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.21);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(t);
      whiteNoise.stop(t + 0.22);
    } catch (_) {}
  }

  /**
   * Phát tiếng rót trà sứ thanh tao (Delicate Porcelain Tea Pour SFX)
   */
  playTeaPourSound() {
    this.resume();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, t);
      osc.frequency.exponentialRampToValueAtTime(1820, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.28);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.32);
    } catch (_) {}
  }

  /**
   * Khúc đàn tranh gảy ngũ cung thanh nhã (Pentatonic Zither Chime)
   */
  playMelodicPluck(scaleIndex = 0) {
    this.resume();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Thang âm ngũ cung Hò - Xự - Xang - Xê - Cống (C4, D4, F4, G4, A4, C5)
      const pentatonicFreqs = [261.63, 293.66, 349.23, 392.00, 440.00, 523.25];
      const freq = pentatonicFreqs[scaleIndex % pentatonicFreqs.length] || 392.0;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4.5, t);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.85);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 1.25);
    } catch (_) {}
  }

  /**
   * Bật/Tắt Nhạc Nền Thiền Trà Ngũ Cung Êm Dịu (Ambient Pentatonic Drone)
   */
  toggleAmbientSoundscape() {
    this.resume();
    if (this.isAmbientPlaying) {
      this.stopAmbientSoundscape();
      return false;
    } else {
      this.startAmbientSoundscape();
      return true;
    }
  }

  startAmbientSoundscape() {
    this.resume();
    if (!this.ctx || this.isAmbientPlaying) return;

    try {
      const t = this.ctx.currentTime;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.001, t);
      this.ambientGain.gain.linearRampToValueAtTime(0.08, t + 1.5);
      this.ambientGain.connect(this.ctx.destination);

      // Dải tần ngân hòa âm trầm ấm (F3 & C4)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(174.61, t); // F3

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(261.63, t); // C4

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.ambientGain);

      this.droneOsc1.start(t);
      this.droneOsc2.start(t);
      this.isAmbientPlaying = true;
    } catch (_) {}
  }

  stopAmbientSoundscape() {
    if (!this.ctx || !this.isAmbientPlaying) return;
    try {
      const t = this.ctx.currentTime;
      if (this.ambientGain) {
        this.ambientGain.gain.linearRampToValueAtTime(0.001, t + 0.8);
      }
      setTimeout(() => {
        try {
          this.droneOsc1?.stop();
          this.droneOsc2?.stop();
          this.droneOsc1?.disconnect();
          this.droneOsc2?.disconnect();
        } catch (_) {}
        this.isAmbientPlaying = false;
      }, 850);
    } catch (_) {}
  }
}

export const hienThuCacAudio = new HienThuCacAudioSynthesizer();

/**
 * TẠO MÔ HÌNH 3D CUỐN SÁCH MỞ KÈM HÀO QUANG VÀ THẺ TÊN LƠ LỬNG
 */
export function createHienThuCacBookMesh(bookData, index = 0) {
  const bookGroup = new THREE.Group();
  bookGroup.name = `HienThuCac_Book_${bookData.id}`;

  // 1. BÌA SÁCH DA DA DÀY MỞ GÓC 15 ĐỘ
  const coverMat = new THREE.MeshStandardMaterial({
    color: bookData.coverColor,
    roughness: 0.65,
    metalness: 0.15
  });

  const spineGeo = prepGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.44, 8, 1, false, 0, Math.PI));
  const spine = new THREE.Mesh(spineGeo, coverMat);
  spine.rotation.x = Math.PI / 2;
  spine.position.y = 0.025;
  spine.userData.ignoreRaycaster = true;
  bookGroup.add(spine);

  // Bìa trái & Bìa phải
  const coverBoardGeo = prepGeo(new THREE.BoxGeometry(0.28, 0.015, 0.42));
  const leftCover = new THREE.Mesh(coverBoardGeo, coverMat);
  leftCover.position.set(-0.145, 0.025, 0);
  leftCover.rotation.z = 0.09;
  leftCover.userData.ignoreRaycaster = true;
  bookGroup.add(leftCover);

  const rightCover = new THREE.Mesh(coverBoardGeo, coverMat);
  rightCover.position.set(0.145, 0.025, 0);
  rightCover.rotation.z = -0.09;
  rightCover.userData.ignoreRaycaster = true;
  bookGroup.add(rightCover);

  // 2. CÁC TRANG SÁCH GIẤY BẢN GIẢ CỔ MỞ CONG (Parchment Pages)
  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xfbf7eb, // Giấy bồi vàng ngà
    roughness: 0.85,
    metalness: 0.05
  });

  const pageBlockGeo = prepGeo(new THREE.BoxGeometry(0.26, 0.035, 0.39));
  const leftPages = new THREE.Mesh(pageBlockGeo, pageMat);
  leftPages.position.set(-0.135, 0.045, 0);
  leftPages.rotation.z = 0.07;
  leftPages.userData.ignoreRaycaster = true;
  bookGroup.add(leftPages);

  const rightPages = new THREE.Mesh(pageBlockGeo, pageMat);
  rightPages.position.set(0.135, 0.045, 0);
  rightPages.rotation.z = -0.07;
  rightPages.userData.ignoreRaycaster = true;
  bookGroup.add(rightPages);

  // Dải ruy băng đánh dấu trang lụa đỏ thắm (Bookmark ribbon)
  const ribbonGeo = prepGeo(new THREE.BoxGeometry(0.03, 0.005, 0.46));
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
  ribbon.position.set(0, 0.065, 0.02);
  ribbon.userData.ignoreRaycaster = true;
  bookGroup.add(ribbon);

  // 3. VÒNG HÀO QUANG VÀNG KIM PHÁT SÁNG TRÊN MẶT BÀN
  const auraGeo = prepGeo(new THREE.RingGeometry(0.28, 0.46, 32));
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffbe55,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  });
  auraMat.userData = { ignoreRaycaster: true };
  const auraMesh = new THREE.Mesh(auraGeo, auraMat);
  auraMesh.rotation.x = -Math.PI / 2;
  auraMesh.position.y = 0.006;
  auraMesh.userData.ignoreRaycaster = true;
  bookGroup.add(auraMesh);

  // Ánh sáng rọi đọc sách ấm cúng nội tại
  const bookPointLight = new THREE.PointLight(0xffbe55, 0.75, 2.8, 1.5);
  bookPointLight.position.set(0, 0.35, 0);
  bookPointLight.userData.ignoreRaycaster = true;
  bookGroup.add(bookPointLight);

  // 4. THẺ TÊN VIÊN THUỐC LƠ LỬNG (FLOATING PILL BADGE)
  const pillCanvas = document.createElement('canvas');
  pillCanvas.width = 480;
  pillCanvas.height = 100;
  const ctx = pillCanvas.getContext('2d');

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 464, 84, 42);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(8, 8, 464, 84, 42);
  ctx.stroke();

  // Chấm sáng màu vàng
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(38, 50, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(`📖 ${bookData.title} | Nhấn để đọc`, 58, 50);

  const pillTexture = new THREE.CanvasTexture(pillCanvas);
  pillTexture.colorSpace = THREE.SRGBColorSpace;
  pillTexture.generateMipmaps = false;

  const pillGeo = prepGeo(new THREE.PlaneGeometry(1.85, 0.4));
  const pillMat = new THREE.MeshBasicMaterial({
    map: pillTexture,
    transparent: true,
    side: THREE.DoubleSide
  });
  pillMat.userData = { ignoreRaycaster: true };
  const pillMesh = new THREE.Mesh(pillGeo, pillMat);
  pillMesh.position.set(0, 0.75, 0);
  pillMesh.userData.ignoreRaycaster = true;
  bookGroup.add(pillMesh);

  // 5. INVISIBLE PROXY HITBOX (Click bắt dính 100%)
  const hitboxGeo = prepGeo(new THREE.CylinderGeometry(0.48, 0.48, 0.7, 12));
  const hitboxMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
  hitbox.position.y = 0.25;
  hitbox.userData = {
    isHienThuCacBook: true,
    bookIndex: index,
    bookData: bookData,
    rootBook: bookGroup
  };
  bookGroup.add(hitbox);

  // Đối tượng lưu trữ animation
  bookGroup.userData = {
    auraMesh,
    bookPointLight,
    pillMesh,
    hitbox,
    phaseOffset: index * 1.05
  };

  return {
    bookGroup,
    hitbox,
    pillMesh,
    auraMesh,
    bookPointLight,
    disposables: [
      spineGeo, coverBoardGeo, pageBlockGeo, ribbonGeo, auraGeo, pillGeo, hitboxGeo,
      coverMat, pageMat, ribbonMat, auraMat, pillMat, hitboxMat, pillTexture
    ]
  };
}

/**
 * QUẢN LÝ LORE OVERLAY MODAL CỔ PHONG TRÊN GIAO DIỆN WEB
 */
export class HienThuCacLoreOverlayManager {
  constructor() {
    this.modalEl = null;
    this.currentBookIndex = 0;
    this.cameraManager = null;
    this.camera = null;
    this.previousCameraPos = new THREE.Vector3();
    this.previousCameraTarget = new THREE.Vector3();
    this.isFocusingCamera = false;
    this.onCloseCallback = null;

    this.initDOM();
  }

  initDOM() {
    if (typeof document === 'undefined') return;
    let modal = document.getElementById('hien-thu-cac-lore-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'hien-thu-cac-lore-modal';
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 100050;
        background: rgba(10, 10, 15, 0.75);
        backdrop-filter: blur(10px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: "Segoe UI", Roboto, "Noto Serif", Georgia, serif;
      `;

      modal.innerHTML = `
        <div id="htc-modal-card" style="
          width: min(860px, 95vw);
          max-height: 90vh;
          background: linear-gradient(135deg, rgba(24, 20, 18, 0.97) 0%, rgba(38, 28, 24, 0.95) 100%);
          border: 2px solid #d4af37;
          border-radius: 18px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(212, 175, 55, 0.3);
          color: #f8fafc;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
          position: relative;
        ">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(212, 175, 55, 0.35); padding-bottom: 14px;">
            <div>
              <div id="htc-book-badge" style="display: inline-block; padding: 4px 10px; background: rgba(212, 175, 55, 0.18); border: 1px solid #d4af37; border-radius: 8px; font-size: 11.5px; font-weight: bold; color: #facc15; margin-bottom: 6px; letter-spacing: 0.5px;">
                TINH HOA VĂN HỌC ĐẠI VIỆT
              </div>
              <h1 id="htc-book-title" style="margin: 0; font-size: 26px; color: #ffffff; font-family: 'Noto Serif', Georgia, serif; letter-spacing: 0.5px;">
                Tên Tác Phẩm
              </h1>
              <div id="htc-book-meta" style="font-size: 13.5px; color: #cbd5e1; margin-top: 4px;">
                Tác giả • Niên đại • Địa danh
              </div>
            </div>
            <button id="htc-close-btn" style="background: none; border: 1px solid rgba(255, 255, 255, 0.25); color: #e2e8f0; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              ✕
            </button>
          </div>

          <!-- Trích Đoạn Cổ Phong & Dịch Thơ -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
            <!-- Cột chữ Hán / Nguyên tác -->
            <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; padding: 16px; border-left: 4px solid #d4af37;">
              <div style="font-size: 12px; font-weight: bold; color: #facc15; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
                📜 NGUYÊN TÁC TRÍCH ĐOẠN:
              </div>
              <div id="htc-book-original" style="font-size: 15px; line-height: 1.8; color: #fef08a; font-family: 'Noto Serif', Georgia, serif; white-space: pre-line;"></div>
            </div>

            <!-- Cột Dịch Thơ / Phiên Âm -->
            <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; border-left: 4px solid #38bdf8;">
              <div style="font-size: 12px; font-weight: bold; color: #38bdf8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
                ✨ PHIÊN ÂM & DỊCH NGHĨA:
              </div>
              <div id="htc-book-translation" style="font-size: 14px; line-height: 1.7; color: #e2e8f0; white-space: pre-line;"></div>
            </div>
          </div>

          <!-- Bình Phẩm Học Thuật & Ý Nghĩa Lịch Sử -->
          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px;">
            <div style="font-size: 12px; font-weight: bold; color: #4ade80; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>💡</span> Ý NGHĨA LỊCH SỬ & GIÁ TRỊ NHÂN VĂN:
            </div>
            <p id="htc-book-commentary" style="margin: 0; font-size: 13.5px; line-height: 1.65; color: #cbd5e1;"></p>
          </div>

          <!-- Câu Hỏi Thảo Luận Văn Học -->
          <div>
            <div style="font-size: 12px; font-weight: bold; color: #f59e0b; text-transform: uppercase; margin-bottom: 8px;">
              🐾 TRÒ CHUYỆN & GIẢI NGHĨA VĂN HỌC (CLICK CÂU HỎI):
            </div>
            <div id="htc-book-questions" style="display: flex; flex-direction: column; gap: 8px;"></div>
            <div id="htc-book-answer" style="display: none; margin-top: 10px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 10px; padding: 12px; font-size: 13.5px; line-height: 1.6; color: #fef3c7;"></div>
          </div>

          <!-- Footer Điều Khiển -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.12); padding-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 8px;">
              <button id="htc-prev-btn" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 10px; padding: 8px 14px; color: #f8fafc; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
                ◀ Tác phẩm trước
              </button>
              <button id="htc-next-btn" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 10px; padding: 8px 14px; color: #f8fafc; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
                Tác phẩm tiếp ▶
              </button>
            </div>

            <div style="display: flex; gap: 8px;">
              <button id="htc-music-toggle-btn" style="background: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; border-radius: 10px; padding: 8px 14px; color: #facc15; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                <span>🎵</span> Bật Nhạc Khúc Đàn Tranh
              </button>
              <button id="htc-close-action-btn" style="background: linear-gradient(135deg, #d4af37, #b45309); border: none; border-radius: 10px; padding: 8px 18px; color: #ffffff; font-weight: bold; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                Khép lại trang sách
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Gắn sự kiện các nút
      document.getElementById('htc-close-btn')?.addEventListener('click', () => this.close());
      document.getElementById('htc-close-action-btn')?.addEventListener('click', () => this.close());
      document.getElementById('htc-prev-btn')?.addEventListener('click', () => this.prevBook());
      document.getElementById('htc-next-btn')?.addEventListener('click', () => this.nextBook());
      document.getElementById('htc-music-toggle-btn')?.addEventListener('click', () => this.toggleMusic());

      // Nhấn phím Escape đóng modal
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalEl?.style.display === 'flex') {
          this.close();
        } else if (e.key === 'ArrowLeft' && this.modalEl?.style.display === 'flex') {
          this.prevBook();
        } else if (e.key === 'ArrowRight' && this.modalEl?.style.display === 'flex') {
          this.nextBook();
        }
      });
    }

    this.modalEl = modal;
  }

  open(bookIndex = 0, cameraManager = null, camera = null, bookWorldPos = null) {
    if (!this.modalEl) this.initDOM();
    if (!this.modalEl) return;

    this.currentBookIndex = Math.max(0, Math.min(bookIndex, HIEN_THU_CAC_BOOKS.length - 1));
    this.cameraManager = cameraManager;
    this.camera = camera;

    // Phát âm thanh lật trang sách chân thực
    hienThuCacAudio.playPageFlipSound();

    // Camera zoom nhẹ nhàng vào cuốn sách nếu có vị trí
    if (bookWorldPos && (cameraManager || camera)) {
      this.isFocusingCamera = true;
      if (camera) {
        this.previousCameraPos.copy(camera.position);
      }
      const camFocusPos = new THREE.Vector3(bookWorldPos.x + 0.8, bookWorldPos.y + 0.95, bookWorldPos.z + 1.2);
      const lookFocus = new THREE.Vector3(bookWorldPos.x, bookWorldPos.y + 0.05, bookWorldPos.z);

      if (cameraManager?.setCustomView) {
        cameraManager.setCustomView(camFocusPos, lookFocus);
      } else if (camera) {
        camera.position.copy(camFocusPos);
        camera.lookAt(lookFocus);
      }
    }

    this.renderCurrentBook();
    this.modalEl.style.display = 'flex';
  }

  renderCurrentBook() {
    const book = HIEN_THU_CAC_BOOKS[this.currentBookIndex];
    if (!book) return;

    const titleEl = document.getElementById('htc-book-title');
    const metaEl = document.getElementById('htc-book-meta');
    const badgeEl = document.getElementById('htc-book-badge');
    const originalEl = document.getElementById('htc-book-original');
    const translationEl = document.getElementById('htc-book-translation');
    const commentaryEl = document.getElementById('htc-book-commentary');
    const questionsContainer = document.getElementById('htc-book-questions');
    const answerEl = document.getElementById('htc-book-answer');

    if (titleEl) titleEl.textContent = book.title;
    if (metaEl) metaEl.textContent = `${book.author} • ${book.period} • ${book.location}`;
    if (badgeEl) badgeEl.textContent = `TINH HOA VĂN HỌC • ${book.category}`;
    if (originalEl) originalEl.textContent = book.originalExcerpt;
    if (translationEl) translationEl.textContent = `${book.poeticTranslation}\n\n[Phiên âm]:\n${book.transliteration}`;
    if (commentaryEl) commentaryEl.textContent = book.commentary;

    if (questionsContainer && answerEl) {
      questionsContainer.innerHTML = '';
      answerEl.style.display = 'none';

      (book.readingQuestions || []).forEach((item) => {
        const qBtn = document.createElement('button');
        qBtn.style.cssText = `
          background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 8px; padding: 8px 12px; color: #f1f5f9; text-align: left;
          font-size: 13px; cursor: pointer; transition: all 0.2s;
        `;
        qBtn.textContent = `💬 ${item.q}`;
        qBtn.onmouseover = () => { qBtn.style.background = 'rgba(212, 175, 55, 0.2)'; };
        qBtn.onmouseout = () => { qBtn.style.background = 'rgba(255, 255, 255, 0.06)'; };
        qBtn.onclick = () => {
          hienThuCacAudio.playMelodicPluck(this.currentBookIndex);
          answerEl.style.display = 'block';
          answerEl.innerHTML = `<strong>🐾 Giải nghĩa di sản:</strong> ${item.a}`;
        };
        questionsContainer.appendChild(qBtn);
      });
    }
  }

  prevBook() {
    this.currentBookIndex = (this.currentBookIndex - 1 + HIEN_THU_CAC_BOOKS.length) % HIEN_THU_CAC_BOOKS.length;
    hienThuCacAudio.playPageFlipSound();
    this.renderCurrentBook();
  }

  nextBook() {
    this.currentBookIndex = (this.currentBookIndex + 1) % HIEN_THU_CAC_BOOKS.length;
    hienThuCacAudio.playPageFlipSound();
    this.renderCurrentBook();
  }

  toggleMusic() {
    const isPlaying = hienThuCacAudio.toggleAmbientSoundscape();
    const btn = document.getElementById('htc-music-toggle-btn');
    if (btn) {
      btn.innerHTML = isPlaying
        ? '<span>⏸️</span> Tắt Nhạc Khúc Đàn Tranh'
        : '<span>🎵</span> Bật Nhạc Khúc Đàn Tranh';
    }
  }

  close() {
    if (this.modalEl) this.modalEl.style.display = 'none';

    // Trả lại camera nếu trước đó đã zoom vào sách
    if (this.isFocusingCamera && this.previousCameraPos.lengthSq() > 0) {
      if (this.camera) {
        this.camera.position.copy(this.previousCameraPos);
      }
      this.isFocusingCamera = false;
    }

    if (this.onCloseCallback) this.onCloseCallback();
  }
}

export const hienThuCacLoreOverlay = new HienThuCacLoreOverlayManager();

/**
 * HỆ THỐNG TƯƠNG TÁC 6 CUỐN SÁCH TẠI 6 CỤM BÀN TRUNG TÂM (TẦNG 2)
 */
export class HienThuCacInteractiveBookSystem {
  constructor(scene, camera, cameraManager = null) {
    this.scene = scene;
    this.camera = camera;
    this.cameraManager = cameraManager;

    this.group = new THREE.Group();
    this.group.name = 'HienThuCac_Interactive_Books_Group';

    this.bookItems = [];
    this.hitboxes = [];
    this.disposables = [];

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._onPointerDown = null;

    // Cache Vector3 cho tính toán vòng lặp
    this._vTmp = new THREE.Vector3();
  }

  /**
   * Khởi tạo 6 cuốn sách đặt trên 6 cụm bàn trung tâm
   * Toạ độ mặc định tại Tầng 2: X in [18, 26], Z in [7, 19], Y = 10.78m
   */
  buildBooksOnTables(tableCenters = null) {
    // 6 Vị trí mặt bàn chuẩn nếu chưa được truyền từ decorator
    const defaultCenters = [
      new THREE.Vector3(19.2, 10.78, 8.5),
      new THREE.Vector3(24.8, 10.78, 8.5),
      new THREE.Vector3(19.2, 10.78, 13.0),
      new THREE.Vector3(24.8, 10.78, 13.0),
      new THREE.Vector3(19.2, 10.78, 17.5),
      new THREE.Vector3(24.8, 10.78, 17.5)
    ];

    const centers = tableCenters && tableCenters.length >= 6 ? tableCenters : defaultCenters;

    for (let i = 0; i < 6; i++) {
      const bookData = HIEN_THU_CAC_BOOKS[i];
      const res = createHienThuCacBookMesh(bookData, i);
      const pos = centers[i];

      res.bookGroup.position.set(pos.x, pos.y, pos.z);
      // Xoay nhẹ tự nhiên góc nhìn người ngồi đọc
      res.bookGroup.rotation.y = (i % 2 === 0 ? 0.08 : -0.08) + (Math.random() - 0.5) * 0.05;

      this.group.add(res.bookGroup);
      this.hitboxes.push(res.hitbox);
      this.bookItems.push({
        group: res.bookGroup,
        auraMesh: res.auraMesh,
        pointLight: res.bookPointLight,
        pillMesh: res.pillMesh,
        bookData: bookData,
        index: i,
        basePos: pos.clone()
      });

      this.disposables.push(...res.disposables);
    }

    this.scene.add(this.group);
    this.disposables.push(this.group);
    this.initInteraction();

    console.log("%c✓ Hiên Thư Các: 6 Cuốn Sách Tinh Hoa & Lore Overlay đã tích hợp thành công!", "color: #f59e0b; font-weight: bold;");
  }

  initInteraction() {
    if (typeof window === 'undefined') return;

    this._onPointerDown = (event) => {
      // Bỏ qua nếu click vào UI
      const modal = document.getElementById('hien-thu-cac-lore-modal');
      if (modal && modal.style.display === 'flex') return;

      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const hits = this.raycaster.intersectObjects(this.hitboxes, true);
      if (hits.length > 0) {
        const uData = hits[0].object.userData;
        if (uData.isHienThuCacBook) {
          const item = this.bookItems[uData.bookIndex];
          const worldPos = item ? item.basePos : hits[0].object.position;
          hienThuCacLoreOverlay.open(uData.bookIndex, this.cameraManager, this.camera, worldPos);
        }
      }
    };

    window.addEventListener('pointerdown', this._onPointerDown);
  }

  update(delta, elapsedTime, camera) {
    if (!this.group.visible) return;

    const count = this.bookItems.length;
    for (let i = 0; i < count; i++) {
      const item = this.bookItems[i];
      const phase = elapsedTime * 2.4 + item.index * 1.05;

      // 1. Nhịp thở quang năng hào quang vàng kim
      if (item.auraMesh?.material) {
        item.auraMesh.material.opacity = 0.35 + Math.sin(phase) * 0.2;
        const s = 1.0 + Math.sin(phase) * 0.04;
        item.auraMesh.scale.set(s, s, s);
      }

      // 2. Độ sáng đèn rọi dịu dao động nhẹ
      if (item.pointLight) {
        item.pointLight.intensity = 0.65 + Math.sin(phase * 1.2) * 0.15;
      }

      // 3. Billboard Thẻ tên viên thuốc luôn quay về phía Camera
      if (camera && item.pillMesh) {
        item.pillMesh.quaternion.copy(camera.quaternion);
      }
    }
  }

  dispose() {
    if (typeof window !== 'undefined' && this._onPointerDown) {
      window.removeEventListener('pointerdown', this._onPointerDown);
    }

    hienThuCacLoreOverlay.close();

    this.disposables.forEach((d) => {
      d?.traverse?.((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
          else c.material.dispose?.();
        }
      });
      if (d?.dispose) d.dispose();
    });

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }

    this.bookItems = [];
    this.hitboxes = [];
    this.disposables = [];
  }
}

export default HienThuCacInteractiveBookSystem;
