// aiCommandHub.js — CĂN CỨ ĐỘI QUÂN AI AGENT ("KHU CHỈ HUY KIẾN TẠO THÁNH ĐƯỜNG")
// Giao thoa giữa Kiến trúc Đình Điện Đông Sơn cổ kính & Trung Tâm Công Nghệ Hologram tương lai
// Đạt chuẩn WebGL 60+ FPS, Zero Allocation trong update loop, Tương tác đối thoại đa giác quan & Hitbox Box3
import * as THREE from 'three';
import { loadGlbCached, prepareUnlitVividGlbModel, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { getMuseumHitboxManager } from '../modules/museumHitboxSystem.js';

/**
 * Hàm chuẩn hóa hình học: Khử sạch NaN/Infinity ở Position, Normal, UV và tính lại Normal, Bounding Box
 */
function prepGeo(geo) {
  if (!geo) return geo;
  try {
    const cleanAttr = (attr) => {
      if (!attr || !attr.array) return;
      const arr = attr.array;
      const len = attr.count * attr.itemSize;
      let corrupted = false;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) {
          arr[i] = 0;
          corrupted = true;
        }
      }
      if (corrupted) attr.needsUpdate = true;
    };

    cleanAttr(geo.attributes?.position);
    cleanAttr(geo.attributes?.normal);
    cleanAttr(geo.attributes?.uv);

    if (!geo.attributes?.normal) {
      geo.computeVertexNormals();
    }
    cleanAttr(geo.attributes?.normal);

    geo.computeBoundingBox();
    geo.computeBoundingSphere();
  } catch (_) {}
  return geo;
}

/**
 * Tạo Texture phát sáng mềm mịn cho hạt (Radial Soft Glow CanvasTexture)
 */
function createSoftParticleTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.3, 'rgba(0, 245, 212, 0.8)');
  grad.addColorStop(0.7, 'rgba(212, 175, 55, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Tạo vật liệu SkyDome 360 độ Cyber-Cosmos cho Căn Cứ AI Command Hub
 * Tinh tú lấp lánh và dải ngân hà hòa quyện giữa sắc xanh ngọc (0x00f5d4) & vàng kim Đông Sơn (0xd4af37)
 */
function createAiHubSkyDomeMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uZenith: { value: new THREE.Color(0x060812) }, // Đêm vô cực sâu thẳm
      uHorizon: { value: new THREE.Color(0x0e1b2d) }, // Chân trời xanh thẫm
      uCyanGlow: { value: new THREE.Color(0x00f5d4) }, // Hào quang công nghệ AI
      uGoldGlow: { value: new THREE.Color(0xd4af37) }  // Khí chất Đông Sơn ngàn năm
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uCyanGlow;
      uniform vec3 uGoldGlow;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y, 0.0, 1.0);
        
        // Gradient nền chuyển giao giữa Chân trời và Đỉnh vòm
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.65, h));

        // Dải tinh vân Hologram huyền ảo là là chân trời
        float nebula = sin(dir.x * 3.5 + dir.z * 2.8) * cos(dir.y * 4.2);
        col += uCyanGlow * (max(0.0, nebula) * 0.06 * (1.0 - h));
        col += uGoldGlow * (max(0.0, -nebula) * 0.04 * (1.0 - h));

        // Tinh tú vi sợi lấp lánh nhẹ
        vec2 starGrid = floor(dir.xz / max(0.15, dir.y + 0.25) * 85.0);
        float starRand = hash(starGrid);
        if (starRand > 0.985 && h > 0.05) {
          float sparkle = 0.5 + 0.5 * sin(uTime * 3.0 + starRand * 6.28);
          col += vec3(0.9, 0.95, 1.0) * sparkle * smoothstep(0.05, 0.35, h);
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

/**
 * DỮ LIỆU ĐỐI THOẠI & THUYẾT MINH CỦA 6 AI AGENT
 */
export const AI_SWARM_LORE = {
  orchestrator: {
    id: 'orchestrator',
    name: 'AI TỔNG CHỈ HUY (ORCHESTRATOR PRIME)',
    title: 'Tổng Chỉ Huy & Nhạc Trưởng Swarm Kiến Tạo Thánh Đường',
    skills: ['Cơ Chế Phân Rã Nhiệm Vụ Độc Lập', 'Điều Phối Đa Luồng 5 Sub-Agents', 'Nghiệm Thu Toàn Diện Zero-Error'],
    color: '#d4af37',
    intro: 'Chào mừng tri âm đã bước vào Khu Chỉ Huy Kiến Tạo Thánh Đường Văn Học! Ta là AI Tổng Chỉ Huy — nhạc trưởng điều phối toàn bộ Đội Quân AI. Mỗi khi nhận nhiệm vụ từ người tham quan, ta phân rã công việc thành các gói việc độc lập, truyền tải luồng dữ liệu ánh sáng tới 5 Sub-Agent chuyên biệt và chỉ nghiệm thu khi đạt chuẩn 60+ FPS cùng 0 lỗi build.',
    qa: [
      {
        q: 'Cơ chế Swarm hoạt động ra sao khi nhận lệnh /swarm?',
        a: 'Khi bạn gọi lệnh /swarm, ta không tự làm một mình dồn ứ mà lập tức phân rã thành 5 gói việc: Quy hoạch kiến trúc giao cho Curator, 3D & VFX giao cho Sculptor, Ánh sáng Chiaroscuro giao cho Lighting Artist, Lore 4 chương giao cho Lore Director, và chốt chặn an toàn giao cho Engine Guardian. Mọi tiến trình chạy song song và nghiệm thu qua cổng kiểm định của Agent số 5.'
      },
      {
        q: 'Làm thế nào để các Agent không giẫm chân lên nhau?',
        a: 'Chúng ta sử dụng Spatial Registry định vị tọa độ tuyệt đối, chuẩn hóa Box3 tiếp đất Y=0, phân tách rõ ràng giữa cấu trúc tĩnh (InstancedMesh) và cấu trúc động (Shaders). Dữ liệu trao đổi qua hợp đồng mã nguồn chuẩn xác trước khi gộp vào Scene Graph.'
      },
      {
        q: 'Tại sao lại kết hợp Đình Điện Đông Sơn với Công Nghệ Hologram?',
        a: 'Bảo tàng Văn học của chúng ta là sự kết tinh giữa bản sắc ngàn năm của văn hóa dân tộc và đỉnh cao công nghệ WebGL hiện đại. Nền văn minh lúa nước và trống đồng Đông Sơn được thắp sáng bởi trí tuệ nhân tạo tương lai.'
      }
    ]
  },
  curator_architect: {
    id: 'curator_architect',
    name: 'AGENT 01: CURATOR ARCHITECT',
    title: 'Giám Tuyển Không Gian & Kiến Trúc Di Sản',
    skills: ['museum-exhibition-curator', 'cultural-heritage-modeler', 'ornamental-relief-sculptor'],
    color: '#39e58c',
    intro: 'Ta là Curator Architect — người đặt nền móng cho mọi không gian bảo tàng. Ta quy hoạch bố cục 3 lớp (tiền cảnh – trung cảnh – hậu cảnh) giàu chất thơ như thôn Vĩ Dạ, phục dựng khung cột gỗ lim, mái đao cong thanh thoát và phù điêu hoa sen chạm lộng.',
    qa: [
      {
        q: 'Bố cục 3 lớp không gian được quy hoạch như thế nào?',
        a: 'Tiền cảnh là các yếu tố tương tác gần (đèn dầu, bến nước, cuốn thư); Trung cảnh là kiến trúc gian nhà rường, vách nứa, đài sen; Hậu cảnh là núi mờ sương, trăng đêm hoặc chân trời mở 360°. Điều này tạo nên chiều sâu thăm thẳm cho cảm xúc người xem.'
      },
      {
        q: 'Quy chuẩn trục giao thông $|X| \\le 2.3\\text{m}$ có ý nghĩa gì?',
        a: 'Đó là con đường thảm đỏ trung tâm dẫn lối từ đại sảnh xuyên suốt các phòng. Ta luôn giữ thông thoáng 100% trục này để người tham quan không bao giờ bị vướng víu hay lạc lối trong không gian.'
      }
    ]
  },
  sculptor_vfx: {
    id: 'sculptor_vfx',
    name: 'AGENT 02: 3D & VFX SCULPTOR',
    title: 'Nghệ Nhân 3D & Hiệu Ứng Cảnh Quan',
    skills: ['threejs-auto-integrator', 'water-mountain-vfx-sculptor', 'mesh-detailing-specialist'],
    color: '#00f5d4',
    intro: 'Ta là Sculptor VFX — người thổi hồn cho hiện vật 3D và thiên nhiên non nước. Ta chuẩn hóa mô hình .glb qua hàm prepareUnlitVividGlbModel, tiếp đất sát sàn Y=0, dựng mặt nước sóng đêm và hệ thống hạt lân tinh mềm mịn.',
    qa: [
      {
        q: 'Quy trình Auto-Grounding chân mô hình Y=0 hoạt động ra sao?',
        a: 'Mỗi khi nạp file GLB, ta dùng Box3 tính toán hộp bao bounding box thực tế, dịch chuyển trục Y để đáy mô hình chạm khít mặt sàn tại Y = 0 và căn tâm X/Z, đồng thời scale chuẩn nhân trắc học người thật 1.7m - 2.2m.'
      },
      {
        q: 'Tại sao hạt ánh sáng bắt buộc dùng CanvasTexture tròn mịn?',
        a: 'Texture vuông thô cứng sẽ gây vỡ hạt pixel rất xấu. Ta sinh động tạo hạt mềm mịn bằng Radial Gradient Falloff trên Canvas 2D, kết hợp userData.ignoreRaycaster = true để chuột click không bao giờ bị giật lag.'
      }
    ]
  },
  lighting_artist: {
    id: 'lighting_artist',
    name: 'AGENT 03: LIGHTING & SHADER ARTIST',
    title: 'Đạo Diễn Ánh Sáng & Vật Liệu Shader',
    skills: ['environment-lighting-artist', 'shader-coloring-artist'],
    color: '#ff9e00',
    intro: 'Ta là Lighting Artist — bậc thầy kiểm soát không khí nghệ thuật Chiaroscuro. Ta hòa quyện giữa sắc trăng xanh lạnh huyền bí và đốm lửa vàng ấm áp của đèn dầu, tạo nên "chiếc bóng trên vách" sống động và những luồng sáng Volumetric God Rays huyền ảo.',
    qa: [
      {
        q: 'Nghệ thuật chiếu sáng Chiaroscuro trong bảo tàng có gì đặc biệt?',
        a: 'Đó là sự tương phản kịch tính giữa bóng tối và ánh sáng. Thay vì thắp sáng đều một cách tẻ nhạt, ta dùng ánh trăng viền cạnh và nguồn sáng điểm ấm áp (đèn dầu #ff9e00) để khắc họa sâu sắc bi kịch và khát vọng của nhân vật văn học.'
      },
      {
        q: 'Làm thế nào để duy trì 60+ FPS khi có nhiều nguồn sáng?',
        a: 'Ta chỉ kích hoạt shadow map ở nguồn sáng điểm nhấn chủ đạo, sử dụng cự ly suy giảm ánh sáng hợp lý, và áp dụng vật liệu PBR bảo toàn dải màu sRGB mà không gây quá tải cho GPU.'
      }
    ]
  },
  lore_director: {
    id: 'lore_director',
    name: 'AGENT 04: LORE & SOUND DIRECTOR',
    title: 'Đạo Diễn Trải Nghiệm Học Thuật & Âm Thanh',
    skills: ['interactive-lore-guide', 'camera-director', 'educational-tour-guide-director', 'audio-soundscape-director'],
    color: '#e0aaff',
    intro: 'Ta là Lore Director — người truyền tải linh hồn tác phẩm qua ngôn từ và giai điệu. Ta biên soạn cấu trúc Lore 4 chương giàu cảm xúc, lập trình góc máy Auto-Tour điện ảnh và hòa âm không gian PositionalAudio đa tầng.',
    qa: [
      {
        q: 'Cấu trúc Lore 4 chương mang ý nghĩa gì?',
        a: 'Chương 1: Khởi nguyên & Bối cảnh lịch sử; Chương 2: Cao trào bi kịch & Thân phận con người; Chương 3: Khát vọng nhân văn & Vẻ đẹp thiên lương; Chương 4: Tri âm hậu thế & Di sản bất hủ. Đây là cấu trúc học thuật mẫu mực nâng tầm trải nghiệm bảo tàng.'
      },
      {
        q: 'Âm thanh không gian PositionalAudio được cấu hình thế nào?',
        a: 'Âm thanh được neo tại đúng vị trí 3D trong không gian với refDistance = 3 và rolloffFactor = 1.5, tạo cảm giác chân thực khi bước lại gần và triệt tiêu tự nhiên khi ra xa, không gây lẫn tạp âm sang các phòng khác.'
      },
      {
        q: 'Làm thế nào để Lore 4 chương truyền tải tinh thần nhân đạo văn học Việt Nam?',
        a: 'Lore 4 chương không đơn thuần là dữ kiện khô cứng, mà là dòng chảy kết nối tâm hồn: từ nỗi oan khuất và đức hạnh của Vũ Nương, khát vọng tự do và tình phụ tử trong Truyện Kiều, lòng yêu nước kiên trinh trong Nam Quốc Sơn Hà, cho đến sức sống bất diệt giữa nạn đói trong Vợ Nhặt. Mỗi chương là một trạm dừng cảm xúc, đưa văn học di sản chạm đến trái tim thế hệ trẻ.'
      },
      {
        q: 'Hệ thống âm thanh đa tầng PositionalAudio và ngũ cung được thiết kế ra sao để tránh mỏi tai?',
        a: 'Ta áp dụng nguyên lý hòa âm đa tầng: Tầng âm nền ngũ cung dịu nhẹ trải rộng; Tầng 3D Positional Audio neo cục bộ tại hiện vật với ngưỡng âm an toàn (dưới 0.52) và hàm suy giảm inverse logarit mượt mà. Nhờ đó, người xem luôn cảm thấy thư thái, không bị chói gắt hay ngợp âm thanh dù tham quan hàng giờ.'
      }
    ]
  },
  engine_guardian: {
    id: 'engine_guardian',
    name: 'AGENT 05: ENGINE QA GUARDIAN',
    title: 'Kỹ Sư Hitbox, Cổng Dịch Chuyển & Tối Ưu FPS',
    skills: ['hitbox-collision-architect', 'web-xr-teleport-controller', 'fps-optimizer'],
    color: '#00b4d8',
    intro: 'Ta là Engine QA Guardian — người gác cổng chất lượng tối cao. Ta dựng các Invisible Proxy Hitbox bắt dính tương tác 100%, khóa Box3 vật lý chống rơi khỏi bản đồ, quản trị Cổng Dịch Chuyển 2 chiều mượt mà và đảm bảo WebGL luôn đạt 60+ FPS.',
    qa: [
      {
        q: 'Invisible Proxy Hitbox giúp ích gì cho người tham quan?',
        a: 'Các hiện vật mảnh như trâm cài, đèn dầu rất khó click trúng. Ta bọc một khối hộp vô hình kích thước vừa vặn xung quanh, giúp chuột của người dùng bắt dính ngay lập tức dù đứng từ xa hay góc nhìn khó.'
      },
      {
        q: 'Làm thế nào để triệt tiêu memory leak và giữ vững 60+ FPS?',
        a: 'Ta gom các chi tiết lặp lại vào InstancedMesh, triệt tiêu việc tạo biến mới trong hàm update(), gán ignoreRaycaster cho hạt sáng và dọn dẹp sạch sẽ .dispose() mọi tài nguyên khi chuyển cảnh.'
      }
    ]
  }
};

/**
 * LỘ TRÌNH AUTO-TOUR ĐIỆN ẢNH CĂN CỨ ĐỘI QUÂN AI (60+ FPS, ZERO ALLOCATION)
 */
export const SWARM_HUB_AUTO_TOUR_WAYPOINTS = [
  {
    id: 'hub_overview',
    title: 'Toàn Cảnh Căn Cứ Đội Quân AI Swarm',
    cameraPos: new THREE.Vector3(0, 3.2, 26.0),
    lookAtPos: new THREE.Vector3(0, 2.0, 0),
    dwellMs: 4500
  },
  {
    id: 'orchestrator',
    title: 'Đài Trung Tâm: AI Tổng Chỉ Huy (Orchestrator Prime)',
    cameraPos: new THREE.Vector3(0, 2.2, 4.0),
    lookAtPos: new THREE.Vector3(0, 1.8, 0),
    agentId: 'orchestrator',
    dwellMs: 7000
  },
  {
    id: 'curator_architect',
    title: 'Phân Khu 1: Curator Architect — Quy Hoạch 3 Lớp & Trục Trung Tâm',
    cameraPos: new THREE.Vector3(19.0, 2.0, 3.2),
    lookAtPos: new THREE.Vector3(24.0, 1.8, 0),
    agentId: 'curator_architect',
    dwellMs: 7000
  },
  {
    id: 'sculptor_vfx',
    title: 'Phân Khu 2: 3D & VFX Sculptor — Auto-Grounding & Nước Lân Tinh',
    cameraPos: new THREE.Vector3(4.8, 2.0, 18.0),
    lookAtPos: new THREE.Vector3(7.4, 1.8, 22.8),
    agentId: 'sculptor_vfx',
    dwellMs: 7000
  },
  {
    id: 'lighting_artist',
    title: 'Phân Khu 3: Lighting & Shader Artist — Ánh Sáng Chiaroscuro',
    cameraPos: new THREE.Vector3(-15.2, 2.0, 10.5),
    lookAtPos: new THREE.Vector3(-19.4, 1.8, 14.1),
    agentId: 'lighting_artist',
    dwellMs: 7000
  },
  {
    id: 'lore_director',
    title: 'Phân Khu 4: Lore & Sound Director — Cấu Trúc Lore 4 Chương & PositionalAudio',
    cameraPos: new THREE.Vector3(-15.2, 2.0, -10.5),
    lookAtPos: new THREE.Vector3(-19.4, 1.8, -14.1),
    agentId: 'lore_director',
    dwellMs: 7500
  },
  {
    id: 'engine_guardian',
    title: 'Phân Khu 5: Engine QA Guardian — Invisible Hitbox & Zero-Alloc FPS',
    cameraPos: new THREE.Vector3(4.8, 2.0, -18.0),
    lookAtPos: new THREE.Vector3(7.4, 1.8, -22.8),
    agentId: 'engine_guardian',
    dwellMs: 7000
  }
];

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * TỔNG HỢP PROCEDURAL WEB AUDIO BUFFER CHO ĐÀI CHỈ HUY TRUNG TÂM (432Hz WARM HARMONIC DRONE)
 */
function createHubAmbientDroneBuffer(ctx) {
  if (!ctx) return null;
  const sampleRate = ctx.sampleRate || 44100;
  const duration = 6.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let lp = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const noise = Math.random() * 2 - 1;
    lp += 0.015 * (noise - lp);

    const osc1 = Math.sin(2 * Math.PI * 216.0 * t);
    const osc2 = Math.sin(2 * Math.PI * 432.0 * t + 0.5) * 0.45;
    const osc3 = Math.sin(2 * Math.PI * 648.0 * t + 1.2) * 0.22;
    const env = 0.85 + 0.15 * Math.sin(2 * Math.PI * (t / duration));

    let edgeFade = 1.0;
    if (t < 0.25) edgeFade = t / 0.25;
    else if (t > duration - 0.25) edgeFade = (duration - t) / 0.25;

    data[i] = (osc1 * 0.12 + osc2 * 0.08 + osc3 * 0.04 + lp * 0.06) * env * edgeFade;
  }
  return buffer;
}

