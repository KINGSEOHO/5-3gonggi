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

test('피라미드: 낮은 티어는 많이 얻고 적게 잃고, 높은 티어는 반대', () => {
  const iron = GG.calcMatch(20, 20, 0), gold = GG.calcMatch(620, 620, 0), dia = GG.calcMatch(1220, 1220, 0);
  assert.ok(iron.gain > iron.loss);
  assert.strictEqual(gold.gain, 25); assert.strictEqual(gold.loss, 25);
  assert.ok(dia.gain < dia.loss);
  assert.ok(iron.gain > gold.gain && gold.gain > dia.gain);
});

test('티어 차이: 낮은 티어가 이기면 크게, 높은 티어가 이기면 조금', () => {
  const upset = GG.calcMatch(300, 700, 0), normal = GG.calcMatch(700, 300, 0);
  assert.ok(upset.gain > 50 && upset.upset);
  assert.ok(normal.gain <= 6);
  assert.ok(upset.loss > normal.loss * 5);
});

test('0점 아래로 내려가지 않는다', () => {
  const out = GG.applyResult({ points: 100, streak: 0 }, { points: 4, streak: 0 });
  assert.strictEqual(out.loser.points, 0);
});

test('연승 보너스와 연패 보호', () => {
  assert.strictEqual(GG.calcMatch(450, 450, 1).bonus, 0); // 2연승
  assert.strictEqual(GG.calcMatch(450, 450, 2).bonus, 3); // 3연승
  assert.strictEqual(GG.calcMatch(450, 450, 3).bonus, 5);
  assert.strictEqual(GG.calcMatch(450, 450, 9).bonus, 8);
  const normal = GG.calcMatch(450, 450, 0).loss, shielded = GG.calcMatch(450, 450, 0, {}, 2);
  assert.ok(shielded.shield && shielded.loss === Math.ceil(normal / 2));
});

test('replay: 기록을 고치면 점수가 다시 계산된다', () => {
  const ms = [{ id: '1', a: 'x', b: 'y', t: 1 }, { id: '2', a: 'x', b: 'y', t: 2 }];
  const r1 = GG.replay(['x', 'y'], ms);
  assert.strictEqual(r1.players.x.wins, 2);
  assert.strictEqual(r1.players.x.streak, 2);
  const r2 = GG.replay(['x', 'y'], [ms[0], { id: '2', a: 'y', b: 'x', t: 2 }]);
  assert.strictEqual(r2.players.x.wins, 1); assert.strictEqual(r2.players.y.wins, 1);
  assert.strictEqual(r2.matches[1].a, 'y');
  assert.ok(r2.matches[1].before.a.points >= 0);
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

test('추천에 자주: 고른 친구가 점수가 멀어도 추천에 나온다', () => {
  const me = { id: 'a', points: 300 };
  const s = [me, { id: 'b', points: 300 }, { id: 'c', points: 310 }, { id: 'd', points: 320 }, { id: 'e', points: 330 }, { id: 'x', points: 900 }];
  const plain = GG.recommend(me, s, []);
  const all = (r) => r.close.concat(r.challenge, r.fresh).map(c => c.student.id);
  assert.ok(!plain.close.some(c => c.student.id === 'x'));
  const boosted = GG.recommend(me, s, [{ a: 'a', b: 'x' }], { boost: ['x'] });
  assert.ok(all(boosted).includes('x'));
  // 자기 자신은 추천하지 않음
  assert.ok(!all(GG.recommend(s[5], s, [], { boost: ['x'] })).includes('x'));
});

test('선생님 LP 조정: 점수만 바뀌고 승패·연승은 그대로, 0 아래로 안 감', () => {
  const ms = [{ id: '1', a: 'x', b: 'y', t: 1 }, { id: '2', a: 'x', b: 'y', t: 3 }];
  const base = GG.replay(['x', 'y'], ms);
  const r = GG.replay(['x', 'y'], ms, {}, [{ id: 'j1', p: 'y', d: 50, note: '칭찬', t: 2 }, { id: 'j2', p: 'x', d: -9999, t: 4 }]);
  assert.strictEqual(r.players.x.points, 0);
  assert.strictEqual(r.players.x.wins, 2);
  assert.strictEqual(r.players.x.streak, 2);
  assert.ok(r.players.y.points > base.players.y.points);
  assert.strictEqual(r.adjusts[0].before + 50, r.adjusts[0].after);
  assert.strictEqual(r.matches.length, 2);
});
