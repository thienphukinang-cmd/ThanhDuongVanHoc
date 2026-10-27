/**
 * ARCHITECTURAL DIMENSIONS & ZONING (MONUMENTAL INDOCHINE BLOCKOUT)
 * Skills: threejs-design-director & threejs-procedural-architecture
 * 
 * Quy hoạch tòa nhà kiến trúc Đông Dương 3 tầng quy mô siêu lớn:
 * - Sảnh chính thông tầng từ tầng 1 lên sát mái vòm kính
 * - Hành lang mở bao quanh cả 3 tầng
 * - 15 phòng riêng biệt (5 phòng mỗi tầng) với cửa vòm lớn mở ra sảnh chính
 * - Hệ thống cầu thang chữ Y uốn lượn mềm mại
 */

export const GOLDEN_RATIO = 1.61803398875;

export const DIMENSIONS = {
  // Sảnh chính (Grand Atrium) - Monumental Scale
  atrium: {
    width: 88,             // 88 meters total building core width
    depth: 88,             // 88 meters total building core depth
    voidWidth: 44,         // Central open lightwell void width
    voidDepth: 44,         // Central open lightwell void depth
    height: 38.2,          // Golden ratio height to skylight apex
  },

  // Trần nhà chính
  ceiling: {
    height: 32.0,
    cofferDepth: 1.5,
    roofRidgeHeight: 39.5,
  },

  // Quy hoạch 3 Tầng (3 Tiers / Floors)
  levels: [
    {
      id: 1,
      name: 'Tầng 1 - Đại Sảnh Văn Học & Gian Triển Lãm',
      elevation: 0,
      height: 10.0,
      rooms: ['Phòng 101 (Tây-Nam)', 'Phòng 102 (Tây-Bắc)', 'Phòng 103 (Bắc - Đại Gian)', 'Phòng 104 (Đông-Bắc)', 'Phòng 105 (Đông-Nam)']
    },
    {
      id: 2,
      name: 'Tầng 2 - Hành Lang Mở & 5 Phòng Triển Lãm',
      elevation: 10.0,
      height: 10.0,
      slabThickness: 0.8,
      rooms: ['Phòng 201 (Tây-Nam)', 'Phòng 202 (Tây-Bắc)', 'Phòng 203 (Bắc - Đại Gian)', 'Phòng 204 (Đông-Bắc)', 'Phòng 205 (Đông-Nam)']
    },
    {
      id: 3,
      name: 'Tầng 3 - Thượng Tầng & 5 Phòng Chuyên Đề',
      elevation: 20.0,
      height: 12.0,
      slabThickness: 0.8,
      rooms: ['Phòng 301 (Tây-Nam)', 'Phòng 302 (Tây-Bắc)', 'Phòng 303 (Bắc - Đại Gian)', 'Phòng 304 (Đông-Bắc)', 'Phòng 305 (Đông-Nam)']
    }
  ],

  // Quy hoạch 5 Phòng trên mỗi tầng (Total = 15 phòng)
  // Bố trí dọc theo hành lang các cánh Tây, Bắc, Đông bao quanh sảnh chính
  roomSpecs: [
    // Cánh Tây (2 phòng)
    { id: 'west_south', name: 'Phòng Tây-Nam', center: [-46, 0, 16], size: [24, 28], archFacing: 'east', archPos: [-34, 16] },
    { id: 'west_north', name: 'Phòng Tây-Bắc', center: [-46, 0, -16], size: [24, 28], archFacing: 'east', archPos: [-34, -16] },
    // Cánh Bắc (1 đại gian trung tâm)
    { id: 'north_center', name: 'Phòng Bắc - Đại Gian', center: [0, 0, -46], size: [40, 24], archFacing: 'south', archPos: [0, -34] },
    // Cánh Đông (2 phòng)
    { id: 'east_north', name: 'Phòng Đông-Bắc', center: [46, 0, -16], size: [24, 28], archFacing: 'west', archPos: [34, -16] },
    { id: 'east_south', name: 'Phòng Đông-Nam', center: [46, 0, 16], size: [24, 28], archFacing: 'west', archPos: [34, 16] }
  ],

  // Cửa vòm lớn (Monumental Arch Doorways)
  archDoorway: {
    width: 6.5,
    height: 7.8,
    archRadius: 3.25,
    wallThickness: 0.6,
  },

  // Hàng Cột tròn chịu lực khổng lồ (Colossal White Marble Pillars)
  pillars: {
    radius: 1.35,          // Massive monolithic pillar (2.7m diameter)
    height: 32.0,          // Chạy thẳng từ tầng 1 lên sát mái
    radialSegments: 48,
    spacing: 12.0,
    basePlinthRadius: 1.9,
    basePlinthHeight: 1.2,
    capitalRadius: 2.0,
    capitalHeight: 1.4,
  },

  // Mái vòm kính giếng trời (Glass Skylight Dome)
  skylight: {
    elevation: 32.0,
    domeRadius: 18.0,      // 36m diameter majestic glass dome
    domeHeight: 7.5,
    oculusRadius: 4.0,
  },

  // Cầu thang chữ Y (Bifurcated Grand Staircase)
  staircase: {
    centralFlightWidth: 6.0,
    branchFlightWidth: 4.2,
    treadDepth: 0.38,
    stepRiser: 0.18,
    handrailHeight: 1.05,
  }
};
