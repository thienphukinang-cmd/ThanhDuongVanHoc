import assert from 'node:assert';
import {
  AN_DUONG_VUONG_FOUR_PART_LORE,
  LORE_HOTSPOTS,
  LORE_DATA,
  LITERARY_QUEST_QUESTIONS,
  AI_DOCENT_TOPICS,
  showAnDuongVuongFourPartLore,
  createAnDuongVuongLoreOverlayDOM,
  closeAnDuongVuongLoreOverlay,
  focusCameraOnArtifact,
  smoothFocusCameraOnHotspot,
  AnDuongVuongLoreOverlay,
  triggerAnDuongVuongLore
} from '../src/modules/anDuongVuongLoreOverlay.js';

console.log('Testing anDuongVuongLoreOverlay.js...');

// 1. Check data sections
assert.strictEqual(AN_DUONG_VUONG_FOUR_PART_LORE.length, 4, 'Must have 4 sections');

const expectedTitles = [
  'Kỳ tích xây thành Cổ Loa & thần Kim Quy',
  'Nỏ Thần Liên Châu & chiến thắng quân Triệu Đà',
  'Bi kịch Mị Châu – Trọng Thủy & dấu áo lông ngỗng',
  'Ý nghĩa Ngọc Trai – Giếng Nước & bài học cảnh giác giữ nước'
];

AN_DUONG_VUONG_FOUR_PART_LORE.forEach((sec, idx) => {
  assert.strictEqual(sec.title, expectedTitles[idx], `Section ${idx + 1} title mismatch`);
  assert(sec.quote && sec.quote.length > 20, `Section ${idx + 1} quote must be present`);
  assert(sec.historyText && sec.historyText.length > 50, `Section ${idx + 1} historyText must be present`);
  assert(sec.analysisText && sec.analysisText.length > 50, `Section ${idx + 1} analysisText must be present`);
  assert(Array.isArray(sec.artifacts) && sec.artifacts.length >= 2, `Section ${idx + 1} artifacts must be array`);
  assert(sec.focusPos && sec.lookTarget, `Section ${idx + 1} camera focus points must exist`);
  console.log(`✓ Section ${idx + 1}: "${sec.title}" verified`);
});

// 2. Check functions in headless mode (document undefined fallback)
assert.strictEqual(typeof showAnDuongVuongFourPartLore, 'function');
assert.strictEqual(typeof createAnDuongVuongLoreOverlayDOM, 'function');
assert.strictEqual(typeof closeAnDuongVuongLoreOverlay, 'function');
assert.strictEqual(typeof focusCameraOnArtifact, 'function');

// Without global.document, returns null safely
const nullDom = createAnDuongVuongLoreOverlayDOM();
assert.strictEqual(nullDom, null, 'createAnDuongVuongLoreOverlayDOM returns null if document undefined');

// 3. Test with mock DOM
globalThis.document = {
  head: {
    appendChild: () => {}
  },
  body: {
    appendChild: () => {}
  },
  getElementById: (id) => null,
  createElement: (tag) => {
    const el = {
      tagName: tag,
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      children: [],
      classList: {
        add: (c) => {},
        remove: (c) => {},
        contains: (c) => false
      },
      setAttribute: () => {},
      getAttribute: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => ({
        textContent: '',
        innerHTML: '',
        style: {},
        classList: { add: () => {}, remove: () => {} },
        addEventListener: () => {}
      }),
      querySelectorAll: () => []
    };
    return el;
  },
  querySelectorAll: () => [],
  exitPointerLock: () => {}
};

globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};

const mockModal = createAnDuongVuongLoreOverlayDOM();
assert(mockModal !== null, 'createAnDuongVuongLoreOverlayDOM creates element with mock document');

const shown = showAnDuongVuongFourPartLore(0);
assert(shown !== null, 'showAnDuongVuongFourPartLore returns modal element');

closeAnDuongVuongLoreOverlay();

// 4. Test Literary Quest Questions & AI Docent Topics
assert.strictEqual(LITERARY_QUEST_QUESTIONS.length, 3, 'Must have 3 quiz questions');
LITERARY_QUEST_QUESTIONS.forEach((q, i) => {
  assert(q.question && q.question.length > 10, `Question ${i + 1} text required`);
  assert.strictEqual(q.options.length, 4, `Question ${i + 1} must have 4 options`);
  assert(typeof q.correctIndex === 'number', `Question ${i + 1} correctIndex must be number`);
  assert(q.explanation && q.explanation.length > 20, `Question ${i + 1} explanation required`);
});
console.log('✓ Literary Quest 3-question quiz verified');

