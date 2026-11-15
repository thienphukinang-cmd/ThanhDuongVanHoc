import { LITERATURE_REGISTRY, getRoomCode, getRoomWorldPose } from './literatureRegistry.js';

/**
 * ============================================================================
 * PLAQUE LORE SYNTHESIS ENGINE (BỘ TỔNG HỢP TƯ LIỆU BẢNG THÔNG TIN DI SẢN)
 * Tự động chuẩn hóa và tổng hợp dữ liệu trưng bày cho toàn bộ 15 phòng văn học
 * trong LITERATURE_REGISTRY, hỗ trợ 3 chất liệu hiển thị truyền thống:
 * - 'giay_do'       : Giấy Dó cổ (mộc mạc, cận-hiện đại & cổ tích dân gian)
 * - 'lua_hoang_kim' : Chiếu Lụa Hoàng Kim (trang nghiêm, cung đình & trung đại)
 * - 'da_reu_phong'  : Bia Đá Rêu Phong (cổ kính, truyền thuyết & sử thi Văn Lang)
 * ============================================================================
 */

export const PLAQUE_STYLE_THEMES = {
  giay_do: {
    id: 'giay_do',
    label: 'Giấy Dó Cổ Truyền',
    paperBg: '#efe0bc',
    paperBgDeep: '#d5b982',
    inkPrimary: '#2a1608',
    inkSecondary: '#5c3a1d',
    accentColor: '#8c221b',
    borderColor: '#69411f',
    woodTone: 'lim',
    badgeDefault: 'BẢN IN GIẤY DÓ'
  },
  lua_hoang_kim: {
    id: 'lua_hoang_kim',
    label: 'Chiếu Lụa Hoàng Kim',
    paperBg: '#f6e6b4',
    paperBgDeep: '#d9b35d',
    inkPrimary: '#361309',
    inkSecondary: '#6b3314',
    accentColor: '#991b1b',
    borderColor: '#b48224',
    woodTone: 'go_do',
    badgeDefault: 'CHIẾU LỤA HOÀNG KIM'
  },
  da_reu_phong: {
    id: 'da_reu_phong',
    label: 'Bia Đá Rêu Phong',
    paperBg: '#373e38',
    paperBgDeep: '#252b26',
    inkPrimary: '#f3e7c8',
    inkSecondary: '#d1c29a',
    accentColor: '#d9a441',
    borderColor: '#5c7258',
    woodTone: 'lim',
    badgeDefault: 'BIA ĐÁ CỔ TÍCH'
  },
  lua_trang: {
    id: 'lua_trang',
    label: 'Dải Lụa Trắng • Giấy Dó Cổ',
    paperBg: '#f6f3ea',
    paperBgDeep: '#e5dfd1',
    inkPrimary: '#1a2033',
    inkSecondary: '#434b63',
    accentColor: '#1d4d59',
    borderColor: '#b7ab94',
    woodTone: 'lim',
    badgeDefault: 'DẢI LỤA TRẮNG • THẾ KỶ XVI'
  },
  ngoc_vi_da: {
    id: 'ngoc_vi_da',
    label: 'Ngọc Bích Vĩ Dạ • Lụa Trắng Huế',
    paperBg: '#f3f9f5',
    paperBgDeep: '#dbece2',
    inkPrimary: '#122a22',
    inkSecondary: '#2d5a4c',
    accentColor: '#0f766e',
    borderColor: '#1a6b54',
    woodTone: 'lim',
    badgeDefault: 'NGỌC BÍCH • THƠ MỚI 1938'
  }
};

