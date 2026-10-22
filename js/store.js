/* 공기 레전드 — 저장소
 * 경기 기록(gonggi_matches: 승자 a, 패자 b, 시각 t)이 원본이고, 점수·티어는 화면에서 GG.replay 로 다시 계산한다.
 * 그래서 선생님이 기록을 고치거나 지워도 모든 점수가 저절로 맞춰진다.
 * 실전 모드: 체크리스트와 같은 Firebase(Firestore), 비밀번호는 studentPins 공유
 * 시트 모드: 각 선생님의 구글 시트 + Apps Script 웹 앱 (apps-script/Code.gs)
 * 체험 모드: 이 브라우저(localStorage)
 *
 *   subscribe(cb)                       cb({ players: {이름: 꾸미기·쉬는중}, matches: [{id,a,b,t}], settings, reports })
 *   record(winnerId, loserId, opts)     opts.consume: 확인한 결과 신고 id, opts.cleanup: 같이 지울 신고 id들, opts.by: 기록한 사람
 *   updateMatch(id, fields) / deleteMatch(id)
 *   addReport(winnerId, loserId) / removeReport(id)
 *   addAdjust(이름, ±LP, 사유) / deleteAdjust(id)   선생님이 직접 더하고 빼는 LP
 *   updatePlayer(id, fields), hasPin(id) / checkPin(id, pin) / setPin(id, pin), checkTeacher(pw), saveSettings(s), resetSeason()
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
    var data = { players: {}, matches: [], settings: Object.assign({}, GG.DEFAULT_SETTINGS), reports: [], adjusts: [] };
    var ready = { p: false, m: false, s: false, r: false, j: false };
    function emit() { if (ready.p && ready.m && ready.s && ready.r && ready.j) cb(data); }
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
    db.collection('gonggi_adjust').onSnapshot(function (snap) {
      data.adjusts = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      ready.j = true; emit();
    }, fail);
  };
  FirebaseStore.prototype.addAdjust = function (p, d, note, t) {
    return this.db.collection('gonggi_adjust').doc().set({ p: p, d: d, note: note || '', t: t || Date.now() });
  };
  FirebaseStore.prototype.deleteAdjust = function (id) { return this.db.collection('gonggi_adjust').doc(id).delete(); };
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
    return Promise.all([wipe('gonggi_matches'), wipe('gonggi_reports'), wipe('gonggi_adjust')]);
  };

  FirebaseStore.prototype.hasPin = function (id) { return this.getPin(id).then(function (p) { return !!p; }); };
  FirebaseStore.prototype.checkPin = function (id, pin) {
    var tp = this.teacherPw;
    return this.getPin(id).then(function (p) { return (!!p && pin === p) || (!!tp && pin === tp); });
  };
  FirebaseStore.prototype.checkTeacher = function (pw) { return Promise.resolve(!!this.teacherPw && pw === this.teacherPw); };

  /* ───────── 시트: 선생님 구글 시트의 Apps Script 웹 앱 ───────── */
  function SheetStore(url) {
    this.url = url;
    this.mode = 'sheet';
    this.v = null;
    this.state = null;
    this.teacherPw = '';
    this.cb = null;
  }
  SheetStore.prototype._get = function (action) {
    return fetch(this.url + (this.url.indexOf('?') === -1 ? '?' : '&') + 'action=' + action + '&_=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r.ok) throw new Error(r.error || '시트에서 읽지 못했어요.'); return r; });
  };
  SheetStore.prototype._post = function (body) {
    var self = this;
    if (this.teacherPw) body.teacherPw = this.teacherPw;
    // text/plain 으로 보내야 Apps Script 가 추가 확인(preflight) 없이 받는다
    return fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r.ok) throw new Error(r.error || '저장하지 못했어요.'); return r; })
      .then(function (r) { self.load(); return r; });
  };
  SheetStore.prototype.load = function () {
    var self = this;
    return this._get('state').then(function (st) {
      self.v = st.v; self.state = st;
      st.settings = Object.assign({}, GG.DEFAULT_SETTINGS, st.settings || {});
      if (self.cb) self.cb(st);
      return st;
    });
  };
  /* 실시간 알림이 없어서 몇 초마다 '바뀐 게 있나'만 가볍게 묻는다 (화면이 보일 때만) */
  SheetStore.prototype.subscribe = function (cb, onError) {
    var self = this;
    this.cb = cb;
    this.load().catch(onError || function () {});
    setInterval(function () {
      if (typeof document !== 'undefined' && document.hidden) return;
      self._get('v').then(function (r) { if (r.v !== self.v) self.load(); }).catch(function () {});
    }, 5000);
  };
  SheetStore.prototype.init = function (o) { return this._post({ action: 'init', league: o.league, teacherPw: o.teacherPw, students: o.students }); };
  SheetStore.prototype.record = function (w, l, opts) {
    opts = opts || {};
    return this._post({ action: 'record', w: w, l: l, consume: opts.consume, cleanup: opts.cleanup, by: opts.by }).then(function (r) { return r.match; });
  };
  SheetStore.prototype.updateMatch = function (id, fields) { return this._post({ action: 'updateMatch', id: id, fields: fields }); };
  SheetStore.prototype.deleteMatch = function (id) { return this._post({ action: 'deleteMatch', id: id }); };
  SheetStore.prototype.addReport = function (w, l) { return this._post({ action: 'addReport', w: w, l: l }); };
  SheetStore.prototype.removeReport = function (id) { return this._post({ action: 'removeReport', id: id }); };
  SheetStore.prototype.updatePlayer = function (id, fields) { return this._post({ action: 'updatePlayer', id: id, fields: fields }); };
  SheetStore.prototype.hasPin = function (id) {
    return (this.state ? Promise.resolve(this.state) : this.load()).then(function (st) { return (st.pinSet || []).indexOf(id) !== -1; });
  };
  SheetStore.prototype.checkPin = function (id, pin) {
    var tp = this.teacherPw;
    return this._post({ action: 'checkPin', id: id, pin: pin }).then(function (r) { return r.match || (!!tp && pin === tp); });
  };
  SheetStore.prototype.setPin = function (id, pin) { return this._post({ action: 'setPin', id: id, pin: pin }); };
  SheetStore.prototype.checkTeacher = function (pw) {
    var self = this;
    var saved = this.teacherPw;
    this.teacherPw = pw;
    return this._post({ action: 'checkTeacher' }).then(function () { return true; }, function () { self.teacherPw = saved; return false; });
  };
  SheetStore.prototype.saveSettings = function (st) { return this._post({ action: 'saveSettings', settings: st }); };
  SheetStore.prototype.setRoster = function (names, league) { return this._post({ action: 'setRoster', students: names, league: league }); };
  SheetStore.prototype.resetPin = function (id) { return this._post({ action: 'resetPin', id: id }); };
  SheetStore.prototype.addAdjust = function (p, d, note, t) { return this._post({ action: 'addAdjust', p: p, d: d, note: note, t: t }); };
  SheetStore.prototype.deleteAdjust = function (id) { return this._post({ action: 'deleteAdjust', id: id }); };
  SheetStore.prototype.resetSeason = function () { return this._post({ action: 'resetSeason' }); };

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
    this.data.adjusts = this.data.adjusts || [];
    this.n = 0;
  }
  LocalStore.prototype._save = function () {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data)); } catch (e) { /* 무시 */ }
    var R = this.data.reports;
    var snap = { players: this.data.players, matches: this.data.matches.slice(), settings: this.data.settings, adjusts: this.data.adjusts.slice(),
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
  LocalStore.prototype.addAdjust = function (p, d, note, t) {
    this.data.adjusts.push({ id: 'j' + Date.now().toString(36) + (++this.n), p: p, d: d, note: note || '', t: t || Date.now() });
    this._save(); return Promise.resolve();
  };
  LocalStore.prototype.deleteAdjust = function (id) {
    this.data.adjusts = this.data.adjusts.filter(function (a) { return a.id !== id; });
    this._save(); return Promise.resolve();
  };
  LocalStore.prototype.resetSeason = function () { this.data.matches = []; this.data.reports = {}; this.data.adjusts = []; this._save(); return Promise.resolve(); };
  LocalStore.prototype.hasPin = function (id) { return Promise.resolve(!!this.data.pins[id]); };
  LocalStore.prototype.checkPin = function (id, pin) { return Promise.resolve((!!this.data.pins[id] && this.data.pins[id] === pin) || pin === this.teacherPw); };
  LocalStore.prototype.checkTeacher = function (pw) { return Promise.resolve(pw === this.teacherPw); };
  LocalStore.reset = function () { try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* 무시 */ } };

  var api = { FirebaseStore: FirebaseStore, SheetStore: SheetStore, LocalStore: LocalStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GGStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
