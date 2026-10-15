const test = require('node:test');
const assert = require('node:assert');
const makeEnv = require('./gas-fake.js');

const setup = () => {
  const g = makeEnv();
  assert.strictEqual(g.get('state').ready, false);
  const r = g.post({ action: 'init', league: '3-2 리그', teacherPw: 'abcd', students: ['가', '나', '다'] });
  assert.ok(r.ok, r.error);
  return g;
};

test('반 만들기: 명단과 설정이 시트에 들어가고 한 번만 된다', () => {
  const g = setup();
  const s = g.get('state');
  assert.strictEqual(s.ready, true);
  assert.strictEqual(s.league, '3-2 리그');
  assert.deepStrictEqual(s.roster.map(x => x.name), ['가', '나', '다']);
  assert.ok(!JSON.stringify(s).includes('abcd'), '선생님 비밀번호가 밖으로 나가면 안 됨');
  assert.strictEqual(g.post({ action: 'init', teacherPw: 'zzzz', students: ['x', 'y'] }).ok, false);
});

test('비밀번호: 만들기 → 확인, 값은 밖으로 안 나감, 이미 있으면 덮어쓰기 막힘', () => {
  const g = setup();
  assert.ok(g.post({ action: 'setPin', id: '가', pin: '0123' }).ok);
  assert.deepStrictEqual(g.get('state').pinSet, ['가']);
  assert.ok(!JSON.stringify(g.get('state')).includes('0123'));
  assert.strictEqual(g.post({ action: 'checkPin', id: '가', pin: '0123' }).match, true);
  assert.strictEqual(g.post({ action: 'checkPin', id: '가', pin: '9999' }).match, false);
  assert.strictEqual(g.post({ action: 'checkPin', id: '가', pin: 'abcd' }).match, true); // 선생님 비밀번호
  assert.strictEqual(g.post({ action: 'setPin', id: '가', pin: '1111' }).ok, false);
  assert.ok(g.post({ action: 'resetPin', id: '가', teacherPw: 'abcd' }).ok);
  assert.deepStrictEqual(g.get('state').pinSet, []);
});

test('경기: 확인 요청은 한 번만 기록, 버전이 오른다', () => {
  const g = setup();
  const v0 = g.get('v').v;
  g.post({ action: 'addReport', w: '가', l: '나' });
  assert.ok(g.post({ action: 'record', w: '가', l: '나', consume: '가__나' }).ok);
  assert.strictEqual(g.post({ action: 'record', w: '가', l: '나', consume: '가__나' }).ok, false);
  const s = g.get('state');
  assert.strictEqual(s.matches.length, 1);
  assert.strictEqual(s.reports.length, 0);
  assert.ok(g.get('v').v > v0);
  assert.strictEqual(g.post({ action: 'record', w: '가', l: '없는사람' }).ok, false);
});

test('선생님 전용: 수정·삭제·규칙·쉬는중은 비밀번호 필요', () => {
  const g = setup();
  const m = g.post({ action: 'record', w: '가', l: '나' }).match;
  assert.strictEqual(g.post({ action: 'deleteMatch', id: m.id }).ok, false);
  assert.strictEqual(g.post({ action: 'updatePlayer', id: '가', fields: { away: true } }).ok, false);
  assert.ok(g.post({ action: 'updateMatch', id: m.id, fields: { a: '나', b: '가' }, teacherPw: 'abcd' }).ok);
  let s = g.get('state');
  assert.strictEqual(s.matches[0].a, '나'); assert.strictEqual(s.matches[0].edited, 1);
  assert.ok(g.post({ action: 'saveSettings', settings: { baseLP: 30 }, teacherPw: 'abcd' }).ok);
  assert.strictEqual(g.get('state').settings.baseLP, 30);
  assert.ok(g.post({ action: 'deleteMatch', id: m.id, teacherPw: 'abcd' }).ok);
  assert.strictEqual(g.get('state').matches.length, 0);
});

test('꾸미기와 명단 바꾸기, 새 시즌', () => {
  const g = setup();
  assert.ok(g.post({ action: 'updatePlayer', id: '가', fields: { face: 'cool', hat: 'cap' } }).ok);
  assert.ok(g.post({ action: 'updatePlayer', id: '가', fields: { away: true }, teacherPw: 'abcd' }).ok);
  let p = g.get('state').players['가'];
  assert.strictEqual(p.face, 'cool'); assert.strictEqual(p.away, true);
  g.post({ action: 'record', w: '가', l: '나' });
  assert.ok(g.post({ action: 'setRoster', students: ['가', '나', '다', '라'], teacherPw: 'abcd' }).ok);
  assert.strictEqual(g.get('state').roster.length, 4);
  assert.ok(g.post({ action: 'resetSeason', teacherPw: 'abcd' }).ok);
  const s = g.get('state');
  assert.strictEqual(s.matches.length, 0); assert.strictEqual(s.season, 2); assert.strictEqual(s.players['가'].face, 'cool');
});
