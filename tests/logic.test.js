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

test('선생님 계정: LP 고정, 이기면 학생이 크게 얻음', () => {
  const ms = [{ id: '1', a: 'kid', b: '선생님', t: 1 }, { id: '2', a: '선생님', b: 'kid', t: 2 }];
  const r = GG.replay(['kid', '선생님'], ms, {}, [{ id: 'j', p: '선생님', d: 50, t: 3 }], { '선생님': 1400 });
  assert.strictEqual(r.players['선생님'].points, 1400);
  assert.strictEqual(r.players['선생님'].wins, 1);
  assert.ok(r.matches[0].gain > 60, 'gain ' + r.matches[0].gain);
  assert.ok(r.matches[0].upset);
  assert.strictEqual(r.adjusts.length, 0);
});

test('티어 구간 배율·피라미드 강도·실력 차 반영 설정', () => {
  const cfg = { tierScale: 0.35, pyramid: 0.5, eloScale: 800, baseLP: 30, startPoints: 200 };
  const r = GG.replay(['a', 'b'], [], cfg);
  assert.strictEqual(r.players.a.points, 70);            // 브론즈 IV 시작
  assert.strictEqual(GG.getRank(70).tier.name, '브론즈');
  assert.strictEqual(GG.getRank(700).tier.name, '챌린저');
  const hi = GG.calcMatch(500, 500, 0, cfg);
  assert.ok(hi.gain >= 20 && hi.loss <= 40, JSON.stringify(hi));
  GG.setTierScale(1);                                     // 다른 테스트를 위해 되돌림
  assert.strictEqual(GG.getRank(2000).tier.name, '챌린저');
  assert.strictEqual(GG.calcMatch(620, 620, 0).gain, 25); // 기본값은 그대로
});

test('챌린저 200 설정: 티어가 한 판에 한 칸 안쪽으로 움직이고 보너스도 비례', () => {
  const c = { baseLP: 10, eloScale: 300, tierScale: 0.1, pyramid: 0.5, startPoints: 200 };
  const r = GG.replay(['a'], [], c);
  assert.strictEqual(GG.getRank(r.players.a.points).label, '브론즈 IV');
  assert.ok(GG.calcMatch(62, 62, 0, c).gain <= GG.TIERS[4].min - GG.TIERS[3].min);
  assert.strictEqual(GG.calcMatch(62, 62, 2, c).bonus, 1);
  assert.strictEqual(GG.calcMatch(62, 62, 9, c).bonus, 3);
  GG.setTierScale(1);
  assert.strictEqual(GG.calcMatch(450, 450, 9).bonus, 8);
});

test('시즌 이월: 지난 티어와 브론즈 IV의 중간에서 시작, 경기 적으면 기본', () => {
  const prev = { tierScale: 0.1 };
  const starts = GG.carryStarts({ top: { points: 205, wins: 20, losses: 5 }, low: { points: 2, wins: 1, losses: 9 }, few: { points: 150, wins: 1, losses: 0 } }, prev, 0.5, 200);
  GG.setTierScale(1);
  assert.strictEqual(GG.getRank(starts.top).label, '에메랄드 IV');
  assert.strictEqual(GG.getRank(starts.low).label, '아이언 II');
  assert.strictEqual(starts.few, 200);
  assert.deepStrictEqual(GG.carryStarts({ top: { points: 205, wins: 20, losses: 5 } }, prev, 0, 200), { top: 200 });
  const r = GG.replay(['top', 'low'], [], { tierScale: 0.1, startPoints: 200, carry: starts });
  assert.strictEqual(r.players.top.points, 100); // 에메랄드 IV (챌린저 200 기준)
  assert.strictEqual(r.players.low.points, 10);
  GG.setTierScale(1);
});
