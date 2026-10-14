const test = require('node:test');
const assert = require('node:assert');
const GG = require('../js/logic.js');

test('티어/단계 계산', () => {
  assert.strictEqual(GG.getRank(0).label, '아이언 IV');
  assert.strictEqual(GG.getRank(49).label, '아이언 IV');
  assert.strictEqual(GG.getRank(50).label, '아이언 III');
  assert.strictEqual(GG.getRank(199).label, '아이언 I');
  assert.strictEqual(GG.getRank(200).label, '브론즈 IV');
  assert.strictEqual(GG.getRank(650).label, '골드 III');
  assert.strictEqual(GG.getRank(1400).label, '마스터');
  assert.strictEqual(GG.getRank(2500).label, '챌린저');
  assert.strictEqual(GG.getRank(-10).points, 0);
});

test('비슷한 실력이면 이기면 +25, 지면 -15', () => {
  const r = GG.calcMatch(500, 500, 0);
  assert.strictEqual(r.gain, 25);
  assert.strictEqual(r.loss, 15);
});

test('낮은 티어가 높은 티어를 이기면 더 많이 얻는다', () => {
  const upset = GG.calcMatch(200, 700, 0);   // 브론즈가 골드를 이김
  const normal = GG.calcMatch(700, 200, 0);  // 골드가 브론즈를 이김
  assert.ok(upset.gain > 40, 'upset gain ' + upset.gain);
  assert.ok(normal.gain <= 10, 'normal gain ' + normal.gain);
  assert.ok(upset.upset);
  // 높은 티어가 지면 많이 잃는다
  assert.ok(upset.loss > normal.loss);
});

test('0점 아래로 내려가지 않는다', () => {
  const out = GG.applyResult({ points: 100, streak: 0 }, { points: 4, streak: 0 });
  assert.strictEqual(out.loser.points, 0);
});

test('연승 보너스', () => {
  assert.strictEqual(GG.calcMatch(300, 300, 1).bonus, 0); // 2연승
  assert.strictEqual(GG.calcMatch(300, 300, 2).bonus, 2); // 3연승
  assert.strictEqual(GG.calcMatch(300, 300, 20).bonus, 10);
});

test('추천: 가까운 점수 우선, 최근 상대는 뒤로', () => {
  const me = { id: 'a', points: 300 };
  const s = [me, { id: 'b', points: 310 }, { id: 'c', points: 330 }, { id: 'd', points: 900 }, { id: 'e', points: 450 }];
  const rec = GG.recommend(me, s, [{ a: 'a', b: 'b' }]);
  assert.strictEqual(rec.close[0].student.id, 'c');
  assert.ok(rec.challenge.every(c => c.diff > 0));
});

test('대진표: 모두 한 번씩 짝지어진다', () => {
  const s = Array.from({ length: 7 }, (_, i) => ({ id: 'p' + i, points: i * 40 }));
  const { pairs, rest } = GG.autoPair(s, []);
  assert.strictEqual(pairs.length, 3);
  assert.ok(rest);
  const ids = new Set(pairs.flat().map(p => p.id).concat(rest.id));
  assert.strictEqual(ids.size, 7);
});