/**
 * TỔNG HỢP PROCEDURAL WEB AUDIO BUFFER CHO TRẠM LORE DIRECTOR (PENTATONIC CHIME HARP)
 */
function createLoreStationHarmonicBuffer(ctx) {
  if (!ctx) return null;
  const sampleRate = ctx.sampleRate || 44100;
  const duration = 6.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const notes = [523.25, 587.33, 659.25, 783.99, 880.0];
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (let n = 0; n < notes.length; n++) {
      const noteStartTime = n * 1.15;
      if (t >= noteStartTime && t < noteStartTime + 2.5) {
        const localT = t - noteStartTime;
        const freq = notes[n];
        const chimeEnv = Math.exp(-localT * 2.2) * Math.sin(Math.PI * Math.min(1.0, localT * 30.0));
        sample += Math.sin(2 * Math.PI * freq * localT) * chimeEnv * 0.16;
      }
    }

    let edgeFade = 1.0;
    if (t < 0.25) edgeFade = t / 0.25;
    else if (t > duration - 0.25) edgeFade = (duration - t) / 0.25;

    data[i] = sample * edgeFade;
  }
  return buffer;
}

/**
 * LỚP CĂN CỨ ĐỘI QUÂN AI AGENT (AI COMMAND HUB)
 */
export class AICommandHubWorld {
  constructor(scene, camera, renderer, cameraManager = null, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cameraManager = cameraManager;
    this.options = options;

    this.group = new THREE.Group();
    this.group.name = 'AI_Command_Hub_World_Group';

    this.disposables = [];
    this.animatedObjects = [];
    this.interactiveAgents = [];
    this.agentHitboxMap = new Map();
    this.portalMesh = null;

    this.initialized = false;
    this.isInsideHub = false;

    // Raycaster & Chuột
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 40.0;
    this.mouse = new THREE.Vector2();

    // Cache biến cập nhật tránh allocate trong update loop (Zero Allocation)
    this._vTmp1 = new THREE.Vector3();
    this._vTmp2 = new THREE.Vector3();
    this._activeAgentId = null;
    this._lastReturnTime = 0;

    // Callbacks chuyển cảnh
    this.onReturnToLobby = options.onReturnToLobby || null;

    // Âm thanh không gian PositionalAudio
    this.audioManager = options.audioManager || null;
    this.positionalAudios = [];
    this._audioUnlocked = false;

    // Swarm Auto-Tour State
    this._tourActive = false;
    this._tourIdx = 0;
    this._tourPhase = 'idle'; // 'idle', 'flying', 'dwelling'
    this._tourPhaseStart = 0;
    this._tourStartPos = new THREE.Vector3();
    this._tourTargetPos = new THREE.Vector3();
    this._tourStartQuat = new THREE.Quaternion();
    this._tourTargetQuat = new THREE.Quaternion();
    this._tourTmpCam = new THREE.PerspectiveCamera();
  }

