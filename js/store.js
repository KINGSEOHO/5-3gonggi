/* 공기 블록스 — 저장소
 * 실전 모드: 체크리스트와 같은 Firebase(Firestore)에 gonggi_* 컬렉션으로 저장, 비밀번호는 studentPins 공유
 * 체험 모드: 이 브라우저(localStorage)에만 저장
 *
 * 공통 인터페이스
 *   subscribe(cb)                    cb({ players: {이름: 저장된 값}, matches: [...오래된→최근], settings })
 *   record(winnerId, loserId, base)  base(id) = 저장된 값이 없을 때 쓸 기본 선수 → Promise<match>
 *   undoLast()                       → Promise<match>
 *   updatePlayer(id, fields)         → Promise
 *   getPin(id) / setPin(id, pin)     → Promise
 *   saveSettings(settings)           → Promise
 *   resetSeason(base)                → Promise
 */
(function (root) {
  'use strict';
  var GG = root.GG;
  var STAT_FIELDS = ['points', 'wins', 'losses', 'streak', 'bestStreak', 'peak'];

  function stats(p) {
    var o = {};
    STAT_FIELDS.forEach(function (k) { o[k] = p[k] || 0; });
    return o;
  }

  function buildMatch(wp, lp, settings) {
    var out = GG.applyResult(wp, lp, settings);
    return {
      out: out,
      match: {
        a: wp.id, b: lp.id, t: Date.now(),
        gain: out.result.total, bonus: out.result.bonus, loss: out.result.loss, upset: out.result.upset,
        before: { a: stats(wp), b: stats(lp) },
        after: { a: out.winner.points, b: out.loser.points }
      }
    };
  }

  /* ───────── 실전: Firebase ───────── */
  function FirebaseStore(cfg) {
    if (!root.firebase.apps.length) root.firebase.initializeApp(cfg.FIREBASE);
    this.db = root.firebase.firestore();
    this.mode = 'live';
    this.settings = Object.assign({}, GG.DEFAULT_SETTINGS);
  }
  FirebaseStore.prototype.subscribe = function (cb, onError) {
    var self = this, db = this.db;
    var data = { players: {}, matches: [], settings: self.settings };
    var ready = { p: false, m: false, s: false };
    function emit() { if (ready.p && ready.m && ready.s) cb(data); }
    var fail = function (e) { if (onError) onError(e); };
    db.collection('gonggi_players').onSnapshot(function (snap) {
      data.players = {};
      snap.forEach(function (d) { data.players[d.id] = d.data(); });
      ready.p = true; emit();
    }, fail);
    db.collection('gonggi_matches').orderBy('t', 'desc').limit(300).onSnapshot(function (snap) {
      data.matches = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).reverse();
      ready.m = true; emit();
    }, fail);
    db.collection('gonggi_settings').doc('main').onSnapshot(function (d) {
      self.settings = Object.assign({}, GG.DEFAULT_SETTINGS, d.exists ? d.data() : {});
      data.settings = self.settings;
      ready.s = true; emit();
    }, fail);
  };
  FirebaseStore.prototype.record = function (winnerId, loserId, base) {
    var db = this.db, settings = this.settings;
    var col = db.collection('gonggi_players');
    var wRef = col.doc(winnerId), lRef = col.doc(loserId), mRef = db.collection('gonggi_matches').doc();
    return db.runTransaction(function (tx) {
      return Promise.all([tx.get(wRef), tx.get(lRef)]).then(function (docs) {
        var wp = Object.assign(base(winnerId), docs[0].exists ? docs[0].data() : {}, { id: winnerId });
        var lp = Object.assign(base(loserId), docs[1].exists ? docs[1].data() : {}, { id: loserId });
        var r = buildMatch(wp, lp, settings);
        tx.set(wRef, Object.assign({ name: winnerId }, stats(r.out.winner)), { merge: true });
        tx.set(lRef, Object.assign({ name: loserId }, stats(r.out.loser)), { merge: true });
        tx.set(mRef, r.match);
        return Object.assign({ id: mRef.id }, r.match);
      });
    });
  };
  FirebaseStore.prototype.undoLast = function () {
    var db = this.db;
    return db.collection('gonggi_matches').orderBy('t', 'desc').limit(1).get().then(function (snap) {
      if (snap.empty) throw new Error('취소할 대결이 없어요.');
      var mDoc = snap.docs[0], m = mDoc.data();
      var wRef = db.collection('gonggi_players').doc(m.a), lRef = db.collection('gonggi_players').doc(m.b);
      return db.runTransaction(function (tx) {
        return Promise.all([tx.get(wRef), tx.get(lRef)]).then(function (docs) {
          var w = docs[0].data() || {}, l = docs[1].data() || {};
          if (w.points !== m.after.a || l.points !== m.after.b) throw new Error('이 대결 뒤에 두 친구 점수가 바뀌어서 취소할 수 없어요.');
          tx.set(wRef, m.before.a, { merge: true });
          tx.set(lRef, m.before.b, { merge: true });
          tx.delete(mDoc.ref);
          return m;
        });
      });
    });
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
  FirebaseStore.prototype.resetSeason = function (base) {
    var db = this.db;
    function wipe(colName, fn) {
      return db.collection(colName).get().then(function (snap) {
        var docs = snap.docs, jobs = [];
        for (var i = 0; i < docs.length; i += 400) {
          var batch = db.batch();
          docs.slice(i, i + 400).forEach(function (d) { fn(batch, d); });
          jobs.push(batch.commit());
        }
        return Promise.all(jobs);
      });
    }
    return wipe('gonggi_matches', function (b, d) { b.delete(d.ref); }).then(function () {
      return wipe('gonggi_players', function (b, d) { b.set(d.ref, stats(base(d.id)), { merge: true }); });
    });
  };

  /* ───────── 체험: 이 브라우저에만 ───────── */
  var LOCAL_KEY = 'gonggi-blox-demo-v2';
  function LocalStore(seed) {
    this.mode = 'demo';
    this.listeners = [];
    var d = null;
    try { d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { d = null; }
    this.data = d && d.players ? d : seed();
    this.data.settings = Object.assign({}, GG.DEFAULT_SETTINGS, this.data.settings || {});
    this.data.pins = this.data.pins || {};
  }
  LocalStore.prototype._save = function () {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data)); } catch (e) { /* 무시 */ }
    var snap = { players: this.data.players, matches: this.data.matches.slice(-300), settings: this.data.settings };
    this.listeners.forEach(function (cb) { cb(snap); });
  };
  LocalStore.prototype.subscribe = function (cb) { this.listeners.push(cb); this._save(); };
  LocalStore.prototype.record = function (winnerId, loserId, base) {
    var P = this.data.players;
    var wp = Object.assign(base(winnerId), P[winnerId] || {}, { id: winnerId });
    var lp = Object.assign(base(loserId), P[loserId] || {}, { id: loserId });
    var r = buildMatch(wp, lp, this.data.settings);
    P[winnerId] = Object.assign(P[winnerId] || {}, stats(r.out.winner));
    P[loserId] = Object.assign(P[loserId] || {}, stats(r.out.loser));
    var m = Object.assign({ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, r.match);
    this.data.matches.push(m);
    this._save();
    return Promise.resolve(m);
  };
  LocalStore.prototype.undoLast = function () {
    var m = this.data.matches.pop();
    if (!m) return Promise.reject(new Error('취소할 대결이 없어요.'));
    var P = this.data.players;
    P[m.a] = Object.assign(P[m.a] || {}, m.before.a);
    P[m.b] = Object.assign(P[m.b] || {}, m.before.b);
    this._save();
    return Promise.resolve(m);
  };
  LocalStore.prototype.updatePlayer = function (id, fields) {
    this.data.players[id] = Object.assign(this.data.players[id] || {}, fields);
    this._save();
    return Promise.resolve();
  };
  LocalStore.prototype.getPin = function (id) { return Promise.resolve(this.data.pins[id] || null); };
  LocalStore.prototype.setPin = function (id, pin) { this.data.pins[id] = pin; this._save(); return Promise.resolve(); };
  LocalStore.prototype.saveSettings = function (s) { this.data.settings = s; this._save(); return Promise.resolve(); };
  LocalStore.prototype.resetSeason = function (base) {
    var P = this.data.players;
    Object.keys(P).forEach(function (id) { Object.assign(P[id], stats(base(id))); });
    this.data.matches = [];
    this._save();
    return Promise.resolve();
  };
  LocalStore.reset = function () { try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* 무시 */ } };

  var api = { FirebaseStore: FirebaseStore, LocalStore: LocalStore, buildMatch: buildMatch, stats: stats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GGStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
