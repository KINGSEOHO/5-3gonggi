const test = require('node:test');
const assert = require('node:assert');
const AV = require('../js/avatar.js');

test('예전 저장값(color, face)도 그대로 읽는다', () => {
  const look = AV.normalize({ color: '#3d72d9', face: 'cool' }, 0);
  assert.strictEqual(look.shirt, '#3d72d9');
  assert.strictEqual(look.face, 'cool');
  assert.ok(look.hair && look.pants && look.skin);
});

test('잠긴 아이템은 티어가 낮으면 저장할 때 기본으로 바뀐다', () => {
  const look = Object.assign(AV.defaults(0), { hat: 'crown', back: 'wings', top: 'armor', face: 'star' });
  const low = AV.allowed(look, 3);   // 골드
  assert.strictEqual(low.hat, 'none');
  assert.strictEqual(low.back, 'none');
  assert.strictEqual(low.top, 'plain');
  assert.strictEqual(low.face, 'smile');
  const high = AV.allowed(look, 7);  // 마스터
  assert.deepStrictEqual(high, look);
});

test('모든 옷장 아이템이 그려진다', () => {
  Object.keys(AV.ITEMS).forEach((key) => {
    AV.ITEMS[key].forEach((it) => {
      const svg = AV.render(Object.assign(AV.defaults(1), { [key]: it.id }), { no: 12 });
      assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
      assert.ok(!/undefined|NaN/.test(svg), key + ':' + it.id);
    });
  });
  assert.ok(/width="40"/.test(AV.render(AV.defaults(2), { mode: 'head', size: 40 })));
});