export function normalizePlaqueStyleTheme(theme) {
  if (!theme) return 'giay_do';
  const raw = String(theme).trim().toLowerCase();
  if (raw === 'giay_do' || raw === 'giay-do') return 'giay_do';
  if (raw === 'lua_trang' || raw === 'lua-trang' || raw === 'dai_lua_trang' || raw === 'white_silk') return 'lua_trang';
  if (raw === 'ngoc_vi_da' || raw === 'ngoc-vi-da' || raw === 'jade_silk' || raw === 'ngoc_bich' || raw === 'vi_da') return 'ngoc_vi_da';
  if (raw === 'lua_hoang_kim' || raw === 'chieu_lua' || raw === 'chieu-lua') return 'lua_hoang_kim';
  if (raw === 'da_reu_phong' || raw === 'dong_son_giay_do' || raw === 'bia_da') return 'da_reu_phong';
  return 'giay_do';
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Tạo minh họa SVG nghệ thuật di sản dạng Data URI (không phụ thuộc mạng, không lỗi 404)
 */
export function generateHeritageIllustrationDataUri({
  id = 'default',
  title = 'Di Sản Văn Học',
  styleTheme = 'giay_do',
  badgeLabel = 'BẢO TÀNG VĂN HỌC'
} = {}) {
  const theme = PLAQUE_STYLE_THEMES[normalizePlaqueStyleTheme(styleTheme)] || PLAQUE_STYLE_THEMES.giay_do;
  const safeTitle = escapeXml(String(title).normalize('NFC'));
  const safeBadge = escapeXml(String(badgeLabel).normalize('NFC'));

  let motifSvg = '';
  if (id === 'tat_den') {
    // Ngọn đèn dầu leo lắt & mái tranh đêm tối làng Đông Xá
    motifSvg = `
      <rect x="34" y="28" width="492" height="184" rx="10" fill="#1b120c" opacity="0.92"/>
      <circle cx="280" cy="112" r="76" fill="url(#lampGlow)" opacity="0.72"/>
      <path d="M90 198 L165 135 L245 198 Z" fill="#2c1d13" stroke="#5d3f25" stroke-width="2"/>
      <path d="M122 198 L165 162 L212 198" fill="none" stroke="#855b34" stroke-width="2"/>
      <path d="M350 202 Q365 138 380 96 Q392 142 406 202" fill="none" stroke="#4a5838" stroke-width="3"/>
      <path d="M370 202 Q390 128 415 84 Q428 144 440 202" fill="none" stroke="#3c492d" stroke-width="2.5"/>
      <ellipse cx="280" cy="176" rx="30" ry="9" fill="#5e3c1e" stroke="#b98948" stroke-width="2"/>
      <path d="M262 174 L268 136 L292 136 L298 174 Z" fill="#7c4f26" stroke="#d4a65c" stroke-width="2"/>
      <path d="M266 136 Q262 104 280 92 Q298 104 294 136 Z" fill="rgba(255,226,158,0.22)" stroke="#e6c07b" stroke-width="1.8"/>
      <path d="M280 105 Q288 118 280 128 Q272 118 280 105 Z" fill="#ffcf5c"/>
      <circle cx="280" cy="119" r="4" fill="#fff7d6"/>
    `;
  } else if (id === 'nam_quoc_son_ha') {
    // Cuộn chiếu hoàng kim, núi sông Đại Việt & sóng sông Như Nguyệt
    motifSvg = `
      <rect x="34" y="28" width="492" height="184" rx="10" fill="#46100e"/>
      <circle cx="280" cy="86" r="56" fill="#f5c64a" opacity="0.24"/>
      <path d="M44 166 Q115 112 190 156 T340 148 T516 164 L516 206 L44 206 Z" fill="#6d1c16" stroke="#e8bd5a" stroke-width="2"/>
      <path d="M44 182 Q98 170 150 182 T260 182 T370 182 T516 182" fill="none" stroke="#f4d06f" stroke-width="2.5"/>
      <path d="M44 196 Q110 185 170 196 T300 196 T430 196 T516 196" fill="none" stroke="#d49f3b" stroke-width="2"/>
      <rect x="172" y="54" width="216" height="92" rx="6" fill="#f9e6b0" stroke="#991b1b" stroke-width="3"/>
      <rect x="160" y="48" width="14" height="104" rx="5" fill="#b45309" stroke="#fde047" stroke-width="2"/>
      <rect x="386" y="48" width="14" height="104" rx="5" fill="#b45309" stroke="#fde047" stroke-width="2"/>
      <text x="280" y="92" text-anchor="middle" font-family="serif" font-size="22" font-weight="bold" fill="#7f1d1d">南國山河南帝居</text>
      <text x="280" y="122" text-anchor="middle" font-family="serif" font-size="16" font-weight="bold" fill="#991b1b">NHƯ NGUYỆT • 1077</text>
    `;
  } else if (id === 'thanh_giong') {
    // Mặt trời Đông Sơn, tre đằng ngà & bóng ngựa sắt Sóc Sơn
    motifSvg = `
      <rect x="34" y="28" width="492" height="184" rx="10" fill="#232b24"/>
      <circle cx="280" cy="116" r="64" fill="none" stroke="#d9a441" stroke-width="3" opacity="0.8"/>
      <circle cx="280" cy="116" r="46" fill="none" stroke="#d9a441" stroke-width="1.8" stroke-dasharray="6 5" opacity="0.7"/>
      <circle cx="280" cy="116" r="24" fill="#d9a441" opacity="0.28"/>
      <g stroke="#e0b254" stroke-width="2" opacity="0.85">
        <line x1="280" y1="42" x2="280" y2="62"/>
        <line x1="280" y1="170" x2="280" y2="190"/>
        <line x1="206" y1="116" x2="226" y2="116"/>
        <line x1="334" y1="116" x2="354" y2="116"/>
        <line x1="228" y1="64" x2="242" y2="78"/>
        <line x1="318" y1="154" x2="332" y2="168"/>
        <line x1="332" y1="64" x2="318" y2="78"/>
        <line x1="242" y1="154" x2="228" y2="168"/>
      </g>
      <path d="M56 198 L128 138 L208 198 M352 198 L428 134 L504 198" fill="#324135" stroke="#8aa685" stroke-width="2"/>
      <path d="M112 196 L112 64 M134 196 L142 74 M426 196 L422 72 M446 196 L454 84" stroke="#eab308" stroke-width="4" stroke-linecap="round"/>
      <path d="M242 152 Q264 114 294 110 Q320 108 332 90 Q340 108 326 128 Q314 146 320 164 L298 164 L292 146 L264 148 L254 166 L236 166 Z" fill="#18181b" stroke="#f5c64a" stroke-width="2.2"/>
    `;
  } else if (
    id === 'nguoi_con_gai_nam_xuong' ||
    id === 'plaque_nguoi_con_gai_nam_xuong' ||
    id === 'nam_xuong_vu_nuong' ||
    id === 'nam_xuong_tram_vang' ||
    String(id).startsWith('namxuong_realm_') ||
    String(id).startsWith('nam_xuong_realm_') ||
    String(id).startsWith('namxuong_') ||
    String(id).startsWith('nam_xuong_') ||
    String(id).toLowerCase().includes('namxuong') ||
    String(id).toLowerCase().includes('nam_xuong')
  ) {
    const idLower = String(id || '').toLowerCase();
    if (idLower.includes('thuy_cung') || idLower.includes('thuycung') || idLower.includes('linh_phi')) {
      // Đại cảnh Thủy Cung Linh Phi: lộng lẫy dưới đáy sông Hoàng Giang, rạn san hô xanh ngọc, kiệu hoa cờ quạt, lân tinh #00ffcc bừng sáng
      motifSvg = `
        <defs>
          <linearGradient id="thuyCungGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#051c24"/>
            <stop offset="50%" stop-color="#083344"/>
            <stop offset="100%" stop-color="#02141a"/>
          </linearGradient>
          <radialGradient id="thuyCungGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#00ffcc" stop-opacity="0.85"/>
            <stop offset="45%" stop-color="#06b6d4" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#083344" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect x="34" y="28" width="492" height="184" rx="10" fill="url(#thuyCungGrad)"/>
        <!-- Ánh sáng huyền ảo thủy phủ -->
        <circle cx="280" cy="110" r="74" fill="url(#thuyCungGlow)"/>
        <!-- Rạn san hô & thủy thảo đáy sông -->
        <path d="M46 206 Q62 148 76 206 M82 206 Q98 136 112 206 M436 206 Q450 142 468 206 M474 206 Q492 152 506 206" stroke="#00ffcc" stroke-width="2.5" fill="none" opacity="0.65" stroke-linecap="round"/>
        <path d="M68 206 Q82 120 102 206 M452 206 Q472 126 488 206" stroke="#22d3ee" stroke-width="1.8" fill="none" opacity="0.5"/>
        <!-- Kiệu hoa cờ quạt ẩn hiện giữa làn nước sương khói -->
        <g opacity="0.92">
          <!-- Mái kiệu hoa Thủy tộc chạm trổ -->
          <path d="M228 108 L280 82 L332 108 L320 114 L280 96 L240 114 Z" fill="#38bdf8" stroke="#fde047" stroke-width="1.8"/>
          <path d="M242 114 L242 158 L318 158 L318 114 Z" fill="rgba(6, 182, 212, 0.22)" stroke="#38bdf8" stroke-width="1.6"/>
          <!-- Rèm kiệu & dải lụa mỏng bay trong dòng nước -->
          <path d="M256 122 Q260 148 252 166 M280 120 Q284 148 280 168 M304 122 Q300 148 308 166" stroke="#f6f3ea" stroke-width="1.4" fill="none" opacity="0.75"/>
          <!-- Bóng nàng Vũ Nương đoan trang trên kiệu -->
          <circle cx="280" cy="132" r="7.5" fill="#fef08a" opacity="0.95"/>
          <path d="M272 158 Q274 142 280 140 Q286 142 288 158 Z" fill="#e0f2fe" opacity="0.9"/>
          <!-- Cờ tiết Mao & quạt lụa Thủy tộc hai bên -->
          <line x1="214" y1="72" x2="214" y2="168" stroke="#fde047" stroke-width="2"/>
          <path d="M214 74 Q196 84 214 96 Z" fill="#38bdf8" stroke="#fde047" stroke-width="1.2"/>
          <line x1="346" y1="72" x2="346" y2="168" stroke="#fde047" stroke-width="2"/>
          <path d="M346 74 Q364 84 346 96 Z" fill="#38bdf8" stroke="#fde047" stroke-width="1.2"/>
        </g>
        <!-- Làn lân tinh ngọc bích phát sáng lung linh -->
        <g fill="#00ffcc" opacity="0.9">
          <circle cx="160" cy="88" r="3.2"/><circle cx="188" cy="134" r="2.4"/><circle cx="140" cy="162" r="2.8"/>
          <circle cx="376" cy="82" r="3.0"/><circle cx="406" cy="128" r="2.2"/><circle cx="390" cy="164" r="2.6"/>
          <circle cx="280" cy="56" r="2.5"/><circle cx="250" cy="74" r="2"/><circle cx="310" cy="72" r="2.2"/>
        </g>
        <!-- Sóng nước thủy cung lăn tăn -->
        <path d="M44 192 Q110 180 180 192 T320 192 T460 192 T516 192" fill="none" stroke="#00ffcc" stroke-width="1.6" opacity="0.55"/>
        <path d="M44 204 Q120 196 200 204 T360 204 T516 204" fill="none" stroke="#38bdf8" stroke-width="1.8" opacity="0.45"/>
      `;
    } else if (idLower.includes('dan_giai_oan') || idLower.includes('giai_oan') || idLower.includes('tram_vang')) {
      // Đàn Giải Oan & Bến Hoàng Giang: Đàn tế nghi ngút khói hương, hoa đăng trên sóng, Trâm Vàng hoa mai lơ lửng
      motifSvg = `
        <defs>
          <radialGradient id="altarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect x="34" y="28" width="492" height="184" rx="10" fill="#0f172a"/>
        <!-- Trăng khuyết Hoàng Giang -->
        <path d="M448 48 A22 22 0 1 0 470 78 A16 16 0 1 1 448 48 Z" fill="#fef08a" opacity="0.92"/>
        <!-- Sóng nước Hoàng Giang trong đêm -->
        <path d="M34 162 Q110 150 190 162 T350 162 T526 158 L526 212 L34 212 Z" fill="#091424" stroke="#38bdf8" stroke-width="1.5" opacity="0.95"/>
        <path d="M44 180 Q120 172 200 180 T370 180 T516 178" fill="none" stroke="#93c5fd" stroke-width="1.4" opacity="0.5"/>
        <path d="M50 198 Q140 190 230 198 T410 198 T516 196" fill="none" stroke="#00ffcc" stroke-width="1.3" opacity="0.45"/>
        <!-- Đàn Giải Oan ba tầng trên bến sông -->
        <rect x="180" y="160" width="200" height="22" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
        <rect x="204" y="142" width="152" height="20" rx="3" fill="#334155" stroke="#fde047" stroke-width="1.8"/>
        <rect x="228" y="126" width="104" height="18" rx="2" fill="#475569" stroke="#fde047" stroke-width="1.8"/>
        <!-- Khói hương nghi ngút bay lên trời -->
        <path d="M260 126 Q252 98 262 76 T256 46" stroke="#f8fafc" stroke-width="2" fill="none" opacity="0.65" stroke-linecap="round"/>
        <path d="M280 126 Q288 96 278 72 T286 44" stroke="#f8fafc" stroke-width="2.2" fill="none" opacity="0.75" stroke-linecap="round"/>
        <path d="M300 126 Q308 100 298 78 T304 48" stroke="#f8fafc" stroke-width="1.8" fill="none" opacity="0.6" stroke-linecap="round"/>
        <!-- Chiếc Trâm Vàng hoa mai lơ lửng phát hào quang -->
        <circle cx="280" cy="80" r="28" fill="url(#altarGlow)"/>
        <line x1="254" y1="84" x2="304" y2="72" stroke="#fde047" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="304" cy="72" r="5.5" fill="#fef08a" stroke="#d97706" stroke-width="1.8"/>
        <circle cx="304" cy="72" r="2" fill="#dc2626"/>
        <!-- Đèn hoa đăng trôi trên dòng nước -->
        <polygon points="112,176 122,168 132,176 122,180" fill="#f43f5e" stroke="#fbbf24" stroke-width="1.2"/>
        <circle cx="122" cy="172" r="2.5" fill="#fef08a"/>
        <polygon points="400,174 410,166 420,174 410,178" fill="#f43f5e" stroke="#fbbf24" stroke-width="1.2"/>
        <circle cx="410" cy="170" r="2.5" fill="#fef08a"/>
      `;
    } else if (idLower.includes('den_dau') || idLower.includes('chiec_bong') || idLower.includes('cottage')) {
      // Gian Nhà Tranh & Chiếc Bóng Trên Vách: Gian nhà tranh vách nứa, ngọn đèn dầu lay lắt, chiếc bóng khổng lồ & chiếc nôi
      motifSvg = `
        <rect x="34" y="28" width="492" height="184" rx="10" fill="#13192b"/>
        <!-- Khung vách nứa đan nan truyền thống -->
        <rect x="46" y="44" width="220" height="152" rx="6" fill="#241911" stroke="#7c5c3e" stroke-width="2"/>
        <g stroke="#5a4028" stroke-width="1.3" opacity="0.65">
          <line x1="74" y1="44" x2="74" y2="196"/><line x1="102" y1="44" x2="102" y2="196"/>
          <line x1="130" y1="44" x2="130" y2="196"/><line x1="158" y1="44" x2="158" y2="196"/>
          <line x1="186" y1="44" x2="186" y2="196"/><line x1="214" y1="44" x2="214" y2="196"/>
          <line x1="242" y1="44" x2="242" y2="196"/>
          <line x1="46" y1="74" x2="266" y2="74"/><line x1="46" y1="104" x2="266" y2="104"/>
          <line x1="46" y1="134" x2="266" y2="134"/><line x1="46" y1="164" x2="266" y2="164"/>
        </g>
        <!-- Chiếc bóng Vũ Nương khổng lồ hắt lên vách nứa -->
        <path d="M128 194 L132 136 Q134 104 148 88 Q160 72 152 56 Q170 58 174 76 Q176 96 190 114 L198 194 Z" fill="#08080c" opacity="0.94"/>
        <!-- Ngọn đèn dầu cổ truyền trên chõng tre -->
        <circle cx="316" cy="142" r="54" fill="url(#lampGlow)" opacity="0.75"/>
        <rect x="290" y="174" width="52" height="8" rx="2" fill="#5c3a1d" stroke="#855b34" stroke-width="1.4"/>
        <ellipse cx="316" cy="172" rx="16" ry="5.5" fill="#7c4f26" stroke="#d4a65c" stroke-width="1.5"/>
        <path d="M312 170 L314 148 L318 148 L320 170 Z" fill="#b45309"/>
        <path d="M316 138 Q324 150 316 158 Q308 150 316 138 Z" fill="#ffcf5c" stroke="#f59e0b" stroke-width="1"/>
        <circle cx="316" cy="150" r="3.5" fill="#fffbeb"/>
        <!-- Chiếc nôi tre bé Đản bên cạnh -->
        <path d="M386 168 Q426 192 466 168 L460 156 Q426 172 392 156 Z" fill="#3f2e1e" stroke="#855b34" stroke-width="1.8"/>
        <path d="M394 154 Q426 142 458 154" stroke="#d4a65c" stroke-width="1.4" fill="none"/>
        <line x1="392" y1="184" x2="386" y2="196" stroke="#78350f" stroke-width="2.5"/>
        <line x1="460" y1="184" x2="466" y2="196" stroke="#78350f" stroke-width="2.5"/>
      `;
    } else {
      // namxuong_realm_bia_lua / default Nam Xương: Dải lụa trắng, trăng khuyết Hoàng Giang, vách nứa, chiếc bóng & trâm vàng
      motifSvg = `
        <rect x="34" y="28" width="492" height="184" rx="10" fill="#13192b"/>
        <path d="M438 50 A24 24 0 1 0 462 84 A18 18 0 1 1 438 50 Z" fill="#e2e8f0" opacity="0.9"/>
        <rect x="46" y="46" width="170" height="148" rx="6" fill="#2c2015" stroke="#7c5c3e" stroke-width="2"/>
        <g stroke="#5a4028" stroke-width="1.2" opacity="0.55">
          <line x1="68" y1="46" x2="68" y2="194"/><line x1="92" y1="46" x2="92" y2="194"/>
          <line x1="116" y1="46" x2="116" y2="194"/><line x1="140" y1="46" x2="140" y2="194"/>
          <line x1="164" y1="46" x2="164" y2="194"/><line x1="188" y1="46" x2="188" y2="194"/>
          <line x1="46" y1="76" x2="216" y2="76"/><line x1="46" y1="106" x2="216" y2="106"/>
          <line x1="46" y1="136" x2="216" y2="136"/><line x1="46" y1="166" x2="216" y2="166"/>
        </g>
        <circle cx="242" cy="148" r="46" fill="url(#lampGlow)" opacity="0.55"/>
        <path d="M116 192 L120 132 Q122 104 134 90 Q144 76 138 62 Q152 64 156 80 Q158 96 170 112 L176 192 Z" fill="#090a10" opacity="0.88"/>
        <ellipse cx="242" cy="176" rx="18" ry="5.5" fill="#7c4f26" stroke="#d4a65c" stroke-width="1.5"/>
        <path d="M242 152 Q248 162 242 170 Q236 162 242 152 Z" fill="#ff9d2e"/>
        <path d="M270 162 Q332 146 396 158 T526 154 L526 212 L270 212 Z" fill="#0d1b2a" stroke="#60a5fa" stroke-width="1.5" opacity="0.92"/>
        <path d="M286 176 Q336 168 386 176 T488 176" fill="none" stroke="#93c5fd" stroke-width="1.5" opacity="0.55"/>
        <path d="M300 192 Q355 184 410 192 T510 190" fill="none" stroke="#00ffcc" stroke-width="1.5" opacity="0.5"/>
        <!-- Dải Lụa Trắng uốn lượn mềm mại trên bầu trời đêm -->
        <path d="M210 68 Q280 44 350 72 T480 64" fill="none" stroke="#f8fafc" stroke-width="3" opacity="0.75" stroke-linecap="round"/>
        <path d="M214 74 Q284 50 354 78 T484 70" fill="none" stroke="#93c5fd" stroke-width="1.5" opacity="0.45"/>
        <line x1="382" y1="108" x2="432" y2="94" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
        <circle cx="432" cy="94" r="5" fill="#fef08a" stroke="#f59e0b" stroke-width="1.5"/>
        <g fill="#00ffcc" opacity="0.85">
          <circle cx="326" cy="144" r="3"/><circle cx="352" cy="128" r="2.2"/>
          <circle cx="458" cy="136" r="2.8"/><circle cx="484" cy="118" r="2"/>
          <circle cx="404" cy="120" r="2.4"/>
        </g>
      `;
    }
  } else if (
    id === 'day_thon_vi_da' ||
    id === 'plaque_day_thon_vi_da' ||
    id === 'vida_vuon_vi_da' ||
    id === 'vida_thuyen_trang' ||
    String(id).startsWith('vida_realm_') ||
    String(id).startsWith('vida_') ||
    String(id).toLowerCase().includes('daythonvida') ||
    String(id).toLowerCase().includes('day_thon_vi_da')
  ) {
    // Vườn Vĩ Dạ nắng mới hàng cau xanh như ngọc, lá trúc che ngang, bến sông trăng & thuyền nan xứ Huế trong sương khói
    motifSvg = `
      <defs>
        <linearGradient id="viDaSkyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#e8f5e9"/>
          <stop offset="48%" stop-color="#c8e6dc"/>
          <stop offset="100%" stop-color="#0f1e36"/>
        </linearGradient>
        <radialGradient id="viDaMoonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.95"/>
          <stop offset="45%" stop-color="#fde68a" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#bae6fd" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect x="34" y="28" width="492" height="184" rx="10" fill="url(#viDaSkyGrad)"/>
      <!-- Nắng mới ban mai bên vườn cau -->
      <polygon points="40,28 145,28 210,194 40,194" fill="#fef08a" opacity="0.28"/>
      <circle cx="88" cy="64" r="22" fill="#fde047" opacity="0.55"/>
      <!-- Hàng cau & tán lá xanh như ngọc -->
      <path d="M74 196 Q78 130 82 74" stroke="#2f5e3d" stroke-width="4.5" fill="none"/>
      <path d="M112 196 Q116 136 122 86" stroke="#285436" stroke-width="4" fill="none"/>
      <path d="M82 74 Q54 62 42 78 M82 74 Q64 50 82 42 M82 74 Q108 58 118 76 M82 74 Q98 84 106 96" stroke="#15803d" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M122 86 Q98 76 88 90 M122 86 Q110 64 126 56 M122 86 Q146 72 154 88" stroke="#16a34a" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M36 196 Q110 158 205 182 L205 210 L36 210 Z" fill="#1b5e3f" opacity="0.92"/>
      <!-- Lá trúc che ngang mặt chữ điền -->
      <path d="M148 44 Q168 62 198 60 M156 58 Q174 74 204 70 M166 72 Q182 86 210 82" stroke="#14532d" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <!-- Trăng tròn sông Hương & bóng áo trắng mờ sương -->
      <circle cx="424" cy="74" r="48" fill="url(#viDaMoonGlow)"/>
      <circle cx="424" cy="74" r="20" fill="#fef9c3"/>
      <!-- Sông trăng & thuyền nan đậu bến -->
      <path d="M195 162 Q285 152 380 162 T526 158 L526 212 L195 212 Z" fill="#0d2942" opacity="0.94"/>
      <ellipse cx="424" cy="182" rx="44" ry="8" fill="#fef08a" opacity="0.28"/>
      <path d="M235 178 Q295 170 355 178 T475 178" fill="none" stroke="#bae6fd" stroke-width="1.4" opacity="0.55"/>
      <path d="M270 194 Q340 186 410 194 T510 192" fill="none" stroke="#fde68a" stroke-width="1.3" opacity="0.45"/>
      <!-- Chiếc thuyền nan chở trăng -->
      <path d="M306 164 Q346 184 394 164 Q352 172 306 164 Z" fill="#422a17" stroke="#fde68a" stroke-width="1.6"/>
      <circle cx="350" cy="161" r="6" fill="#fef08a" opacity="0.88"/>
      <!-- Bóng áo trắng trong làn sương khói -->
      <path d="M472 156 Q476 122 482 110 Q488 122 492 156 Z" fill="#ffffff" opacity="0.42"/>
      <ellipse cx="478" cy="146" rx="46" ry="12" fill="#e2e8f0" opacity="0.22"/>
    `;
  } else {
    // Họa tiết di sản Đông Sơn & mây cuộn chung cho các phòng văn học khác
    motifSvg = `
      <rect x="34" y="28" width="492" height="184" rx="10" fill="${theme.paperBgDeep}" opacity="0.55"/>
      <circle cx="280" cy="116" r="56" fill="none" stroke="${theme.accentColor}" stroke-width="2.5" opacity="0.75"/>
      <circle cx="280" cy="116" r="38" fill="none" stroke="${theme.borderColor}" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.7"/>
      <path d="M90 172 Q155 126 225 158 T360 150 T470 172" fill="none" stroke="${theme.accentColor}" stroke-width="2.4" opacity="0.75"/>
      <rect x="215" y="74" width="130" height="84" rx="6" fill="${theme.paperBg}" stroke="${theme.accentColor}" stroke-width="2.5"/>
      <line x1="235" y1="100" x2="325" y2="100" stroke="${theme.inkPrimary}" stroke-width="2.5"/>
      <line x1="235" y1="118" x2="325" y2="118" stroke="${theme.inkSecondary}" stroke-width="2"/>
      <line x1="235" y1="136" x2="302" y2="136" stroke="${theme.inkSecondary}" stroke-width="2"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 240" width="560" height="240">
  <defs>
    <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffdf73" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffdf73" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="2" y="2" width="556" height="236" rx="14" fill="${theme.paperBg}" stroke="${theme.borderColor}" stroke-width="4"/>
  <rect x="12" y="12" width="536" height="216" rx="10" fill="none" stroke="${theme.accentColor}" stroke-width="1.5" opacity="0.7"/>
  ${motifSvg}
  <rect x="172" y="192" width="216" height="24" rx="4" fill="${theme.accentColor}" opacity="0.92"/>
  <text x="280" y="208" text-anchor="middle" font-family="serif" font-size="11.5" font-weight="bold" letter-spacing="1.2" fill="#fff8e7">${safeBadge}</text>
  <text x="280" y="24" text-anchor="middle" font-family="serif" font-size="11" font-weight="bold" fill="${theme.inkSecondary}">${safeTitle}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * DỮ LIỆU CHUYÊN SÂU CHUẨN HỌC THUẬT CHO CÁC PHÒNG TRƯNG BÀY
 */
const CANONICAL_ROOM_PROFILES = {
  tat_den: {
    title: 'Tắt Đèn',
    author: 'Ngô Tất Tố',
    years: '1893–1954',
    publicationYear: '1939',
    historicalPeriod: 'Thời kỳ 1930–1945 • Nông thôn Việt Nam trước Cách mạng tháng Tám',
    styleTheme: 'giay_do',
    badgeLabel: 'TẮT ĐÈN • 1939',
    summary: 'Kiệt tác hiện thực phê phán xuất bản năm 1939, phơi bày bi kịch sưu thuế nặng nề đẩy người nông dân Việt Nam trước Cách mạng tháng Tám vào bước đường cùng, ngợi ca phẩm chất phản kháng quật cường của chị Dậu.',
    researchText: '“Tắt đèn” (đăng báo Việt Nữ 1937, in sách 1939) là đỉnh cao văn xuôi hiện thực phê phán của Ngô Tất Tố. Qua vụ thuế ngột ngạt ở làng Đông Xá và gia đình chị Dậu phải bán con, bán chó để cứu chồng khỏi cùm kẹp, tác phẩm vạch trần bộ máy cường hào, thực dân tàn bạo và khẳng định sức sống phản kháng “tức nước vỡ bờ” của người phụ nữ nông dân.',
    biography: 'Ngô Tất Tố (1893–1954), quê làng Lộc Hà (Từ Sơn, Bắc Ninh – nay thuộc Đông Anh, Hà Nội), là nhà văn, nhà báo, học giả uyên bác xuất thân Nho học. Ông gắn bó sâu sắc với đời sống nông thôn Bắc Bộ, để lại những trang viết sắc bén bảo vệ người lao động nghèo.',
    poem: [
      '“Tức nước vỡ bờ! Mày trói ngay chồng bà đi, bà cho mày xem!”',
      '“Chị vùng chạy ra ngoài giữa lúc trời tối như mực và như cái tiền đồ của chị vậy!”',
      '— Trích tiểu thuyết Tắt Đèn (Ngô Tất Tố, 1939)'
    ],
    illustrationCaption: 'Minh họa di sản: Ngọn đèn dầu leo lắt giữa mái tranh làng Đông Xá'
  },

  nam_quoc_son_ha: {
    title: 'Nam Quốc Sơn Hà',
    author: 'Lý Thường Kiệt',
    years: '1019–1105',
    publicationYear: '1077',
    historicalPeriod: 'Thời Lý • Chiến tuyến sông Như Nguyệt (1077)',
    styleTheme: 'lua_hoang_kim',
    badgeLabel: 'THIÊN THƯ • 1077',
    summary: 'Bài thơ thần thời Lý vang lên bên chiến tuyến sông Như Nguyệt (1077), được tôn vinh là bản Tuyên ngôn Độc lập đầu tiên khẳng định chủ quyền bất khả xâm phạm của nước Đại Việt.',
    researchText: 'Trong cuộc kháng chiến chống quân Tống xâm lược năm 1077 trên phòng tuyến sông Như Nguyệt (sông Cầu), Thái úy Lý Thường Kiệt đã cho ngâm vang bài thơ thất ngôn tứ tuyệt từ đền Trương Hống – Trương Hát. Với giọng điệu đanh thép, bài thơ khẳng định chân lý độc lập dân tộc được định sẵn tại “thiên thư”, làm nức lòng quân sĩ Đại Việt và đập tan ý chí xâm lăng của giặc.',
    biography: 'Thái úy Lý Thường Kiệt (1019–1105), quê kinh thành Thăng Long, là danh tướng kiệt xuất triều Lý. Ông nổi tiếng với chiến lược “Tiên phát chế nhân” (1075–1076) và đại thắng trên phòng tuyến sông Như Nguyệt (1077), giữ vững nền độc lập Đại Việt.',
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
    dichNghia: 'Sông núi nước Nam là nơi vua nước Nam ở; ranh giới, phận nước đã được định rõ ràng rành mạch tại sách trời. Cớ sao lũ giặc bạo ngược lại dám kéo sang xâm phạm? Rồi chúng bay hãy chờ mà xem việc chuốc lấy thất bại tan tành!',
    dichTho: [
      'Sông núi nước Nam, vua Nam ở,',
      'Rành rành định phận tại sách trời.',
      'Cớ sao lũ giặc sang xâm phạm,',
      'Chúng bay sẽ bị đánh tơi bời.'
    ],
    poem: [
      '“Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.”'
    ],
    illustrationCaption: 'Minh họa di sản: Chiếu thư Nam Quốc Sơn Hà & sóng nước sông Như Nguyệt (1077)'
  },

  thanh_giong: {
    title: 'Thánh Gióng',
    author: 'Truyền thuyết dân gian Việt Nam',
    years: 'Thời đại Hùng Vương',
    publicationYear: 'Văn Lang',
    historicalPeriod: 'Thời đại Hùng Vương (Văn Lang) • Sử thi chống ngoại xâm',
    styleTheme: 'da_reu_phong',
    badgeLabel: 'PHÙ ĐỔNG • VĂN LANG',
    summary: 'Truyền thuyết anh hùng ca thời đại Hùng Vương kể về Phù Đổng Thiên Vương vươn vai thành tráng sĩ, cưỡi ngựa sắt đánh tan giặc Ân — biểu tượng bất diệt cho tinh thần quật cường và khát vọng giữ nước.',
    researchText: 'Hình tượng Thánh Gióng (Phù Đổng Thiên Vương) kết tinh sức mạnh đoàn kết toàn dân của cư dân Văn Lang: sinh ra từ sự kỳ lạ nơi đồng ruộng, lớn lên nhờ cơm cà của bà con làng Phù Đổng, cất tiếng nói đầu tiên vì giang sơn lâm nguy. Sau khi nhổ tre đằng ngà quét sạch giặc Ân, Gióng cởi giáp sắt trên đỉnh Sóc Sơn bay về trời, tượng trưng cho lý tưởng cứu nước vô tư, không màng danh lợi.',
    biography: 'Lưu truyền trong kho tàng truyền thuyết thời Hùng Vương dựng nước, gắn với lễ hội Gióng ở Phù Đổng và đền Sóc Sơn — Di sản Văn hóa Phi vật thể đại diện của nhân loại được UNESCO vinh danh.',
    poem: [
      '“Ông về tâu với Vua đúc cho ta một con ngựa sắt,',
      'Làm cho ta một cái roi sắt và một tấm áo giáp sắt,',
      'Ta sẽ phá tan lũ giặc này!”'
    ],
    illustrationCaption: 'Minh họa di sản: Mặt trời Đông Sơn, tre đằng ngà và vó ngựa sắt Sóc Sơn'
  },

  son_tinh_thuy_tinh: {
    title: 'Sơn Tinh – Thủy Tinh',
    author: 'Truyền thuyết dân gian Việt Nam',
    years: 'Thời Hùng Vương thứ XVIII',
    publicationYear: 'Văn Lang',
    historicalPeriod: 'Thần thoại & Truyền thuyết Cổ đại • Thời Hùng Vương',
    styleTheme: 'da_reu_phong',
    badgeLabel: 'TẢN VIÊN • VĂN LANG',
    summary: 'Bản thần thoại hùng tráng giải thích hiện tượng lũ lụt hằng năm ở đồng bằng Bắc Bộ, ngợi ca sức mạnh dời non trị thủy và khát vọng chinh phục thiên nhiên của người Việt cổ.',
    researchText: 'Cuộc đối đầu bất tận giữa Tản Viên Sơn Thánh và Thủy Tinh hô phong hoán vũ phản ánh công cuộc đắp đê trị thủy bền bỉ của cư dân nông nghiệp lúa nước sông Hồng qua hàng nghìn năm lịch sử.',
    biography: 'Truyền thuyết cổ đại thuộc hệ thống thần tích Tản Viên Sơn Thánh — một trong Tứ Bất Tử của tín ngưỡng dân gian Việt Nam.',
    poem: [
      '“Núi cao sông hãy còn dài,',
      'Năm năm báo oán đời đời đánh ghen.”'
    ]
  },

  an_duong_vuong: {
    title: 'An Dương Vương & Mỵ Châu – Trọng Thủy',
    author: 'Truyền thuyết Cổ Loa',
    years: 'Thế kỷ III–II TCN',
    publicationYear: 'Âu Lạc',
    historicalPeriod: 'Thời kỳ Âu Lạc • Kinh đô Cổ Loa',
    styleTheme: 'da_reu_phong',
    badgeLabel: 'CỔ LOA • ÂU LẠC',
    summary: 'Truyền thuyết lịch sử về công cuộc xây thành Cổ Loa, chế tạo nỏ thần Kim Quy giữ nước Âu Lạc và bi kịch mất nước do mất cảnh giác trước âm mưu giặc ngoại xâm.',
    researchText: 'Với hình tượng nỏ thần Linh Quang Kim Quy và giếng ngọc rửa ngọc trai nơi thành ốc Cổ Loa, tác phẩm truyền lại bài học lịch sử sâu sắc về mối quan hệ giữa tình nhà và vận nước, tinh thần cảnh giác bảo vệ độc lập dân tộc.',
    biography: 'Truyền thuyết gắn liền với di tích lịch sử quốc gia đặc biệt Cổ Loa (Đông Anh, Hà Nội) — kinh đô nhà nước Âu Lạc thời Thục Phán An Dương Vương.',
    poem: [
      '“Nỏ thần vô ý trao tay giặc,',
      'Nên nỗi cơ đồ đắm biển sâu.”'
    ],
    sections: [
      {
        id: 'ky_tich_co_loa',
        roman: 'I',
        title: '1. Kỳ tích Cổ Loa & Đài Uy Quyền Âu Lạc',
        content: 'Sau khi hợp nhất các bộ lạc Tây Âu và Lạc Việt thành nhà nước Âu Lạc vững mạnh, Thục Phán An Dương Vương dời đô từ Phong Châu về đồng bằng Cổ Loa. Tại đây, ngài chỉ huy đắp lũy xây thành hình xoắn ốc 9 vòng dài gần 16km, hào sâu nối thông sông Hoàng, tạo nên pháo đài quân sự liên hoàn thủy bộ kiên cố bậc nhất phương Nam thời cổ đại.'
      },
      {
        id: 'no_than_lien_chau',
        roman: 'II',
        title: '2. Nỏ Thần Liên Châu & Vuốt Rùa Vàng Kim Quy',
        content: 'Thần Kim Quy hiện lên trợ giúp trừ yêu ma bạch kê tinh và trao chiếc vuốt vàng thiêng. Tướng quân Cao Lỗ phụng mệnh chế tác nỏ thần “Linh Quang Kim Quy Thần Cơ”, mỗi phát bắn tung ra hàng vạn mũi tên đồng ba cạnh, đẩy lui quân Triệu Đà xâm lược, lập nên chiến công vang dội giữ vững bờ cõi Âu Lạc.'
      },
      {
        id: 'bi_kich_canh_giac',
        roman: 'III',
        title: '3. Bi kịch Mị Châu – Trọng Thủy & Bài học cảnh giác',
        content: 'Mối bang giao hòa hiếu bị kẻ thù lợi dụng qua cuộc hôn nhân Trọng Thủy – Mị Châu nhằm do thám bí mật quân sự. Khi lẫy nỏ thần bị đánh tráo âm thầm, cơ đồ Âu Lạc sụp đổ trong chớp mắt. Tiếng thét đanh thép của Rùa Vàng bên bờ biển Dạ Sơn “Giặc ở sau lưng nhà ngươi đó!” trở thành bản cáo thị lịch sử muôn đời về sự cảnh giác trước ngoại xâm.'
      },
      {
        id: 'y_nghia_gieng_ngoc',
        roman: 'IV',
        title: '4. Ý nghĩa Giếng Ngọc & Hạt ngọc trai Biển Đông',
        content: 'Máu của Mị Châu rơi xuống biển biến thành hạt minh châu ngọc trai, đem rửa trong làn nước Giếng Ngọc Cổ Loa nơi Trọng Thủy trầm mình thì tỏa ánh sáng long lanh. Hình ảnh Giếng Ngọc và ngọc trai Biển Đông không chỉ hóa giải nỗi oan khuất mà còn là biểu tượng nghệ thuật bất tử minh chứng cho tấm lòng trinh bạch của người con gái Lạc Việt trước lịch sử.'
      }
    ]
  },

  an_duong_vuong_statue: {
    title: 'Tượng Đài Thục Phán An Dương Vương & Bệ Trống Đồng Đông Sơn',
    author: 'Truyền thuyết Cổ Loa & Khảo cổ học Đông Sơn',
    years: 'Thế kỷ III–II TCN',
    publicationYear: 'Âu Lạc',
    historicalPeriod: 'Văn hóa Đông Sơn • Nhà nước Âu Lạc',
    styleTheme: 'da_reu_phong',
    badgeLabel: 'AN DƯƠNG VƯƠNG • ĐÀI UY QUYỀN',
    summary: 'Tượng đài Vua An Dương Vương đứng uy nghiêm trên bệ đá Trống đồng Đông Sơn 3 tầng với mặt trời 14 tia, tượng trưng cho đỉnh cao vương quyền và chủ quyền độc lập của nhà nước Âu Lạc.',
    researchText: 'Pho tượng đồng An Dương Vương tay cầm kiếm lệnh, mắt hướng về phương Bắc, ngự trên đài trống đồng 14 tia rực rỡ và đài sen hoàng kim, xung quanh là 3 vòng thành xoắn ốc Loa Thành thu nhỏ thể hiện bản lĩnh quân sự và tầm nhìn chiến lược của vị minh quân dựng nước.',
    biography: 'Thục Phán An Dương Vương — vị vua sáng lập nhà nước Âu Lạc, người xây thành Cổ Loa và cùng tướng quân Cao Lỗ trang bị nỏ thần giữ nước.',
    poem: [
      '“Trăm năm công đức dựng âu vàng,',
      'Thành ốc ngàn thu bóng vững vàng.”'
    ],
    sections: [
      {
        id: 'ky_tich_co_loa',
        roman: 'I',
        title: '1. Kỳ tích Cổ Loa & Đài Uy Quyền Âu Lạc',
        content: 'Thục Phán An Dương Vương kế thừa truyền thống Hùng Vương, mở rộng không gian sinh tồn của người Việt cổ. Đài Uy Quyền trung tâm với bệ Trống đồng Đông Sơn ba tầng chạm nổi 14 tia mặt trời và chim Lạc bay ngược chiều kim đồng hồ là minh chứng hùng hồn cho nền văn minh đồng thau phát triển rực rỡ ở thế kỷ III TCN.'
      },
      {
        id: 'no_than_lien_chau',
        roman: 'II',
        title: '2. Nỏ Thần Liên Châu & Vuốt Rùa Vàng Kim Quy',
        content: 'Bên cạnh tài năng trị nước, An Dương Vương biết trọng dụng nhân tài như tướng quân Cao Lỗ để đúc đồng, rèn vũ khí và chế tác nỏ thần Kim Quy. Sức mạnh quân sự thần kỳ ấy đã giúp Âu Lạc đập tan mưu đồ xâm lược của đế chế phương Bắc trong suốt nhiều năm.'
      },
      {
        id: 'bi_kich_canh_giac',
        roman: 'III',
        title: '3. Bi kịch Mị Châu – Trọng Thủy & Bài học cảnh giác',
        content: 'Sự cả tin và mất cảnh giác trước mưu sâu kế độc của kẻ thù đã dẫn đến thảm kịch mất nước. Khi nhận ra sự thật đau đớn bên bờ biển Dạ Sơn, vua đã dứt khoát vung gươm chém công chúa để giữ tròn đạo nghĩa và pháp luật quốc gia trước khi rẽ nước theo Thần Kim Quy về biển cả.'
      },
      {
        id: 'y_nghia_gieng_ngoc',
        roman: 'IV',
        title: '4. Ý nghĩa Giếng Ngọc & Hạt ngọc trai Biển Đông',
        content: 'Tượng vua hướng về bến bờ Dạ Sơn và Giếng Ngọc nhắc nhở hậu thế muôn đời: non sông gấm vóc chỉ trường tồn khi có lòng dân đồng thuận, vũ khí tinh nhuệ và tinh thần cảnh giác cách mạng không ngừng nghỉ.'
      }
    ]
  },

  an_duong_vuong_noThan: {
    title: 'Nỏ Thần Liên Châu – Linh Quang Kim Quy Thần Cơ',
    author: 'Văn học Sử thi & Khảo cổ học Quân sự Cổ Loa',
    years: 'Thế kỷ III–II TCN',
    publicationYear: 'Âu Lạc',
    historicalPeriod: 'Vũ khí học Cổ đại • Kỹ thuật Đúc đồng Đông Sơn',
    styleTheme: 'da_reu_phong',
    badgeLabel: 'NỎ THẦN LIÊN CHÂU • KIM QUY',
    summary: 'Tuyệt tác thần cơ vũ khí cổ đại của tướng quân Cao Lỗ chế tạo từ móng rùa vàng Kim Quy, bắn một phát ra muôn mũi tên đồng 3 cạnh, biểu tượng vô song cho sức mạnh quân sự Âu Lạc.',
    researchText: 'Nỏ thần Liên Châu (Linh Quang Thần Cơ) với lẫy vuốt Thần Rùa Vàng phát sáng rực rỡ là hiện thân của kỹ thuật cơ khí cổ đại vượt bậc. Hàng vạn mũi tên đồng 3 cạnh phát hiện tại Cầu Vực – Cổ Loa đã chứng minh huyền thoại nỏ thần hoàn toàn dựa trên cơ sở hiện thực lịch sử của tài năng chế tác vũ khí người Việt cổ.',
    biography: 'Sáng chế bởi tướng quân Cao Lỗ — công thần khai quốc, nhà quân sự kiệt xuất dưới triều vua Thục Phán An Dương Vương.',
    poem: [
      '“Một phát muôn tên bay rợp bóng,',
      'Quân thù khiếp vía rụng cờ gươm.”'
    ],
    sections: [
      {
        id: 'ky_tich_co_loa',
        roman: 'I',
        title: '1. Kỳ tích Cổ Loa & Đài Uy Quyền Âu Lạc',
        content: 'Thành Cổ Loa được thiết kế như một trận đồ liên hoàn phục vụ cho chiến thuật tác chiến của Nỏ Thần. Trên các bờ lũy cao uốn lượn hình xoắn ốc, các cung thủ Âu Lạc có thể kiểm soát toàn bộ tầm bắn khống chế các tuyến hào nước tiếp cận.'
      },
      {
        id: 'no_than_lien_chau',
        roman: 'II',
        title: '2. Nỏ Thần Liên Châu & Vuốt Rùa Vàng Kim Quy',
        content: 'Nỏ thần được tướng Cao Lỗ thiết kế đặc biệt: lẫy nỏ làm bằng vuốt rùa vàng có cơ chế nhả chốt giữ dây cung nhiều nấc, cho phép đặt hàng loạt mũi tên đồng ba cánh trên rãnh nỏ và phóng đi cùng một lúc với uy lực xuyên giáp khủng khiếp, tạo nên mật độ hỏa lực hủy diệt đối phương từ cự ly xa.'
      },
      {
        id: 'bi_kich_canh_giac',
        roman: 'III',
        title: '3. Bi kịch Mị Châu – Trọng Thủy & Bài học cảnh giác',
        content: 'Chiếc lẫy nỏ thần là bí mật an ninh quốc gia tối thượng. Việc Mị Châu cho Trọng Thủy xem trộm nỏ thần và để kẻ gian đánh tráo lẫy nỏ là bài học đau xót nhất về việc bảo mật phòng thủ, cho thấy vũ khí dù có uy lực vô song cũng trở nên vô dụng nếu bí mật rơi vào tay quân thù.'
      },
      {
        id: 'y_nghia_gieng_ngoc',
        roman: 'IV',
        title: '4. Ý nghĩa Giếng Ngọc & Hạt ngọc trai Biển Đông',
        content: 'Mất nỏ thần đồng nghĩa với việc mất nước. Giếng Ngọc Cổ Loa và đài Nỏ Thần hôm nay là đài tưởng niệm nhắc nhở mỗi công dân về trách nhiệm bảo vệ bí mật quốc gia và củng cố nền quốc phòng toàn dân vững chắc.'
      }
    ]
  },

  an_duong_vuong_giengNgoc: {
    title: 'Giếng Ngọc Cổ Loa & Hạt Minh Châu Biển Đông',
    author: 'Văn học Dân gian & Di tích Cổ Loa',
    years: 'Thế kỷ III–II TCN',
    publicationYear: 'Âu Lạc',
    historicalPeriod: 'Truyền thuyết Dân gian • Di tích Lịch sử Cổ Loa',
    styleTheme: 'da_reu_phong',
    badgeLabel: 'GIẾNG NGỌC CỔ LOA • MINH CHÂU',
    summary: 'Giếng nước thiêng trước cửa đền Cổ Loa và viên Minh Châu ngọc bích phát sáng, nơi kết tinh tình yêu bi thương và tấm lòng son sắt trong trắng của nàng Mị Châu trước lịch sử.',
    researchText: 'Nơi cửa đền Thục Phán tại Cổ Loa có giếng ngọc hình mắt rồng, gắn liền với bi kịch Trọng Thủy lao đầu tự vẫn. Câu chuyện ngọc trai Biển Đông rửa nước Giếng Ngọc Cổ Loa sáng bừng sắc ngọc là minh chứng huyền thoại khẳng định sự trong sạch và giải oan cho nàng công chúa bất hạnh.',
    biography: 'Gắn liền với di tích Giếng Trọng Thủy trước cửa Đền Thượng Cổ Loa và địa danh Dạ Sơn (Diễn Châu, Nghệ An).',
    poem: [
      '“Máu nàng hóa hạt minh châu,',
      'Giếng thiêng rửa ngọc xóa sầu ngàn năm.”'
    ],
    sections: [
      {
        id: 'ky_tich_co_loa',
        roman: 'I',
        title: '1. Kỳ tích Cổ Loa & Đài Uy Quyền Âu Lạc',
        content: 'Giếng Ngọc nằm ngay trước sân Đền Thượng Cổ Loa, tụ hội sinh khí của cả vùng đất địa linh nhân kiệt. Làn nước giếng quanh năm trong vắt như mắt rồng nhìn về hướng biển Dạ Sơn, nối liền không gian huyền thoại giữa kinh đô Cổ Loa và bờ biển phương Nam.'
      },
      {
        id: 'no_than_lien_chau',
        roman: 'II',
        title: '2. Nỏ Thần Liên Châu & Vuốt Rùa Vàng Kim Quy',
        content: 'Khi nỏ thần bị đánh tráo và kinh thành thất thủ, Mị Châu ngồi sau lưng ngựa vua cha, rứt lông chiếc áo lông ngỗng trắng rải dọc đường đi để chỉ lối cho chồng. Nàng hành động hoàn toàn vì nghĩa vợ chồng son sắt mà không hay biết mình đã tiếp tay cho quân giặc đuổi theo sát nút.'
      },
      {
        id: 'bi_kich_canh_giac',
        roman: 'III',
        title: '3. Bi kịch Mị Châu – Trọng Thủy & Bài học cảnh giác',
        content: 'Trước ngọn sóng biển Dạ Sơn, lời kết án của Rùa Vàng làm bừng tỉnh công chúa. Nàng khấn trời đất: “Thiếp là phận gái, nếu có lòng phản bội cha thì chết đi biến thành tro bụi; nếu một lòng trung hiếu bị người lừa dối thì chết đi biến thành châu ngọc để tẩy sạch mối nhục nhã”. Lời nguyền trinh liệt ấy đã được biển khơi chứng giám.'
      },
      {
        id: 'y_nghia_gieng_ngoc',
        roman: 'IV',
        title: '4. Ý nghĩa Giếng Ngọc & Hạt ngọc trai Biển Đông',
        content: 'Trọng Thủy ôm xác vợ về táng ở Loa Thành, ngày đêm thương nhớ rồi nhảy xuống giếng tự vẫn. Người đời sau mò được ngọc trai ở biển Dạ Sơn đem về rửa nước giếng này thì ngọc sáng lung linh kỳ lạ. Đó là sự bao dung cao cả của nhân dân, thấu hiểu tấm lòng trong trắng của Mị Châu đồng thời cảnh tỉnh muôn đời không để tình riêng làm mù quáng nghĩa nước.'
      }
    ]
  },

  su_tich_trau_cau: {
    title: 'Sự Tích Trầu Cau',
    author: 'Truyện cổ tích dân gian Việt Nam',
    years: 'Dân gian cổ đại',
    publicationYear: 'Dân gian',
    historicalPeriod: 'Văn học Dân gian • Thời Hồng Bàng',
    styleTheme: 'giay_do',
    badgeLabel: 'CỔ TÍCH • TRẦU CAU',
    summary: 'Câu chuyện cảm động về tình anh em họ Cao và nghĩa vợ chồng son sắt hóa thành cây cau, tảng đá vôi và dây trầu quấn quýt, khởi nguồn phong tục ăn trầu Việt Nam.',
    researchText: '“Miếng trầu là đầu câu chuyện” — qua ba sự hóa thân kỳ diệu tạo nên sắc đỏ thắm khi quyện hòa vôi, cau, trầu, tác phẩm tôn vinh tình cảm gia đình thủy chung, hòa thuận trong văn hóa truyền thống Việt.',
    biography: 'Truyện cổ tích thần kỳ tiêu biểu trong kho tàng văn học dân gian Việt Nam, gắn với phong tục cưới hỏi và lễ nghi cổ truyền.',
    poem: [
      '“Quả cau nho nhỏ miếng trầu hôi,',
      'Này của Xuân Hương mới quệt rồi.”'
    ]
  },

  de_dat_de_nuoc: {
    title: 'Đẻ Đất Đẻ Nước',
    author: 'Sử thi dân tộc Mường',
    years: 'Dân gian cổ đại',
    publicationYear: 'Sử thi Mo Mường',
    historicalPeriod: 'Sử thi Dân tộc Cổ đại • Văn hóa Hòa Bình',
    styleTheme: 'da_reu_phong',
    badgeLabel: 'SỬ THI MƯỜNG',
    summary: 'Bộ sử thi hoành tráng của dân tộc Mường kể về hành trình khai thiên lập địa, cây Chu Đồng vũ trụ, nguồn gốc muôn loài và tổ tiên người Việt – Mường thuở hồng hoang.',
    researchText: 'Được truyền tụng qua diễn xướng Mo Mường hàng nghìn câu thơ cổ, “Đẻ đất đẻ nước” phản ánh thế giới quan nguyên thủy, khát vọng làm chủ tự nhiên và mối gắn kết cội nguồn giữa các dân tộc anh em.',
    biography: 'Di sản sử thi truyền miệng đồ sộ của đồng bào Mường vùng Hòa Bình – Thanh Hóa.',
    poem: [
      '“Thuở ấy đất còn chưa có đất, nước còn chưa có nước,',
      'Cây Chu Đồng vươn cành nâng đỡ cả bầu trời...”'
    ]
  },

  truyen_kieu: {
    title: 'Truyện Kiều',
    author: 'Nguyễn Du',
    years: '1765–1820',
    publicationYear: 'Đầu thế kỷ XIX',
    historicalPeriod: 'Văn học Trung đại • Truyện thơ Nôm lục bát',
    styleTheme: 'lua_hoang_kim',
    badgeLabel: 'ĐOẠN TRƯỜNG TÂN THANH',
    summary: 'Kiệt tác 3.254 câu thơ lục bát chữ Nôm của Đại thi hào Nguyễn Du, kết tinh đỉnh cao ngôn ngữ tiếng Việt và tiếng kêu thương nhân đạo sâu sắc trước số phận con người.',
    researchText: 'Từ bi kịch mười lăm năm lưu lạc của Thúy Kiều — người con gái tài sắc vẹn toàn bị vùi dập bởi lễ giáo phong kiến và thế lực đồng tiền — Nguyễn Du nâng lên tầm khái quát phổ quát về chữ “Tâm”, chữ “Tài” và khát vọng tự do công lý.',
    biography: 'Nguyễn Du (1765–1820), tự Tố Như, hiệu Thanh Hiên, quê Tiên Điền (Nghi Xuân, Hà Tĩnh), được UNESCO tôn vinh là Danh nhân văn hóa thế giới.',
    poem: [
      '“Trăm năm trong cõi người ta,',
      'Chữ tài chữ mệnh khéo là ghét nhau.',
      'Trải qua một cuộc bể dâu,',
      'Những điều trông thấy mà đau đớn lòng.”'
    ]
  },

  hich_tuong_si: {
    title: 'Hịch Tướng Sĩ',
    author: 'Trần Quốc Tuấn',
    years: '1228–1300',
    publicationYear: 'Khoảng 1284',
    historicalPeriod: 'Thời Trần • Kháng chiến chống Nguyên Mông lần II',
    styleTheme: 'lua_hoang_kim',
    badgeLabel: 'HÀO KHÍ ĐÔNG A • 1284',
    summary: 'Áng văn chính luận mẫu mực của Hưng Đạo Đại Vương Trần Quốc Tuấn trước cuộc kháng chiến chống Nguyên Mông lần thứ hai, khơi dậy hào khí Đông A quyết chiến bảo vệ xã tắc.',
    researchText: 'Bằng lập luận sắc bén, cảm xúc cháy bỏng “tới bữa quên ăn, nửa đêm vỗ gối”, bài Hịch khích lệ ý chí tự lực tự cường, tinh thần trung quân ái quốc và kỷ luật quân đội nhà Trần để làm nên chiến thắng Bạch Đằng lẫy lừng.',
    biography: 'Hưng Đạo Đại Vương Trần Quốc Tuấn (1228–1300), Quốc công Tiết chế thống lĩnh quân đội Đại Việt ba lần đại thắng quân xâm lược Nguyên Mông.',
    poem: [
      '“Ta thường tới bữa quên ăn, nửa đêm vỗ gối, ruột đau như cắt, nước mắt đầm đìa…”'
    ]
  },

  binh_ngo_dai_cao: {
    title: 'Bình Ngô Đại Cáo',
    author: 'Nguyễn Trãi',
    years: '1380–1442',
    publicationYear: '1428',
    historicalPeriod: 'Thời Hậu Lê • Sau chiến thắng Lam Sơn (1428)',
    styleTheme: 'lua_hoang_kim',
    badgeLabel: 'THIÊN CỔ HÙNG VĂN • 1428',
    summary: 'Bản Tuyên ngôn Độc lập thứ hai do Nguyễn Trãi thừa lệnh Lê Lợi soạn thảo năm 1428, tổng kết cuộc kháng chiến chống Minh vĩ đại bằng tư tưởng nhân nghĩa sáng ngời.',
    researchText: 'Được mệnh danh là “Thiên cổ hùng văn”, Bình Ngô Đại Cáo khẳng định toàn diện nền văn hiến, lãnh thổ, phong tục và lịch sử riêng biệt của Đại Việt, đồng thời đề cao chân lý “lấy chí nhân để thay cường bạo”.',
    biography: 'Nguyễn Trãi (1380–1442), hiệu Ức Trai, nhà tư tưởng, anh hùng dân tộc và Danh nhân văn hóa thế giới.',
    poem: [
      '“Việc nhân nghĩa cốt ở yên dân,',
      'Quân điếu phạt trước lo trừ bạo.',
      'Như nước Đại Việt ta từ trước,',
      'Vốn xưng nền văn hiến đã lâu.”'
    ]
  },

  nguoi_con_gai_nam_xuong: {
    title: 'Chuyện Người Con Gái Nam Xương',
    author: 'Nguyễn Dữ',
    years: 'Thế kỷ XVI',
    publicationYear: 'Truyền kỳ mạn lục',
    historicalPeriod: 'Văn học Trung đại • Truyện truyền kỳ chữ Hán (Thế kỷ XVI)',
    styleTheme: 'lua_trang',
    badgeLabel: 'DẢI LỤA TRẮNG • THẾ KỶ XVI',
    summary: 'Thiên truyện truyền kỳ đỉnh cao trong “Truyền kỳ mạn lục” khắc họa nỗi oan khuất bi thương của nàng Vũ Nương bên bến Hoàng Giang, lên án chiến tranh phi nghĩa và lễ giáo nam quyền gia trưởng, đồng thời ngợi ca vẻ đẹp thủy chung của người phụ nữ Việt Nam xưa.',
    researchText: '“Chuyện người con gái Nam Xương” (Nam Xương nữ tử truyện) là thiên truyện thứ 16 trong “Truyền kỳ mạn lục” của Nguyễn Dữ (thế kỷ XVI). Qua nghệ thuật thắt nút – mở nút bậc thầy từ chiếc bóng trên vách tường và lời nói ngây thơ của bé Đản, cùng yếu tố kỳ ảo nơi thủy cung và Đàn Giải Oan bên sông Hoàng Giang, tác phẩm vừa tố cáo sâu sắc xã hội phong kiến vừa chan chứa giá trị nhân đạo.',
    biography: 'Nguyễn Dữ (sống vào khoảng thế kỷ XVI), quê huyện Trường Tân (nay thuộc Thanh Miện, Hải Dương). Xuất thân trong gia đình khoa bảng nhưng sớm từ quan lui về ẩn dật, ông dồn tâm huyết sáng tác tập “Truyền kỳ mạn lục” gồm 20 thiên truyện chữ Hán — được tôn vinh là “thiên cổ kỳ bút”.',
    sections: [
      {
        id: 'tac_gia_xuat_xu',
        roman: 'I',
        title: '1. Tác giả & Xuất xứ',
        content: 'Nguyễn Dữ sống vào khoảng thế kỷ XVI, quê ở huyện Trường Tân (Hải Dương); sớm chán ghét thế sự nhiễu nhương nên từ quan về ở ẩn. “Chuyện người con gái Nam Xương” (Nam Xương nữ tử truyện) là thiên truyện xuất sắc trong tập “Truyền kỳ mạn lục” gồm 20 thiên truyện viết bằng chữ Hán — kiệt tác giữ vị trí đỉnh cao của văn xuôi tự sự trung đại Việt Nam, được Vũ Khâm Lân ca ngợi là “thiên cổ kỳ bút”.'
      },
      {
        id: 'cot_truyen_chiec_bong',
        roman: 'II',
        title: '2. Cốt truyện & Ý nghĩa Chiếc Bóng',
        content: 'Nàng Vũ Thị Thiết (Vũ Nương) thủy chung, hiếu thảo; khi chồng là Trương Sinh đi lính, nàng một mình nuôi con thơ (bé Đản) và thường chỉ bóng mình trên vách nứa dưới ánh đèn dầu bảo con đó là cha Đản. Khi Trương Sinh trở về, lời nói ngây thơ của bé Đản (“người đàn ông đêm nào cũng đến…”) trở thành nút thắt bi kịch, khiến Trương Sinh nổi cơn ghen mù quáng, đẩy Vũ Nương phải gieo mình xuống sông Hoàng Giang tự vẫn. Chiếc bóng trên vách là nghệ thuật thắt nút – mở nút tài tình, biểu trưng cho sự mong manh của hạnh phúc trước thói đa nghi gia trưởng.'
      },
      {
        id: 'ky_ao_dan_giai_oan',
        roman: 'III',
        title: '3. Yếu tố Kỳ Ảo & Đàn Giải Oan',
        content: 'Dưới dòng Hoàng Giang, Vũ Nương được Linh Phi cứu sống đưa về thủy cung; nàng gửi lại chiếc trâm hoa vàng qua Phan Lang để Trương Sinh lập Đàn Giải Oan ba ngày ba đêm bên bến sông. Trong làn sương khói và ánh sáng lân tinh huyền ảo, Vũ Nương hiện về trên võng giá, cờ quạt lụa là nói lời vĩnh biệt: “Thiếp cảm ơn đức của Linh Phi, đã thề sống chết cũng không bỏ. Đa tạ tình chàng, thiếp chẳng thể trở về nhân gian được nữa” — rồi bóng nàng nhạt dần mà biến mất. Yếu tố kỳ ảo minh oan cho phẩm hạnh trong sạch nhưng vẫn khắc sâu bi kịch hạnh phúc không thể hàn gắn.'
      },
      {
        id: 'gia_tri_hien_thuc_nhan_dao',
        roman: 'IV',
        title: '4. Giá trị Hiện thực & Nhân đạo',
        content: 'Về giá trị hiện thực, tác phẩm tố cáo đanh thép chiến tranh phong kiến phi nghĩa gây cảnh sinh ly tử biệt và phơi bày sự bất công của lễ giáo nam quyền độc đoán, thói gia trưởng bạo tàn. Về giá trị nhân đạo, Nguyễn Dữ trân trọng ngợi ca vẻ đẹp đức hạnh, thủy chung, trọng danh dự của người phụ nữ Việt Nam xưa và cất lên tiếng khóc xót thương sâu sắc trước số phận oan nghiệt của họ.'
      }
    ],
    poem: [
      '“Thiếp cảm ơn đức của Linh Phi, đã thề sống chết cũng không bỏ.',
      'Đa tạ tình chàng, thiếp chẳng thể trở về nhân gian được nữa.”',
      '— Lời Vũ Nương bên Đàn Giải Oan (Truyền kỳ mạn lục, Nguyễn Dữ)'
    ],
    illustrationCaption: 'Minh họa di sản: Bóng Vũ Nương trên vách nứa, ngọn đèn dầu & Đàn Giải Oan bên bến Hoàng Giang'
  },

  chi_pheo: {
    title: 'Chí Phèo',
    author: 'Nam Cao',
    years: '1915–1951',
    publicationYear: '1941',
    historicalPeriod: 'Hiện thực phê phán (1930–1945) • Nông thôn Việt Nam',
    styleTheme: 'giay_do',
    badgeLabel: 'CHÍ PHÈO • 1941',
    summary: 'Truyện ngắn xuất sắc của Nam Cao khắc họa bi kịch bị cự tuyệt quyền làm người của Chí Phèo nơi làng Vũ Đại, cùng tiếng kêu đòi lương thiện nhức nhối lay động lòng người.',
    researchText: 'Bằng bút pháp tâm lý bậc thầy và chi tiết bát cháo hành Thị Nở đầy nhân văn, Nam Cao tố cáo xã hội thực dân phong kiến chà đạp nhân phẩm người lương thiện, đồng thời khẳng định niềm tin bất diệt vào bản tính tốt đẹp của con người.',
    biography: 'Nam Cao (1915–1951), tên thật Trần Hữu Tri, quê Lý Nhân (Hà Nam), nhà văn hiện thực lớn của văn học Việt Nam hiện đại.',
    poem: [
      '“Tao muốn làm người lương thiện!',
      'Ai cho tao lương thiện? Làm thế nào cho mất được những vết mảnh chai trên mặt này?”'
    ]
  },

  so_do: {
    title: 'Số Đỏ',
    author: 'Vũ Trọng Phụng',
    years: '1912–1939',
    publicationYear: '1936',
    historicalPeriod: 'Văn học Hiện thực Trào phúng (1930–1945)',
    styleTheme: 'giay_do',
    badgeLabel: 'SỐ ĐỎ • 1936',
    summary: 'Tiểu thuyết trào phúng bất hủ của Vũ Trọng Phụng, qua bước đường thăng tiến kỳ quặc của Xuân Tóc Đỏ để phơi bày toàn bộ sự lố lăng, giả dối của xã hội “Âu hóa” rởm đời.',
    researchText: 'Với tiếng cười châm biếm sắc lẹm và loạt nhân vật điển hình bất tử (Xuân Tóc Đỏ, Bà Phó Đoan, Văn Minh, Cố Hồng), “Số đỏ” vạch trần bản chất đồi bại, háo danh của tầng lớp thượng lưu thị dân thời thuộc địa.',
    biography: 'Vũ Trọng Phụng (1912–1939), “ông vua phóng sự đất Bắc”, nhà văn trào phúng bậc thầy của văn học Việt Nam thế kỷ XX.',
    poem: [
      '“Xuân Tóc Đỏ — từ kẻ nhặt banh quần vợt bước lên hàng vĩ nhân của phong trào Âu hóa rởm đời.”'
    ]
  },

  vo_nhat: {
    title: 'Vợ Nhặt',
    author: 'Kim Lân',
    years: '1920–2007',
    publicationYear: '1955 (viết từ 1945)',
    historicalPeriod: 'Văn học Hiện thực Cách mạng • Nạn đói 1945',
    styleTheme: 'giay_do',
    badgeLabel: 'VỢ NHẶT • 1945',
    summary: 'Truyện ngắn cảm động về anh cu Tràng “nhặt” được vợ giữa nạn đói khủng khiếp năm 1945, ca ngợi tình người ấm áp, lòng nhân hậu của bà cụ Tứ và khát vọng hướng về cách mạng.',
    researchText: 'Đặt nhân vật bên bờ vực cái chết nhưng Kim Lân lại làm bừng sáng niềm tin vào sự sống qua bát cháo cám ngày đói, ngọn đèn dầu hai hào và hình ảnh lá cờ đỏ sao vàng cùng đoàn người phá kho thóc Nhật.',
    biography: 'Kim Lân (1920–2007), tên thật Nguyễn Văn Tài, quê Từ Sơn (Bắc Ninh), nhà văn chuyên viết về nông thôn và người nông dân Việt Nam.',
    poem: [
      '“Trong óc Tràng vẫn thấy đám người đói và lá cờ đỏ bay phấp phới…”'
    ]
  },

  day_thon_vi_da: {
    title: 'Đây Thôn Vĩ Dạ',
    author: 'Hàn Mặc Tử',
    years: '1912–1940',
    publicationYear: '1938 (Rút từ tập Thơ Điên / Đau Thương)',
    historicalPeriod: 'Phong trào Thơ Mới (1932–1945) • Thi ca Tượng trưng – Siêu thực',
    styleTheme: 'ngoc_vi_da',
    badgeLabel: 'THƠ MỚI • 1938',
    subtitle: 'Hàn Mặc Tử (1912–1940) • Rút từ tập “Thơ Điên” (Đau Thương) • 1938',
    summary: 'Thi phẩm kiệt xuất của Hàn Mặc Tử khắc họa bức tranh xứ Huế từ ánh nắng ban mai tinh khôi nơi vườn Vĩ Dạ đến bến sông trăng chia lìa và cõi sương khói mộng ảo, kết tinh khát vọng sống và tình yêu con người tha thiết.',
    researchText: 'Sáng tác năm 1938 từ kỷ niệm mối tình đơn phương với Hoàng Thị Kim Cúc và tấm bưu ảnh xứ Huế gửi thăm khi thi sĩ lâm bệnh nặng tại Quy Nhơn, “Đây thôn Vĩ Dạ” đi từ ban mai rạng rỡ (“nắng hàng cau nắng mới lên”, “xanh như ngọc”) sang đêm trăng sông Hương đầy dự cảm chia lìa (“gió theo lối gió, mây đường mây”, “thuyền ai đậu bến sông trăng đó”) rồi khép lại trong cõi sương khói hư ảo (“áo em trắng quá nhìn không ra”).',
    biography: 'Hàn Mặc Tử (1912–1940), tên thật Nguyễn Trọng Trí, quê Lệ Thủy (Quảng Bình), lớn lên ở Quy Nhơn và từng gắn bó sâu nặng với Huế. Ông là một trong những thi sĩ tài hoa, độc đáo bậc nhất của phong trào Thơ Mới với hồn thơ vừa tinh khôi lãng mạn vừa đau đớn siêu thực.',
    sections: [
      {
        id: 'tac_gia_hoan_canh',
        roman: 'I',
        title: '1. Tác giả & Hoàn cảnh ra đời',
        content: 'Hàn Mặc Tử (1912–1940, tên thật Nguyễn Trọng Trí) là gương mặt sáng tạo kiệt xuất của phong trào Thơ Mới, người mở lối cho thi pháp Tượng trưng – Siêu thực Việt Nam. Năm 1938, khi đang chống chọi với căn bệnh phong nghiệt ngã tại Quy Nhơn, thi sĩ nhận được tấm bưu ảnh phong cảnh sông Hương – Vĩ Dạ cùng lời thăm hỏi của Hoàng Thị Kim Cúc (người con gái Huế ông từng thầm thương). Xúc động trước kỷ niệm thanh xuân và nỗi mặc cảm chia lìa, ông viết “Đây thôn Vĩ Dạ” (in trong tập “Thơ Điên”, sau đổi tên thành “Đau Thương”).'
      },
      {
        id: 'nguyen_tac_phan_tich_3_kho',
        roman: 'II',
        title: '2. Nguyên tác & Phân tích 3 khổ thơ',
        content: 'Bài thơ gồm 3 khổ thơ thất ngôn vận động theo dòng tâm tưởng từ thực tại ban mai tươi sáng sang mộng ảo đêm trăng và cõi hoài nghi hư vô: Khổ 1 mở ra bằng lời trách yêu dịu dàng (“Sao anh không về chơi thôn Vĩ?”) cùng bức tranh vườn Vĩ Dạ tinh khôi trong “nắng mới lên”, sắc lá “mướt quá xanh như ngọc” và nét duyên thầm “lá trúc che ngang mặt chữ điền”. Khổ 2 chuyển đột ngột sang không gian chia lìa của gió mây đôi ngả, “dòng nước buồn thiu, hoa bắp lay” và khát vọng khắc khoải trước chuyến “thuyền ai đậu bến sông trăng đó / Có chở trăng về kịp tối nay?”. Khổ 3 chìm vào mộng tưởng xa xăm: hình bóng “khách đường xa” với tà “áo em trắng quá nhìn không ra” nhòa dần trong “sương khói mờ nhân ảnh”, khép lại bằng câu hỏi day dứt “Ai biết tình ai có đậm đà?”.'
      },
      {
        id: 'nghe_thuat_tho_moi_tuong_trung',
        roman: 'III',
        title: '3. Nghệ thuật Thơ Mới & Bút pháp Tượng trưng - Siêu thực',
        content: 'Thi phẩm kết hợp hài hòa giữa bút pháp tả cảnh ngụ tình cổ điển và cảm hứng Tượng trưng – Siêu thực táo bạo của Thơ Mới. Chuỗi câu hỏi tu từ liên tiếp ở cả ba khổ thơ (“Sao anh không về…”, “Có chở trăng về…”, “Ai biết tình ai…”) tạo nên âm điệu băn khoăn, khắc khoải như tiếng độc thoại nội tâm. Hệ thống hình ảnh vừa gợi cảm giác thị giác – xúc giác tinh tế (“nắng mới lên”, “mướt quá xanh như ngọc”), vừa biến ảo phi thực (“sông trăng”, “chở trăng về”, “áo em trắng quá nhìn không ra”, “sương khói mờ nhân ảnh”), khiến cảnh vật xứ Huế hóa thành cảnh giới của tâm trạng và ký ức.'
      },
      {
        id: 'gia_tri_nhan_van',
        roman: 'IV',
        title: '4. Giá trị Nhân văn',
        content: 'Vượt lên trên bi kịch bệnh tật nghiệt ngã và mặc cảm bị tách rời khỏi thế giới bên ngoài, “Đây thôn Vĩ Dạ” là tiếng nói của một tâm hồn yêu thiên nhiên, yêu con người và khao khát giao cảm với cuộc đời đến cháy bỏng, đau đớn. Mỗi ánh nắng hàng cau, mỗi mảnh trăng trên sông Hương hay bóng áo trắng thấp thoáng đều biểu trưng cho niềm tin, lòng trân trọng vẻ đẹp thuần khiết và khát vọng được nhớ thương, thấu hiểu của con người trước ranh giới hữu hạn của số phận.'
      }
    ],
    poem: [
      'Sao anh không về chơi thôn Vĩ?',
      'Nhìn nắng hàng cau nắng mới lên.',
      'Vườn ai mướt quá xanh như ngọc,',
      'Lá trúc che ngang mặt chữ điền.',
      '',
      'Gió theo lối gió, mây đường mây,',
      'Dòng nước buồn thiu, hoa bắp lay...',
      'Thuyền ai đậu bến sông trăng đó,',
      'Có chở trăng về kịp tối nay?',
      '',
      'Mơ khách đường xa, khách đường xa,',
      'Áo em trắng quá nhìn không ra...',
      'Ở đây sương khói mờ nhân ảnh,',
      'Ai biết tình ai có đậm đà?'
    ],
    quote: '“Ở đây sương khói mờ nhân ảnh, / Ai biết tình ai có đậm đà?” — Hàn Mặc Tử (Đây thôn Vĩ Dạ, 1938)',
    illustrationCaption: 'Minh họa di sản: Vườn Vĩ Dạ nắng mới hàng cau, bến sông trăng xứ Huế & bóng áo trắng trong sương khói'
  }
};

function parseAuthorAndYears(rawAuthor = '') {
  const str = String(rawAuthor || '').normalize('NFC').trim();
  const match = str.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return {
      author: match[1].trim() || str,
      years: match[2].trim()
    };
  }
  return {
    author: str || 'Dân gian Việt Nam',
    years: ''
  };
}

function defaultThemeForItem(item) {
  if (!item) return 'giay_do';
  if (item.floor === 1) return 'da_reu_phong';
  if (item.floor === 2) return 'lua_hoang_kim';
  return 'giay_do';
}

function getFloorLabel(floor) {
  if (floor === 1) return 'TẦNG 1 • VĂN HỌC DÂN GIAN & SỬ THI';
  if (floor === 2) return 'TẦNG 2 • VĂN HỌC TRUNG ĐẠI';
  if (floor === 3) return 'TẦNG 3 • VĂN HỌC CẬN – HIỆN ĐẠI';
  return 'BẢO TÀNG VĂN HỌC VIỆT NAM';
}

/**
 * Tổng hợp một hồ sơ bảng thông tin chuẩn hóa cho một mục trong LITERATURE_REGISTRY
 */
export function synthesizeRoomPlaqueEntry(item) {
  if (!item || !item.id) return null;
  const override = CANONICAL_ROOM_PROFILES[item.id] || {};
  const parsed = parseAuthorAndYears(item.author);

  const title = (override.title || item.name || item.id).normalize('NFC');
  const author = (override.author || parsed.author).normalize('NFC');
  const years = (override.years || parsed.years || '').normalize('NFC');
  const publicationYear = (override.publicationYear || '').normalize('NFC');
  const historicalPeriod = (override.historicalPeriod || item.era || '').normalize('NFC');
  const styleTheme = normalizePlaqueStyleTheme(override.styleTheme || defaultThemeForItem(item));
  const themeMeta = PLAQUE_STYLE_THEMES[styleTheme] || PLAQUE_STYLE_THEMES.giay_do;

  const yearPart = years ? ` (${years})` : '';
  const pubPart = publicationYear && publicationYear !== years ? ` • ${publicationYear}` : '';
  const subtitle = (
    override.subtitle ||
    `${author}${yearPart} • ${historicalPeriod}${pubPart}`
  ).normalize('NFC');

  const summary = (override.summary || item.quote || '').normalize('NFC');
  const researchText = (override.researchText || override.description || item.quote || summary).normalize('NFC');
  const biography = (override.biography || `${author}${yearPart} — ${historicalPeriod}`).normalize('NFC');

  const pose = getRoomWorldPose(item);
  const roomCode = pose.roomCode || getRoomCode(item);
  const roomTag = `${getFloorLabel(pose.floor)} • PHÒNG ${roomCode} • ${title.toUpperCase()}`;
  const badgeLabel = (override.badgeLabel || themeMeta.badgeDefault).normalize('NFC');
  const sectorCode = `T${pose.floor}-G${pose.roomIndex + 1} (${roomCode}) • ${item.id.toUpperCase()}`;

  const illustrationUrl = override.illustrationUrl || generateHeritageIllustrationDataUri({
    id: item.id,
    title,
    styleTheme,
    badgeLabel
  });

  const entry = {
    id: item.id,
    roomId: item.id,
    plaqueId: `plaque_${item.id}`,
    loreKey: `plaque_${item.id}`,
    floor: pose.floor,
    roomIndex: pose.roomIndex,
    roomCode,
    alcoveName: pose.alcoveName,
    worldPose: {
      x: pose.x,
      y: pose.y,
      z: pose.z,
      rotY: pose.rotY,
      isNorthHall: pose.isNorthHall
    },
    room: roomTag,
    title,
    author,
    years,
    publicationYear,
    historicalPeriod,
    subtitle,
    summary,
    description: researchText,
    researchText,
    biography,
    sections: Array.isArray(override.sections) ? override.sections : null,
    poem: Array.isArray(override.poem) ? override.poem : (item.quote ? [`“${item.quote}”`] : []),
    quote: override.quote ? String(override.quote).normalize('NFC') : null,
    hanzi: override.hanzi || null,
    phonetic: override.phonetic || null,
    dichNghia: override.dichNghia || null,
    dichTho: override.dichTho || null,
    styleTheme,
    badgeLabel,
    sectorCode,
    themeColor: item.themeColor || 0xd4a64a,
    illustrationUrl,
    illustrationCaption: (override.illustrationCaption || `Minh họa trưng bày: ${title}`).normalize('NFC'),
    visualMeta: {
      accentColor: themeMeta.accentColor,
      borderColor: themeMeta.borderColor,
      woodTone: themeMeta.woodTone,
      themeLabel: themeMeta.label
    }
  };

  return entry;
}

/**
 * Tổng hợp toàn bộ 15 bảng thông tin cho LITERATURE_REGISTRY
 */
export function synthesizeAllRoomPlaques(registry = LITERATURE_REGISTRY) {
  const entries = [];
  for (let i = 0; i < registry.length; i++) {
    const entry = synthesizeRoomPlaqueEntry(registry[i]);
    if (entry) entries.push(entry);
  }
  return entries;
}

export const SYNTHESIZED_ROOM_LORE = {};
export const PLAQUE_LORE_DATABASE = {};

const ALL_ENTRIES = synthesizeAllRoomPlaques(LITERATURE_REGISTRY);
for (let i = 0; i < ALL_ENTRIES.length; i++) {
  const e = ALL_ENTRIES[i];
  SYNTHESIZED_ROOM_LORE[e.roomId] = e;
  PLAQUE_LORE_DATABASE[e.roomId] = e;
  PLAQUE_LORE_DATABASE[e.plaqueId] = e;
}

// Bổ sung các sub-key hiện vật chuyên sâu cho Phòng 204 (Chuyện Người Con Gái Nam Xương)
const namXuongBase = PLAQUE_LORE_DATABASE.nguoi_con_gai_nam_xuong;
if (namXuongBase) {
  PLAQUE_LORE_DATABASE.nam_xuong_vu_nuong = {
    ...namXuongBase,
    id: 'nam_xuong_vu_nuong',
    loreKey: 'nam_xuong_vu_nuong',
    title: 'Nàng Vũ Nương & Chiếc Bóng Trên Vách Nứa',
    subtitle: 'Bi kịch thắt nút – mở nút từ ánh đèn dầu khuya và lời ngây thơ của bé Đản',
    badgeLabel: 'CHIẾC BÓNG • VŨ NƯƠNG',
    illustrationUrl: generateHeritageIllustrationDataUri({
      id: 'nam_xuong_vu_nuong',
      title: 'Vũ Nương & Chiếc Bóng Trên Vách',
      styleTheme: 'lua_trang',
      badgeLabel: 'CHIẾC BÓNG • VŨ NƯƠNG'
    }),
    illustrationCaption: 'Minh họa di sản: Ánh đèn dầu hắt bóng Vũ Nương khổng lồ lên vách nứa đơn sơ'
  };

  PLAQUE_LORE_DATABASE.nam_xuong_tram_vang = {
    ...namXuongBase,
    id: 'nam_xuong_tram_vang',
    loreKey: 'nam_xuong_tram_vang',
    title: 'Chiếc Trâm Vàng & Đàn Giải Oan Bến Hoàng Giang',
    subtitle: 'Tín vật thủy cung và lời vĩnh biệt bất tử trong làn sương lân tinh',
    badgeLabel: 'TRÂM VÀNG • GIẢI OAN',
    illustrationUrl: generateHeritageIllustrationDataUri({
      id: 'nam_xuong_tram_vang',
      title: 'Chiếc Trâm Vàng & Đàn Giải Oan',
      styleTheme: 'lua_trang',
      badgeLabel: 'TRÂM VÀNG • GIẢI OAN'
    }),
    illustrationCaption: 'Minh họa di sản: Chiếc Trâm Vàng lơ lửng trên Đàn Giải Oan giữa dòng Hoàng Giang'
  };

  // Bổ sung 4 mã Lore chuyên sâu cho Cõi Thế Giới Mở "Chuyện Người Con Gái Nam Xương"
  const createNamXuongRealmEntry = ({
    key,
    title,
    subtitle,
    badgeLabel = 'DẢI LỤA TRẮNG • TRUYỀN KỲ MẠN LỤC',
    summary,
    researchText,
    quote,
    illustrationTitle,
    illustrationCaption,
    sections
  }) => ({
    ...namXuongBase,
    id: key,
    loreKey: key,
    roomId: 'nguoi_con_gai_nam_xuong',
    room: 'CÕI THẾ GIỚI MỞ • CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG (NGUYỄN DỮ)',
    styleTheme: 'lua_trang',
    badgeLabel,
    title,
    subtitle,
    summary,
    researchText,
    poem: Array.isArray(namXuongBase.poem) ? [...namXuongBase.poem] : [],
    quote,
    sections,
    illustrationUrl: generateHeritageIllustrationDataUri({
      id: key,
      title: illustrationTitle || title,
      styleTheme: 'lua_trang',
      badgeLabel
    }),
    illustrationCaption
  });

  // 1. namxuong_realm_bia_lua: Bảng Thông Tin Lụa Trắng — Lối dẫn Triền Đê vào Gian Nhà
  PLAQUE_LORE_DATABASE.namxuong_realm_bia_lua = createNamXuongRealmEntry({
    key: 'namxuong_realm_bia_lua',
    title: 'Bảng Thông Tin Lụa Trắng — Lối Dẫn Triền Đê Vào Gian Nhà',
    subtitle: 'Tập “Truyền kỳ mạn lục” (Thế kỷ XVI), hoàn cảnh sáng tác & bi kịch oan khiên của người phụ nữ',
    badgeLabel: 'DẢI LỤA TRẮNG • TRUYỀN KỲ MẠN LỤC',
    summary: 'Cửa ngõ dẫn bước vào không gian văn học trung đại thế kỷ XVI bên triền đê sông Hoàng Giang: giới thiệu kiệt tác “Truyền kỳ mạn lục” của danh sĩ Nguyễn Dữ, hoàn cảnh thời đại tao loạn và thân phận trớ trêu của người phụ nữ trong xã hội phong kiến suy tàn.',
    researchText: 'Xuất thân Nho học nhưng sớm chán cảnh triều chính tao loạn thời Lê – Mạc phân tranh thế kỷ XVI, Nguyễn Dữ từ quan về ẩn dật bên núi rừng Thanh Tuyền và dồn hết tâm huyết sáng tác tập “Truyền kỳ mạn lục” gồm 20 thiên truyện. “Chuyện người con gái Nam Xương” là thiên truyện thứ 16, viết lại từ cốt tích dân gian “Vợ chàng Trương” nhưng được nâng tầm thành một kiệt tác tự sự mẫu mực, khắc họa nỗi oan bi thảm của nàng Vũ Nương và tiếng thở dài xót xa trước thân phận con người.',
    quote: '“Kẻ bạc mệnh này duyên phận hẩm hiu, chồng con rẫy bỏ, điều đâu bay buộc, tiếng chịu nhuốc nhơ, thần sông có linh, xin ngài chứng giám.” — Lời thề nguyền trinh bạch bên sông Hoàng Giang',
    illustrationTitle: 'Bảng Thông Tin Lụa Trắng Triền Đê Hoàng Giang',
    illustrationCaption: 'Minh họa di sản: Dải lụa trắng và bia tư liệu mở lối vào triền đê sông Hoàng Giang, gian nhà tranh vách nứa và bến nước giải oan',
    sections: [
      {
        id: 'tac_gia_hoan_canh',
        roman: 'I',
        title: '1. Tác giả Nguyễn Dữ & Hoàn cảnh sáng tác Truyền Kỳ Mạn Lục',
        content: 'Nguyễn Dữ sống vào khoảng thế kỷ XVI, quê ở huyện Trường Tân (nay thuộc Thanh Miện, Hải Dương), là học trò xuất sắc của Tuyết Giang Phu Tử Nguyễn Bỉnh Khiêm. Chứng kiến thời cuộc nhiễu nhương, các tập đoàn phong kiến tranh giành quyền lực làm đời sống nhân dân lầm than, ông chỉ làm quan một năm rồi lui về phụng dưỡng mẹ già nơi ẩn dật. Tập “Truyền kỳ mạn lục” (Ghi chép tản mạn những điều kỳ lạ được lưu truyền) gồm 20 thiên truyện viết bằng chữ Hán, được học giả Vũ Khâm Lân ca tụng là “thiên cổ kỳ bút” — áng văn kỳ lạ của muôn đời.'
      },
      {
        id: 'cot_truyen_that_mo_nut',
        roman: 'II',
        title: '2. Cốt truyện thắt nút - mở nút chiếc bóng định mệnh',
        content: 'Dựa trên truyện cổ tích “Vợ chàng Trương”, Nguyễn Dữ đã tái cấu trúc mạch tự sự với kỹ thuật thắt nút và mở nút bậc thầy. Vũ Nương — người con gái thùy mị, nết na, tư dung tốt đẹp — lấy Trương Sinh, con nhà hào phú nhưng ít học, đa nghi và hay ghen. Khi chồng đi lính, Vũ Nương một mình chăm sóc mẹ già, nuôi dạy con thơ. Chiếc bóng chỉ tay trên vách nứa lúc đêm khuya để dỗ con tưởng chừng là trò chơi vô hại, nhưng qua lời nói ngây thơ của bé Đản đã trở thành nút thắt oan nghiệt, đẩy nàng đến cái chết bi thương nơi bến Hoàng Giang.'
      },
      {
        id: 'yeu_to_ky_ao_thuy_cung',
        roman: 'III',
        title: '3. Yếu tố kỳ ảo Thủy Cung Linh Phi & Cõi Siêu Thực',
        content: 'Nguyễn Dữ mượn yếu tố hoang đường kỳ ảo để tiếp nối mạch truyện nơi trần thế: Vũ Nương trầm mình nhưng không chết, được các nàng tiên rùa và Linh Phi cứu vớt đưa về chốn thủy cung lộng lẫy. Thế giới thủy cung với cung điện san hô, ngọc trai và sự cưu mang của Linh Phi đối lập hoàn toàn với trần gian đầy nghi kỵ, lạnh lùng, tạo tiền đề cho sự kiện chiếc trâm vàng và Đàn Giải Oan linh thiêng.'
      },
      {
        id: 'gia_tri_nhan_dao_sau_sac',
        roman: 'IV',
        title: '4. Giá trị nhân đạo sâu sắc & Tấm lòng xót thương',
        content: 'Tác phẩm là tiếng chuông cảnh tỉnh trước thói gia trưởng nam quyền và chiến tranh phong kiến phi nghĩa đã cướp đi hạnh phúc gia đình. Đồng thời, ngòi bút nhân đạo của Nguyễn Dữ đã trân trọng ngợi ca phẩm giá trong sạch, lòng hiếu thảo, thủy chung son sắt của người phụ nữ, khẳng định danh dự của họ trường tồn cùng non sông đất nước.'
      }
    ]
  });

  // 2. namxuong_realm_den_dau: Gian Nhà Tranh & Chiếc Bóng Trên Vách
  PLAQUE_LORE_DATABASE.namxuong_realm_den_dau = createNamXuongRealmEntry({
    key: 'namxuong_realm_den_dau',
    title: 'Gian Nhà Tranh & Chiếc Bóng Trên Vách Nứa',
    subtitle: 'Nghệ thuật thắt nút oan tình từ lời thơ ngây của bé Đản & bi kịch nam quyền gia trưởng',
    badgeLabel: 'DẢI LỤA TRẮNG • TRUYỀN KỲ MẠN LỤC',
    summary: 'Không gian trung tâm của bi kịch gia đình: ngọn đèn dầu lay lắt giữa đêm đông, vách nứa đơn sơ in chiếc bóng định mệnh, lời nói ngây thơ của bé Đản và cơn ghen mù quáng của Trương Sinh đập tan tổ ấm bình dị.',
    researchText: 'Chi tiết chiếc bóng trên vách nứa là một sáng tạo nghệ thuật đặc sắc của văn học tự sự trung đại. Dưới ánh đèn dầu leo lắt, chiếc bóng vừa là biểu tượng cho tình mẫu tử tha thiết và nỗi nhớ thương chồng đằng đẵng của Vũ Nương, vừa là ngòi nổ kích hoạt sự hoài nghi ích kỷ của Trương Sinh. Lời ngây thơ của bé Đản (“Có một người đàn ông đêm nào cũng đến…”) biến chiếc bóng vô tội thành bằng chứng phản bội trong đầu óc hẹp hòi của người chồng gia trưởng.',
    quote: '“Đêm nào cha Đản cũng đến, mẹ Đản đi cũng đi, mẹ Đản ngồi cũng ngồi, nhưng chẳng bao giờ bế Đản cả.” — Lời nói ngây thơ thắt nút oan khiên',
    illustrationTitle: 'Gian Nhà Tranh & Chiếc Bóng Trên Vách',
    illustrationCaption: 'Minh họa di sản: Ánh đèn dầu le lói trong gian nhà tranh hắt bóng Vũ Nương khổng lồ lên vách nứa đơn sơ bên chiếc nôi ru',
    sections: [
      {
        id: 'tac_gia_hoan_canh',
        roman: 'I',
        title: '1. Tác giả Nguyễn Dữ & Hoàn cảnh sáng tác Truyền Kỳ Mạn Lục',
        content: 'Trong bối cảnh văn học thế kỷ XVI chịu ảnh hưởng sâu của Nho giáo chính thống, Nguyễn Dữ đã mạnh dạn đưa không gian gia đình bình dân vào trung tâm thiên truyện. Gian nhà tranh của Vũ Nương và Trương Sinh phản ánh chân thực nếp sống thôn dã Bắc Bộ thời kỳ nội chiến tao loạn, nơi hạnh phúc của người phụ nữ luôn treo lơ lửng trước biến thiên của thời cuộc và sự khắc nghiệt của lễ giáo phong kiến.'
      },
      {
        id: 'cot_truyen_that_mo_nut',
        roman: 'II',
        title: '2. Cốt truyện thắt nút - mở nút chiếc bóng định mệnh',
        content: 'Chiếc bóng xuất hiện hai lần với hai ý nghĩa đảo nghịch: Lần thứ nhất, khi Vũ Nương dỗ con dưới ánh đèn dầu (“bóng mình mà bảo là cha Đản”), chiếc bóng là giải pháp xoa dịu nỗi khao khát tình phụ tử của con thơ và làm vơi đi nỗi cô quạnh của người vợ chờ chồng — đây là chi tiết thắt nút định mệnh. Lần thứ hai, sau khi Vũ Nương đã tự vẫn, một đêm Trương Sinh ngồi bên đèn dầu bế con, bé Đản lại trỏ bóng chàng trên vách kêu “Cha Đản lại đến kia kìa!”, chàng mới bàng hoàng tỉnh ngộ nhận ra nỗi oan của vợ — đây là chi tiết mở nút muộn màng, đầy xót xa.'
      },
      {
        id: 'yeu_to_ky_ao_thuy_cung',
        roman: 'III',
        title: '3. Yếu tố kỳ ảo Thủy Cung Linh Phi & Cõi Siêu Thực',
        content: 'Ngay tại gian nhà tranh lạnh lẽo sau cái chết của vợ, Trương Sinh phải đối diện với khoảng trống vô tận không gì bù đắp nổi. Sự tương phản giữa căn lều tranh hoang lạnh nơi trần thế với thế giới thủy cung huyền bí sau này chính là đòn bẩy tư tưởng: nhân gian chật hẹp, tàn nhẫn không dung chứa nổi đức hạnh trinh bạch, buộc nàng phải nương náu ở một cõi kỳ ảo linh thiêng.'
      },
      {
        id: 'gia_tri_nhan_dao_sau_sac',
        roman: 'IV',
        title: '4. Giá trị nhân đạo sâu sắc & Tấm lòng xót thương',
        content: 'Qua bi kịch chiếc bóng, tác giả lên án gay gắt chế độ nam quyền độc đoán — nơi người đàn ông nắm giữ toàn quyền định đoạt số phận người phụ nữ mà không cần bất kỳ sự phân trần, tra xét công bằng nào. Vũ Nương dù đã dốc hết lời lẽ tha thiết van xin, hàng xóm làng giềng hết lòng thanh minh nhưng đều vô hiệu trước bức tường thành gia trưởng mù quáng.'
      }
    ]
  });

  // 3. namxuong_realm_dan_giai_oan: Đàn Giải Oan & Bến Sông Hoàng Giang
  PLAQUE_LORE_DATABASE.namxuong_realm_dan_giai_oan = createNamXuongRealmEntry({
    key: 'namxuong_realm_dan_giai_oan',
    title: 'Đàn Giải Oan & Bến Sông Hoàng Giang',
    subtitle: 'Chiếc Trâm Vàng tín vật, lập đàn ba ngày ba đêm trên bến nước & lời minh oan linh thiêng',
    badgeLabel: 'DẢI LỤA TRẮNG • TRUYỀN KỲ MẠN LỤC',
    summary: 'Nghi thức tâm linh giải tỏa nỗi oan khuất ngút trời: chiếc trâm vàng trao gửi qua Phan Lang, đàn tràng tế lễ ba ngày ba đêm bên bến sông Hoàng Giang, khói hương nghi ngút và ngọn nến hoa đăng soi rọi chân lý trinh bạch.',
    researchText: 'Bến Hoàng Giang — nơi Vũ Nương gieo mình tự vẫn để bảo toàn danh dự — trở thành không gian thiêng liêng để giải tỏa bi kịch. Nhờ cuộc hội ngộ kỳ ngộ giữa Phan Lang (người cùng làng) và Vũ Nương nơi thủy cung, chiếc trâm vàng hoa mai đã được gửi về nhân gian như một tín vật bất tử. Nghe lời trăng trối, Trương Sinh lập Đàn Giải Oan bên bờ sông ba ngày ba đêm với cờ quạt, đèn hoa, khói hương nghi ngút, thực hiện nghi thức sám hối và minh oan muộn màng.',
    quote: '“Lập đàn giải oan ba ngày ba đêm bên bến sông Hoàng Giang, đốt đèn hoa đăng, thiếp sẽ hiện về trong làn sương khói.” — Lời hẹn thề bên bến nước minh oan',
    illustrationTitle: 'Đàn Giải Oan Bến Sông Hoàng Giang',
    illustrationCaption: 'Minh họa di sản: Đàn Giải Oan nghi ngút khói hương trên bến sông Hoàng Giang với chiếc Trâm Vàng hoa mai lơ lửng giữa đèn hoa đăng',
    sections: [
      {
        id: 'tac_gia_hoan_canh',
        roman: 'I',
        title: '1. Tác giả Nguyễn Dữ & Hoàn cảnh sáng tác Truyền Kỳ Mạn Lục',
        content: 'Nguyễn Dữ vận dụng triết lý nhân quả và tín ngưỡng giải oan dân gian Việt Nam vào cấu trúc thiên truyện thứ 16 của “Truyền kỳ mạn lục”. Lễ cầu siêu giải oan là biểu hiện của khát vọng công lý và niềm tin vào lẽ phải trong tâm thức người Việt thời trung đại, nơi những linh hồn chịu oan khuất được giải thoát và gột rửa thanh danh.'
      },
      {
        id: 'cot_truyen_that_mo_nut',
        roman: 'II',
        title: '2. Cốt truyện thắt nút - mở nút chiếc bóng định mệnh',
        content: 'Nếu chi tiết chiếc bóng mở nút bi kịch trong nhận thức của Trương Sinh, thì Đàn Giải Oan bên sông Hoàng Giang là bước mở nút tối hậu trước toàn thể cộng đồng và đất trời. Sự thật không chỉ được phơi bày trong phạm vi một mái ấm mà được khẳng định công khai giữa bàn dân thiên hạ, trả lại phẩm giá trinh bạch tuyệt đối cho Vũ Nương.'
      },
      {
        id: 'yeu_to_ky_ao_thuy_cung',
        roman: 'III',
        title: '3. Yếu tố kỳ ảo Thủy Cung Linh Phi & Cõi Siêu Thực',
        content: 'Chiếc trâm vàng là chiếc cầu nối vật chất giữa cõi thực và cõi ảo, giữa trần gian và thủy phủ. Sự xuất hiện của tín vật này buộc Trương Sinh — người từng vô cùng gia trưởng và ngoan cố — phải tin vào câu chuyện kỳ ngộ dưới đáy nước, từ đó gạt bỏ hoàn toàn mọi nghi ngờ để lập đàn tràng sám hối trên bến sông.'
      },
      {
        id: 'gia_tri_nhan_dao_sau_sac',
        roman: 'IV',
        title: '4. Giá trị nhân đạo sâu sắc & Tấm lòng xót thương',
        content: 'Đàn Giải Oan là đỉnh cao nhân đạo của thiên truyện: nỗi oan được giải, phẩm giá được phục hồi trọn vẹn. Thế nhưng, đây cũng là một minh oan đượm màu bi kịch, bởi vì đàn tràng chỉ rửa được tiếng oan chứ không thể cứu sống người vợ hiền thảo, không thể chắp vá lại một gia đình đã tan vỡ vĩnh viễn.'
      }
    ]
  });

  // 4. namxuong_realm_thuy_cung: Đại Cảnh Thủy Cung & Vũ Nương Trở Về
  PLAQUE_LORE_DATABASE.namxuong_realm_thuy_cung = createNamXuongRealmEntry({
    key: 'namxuong_realm_thuy_cung',
    title: 'Đại Cảnh Thủy Cung & Vũ Nương Trở Về',
    subtitle: 'Thế giới Thủy tộc Linh Phi, kiệu hoa cờ quạt ẩn hiện giữa dòng sông rồi tan biến vĩnh hằng',
    badgeLabel: 'DẢI LỤA TRẮNG • TRUYỀN KỲ MẠN LỤC',
    summary: 'Khép lại thiên truyện bằng hình tượng kỳ vĩ và bi tráng: cung điện Thủy tộc tráng lệ của Linh Phi, Vũ Nương hiện về lộng lẫy trên kiệu hoa giữa làn sương khói sông Hoàng Giang, nói lời tạ từ nghẹn ngào rồi tan biến vào cõi vĩnh hằng.',
    researchText: 'Hình ảnh Vũ Nương ngồi trên chiếc kiệu hoa giữa dòng Hoàng Giang, theo sau là hơn năm mươi cỗ xe cờ tán lụa là rực rỡ, lấp lánh trong làn lân tinh xanh ngọc rồi nhạt dần và biến mất, là một trong những đoạn kết bi tráng nhất của văn học trung đại Việt Nam. Nguyễn Dữ đã bất tử hóa vẻ đẹp của người phụ nữ: nàng không thuộc về nhân gian hẹp hòi tàn bạo nữa mà đã hóa thân vào cõi bất tử, để lại sự ân hận khôn nguôi cho kẻ độc đoán.',
    quote: '“Thiếp cảm ơn đức của Linh Phi, đã thề sống chết cũng không bỏ. Đa tạ tình chàng, thiếp chẳng thể trở về nhân gian được nữa!” — Lời vĩnh biệt nghẹn ngào giữa dòng sông Hoàng Giang',
    illustrationTitle: 'Đại Cảnh Thủy Cung & Vũ Nương Ẩn Hiện',
    illustrationCaption: 'Minh họa di sản: Cung điện Thủy Cung rực rỡ lân tinh ngọc bích, kiệu hoa cờ quạt ẩn hiện trên sóng nước Hoàng Giang rồi mờ dần vào cõi mộng',
    sections: [
      {
        id: 'tac_gia_hoan_canh',
        roman: 'I',
        title: '1. Tác giả Nguyễn Dữ & Hoàn cảnh sáng tác Truyền Kỳ Mạn Lục',
        content: 'Kết thúc thiên truyện “Chuyện người con gái Nam Xương” là minh chứng tiêu biểu cho tài năng nghệ thuật của Nguyễn Dữ trong “Truyền kỳ mạn lục”. Khác với truyện dân gian thường cho nhân vật hồi sinh về sum họp gia đình, Nguyễn Dữ giữ nguyên hiện thực tàn khốc của sự sinh ly tử biệt, tạo nên chiều sâu triết lý và sức lay động mãnh liệt vượt thời gian.'
      },
      {
        id: 'cot_truyen_that_mo_nut',
        roman: 'II',
        title: '2. Cốt truyện thắt nút - mở nút chiếc bóng định mệnh',
        content: 'Nút thắt của bi kịch bắt đầu từ một chiếc bóng ảo trên vách nứa trần gian, và khép lại cũng bằng một bóng dáng ảo ảnh lộng lẫy trên mặt sông Hoàng Giang. Vòng tròn nghệ thuật chiếc bóng đã hoàn tất: chiếc bóng ở gian nhà tranh mang lại tai ương oan khốc, còn chiếc bóng kiệu hoa giữa dòng sông mang lại sự siêu thoát, thanh thản và vĩnh hằng cho người thiếu phụ đức hạnh.'
      },
      {
        id: 'yeu_to_ky_ao_thuy_cung',
        roman: 'III',
        title: '3. Yếu tố kỳ ảo Thủy Cung Linh Phi & Cõi Siêu Thực',
        content: 'Cõi Thủy Cung của Linh Phi được miêu tả như một thiên đường bù đắp cho những oan khuất trần gian: nơi đây có tình nghĩa thủy chung (Linh Phi nhớ ơn Phan Lang thả rùa), có sự chở che bao dung và không có sự dối lừa, ghen tuông hèn mọn. Lời thề “sống chết cũng không bỏ Linh Phi” của Vũ Nương khẳng định nàng coi trọng ân nghĩa cứu mạng hơn là quay về với một xã hội trần thế đã từng bức tử mình.'
      },
      {
        id: 'gia_tri_nhan_dao_sau_sac',
        roman: 'IV',
        title: '4. Giá trị nhân đạo sâu sắc & Tấm lòng xót thương',
        content: 'Cái vẫy tay từ biệt và sự tan biến của chiếc kiệu hoa giữa làn sương nước là bản cáo trạng đanh thép nhất: vết thương lòng mà lễ giáo phong kiến và sự hồ đồ gia trưởng gây ra là không thể hàn gắn. Dù có sám hối muộn màng bằng đàn tràng bạc triệu, hạnh phúc trần thế đã một lần vỡ nát thì vĩnh viễn không bao giờ có thể tìm lại được.'
      }
    ]
  });

  // Đăng ký alias và tiền tố cho toàn bộ 4 mã Lore cõi Nam Xương
  PLAQUE_LORE_DATABASE.nam_xuong_realm_bia_lua = PLAQUE_LORE_DATABASE.namxuong_realm_bia_lua;
  PLAQUE_LORE_DATABASE.plaque_namxuong_realm_bia_lua = PLAQUE_LORE_DATABASE.namxuong_realm_bia_lua;
  PLAQUE_LORE_DATABASE.plaque_nam_xuong_realm_bia_lua = PLAQUE_LORE_DATABASE.namxuong_realm_bia_lua;

  PLAQUE_LORE_DATABASE.nam_xuong_realm_den_dau = PLAQUE_LORE_DATABASE.namxuong_realm_den_dau;
  PLAQUE_LORE_DATABASE.plaque_namxuong_realm_den_dau = PLAQUE_LORE_DATABASE.namxuong_realm_den_dau;
  PLAQUE_LORE_DATABASE.plaque_nam_xuong_realm_den_dau = PLAQUE_LORE_DATABASE.namxuong_realm_den_dau;

  PLAQUE_LORE_DATABASE.nam_xuong_realm_dan_giai_oan = PLAQUE_LORE_DATABASE.namxuong_realm_dan_giai_oan;
  PLAQUE_LORE_DATABASE.plaque_namxuong_realm_dan_giai_oan = PLAQUE_LORE_DATABASE.namxuong_realm_dan_giai_oan;
  PLAQUE_LORE_DATABASE.plaque_nam_xuong_realm_dan_giai_oan = PLAQUE_LORE_DATABASE.namxuong_realm_dan_giai_oan;

  PLAQUE_LORE_DATABASE.nam_xuong_realm_thuy_cung = PLAQUE_LORE_DATABASE.namxuong_realm_thuy_cung;
  PLAQUE_LORE_DATABASE.plaque_namxuong_realm_thuy_cung = PLAQUE_LORE_DATABASE.namxuong_realm_thuy_cung;
  PLAQUE_LORE_DATABASE.plaque_nam_xuong_realm_thuy_cung = PLAQUE_LORE_DATABASE.namxuong_realm_thuy_cung;
}

// Bổ sung các sub-key hiện vật chuyên sâu cho Phòng 302 (Đây Thôn Vĩ Dạ)
const viDaBase = PLAQUE_LORE_DATABASE.day_thon_vi_da;
if (viDaBase) {
  PLAQUE_LORE_DATABASE.plaque_day_thon_vi_da = {
    ...viDaBase,
    id: 'plaque_day_thon_vi_da',
    loreKey: 'plaque_day_thon_vi_da'
  };

  PLAQUE_LORE_DATABASE.vida_vuon_vi_da = {
    ...viDaBase,
    id: 'vida_vuon_vi_da',
    loreKey: 'vida_vuon_vi_da',
    title: 'Vườn Vĩ Dạ Ban Mai & Nắng Hàng Cau',
    subtitle: '“Nhìn nắng hàng cau nắng mới lên / Vườn ai mướt quá xanh như ngọc” — Khổ 1, Đây Thôn Vĩ Dạ (1938)',
    badgeLabel: 'VƯỜN NGỌC • VĨ DẠ',
    illustrationUrl: generateHeritageIllustrationDataUri({
      id: 'vida_vuon_vi_da',
      title: 'Vườn Vĩ Dạ Nắng Mới Hàng Cau',
      styleTheme: 'ngoc_vi_da',
      badgeLabel: 'VƯỜN NGỌC • VĨ DẠ'
    }),
    illustrationCaption: 'Minh họa di sản: Nắng ban mai rọi qua khóm trúc và hàng cau xanh mướt như ngọc tại vườn Vĩ Dạ'
  };

  PLAQUE_LORE_DATABASE.vida_thuyen_trang = {
    ...viDaBase,
    id: 'vida_thuyen_trang',
    loreKey: 'vida_thuyen_trang',
    title: 'Bến Sông Trăng & Thuyền Nan Xứ Huế',
    subtitle: '“Thuyền ai đậu bến sông trăng đó / Có chở trăng về kịp tối nay?” — Khổ 2 & 3, Đây Thôn Vĩ Dạ (1938)',
    badgeLabel: 'SÔNG TRĂNG • THUYỀN NAN',
    illustrationUrl: generateHeritageIllustrationDataUri({
      id: 'vida_thuyen_trang',
      title: 'Bến Sông Trăng & Thuyền Nan',
      styleTheme: 'ngoc_vi_da',
      badgeLabel: 'SÔNG TRĂNG • THUYỀN NAN'
    }),
    illustrationCaption: 'Minh họa di sản: Thuyền nan đậu trên dòng sông trăng lấp lánh giữa làn sương khói xứ Huế'
  };

  // Bổ sung 4 mã Lore chuyên sâu cho Cõi Thế Giới Mở "Đây Thôn Vĩ Dạ"
  const createViDaRealmEntry = ({
    key,
    title,
    subtitle,
    badgeLabel,
    summary,
    researchText,
    quote,
    illustrationTitle,
    illustrationCaption,
    sections
  }) => ({
    ...viDaBase,
    id: key,
    loreKey: key,
    roomId: 'day_thon_vi_da',
    room: 'CÕI THẾ GIỚI MỞ • ĐÂY THÔN VĨ DẠ (HÀN MẶC TỬ)',
    styleTheme: 'ngoc_vi_da',
    badgeLabel,
    title,
    subtitle,
    summary,
    researchText,
    poem: Array.isArray(viDaBase.poem) ? [...viDaBase.poem] : [],
    quote,
    sections,
    illustrationUrl: generateHeritageIllustrationDataUri({
      id: key,
      title: illustrationTitle || title,
      styleTheme: 'ngoc_vi_da',
      badgeLabel
    }),
    illustrationCaption
  });

  PLAQUE_LORE_DATABASE.vida_realm_bia_ngo = createViDaRealmEntry({
    key: 'vida_realm_bia_ngo',
    title: 'Bia Đá Ngọc Bích & Khung Trúc Cổ — Đầu Lối Mòn Thôn Vĩ',
    subtitle: 'Tập “Thơ Điên” (1938), tấm bưu ảnh của Hoàng Thị Kim Cúc & hành trình 3 tầng tâm trạng',
    badgeLabel: 'BIA NGỌC BÍCH • THƠ ĐIÊN 1938',
    summary: 'Cửa ngõ bước vào thế giới nội tâm của Hàn Mặc Tử năm 1938: từ tấm bưu ảnh phong cảnh Vĩ Dạ do Hoàng Thị Kim Cúc gửi tặng khi thi sĩ dưỡng bệnh tại Quy Nhơn, bài thơ mở ra hành trình ba tầng tâm trạng từ ban mai rạng rỡ đến đêm trăng chia lìa và cõi sương khói mộng ảo.',
    researchText: 'Xuất bản trong tập “Thơ Điên” (1938, sau đổi tên thành “Đau Thương”), “Đây thôn Vĩ Dạ” khởi nguồn từ mối tình đơn phương thầm kín của Hàn Mặc Tử dành cho Hoàng Thị Kim Cúc khi ông làm việc tại Sở Đạc điền Quy Nhơn và từng gắn bó với Huế. Một tấm bưu ảnh chụp cảnh thuyền rẽ sóng sông Hương lúc hừng đông hay chiều tà cùng lời thăm hỏi muộn màng đã đánh thức cả miền ký ức, tạo nên một trong những kiệt tác bi tráng và trong trẻo nhất của Thơ Mới.',
    quote: '“Sao anh không về chơi thôn Vĩ? / Nhìn nắng hàng cau nắng mới lên.” — Hàn Mặc Tử (Thơ Điên, 1938)',
    illustrationTitle: 'Bia Đá Ngọc Bích Thôn Vĩ Dạ',
    illustrationCaption: 'Minh họa di sản: Khung trúc cổ và bia ngọc bích mở lối vào vườn Vĩ Dạ, bến sông trăng và cõi sương khói',
    sections: [
      {
        id: 'hoan_canh_tho_dien_1938',
        roman: 'I',
        title: '1. Hoàn cảnh Thơ Điên (1938) & Mối tình Hoàng Thị Kim Cúc',
        content: 'Năm 1938, khi căn bệnh phong quái ác buộc Hàn Mặc Tử phải sống tách biệt ở Quy Nhơn, ông nhận được tấm bưu ảnh xứ Huế cùng vài dòng thăm hỏi từ Hoàng Thị Kim Cúc — người thiếu nữ Vĩ Dạ ông từng thầm thương thuở thanh xuân. Trong tập “Thơ Điên” (Đau Thương), “Đây thôn Vĩ Dạ” vang lên như tiếng lòng vừa nâng niu kỷ niệm vừa đau đáu mặc cảm chia lìa.'
      },
      {
        id: 'phan_tich_3_tang_tam_trang',
        roman: 'II',
        title: '2. Tổng hợp Phân tích 3 tầng tâm trạng bài thơ',
        content: 'Toàn bài thơ vận động qua 3 tầng không gian – thời gian – tâm trạng: Tầng 1 (Khổ 1) là ánh nắng ban mai tinh khôi nơi vườn Vĩ Dạ xanh như ngọc với nỗi nhớ tha thiết và niềm khao khát trở về. Tầng 2 (Khổ 2) là hoàng hôn và đêm trăng sông Hương chia lìa (“gió theo lối gió, mây đường mây”), phản chiếu dự cảm tan vỡ và nỗi khắc khoải đợi chờ chuyến thuyền chở trăng. Tầng 3 (Khổ 3) chìm sâu vào cõi mộng sương khói hư ảo, nơi hình bóng áo trắng nhòa đi trong hoài nghi đau đớn: “Ai biết tình ai có đậm đà?”.'
      },
      {
        id: 'nghe_thuat_tuong_trung_sieu_thuc',
        roman: 'III',
        title: '3. Nghệ thuật Tượng trưng – Siêu thực',
        content: 'Hàn Mặc Tử hòa quyện thi pháp tả cảnh ngụ tình phương Đông với bút pháp Tượng trưng – Siêu thực hiện đại. Cảnh vật không còn là ngoại cảnh tĩnh tại mà dịch chuyển liên tục theo dòng tâm thức: nắng tinh khiết hóa thành ngọc, gió mây phân ly thành tâm trạng, ánh trăng có thể “chở về” trên thuyền nan, và sắc trắng tà áo xóa nhòa ranh giới giữa mộng và thực.'
      },
      {
        id: 'gia_tri_nhan_van',
        roman: 'IV',
        title: '4. Giá trị Nhân văn',
        content: 'Giữa nghịch cảnh bệnh tật và cô độc tận cùng, thi sĩ vẫn hướng trọn tâm hồn về cái đẹp thuần khiết của quê hương, thiên nhiên và tình người xứ Huế. Bài thơ là minh chứng cho sức sống mãnh liệt của khát vọng yêu thương và sự giao cảm nhân bản vượt qua mọi giới hạn của số phận.'
      }
    ]
  });

  PLAQUE_LORE_DATABASE.vida_realm_vuon_cau = createViDaRealmEntry({
    key: 'vida_realm_vuon_cau',
    title: 'Vườn Cau Ban Mai — Tầng 1: Nắng Mới Hàng Cau & Lá Trúc',
    subtitle: '“Sao anh không về chơi thôn Vĩ? / Nhìn nắng hàng cau nắng mới lên / Vườn ai mướt quá xanh như ngọc / Lá trúc che ngang mặt chữ điền”',
    badgeLabel: 'TẦNG 1 • VƯỜN CAU BAN MAI',
    summary: 'Tầng tâm trạng thứ nhất mở ra không gian ban mai rực rỡ, tinh khôi của vườn Vĩ Dạ: ánh “nắng mới lên” chạm vào tàu cau cao vút, sắc xanh non mơn mởn “mướt quá xanh như ngọc” và nét duyên thầm kín đáo sau “lá trúc che ngang mặt chữ điền”.',
    researchText: 'Câu thơ mở đầu “Sao anh không về chơi thôn Vĩ?” vừa như lời mời gọi dịu dàng của người con gái Huế, vừa là câu tự vấn đầy nuối tiếc của Hàn Mặc Tử trong tập “Thơ Điên” (1938). Điệp từ “nắng” đặt giữa hai vế “nắng hàng cau” và “nắng mới lên” tạo cảm giác ánh sáng tinh khiết đang lan tỏa từ ngọn cau xuống khu vườn xanh ngọc trong ký ức về Hoàng Thị Kim Cúc.',
    quote: '“Sao anh không về chơi thôn Vĩ? / Nhìn nắng hàng cau nắng mới lên / Vườn ai mướt quá xanh như ngọc / Lá trúc che ngang mặt chữ điền.”',
    illustrationTitle: 'Vườn Cau Ban Mai Thôn Vĩ',
    illustrationCaption: 'Minh họa di sản: Nắng sớm mai rọi qua hàng cau cao, khu vườn xanh như ngọc và khóm trúc che ngang hiên nhà Huế',
    sections: [
      {
        id: 'hoan_canh_tho_dien_1938',
        roman: 'I',
        title: '1. Hoàn cảnh Thơ Điên (1938) & Mối tình Hoàng Thị Kim Cúc',
        content: 'Từ tấm bưu ảnh xứ Huế do Hoàng Thị Kim Cúc gửi vào năm 1938 khi Hàn Mặc Tử đang điều trị bệnh phong ở Quy Nhơn (giai đoạn sáng tác tập “Thơ Điên”), ký ức về khu vườn Vĩ Dạ bên bờ sông Hương bỗng sống dậy rạng ngời như một giấc mơ thanh xuân chưa từng phai nhạt.'
      },
      {
        id: 'phan_tich_3_tang_tam_trang',
        roman: 'II',
        title: '2. Phân tích 3 tầng tâm trạng — Trọng tâm Tầng 1 (Vườn Ban Mai)',
        content: 'Khổ 1 là tầng tâm trạng bừng sáng, hướng ngoại và tràn đầy khát vọng sống: câu hỏi tu từ “Sao anh không về chơi thôn Vĩ?” mang âm hưởng trách yêu ngọt ngào; “nắng hàng cau nắng mới lên” bắt trọn khoảnh khắc ánh dương đầu tiên tinh sạch nhất; “mướt quá xanh như ngọc” nâng sắc xanh khu vườn thành chất ngọc phát sáng; và “lá trúc che ngang mặt chữ điền” kết hợp vẻ thanh tú của cành trúc với nét phúc hậu con người Huế. Từ ánh sáng ban mai này, mạch thơ dần chuyển sang Tầng 2 (chia lìa sông trăng) và Tầng 3 (sương khói hư vô).'
      },
      {
        id: 'nghe_thuat_tuong_trung_sieu_thuc',
        roman: 'III',
        title: '3. Nghệ thuật Tượng trưng – Siêu thực',
        content: 'Sự chuyển hóa cảm giác tinh tế (“mướt quá” gợi xúc giác – vị giác hòa vào thị giác “xanh như ngọc”) cùng đại từ phiếm chỉ “vườn ai” tạo độ ngân vang vừa thực vừa mộng. Cảnh vườn không đơn thuần được tả thực mà được thăng hoa thành biểu tượng của vẻ đẹp thuần khiết mà thi sĩ vĩnh viễn hướng về.'
      },
      {
        id: 'gia_tri_nhan_van',
        roman: 'IV',
        title: '4. Giá trị Nhân văn',
        content: 'Ánh nắng ban mai và sắc xanh ngọc bích ở khổ 1 khẳng định tình yêu đời thiết tha của một con người đang đứng trước bóng tối bệnh tật. Càng khao khát sự sống và vẻ đẹp trần thế bao nhiêu, tiếng lòng của Hàn Mặc Tử càng lay động lòng người sâu sắc bấy nhiêu.'
      }
    ]
  });

  PLAQUE_LORE_DATABASE.vida_realm_ben_song_trang = createViDaRealmEntry({
    key: 'vida_realm_ben_song_trang',
    title: 'Bến Sông Trăng & Hoa Bắp Lay — Tầng 2: Chia Lìa & Khắc Khoải',
    subtitle: '“Gió theo lối gió, mây đường mây / Dòng nước buồn thiu, hoa bắp lay... / Thuyền ai đậu bến sông trăng đó / Có chở trăng về kịp tối nay?”',
    badgeLabel: 'TẦNG 2 • BẾN SÔNG TRĂNG',
    summary: 'Tầng tâm trạng thứ hai chuyển đột ngột từ ban mai sang đêm trăng sông Hương: gió và mây chia lìa đôi ngả, dòng nước lững lờ “buồn thiu” bên khóm hoa bắp lay nhẹ, dẫn tới câu hỏi khắc khoải về con thuyền đậu bến sông trăng có kịp chở trăng về trong tối nay.',
    researchText: 'Nếu Tầng 1 trong tập “Thơ Điên” (1938) bừng sáng niềm hy vọng gắn với hình bóng Hoàng Thị Kim Cúc và khu vườn Vĩ Dạ, thì sang Tầng 2, mặc cảm bệnh tật và khoảng cách địa lý xé đôi cảnh vật: “Gió theo lối gió, mây đường mây”. Sự chuyển đổi thời gian đột ngột từ nắng mai sang đêm trăng chính là nhịp đập tâm lý đầy lo âu của thi sĩ chạy đua với thời gian hữu hạn.',
    quote: '“Gió theo lối gió, mây đường mây, / Dòng nước buồn thiu, hoa bắp lay... / Thuyền ai đậu bến sông trăng đó, / Có chở trăng về kịp tối nay?”',
    illustrationTitle: 'Bến Sông Trăng & Hoa Bắp Lay',
    illustrationCaption: 'Minh họa di sản: Thuyền nan đậu trên sông trăng xứ Huế, vệt trăng dát vàng mặt nước và hoa bắp lay bên bờ',
    sections: [
      {
        id: 'hoan_canh_tho_dien_1938',
        roman: 'I',
        title: '1. Hoàn cảnh Thơ Điên (1938) & Mối tình Hoàng Thị Kim Cúc',
        content: 'Trong nỗi cô đơn của người mang trọng bệnh năm 1938, Hàn Mặc Tử ý thức sâu sắc khoảng cách không thể vượt qua giữa mình và Hoàng Thị Kim Cúc. Bến sông Hương trong tấm bưu ảnh trở thành nơi hội tụ của nỗi buồn chia cách và niềm mong mỏi một phép màu giao cảm.'
      },
      {
        id: 'phan_tich_3_tang_tam_trang',
        roman: 'II',
        title: '2. Phân tích 3 tầng tâm trạng — Trọng tâm Tầng 2 (Bến Sông Trăng)',
        content: 'Sau vẻ rạng rỡ của Tầng 1, Tầng 2 mở ra nhịp gãy chia lìa: nhịp thơ 4/3 “Gió theo lối gió, / mây đường mây” tách đôi hai sự vật vốn luôn gắn bó; nhân hóa “dòng nước buồn thiu” và rung động khẽ khàng “hoa bắp lay” thấm đẫm nỗi sầu cô quạnh. Hai câu cuối bùng lên khát vọng khắc khoải trước “thuyền ai đậu bến sông trăng đó / Có chở trăng về kịp tối nay?” — hai chữ “kịp” và “tối nay” dồn nén nỗi lo âu trước bước đi nghiệt ngã của số phận, chuẩn bị bước sang Tầng 3 mộng ảo.'
      },
      {
        id: 'nghe_thuat_tuong_trung_sieu_thuc',
        roman: 'III',
        title: '3. Nghệ thuật Tượng trưng – Siêu thực',
        content: 'Hình tượng “sông trăng” và “chở trăng về” là đỉnh cao sáng tạo Tượng trưng – Siêu thực của Hàn Mặc Tử: ánh trăng không chỉ soi chiếu mặt sông mà hòa tan dòng nước thành cả một dòng sông ánh sáng, biến vật thể vô hình (trăng, tình yêu, tri âm) thành thứ có thể chuyên chở trên chiếc thuyền nan mộng tưởng.'
      },
      {
        id: 'gia_tri_nhan_van',
        roman: 'IV',
        title: '4. Giá trị Nhân văn',
        content: 'Câu hỏi “Có chở trăng về kịp tối nay?” là tiếng gọi tìm sự đồng cảm của một tâm hồn không chịu đầu hàng cô độc. Dù biết thực tại chia cắt, thi sĩ vẫn tha thiết chờ đợi ánh sáng của tình thương và cái đẹp tìm đến với mình.'
      }
    ]
  });

  PLAQUE_LORE_DATABASE.vida_realm_rung_suong_khoi = createViDaRealmEntry({
    key: 'vida_realm_rung_suong_khoi',
    title: 'Cõi Mộng Sương Khói & Áo Em Trắng Quá — Tầng 3: Hư Ảo & Hoài Nghi',
    subtitle: '“Mơ khách đường xa, khách đường xa / Áo em trắng quá nhìn không ra... / Ở đây sương khói mờ nhân ảnh / Ai biết tình ai có đậm đà?”',
    badgeLabel: 'TẦNG 3 • CÕI MỘNG SƯƠNG KHÓI',
    summary: 'Tầng tâm trạng thứ ba đưa bài thơ vào cõi mộng sâu thẳm: điệp ngữ “khách đường xa” ngân vang xa vắng, tà áo trắng tinh khôi đến mức lòa nhòa “nhìn không ra”, và màn sương khói phủ mờ nhân ảnh khép lại bằng câu hỏi day dứt muôn đời về tấm lòng thủy chung.',
    researchText: 'Khổ thơ kết khép lại hành trình tâm tưởng của Hàn Mặc Tử trong tập “Thơ Điên” (1938). Từ thực tại Quy Nhơn đầy sương khói u tịch, thi sĩ hướng về bóng dáng người con gái Huế (Hoàng Thị Kim Cúc) như một vị “khách đường xa” trong giấc mơ bất khả chạm tới, để rồi tự hỏi đầy xót xa nhưng vẫn đong đầy ân tình: “Ai biết tình ai có đậm đà?”.',
    quote: '“Mơ khách đường xa, khách đường xa, / Áo em trắng quá nhìn không ra... / Ở đây sương khói mờ nhân ảnh, / Ai biết tình ai có đậm đà?”',
    illustrationTitle: 'Cõi Mộng Sương Khói & Bóng Áo Trắng',
    illustrationCaption: 'Minh họa di sản: Bóng thiếu nữ áo dài trắng tinh khôi dần tan hòa vào làn sương khói đêm trăng sông Hương',
    sections: [
      {
        id: 'hoan_canh_tho_dien_1938',
        roman: 'I',
        title: '1. Hoàn cảnh Thơ Điên (1938) & Mối tình Hoàng Thị Kim Cúc',
        content: 'Giữa những đêm bệnh tật triền miên năm 1938 khi sáng tác “Thơ Điên”, Hàn Mặc Tử tự cảm thấy mình đang bị tách khỏi thế giới người thương. Hình ảnh tà áo dài trắng nữ sinh Đồng Khánh (Huế) của Hoàng Thị Kim Cúc trở thành ký ức vừa gần gũi vừa xa xôi khôn cùng.'
      },
      {
        id: 'phan_tich_3_tang_tam_trang',
        roman: 'II',
        title: '2. Phân tích 3 tầng tâm trạng — Trọng tâm Tầng 3 (Cõi Mộng Sương Khói)',
        content: 'Nếu Tầng 1 rực rỡ nắng mai và Tầng 2 khắc khoải đợi thuyền trăng, thì Tầng 3 chuyển hẳn vào thế giới nội tâm mộng mị: chữ “Mơ” mở đầu câu thơ cùng điệp ngữ “khách đường xa, khách đường xa” kéo dài khoảng cách tâm tưởng; “Áo em trắng quá nhìn không ra” diễn tả sự choáng ngợp đến mức nhòa mắt trước vẻ tinh khôi; “Ở đây sương khói mờ nhân ảnh” đối lập cõi u tịch hiện tại với miền ký ức sáng trong, kết đọng ở câu hỏi đa nghĩa “Ai biết tình ai có đậm đà?”.'
      },
      {
        id: 'nghe_thuat_tuong_trung_sieu_thuc',
        roman: 'III',
        title: '3. Nghệ thuật Tượng trưng – Siêu thực',
        content: 'Câu thơ “Áo em trắng quá nhìn không ra” là một nghịch lý siêu thực tuyệt diệu: sắc trắng không giúp nhận diện rõ hơn mà trái lại làm hình bóng hòa tan vào ánh sáng và sương mù, tạo nên hiệu ứng nhòe mờ hư ảo. Đại từ phiếm chỉ “ai” lặp hai lần khiến câu kết mở ra nhiều tầng nghĩa vừa tự vấn vừa ngỏ lòng.'
      },
      {
        id: 'gia_tri_nhan_van',
        roman: 'IV',
        title: '4. Giá trị Nhân văn',
        content: 'Dù kết thúc trong màn sương khói hoài nghi và nỗi buồn thân phận, toàn bộ câu hỏi cuối vẫn thấm đẫm khát vọng được nhớ, được hiểu và được giữ trọn ân tình. Đó là vẻ đẹp nhân văn cao cả của một trái tim tài hoa luôn khao khát tình yêu thương đến giây phút cuối cùng.'
      }
    ]
  });
}

// Đăng ký alias và tiền tố cho toàn bộ các mã Lore phòng An Dương Vương
PLAQUE_LORE_DATABASE.anDuongVuong_statue = PLAQUE_LORE_DATABASE.an_duong_vuong_statue;
PLAQUE_LORE_DATABASE.anDuongVuong_noThan = PLAQUE_LORE_DATABASE.an_duong_vuong_noThan;
PLAQUE_LORE_DATABASE.anDuongVuong_giengNgoc = PLAQUE_LORE_DATABASE.an_duong_vuong_giengNgoc;
PLAQUE_LORE_DATABASE.plaque_an_duong_vuong = PLAQUE_LORE_DATABASE.an_duong_vuong;
PLAQUE_LORE_DATABASE.anduongvuong = PLAQUE_LORE_DATABASE.an_duong_vuong;
PLAQUE_LORE_DATABASE.co_loa = PLAQUE_LORE_DATABASE.an_duong_vuong;

/**
 * Tra cứu hồ sơ bảng thông tin theo roomId, plaqueId hoặc loreKey
 * Hỗ trợ: 'tat_den', 'plaque_tat_den', 'nam_xuong_vu_nuong', 'vida_vuon_vi_da', 'vida_thuyen_trang',
 * 'vida_realm_bia_ngo', 'vida_realm_vuon_cau', 'vida_realm_ben_song_trang', 'vida_realm_rung_suong_khoi', 'daythonvida', ...
 */
export function getSynthesizedPlaqueLore(keyOrRoomId) {
  if (!keyOrRoomId) return null;
  const raw = String(keyOrRoomId).trim();
  if (PLAQUE_LORE_DATABASE[raw]) return PLAQUE_LORE_DATABASE[raw];
  const stripped = raw.replace(/^plaque_/i, '');
  if (PLAQUE_LORE_DATABASE[stripped]) return PLAQUE_LORE_DATABASE[stripped];
  const lower = stripped.toLowerCase();
  if (PLAQUE_LORE_DATABASE[lower]) return PLAQUE_LORE_DATABASE[lower];
  const normalized = lower.replace(/[-\s]+/g, '_');
  if (PLAQUE_LORE_DATABASE[normalized]) return PLAQUE_LORE_DATABASE[normalized];

  if (normalized.includes('vida_realm') || normalized.includes('daythonvida_realm') || normalized.includes('day_thon_vi_da_realm')) {
    if (normalized.includes('bia_ngo') || normalized.includes('biango') || normalized.includes('stele')) {
      return PLAQUE_LORE_DATABASE.vida_realm_bia_ngo || PLAQUE_LORE_DATABASE.day_thon_vi_da || null;
    }
    if (normalized.includes('vuon_cau') || normalized.includes('vuoncau') || normalized.includes('garden')) {
      return PLAQUE_LORE_DATABASE.vida_realm_vuon_cau || PLAQUE_LORE_DATABASE.day_thon_vi_da || null;
    }
    if (normalized.includes('ben_song_trang') || normalized.includes('song_trang') || normalized.includes('river') || normalized.includes('boat')) {
      return PLAQUE_LORE_DATABASE.vida_realm_ben_song_trang || PLAQUE_LORE_DATABASE.day_thon_vi_da || null;
    }
    if (normalized.includes('rung_suong_khoi') || normalized.includes('suong_khoi') || normalized.includes('mist') || normalized.includes('ao_trang')) {
      return PLAQUE_LORE_DATABASE.vida_realm_rung_suong_khoi || PLAQUE_LORE_DATABASE.day_thon_vi_da || null;
    }
    return PLAQUE_LORE_DATABASE.vida_realm_bia_ngo || PLAQUE_LORE_DATABASE.day_thon_vi_da || null;
  }

  if (normalized.includes('namxuong_realm') || normalized.includes('nam_xuong_realm')) {
    if (normalized.includes('bia_lua') || normalized.includes('bialua') || normalized.includes('lua_trang') || normalized.includes('stele') || normalized.includes('intro') || normalized.includes('trien_de') || normalized.includes('de')) {
      return PLAQUE_LORE_DATABASE.namxuong_realm_bia_lua || PLAQUE_LORE_DATABASE.nguoi_con_gai_nam_xuong || null;
    }
    if (normalized.includes('den_dau') || normalized.includes('dendau') || normalized.includes('chiec_bong') || normalized.includes('cottage') || normalized.includes('nha_tranh') || normalized.includes('vach_nua') || normalized.includes('lamp') || normalized.includes('bong')) {
      return PLAQUE_LORE_DATABASE.namxuong_realm_den_dau || PLAQUE_LORE_DATABASE.nguoi_con_gai_nam_xuong || null;
    }
    if (normalized.includes('dan_giai_oan') || normalized.includes('giai_oan') || normalized.includes('altar') || normalized.includes('ben_song') || normalized.includes('tram_vang') || normalized.includes('hairpin') || normalized.includes('le_giai_oan')) {
      return PLAQUE_LORE_DATABASE.namxuong_realm_dan_giai_oan || PLAQUE_LORE_DATABASE.nguoi_con_gai_nam_xuong || null;
    }
    if (normalized.includes('thuy_cung') || normalized.includes('thuycung') || normalized.includes('palace') || normalized.includes('linh_phi') || normalized.includes('linhphi') || normalized.includes('kieu_hoa') || normalized.includes('ocean')) {
      return PLAQUE_LORE_DATABASE.namxuong_realm_thuy_cung || PLAQUE_LORE_DATABASE.nguoi_con_gai_nam_xuong || null;
    }
    return PLAQUE_LORE_DATABASE.namxuong_realm_bia_lua || PLAQUE_LORE_DATABASE.nguoi_con_gai_nam_xuong || null;
  }

  if (
    normalized.startsWith('an_duong_vuong') ||
    normalized.startsWith('anduongvuong') ||
    normalized.includes('an_duong_vuong') ||
    normalized.includes('anduongvuong') ||
    normalized.includes('co_loa') ||
    normalized.includes('coloathanh')
  ) {
    if (normalized.includes('statue') || normalized.includes('tuong') || normalized.includes('king') || normalized.includes('pedestal')) {
      return PLAQUE_LORE_DATABASE.an_duong_vuong_statue || PLAQUE_LORE_DATABASE.an_duong_vuong || null;
    }
    if (normalized.includes('nothan') || normalized.includes('no_than') || normalized.includes('crossbow') || normalized.includes('kim_quy') || normalized.includes('vuot')) {
      return PLAQUE_LORE_DATABASE.an_duong_vuong_noThan || PLAQUE_LORE_DATABASE.an_duong_vuong || null;
    }
    if (normalized.includes('giengngoc') || normalized.includes('gieng_ngoc') || normalized.includes('well') || normalized.includes('pearl') || normalized.includes('minh_chau') || normalized.includes('gieng')) {
      return PLAQUE_LORE_DATABASE.an_duong_vuong_giengNgoc || PLAQUE_LORE_DATABASE.an_duong_vuong || null;
    }
    return PLAQUE_LORE_DATABASE.an_duong_vuong || null;
  }

  if (normalized.startsWith('nam_xuong') || normalized.includes('namxuong')) {
    return PLAQUE_LORE_DATABASE.nguoi_con_gai_nam_xuong || null;
  }
  if (
    normalized.startsWith('vida_') ||
    normalized.includes('vi_da') ||
    normalized.includes('vida') ||
    normalized.includes('daythonvida')
  ) {
    return PLAQUE_LORE_DATABASE.day_thon_vi_da || null;
  }
  return null;
}

export function synthesizePlaqueLore(id) {
  return getSynthesizedPlaqueLore(id);
}

export default {
  PLAQUE_STYLE_THEMES,
  SYNTHESIZED_ROOM_LORE,
  PLAQUE_LORE_DATABASE,
  normalizePlaqueStyleTheme,
  generateHeritageIllustrationDataUri,
  synthesizeRoomPlaqueEntry,
  synthesizeAllRoomPlaques,
  getSynthesizedPlaqueLore,
  synthesizePlaqueLore
};
