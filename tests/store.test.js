// 저장소 테스트: 실제 Firestore 대신 같은 모양의 가짜 DB로 FirebaseStore를 돌려 본다
const test = require('node:test');
const assert = require('node:assert');
global.GG = require('../js/logic.js');
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };

function fakeFirebase() {
  const cols = {};
  let n = 0;
  const col = (name) => (cols[name] = cols[name] || new Map());
  const ref = (name, id) => ({
    id, _c: name,
    get: async () => snap(name, id),
    set: async (data, opt) => write(name, id, data, opt),
    delete: async () => col(name).delete(id)
  });
  const snap = (name, id) => { const d = col(name).get(id); return { id, exists: !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined), ref: ref(name, id) }; };
  const write = (name, id, data, opt) => { const cur = (opt && opt.merge && col(name).get(id)) || {}; col(name).set(id, Object.assign({}, cur, JSON.parse(JSON.stringify(data)))); };
  const query = (name) => ({
    get: async () => { const docs = [...col(name).keys()].map((id) => snap(name, id)); return { docs, empty: !docs.length, forEach: (fn) => docs.forEach(fn) }; },
    onSnapshot(cb) { this.get().then(cb); return () => {}; }
  });
  const db = {
    collection: (name) => Object.assign(query(name), { doc: (id) => ref(name, id || 'auto' + ++n) }),
    runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, d, o) => write(r._c, r.id, d, o), delete: (r) => col(r._c).delete(r.id) }),
    batch: () => { const ops = []; return { set: (r, d, o) => ops.push(() => write(r._c, r.id, d, o)), delete: (r) => ops.push(() => col(r._c).delete(r.id)), commit: async () => ops.forEach((f) => f()) }; }
  };
  return { apps: [1], firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'ts' } }), _cols: cols };
}
const fresh = () => { global.firebase = fakeFirebase(); const { FirebaseStore } = require('../js/store.js'); return new FirebaseStore({}); };

test('Firebase: 경기는 승자/패자/시각만 저장', async () => {
  const s = fresh();
  const m = await s.record('철수', '영희', { by: '영희' });
  const doc = firebase._cols.gonggi_matches.get(m.id);
  assert.deepStrictEqual(Object.keys(doc).sort(), ['a', 'b', 'by', 't']);
  assert.strictEqual(doc.a, '철수');
});

test('Firebase: 확인 요청은 한 번만 경기로 바뀐다', async () => {
  const s = fresh();
  await s.addReport('철수', '영희');
  await s.record('철수', '영희', { consume: '철수__영희' });
  await assert.rejects(s.record('철수', '영희', { consume: '철수__영희' }), /이미 처리된/);
  assert.strictEqual(firebase._cols.gonggi_matches.size, 1);
  assert.strictEqual(firebase._cols.gonggi_reports.size, 0);
});

test('Firebase: 경기 수정·삭제', async () => {
  const s = fresh();
  const m = await s.record('철수', '영희');
  await s.updateMatch(m.id, { a: '영희', b: '철수' });
  assert.strictEqual(firebase._cols.gonggi_matches.get(m.id).a, '영희');
  assert.ok(firebase._cols.gonggi_matches.get(m.id).edited);
  await s.deleteMatch(m.id);
  assert.strictEqual(firebase._cols.gonggi_matches.size, 0);
});

test('Firebase: 비밀번호는 체크리스트와 같은 studentPins 문서를 쓴다', async () => {
  const s = fresh();
  assert.strictEqual(await s.getPin('철수'), null);
  await s.setPin('철수', '1234');
  assert.strictEqual(await s.getPin('철수'), '1234');
  assert.deepStrictEqual(firebase._cols.studentPins.get('철수'), { pin: '1234', createdAt: 'ts' });
});

test('Firebase: 새 시즌은 경기만 지우고 꾸미기는 남긴다', async () => {
  const s = fresh();
  await s.updatePlayer('철수', { face: 'cool' });
  await s.record('철수', '영희');
  await s.resetSeason();
  assert.strictEqual(firebase._cols.gonggi_matches.size, 0);
  assert.strictEqual(firebase._cols.gonggi_players.get('철수').face, 'cool');
});

test('체험 저장소: 기록/삭제', async () => {
  const { LocalStore } = require('../js/store.js');
  const s = new LocalStore(() => ({ matches: [] }));
  let last;
  s.subscribe((d) => { last = d; });
  const m = await s.record('a', 'b');
  assert.strictEqual(last.matches.length, 1);
  await s.deleteMatch(m.id);
  assert.strictEqual(last.matches.length, 0);
});