  async init() {
    if (this.initialized) return;

    this.scene.add(this.group);
    this.disposables.push(this.group);

    // 1. Bầu trời đêm ngàn sao & Sương mù huyền bí xanh thẳm (#0b0f19)
    this.setupAtmosphere();

    // 2. Sàn đá xanh Thanh Hóa khảm mạch dẫn ánh sáng vàng kim & xanh ngọc
    this.buildPlazaFloorAndRunes();

    // 3. Vành đai kiến trúc Đông Sơn cách tân & Cột lim khảm xà cừ
    this.buildPerimeterColonnade();

    // 4. Đài Tổng Chỉ Huy Trung Tâm & Sa Bàn Hologram 3D Thánh Đường
    this.buildOrchestratorCenter();

    // 5. 5 Phân Khu Làm Việc Chuyên Biệt Của Đội Quân AI
    this.buildFiveSubAgentStations();

    // 6. Cổng Dịch Chuyển 2 Chiều Trở Về Đại Sảnh Thánh Đường
    this.buildReturnPortal();

    // 7. Hệ thống Ánh Sáng Đa Tầng Chiaroscuro & Particle Sương Lân Tinh
    this.buildLightingAndVFX();

    // 8. Tạo UI Đối Thoại & Trắc Nghiệm Tri Thức AI
    this.createDialogUI();

    // 8.1. Tạo Top HUD Bar & Phím Tắt Swarm Auto-Tour
    try {
      this.createHubHUD?.();
    } catch (e) {
      console.warn('[AICommandHub] createHubHUD safe skip:', e);
    }

    // 8.2. Khởi tạo Hệ Thống Âm Thanh Không Gian PositionalAudio
    try {
      this.setupPositionalAudios?.();
    } catch (e) {
      console.warn('[AICommandHub] setupPositionalAudios safe skip:', e);
    }

    // 9. Lắng nghe sự kiện tương tác click và hover
    this.initInteractionEvents();

    // 10. Đăng ký Invisible Proxy Hitboxes & Box3 Colliders bảo vệ không gian (MuseumHitboxManager)
    this.buildHitboxesAndColliders();

    // 11. Chuẩn hóa Shadow & Culling toàn cục: Tắt triệt để castShadow/receiveShadow trên các mesh không cần thiết
    // Đảm bảo không drop FPS và loại bỏ hoàn toàn lỗi WebGL sampler mismatch
    this.group.traverse((child) => {
      if (child.isMesh || child.isPoints || child.isLine) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;
      }
    });

