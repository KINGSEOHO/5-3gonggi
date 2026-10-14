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
  const query = (name, field, dir, lim) => ({
    orderBy: (f, d) => query(name, f, d, lim),
    limit: (l) => query(name, field, dir, l),
    get: async () => {
      let docs = [...col(name).keys()].map((id) => snap(name, id));
      if (field) docs.sort((a, b) => (a.data()[field] - b.data()[field]) * (dir === 'desc' ? -1 : 1));
      if (lim) docs = docs.slice(0, lim);
      return { docs, empty: !docs.length, forEach: (fn) => docs.forEach(fn) };
    },
    onSnapshot(cb) { this.get().then(cb); return () => {}; }
  });
  const db = {
    collection: (name) => Object.assign(query(name), { doc: (id) => (id ? Object.assign(ref(name, id), { onSnapshot: (cb) => { Promise.resolve().then(() => cb(snap(name, id))); } }) : ref(name, 'auto' + ++n)) }),
    runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, d, o) => write(r._c, r.id, d, o), delete: (r) => col(r._c).delete(r.id) }),
    batch: () => { const ops = []; return { set: (r, d, o) => ops.push(() => write(r._c, r.id, d, o)), delete: (r) => ops.push(() => col(r._c).delete(r.id)), commit: async () => ops.forEach((f) => f()) }; }
  };
  return { apps: [1], firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'ts' } }), _cols: cols };
}

const tick = () => new Promise((r) => setTimeout(r, 3));
const base = () => ({ points: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, peak: 0 });

test('Firebase: 대결 기록 → 두 선수 점수와 기록 저장, 다른 필드는 유지', async () => {
  global.firebase = fakeFirebase();
  const { FirebaseStore } = require('../js/store.js');
  const s = new FirebaseStore({});
  await s.updatePlayer('철수', { color: '#fff' });
  const m = await s.record('철수', '영희', base);
  const P = firebase._cols.gonggi_players;
  assert.strictEqual(P.get('철수').points, 25);
  assert.strictEqual(P.get('철수').color, '#fff');
  assert.strictEqual(P.get('영희').points, 0);
  assert.strictEqual(P.get('영희').losses, 1);
  assert.strictEqual(firebase._cols.gonggi_matches.size, 1);
  assert.strictEqual(m.gain, 25);
});

test('Firebase: 마지막 대결 취소는 점수를 되돌리고, 이후 대결이 있으면 막는다', async () => {
  global.firebase = fakeFirebase();
  const { FirebaseStore } = require('../js/store.js');
  const s = new FirebaseStore({});
  await s.record('철수', '영희', base);
  await tick();
  await s.record('영희', '민수', base);
  await s.undoLast();
  const P = firebase._cols.gonggi_players;
  assert.strictEqual(P.get('영희').points, 0); // 철수에게 진 뒤 0점 (0 아래로 안 내려감)
  assert.strictEqual(P.get('영희').wins, 0);
  assert.strictEqual(P.get('민수').points, 0);
  assert.strictEqual(P.get('민수').losses, 0);
  // 영희 점수를 다른 대결로 바꾼 뒤엔 오래된 대결을 되돌리지 않는다
  await tick();
  await s.record('철수', '영희', base);
  P.get('영희').points = 999;
  await assert.rejects(s.undoLast(), /취소할 수 없어요/);
});

test('Firebase: 비밀번호는 체크리스트와 같은 studentPins 문서를 쓴다', async () => {
  global.firebase = fakeFirebase();
  const { FirebaseStore } = require('../js/store.js');
  const s = new FirebaseStore({});
  assert.strictEqual(await s.getPin('철수'), null);
  await s.setPin('철수', '1234');
  assert.strictEqual(await s.getPin('철수'), '1234');
  assert.deepStrictEqual(firebase._cols.studentPins.get('철수'), { pin: '1234', createdAt: 'ts' });
});

test('Firebase: 새 시즌은 기록을 지우고 점수만 초기화', async () => {
  global.firebase = fakeFirebase();
  const { FirebaseStore } = require('../js/store.js');
  const s = new FirebaseStore({});
  await s.updatePlayer('철수', { face: 'cool' });
  await s.record('철수', '영희', base);
  await s.resetSeason(base);
  assert.strictEqual(firebase._cols.gonggi_matches.size, 0);
  assert.strictEqual(firebase._cols.gonggi_players.get('철수').points, 0);
  assert.strictEqual(firebase._cols.gonggi_players.get('철수').face, 'cool');
});

test('체험 저장소: 기록/취소', async () => {
  const { LocalStore } = require('../js/store.js');
  const s = new LocalStore(() => ({ players: {}, matches: [] }));
  let last;
  s.subscribe((d) => { last = d; });
  await s.record('a', 'b', base);
  assert.strictEqual(last.players.a.points, 25);
  await s.undoLast();
  assert.strictEqual(last.players.a.points, 0);
  assert.strictEqual(last.matches.length, 0);
});
