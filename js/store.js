/* 공기 레전드 — 저장소
 * 경기 기록(gonggi_matches: 승자 a, 패자 b, 시각 t)이 원본이고, 점수·티어는 화면에서 GG.replay 로 다시 계산한다.
 * 그래서 선생님이 기록을 고치거나 지워도 모든 점수가 저절로 맞춰진다.
 * 실전 모드: 체크리스트와 같은 Firebase(Firestore), 비밀번호는 studentPins 공유
 * 체험 모드: 이 브라우저(localStorage)
 *
 *   subscribe(cb)                       cb({ players: {이름: 꾸미기·쉬는중}, matches: [{id,a,b,t}], settings, reports })
 *   record(winnerId, loserId, opts)     opts.consume: 확인한 결과 신고 id, opts.cleanup: 같이 지울 신고 id들, opts.by: 기록한 사람
 *   updateMatch(id, fields) / deleteMatch(id)
 *   addReport(winnerId, loserId) / removeReport(id)
 *   updatePlayer(id, fields), getPin(id) / setPin(id, pin), saveSettings(s), resetSeason()
 */
(function (root) {
  'use strict';
  var GG = root.GG;

  function matchDoc(w, l, opts) {
    var m = { a: w, b: l, t: Date.now() };
    if (opts && opts.by) m.by = opts.by;
    return m;
  }

  /* ───────── 실전: Firebase ───────── */
  function FirebaseStore(cfg) {
    if (!root.firebase.apps.length) root.firebase.initializeApp(cfg.FIREBASE);
    this.db = root.firebase.firestore();
    this.mode = 'live';
  }
  FirebaseStore.prototype.subscribe = function (cb, onError) {
    var db = this.db;
    var data = { players: {}, matches: [], settings: Object.assign({}, GG.DEFAULT_SETTINGS), reports: [] };
    var ready = { p: false, m: false, s: false, r: false };
    function emit() { if (ready.p && ready.m && ready.s && ready.r) cb(data); }
    var fail = function (e) { if (onError) onError(e); };
    db.collection('gonggi_players').onSnapshot(function (snap) {
      data.players = {};
      snap.forEach(function (d) { data.players[d.id] = d.data(); });
      ready.p = true; emit();
    }, fail);
    db.collection('gonggi_matches').onSnapshot(function (snap) {
      data.matches = snap.docs.map(function (d) { var x = d.data(); return { id: d.id, a: x.a, b: x.b, t: x.t, by: x.by, edited: x.edited }; });
      ready.m = true; emit();
    }, fail);
    db.collection('gonggi_settings').doc('main').onSnapshot(function (d) {
      data.settings = Object.assign({}, GG.DEFAULT_SETTINGS, d.exists ? d.data() : {});
      ready.s = true; emit();
    }, fail);
    db.collection('gonggi_reports').onSnapshot(function (snap) {
      data.reports = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      ready.r = true; emit();
    }, fail);
  };
  FirebaseStore.prototype.record = function (winnerId, loserId, opts) {
    opts = opts || {};
    var db = this.db, reps = db.collection('gonggi_reports');
    var mRef = db.collection('gonggi_matches').doc();
    var cRef = opts.consume ? reps.doc(opts.consume) : null;
    var m = matchDoc(winnerId, loserId, opts);
    return db.runTransaction(function (tx) {
      return (cRef ? tx.get(cRef) : Promise.resolve(null)).then(function (c) {
        // 확인 요청이 이미 처리됐으면 실패 → 같은 경기가 두 번 기록되지 않음
        if (cRef && !c.exists) throw new Error('이미 처리된 결과예요.');
        if (cRef) tx.delete(cRef);
        (opts.cleanup || []).forEach(function (id) { if (id !== opts.consume) tx.delete(reps.doc(id)); });
        tx.set(mRef, m);
        return Object.assign({ id: mRef.id }, m);
      });
    });
  };
  FirebaseStore.prototype.updateMatch = function (id, fields) {
    return this.db.collection('gonggi_matches').doc(id).set(Object.assign({}, fields, { edited: Date.now() }), { merge: true });
  };
  FirebaseStore.prototype.deleteMatch = function (id) {
    return this.db.collection('gonggi_matches').doc(id).delete();
  };
  FirebaseStore.prototype.addReport = function (w, l) {
    return this.db.collection('gonggi_reports').doc(w + '__' + l).set({ winner: w, loser: l, t: Date.now() });
  };
  FirebaseStore.prototype.removeReport = function (id) {
    return this.db.collection('gonggi_reports').doc(id).delete();
  };
  FirebaseStore.prototype.updatePlayer = function (id, fields) {
    return this.db.collection('gonggi_players').doc(id).set(Object.assign({ name: id }, fields), { merge: true });
  };
  FirebaseStore.prototype.getPin = function (id) {
    return this.db.collection('studentPins').doc(id).get().then(function (d) { return d.exists && d.data().pin ? String(d.data().pin) : null; });
  };
  FirebaseStore.prototype.setPin = function (id, pin) {
    // 체크리스트와 같은 모양으로 저장 → 두 앱에서 같은 비밀번호
    return this.db.collection('studentPins').doc(id).set({ pin: pin, createdAt: root.firebase.firestore.FieldValue.serverTimestamp() });
  };
  FirebaseStore.prototype.saveSettings = function (s) {
    return this.db.collection('gonggi_settings').doc('main').set(s);
  };
  FirebaseStore.prototype.resetSeason = function () {
    var db = this.db;
    function wipe(colName) {
      return db.collection(colName).get().then(function (snap) {
        var docs = snap.docs, jobs = [];
        for (var i = 0; i < docs.length; i += 400) {
          var batch = db.batch();
          docs.slice(i, i + 400).forEach(function (d) { batch.delete(d.ref); });
          jobs.push(batch.commit());
        }
        return Promise.all(jobs);
      });
    }
    return Promise.all([wipe('gonggi_matches'), wipe('gonggi_reports')]);
  };

  /* ───────── 체험: 이 브라우저에만 ───────── */
  var LOCAL_KEY = 'gonggi-legends-demo-v3';
  function LocalStore(seed) {
    this.mode = 'demo';
    this.listeners = [];
    var d = null;
    try { d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { d = null; }
    this.data = d && d.matches ? d : seed();
    this.data.players = this.data.players || {};
    this.data.settings = Object.assign({}, GG.DEFAULT_SETTINGS, this.data.settings || {});
    this.data.pins = this.data.pins || {};
    this.data.reports = this.data.reports || {};
    this.n = 0;
  }
  LocalStore.prototype._save = function () {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data)); } catch (e) { /* 무시 */ }
    var R = this.data.reports;
    var snap = { players: this.data.players, matches: this.data.matches.slice(), settings: this.data.settings,
      reports: Object.keys(R).map(function (id) { return Object.assign({ id: id }, R[id]); }) };
    this.listeners.forEach(function (cb) { cb(snap); });
  };
  LocalStore.prototype.subscribe = function (cb) { this.listeners.push(cb); this._save(); };
  LocalStore.prototype.record = function (winnerId, loserId, opts) {
    opts = opts || {};
    var R = this.data.reports;
    if (opts.consume && !R[opts.consume]) return Promise.reject(new Error('이미 처리된 결과예요.'));
    if (opts.consume) delete R[opts.consume];
    (opts.cleanup || []).forEach(function (id) { delete R[id]; });
    var m = Object.assign({ id: 'm' + Date.now().toString(36) + (++this.n) }, matchDoc(winnerId, loserId, opts));
    this.data.matches.push(m);
    this._save();
    return Promise.resolve(m);
  };
  LocalStore.prototype.updateMatch = function (id, fields) {
    this.data.matches.forEach(function (m) { if (m.id === id) Object.assign(m, fields, { edited: Date.now() }); });
    this._save(); return Promise.resolve();
  };
  LocalStore.prototype.deleteMatch = function (id) {
    this.data.matches = this.data.matches.filter(function (m) { return m.id !== id; });
    this._save(); return Promise.resolve();
  };
  LocalStore.prototype.addReport = function (w, l) {
    this.data.reports[w + '__' + l] = { winner: w, loser: l, t: Date.now() };
    this._save(); return Promise.resolve();
  };
  LocalStore.prototype.removeReport = function (id) { delete this.data.reports[id]; this._save(); return Promise.resolve(); };
  LocalStore.prototype.updatePlayer = function (id, fields) {
    this.data.players[id] = Object.assign(this.data.players[id] || {}, fields);
    this._save(); return Promise.resolve();
  };
  LocalStore.prototype.getPin = function (id) { return Promise.resolve(this.data.pins[id] || null); };
  LocalStore.prototype.setPin = function (id, pin) { this.data.pins[id] = pin; this._save(); return Promise.resolve(); };
  LocalStore.prototype.saveSettings = function (s) { this.data.settings = s; this._save(); return Promise.resolve(); };
  LocalStore.prototype.resetSeason = function () { this.data.matches = []; this.data.reports = {}; this._save(); return Promise.resolve(); };
  LocalStore.reset = function () { try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* 무시 */ } };

  var api = { FirebaseStore: FirebaseStore, LocalStore: LocalStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GGStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