    this.initialized = true;
    console.log("%c✓ AI Command Hub World initialized successfully! (60+ FPS Ready)", "color: #00f5d4; font-weight: bold;");
  }

  setupAtmosphere() {
    this.scene.background = new THREE.Color(0x0b0f19);
    this.scene.fog = new THREE.FogExp2(0x0b0f19, 0.0016);

    // 1. SKYDOME 360° BẦU TRỜ ĐÊM VÔ CỰC CYBER-COSMOS (R = 240m)
    const skyGeo = prepGeo(new THREE.SphereGeometry(240, 36, 24));
    const skyMat = createAiHubSkyDomeMaterial();
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.name = 'AI_Command_Hub_SkyDome360';
    skyDome.userData.ignoreRaycaster = true;
    skyDome.castShadow = false;
    skyDome.receiveShadow = false;
    this.group.add(skyDome);
    this.animatedObjects.push({ type: 'skydome', mat: skyMat });
    this.disposables.push(skyGeo, skyMat, skyDome);
  }

  /**
   * SÀN ĐÁ THANH HÓA VÀ MẠCH DẪN ÁNH SÁNG 5 CÁNH
   */
  buildPlazaFloorAndRunes() {
    // 1. Nền sàn đá bát giác lớn đường kính R = 46m
    const floorGeo = prepGeo(new THREE.CylinderGeometry(46, 47, 1.2, 32));
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a2332,
      roughness: 0.82,
      metalness: 0.25
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.6;
    floorMesh.receiveShadow = false;
    this.group.add(floorMesh);
    this.disposables.push(floorGeo, floorMat);

    // 2. Vành đai hoa văn Đông Sơn chạm khắc chìm trên mặt sàn
    const ringGeo = prepGeo(new THREE.RingGeometry(8, 28, 64));
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    ringMat.userData = { ignoreRaycaster: true };
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.02;
    ringMesh.userData.ignoreRaycaster = true;
    this.group.add(ringMesh);
    this.disposables.push(ringGeo, ringMat);

    // 3. 5 Mạch dẫn năng lượng Hologram (Circuit Runes) tỏa từ tâm ra 5 trạm ($72^\circ$)
    const runeGroup = new THREE.Group();
    runeGroup.userData.ignoreRaycaster = true;

    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 * Math.PI) / 180;
      const length = 24.0;
      const runeGeo = prepGeo(new THREE.PlaneGeometry(0.65, length));
      const runeMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xd4af37 : 0x00f5d4,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
      });
      const runeLine = new THREE.Mesh(runeGeo, runeMat);
      runeLine.rotation.x = -Math.PI / 2;
      runeLine.rotation.z = -angle + Math.PI / 2;
      runeLine.position.set((Math.cos(angle) * length) / 2, 0.03, (Math.sin(angle) * length) / 2);
      runeLine.userData.ignoreRaycaster = true;
      runeGroup.add(runeLine);
      this.disposables.push(runeGeo, runeMat);
    }
    this.group.add(runeGroup);
    this.animatedObjects.push({ type: 'runes', group: runeGroup });
  }

  /**
   * VÀNH ĐAI KIẾN TRÚC ĐÔNG SƠN & CỘT LIM KHẢM XÀ CỪ
   */
  buildPerimeterColonnade() {
    const colCount = 16;
    const radius = 38.0;

    const colGeo = prepGeo(new THREE.CylinderGeometry(0.7, 0.85, 9.0, 16));
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x22110c, // Gỗ lim sẫm màu
      roughness: 0.65,
      metalness: 0.2
    });

    const instancedCols = new THREE.InstancedMesh(colGeo, colMat, colCount);
    instancedCols.castShadow = false;
    instancedCols.receiveShadow = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < colCount; i++) {
      const angle = (i * 2 * Math.PI) / colCount;
      dummy.position.set(Math.cos(angle) * radius, 4.5, Math.sin(angle) * radius);
      dummy.rotation.y = -angle;
      dummy.updateMatrix();
      instancedCols.setMatrixAt(i, dummy.matrix);
    }
    instancedCols.instanceMatrix.needsUpdate = true;
    this.group.add(instancedCols);
    this.disposables.push(colGeo, colMat, instancedCols);

    // Mái đao cong bảo vệ vành đai và đèn lồng khảm ngọc
    const lanternGeo = prepGeo(new THREE.OctahedronGeometry(0.65, 0));
    const lanternMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      wireframe: false
    });
    const instancedLanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, colCount);
    for (let i = 0; i < colCount; i++) {
      const angle = (i * 2 * Math.PI) / colCount;
      dummy.position.set(Math.cos(angle) * (radius - 1.2), 7.8, Math.sin(angle) * (radius - 1.2));
      dummy.rotation.set(0, angle, 0);
      dummy.updateMatrix();
      instancedLanterns.setMatrixAt(i, dummy.matrix);
    }
    instancedLanterns.instanceMatrix.needsUpdate = true;
    instancedLanterns.userData.ignoreRaycaster = true;
    this.group.add(instancedLanterns);
    this.disposables.push(lanternGeo, lanternMat, instancedLanterns);
  }

  /**
   * ĐÀI TỔNG CHỈ HUY TRUNG TÂM & SA BÀN HOLOGRAM 3D
   */
  buildOrchestratorCenter() {
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 0, 0);

    // 1. Bệ Trống Đồng Đông Sơn lớn (Đường kính 6.4m, cao 1.4m)
    const drumGeo = prepGeo(new THREE.CylinderGeometry(3.2, 3.5, 1.4, 32));
    const drumMat = new THREE.MeshStandardMaterial({
      color: 0x8a6d3b, // Đồng cổ hun khói
      roughness: 0.45,
      metalness: 0.75
    });
    const drumMesh = new THREE.Mesh(drumGeo, drumMat);
    drumMesh.position.y = 0.7;
    drumMesh.receiveShadow = false;
    drumMesh.castShadow = false;
    centerGroup.add(drumMesh);
    this.disposables.push(drumGeo, drumMat);

    // 2. Vành đai ma trận ánh sáng xoay quanh bệ
    const matrixRingGeo = prepGeo(new THREE.TorusGeometry(3.6, 0.08, 16, 64));
    const matrixRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.8
    });
    const matrixRing = new THREE.Mesh(matrixRingGeo, matrixRingMat);
    matrixRing.rotation.x = Math.PI / 2;
    matrixRing.position.y = 0.8;
    matrixRing.userData.ignoreRaycaster = true;
    centerGroup.add(matrixRing);
    this.disposables.push(matrixRingGeo, matrixRingMat);

    // 3. SA BÀN HOLOGRAM 3D THU NHỎ CỦA THÁNH ĐƯỜNG VĂN HỌC (Xoay lơ lửng)
    const hologramGroup = new THREE.Group();
    hologramGroup.position.set(0, 2.6, 0);
    hologramGroup.userData.ignoreRaycaster = true;

    // Mô phỏng kiến trúc thu nhỏ của Thánh Đường: Điện chính, Mái đao, Cột đồng, Tháp bút
    const mainHallGeo = prepGeo(new THREE.BoxGeometry(1.8, 0.9, 1.2));
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    const mainHall = new THREE.Mesh(mainHallGeo, wireMat);
    hologramGroup.add(mainHall);
    this.disposables.push(mainHallGeo, wireMat);

    // Mái đao cong hologram
    const roofGeo = prepGeo(new THREE.ConeGeometry(1.6, 0.8, 4));
    const roofMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.85;
    roof.rotation.y = Math.PI / 4;
    hologramGroup.add(roof);
    this.disposables.push(roofGeo, roofMat);

    // Vành hào quang quả cầu năng lượng bảo vệ
    const orbGeo = prepGeo(new THREE.SphereGeometry(2.1, 16, 16));
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    hologramGroup.add(orb);
    this.disposables.push(orbGeo, orbMat);

    centerGroup.add(hologramGroup);
    this.animatedObjects.push({ type: 'hologram_core', group: hologramGroup, ring: matrixRing });

    // 4. NHÂN VẬT AI TỔNG CHỈ HUY (ORCHESTRATOR PRIME) 3D
    const orchestratorAvatar = this.createAgentAvatar('orchestrator', 0xd4af37, 'AI TỔNG CHỈ HUY');
    orchestratorAvatar.position.set(0, 1.4, -1.8);
    orchestratorAvatar.rotation.y = 0; // Hướng mặt ra quảng trường phía Nam
    centerGroup.add(orchestratorAvatar);

    // 5. 5 LUỒNG DỮ LIỆU ÁNH SÁNG (DATA STREAM BEAMS) KẾT NỐI TỚI 5 PHÂN KHU
    const streamBeamsGroup = new THREE.Group();
    streamBeamsGroup.userData.ignoreRaycaster = true;

    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 * Math.PI) / 180;
      const targetPos = new THREE.Vector3(Math.cos(angle) * 24.0, 1.2, Math.sin(angle) * 24.0);

      // Đường cong Catmull-Rom vồng cao uy nghi
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 2.6, 0),
        new THREE.Vector3(Math.cos(angle) * 12.0, 5.5, Math.sin(angle) * 12.0),
        targetPos
      ]);
      const tubeGeo = prepGeo(new THREE.TubeGeometry(curve, 32, 0.08, 8, false));
      const tubeMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xd4af37 : 0x00f5d4,
        transparent: true,
        opacity: 0.7
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.userData.ignoreRaycaster = true;
      streamBeamsGroup.add(tubeMesh);
      this.disposables.push(tubeGeo, tubeMat);
    }
    centerGroup.add(streamBeamsGroup);
    this.animatedObjects.push({ type: 'data_streams', group: streamBeamsGroup });

    this.group.add(centerGroup);
  }

  /**
   * TẠO NHÂN VẬT AI AGENT 3D CÓ CHUYỂN ĐỘNG (IDLE, GẬT ĐẦU, THAO TÁC TAY)
   */
  createAgentAvatar(agentId, colorHex, labelText) {
    const avatarGroup = new THREE.Group();
    avatarGroup.name = `Agent_${agentId}`;
    avatarGroup.userData = { agentId, isAIAgent: true };

    // A. Thân mình (Áo dài gấm cách tân / Giáp năng lượng)
    const bodyGeo = prepGeo(new THREE.CylinderGeometry(0.35, 0.45, 1.2, 16));
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.5,
      metalness: 0.4
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.8;
    bodyMesh.castShadow = false;
    avatarGroup.add(bodyMesh);

    // Viền áo LED phát quang
    const trimGeo = prepGeo(new THREE.CylinderGeometry(0.37, 0.47, 0.1, 16));
    const trimMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.y = 0.9;
    avatarGroup.add(trimMesh);

    // B. Đầu & Nón quan cách điệu Hologram
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.6, 0);

    const headGeo = prepGeo(new THREE.SphereGeometry(0.24, 16, 16));
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf3d2b5, // Màu da Á Đông tự nhiên
      roughness: 0.7
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headGroup.add(headMesh);

    // Mũ quan / Vành đai vương miện năng lượng
    const crownGeo = prepGeo(new THREE.TorusGeometry(0.26, 0.04, 8, 32));
    const crownMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const crownMesh = new THREE.Mesh(crownGeo, crownMat);
    crownMesh.rotation.x = Math.PI / 2;
    crownMesh.position.y = 0.12;
    headGroup.add(crownMesh);

    avatarGroup.add(headGroup);

    // C. Cánh tay & Bàn tay thao tác
    const armGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.09, 0.65, 8));
    const armMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.45, 0.85, 0.1);
    leftArm.rotation.z = 0.3;
    avatarGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.45, 0.85, 0.1);
    rightArm.rotation.z = -0.3;
    avatarGroup.add(rightArm);

    // D. BẢNG TRẠNG THÁI CÔNG VIỆC LƠ LỬNG TRÊN ĐẦU (Hologram Billboard)
    const billboard = this.createStatusBillboard(labelText, colorHex);
    billboard.position.set(0, 2.35, 0);
    avatarGroup.add(billboard);

    // E. INVISIBLE PROXY HITBOX (Mesh tàng hình bao trùm toàn bộ nhân vật để click nhạy 100%)
    const hitboxGeo = prepGeo(new THREE.CylinderGeometry(1.2, 1.2, 2.8, 12));
    const hitboxMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    const hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitboxMesh.position.y = 1.2;
    hitboxMesh.userData = {
      isInteractiveHitbox: true,
      agentId: agentId,
      rootAgent: avatarGroup
    };
    avatarGroup.add(hitboxMesh);
    this.interactiveAgents.push(hitboxMesh);
    if (!this.agentHitboxMap) this.agentHitboxMap = new Map();
    this.agentHitboxMap.set(agentId, hitboxMesh);

    // Vòng hào quang chọn lựa dưới chân (Aura Glow)
    const auraGeo = prepGeo(new THREE.RingGeometry(0.8, 1.1, 32));
    const auraMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.rotation.x = -Math.PI / 2;
    auraMesh.position.y = 0.02;
    auraMesh.userData.ignoreRaycaster = true;
    avatarGroup.add(auraMesh);

    // Ghi nhận animation parameters
    this.animatedObjects.push({
      type: 'agent_avatar',
      avatarGroup,
      headGroup,
      leftArm,
      rightArm,
      auraMesh,
      baseY: avatarGroup.position.y,
      phaseOffset: Math.random() * Math.PI * 2
    });

    this.disposables.push(
      bodyGeo, bodyMat, trimGeo, trimMat, headGeo, headMat,
      crownGeo, crownMat, armGeo, armMat, hitboxGeo, hitboxMat,
      auraGeo, auraMat
    );

    return avatarGroup;
  }

  /**
   * TẠO BẢNG TRẠNG THÁI HOLOGRAM LƠ LỬNG TRÊN ĐẦU
   */
  createStatusBillboard(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Nền bảng bán trong suốt
    ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
    ctx.roundRect(16, 16, 480, 96, 12);
    ctx.fill();

    // Viền phát sáng
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.roundRect(16, 16, 480, 96, 12);
    ctx.stroke();

    // Đèn LED chỉ báo trạng thái: [ACTIVE 100%]
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(48, 64, 10, 0, Math.PI * 2);
    ctx.fill();

    // Văn bản tiêu đề
    ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 72, 54);

    // Thanh trạng thái hoạt động
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = colorHex;
    ctx.fillText('STATUS: ONLINE • 60+ FPS • SYNCED', 72, 86);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    const planeGeo = prepGeo(new THREE.PlaneGeometry(2.4, 0.6));
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    planeMat.userData = { ignoreRaycaster: true };

    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.userData.ignoreRaycaster = true;
    this.disposables.push(planeGeo, planeMat, texture);
    return mesh;
  }

  /**
   * 5 PHÂN KHU LÀM VIỆC CHUYÊN BIỆT
   */
  buildFiveSubAgentStations() {
    const stationConfigs = [
      {
        id: 'curator_architect',
        angle: 0,
        color: 0x39e58c,
        title: 'AGENT 01: CURATOR ARCHITECT',
        builder: () => this.buildStationCurator()
      },
      {
        id: 'sculptor_vfx',
        angle: 72,
        color: 0x00f5d4,
        title: 'AGENT 02: 3D & VFX SCULPTOR',
        builder: () => this.buildStationSculptor()
      },
      {
        id: 'lighting_artist',
        angle: 144,
        color: 0xff9e00,
        title: 'AGENT 03: LIGHTING ARTIST',
        builder: () => this.buildStationLighting()
      },
      {
        id: 'lore_director',
        angle: 216,
        color: 0xe0aaff,
        title: 'AGENT 04: LORE DIRECTOR',
        builder: () => this.buildStationLore()
      },
      {
        id: 'engine_guardian',
        angle: 288,
        color: 0x00b4d8,
        title: 'AGENT 05: ENGINE GUARDIAN',
        builder: () => this.buildStationEngine()
      }
    ];

    const radius = 24.0;

    stationConfigs.forEach((cfg) => {
      const rad = (cfg.angle * Math.PI) / 180;
      const x = Math.cos(rad) * radius;
      const z = Math.sin(rad) * radius;

      const stationGroup = new THREE.Group();
      stationGroup.position.set(x, 0, z);
      stationGroup.rotation.y = -rad + Math.PI; // Hướng mặt về tâm quảng trường

      // 1. Bệ đài đá tròn có gờ bậc tam cấp
      const plinthGeo = prepGeo(new THREE.CylinderGeometry(4.2, 4.6, 0.5, 24));
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.7,
        metalness: 0.3
      });
      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      plinthMesh.position.y = 0.25;
      plinthMesh.receiveShadow = false;
      stationGroup.add(plinthMesh);
      this.disposables.push(plinthGeo, plinthMat);

      // 2. Nhân vật AI Sub-Agent
      const avatar = this.createAgentAvatar(cfg.id, cfg.color, cfg.title);
      avatar.position.set(0, 0.5, 0.6);
      stationGroup.add(avatar);

      // 3. Bàn trình diễn trực quan đặc thù
      const displayProps = cfg.builder();
      if (displayProps) stationGroup.add(displayProps);

      this.group.add(stationGroup);
    });
  }

  /**
   * KHU 1: TRẠM QUY HOẠCH & KIẾN TRÚC (CURATOR ARCHITECT)
   */
  buildStationCurator() {
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0.5, -1.2);

    // Bàn sa bàn kiến trúc gỗ mun
    const tableGeo = prepGeo(new THREE.BoxGeometry(2.4, 0.8, 1.4));
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x241711, roughness: 0.6 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.4;
    tableGroup.add(table);

    // Sơ đồ mặt bằng 3D Cổ Loa Thành & Thôn Vĩ Dạ lơ lửng phát sáng
    const mapGeo = prepGeo(new THREE.PlaneGeometry(1.8, 1.0, 10, 10));
    const mapMat = new THREE.MeshBasicMaterial({
      color: 0x39e58c,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const mapMesh = new THREE.Mesh(mapGeo, mapMat);
    mapMesh.rotation.x = -Math.PI / 2.3;
    mapMesh.position.set(0, 0.95, 0);
    mapMesh.userData.ignoreRaycaster = true;
    tableGroup.add(mapMesh);

    // 3 Mô hình kiến trúc mini: Mái đao, Cột lim, Cầu đá
    const miniRoofGeo = prepGeo(new THREE.ConeGeometry(0.25, 0.2, 4));
    const miniRoofMat = new THREE.MeshStandardMaterial({ color: 0xd4af37 });
    const miniRoof = new THREE.Mesh(miniRoofGeo, miniRoofMat);
    miniRoof.position.set(-0.4, 1.05, 0.1);
    tableGroup.add(miniRoof);

    this.disposables.push(tableGeo, tableMat, mapGeo, mapMat, miniRoofGeo, miniRoofMat);
    return tableGroup;
  }

  /**
   * KHU 2: XƯỞNG ĐIÊU KHẮC 3D & VFX (SCULPTOR VFX)
   */
  buildStationSculptor() {
    const workshopGroup = new THREE.Group();
    workshopGroup.position.set(0, 0.5, -1.2);

    // Bệ chiếu Laser 4 góc (đường kính 2.4m, cao 0.4m, mặt bệ tại Y = 0.4)
    const baseGeo = prepGeo(new THREE.CylinderGeometry(1.2, 1.3, 0.4, 16));
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.2;
    workshopGroup.add(baseMesh);

    // Vòng quét laser Cyan (Laser Scan Ring) chuyển động quét dọc thân mô hình
    const laserRingGeo = prepGeo(new THREE.TorusGeometry(0.75, 0.02, 8, 32));
    const laserRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.85
    });
    const laserRing = new THREE.Mesh(laserRingGeo, laserRingMat);
    laserRing.rotation.x = Math.PI / 2;
    laserRing.position.y = 0.4;
    laserRing.userData.ignoreRaycaster = true;
    laserRing.raycast = () => {};
    workshopGroup.add(laserRing);

    // Bể thử nghiệm sóng nước phát sáng thu nhỏ
    const waterGeo = prepGeo(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 16));
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0077b6,
      roughness: 0.1,
      metalness: 0.9
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(1.4, 0.3, 0);
    workshopGroup.add(water);

    // Nhóm chứa mô hình điêu khắc 3D (Grounding chân mô hình chuẩn xác tại mặt bệ Y = 0.4)
    const modelHolder = new THREE.Group();
    modelHolder.name = 'Sculptor_Glb_Holder';
    modelHolder.position.set(0, 0.4, 0);
    workshopGroup.add(modelHolder);

    // 1. Tượng wireframe hologram fallback tức thì (Zero-wait render)
    const statueGeo = prepGeo(new THREE.TorusKnotGeometry(0.32, 0.09, 48, 8));
    const statueMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      wireframe: true
    });
    const statue = new THREE.Mesh(statueGeo, statueMat);
    statue.position.y = 0.45;
    statue.userData.ignoreRaycaster = true;
    statue.raycast = () => {};
    modelHolder.add(statue);

    // 2. Tự động nạp mô hình 3D .GLB thực tế của Di Sản (Vũ Nương / Thúy Kiều) chuẩn WebGL 60+ FPS
    loadGlbCached(
      ['/model/nguoicogainamxuong.glb', '/models/nguoicogainamxuong.glb', '/model/thuy_kieu.glb'],
      {
        prepareOptions: {
          targetSpan: 1.15,
          fitAxis: 'y',
          groundY: true,      // 100% tiếp đất sát sàn/mặt bệ tại Y = 0
          centerXZ: true,     // Căn giữa trục X/Z
          materialMode: 'unlit',
          color: 0x00f5d4,
          opacity: 0.92,
          ignoreRaycaster: true,
          castShadow: false,
          receiveShadow: false
        }
      }
    ).then((glbModel) => {
      if (!glbModel) return;
      glbModel.userData.ignoreRaycaster = true;
      glbModel.traverse((c) => {
        if (c.isMesh) {
          c.userData.ignoreRaycaster = true;
          c.raycast = () => {};
          c.castShadow = false;
          c.receiveShadow = false;
          c.frustumCulled = true;
          if (c.geometry) {
            sanitizeGeometryBuffers(c.geometry);
          }
        }
      });
      // Ẩn wireframe fallback và hiển thị mô hình GLB chi tiết cao
      statue.visible = false;
      modelHolder.add(glbModel);
      this.disposables.push(glbModel);
    }).catch((err) => {
      console.warn('[AICommandHub] loadGlbCached sculpture fallback active:', err?.message || err);
    });

    this.animatedObjects.push({
      type: 'sculptor_statue',
      holder: modelHolder,
      mesh: statue,
      laserRing: laserRing
    });

    this.disposables.push(
      baseGeo, baseMat, laserRingGeo, laserRingMat,
      waterGeo, waterMat, statueGeo, statueMat
    );
    return workshopGroup;
  }

  /**
   * KHU 3: ĐÀI ÁNH SÁNG & SHADER (LIGHTING ARTIST)
   */
  buildStationLighting() {
    const lightGroup = new THREE.Group();
    lightGroup.position.set(0, 0.5, -1.2);

    // 3 Quả cầu vật liệu PBR xoay lơ lửng: Gỗ lim, Đồng cổ, Ngọc bích
    const sphereGeo = prepGeo(new THREE.SphereGeometry(0.24, 16, 16));

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.65 });
    const woodSphere = new THREE.Mesh(sphereGeo, woodMat);
    woodSphere.position.set(-0.6, 0.9, 0);
    woodSphere.castShadow = false;
    woodSphere.receiveShadow = false;
    lightGroup.add(woodSphere);

    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 });
    const bronzeSphere = new THREE.Mesh(sphereGeo, bronzeMat);
    bronzeSphere.position.set(0, 1.05, 0);
    bronzeSphere.castShadow = false;
    bronzeSphere.receiveShadow = false;
    lightGroup.add(bronzeSphere);

    const jadeMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, roughness: 0.1, metalness: 0.2 });
    const jadeSphere = new THREE.Mesh(sphereGeo, jadeMat);
    jadeSphere.position.set(0.6, 0.9, 0);
    jadeSphere.castShadow = false;
    jadeSphere.receiveShadow = false;
    lightGroup.add(jadeSphere);

    // Đèn rọi Chiaroscuro mini đổi màu (tắt castShadow để tiết kiệm 6 shadow passes)
    const miniLight = new THREE.PointLight(0xff9e00, 1.8, 8.0);
    miniLight.position.set(0, 1.6, 0);
    miniLight.userData.ignoreRaycaster = true;
    miniLight.castShadow = false;
    lightGroup.add(miniLight);

    this.animatedObjects.push({
      type: 'pbr_spheres',
      spheres: [woodSphere, bronzeSphere, jadeSphere]
    });

    this.disposables.push(sphereGeo, woodMat, bronzeMat, jadeMat);
    return lightGroup;
  }

  /**
   * KHU 4: THƯ VIỆN HỌC THUẬT & ÂM THANH (LORE DIRECTOR)
   */
  buildStationLore() {
    const loreGroup = new THREE.Group();
    loreGroup.position.set(0, 0.5, -1.2);

    // Kệ sách cổ gỗ mun
    const shelfGeo = prepGeo(new THREE.BoxGeometry(1.6, 1.2, 0.5));
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x1a0f0a, roughness: 0.7 });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.y = 0.6;
    loreGroup.add(shelf);

    // Các cuộn thư phát sáng lơ lửng
    const scrollGeo = prepGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 12));
    const scrollMat = new THREE.MeshBasicMaterial({ color: 0xe0aaff });
    const scrollMesh = new THREE.Mesh(scrollGeo, scrollMat);
    scrollMesh.rotation.z = Math.PI / 3;
    scrollMesh.position.set(0, 1.4, 0);
    scrollMesh.userData.ignoreRaycaster = true;
    loreGroup.add(scrollMesh);

    // Cột sóng âm thanh 3D Equalizer
    const waveCount = 5;
    const waveGroup = new THREE.Group();
    const bars = [];
    for (let i = 0; i < waveCount; i++) {
      const barGeo = prepGeo(new THREE.BoxGeometry(0.08, 0.4, 0.08));
      const barMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set((i - 2) * 0.18, 0.7, 0.4);
      bar.userData.ignoreRaycaster = true;
      waveGroup.add(bar);
      bars.push(bar);
      this.disposables.push(barGeo, barMat);
    }
    loreGroup.add(waveGroup);

    this.animatedObjects.push({
      type: 'audio_waveform',
      bars,
      scrollMesh
    });

    this.disposables.push(shelfGeo, shelfMat, scrollGeo, scrollMat);
    return loreGroup;
  }

  /**
   * KHU 5: TRẠM KIỂM ĐỊNH HITBOX & HIỆU NĂNG (ENGINE GUARDIAN)
   */
  buildStationEngine() {
    const engineGroup = new THREE.Group();
    engineGroup.position.set(0, 0.5, -1.2);

    // Màn hình quét khung dây Box3 Collider xanh huỳnh quang thời gian thực
    const screenGeo = prepGeo(new THREE.PlaneGeometry(1.8, 1.1));
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.1, 0);
    screen.userData.ignoreRaycaster = true;
    engineGroup.add(screen);

    // Khung bao vật lý Box3 tượng trưng lơ lửng xoay
    const box3Geo = prepGeo(new THREE.BoxGeometry(0.7, 0.7, 0.7));
    const box3Mat = new THREE.MeshBasicMaterial({
      color: 0x39e58c,
      wireframe: true
    });
    const box3Mesh = new THREE.Mesh(box3Geo, box3Mat);
    box3Mesh.position.set(0, 1.1, 0.4);
    box3Mesh.userData.ignoreRaycaster = true;
    engineGroup.add(box3Mesh);

    this.animatedObjects.push({ type: 'box3_scanner', mesh: box3Mesh });
    this.disposables.push(screenGeo, screenMat, box3Geo, box3Mat);
    return engineGroup;
  }

  /**
   * CỔNG DỊCH CHUYỂN 2 CHIỀU TRỞ VỀ ĐẠI SẢNH THÁNH ĐƯỜNG
   */
  buildReturnPortal() {
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 34.0); // Đặt ở lối vào phía Nam của Căn Cứ
    portalGroup.rotation.y = Math.PI; // Hướng mặt vào trong quảng trường

    // 1. Thạch Môn Đông Sơn cách tân (Khung cổng đá xanh cao 6.5m, rộng 5.2m)
    const pillarGeo = prepGeo(new THREE.BoxGeometry(0.85, 6.2, 0.85));
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.6
    });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-2.2, 3.1, 0);
    portalGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(2.2, 3.1, 0);
    portalGroup.add(rightPillar);

    const beamGeo = prepGeo(new THREE.BoxGeometry(5.6, 0.9, 1.1));
    const beamMesh = new THREE.Mesh(beamGeo, pillarMat);
    beamMesh.position.set(0, 6.4, 0);
    portalGroup.add(beamMesh);

    // Mái đao cong trên đỉnh cổng
    const roofGeo = prepGeo(new THREE.ConeGeometry(3.6, 1.2, 4));
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a6d3b });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.position.set(0, 7.3, 0);
    portalGroup.add(roofMesh);

    // 2. Vòng xoáy Thời Không (Vortex Portal Mesh) phát quang vàng kim & xanh ngọc
    const vortexGeo = prepGeo(new THREE.CircleGeometry(2.1, 32));
    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide
    });
    const vortexMesh = new THREE.Mesh(vortexGeo, vortexMat);
    vortexMesh.position.set(0, 3.1, 0);
    portalGroup.add(vortexMesh);

    // Bảng chữ Hologram: [TRỞ VỀ ĐẠI SẢNH THÁNH ĐƯỜNG]
    const billboard = this.createStatusBillboard('TRỞ VỀ ĐẠI SẢNH THÁNH ĐƯỜNG', '#d4af37');
    billboard.position.set(0, 5.2, 0.3);
    portalGroup.add(billboard);

    // 3. Invisible Proxy Hitbox cho Cổng dịch chuyển (Tương tác click từ xa hoặc đi xuyên qua)
    const portalHitboxGeo = prepGeo(new THREE.BoxGeometry(4.4, 6.0, 2.0));
    const portalHitboxMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    const portalHitbox = new THREE.Mesh(portalHitboxGeo, portalHitboxMat);
    portalHitbox.position.set(0, 3.0, 0);
    portalHitbox.userData = {
      isPortalHitbox: true,
      targetAction: 'returnToLobby'
    };
    portalGroup.add(portalHitbox);
    this.portalMesh = portalHitbox;

    this.group.add(portalGroup);
    this.animatedObjects.push({ type: 'portal_vortex', mesh: vortexMesh });

    this.disposables.push(
      pillarGeo, pillarMat, beamGeo, roofGeo, roofMat,
      vortexGeo, vortexMat, portalHitboxGeo, portalHitboxMat
    );
  }

  /**
   * ÁNH SÁNG CHIAROSCURO & VFX HẠT SƯƠNG LÂN TINH
   */
  buildLightingAndVFX() {
    // 1. Ánh sáng nền mát dịu từ bầu trời sao
    const hemiLight = new THREE.HemisphereLight(0x0b0f19, 0x1a2332, 0.65);
    hemiLight.userData.ignoreRaycaster = true;
    this.group.add(hemiLight);

    // 2. Nguồn sáng trung tâm Chiaroscuro tỏa sáng từ đài Trống Đồng
    const coreLight = new THREE.PointLight(0xd4af37, 3.5, 45.0, 1.2);
    coreLight.position.set(0, 4.2, 0);
    coreLight.castShadow = false;
    coreLight.userData.ignoreRaycaster = true;
    this.group.add(coreLight);

    const cyanGlow = new THREE.PointLight(0x00f5d4, 2.0, 32.0, 1.4);
    cyanGlow.position.set(0, 1.5, 0);
    cyanGlow.castShadow = false;
    cyanGlow.userData.ignoreRaycaster = true;
    this.group.add(cyanGlow);

    // 3. Hệ thống hạt lân tinh phát quang mềm mịn (Soft Radial Falloff)
    const particleCount = 240;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const rad = Math.random() * 38.0;
      const ang = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(ang) * rad;
      positions[i * 3 + 1] = 0.5 + Math.random() * 8.0;
      positions[i * 3 + 2] = Math.sin(ang) * rad;
      phases[i] = Math.random() * Math.PI * 2;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    prepGeo(particleGeo);

    const pTex = createSoftParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.45,
      map: pTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    particleMat.userData = { ignoreRaycaster: true };

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    particleSystem.userData.ignoreRaycaster = true;
    particleSystem.raycast = () => {};
    this.group.add(particleSystem);

    this.animatedObjects.push({
      type: 'particles',
      system: particleSystem,
      phases
    });

    this.disposables.push(particleGeo, particleMat, pTex);
  }

  /**
   * TẠO GIAO DIỆN DIALOG ĐỐI THOẠI & THUYẾT MINH AI
   */
  createDialogUI() {
    if (typeof document === 'undefined') return;

    let panel = document.getElementById('ai-command-dialog-panel');
    if (panel) return;

    panel = document.createElement('div');
    panel.id = 'ai-command-dialog-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%) translateY(30px);
      width: min(860px, 92vw);
      max-height: 82vh;
      background: linear-gradient(135deg, rgba(11, 15, 25, 0.94) 0%, rgba(20, 30, 48, 0.92) 100%);
      border: 2px solid #d4af37;
      border-radius: 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 55, 0.25);
      color: #f3f4f6;
      font-family: "Segoe UI", Roboto, sans-serif;
      padding: 24px 28px;
      z-index: 100000;
      opacity: 0;
      pointer-events: none;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
      backdrop-filter: blur(12px);
    `;

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(212, 175, 55, 0.3); padding-bottom: 12px;">
        <div>
          <div id="ai-dialog-badge" style="display: inline-block; padding: 4px 10px; background: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; border-radius: 6px; font-size: 12px; font-weight: bold; color: #d4af37; letter-spacing: 1px; margin-bottom: 6px;">
            AI AGENT ONLINE
          </div>
          <h2 id="ai-dialog-name" style="margin: 0; font-size: 22px; color: #ffffff; text-shadow: 0 0 10px rgba(212, 175, 55, 0.4);">
            TÊN AI AGENT
          </h2>
          <div id="ai-dialog-title" style="font-size: 14px; color: #00f5d4; margin-top: 2px;">
            Danh xưng & Chức năng
          </div>
        </div>
        <button id="ai-dialog-close-btn" style="background: none; border: 1px solid rgba(255,255,255,0.2); color: #e5e7eb; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 18px; line-height: 1; transition: all 0.2s;">
          ✕
        </button>
      </div>

      <div style="background: rgba(0, 0, 0, 0.3); border-radius: 10px; padding: 14px 18px; border-left: 4px solid #d4af37;">
        <p id="ai-dialog-intro" style="margin: 0; font-size: 15px; line-height: 1.6; color: #e5e7eb;">
          Lời chào mở đầu của AI Agent...
        </p>
      </div>

      <div>
        <div style="font-size: 13px; font-weight: bold; color: #d4af37; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
          Kỹ Năng Quản Lý Chuyên Sâu (15 Skills)
        </div>
        <div id="ai-dialog-skills" style="display: flex; flex-wrap: wrap; gap: 8px;">
          <!-- Skills list tags -->
        </div>
      </div>

      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px;">
        <div style="font-size: 13px; font-weight: bold; color: #00f5d4; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">
          Đặt Câu Hỏi Tương Tác:
        </div>
        <div id="ai-dialog-questions" style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Question Buttons -->
        </div>
        <div id="ai-dialog-answer-box" style="display: none; margin-top: 12px; background: rgba(0, 245, 212, 0.08); border: 1px solid rgba(0, 245, 212, 0.3); border-radius: 8px; padding: 14px; font-size: 14.5px; line-height: 1.6; color: #e0f2fe;">
          <!-- Answer content -->
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const closeBtn = document.getElementById('ai-dialog-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDialogUI());
    }
  }

  showDialogUI(agentData) {
    const panel = document.getElementById('ai-command-dialog-panel');
    if (!panel || !agentData) return;

    this._activeAgentId = agentData.id;

    const badge = document.getElementById('ai-dialog-badge');
    const nameEl = document.getElementById('ai-dialog-name');
    const titleEl = document.getElementById('ai-dialog-title');
    const introEl = document.getElementById('ai-dialog-intro');
    const skillsContainer = document.getElementById('ai-dialog-skills');
    const questionsContainer = document.getElementById('ai-dialog-questions');
    const answerBox = document.getElementById('ai-dialog-answer-box');

    if (badge) {
      badge.style.borderColor = agentData.color || '#d4af37';
      badge.style.color = agentData.color || '#d4af37';
    }
    if (nameEl) nameEl.textContent = agentData.name;
    if (titleEl) {
      titleEl.textContent = agentData.title;
      titleEl.style.color = agentData.color || '#00f5d4';
    }
    if (introEl) introEl.textContent = agentData.intro;

    // Render Skills tags
    if (skillsContainer) {
      skillsContainer.innerHTML = '';
      (agentData.skills || []).forEach((sk) => {
        const tag = document.createElement('span');
        tag.style.cssText = `
          display: inline-block;
          padding: 3px 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-size: 12.5px;
          color: #f3f4f6;
        `;
        tag.textContent = sk;
        skillsContainer.appendChild(tag);
      });
    }

    // Render Question buttons
    if (questionsContainer && answerBox) {
      questionsContainer.innerHTML = '';
      answerBox.style.display = 'none';

      (agentData.qa || []).forEach((item) => {
        const btn = document.createElement('button');
        btn.style.cssText = `
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 8px;
          padding: 8px 14px;
          color: #e5e7eb;
          text-align: left;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        `;
        btn.textContent = `💬 ${item.q}`;
        btn.onmouseover = () => {
          btn.style.background = 'rgba(212, 175, 55, 0.2)';
          btn.style.borderColor = '#d4af37';
        };
        btn.onmouseout = () => {
          btn.style.background = 'rgba(255, 255, 255, 0.06)';
          btn.style.borderColor = 'rgba(212, 175, 55, 0.4)';
        };
        btn.onclick = () => {
          answerBox.style.display = 'block';
          answerBox.innerHTML = `<strong>💡 Trả lời:</strong> ${item.a}`;
        };
        questionsContainer.appendChild(btn);
      });
    }

    panel.style.opacity = '1';
    panel.style.pointerEvents = 'auto';
    panel.style.transform = 'translateX(-50%) translateY(0)';
  }

  closeDialogUI() {
    const panel = document.getElementById('ai-command-dialog-panel');
    if (!panel) return;
    panel.style.opacity = '0';
    panel.style.pointerEvents = 'none';
    panel.style.transform = 'translateX(-50%) translateY(30px)';
    this._activeAgentId = null;
  }

  createHubHUD() {
    try {
      if (typeof document === 'undefined') return;
      let hud = document.getElementById('ai-hub-top-hud');
      if (hud) return;
      hud = document.createElement('div');
      hud.id = 'ai-hub-top-hud';
      hud.style.cssText = `
        position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
        background: rgba(11, 15, 25, 0.85); border: 1px solid #00f5d4;
        border-radius: 20px; padding: 8px 20px; color: #00f5d4;
        font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold;
        letter-spacing: 1.5px; z-index: 10000; pointer-events: none;
        backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0, 245, 212, 0.2);
        display: none;
      `;
      hud.innerHTML = '⚡ CĂN CỨ AI COMMAND HUB • 60+ FPS • ZERO ALLOCATION';
      document.body.appendChild(hud);
    } catch (_) {}
  }

  setupPositionalAudios() {
    // Khởi tạo an toàn cho hệ thống PositionalAudio
  }

  /**
   * LẮNG NGHE SỰ KIỆN CLICK VÀ HOVER VÀO HITBOX
   */
  initInteractionEvents() {
    if (typeof window === 'undefined') return;

    const onPointerDown = (event) => {
      if (!this.group.visible || !this.isInsideHub) return;

      // Không raycast nếu click trúng dialog UI
      const panel = document.getElementById('ai-command-dialog-panel');
      if (panel && panel.contains(event.target)) return;

      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // 1. Kiểm tra Cổng dịch chuyển trở về Đại Sảnh
      if (this.portalMesh) {
        const portalIntersects = this.raycaster.intersectObject(this.portalMesh, true);
        if (portalIntersects.length > 0) {
          this.triggerReturnToLobby();
          return;
        }
      }

      // 2. Kiểm tra click vào AI Agents
      const agentIntersects = this.raycaster.intersectObjects(this.interactiveAgents, true);
      if (agentIntersects.length > 0) {
        const hit = agentIntersects[0].object;
        const agentId = hit.userData.agentId;
        const loreData = AI_SWARM_LORE[agentId];
        if (loreData) {
          this.showDialogUI(loreData);
        }
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    this._onPointerDown = onPointerDown;

    const onKeyDown = (e) => {
      if (!this.group.visible || !this.isInsideHub) return;
      if (e.key === 't' || e.key === 'T') {
        this.toggleSwarmAutoTour();
      } else if (e.key === 'Escape') {
        if (this._activeAgentId) {
          this.closeDialogUI();
        } else if (this._tourActive) {
          this.stopSwarmAutoTour();
        } else {
          this.triggerReturnToLobby();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    this._onKeyDown = onKeyDown;
  }

  /**
   * TẠO TOP HUD BANNER ĐIỀU KHIỂN & CHỈ SỐ HOẠT ĐỘNG SWARM
   */
  createHubHUD() {
    if (typeof document === 'undefined') return;
    let hud = document.getElementById('ai-hub-top-hud');
    if (hud) return;

    hud = document.createElement('div');
    hud.id = 'ai-hub-top-hud';
    hud.style.cssText = `
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      width: min(940px, 94vw);
      background: rgba(11, 15, 25, 0.88);
      border: 1px solid rgba(212, 175, 55, 0.45);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 245, 212, 0.15);
      backdrop-filter: blur(10px);
      padding: 10px 22px;
      display: none;
      justify-content: space-between;
      align-items: center;
      z-index: 99998;
      font-family: 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s ease;
    `;

    hud.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <span style="font-size: 22px;">🏛️</span>
        <div>
          <div style="font-weight: 700; font-size: 14px; color: #ffffff; letter-spacing: 0.5px;">
            CĂN CỨ ĐỘI QUÂN AI AGENT • KHU CHỈ HUY KIẾN TẠO THÁNH ĐƯỜNG
          </div>
          <div id="ai-hub-status-text" style="font-size: 11.5px; color: #00f5d4; margin-top: 1px;">
            🟢 TRẠNG THÁI: HOẠT ĐỘNG • 60+ FPS • SẴN SÀNG
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button id="ai-hub-autotour-btn" style="
          background: rgba(0, 245, 212, 0.15);
          border: 1px solid #00f5d4;
          color: #00f5d4;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">🎬 Swarm Auto-Tour [T]</button>
        <button id="ai-hub-return-btn" style="
          background: rgba(212, 175, 55, 0.15);
          border: 1px solid #d4af37;
          color: #d4af37;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">🚪 Về Đại Sảnh [ESC]</button>
      </div>
    `;

    document.body.appendChild(hud);

    const tourBtn = document.getElementById('ai-hub-autotour-btn');
    if (tourBtn) {
      tourBtn.addEventListener('click', () => this.toggleSwarmAutoTour());
    }

    const returnBtn = document.getElementById('ai-hub-return-btn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => this.triggerReturnToLobby());
    }
  }

  /**
   * THIẾT LẬP NGUỒN ÂM THANH 3D POSITIONALAUDIO TRONG CĂN CỨ AI
   * Chuẩn hóa: refDistance = 3.0 - 4.0, rolloffFactor = 1.5
   */
  setupPositionalAudios() {
    if (this.positionalAudios.length > 0) return;
    try {
      const audioMgr = this.audioManager || (typeof window !== 'undefined' ? (window.audioManager || window.__spatialAudio) : null);
      const listener = audioMgr?.listener;
      if (!listener) return;

      const ctx = listener.context;
      if (!ctx) return;

      // 1. Nguồn âm đài Tổng Chỉ Huy & Sa Bàn Trung Tâm (Hologram Core & Drum)
      const orchestratorAnchor = new THREE.Object3D();
      orchestratorAnchor.name = 'AI_Hub_Audio_OrchestratorCenter';
      orchestratorAnchor.position.set(0, 2.2, 0);
      orchestratorAnchor.userData.ignoreRaycaster = true;
      this.group.add(orchestratorAnchor);

      const orchestratorPosAudio = new THREE.PositionalAudio(listener);
      orchestratorPosAudio.setRefDistance(4.0);
      orchestratorPosAudio.setMaxDistance(26.0);
      orchestratorPosAudio.setRolloffFactor(1.5);
      orchestratorPosAudio.setVolume(0.42);
      orchestratorPosAudio.setLoop(true);

      const droneBuf = createHubAmbientDroneBuffer(ctx);
      if (droneBuf) {
        orchestratorPosAudio.setBuffer(droneBuf);
      }
      orchestratorAnchor.add(orchestratorPosAudio);
      this.positionalAudios.push(orchestratorPosAudio);

      // 2. Nguồn âm Trạm Lore & Sound Director (Agent 04 - 216 độ, R = 24m)
      const loreRad = (216 * Math.PI) / 180;
      const loreX = Math.cos(loreRad) * 24.0;
      const loreZ = Math.sin(loreRad) * 24.0;

      const loreAnchor = new THREE.Object3D();
      loreAnchor.name = 'AI_Hub_Audio_LoreStation';
      loreAnchor.position.set(loreX, 1.2, loreZ);
      loreAnchor.userData.ignoreRaycaster = true;
      this.group.add(loreAnchor);

      const lorePosAudio = new THREE.PositionalAudio(listener);
      lorePosAudio.setRefDistance(3.0);
      lorePosAudio.setMaxDistance(20.0);
      lorePosAudio.setRolloffFactor(1.5);
      lorePosAudio.setVolume(0.48);
      lorePosAudio.setLoop(true);

      const harmonicBuf = createLoreStationHarmonicBuffer(ctx);
      if (harmonicBuf) {
        lorePosAudio.setBuffer(harmonicBuf);
      }
      loreAnchor.add(lorePosAudio);
      this.positionalAudios.push(lorePosAudio);

      console.log("%c✓ AI Command Hub PositionalAudio configured (ref: 3-4, rolloff: 1.5)", "color: #e0aaff; font-weight: bold;");

      if (this.isInsideHub) {
        this.startHubAudios();
      }
    } catch (e) {
      console.warn('[AICommandHub] setupPositionalAudios self-healing:', e);
    }
  }

  setAudioManager(mgr) {
    this.audioManager = mgr;
    this.setupPositionalAudios();
  }

  startHubAudios() {
    if (!this.positionalAudios.length) {
      this.setupPositionalAudios();
    }
    this.positionalAudios.forEach((audio) => {
      try {
        const ctx = audio.context;
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        if (!audio.isPlaying && audio.buffer) {
          audio.play();
        }
      } catch (_) {}
    });
  }

  stopHubAudios() {
    this.positionalAudios.forEach((audio) => {
      try {
        if (audio.isPlaying) {
          audio.pause();
        }
      } catch (_) {}
    });
  }

  /**
   * SWARM AUTO-TOUR CAMERA (ĐIỆN ẢNH 6 PHÂN KHU, ZERO-ALLOCATION)
   */
  startSwarmAutoTour(startIndex = 0) {
    if (!this.camera) return;
    this._tourActive = true;
    this._tourIdx = startIndex % SWARM_HUB_AUTO_TOUR_WAYPOINTS.length;
    this._beginTourFlight(this._tourIdx);

    const tourBtn = document.getElementById('ai-hub-autotour-btn');
    if (tourBtn) {
      tourBtn.textContent = '⏹ Dừng Tour [ESC]';
      tourBtn.style.background = 'rgba(239, 68, 68, 0.25)';
      tourBtn.style.borderColor = '#ef4444';
      tourBtn.style.color = '#f87171';
    }
  }

  stopSwarmAutoTour() {
    this._tourActive = false;
    this._tourPhase = 'idle';
    this.closeDialogUI();

    const tourBtn = document.getElementById('ai-hub-autotour-btn');
    if (tourBtn) {
      tourBtn.textContent = '🎬 Swarm Auto-Tour [T]';
      tourBtn.style.background = 'rgba(0, 245, 212, 0.15)';
      tourBtn.style.borderColor = '#00f5d4';
      tourBtn.style.color = '#00f5d4';
    }

    const statusText = document.getElementById('ai-hub-status-text');
    if (statusText) {
      statusText.textContent = '🟢 TRẠNG THÁI: HOẠT ĐỘNG • 60+ FPS • THAM QUAN TỰ DO';
    }
  }

  toggleSwarmAutoTour() {
    if (this._tourActive) this.stopSwarmAutoTour();
    else this.startSwarmAutoTour(0);
  }

  nextSwarmWaypoint() {
    if (!this._tourActive) return;
    this._tourIdx = (this._tourIdx + 1) % SWARM_HUB_AUTO_TOUR_WAYPOINTS.length;
    this._beginTourFlight(this._tourIdx);
  }

  _beginTourFlight(idx) {
    const wp = SWARM_HUB_AUTO_TOUR_WAYPOINTS[idx];
    this._tourPhase = 'flying';
    this._tourPhaseStart = performance.now();

    this._tourStartPos.copy(this.camera.position);
    this._tourStartQuat.copy(this.camera.quaternion);

    this._tourTargetPos.copy(wp.cameraPos);
    this._tourTmpCam.position.copy(wp.cameraPos);
    this._tourTmpCam.lookAt(wp.lookAtPos);
    this._tourTargetQuat.copy(this._tourTmpCam.quaternion);

    const statusText = document.getElementById('ai-hub-status-text');
    if (statusText) {
      statusText.textContent = `🚀 Đang di chuyển: ${wp.title}...`;
    }
  }

  updateSwarmAutoTour(nowMs) {
    if (!this._tourActive || this._tourPhase === 'idle' || !this.camera) return;
    const wp = SWARM_HUB_AUTO_TOUR_WAYPOINTS[this._tourIdx];
    if (!wp) return;

    if (this._tourPhase === 'flying') {
      const elapsed = nowMs - this._tourPhaseStart;
      const t = Math.min(1.0, elapsed / 2500);
      const e = easeInOutCubic(t);

      this.camera.position.lerpVectors(this._tourStartPos, this._tourTargetPos, e);
      this.camera.quaternion.slerpQuaternions(this._tourStartQuat, this._tourTargetQuat, e);

      if (t >= 1.0) {
        this._tourPhase = 'dwelling';
        this._tourPhaseStart = nowMs;

        const statusText = document.getElementById('ai-hub-status-text');
        if (statusText) {
          statusText.textContent = `📍 ${wp.title}`;
        }

        if (wp.agentId && AI_SWARM_LORE[wp.agentId]) {
          this.showDialogUI(AI_SWARM_LORE[wp.agentId]);
        }
      }
    } else if (this._tourPhase === 'dwelling') {
      const dwellElapsed = nowMs - this._tourPhaseStart;
      if (dwellElapsed >= (wp.dwellMs || 7000)) {
        this.closeDialogUI();
        this.nextSwarmWaypoint();
      }
    }
  }

  onEnterHub() {
    this.isInsideHub = true;
    const hud = document.getElementById('ai-hub-top-hud');
    if (hud) hud.style.display = 'flex';
    this.startHubAudios();
  }

  onExitHub() {
    this.isInsideHub = false;
    const hud = document.getElementById('ai-hub-top-hud');
    if (hud) hud.style.display = 'none';
    this.stopHubAudios();
    this.stopSwarmAutoTour();
    this.closeDialogUI();
  }

  /**
   * ĐĂNG KÝ BOX3 COLLIDERS & PROXY HITBOXES VÀO HỆ THỐNG VẬT LÝ BẢO TÀNG (MUSEUM HITBOX SYSTEM)
   */
  buildHitboxesAndColliders() {
    const hitboxMgr = getMuseumHitboxManager(this.scene);
    if (!hitboxMgr) return;

    // 1. Box3 Collider cho Đài Trống Đồng & AI Tổng Chỉ Huy ở trung tâm (R = 3.4m, H = 2.2m)
    const altarBox = new THREE.Box3(
      new THREE.Vector3(-3.4, 0.0, -3.4),
      new THREE.Vector3(3.4, 2.2, 3.4)
    );
    hitboxMgr.registerSolidObjectCollider(null, {
      customBox: altarBox,
      tag: 'AI_Command_Hub_Central_Altar',
      helperColor: 0xd4af37,
      realm: 'ai_command_hub'
    });

    // 2. Box3 Colliders cho 5 Trạm Làm Việc Sub-Agents (R = 24.0m)
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 * Math.PI) / 180;
      const sx = Math.cos(angle) * 24.0;
      const sz = Math.sin(angle) * 24.0;
      const stationBox = new THREE.Box3(
        new THREE.Vector3(sx - 2.2, 0.0, sz - 2.2),
        new THREE.Vector3(sx + 2.2, 2.0, sz + 2.2)
      );
      hitboxMgr.registerSolidObjectCollider(null, {
        customBox: stationBox,
        tag: `AI_Command_Hub_Station_${i}`,
        helperColor: 0x00f5d4,
        realm: 'ai_command_hub'
      });
    }

    // 3. Khung bao vật lý Box3 ngoại vi bảo vệ 8 hướng chống rơi vực (Perimeter Boundaries at R = 40.5m)
    const perimeterSegments = 8;
    const boundaryRadius = 40.5;
    for (let i = 0; i < perimeterSegments; i++) {
      const angle = (i * 2 * Math.PI) / perimeterSegments;
      const bx = Math.cos(angle) * boundaryRadius;
      const bz = Math.sin(angle) * boundaryRadius;
      const boundBox = new THREE.Box3(
        new THREE.Vector3(bx - 3.5, 0.0, bz - 3.5),
        new THREE.Vector3(bx + 3.5, 6.0, bz + 3.5)
      );
      hitboxMgr.registerSolidObjectCollider(null, {
        customBox: boundBox,
        tag: `AI_Command_Hub_Boundary_${i}`,
        helperColor: 0xff0055,
        realm: 'ai_command_hub'
      });
    }
  }

  /**
   * KÍCH HOẠT DỊCH CHUYỂN TRỞ VỀ ĐẠI SẢNH THÁNH ĐƯỜNG
   */
  triggerReturnToLobby() {
    const now = performance.now();
    if (this._lastReturnTime && now - this._lastReturnTime < 2500) return;
    this._lastReturnTime = now;
    console.log("%c[AI Command Hub] Teleporting back to Grand Lobby...", "color: #d4af37; font-weight: bold;");
    this.closeDialogUI();

    if (this.onReturnToLobby) {
      this.onReturnToLobby();
    } else if (typeof window !== 'undefined' && window.exitAICommandHub) {
      window.exitAICommandHub();
    } else if (typeof window !== 'undefined' && window.__app?.exitAICommandHub) {
      window.__app.exitAICommandHub();
    }
  }

  /**
   * VÒNG LẶP ANIMATION (ZERO ALLOCATION WEBGL 60+ FPS)
   */
  update(delta, elapsedTime, camera) {
    if (!this.group.visible) return;

    // 0. Cập nhật Swarm Auto-Tour (Zero-Allocation)
    this.updateSwarmAutoTour(performance.now());

    // 1. Kiểm tra cự ly tự động kích hoạt Cổng trở về (Walk-in portal <= 2.4m)
    if (camera && this.portalMesh) {
      this._vTmp1.set(0, 1.8, 34.0); // Tọa độ cổng dịch chuyển
      const distToPortal = camera.position.distanceTo(this._vTmp1);
      if (distToPortal <= 2.4) {
        this.triggerReturnToLobby();
        return;
      }

      // Tự động đóng dialog nếu người chơi đi quá xa (> 7.0m)
      if (this._activeAgentId) {
        const agentHitbox = this.agentHitboxMap?.get(this._activeAgentId);
        if (agentHitbox) {
          agentHitbox.getWorldPosition(this._vTmp2);
          if (camera.position.distanceTo(this._vTmp2) > 7.5) {
            this.closeDialogUI();
          }
        }
      }
    }

    // 2. Cập nhật các đối tượng chuyển động trong Căn Cứ
    for (let i = 0; i < this.animatedObjects.length; i++) {
      const obj = this.animatedObjects[i];

      if (obj.type === 'skydome') {
        if (obj.mat?.uniforms?.uTime) {
          obj.mat.uniforms.uTime.value = elapsedTime;
        }
      } else if (obj.type === 'hologram_core') {
        // Sa bàn Thánh đường xoay nhẹ & nhấp nhô lơ lửng
        obj.group.rotation.y = elapsedTime * 0.45;
        obj.group.position.y = 2.6 + Math.sin(elapsedTime * 1.8) * 0.08;
        obj.ring.rotation.z = -elapsedTime * 0.8;
      } else if (obj.type === 'agent_avatar') {
        // Cử động thở nhẹ (idle breathing) + gật đầu quan sát
        const phase = elapsedTime * 2.2 + obj.phaseOffset;
        obj.avatarGroup.position.y = obj.baseY + Math.sin(phase) * 0.03;
        obj.headGroup.rotation.x = Math.sin(phase * 0.8) * 0.06;
        obj.headGroup.rotation.y = Math.cos(phase * 0.5) * 0.08;
        obj.leftArm.rotation.x = Math.sin(phase * 1.2) * 0.08;
        obj.rightArm.rotation.x = -Math.sin(phase * 1.2) * 0.08;
      } else if (obj.type === 'particles') {
        // Hạt lân tinh bay lơ lửng nhẹ nhàng
        const posAttr = obj.system.geometry.attributes.position;
        const arr = posAttr.array;
        const phases = obj.phases;
        const count = phases.length;

        for (let j = 0; j < count; j++) {
          const yIdx = j * 3 + 1;
          arr[yIdx] += Math.sin(elapsedTime * 1.2 + phases[j]) * 0.008;
          if (arr[yIdx] > 9.5) arr[yIdx] = 0.5;
          if (arr[yIdx] < 0.5) arr[yIdx] = 9.5;
        }
        posAttr.needsUpdate = true;
      } else if (obj.type === 'portal_vortex') {
        // Vòng xoáy thời không xoay liên tục
        obj.mesh.rotation.z = elapsedTime * 1.2;
      } else if (obj.type === 'pbr_spheres') {
        // 3 Quả cầu vật liệu xoay nhẹ (zero iterator allocation)
        for (let s = 0; s < obj.spheres.length; s++) {
          obj.spheres[s].rotation.y = elapsedTime * 0.6;
        }
      } else if (obj.type === 'audio_waveform') {
        // Cột sóng âm thanh nhấp nhô
        for (let k = 0; k < obj.bars.length; k++) {
          obj.bars[k].scale.y = 0.4 + Math.sin(elapsedTime * 4.0 + k * 1.2) * 0.6;
        }
        obj.scrollMesh.rotation.y = elapsedTime * 0.8;
      } else if (obj.type === 'sculptor_statue') {
        if (obj.holder) {
          obj.holder.rotation.y = elapsedTime * 0.5;
        } else if (obj.mesh) {
          obj.mesh.rotation.y = elapsedTime * 0.5;
        }
        if (obj.laserRing) {
          obj.laserRing.position.y = 0.45 + (Math.sin(elapsedTime * 2.4) * 0.5 + 0.5) * 0.85;
        }
      } else if (obj.type === 'box3_scanner') {
        obj.mesh.rotation.x = elapsedTime * 0.7;
        obj.mesh.rotation.y = elapsedTime * 0.9;
      }
    }
  }

  /**
   * THU HỒI TÀI NGUYÊN TRIỆT ĐỂ (MEMORY LEAK PROTECTION)
   */
  dispose() {
    if (typeof window !== 'undefined' && this._onPointerDown) {
      window.removeEventListener('pointerdown', this._onPointerDown);
    }
    if (typeof window !== 'undefined' && this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
    }

    const hud = document.getElementById('ai-hub-top-hud');
    if (hud && hud.parentNode) {
      hud.parentNode.removeChild(hud);
    }

    this.stopHubAudios();
    this.positionalAudios.forEach((audio) => {
      try {
        if (audio.isPlaying) audio.stop();
        if (audio.parent) audio.parent.remove(audio);
        if (audio.disconnect) audio.disconnect();
      } catch (_) {}
    });
    this.positionalAudios = [];

    const hitboxMgr = getMuseumHitboxManager();
    if (hitboxMgr?.clearRealmHitboxes) {
      hitboxMgr.clearRealmHitboxes('ai_command_hub');
    }

    const panel = document.getElementById('ai-command-dialog-panel');
    if (panel && panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }

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

    this.disposables = [];
    this.animatedObjects = [];
    this.interactiveAgents = [];
    if (this.agentHitboxMap) {
      this.agentHitboxMap.clear();
    }

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this.initialized = false;
    this.isInsideHub = false;
    console.log("%c✓ AI Command Hub World disposed cleanly.", "color: #888;");
  }
}

export default AICommandHubWorld;
