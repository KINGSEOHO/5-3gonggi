// 브라우저 시험용 가짜 Firebase (compat API 일부). 실제 서버에 접속하지 않는다.
// Playwright 에서 firebase-app-compat.js 대신 이 파일을 돌려주면 된다.
(function () {
  var cols = {}, listeners = [], n = 0;
  function col(name) { return (cols[name] = cols[name] || {}); }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function snap(name, id) { var d = col(name)[id]; return { id: id, exists: !!d, data: function () { return clone(d); }, ref: ref(name, id) }; }
  function notify() { setTimeout(function () { listeners.forEach(function (l) { l(); }); }, 0); }
  function write(name, id, data, opt) { var cur = (opt && opt.merge && col(name)[id]) || {}; col(name)[id] = Object.assign({}, cur, clone(data)); notify(); }
  function ref(name, id) {
    return { id: id, _c: name,
      get: function () { return Promise.resolve(snap(name, id)); },
      set: function (d, o) { write(name, id, d, o); return Promise.resolve(); },
      delete: function () { delete col(name)[id]; notify(); return Promise.resolve(); },
      onSnapshot: function (cb) { var f = function () { cb(snap(name, id)); }; listeners.push(f); f(); } };
  }
  function query(name, field, dir, lim) {
    var q = {
      orderBy: function (f, d) { return query(name, f, d, lim); },
      limit: function (l) { return query(name, field, dir, l); },
      _get: function () {
        var docs = Object.keys(col(name)).map(function (id) { return snap(name, id); });
        if (field) docs.sort(function (a, b) { return (a.data()[field] - b.data()[field]) * (dir === 'desc' ? -1 : 1); });
        if (lim) docs = docs.slice(0, lim);
        return { docs: docs, empty: !docs.length, forEach: function (fn) { docs.forEach(fn); } };
      },
      get: function () { return Promise.resolve(q._get()); },
      onSnapshot: function (cb) { var f = function () { cb(q._get()); }; listeners.push(f); f(); },
      doc: function (id) { return ref(name, id || 'auto' + (++n)); }
    };
    return q;
  }
  var db = {
    collection: function (name) { return query(name); },
    runTransaction: function (fn) { return fn({ get: function (r) { return r.get(); }, set: function (r, d, o) { write(r._c, r.id, d, o); }, delete: function (r) { delete col(r._c)[r.id]; notify(); } }); },
    batch: function () { var ops = []; return { set: function (r, d, o) { ops.push(function () { write(r._c, r.id, d, o); }); }, delete: function (r) { ops.push(function () { delete col(r._c)[r.id]; }); }, commit: function () { ops.forEach(function (f) { f(); }); notify(); return Promise.resolve(); } }; }
  };
  window.firebase = { apps: [], initializeApp: function (c) { window.__fbInit = c.projectId; this.apps.push(1); }, firestore: Object.assign(function () { return db; }, { FieldValue: { serverTimestamp: function () { return 'ts'; } } }) };
  window.__fakeCols = cols;
})();