assert(Array.isArray(AI_DOCENT_TOPICS) && AI_DOCENT_TOPICS.length >= 4, 'Must have >= 4 AI Docent topics');
AI_DOCENT_TOPICS.forEach((item, i) => {
  assert(item.prompt && item.prompt.length > 10, `Docent topic ${i + 1} prompt required`);
  assert(item.response && item.response.length > 50, `Docent topic ${i + 1} response required`);
});
console.log('✓ AI Literary Docent topics verified');

// 5. Test AnDuongVuongLoreOverlay class instance
const overlayInstance = new AnDuongVuongLoreOverlay(globalThis.document.body);
assert(typeof overlayInstance.show === 'function', 'AnDuongVuongLoreOverlay.show must be function');
assert(typeof overlayInstance.hide === 'function', 'AnDuongVuongLoreOverlay.hide must be function');
assert(typeof overlayInstance.dispose === 'function', 'AnDuongVuongLoreOverlay.dispose must be function');

const shownStatue = overlayInstance.show('statue');
assert(shownStatue !== null, 'overlayInstance.show("statue") must return element');
overlayInstance.hide();
overlayInstance.dispose();
console.log('✓ AnDuongVuongLoreOverlay class lifecycle verified');

// 6. Test camera focus helper
const mockCamera = {
  position: { set: (x, y, z) => { mockCamera.position.x = x; mockCamera.position.y = y; mockCamera.position.z = z; } },
  lookAt: (x, y, z) => {}
};
const mockControls = {
  target: { set: (x, y, z) => { mockControls.target.x = x; mockControls.target.y = y; mockControls.target.z = z; } },
  update: () => {}
};
const focusRes = focusCameraOnArtifact('crossbow', mockCamera, mockControls);
assert.strictEqual(focusRes, true, 'focusCameraOnArtifact must return true');
assert.strictEqual(mockCamera.position.x, -5, 'Camera position X must be -5 for crossbow');
console.log('✓ focusCameraOnArtifact verified');

// 7. Test triggerAnDuongVuongLore
const triggerRes = triggerAnDuongVuongLore(1);
assert(triggerRes !== null, 'triggerAnDuongVuongLore must return modal element');
closeAnDuongVuongLoreOverlay();
console.log('✓ triggerAnDuongVuongLore verified');

// 8. Test 6 Epic Realm Hotspots
assert.strictEqual(Array.isArray(LORE_HOTSPOTS), true, 'LORE_HOTSPOTS must be an array');
assert.strictEqual(LORE_HOTSPOTS.length, 6, 'Must have exactly 6 Lore Hotspots for 240m x 240m realm');

const expectedHotspotIds = [
  'dien_ngu_trieu',
  'thanh_xoan_oc',
  'vong_lau_no_than',
  'lau_vong_nguyet',
  'duong_long_ngong',
  'vach_da_son_kim_quy'
];

LORE_HOTSPOTS.forEach((spot, idx) => {
  assert.strictEqual(spot.id, expectedHotspotIds[idx], `Hotspot ${idx + 1} id mismatch`);
  assert(spot.name && spot.name.length > 5, `Hotspot ${idx + 1} name required`);
  assert(spot.coordinates && typeof spot.coordinates.x === 'number', `Hotspot ${idx + 1} coordinates required`);
  assert(spot.camera && spot.camera.pos && spot.camera.look, `Hotspot ${idx + 1} camera focus configs required`);
  assert(spot.description && spot.description.length > 30, `Hotspot ${idx + 1} description required`);
  console.log(`  ✓ Hotspot ${idx + 1}: ${spot.name} (${spot.id}) verified`);
});
console.log('✓ All 6 Realm Hotspots verified');

// 9. Test smoothFocusCameraOnHotspot
const smoothRes = smoothFocusCameraOnHotspot('vach_da_son_kim_quy', mockCamera, mockControls, 500);
assert.strictEqual(smoothRes, true, 'smoothFocusCameraOnHotspot must return true');
assert.strictEqual(mockCamera.position.z, 105, 'Camera Z must be set to 105 for vach_da_son_kim_quy');
console.log('✓ smoothFocusCameraOnHotspot verified');

console.log('✓ All Lore Overlay tests passed successfully!');
