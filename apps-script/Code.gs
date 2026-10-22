/**
 * 공기 레전드 — 우리 반 서버 (구글 시트 + Apps Script)
 *
 * 쓰는 법
 *  1) 새 구글 시트를 만들고 [확장 프로그램] → [Apps Script]
 *  2) 원래 있던 코드를 모두 지우고 이 파일 내용을 붙여넣은 뒤 저장
 *  3) [배포] → [새 배포] → 유형: 웹 앱 / 다음 사용자로 실행: 나 / 액세스 권한: 모든 사용자 → [배포]
 *  4) 권한을 승인하고 나온 "웹 앱 URL"을 공기 레전드 시작 화면에 붙여넣기
 *
 * 이 시트에 반 명단, 경기 기록, 학생 비밀번호가 저장돼요. 시트를 다른 사람과 공유하지 마세요.
 * 경기 기록은 '경기' 탭에서 직접 보거나 고칠 수 있어요(고친 내용은 앱 점수에 바로 반영돼요).
 */

var TAB = { students: '학생', matches: '경기', players: '선수', pins: '비밀번호', reports: '확인요청', config: '설정', adjust: '점수조정' };
var HEAD = {
  학생: ['번호', '이름'],
  경기: ['id', '날짜', '승자', '패자', 't', '기록한 사람', '수정'],
  선수: ['이름', '꾸미기', '쉬는중'],
  비밀번호: ['이름', '비밀번호'],
  확인요청: ['id', '승자', '패자', 't'],
  설정: ['항목', '값'],
  점수조정: ['id', '날짜', '이름', '점수', '사유', 't']
};

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'state';
  try {
    if (action === 'v') return out({ ok: true, v: version_() });
    return out(Object.assign({ ok: true }, state_()));
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    var res = handle_(req) || {};
    return out(Object.assign({ ok: true }, res));
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ───────── 시트 도우미 ───────── */
function sheet_(name) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows_(name) {
  var sh = sheet_(name), n = sh.getLastRow();
  if (n < 2) return [];
  var w = HEAD[name].length;
  return sh.getRange(2, 1, n - 1, w).getValues();
}
function findRow_(name, col, value) {
  var r = rows_(name);
  for (var i = 0; i < r.length; i++) if (String(r[i][col]) === String(value)) return i + 2;
  return 0;
}
function config_() {
  var c = {};
  rows_(TAB.config).forEach(function (r) { if (r[0]) c[r[0]] = r[1]; });
  return c;
}
function setConfig_(key, value) {
  var row = findRow_(TAB.config, 0, key), sh = sheet_(TAB.config);
  if (row) sh.getRange(row, 2).setValue(value); else sh.appendRow([key, value]);
}
function version_() { return Number(PropertiesService.getScriptProperties().getProperty('v') || 0); }
function bump_() { PropertiesService.getScriptProperties().setProperty('v', String(version_() + 1)); }
function stamp_(t) { return Utilities.formatDate(new Date(t), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'); }

/* ───────── 읽기 ───────── */
function state_() {
  var c = config_();
  var ready = !!c['선생님비밀번호'];
  var roster = rows_(TAB.students).filter(function (r) { return String(r[1]).trim(); })
    .map(function (r, i) { return { id: Number(r[0]) || i + 1, name: String(r[1]).trim() }; });
  var players = {};
  rows_(TAB.players).forEach(function (r) {
    if (!r[0]) return;
    var look = {};
    try { look = JSON.parse(r[1] || '{}'); } catch (e) { look = {}; }
    players[r[0]] = Object.assign(look, { away: r[2] === true || r[2] === 'TRUE' });
  });
  var matches = rows_(TAB.matches).filter(function (r) { return r[0] && r[2] && r[3]; }).map(function (r) {
    var t = Number(r[4]) || (r[1] instanceof Date ? r[1].getTime() : Date.parse(r[1])) || 0;
    return { id: String(r[0]), a: String(r[2]), b: String(r[3]), t: t, by: r[5] || '', edited: r[6] ? 1 : 0 };
  });
  var reports = rows_(TAB.reports).filter(function (r) { return r[0]; })
    .map(function (r) { return { id: String(r[0]), winner: String(r[1]), loser: String(r[2]), t: Number(r[3]) }; });
  var adjusts = rows_(TAB.adjust).filter(function (r) { return r[0] && r[2]; }).map(function (r) {
    var t = Number(r[5]) || (r[1] instanceof Date ? r[1].getTime() : Date.parse(r[1])) || 0;
    return { id: String(r[0]), p: String(r[2]), d: Number(r[3]) || 0, note: String(r[4] || ''), t: t };
  });
  var pinSet = rows_(TAB.pins).filter(function (r) { return r[0] && String(r[1]); }).map(function (r) { return String(r[0]); });
  var settings = {};
  try { settings = JSON.parse(c['규칙'] || '{}'); } catch (e) { settings = {}; }
  return {
    ready: ready, v: version_(), league: c['반이름'] || '우리 반 리그', season: Number(c['시즌']) || 1,
    roster: roster, players: players, matches: matches, reports: reports, adjusts: adjusts, pinSet: pinSet, settings: settings
  };
}

/* ───────── 쓰기 ───────── */
function teacher_(req) {
  var pw = String(config_()['선생님비밀번호'] || '');
  if (!pw || String(req.teacherPw || '') !== pw) throw new Error('선생님 비밀번호가 맞지 않아요.');
}
function pinOf_(name) {
  var row = findRow_(TAB.pins, 0, name);
  return row ? String(sheet_(TAB.pins).getRange(row, 2).getValue()) : '';
}
function names_() { return state_().roster.map(function (s) { return s.name; }); }
function mustStudent_(name) { if (names_().indexOf(name) === -1) throw new Error('명단에 없는 이름이에요: ' + name); }

function handle_(req) {
  var a = req.action;
  var c = config_();

  if (a === 'init') {
    if (c['선생님비밀번호']) throw new Error('이미 만들어진 반이에요.');
    if (!/^\S{4,}$/.test(String(req.teacherPw || ''))) throw new Error('선생님 비밀번호는 4자 이상이어야 해요.');
    var list = (req.students || []).map(function (s) { return String(s).trim(); }).filter(String);
    if (list.length < 2) throw new Error('학생을 2명 이상 넣어 주세요.');
    var sh = sheet_(TAB.students);
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
    sh.getRange(2, 1, list.length, 2).setValues(list.map(function (n, i) { return [i + 1, n]; }));
    setConfig_('반이름', String(req.league || '우리 반 리그'));
    setConfig_('시즌', 1);
    setConfig_('선생님비밀번호', String(req.teacherPw));
    [TAB.matches, TAB.players, TAB.pins, TAB.reports, TAB.adjust].forEach(sheet_);
    bump_();
    return {};
  }
  if (!c['선생님비밀번호']) throw new Error('아직 반이 만들어지지 않았어요.');

  switch (a) {
    case 'checkTeacher':
      teacher_(req); return {};
    case 'checkPin':
      var p = pinOf_(req.id);
      var ok = !!p && String(req.pin) === p || String(req.pin) === String(c['선생님비밀번호']);
      return { match: ok };
    case 'setPin':
      mustStudent_(req.id);
      if (!/^\d{4}$/.test(String(req.pin))) throw new Error('숫자 4자리를 넣어 주세요.');
      var prow = findRow_(TAB.pins, 0, req.id);
      if (prow && pinOf_(req.id)) { teacher_(req); sheet_(TAB.pins).getRange(prow, 2).setValue("'" + req.pin); }
      else if (prow) sheet_(TAB.pins).getRange(prow, 2).setValue("'" + req.pin);
      else sheet_(TAB.pins).appendRow([req.id, "'" + req.pin]);
      break;
    case 'resetPin':
      teacher_(req);
      var rrow = findRow_(TAB.pins, 0, req.id);
      if (rrow) sheet_(TAB.pins).deleteRow(rrow);
      break;
    case 'record':
      mustStudent_(req.w); mustStudent_(req.l);
      if (req.w === req.l) throw new Error('같은 사람끼리는 기록할 수 없어요.');
      if (req.consume) {
        var crow = findRow_(TAB.reports, 0, req.consume);
        if (!crow) throw new Error('이미 처리된 결과예요.');
      }
      [req.consume].concat(req.cleanup || []).forEach(function (id) {
        if (!id) return;
        var r = findRow_(TAB.reports, 0, id);
        if (r) sheet_(TAB.reports).deleteRow(r);
      });
      var t = Date.now(), id = 'm' + t.toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      sheet_(TAB.matches).appendRow([id, stamp_(t), req.w, req.l, t, req.by || '', '']);
      bump_();
      return { match: { id: id, a: req.w, b: req.l, t: t } };
    case 'addReport':
      mustStudent_(req.w); mustStudent_(req.l);
      var rid = req.w + '__' + req.l;
      if (!findRow_(TAB.reports, 0, rid)) sheet_(TAB.reports).appendRow([rid, req.w, req.l, Date.now()]);
      break;
    case 'removeReport':
      var dr = findRow_(TAB.reports, 0, req.id);
      if (dr) sheet_(TAB.reports).deleteRow(dr);
      break;
    case 'updatePlayer':
      mustStudent_(req.id);
      var f = req.fields || {}, prow2 = findRow_(TAB.players, 0, req.id), shp = sheet_(TAB.players);
      if ('away' in f) teacher_(req);
      var cur = prow2 ? shp.getRange(prow2, 1, 1, 3).getValues()[0] : [req.id, '{}', false];
      var look = {};
      try { look = JSON.parse(cur[1] || '{}'); } catch (e) { look = {}; }
      Object.keys(f).forEach(function (k) { if (k !== 'away') look[k] = f[k]; });
      var row = [req.id, JSON.stringify(look), 'away' in f ? !!f.away : cur[2] === true || cur[2] === 'TRUE'];
      if (prow2) shp.getRange(prow2, 1, 1, 3).setValues([row]); else shp.appendRow(row);
      break;
    case 'updateMatch':
      teacher_(req);
      var mrow = findRow_(TAB.matches, 0, req.id);
      if (!mrow) throw new Error('경기를 찾지 못했어요.');
      var fl = req.fields || {}, shm = sheet_(TAB.matches), m = shm.getRange(mrow, 1, 1, 7).getValues()[0];
      if (fl.a) { mustStudent_(fl.a); m[2] = fl.a; }
      if (fl.b) { mustStudent_(fl.b); m[3] = fl.b; }
      if (fl.t) { m[4] = fl.t; m[1] = stamp_(fl.t); }
      m[6] = stamp_(Date.now());
      shm.getRange(mrow, 1, 1, 7).setValues([m]);
      break;
    case 'deleteMatch':
      teacher_(req);
      var drow = findRow_(TAB.matches, 0, req.id);
      if (drow) sheet_(TAB.matches).deleteRow(drow);
      break;
    case 'addAdjust':
      teacher_(req); mustStudent_(req.p);
      var d = Math.round(Number(req.d));
      if (!d || Math.abs(d) > 1000) throw new Error('점수는 -1000 ~ 1000 사이로 넣어 주세요.');
      var tj = Math.max(Date.now(), Number(req.t) || 0);
      sheet_(TAB.adjust).appendRow(['j' + tj.toString(36) + Math.floor(Math.random() * 1e4).toString(36), stamp_(tj), req.p, d, String(req.note || ''), tj]);
      break;
    case 'deleteAdjust':
      teacher_(req);
      var jr = findRow_(TAB.adjust, 0, req.id);
      if (jr) sheet_(TAB.adjust).deleteRow(jr);
      break;
    case 'saveSettings':
      teacher_(req);
      setConfig_('규칙', JSON.stringify(req.settings || {}));
      break;
    case 'setRoster':
      teacher_(req);
      var names = (req.students || []).map(function (s) { return String(s).trim(); }).filter(String);
      if (names.length < 2) throw new Error('학생을 2명 이상 넣어 주세요.');
      var shs = sheet_(TAB.students);
      if (shs.getLastRow() > 1) shs.getRange(2, 1, shs.getLastRow() - 1, 2).clearContent();
      shs.getRange(2, 1, names.length, 2).setValues(names.map(function (n, i) { return [i + 1, n]; }));
      if (req.league) setConfig_('반이름', String(req.league));
      break;
    case 'resetSeason':
      teacher_(req);
      [TAB.matches, TAB.reports, TAB.adjust].forEach(function (name) {
        var s = sheet_(name);
        if (s.getLastRow() > 1) s.deleteRows(2, s.getLastRow() - 1);
      });
      setConfig_('시즌', (Number(c['시즌']) || 1) + 1);
      break;
    default:
      throw new Error('알 수 없는 요청이에요: ' + a);
  }
  bump_();
  return {};
}

/* 시트에서 직접 고치면 앱이 바로 알아채도록 */
function onEdit() { bump_(); }
