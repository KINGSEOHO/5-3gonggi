/* 공기 블록스 — 화면 */
(function () {
  'use strict';

  var GG = window.GG;
  var GGStore = window.GGStore;
  var cfg = window.GG_CONFIG || {};
  /* 어떤 반을 열지 정한다
     ?sheet=웹앱ID  → 그 선생님의 구글 시트 반
     ?setup         → 새 반 만들기 안내
     ?demo          → 체험
     (주소에 아무것도 없으면) config.js 의 Firebase 반 → 없으면 이 크롬북에 기억된 시트 반 → 없으면 안내 */
  var params = new URLSearchParams(location.search);
  function sheetUrlFrom(v) {
    v = String(v || '').trim();
    var m = v.match(/\/macros\/s\/([\w-]+)/);
    if (m) return 'https://script.google.com/macros/s/' + m[1] + '/exec';
    return /^[\w-]{20,}$/.test(v) ? 'https://script.google.com/macros/s/' + v + '/exec' : '';
  }
  function sheetIdOf(url) { var m = String(url).match(/\/macros\/s\/([\w-]+)/); return m ? m[1] : ''; }
  var savedSheet = '';
  try { savedSheet = localStorage.getItem('gonggi-sheet') || ''; } catch (e) { savedSheet = ''; }
  var CONFIGURED = !!(cfg.FIREBASE && cfg.STUDENTS && cfg.STUDENTS.length);
  var MODE = params.get('sheet') ? 'sheet' : params.has('setup') ? 'setup' : (params.has('demo') || cfg.DEMO_ONLY) ? 'demo'
    : CONFIGURED ? 'firebase' : savedSheet ? 'sheet' : 'setup';
  var SHEET_URL = MODE === 'sheet' ? sheetUrlFrom(params.get('sheet') || savedSheet) : '';
  if (MODE === 'sheet' && !SHEET_URL) MODE = 'setup';
  if (SHEET_URL) { try { localStorage.setItem('gonggi-sheet', SHEET_URL); } catch (e) { /* 무시 */ } }
  var SHEET = MODE === 'sheet';
  var SETUP = MODE === 'setup';
  // 설정은 있는데 Firebase를 못 불러왔으면 체험 모드로 바꾸지 않고 오류를 보여 준다 (예시 기록을 실제로 착각하지 않게)
  var OFFLINE = MODE === 'firebase' && !window.firebase;
  var LIVE = MODE === 'firebase' && !OFFLINE;
  var REAL = LIVE || SHEET;
  var DEMO_NAMES = ['하늘', '도윤', '서연', '지호', '민준', '하린', '시우', '수아', '예준', '지안', '은우', '채원', '유준', '나윤', '건우', '소율'];
  var ROSTER = LIVE ? cfg.STUDENTS.slice() : SHEET ? [] : DEMO_NAMES.map(function (n, i) { return { id: i + 1, name: n }; });
  var TEACHER_PW = LIVE ? String(cfg.TEACHER_PASSWORD || '') : SHEET ? '' : '0000';
  var DEMO_PIN = '0000';
  var LEAGUE = SHEET ? '우리 반 리그' : cfg.LEAGUE_NAME || '해바라기 리그';
  var SEASON = cfg.SEASON || 1;
  var CLASS_LINK = location.origin + location.pathname + (SHEET ? '?sheet=' + sheetIdOf(SHEET_URL) : '');

  var AV = window.GGAvatar;
  var NAV = [
    { id: 'home', label: '로비', icon: 'M12 2 3 7v10l9 5 9-5V7zm0 2.3 6.8 3.8L12 12 5.2 8.1zM5 9.8l6 3.4v6.6l-6-3.3zm8 10V13.2l6-3.4v6.7z' },
    { id: 'battle', label: '대결', icon: 'M4 3h3l7 7-1.5 1.5L4 4zm16 0v3l-9 9-1.5-1.5L18.5 4zM3 17l4-4 4 4-1.5 1.5L8 17l-3 3-2-2 3-3-1.5-1.5zm18 0-4-4-4 4 1.5 1.5L16 17l3 3 2-2-3-3z' },
    { id: 'rank', label: '랭킹', icon: 'M8 21v-8h8v8zm-6 0v-5h5v5zm15 0v-11h5v11zM12 2l1.8 3.6 4 .6-2.9 2.8.7 4L12 11.1 8.4 13l.7-4-2.9-2.8 4-.6z' },
    { id: 'tiers', label: '티어', icon: 'M12 2l8 3.5-.8 8.2C18.6 18 15.8 20.6 12 22c-3.8-1.4-6.6-4-7.2-8.3L4 5.5zm0 5-4 3.5 4 6 4-6z' },
    { id: 'history', label: '기록', icon: 'M12 3a9 9 0 1 1-9 9h2a7 7 0 1 0 2-5l2 2H3V3l2.6 2.6A9 9 0 0 1 12 3zm-1 4h2v5l4 2-1 1.7-5-2.7z' },
    { id: 'settings', label: '선생님', icon: 'M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5zm0 6a2.5 2.5 0 0 1 1 4.8V16h-2v-4.2A2.5 2.5 0 0 1 12 7z' }
  ];

  var data = null;            // 저장소에서 받은 값
  var calc = null;            // 기록을 다시 계산한 결과 { players, matches }
  var seen = {}, firstLoad = true, wantResult = {}; // 이미 본 대결 (다른 크롬북에서 확정된 내 대결 알림용)
  var ui = { a: null, b: null, rankFilter: 'all', pairs: null, teacher: false, busy: false };
  /* 이 크롬북의 주인 (로그인한 학생). 각자 크롬북에서 쓰는 걸 기본으로 한다 */
  var ME_KEY = LIVE ? 'gonggi-me' : SHEET ? 'gonggi-me-' + sheetIdOf(SHEET_URL).slice(-12) : 'gonggi-me-demo';
  var me = null;
  try { me = localStorage.getItem(ME_KEY); } catch (e) { me = null; }
  if (me && !ROSTER.some(function (st) { return st.name === me; })) me = null;
  function setMe(id) { me = id; try { if (id) localStorage.setItem(ME_KEY, id); else localStorage.removeItem(ME_KEY); } catch (e) { /* 무시 */ } render(); }
  function personal() { return !!me && !ui.teacher; }
  var uid = 0;
  var prefs = loadPrefs();

  /* ───────── 저장소 ───────── */
  function baseStats() {
    var s = (data && data.settings) || GG.DEFAULT_SETTINGS;
    return { points: s.startPoints, wins: 0, losses: 0, streak: 0, bestStreak: 0, peak: s.startPoints };
  }

  /* 체험 모드 예시: 실력이 다른 16명이 2주 동안 대결한 기록 */
  function demoSeed() {
    var skill = [9, 7, 8, 4, 6, 5, 3, 6, 2, 7, 4, 5, 3, 1, 8, 2];
    var seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var ms = [], pins = {};
    var t = Date.now() - 1000 * 60 * 60 * 24 * 14;
    ROSTER.forEach(function (st) { pins[st.name] = DEMO_PIN; });
    for (var k = 0; k < 480; k++) {
      var i1 = Math.floor(rnd() * ROSTER.length), i2 = Math.floor(rnd() * ROSTER.length);
      if (i1 === i2) continue;
      var w = rnd() < skill[i1] / (skill[i1] + skill[i2]) ? i1 : i2, l = w === i1 ? i2 : i1;
      t += 1000 * 60 * (10 + Math.floor(rnd() * 40));
      ms.push({ id: 'd' + k, a: ROSTER[w].name, b: ROSTER[l].name, t: Math.min(t, Date.now() - 60000) });
    }
    return { players: {}, matches: ms, pins: pins, settings: Object.assign({}, GG.DEFAULT_SETTINGS) };
  }

  var store = OFFLINE || SETUP ? null : LIVE ? new GGStore.FirebaseStore(cfg) : SHEET ? new GGStore.SheetStore(SHEET_URL) : new GGStore.LocalStore(demoSeed);
  if (store && !SHEET) store.teacherPw = TEACHER_PW;

  function loadPrefs() {
    try { return Object.assign({ sound: true }, JSON.parse(localStorage.getItem('gonggi-blox-prefs') || '{}')); }
    catch (e) { return { sound: true }; }
  }
  function savePrefs() { try { localStorage.setItem('gonggi-blox-prefs', JSON.stringify(prefs)); } catch (e) { /* 무시 */ } }

  /* 명단 + 저장된 값 → 선수 목록 */
  var cache = null;
  function players() {
    if (cache) return cache;
    cache = ROSTER.map(function (st, i) {
      var saved = (data && data.players[st.name]) || {};
      var stat = (calc && calc.players[st.name]) || baseStats();
      return Object.assign({ away: false }, saved, stat,
        { id: st.name, name: st.name, no: st.id, look: AV.normalize(saved, i) });
    });
    return cache;
  }
  function byId(id) {
    var list = players();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function sorted(list) {
    return (list || players()).slice().sort(function (a, b) {
      return b.points - a.points || b.wins - a.wins || a.no - b.no;
    });
  }
  function placeOf(p) { return sorted().indexOf(p) + 1; }
  function matches() { return (calc && calc.matches) || []; }
  function adjusts() { return (calc && calc.adjusts) || []; }
  function matchById(id) { var ms = matches(); for (var i = ms.length - 1; i >= 0; i--) if (ms[i].id === id) return ms[i]; return null; }
  function settings() { return (data && data.settings) || GG.DEFAULT_SETTINGS; }

  /* ───────── 그림 ───────── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  /* 블록 캐릭터 (그리기는 js/avatar.js) */
  function avatarFull(p) { return AV.render(p.look || AV.normalize(p, 0), { no: p.no }); }
  function headshot(p, size) { return AV.render(p.look || AV.normalize(p, 0), { mode: 'head', size: size || 34, no: p.no }); }

  /* 티어 엠블럼 — 티어가 오를수록 날개, 뿔, 왕관, 후광이 붙는다 */
  function crest(rank, size) {
    var t = rank.tier, i = rank.tierIndex, id = 'c' + (++uid);
    var dk = shade(t.color, -70), mid = shade(t.color, -25);
    var metal = 'url(#' + id + 'm)', glow = '', behind = '', above = '';
    if (i >= 3) glow = '<circle cx="60" cy="58" r="52" fill="url(#' + id + 'g)"/>';
    if (i >= 9) {
      for (var k = 0; k < 16; k++) behind += '<path d="M60 58 L57 4 L63 4 Z" fill="' + t.light + '" opacity=".35" transform="rotate(' + (k * 22.5) + ' 60 58)"/>';
    }
    var wing = '';
    if (i >= 7) wing = 'M34 34 L2 18 L14 38 L-2 44 L16 54 L2 64 L22 68 L10 82 L34 76 Z';
    else if (i >= 5) wing = 'M34 36 L8 24 L18 40 L4 46 L20 54 L10 64 L34 66 Z';
    else if (i >= 3) wing = 'M34 40 L14 34 L22 44 L12 50 L34 58 Z';
    else if (i >= 1) wing = 'M34 44 L24 48 L34 54 Z';
    if (wing) {
      var w = '<path d="' + wing + '" fill="' + metal + '" stroke="' + dk + '" stroke-width="2" stroke-linejoin="round"/>';
      behind += w + '<g transform="translate(120 0) scale(-1 1)">' + w + '</g>';
    }
    if (i >= 7) above += '<path d="M40 24 L42 6 L51 15 L60 0 L69 15 L78 6 L80 24 Z" fill="' + metal + '" stroke="' + dk + '" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="8" r="3" fill="' + t.light + '"/>';
    else if (i >= 2) above += '<path d="M53 22 L60 6 L67 22 Z" fill="' + metal + '" stroke="' + dk + '" stroke-width="2" stroke-linejoin="round"/>';
    var plate = rank.division
      ? '<path d="M44 96 H76 L80 103 L76 110 H44 L40 103 Z" fill="#0a0e17" stroke="' + t.color + '" stroke-width="1.5"/>' +
        '<text x="60" y="107.5" text-anchor="middle" font-family="Cinzel, serif" font-weight="900" font-size="11" fill="' + t.light + '">' + rank.division + '</text>'
      : '';
    return '<svg class="crest" width="' + size + '" height="' + size + '" viewBox="-4 -2 128 116" role="img" aria-label="' + rank.label + '" style="flex-shrink:0;overflow:visible">' +
      '<defs>' +
      '<linearGradient id="' + id + 'm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + t.light + '"/><stop offset=".45" stop-color="' + t.color + '"/><stop offset=".55" stop-color="' + mid + '"/><stop offset="1" stop-color="' + t.color + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="' + t.color + '" stop-opacity=".55"/><stop offset="1" stop-color="' + t.color + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'i" cx=".5" cy=".35"><stop offset="0" stop-color="' + mid + '"/><stop offset="1" stop-color="#05070c"/></radialGradient>' +
      '<linearGradient id="' + id + 'j" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="' + t.light + '"/><stop offset="1" stop-color="' + t.color + '"/></linearGradient>' +
      '</defs>' + glow + behind +
      '<path d="M60 14 L94 28 L94 64 Q94 90 60 106 Q26 90 26 64 L26 28 Z" fill="' + metal + '" stroke="' + dk + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M60 22 L86 33 L86 63 Q86 83 60 96 Q34 83 34 63 L34 33 Z" fill="url(#' + id + 'i)" stroke="' + t.light + '" stroke-opacity=".5" stroke-width="1"/>' +
      '<path d="M60 36 L74 56 L60 80 L46 56 Z" fill="url(#' + id + 'j)" stroke="' + dk + '" stroke-width="1.5"/>' +
      '<path d="M60 36 L74 56 L60 58 Z" fill="#fff" opacity=".35"/><path d="M46 56 L60 58 L60 80 Z" fill="#000" opacity=".2"/>' +
      above + plate + '</svg>';
  }
  function logoMark(cls) {
    // 육각 테두리 안의 공기 다섯 알
    return '<svg class="' + (cls || 'logo-mark') + '" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0e6d2"/><stop offset=".5" stop-color="#c8aa6e"/><stop offset="1" stop-color="#785a28"/></linearGradient></defs>' +
      '<path d="M20 2 36 11v18L20 38 4 29V11z" fill="#0b101b" stroke="url(#lg)" stroke-width="2.4"/>' +
      '<circle cx="20" cy="13" r="3.4" fill="url(#lg)"/><circle cx="13" cy="20" r="3.4" fill="#0ac8b9"/><circle cx="27" cy="20" r="3.4" fill="url(#lg)"/><circle cx="16" cy="27.5" r="3.4" fill="url(#lg)"/><circle cx="24" cy="27.5" r="3.4" fill="url(#lg)"/></svg>';
  }
  function navIcon(d, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function tierGlow(rank) { return 'radial-gradient(circle at 50% 60%,' + rank.tier.color + '55, transparent 62%), linear-gradient(180deg,#141c2e,#070a12)'; }
  function lpBar(rank, pct) {
    if (pct == null) pct = rank.lpMax ? Math.round(rank.lp / rank.lpMax * 100) : 100;
    return '<div class="lpbar"><span style="width:' + pct + '%;background:linear-gradient(90deg,' + shade(rank.tier.color, -30) + ',' + rank.tier.light + ');box-shadow:0 0 10px ' + rank.tier.color + '"></span></div>';
  }
  function nextStepText(rank) {
    var next = GG.TIERS[rank.tierIndex + 1];
    if (rank.division && rank.division !== 'I') return '다음 단계까지 ' + (rank.lpMax - rank.lp) + ' LP';
    if (next) return next.name + ' 승급까지 ' + (next.min - rank.points) + ' LP';
    return '최고 티어 달성';
  }
  function ago(t) {
    var d = (Date.now() - t) / 1000;
    if (d < 60) return '방금';
    if (d < 3600) return Math.floor(d / 60) + '분 전';
    if (d < 86400) return Math.floor(d / 3600) + '시간 전';
    if (d < 86400 * 7) return Math.floor(d / 86400) + '일 전';
    var dt = new Date(t);
    return (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일';
  }
  function winRate(p) { var g = p.wins + p.losses; return g ? Math.round(p.wins / g * 100) : 0; }
  function streakPill(p) {
    if (p.streak >= 3) return '<span class="pill pill-gold">' + p.streak + '연승</span>';
    if (p.streak >= 2) return '<span class="pill pill-up">' + p.streak + '연승</span>';
    if (p.streak <= -3) return '<span class="pill pill-down">' + (-p.streak) + '연패</span>';
    return '';
  }
  function lp(points) { return '<span class="lp">' + points + '<small>LP</small></span>'; }

  /* ───────── 화면 틀 ───────── */
  var main = document.getElementById('main');
  var layer = document.getElementById('layer');

  function route() { var r = (location.hash || '#home').slice(1); return VIEWS[r] ? r : 'home'; }

  function render() {
    cache = null;
    var r = route();
    renderNav(r);
    if (OFFLINE) {
      main.innerHTML = '<div class="loading">' + logoMark() + '<h2>리그 서버에 연결하지 못했어요</h2><div>인터넷 연결을 확인하고 새로고침해 주세요. 학교 인터넷에서 www.gstatic.com 이 막혀 있으면 열리지 않아요.</div>' +
        '<button class="btn" type="button" onclick="location.reload()">새로고침</button></div>';
      return;
    }
    if (SETUP) { main.innerHTML = '<div class="page">' + setupView() + '</div>'; loadScriptCode(); return; }
    if (SHEET && data && !data.ready) { main.innerHTML = '<div class="page">' + initView() + '</div>'; return; }
    if (!data) {
      main.innerHTML = '<div class="loading">' + logoMark() + '<div>리그 정보를 불러오는 중…</div></div>';
      return;
    }
    drawMe();
    main.innerHTML = '<div class="page">' + inbox() + VIEWS[r]() + '</div>';
  }
  function renderNav(active) {
    if (SETUP) { document.getElementById('nav').innerHTML = ''; return; }
    document.getElementById('nav').innerHTML = NAV.map(function (n) {
      return '<a class="navlink' + (n.id === active ? ' active' : '') + '" href="#' + n.id + '"' + (n.id === active ? ' aria-current="page"' : '') + '>' + navIcon(n.icon) + '<span>' + n.label + '</span></a>';
    }).join('');
  }
  function demoBanner() {
    if (REAL) return '';
    return '<div class="demo-banner"><div><b>체험 모드</b> <span class="muted">· 예시 선수와 기록이 들어 있어요. 학생 비밀번호와 선생님 비밀번호는 모두 <b class="num">0000</b>이에요. 체크리스트와 연결하면 실제 우리 반 명단으로 바뀌어요.</span></div></div>';
  }

  function reports() { return (data && data.reports) || []; }
  /* 나에게 온 결과 확인 요청과 내가 보낸 요청 */
  function inbox() {
    if (!me) return '';
    var html = '';
    reports().forEach(function (rp) {
      var w = byId(rp.winner), l = byId(rp.loser);
      if (!w || !l) return;
      if (rp.loser === me) {
        var pv = GG.calcMatch(w.points, l.points, w.streak > 0 ? w.streak : 0, settings(), l.streak < 0 ? -l.streak : 0);
        html += '<section class="panel gilded inbox incoming"><div class="who">' + headshot(w, 44) + '<span><span class="eyebrow">Result Check</span><b style="display:block;font-size:17px">' + esc(w.name) + '이(가) 이겼다고 기록했어요</b>' +
          '<span class="sub">맞으면 결과가 기록돼요 · 나 <span class="down">−' + pv.loss + ' LP</span> · ' + esc(w.name) + ' <span class="up">+' + pv.total + ' LP</span></span></span></div>' +
          '<div class="row-actions"><button class="btn btn-ghost" type="button" data-act="report-reject" data-id="' + esc(rp.id) + '">아니에요</button><button class="btn btn-gold" type="button" data-act="report-accept" data-id="' + esc(rp.id) + '">맞아요, 졌어요</button></div></section>';
      } else if (rp.winner === me) {
        html += '<section class="panel inbox"><div class="who">' + headshot(l, 36) + '<span><b>' + esc(l.name) + '의 확인을 기다리는 중</b><span class="sub">' + esc(l.name) + '이(가) 자기 크롬북에서 "맞아요"를 누르면 기록돼요</span></span></div>' +
          '<button class="btn btn-sm btn-ghost" type="button" data-act="report-reject" data-id="' + esc(rp.id) + '">취소</button></section>';
      }
    });
    return html;
  }

  /* 새 반 만들기 안내 (구글 시트 + Apps Script) */
  function setupView() {
    var step = function (n, title, body) { return '<div class="setup-step"><span class="setup-no">' + n + '</span><div><h3>' + title + '</h3>' + body + '</div></div>'; };
    return '<section class="hero" style="min-height:0"><div class="hero-copy"><span class="eyebrow">For Teachers</span>' +
      '<h1><span class="en gold-text">GONGGI LEGENDS</span>우리 반 공기 리그 만들기</h1>' +
      '<p>선생님 구글 시트 하나가 우리 반 서버가 돼요. 명단과 기록은 선생님 드라이브에만 저장되고, 아이들은 각자 크롬북으로 접속해요. 10분이면 끝나요.</p>' +
      '<div class="hero-actions"><a class="btn btn-ghost" href="?demo">먼저 체험해 보기</a></div></div></section>' +
      '<section class="panel gilded section setup">' +
      step(1, '새 구글 시트 만들기', '<p>학생 개인 계정이 아닌 <b>선생님 계정</b>으로 <a class="link" href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> 를 열어 빈 시트를 만들고, 이름을 "공기 리그"처럼 바꿔 주세요.</p>') +
      step(2, '코드 붙여넣기', '<p>시트 메뉴 <b>확장 프로그램 → Apps Script</b>. 원래 있던 코드를 모두 지우고 아래 코드를 붙여넣은 뒤 💾 저장.</p>' +
        '<textarea class="input code" id="gs-code" readonly aria-label="Apps Script 코드">코드를 불러오는 중…</textarea><div class="row-actions" style="justify-content:flex-start"><button class="btn btn-gold" type="button" data-act="copy-code">코드 복사</button></div>') +
      step(3, '웹 앱으로 배포', '<p>오른쪽 위 <b>배포 → 새 배포</b> → 톱니바퀴에서 <b>웹 앱</b> 선택<br>· 다음 사용자 인증 정보로 실행: <b>나</b><br>· 액세스 권한이 있는 사용자: <b>모든 사용자</b><br>→ 배포 → 권한 승인(“확인되지 않은 앱” 화면이 나오면 고급 → 이동) → <b>웹 앱 URL 복사</b></p>' +
        '<p class="muted" style="font-size:13px">학교 계정에서 "모든 사용자"가 안 보이면 학교 관리자가 막아 둔 거예요. 개인 구글 계정으로 1단계부터 해 주세요.</p>') +
      step(4, '연결하고 반 만들기', '<div class="form-row"><label for="sheet-url">웹 앱 URL</label><input class="input" id="sheet-url" placeholder="https://script.google.com/macros/s/…/exec"></div>' +
        '<div class="form-error" id="sheet-err"></div><div class="row-actions" style="justify-content:flex-start"><button class="btn btn-play" type="button" data-act="connect-sheet">연결하기</button></div>') +
      '</section>';
  }
  var scriptCode = null;
  function loadScriptCode() {
    var box = document.getElementById('gs-code');
    if (!box) return;
    if (scriptCode) { box.value = scriptCode; return; }
    fetch('apps-script/Code.gs').then(function (r) { if (!r.ok) throw new Error(); return r.text(); }).then(function (t) {
      scriptCode = t; var b = document.getElementById('gs-code'); if (b) b.value = t;
    }).catch(function () { var b = document.getElementById('gs-code'); if (b) b.value = '코드를 불러오지 못했어요. GitHub 저장소의 apps-script/Code.gs 파일 내용을 복사해 주세요.'; });
  }
  /* 연결은 됐는데 아직 반이 없을 때 */
  function initView() {
    return '<div class="page-head"><div><span class="eyebrow">New League</span><h1>우리 반 만들기</h1><p>시트 연결 성공! 반 이름, 선생님 비밀번호, 학생 명단만 넣으면 끝이에요.</p></div></div>' +
      '<section class="panel gilded section" style="max-width:640px">' +
      '<div class="form-row"><label for="init-league">반 이름</label><input class="input" id="init-league" placeholder="예: 3학년 2반 공기 리그"></div>' +
      '<div class="form-row"><label for="init-pw">선생님 비밀번호 (4자 이상, 학생에게 알려 주지 마세요)</label><input class="input" id="init-pw" type="password"></div>' +
      '<div class="form-row"><label for="init-pw2">선생님 비밀번호 한 번 더</label><input class="input" id="init-pw2" type="password"></div>' +
      '<div class="form-row"><label for="init-students">학생 명단 (한 줄에 한 명, 순서가 번호)</label><textarea class="input" id="init-students" style="min-height:200px" placeholder="김하늘&#10;이도윤&#10;박서연"></textarea></div>' +
      '<div class="form-error" id="init-err"></div><div class="row-actions"><button class="btn btn-play" type="button" data-act="init-class">반 만들기</button></div></section>';
  }

  var VIEWS = {};

  /* 로비 */
  VIEWS.home = function () {
    var list = sorted();
    var played = list.filter(function (p) { return p.wins + p.losses > 0; });
    var stage = played.slice(0, 3).map(function (p, k) {
      var r = GG.getRank(p.points);
      return '<button class="champ champ-' + (k + 1) + '" type="button" data-profile="' + esc(p.id) + '">' + crest(r, k === 0 ? 72 : 52) + avatarFull(p) +
        '<span class="champ-place">' + ['1ST', '2ND', '3RD'][k] + '</span><span class="champ-name">' + esc(p.name) + '</span>' + lp(p.points) + '</button>';
    }).join('');

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var ms = matches();
    var todayCount = ms.filter(function (m) { return m.t >= today.getTime(); }).length;
    var highest = list[0] ? GG.getRank(list[0].points) : null;
    var upsets = ms.filter(function (m) { return m.upset; }).length;
    var counts = GG.TIERS.map(function () { return 0; });
    list.forEach(function (p) { counts[GG.getRank(p.points).tierIndex]++; });

    return demoBanner() +
      '<section class="hero"><div class="hero-copy"><span class="eyebrow">Season ' + SEASON + ' · ' + esc(LEAGUE) + '</span>' +
      '<h1><span class="en gold-text">GONGGI LEGENDS</span>우리 반 최강의<br>공기 장인은 누구인가</h1>' +
      '<p>친구에게 도전하고 승리해 LP를 모으세요. 나보다 높은 티어를 쓰러뜨리면 더 큰 보상이 기다립니다.</p>' +
      '<div class="hero-actions"><a class="btn btn-play" href="#battle">PLAY <span class="ko">대결 시작</span></a><a class="link" href="#rank">전체 랭킹 →</a></div></div>' +
      '<div class="hero-stage">' + (stage || '<div class="champ" style="gap:8px">' + crest(GG.getRank(GG.TIERS[9].min), 130) +
        '<span class="champ-place">Season ' + SEASON + ' Open</span><span class="champ-name" style="font-family:var(--font-title);font-size:20px;max-width:none">첫 승리의 주인공은?</span></div>') + '</div></section>' +

      '<div class="stat-strip"><div><b>' + ms.length + '</b><span>시즌 대결 수</span></div><div><b>' + todayCount + '</b><span>오늘 대결</span></div>' +
      '<div><b>' + upsets + '</b><span>역전승</span></div><div><b style="font-family:var(--font-title);font-size:22px;line-height:1.35">' + (highest ? highest.label : '-') + '</b><span>최고 티어</span></div></div>' +

      '<div class="grid-2"><section class="panel gilded section"><div class="section-head"><h2 class="title-rule">랭킹</h2><a href="#rank">전체 보기 →</a></div>' +
      board(list.slice(0, 8)) + '</section>' +
      '<div class="section"><section class="panel section"><div class="section-head"><h2>최근 대결</h2><a href="#history">기록 →</a></div>' + feed(ms.slice(-5).reverse()) + '</section>' +
      '<section class="panel section"><h2>티어 분포</h2><div class="dist" role="img" aria-label="티어 분포">' + counts.map(function (c, i) {
        return c ? '<span style="flex:' + c + ';background:' + GG.TIERS[i].color + ';box-shadow:0 0 8px ' + GG.TIERS[i].color + '"></span>' : '';
      }).join('') + '</div><div class="dist-legend">' + counts.map(function (c, i) {
        return c ? '<span><i style="background:' + GG.TIERS[i].color + '"></i>' + GG.TIERS[i].name + ' ' + c + '</span>' : '';
      }).join('') + '</div></section></div></div>';
  };

  function boardRow(p, pos) {
    var r = GG.getRank(p.points);
    return '<button class="board-row' + (pos <= 3 ? ' top' : '') + '" type="button" data-profile="' + esc(p.id) + '">' +
      '<span class="board-pos">' + pos + '</span>' +
      '<span class="who">' + headshot(p, 38) + '<span style="min-width:0"><b>' + esc(p.name) + (p.away ? '<span class="away-tag">쉬는 중</span>' : '') + '</b>' +
      '<span class="sub">' + p.wins + '승 ' + p.losses + '패 · 승률 ' + winRate(p) + '% ' + streakPill(p) + '</span></span></span>' +
      '<span class="tier-tag">' + crest(r, 34) + '<span>' + r.label + '</span></span>' + lp(p.points) + '</button>';
  }
  function board(list) {
    if (!list.length) return '<div class="empty">아직 선수가 없어요.</div>';
    return '<div class="board">' + list.map(function (p, i) { return boardRow(p, i + 1); }).join('') + '</div>';
  }

  function feed(list) {
    if (!list.length) return '<p class="muted" style="margin:0">아직 대결 기록이 없어요. 첫 대결의 주인공이 되어 보세요.</p>';
    return '<div class="feed">' + list.map(function (m) {
      var w = byId(m.a), l = byId(m.b);
      if (!w || !l) return '';
      var wr0 = GG.getRank(m.before.a.points), wr1 = GG.getRank(m.after.a);
      var lr0 = GG.getRank(m.before.b.points), lr1 = GG.getRank(m.after.b);
      var tags = '';
      if (m.upset) tags += ' <span class="pill pill-gold">역전승</span>';
      if (wr1.tierIndex > wr0.tierIndex) tags += ' <span class="pill pill-hex">' + esc(w.name) + ' ' + wr1.tier.name + ' 승급</span>';
      else if (wr1.value > wr0.value) tags += ' <span class="pill pill-up">' + esc(w.name) + ' ' + wr1.label + '</span>';
      if (lr1.value < lr0.value) tags += ' <span class="pill pill-down">' + esc(l.name) + ' ' + lr1.label + '</span>';
      return '<div class="feed-row">' + headshot(w, 36) + '<div class="feed-text"><b>' + esc(w.name) + '</b> <span class="muted">승리 vs</span> ' + esc(l.name) + tags +
        '<div class="feed-time">' + ago(m.t) + '</div></div><div style="text-align:right;line-height:1.2"><div class="up">+' + m.gain + '</div><div class="down">−' + m.loss + '</div></div></div>';
    }).join('') + '</div>';
  }

  /* 랭킹 */
  VIEWS.rank = function () {
    var list = sorted(), f = ui.rankFilter;
    var present = {};
    list.forEach(function (p) { present[GG.getRank(p.points).tier.id] = true; });
    var chips = '<button class="chip' + (f === 'all' ? ' on' : '') + '" type="button" data-filter="all">전체</button>' +
      GG.TIERS.filter(function (t) { return present[t.id]; }).map(function (t) {
        return '<button class="chip' + (f === t.id ? ' on' : '') + '" type="button" data-filter="' + t.id + '"><i style="background:' + t.color + '"></i>' + t.name + '</button>';
      }).join('');
    var rows = list.map(function (p, i) {
      return f === 'all' || GG.getRank(p.points).tier.id === f ? boardRow(p, i + 1) : '';
    }).join('');
    return demoBanner() +
      '<div class="page-head"><div><span class="eyebrow">Season ' + SEASON + ' Ranking</span><h1>랭킹</h1><p>LP가 높은 순서예요. 이름을 누르면 전적과 티어를 볼 수 있어요.</p></div><a class="btn btn-play" href="#battle">PLAY</a></div>' +
      '<div class="filter-row">' + chips + '</div><section class="panel gilded tight">' + (rows ? '<div class="board">' + rows + '</div>' : '<div class="empty">이 티어에는 아직 아무도 없어요.</div>') + '</section>';
  };

  /* 대결 */
  VIEWS.battle = function () {
    if (!me && !ui.teacher) {
      return '<div class="page-head"><div><span class="eyebrow">Match Lobby</span><h1>대결</h1></div></div>' +
        '<section class="panel gilded empty"><h2>먼저 로그인해 주세요</h2><p style="margin:0">내 이름을 고르고 해바라기 체크리스트와 같은 비밀번호를 넣으면 이 크롬북에서 계속 로그인돼 있어요.</p>' +
        '<button class="btn btn-gold" type="button" data-act="login">로그인</button><p style="margin:0;font-size:13px">한 화면에서 여러 명이 기록하려면 선생님 메뉴를 열어 주세요.</p></section>';
    }
    if (personal()) { ui.a = me; if (ui.b === me) ui.b = null; }
    var a = ui.a && byId(ui.a), b = ui.b && byId(ui.b);
    var pv = a && b ? GG.preview(a, b, settings()) : null;

    function side(p, key, cls, label) {
      var head = '<span class="side-label">' + label + '</span>';
      if (!p) {
        return '<div class="side ' + cls + '">' + head + '<div class="side-empty"><div class="empty-slot">?</div>' +
          '<button class="btn" type="button" data-pickside="' + key + '">' + (personal() ? '상대 고르기' : '선수 선택') + '</button>' +
          (key === 'b' && a ? '<span style="font-size:13px">아래 추천 상대를 눌러도 돼요</span>' : '') + '</div></div>';
      }
      var r = GG.getRank(p.points), mine = pv ? pv[key] : null;
      var fixed = personal() && key === 'a';
      return '<div class="side ' + cls + '">' + head +
        '<div class="side-glow" style="background:radial-gradient(circle,' + r.tier.color + '66,transparent 65%)"></div>' +
        avatarFull(p) + '<div class="side-name">' + esc(p.name) + '</div>' +
        '<div class="tier-tag">' + crest(r, 40) + '<span>' + r.label + '</span></div>' +
        '<div>' + lp(p.points) + ' ' + streakPill(p) + '</div>' +
        (mine ? '<div class="stakes"><span class="stake up">승리 +' + mine.win + '</span><span class="stake down">패배 −' + mine.lose + '</span></div>' : '') +
        (fixed ? '<span class="pill pill-hex">나</span>' : '<button class="btn btn-sm btn-ghost" type="button" data-pickside="' + key + '">' + (personal() ? '상대 바꾸기' : '선수 바꾸기') + '</button>') + '</div>';
    }

    var html = '<div class="page-head"><div><span class="eyebrow">Match Lobby</span><h1>대결</h1><p>' + (personal()
        ? '상대를 고르고 공기 대결을 펼치세요. 이겼으면 "내가 이겼어요"를 누르고, 진 친구가 자기 크롬북에서 확인하면 기록돼요.'
        : '선생님 모드 · 한 화면에서 두 선수를 고르고, 이긴 쪽을 누르면 진 친구가 비밀번호로 확인해요.') + '</p></div>' +
      (personal() ? '</div>' : '<button class="btn" type="button" data-act="make-pairs">오늘의 대진표</button></div>');
    if (ui.pairs && !personal()) html += pairsView();
    html += '<div class="arena">' + side(a, 'a', 'blue', personal() ? 'ME' : 'BLUE') +
      '<div class="vs"><div class="vs-text">VS</div>' + (!personal() && (a || b) ? '<button class="btn btn-sm" type="button" data-act="swap" aria-label="양쪽 바꾸기">⇄</button>' : '') + '</div>' +
      side(b, 'b', 'red', 'RED') + '</div>';

    if (pv) {
      var ca = Math.round(pv.a.chance * 100);
      html += '<section class="panel gilded section"><div class="odds"><div class="odds-bar"><span style="flex:' + ca + '"></span><span style="flex:' + (100 - ca) + '"></span></div>' +
        '<div class="odds-label"><span>' + esc(a.name) + ' 예상 승률 <b class="num">' + ca + '%</b></span><span><b class="num">' + (100 - ca) + '%</b> ' + esc(b.name) + '</span></div></div>' +
        '<p class="muted" style="margin:0">' + matchHint(a, b, pv) + '</p>' +
        '<h3 style="text-align:center;letter-spacing:.1em;color:var(--gold)">' + (personal() ? '대결 결과는?' : '누가 이겼나요?') + '</h3>' +
        (personal()
          ? '<div class="decide"><button class="btn btn-side blue" type="button" data-act="report-win">내가 이겼어요</button>' +
            '<button class="btn btn-side red" type="button" data-act="report-loss">내가 졌어요</button></div>' +
            '<p class="muted" style="margin:0;font-size:13px;text-align:center">이긴 쪽이 누르면 진 친구 크롬북에 확인 요청이 가요. 진 쪽이 "내가 졌어요"를 누르면 바로 기록돼요. 한 판은 한 번만 기록돼요.</p>'
          : '<div class="decide"><button class="btn btn-side blue" type="button" data-win="a">' + esc(a.name) + ' 승리</button>' +
            '<button class="btn btn-side red" type="button" data-win="b">' + esc(b.name) + ' 승리</button></div>') + '</section>';
    }
    html += a ? recommendView(a) : '<section class="panel section"><h2>상대 추천</h2><p class="muted" style="margin:0">BLUE 선수를 먼저 고르면 딱 맞는 상대를 추천해 드려요.</p></section>';
    return html;
  };

  function matchHint(a, b, pv) {
    if (Math.abs(a.points - b.points) < 40) return '팽팽한 실력의 대결. 승부는 한 판으로 갈립니다.';
    var low = a.points < b.points ? a : b, high = low === a ? b : a;
    var lowWin = low === a ? pv.a.win : pv.b.win, highLose = low === a ? pv.b.lose : pv.a.lose;
    return esc(low.name) + '이(가) 이기면 <b class="up">+' + lowWin + ' LP</b> 대역전. ' + esc(high.name) + '은(는) 지면 <b class="down">−' + highLose + ' LP</b>를 잃어요.';
  }

  function recommendView(a) {
    var rec = GG.recommend(a, players(), matches(), settings());
    function item(c) {
      var r = GG.getRank(c.student.points);
      return '<button class="rec-item" type="button" data-opp="' + esc(c.student.id) + '">' + headshot(c.student, 40) +
        '<span style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.student.name) + '</b>' +
        '<span class="muted" style="font-size:12px">' + r.label + ' · ' + (c.met ? c.met + '번 대결' : '첫 대결') + '</span></span>' +
        '<span class="rec-gain"><span class="up">+' + c.preview.a.win + '</span><br><span class="down">−' + c.preview.a.lose + '</span></span></button>';
    }
    function group(title, desc, list, emptyText) {
      return '<div class="rec-group"><h3>' + title + '</h3><p>' + desc + '</p>' + (list.length ? list.map(item).join('') : '<div class="rec-empty">' + emptyText + '</div>') + '</div>';
    }
    return '<section class="panel section"><div class="section-head"><h2>' + esc(a.name) + '의 추천 상대</h2></div><div class="rec-groups">' +
      group('호적수', '점수가 가깝고 최근에 붙지 않은 친구', rec.close, '추천할 친구가 없어요') +
      group('도전', '조금 높은 티어. 이기면 큰 보상', rec.challenge, '이미 정상에 있어요') +
      group('첫 만남', '아직 한 번도 겨루지 않은 친구', rec.fresh, '더 추천할 친구가 없어요') + '</div></section>';
  }

  function pairsView() {
    var p = ui.pairs;
    return '<section class="panel gilded section"><div class="section-head"><h2>오늘의 대진표</h2><div style="display:flex;gap:8px">' +
      '<button class="btn btn-sm" type="button" data-act="make-pairs">다시 섞기</button><button class="btn btn-sm btn-ghost" type="button" data-act="close-pairs">닫기</button></div></div>' +
      '<p class="muted" style="margin:0;font-size:14px">실력이 비슷한 친구끼리, 최근에 붙은 상대는 피해서 짝을 지었어요.</p><div class="pairs">' +
      p.pairs.map(function (pair, i) {
        var x = byId(pair[0]), y = byId(pair[1]);
        if (!x || !y) return '';
        return '<div class="pair' + (p.done[i] ? ' done' : '') + '"><div class="p">' + headshot(x, 30) + '<span>' + esc(x.name) + '</span></div><span class="pv">VS</span>' +
          '<div class="p">' + headshot(y, 30) + '<span>' + esc(y.name) + '</span></div><div class="pair-foot">' +
          (p.done[i] ? '<span class="pill">완료</span>' : '<button class="btn btn-sm" type="button" data-pair="' + i + '">이 대결 시작</button>') + '</div></div>';
      }).join('') + '</div>' +
      (p.rest && byId(p.rest) ? '<p class="muted" style="margin:0;font-size:14px">' + esc(byId(p.rest).name) + '은(는) 이번 판은 쉬어요. 다시 섞으면 먼저 들어가요.</p>' : '') + '</section>';
  }

  /* 기록 — 모두가 보는 전체 경기 기록과 전적표. 선생님은 고치거나 지울 수 있다 */
  VIEWS.history = function () {
    var f = ui.histFilter || 'all';
    var all = matches().slice().reverse();
    var ms = f === 'all' ? all : all.filter(function (m) { return m.a === f || m.b === f; });
    var opts = '<option value="all">모든 경기</option>' + players().map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (f === p.id ? ' selected' : '') + '>' + p.no + '. ' + esc(p.name) + '</option>';
    }).join('');
    var rows = ms.map(function (m) {
      var w = byId(m.a), l = byId(m.b);
      if (!w || !l) return '';
      var dt = new Date(m.t);
      var when = (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
      var tags = (m.upset ? ' <span class="pill pill-gold">역전승</span>' : '') + (m.bonus ? ' <span class="pill pill-up">연승 +' + m.bonus + '</span>' : '') +
        (m.shield ? ' <span class="pill">연패 보호</span>' : '') + (m.edited ? ' <span class="pill">수정됨</span>' : '');
      return '<tr><td class="num muted">' + when + '</td>' +
        '<td><span class="who">' + headshot(w, 28) + '<b>' + esc(w.name) + '</b></span></td><td class="up">승 +' + m.gain + '</td>' +
        '<td><span class="who">' + headshot(l, 28) + '<b>' + esc(l.name) + '</b></span></td><td class="down">패 −' + m.loss + '</td><td>' + tags + '</td>' +
        (ui.teacher ? '<td><button class="btn btn-sm" type="button" data-act="edit-match" data-id="' + esc(m.id) + '">수정</button> <button class="btn btn-sm btn-danger" type="button" data-act="del-match" data-id="' + esc(m.id) + '">삭제</button></td>' : '') + '</tr>';
    }).join('');
    var table = sorted().map(function (p, i) {
      return '<tr data-hist="' + esc(p.id) + '" style="cursor:pointer"><td class="board-pos" style="font-size:16px">' + (i + 1) + '</td><td><span class="who">' + headshot(p, 28) + '<b>' + esc(p.name) + '</b></span></td>' +
        '<td class="num">' + (p.wins + p.losses) + '</td><td class="num up">' + p.wins + '</td><td class="num down">' + p.losses + '</td><td class="num">' + winRate(p) + '%</td><td class="num">' + (p.bestStreak || 0) + '</td><td>' + GG.getRank(p.points).label + '</td></tr>';
    }).join('');
    return '<div class="page-head"><div><span class="eyebrow">Match History</span><h1>경기 기록</h1><p>지금까지 모든 경기와 승패예요. 누구나 볼 수 있어요.' +
      (ui.teacher ? ' <b class="gold-text">선생님 모드</b> · 기록을 고치거나 지우면 모든 LP가 다시 계산돼요.' : ' 잘못된 기록은 선생님께 말해 주세요.') + '</p></div>' +
      (ui.teacher ? '' : '<button class="btn btn-ghost" type="button" data-act="teacher-edit">선생님 수정 모드</button>') + '</div>' +
      '<section class="panel gilded section"><h2>전적표</h2><div class="table-wrap"><table><thead><tr><th>순위</th><th>이름</th><th>경기</th><th>승</th><th>패</th><th>승률</th><th>최고 연승</th><th>티어</th></tr></thead><tbody>' + table + '</tbody></table></div></section>' +
      '<section class="panel section"><div class="section-head"><h2>경기 목록 <span class="muted num" style="font-size:15px">' + ms.length + '판</span></h2>' +
      '<select class="input" id="hist-filter" style="width:auto" aria-label="친구별로 보기">' + opts + '</select></div>' +
      (rows ? '<div class="table-wrap"><table><thead><tr><th>시간</th><th>승자</th><th></th><th>패자</th><th></th><th></th>' + (ui.teacher ? '<th>관리</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div class="empty">아직 경기 기록이 없어요.</div>') + '</section>' +
      adjustHistory(f);
  };

  function adjustHistory(f) {
    var list = adjusts().slice().reverse().filter(function (j) { return f === 'all' || j.p === f; });
    if (!list.length) return '';
    return '<section class="panel section"><h2>선생님이 준 LP <span class="muted num" style="font-size:15px">' + list.length + '건</span></h2><div class="feed">' + list.map(function (j) {
      var p = byId(j.p);
      return '<div class="feed-row">' + (p ? headshot(p, 30) : '<span></span>') + '<div class="feed-text"><b>' + esc(j.p) + '</b>' + (j.note ? ' <span class="muted">· ' + esc(j.note) + '</span>' : '') +
        '<div class="feed-time">' + ago(j.t) + '</div></div><span class="' + (j.d > 0 ? 'up' : 'down') + '">' + (j.d > 0 ? '+' : '−') + Math.abs(j.d) + '</span></div>';
    }).join('') + '</div></section>';
  }

  function openEditMatch(id) {
    var m = matchById(id);
    if (!m) return;
    var opt = function (sel) { return players().map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + p.no + '. ' + esc(p.name) + '</option>'; }).join(''); };
    var dt = new Date(m.t - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    openLayer('<div class="modal modal-sm" role="dialog" aria-modal="true" aria-label="경기 수정"><span class="eyebrow">Edit Match</span><h2>경기 기록 수정</h2>' +
      '<div class="form-row"><label for="em-w">이긴 사람</label><select class="input" id="em-w">' + opt(m.a) + '</select></div>' +
      '<div class="row-actions" style="justify-content:center"><button class="btn btn-sm" type="button" data-act="em-swap">⇅ 승패 바꾸기</button></div>' +
      '<div class="form-row"><label for="em-l">진 사람</label><select class="input" id="em-l">' + opt(m.b) + '</select></div>' +
      '<div class="form-row"><label for="em-t">경기 시간</label><input class="input" id="em-t" type="datetime-local" value="' + dt + '"></div>' +
      '<div class="form-error" id="em-err"></div><div class="row-actions"><button class="btn btn-ghost" type="button" data-act="close">취소</button><button class="btn btn-gold" type="button" data-act="em-save" data-id="' + esc(id) + '">저장</button></div></div>');
  }

  /* 티어 안내 */
  VIEWS.tiers = function () {
    var counts = {};
    players().forEach(function (p) { var id = GG.getRank(p.points).tier.id; counts[id] = (counts[id] || 0) + 1; });
    var items = GG.TIERS.slice().reverse().map(function (t) {
      var idx = GG.TIERS.indexOf(t), next = GG.TIERS[idx + 1];
      var rank = GG.getRank(t.min + (t.divs ? GG.DIV_SIZE * 3 : 0));
      return '<div class="panel ladder-item">' + crest(rank, 92) + '<div class="rank-en">' + t.en + '</div><div class="rank-name" style="color:' + t.light + '">' + t.name + '</div>' +
        '<div class="range">' + (next ? t.min + ' – ' + (next.min - 1) : t.min + '+') + ' LP</div><div class="count">' + (t.divs ? 'IV · III · II · I' : '단계 없음') + ' · ' + (counts[t.id] || 0) + '명</div></div>';
    }).join('');
    var s = settings();
    var ex = [['같은 티어 (실버)', 450, 450], ['같은 티어 (다이아)', 1250, 1250], ['한 티어 아래가 승리', 400, 600], ['두 티어 아래가 승리', 300, 700], ['한 티어 위가 승리', 600, 400]].map(function (e) {
      var r = GG.calcMatch(e[1], e[2], 0, s);
      return '<tr><td>' + e[0] + '<div class="muted" style="font-size:12px">' + GG.getRank(e[1]).label + ' vs ' + GG.getRank(e[2]).label + '</div></td><td class="up">+' + r.gain + '</td><td class="down">−' + r.loss + '</td></tr>';
    }).join('');
    var per = GG.TIERS.map(function (t, i) {
      var p = t.min + 20, r = GG.calcMatch(p, p, 0, s);
      return '<tr><td><span class="tier-tag">' + crest(GG.getRank(p), 26) + '<span>' + t.name + '</span></span></td><td class="up">+' + r.gain + '</td><td class="down">−' + r.loss + '</td></tr>';
    }).join('');
    return '<div class="page-head"><div><span class="eyebrow">Ranked Tiers</span><h1>티어</h1><p>아이언부터 챌린저까지 10개 티어. 다이아몬드까지는 티어마다 IV → I 네 단계가 있어요. 위로 갈수록 오르기 어려운 피라미드예요.</p></div></div>' +
      '<div class="ladder">' + items + '</div>' +
      '<div class="grid-2"><section class="panel gilded section rules"><h2>LP 규칙</h2>' +
      '<p>시즌 시작 시 모두 <b>' + GG.getRank(s.startPoints).label + '</b>(' + s.startPoints + ' LP)에서 출발해요.</p>' +
      '<p><b>피라미드:</b> 낮은 티어에서는 이기면 크게 오르고 져도 조금만 내려가요. 높은 티어로 갈수록 이겨도 조금 오르고 지면 많이 내려가요. 그래서 위로 갈수록 사람이 적어요.</p>' +
      '<p><b>티어 차이:</b> 나보다 높은 티어를 이기면 훨씬 많이 얻고, 낮은 티어를 이기면 조금만 얻어요. 높은 티어가 낮은 티어에게 지면 크게 잃어요.</p>' +
      (s.streakBonus ? '<p><b>연승 보너스:</b> 3연승 +3, 4연승 +5, 5연승부터 +8.</p>' : '') +
      (s.lossShield ? '<p><b>연패 보호:</b> 3연패부터는 잃는 LP가 절반이에요.</p>' : '') +
      '<p>결과는 <b>진 친구가 확인</b>해야 기록돼요. LP는 0 아래로 내려가지 않아요.</p></section>' +
      '<section class="panel section"><h2>티어별 LP (비슷한 상대)</h2><div class="table-wrap"><table class="example-table"><thead><tr><th>티어</th><th>이기면</th><th>지면</th></tr></thead><tbody>' + per + '</tbody></table></div>' +
      '<h2>티어 차이가 나면</h2><div class="table-wrap"><table class="example-table"><thead><tr><th>대결</th><th>승자</th><th>패자</th></tr></thead><tbody>' + ex + '</tbody></table></div></section></div>';
  };

  /* 선생님 */
  VIEWS.settings = function () {
    if (!ui.teacher) {
      return '<div class="page-head"><div><span class="eyebrow">Teacher Console</span><h1>선생님 메뉴</h1><p>LP 규칙, 쉬는 학생, 새 시즌을 관리해요.</p></div></div>' +
        '<section class="panel gilded pin-wrap" style="max-width:420px;margin:0 auto;width:100%"><h2>선생님 비밀번호</h2>' +
        (LIVE && !TEACHER_PW ? '<p class="form-error">js/config.js에 선생님 비밀번호(TEACHER_PASSWORD)를 넣어 주세요.</p>' : '') +
        '<input class="pin-input" id="teacher-pin" type="password" maxlength="20" autocomplete="off" aria-label="선생님 비밀번호">' +
        '<div class="form-error" id="teacher-err"></div><button class="btn btn-gold" type="button" data-act="teacher-login">열기</button></section>';
    }
    var s = settings();
    var list = players().slice().sort(function (a, b) { return a.no - b.no; });
    return '<div class="page-head"><div><span class="eyebrow">Teacher Console</span><h1>선생님 메뉴</h1><p>' +
      (LIVE ? '해바라기 체크리스트와 연결됨 · 학생 ' + ROSTER.length + '명 · 비밀번호 공유' : SHEET ? '구글 시트와 연결됨 · 학생 ' + ROSTER.length + '명 · 기록은 선생님 시트에 저장돼요' : '체험 모드 · 이 브라우저에만 저장돼요') + '</p></div>' +
      '<button class="btn btn-ghost" type="button" data-act="teacher-logout">잠그기</button></div>' +
      '<div class="grid-2"><section class="panel section"><h2>선수 명단</h2><p class="muted" style="margin:0;font-size:14px">' +
      (LIVE ? '명단은 체크리스트와 같아요. 바꾸려면 js/config.js의 STUDENTS를 고쳐 주세요.' : SHEET ? '아래 \'학생 명단 고치기\'에서 바꿀 수 있어요.' : '체험용 예시 명단이에요.') + ' <b>추천에 자주</b>를 켠 친구는 다른 아이들 추천 상대에 더 자주 나와요(아이들 화면에는 표시되지 않아요). 결석한 친구는 쉬는 중으로 두면 추천과 대진표에서 빠져요.</p>' +
      '<div class="feed">' + list.map(function (p) {
        var r = GG.getRank(p.points);
        return '<div class="feed-row">' + headshot(p, 34) + '<div class="feed-text"><b>' + p.no + '. ' + esc(p.name) + '</b><div class="feed-time">' + r.label + ' · ' + p.points + ' LP · ' + p.wins + '승 ' + p.losses + '패</div></div>' +
          '<label class="check" style="font-size:13px"><input type="checkbox" data-boost="' + esc(p.id) + '"' + ((settings().boost || []).indexOf(p.id) !== -1 ? ' checked' : '') + '> 추천에 자주</label>' +
          '<label class="check" style="font-size:13px"><input type="checkbox" data-away="' + esc(p.id) + '"' + (p.away ? ' checked' : '') + '> 쉬는 중</label></div>';
      }).join('') + '</div></section>' +
      '<div class="section"><section class="panel gilded section"><h2>LP 규칙</h2>' +
      '<div class="form-row"><label for="set-base">기준 LP (골드끼리 대결할 때 오르내리는 LP)</label><input class="input" id="set-base" type="number" min="10" max="60" value="' + (s.baseLP || 25) + '"></div>' +
      '<p class="muted" style="margin:0;font-size:13px">티어마다 이 값에 배율이 곱해져요. 낮은 티어는 많이 얻고 적게 잃고, 높은 티어는 적게 얻고 많이 잃어요. 바꾸면 지난 경기까지 모두 다시 계산돼요.</p>' +
      '<label class="check"><input type="checkbox" id="set-shield"' + (s.lossShield ? ' checked' : '') + '> 연패 보호 (3연패부터 잃는 LP 절반)</label>' +
      '<div class="form-row"><label for="set-start">시즌 시작 LP</label><select class="input" id="set-start">' +
      [0, 200, 400, 600].map(function (v) { return '<option value="' + v + '"' + (s.startPoints === v ? ' selected' : '') + '>' + v + ' LP (' + GG.getRank(v).label + ')</option>'; }).join('') + '</select></div>' +
      '<label class="check"><input type="checkbox" id="set-streak"' + (s.streakBonus ? ' checked' : '') + '> 연승 보너스</label>' +
      '<div class="row-actions"><button class="btn btn-gold" type="button" data-act="save-settings">규칙 저장</button></div>' +
      '</section>' +
      adjustPanel() +
      (SHEET ? '<section class="panel section"><h2>학생 명단 고치기</h2><p class="muted" style="margin:0;font-size:14px">한 줄에 한 명. 순서가 출석번호가 돼요. 이름을 바꾸면 그 학생의 지난 기록은 새 이름과 이어지지 않으니 주의해 주세요.</p>' +
        '<div class="form-row"><label for="roster-league">반 이름</label><input class="input" id="roster-league" value="' + esc(LEAGUE) + '"></div>' +
        '<textarea class="input" id="roster-text" style="min-height:160px" aria-label="학생 명단">' + esc(ROSTER.map(function (st) { return st.name; }).join('\n')) + '</textarea>' +
        '<div class="row-actions"><button class="btn btn-gold" type="button" data-act="save-roster">명단 저장</button></div>' +
        '<h3>학생 비밀번호 초기화</h3><p class="muted" style="margin:0;font-size:13px">비밀번호를 잊은 학생을 고르면, 다음 로그인 때 새로 만들어요.</p>' +
        '<div class="row-actions" style="justify-content:flex-start"><select class="input" id="pin-reset-who" style="width:auto">' + ROSTER.map(function (st) { return '<option>' + esc(st.name) + '</option>'; }).join('') + '</select>' +
        '<button class="btn btn-danger" type="button" data-act="reset-pin">초기화</button></div></section>' : '') +
      '<section class="panel gilded section"><h2>링크 나눠주기</h2><p class="muted" style="margin:0;font-size:14px">아이들이 크롬북으로 이 주소에 들어오면 돼요. 클래스룸에 올리거나 QR 코드를 화면에 띄워 주세요.</p>' +
      '<input class="input" id="share-url" readonly value="' + esc(CLASS_LINK) + '" aria-label="앱 주소">' +
      '<div class="row-actions" style="justify-content:flex-start"><button class="btn" type="button" data-act="copy-url">주소 복사</button><button class="btn" type="button" data-act="show-qr">QR 코드 크게 보기</button></div></section>' +
      '<section class="panel section"><h2>백업</h2><p class="muted" style="margin:0;font-size:14px">지금 점수와 기록을 글자로 복사해 보관해요.</p>' +
      '<div class="row-actions" style="justify-content:flex-start"><button class="btn" type="button" data-act="copy-backup">백업 코드 복사</button></div>' +
      '<textarea class="input" id="backup-text" style="min-height:60px" readonly aria-label="백업 코드"></textarea></section>' +
      '<section class="panel section"><h2>새 시즌</h2><p class="muted" style="margin:0;font-size:14px">캐릭터는 그대로 두고 모든 LP와 대결 기록을 지워요.</p>' +
      '<div class="row-actions" style="justify-content:flex-start"><button class="btn btn-danger" type="button" data-act="reset-season">시즌 초기화</button>' +
      (!LIVE ? '<button class="btn btn-ghost" type="button" data-act="reset-demo">예시 다시 채우기</button>' : '') + '</div></section></div></div>';
  };

  /* 선생님이 LP를 직접 더하거나 빼기 */
  function adjustPanel() {
    var picks = ui.adjPick || {};
    var list = players().slice().sort(function (a, b) { return a.no - b.no; });
    var recent = adjusts().slice().reverse().slice(0, 15);
    return '<section class="panel gilded section" id="adjust"><h2>LP 직접 주기·빼기</h2>' +
      '<p class="muted" style="margin:0;font-size:14px">칭찬이나 벌점으로 LP를 바로 더하거나 빼요. 승패 기록과 연승에는 영향이 없고, 기록 탭에 사유와 함께 남아요.</p>' +
      '<div class="adj-pick">' + list.map(function (p) {
        return '<label class="adj-who' + (picks[p.id] ? ' on' : '') + '"><input type="checkbox" data-adjpick="' + esc(p.id) + '"' + (picks[p.id] ? ' checked' : '') + '>' + headshot(p, 26) + '<span>' + esc(p.name) + '</span></label>';
      }).join('') + '</div>' +
      '<div class="row-actions" style="justify-content:flex-start"><button class="btn btn-sm btn-ghost" type="button" data-act="adj-all">모두 고르기</button><button class="btn btn-sm btn-ghost" type="button" data-act="adj-none">모두 빼기</button></div>' +
      '<div class="adj-row"><div class="form-row"><label for="adj-d">LP</label><input class="input" id="adj-d" type="number" step="1" value="' + (ui.adjD || 10) + '"></div>' +
      '<div class="form-row" style="flex:1"><label for="adj-note">사유 (아이들에게 보여요)</label><input class="input" id="adj-note" maxlength="40" placeholder="예: 친구를 도와줌" value="' + esc(ui.adjNote || '') + '"></div></div>' +
      '<div class="row-actions" style="justify-content:flex-start">' + [5, 10, 20, -5, -10].map(function (n) {
        return '<button class="btn btn-sm' + (n < 0 ? ' btn-danger' : '') + '" type="button" data-adjquick="' + n + '">' + (n > 0 ? '+' : '−') + Math.abs(n) + '</button>';
      }).join('') + '<button class="btn btn-gold" type="button" data-act="adj-apply">적용</button></div>' +
      (recent.length ? '<h3>최근 조정</h3><div class="feed">' + recent.map(function (j) {
        var p = byId(j.p);
        return '<div class="feed-row">' + (p ? headshot(p, 30) : '<span></span>') + '<div class="feed-text"><b>' + esc(j.p) + '</b> <span class="' + (j.d > 0 ? 'up' : 'down') + '">' + (j.d > 0 ? '+' : '−') + Math.abs(j.d) + ' LP</span>' +
          (j.note ? ' <span class="muted">· ' + esc(j.note) + '</span>' : '') + '<div class="feed-time">' + ago(j.t) + '</div></div>' +
          '<button class="btn btn-sm btn-ghost" type="button" data-act="adj-del" data-id="' + esc(j.id) + '">취소</button></div>';
      }).join('') + '</div>' : '') + '</section>';
  }
  function applyAdjust(ids, d, note) {
    if (!ids.length) { toast('학생을 먼저 골라 주세요', true); return; }
    if (!d) { toast('LP를 넣어 주세요', true); return; }
    if (Math.abs(d) > 1000) { toast('LP는 -1000 ~ 1000 사이로 넣어 주세요', true); return; }
    ui.busy = true;
    var jobs = ids.reduce(function (p, id) { return p.then(function () { return store.addAdjust(id, d, note); }); }, Promise.resolve());
    jobs.then(function () {
      ui.busy = false; ui.adjPick = {};
      toast((ids.length === 1 ? ids[0] : ids.length + '명') + '에게 ' + (d > 0 ? '+' : '−') + Math.abs(d) + ' LP' + (note ? ' (' + note + ')' : ''));
      render();
    }, fail);
  }
  function readAdjustForm() {
    ui.adjD = parseInt(document.getElementById('adj-d').value, 10) || 0;
    ui.adjNote = document.getElementById('adj-note').value.trim();
  }

  /* ───────── 창 ───────── */
  function closeLayer() { layer.innerHTML = ''; }
  function openLayer(html) { layer.innerHTML = '<div class="overlay" data-backdrop>' + html + '</div>'; }

  function openPicker(sideKey) {
    var login = sideKey === 'login';
    var other = login ? null : sideKey === 'a' ? ui.b : ui.a;
    var list = login ? players().slice() : sorted();
    openLayer('<div class="modal modal-wide" role="dialog" aria-modal="true" aria-label="' + (login ? '내 이름 고르기' : '선수 선택') + '"><div class="modal-head"><div><span class="eyebrow">' + (login ? 'Sign In' : sideKey === 'a' ? 'Blue Side' : 'Red Side') + '</span><h2>' + (login ? '내 이름을 골라요' : '선수 선택') + '</h2></div>' +
      '<button class="icon-btn" type="button" data-act="close" aria-label="닫기">✕</button></div><div class="roster">' +
      list.map(function (p, i) {
        var r = GG.getRank(p.points), off = !login && (p.id === other || p.away);
        return '<button class="card" type="button" data-choose="' + esc(p.id) + '" data-side="' + sideKey + '"' + (off ? ' disabled' : '') + '>' +
          '<div class="card-stage" style="background:' + tierGlow(r) + '"><span class="card-pos">' + (login ? p.no : i + 1) + '</span>' + crest(r, 34) + avatarFull(p) + '</div>' +
          '<span class="card-name">' + esc(p.name) + '</span><span class="card-tier">' + (p.away ? '쉬는 중' : r.label) + '</span></button>';
      }).join('') + '</div></div>');
  }

  function openProfile(id) {
    var p = byId(id);
    if (!p) return;
    var r = GG.getRank(p.points), peak = GG.getRank(p.peak || p.points);
    var mine = matches().filter(function (m) { return m.a === id || m.b === id; }).slice(-8).reverse();
    var recent = mine.length ? '<div class="feed">' + mine.map(function (m) {
      var won = m.a === id, o = byId(won ? m.b : m.a);
      return '<div class="feed-row">' + (o ? headshot(o, 30) : '<span></span>') + '<div class="feed-text"><b class="' + (won ? 'up' : 'down') + '">' + (won ? '승리' : '패배') + '</b> vs ' + (o ? esc(o.name) : '-') +
        '<div class="feed-time">' + ago(m.t) + '</div></div><span class="' + (won ? 'up' : 'down') + '">' + (won ? '+' + m.gain : '−' + m.loss) + '</span></div>';
    }).join('') + '</div>' : '<p class="muted" style="margin:0">아직 대결 기록이 없어요.</p>';
    openLayer('<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(p.name) + ' 프로필">' +
      '<div class="modal-head"><span class="eyebrow">Rank #' + placeOf(p) + '</span><button class="icon-btn" type="button" data-act="close" aria-label="닫기">✕</button></div>' +
      '<div class="profile-top"><div class="profile-stage" style="background:' + tierGlow(r) + '">' + avatarFull(p) + '</div>' +
      '<div class="section" style="gap:10px"><h1>' + esc(p.name) + '</h1><div class="profile-rank">' + crest(r, 74) +
      '<div><div class="rank-en">' + r.tier.en + '</div><div class="rank-name" style="color:' + r.tier.light + '">' + r.label + '</div>' + lp(p.points) + '</div></div>' +
      lpBar(r) + '<div class="muted" style="font-size:13px">' + nextStepText(r) + '</div></div></div>' +
      '<div class="stats"><div class="stat"><b>' + p.wins + '</b><span>승리</span></div><div class="stat"><b>' + p.losses + '</b><span>패배</span></div>' +
      '<div class="stat"><b>' + winRate(p) + '%</b><span>승률</span></div><div class="stat"><b>' + (p.bestStreak || 0) + '</b><span>최고 연승</span></div></div>' +
      '<div class="muted" style="font-size:13px">시즌 최고: ' + peak.label + ' (' + (p.peak || p.points) + ' LP)</div>' +
      '<div class="row-actions" style="justify-content:flex-start"><button class="btn btn-play" type="button" data-act="battle-with" data-id="' + esc(id) + '">PLAY <span class="ko">이 선수로 대결</span></button>' +
      '<button class="btn" type="button" data-act="customize" data-id="' + esc(id) + '">캐릭터 꾸미기</button></div>' +
      (ui.teacher ? '<div class="row-actions" style="justify-content:flex-start;align-items:center"><span class="label">선생님 LP</span>' + [10, 5, -5, -10].map(function (n) {
        return '<button class="btn btn-sm' + (n < 0 ? ' btn-danger' : '') + '" type="button" data-adjone="' + esc(id) + '" data-adjv="' + n + '">' + (n > 0 ? '+' : '−') + Math.abs(n) + '</button>';
      }).join('') + '</div>' : '') +
      '<h3>최근 대결</h3>' + recent + '</div>');
  }

  /* 캐릭터 꾸미기 — 시즌 최고 티어로 아이템이 열린다 */
  var wardrobe = null; // { id, draft, tab, tier }
  function openCustomize(id) {
    var p = byId(id);
    wardrobe = { id: id, draft: Object.assign({}, p.look), tab: wardrobe && wardrobe.id === id ? wardrobe.tab : 'body', tier: GG.getRank(Math.max(p.peak || 0, p.points)).tierIndex };
    drawWardrobe();
  }
  function drawWardrobe() {
    var w = wardrobe, p = byId(w.id), tab = null;
    AV.TABS.forEach(function (t) { if (t.id === w.tab) tab = t; });
    var tabs = AV.TABS.map(function (t) {
      return '<button class="wd-tab' + (t.id === w.tab ? ' on' : '') + '" type="button" data-wtab="' + t.id + '">' + t.label + '</button>';
    }).join('');
    var rows = tab.rows.map(function (row) {
      var body;
      if (row.colors) {
        body = '<div class="swatches">' + row.colors.map(function (c) {
          return '<button class="swatch' + (w.draft[row.key] === c ? ' on' : '') + '" type="button" data-wear="' + row.key + '" data-val="' + c + '" style="background:' + c + '" aria-label="' + row.label + ' ' + c + '"></button>';
        }).join('') + '</div>';
      } else {
        body = '<div class="wd-items">' + row.items.map(function (it) {
          var locked = it.unlock && it.unlock > w.tier;
          var look = Object.assign({}, w.draft); look[row.key] = it.id;
          var pic = AV.render(look, { mode: row.view === 'head' ? 'head' : 'full', size: 54, no: p.no });
          var lockTier = locked ? GG.TIERS[it.unlock] : null;
          return '<button class="wd-item' + (w.draft[row.key] === it.id ? ' on' : '') + (locked ? ' locked' : '') + '" type="button" data-wear="' + row.key + '" data-val="' + it.id + '"' +
            (locked ? ' aria-disabled="true" title="' + lockTier.name + ' 달성 시 열려요"' : '') + '>' +
            '<span class="wd-pic">' + pic + (locked ? '<span class="wd-lock">' + crest(GG.getRank(lockTier.min), 26) + '</span>' : '') + '</span>' +
            '<span class="wd-name">' + it.name + '</span>' + (locked ? '<span class="wd-req" style="color:' + lockTier.light + '">' + lockTier.name + '</span>' : '') + '</button>';
        }).join('') + '</div>';
      }
      return '<div class="form-row"><span class="label">' + row.label + '</span>' + body + '</div>';
    }).join('');
    var r = GG.getRank(p.points);
    var html = ('<div class="modal modal-wide wardrobe" role="dialog" aria-modal="true" aria-label="캐릭터 꾸미기">' +
      '<div class="modal-head"><div><span class="eyebrow">Wardrobe</span><h2>' + esc(p.name) + ' 꾸미기</h2></div><button class="icon-btn" type="button" data-act="close" aria-label="닫기">✕</button></div>' +
      '<div class="wd-grid"><div class="wd-side"><div class="profile-stage wd-stage" style="background:' + tierGlow(r) + '">' + AV.render(w.draft, { no: p.no }) + '</div>' +
      '<p class="muted" style="margin:0;font-size:13px">자물쇠 아이템은 그 티어에 오르면 열려요. 시즌 최고 기록 기준이라 내려가도 사라지지 않아요.</p>' +
      '<div class="row-actions" style="justify-content:flex-start"><button class="btn btn-sm" type="button" data-act="wd-random">무작위</button><button class="btn btn-sm btn-ghost" type="button" data-act="wd-reset">처음 모습</button></div></div>' +
      '<div class="wd-main"><div class="wd-tabs" role="tablist">' + tabs + '</div><div class="section">' + rows + '</div></div></div>' +
      '<div class="row-actions"><button class="btn btn-ghost" type="button" data-act="close">취소</button><button class="btn btn-gold" type="button" data-act="save-look">저장</button></div></div>');
    var cur = layer.querySelector('.wardrobe');
    if (cur) cur.outerHTML = html; else openLayer(html);
  }

  /* 본인 확인: 학생 비밀번호(체크리스트와 같음) 또는 선생님 비밀번호 */
  function verifyStudent(id, title, desc, onOk) {
    store.hasPin(id).then(function (has) {
      if (!has) return setupPin(id, onOk);
      openLayer('<div class="modal modal-sm pin-wrap" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
        '<span class="eyebrow">Confirm</span><h2>' + esc(title) + '</h2><p class="muted" style="margin:0">' + desc + '</p>' +
        '<input class="pin-input" id="pin-in" type="password" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="비밀번호 4자리">' +
        '<div class="form-error" id="pin-err"></div><div class="row-actions" style="justify-content:center"><button class="btn btn-ghost" type="button" data-act="close">취소</button>' +
        '<button class="btn btn-gold" type="button" id="pin-ok">확인</button></div></div>');
      var input = document.getElementById('pin-in'), btn = document.getElementById('pin-ok');
      input.focus();
      function check() {
        var v = input.value;
        btn.disabled = true;
        store.checkPin(id, v).then(function (ok) {
          btn.disabled = false;
          if (ok) { closeLayer(); onOk(); return; }
          document.getElementById('pin-err').textContent = '비밀번호가 맞지 않아요.';
          input.value = ''; input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); input.focus();
        }, function (e) { btn.disabled = false; fail(e); });
      }
      btn.onclick = check;
      input.onkeydown = function (e) { if (e.key === 'Enter') check(); };
    }, function () { toast('비밀번호를 확인하지 못했어요. 인터넷 연결을 확인해 주세요.', true); });
  }
  function setupPin(id, onOk) {
    openLayer('<div class="modal modal-sm pin-wrap" role="dialog" aria-modal="true" aria-label="비밀번호 만들기"><span class="eyebrow">New PIN</span>' +
      '<h2>' + esc(id) + '의 비밀번호 만들기</h2><p class="muted" style="margin:0">아직 비밀번호가 없어요. 4자리 숫자를 정해 주세요. 체크리스트에서도 같은 비밀번호를 써요.</p>' +
      '<input class="pin-input" id="pin-new" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="새 비밀번호">' +
      '<input class="pin-input" id="pin-new2" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="새 비밀번호 한 번 더" placeholder="한 번 더">' +
      '<div class="form-error" id="pin-err"></div><div class="row-actions" style="justify-content:center"><button class="btn btn-ghost" type="button" data-act="close">취소</button>' +
      '<button class="btn btn-gold" type="button" id="pin-ok">만들기</button></div></div>');
    document.getElementById('pin-new').focus();
    document.getElementById('pin-ok').onclick = function () {
      var a = document.getElementById('pin-new').value, b = document.getElementById('pin-new2').value, err = document.getElementById('pin-err');
      if (!/^\d{4}$/.test(a)) { err.textContent = '숫자 4자리를 넣어 주세요.'; return; }
      if (a !== b) { err.textContent = '두 번 넣은 비밀번호가 달라요.'; return; }
      store.setPin(id, a).then(function () { closeLayer(); toast('비밀번호를 만들었어요'); onOk(); }, function () { err.textContent = '저장하지 못했어요. 다시 해 주세요.'; });
    };
  }
  function teacherLogin(pw) {
    return store.checkTeacher(pw).then(function (ok) { if (ok) ui.teacher = true; return ok; });
  }
  function verifyTeacher(onOk) {
    if (ui.teacher) return onOk();
    openLayer('<div class="modal modal-sm pin-wrap" role="dialog" aria-modal="true" aria-label="선생님 확인"><span class="eyebrow">Teacher</span><h2>선생님 확인</h2>' +
      '<input class="pin-input" id="pin-in" type="password" maxlength="20" autocomplete="off" aria-label="선생님 비밀번호">' +
      '<div class="form-error" id="pin-err"></div><div class="row-actions" style="justify-content:center"><button class="btn btn-ghost" type="button" data-act="close">취소</button><button class="btn btn-gold" type="button" id="pin-ok">확인</button></div></div>');
    var input = document.getElementById('pin-in');
    input.focus();
    function check() {
      teacherLogin(input.value).then(function (ok) {
        if (ok) { closeLayer(); onOk(); }
        else { document.getElementById('pin-err').textContent = '비밀번호가 맞지 않아요.'; input.value = ''; }
      }, fail);
    }
    document.getElementById('pin-ok').onclick = check;
    input.onkeydown = function (e) { if (e.key === 'Enter') check(); };
  }
  function ask(title, text, okLabel, onOk) {
    openLayer('<div class="modal modal-sm" role="alertdialog" aria-modal="true" aria-label="' + esc(title) + '"><h2>' + esc(title) + '</h2><p style="margin:0" class="muted">' + text + '</p>' +
      '<div class="row-actions"><button class="btn btn-ghost" type="button" data-act="close">아니요</button><button class="btn btn-danger" type="button" id="ask-ok">' + esc(okLabel) + '</button></div></div>');
    var ok = document.getElementById('ask-ok');
    ok.focus();
    ok.onclick = function () { closeLayer(); onOk(); };
  }

  /* 방금 기록한 경기는 다시 계산이 끝나면 결과 화면을 띄운다 */
  function expectResult(id) { wantResult[id] = true; seen[id] = true; showWanted(); }
  function showWanted() {
    var shown = false;
    Object.keys(wantResult).forEach(function (id) {
      var m = matchById(id);
      if (m) { delete wantResult[id]; showResult(m); shown = true; }
    });
    return shown;
  }

  /* 승리 화면 */
  var shownResult = {};
  function showResult(m) {
    if (shownResult[m.id]) return;
    shownResult[m.id] = true;
    var w = byId(m.a), l = byId(m.b);
    var wr0 = GG.getRank(m.before.a.points), wr1 = GG.getRank(m.after.a);
    var lr0 = GG.getRank(m.before.b.points), lr1 = GG.getRank(m.after.b);
    var tierUp = wr1.tierIndex > wr0.tierIndex;
    function pct(r) { return r.lpMax ? Math.round(r.lp / r.lpMax * 100) : 100; }
    var promo = '';
    if (tierUp) promo = '<div class="promo">' + crest(wr1, 110) + '<div class="eyebrow">Promoted</div><div class="promo-text gold-text">' + wr1.label + ' 승급</div></div>';
    else if (wr1.value > wr0.value) promo = '<div class="promo">' + crest(wr1, 74) + '<div class="promo-text" style="color:' + wr1.tier.light + '">' + wr1.label + ' 달성</div></div>';
    var demote = lr1.value < lr0.value ? '<div class="promo-text down">' + esc(l.name) + ' · ' + lr1.label + '(으)로 내려갔어요. 다음 판에 되찾자!</div>' : '';
    var startPct = wr1.value === wr0.value ? pct(wr0) : 0;
    openLayer('<div class="result" role="dialog" aria-modal="true" aria-label="대결 결과"><div class="result-rays"></div>' +
      '<div class="result-word">VICTORY</div>' + avatarFull(w) + '<div class="result-sub">' + esc(w.name) + (m.upset ? ' · 대역전승' : ' 승리') + '</div>' +
      '<div class="panel gilded result-card">' +
      '<div class="result-line"><span class="who">' + headshot(w, 36) + '<span><b>' + esc(w.name) + '</b><span class="sub">' + wr1.label + ' · ' + m.after.a + ' LP' + (m.bonus ? ' · 연승 보너스 +' + m.bonus : '') + '</span></span></span>' +
      '<span class="result-delta up" id="gain-count">+0</span>' + lpBar(wr1, startPct) + '</div>' +
      '<div class="result-line"><span class="who">' + headshot(l, 36) + '<span><b>' + esc(l.name) + '</b><span class="sub">' + lr1.label + ' · ' + m.after.b + ' LP</span></span></span>' +
      '<span class="result-delta down">−' + m.loss + '</span>' + (m.shield ? '<span class="sub" style="grid-column:1/-1">연패 보호로 절반만 잃었어요</span>' : '') + '</div>' + demote + '</div>' + promo +
      '<div class="row-actions" style="justify-content:center"><button class="btn btn-ghost" type="button" data-act="undo-now" data-id="' + esc(m.id) + '">잘못 기록했어요</button><button class="btn btn-gold" type="button" data-act="close">계속하기</button></div></div>');
    // LP 숫자 올라가기 + 막대 채우기
    var counter = document.getElementById('gain-count'), start = performance.now();
    (function tick(now) {
      var k = Math.min(1, (now - start) / 900);
      if (!counter.isConnected) return;
      counter.textContent = '+' + Math.round(m.gain * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(start);
    var bar = layer.querySelector('.result-line .lpbar span');
    setTimeout(function () { if (bar) bar.style.width = pct(wr1) + '%'; }, 300);
    confetti(tierUp ? 120 : 50);
    fanfare(tierUp);
  }

  function confetti(n) {
    var box = document.createElement('div');
    box.className = 'confetti';
    var colors = ['#f0e6d2', '#c8aa6e', '#0ac8b9', '#785a28', '#ffffff'];
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
      p.style.animationDelay = Math.random() * .5 + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 4200);
  }

  var audio = null;
  function fanfare(big) {
    if (!prefs.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var now = audio.currentTime;
      var boom = audio.createOscillator(), bg = audio.createGain();
      boom.type = 'sine'; boom.frequency.setValueAtTime(110, now); boom.frequency.exponentialRampToValueAtTime(40, now + .6);
      bg.gain.setValueAtTime(.35, now); bg.gain.exponentialRampToValueAtTime(.0001, now + .8);
      boom.connect(bg); bg.connect(audio.destination); boom.start(now); boom.stop(now + .8);
      var chords = big ? [[262, 330, 392], [294, 370, 440], [392, 494, 587, 784]] : [[262, 330, 392], [392, 494, 587]];
      chords.forEach(function (ch, i) {
        var t0 = now + .15 + i * .22, len = i === chords.length - 1 ? 1.1 : .2;
        ch.forEach(function (f) {
          var o = audio.createOscillator(), g = audio.createGain();
          o.type = 'sawtooth'; o.frequency.value = f;
          g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.05, t0 + .03); g.gain.exponentialRampToValueAtTime(.0001, t0 + len);
          o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + len + .05);
        });
      });
    } catch (e) { /* 소리 없이 진행 */ }
  }

  var toastTimer = null;
  function toast(text, isError) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast' + (isError ? ' error' : '');
    t.setAttribute('role', 'status');
    t.textContent = text;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 3500);
  }
  function fail(e) {
    ui.busy = false;
    toast(e && e.message && /[가-힣]/.test(e.message) ? e.message : '저장하지 못했어요. 인터넷 연결을 확인해 주세요.', true);
  }

  /* ───────── 동작 ───────── */
  function recordWin(sideKey) {
    var a = byId(ui.a), b = byId(ui.b);
    if (!a || !b || ui.busy) return;
    var w = sideKey === 'a' ? a : b, l = w === a ? b : a;
    verifyStudent(l.id, l.name + '의 패배 확인', '<b>' + esc(w.name) + '</b> 승리를 기록할게요. 진 친구 <b>' + esc(l.name) + '</b>이(가) 비밀번호를 넣어 주세요.', function () {
      ui.busy = true;
      store.record(w.id, l.id, { by: 'teacher' }).then(function (m) {
        ui.busy = false;
        if (ui.pairs && ui.pairs.current != null) { ui.pairs.done[ui.pairs.current] = true; ui.pairs.current = null; render(); }
        expectResult(m.id);
      }, fail);
    });
  }
  function scrollToArena() { var el = document.querySelector('.arena'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  document.addEventListener('click', function (e) {
    if (e.target.matches && e.target.matches('[data-backdrop]')) { closeLayer(); return; }
    var el = e.target.closest('[data-act],[data-profile],[data-filter],[data-win],[data-opp],[data-pair],[data-pickside],[data-choose],[data-wear],[data-wtab],[data-hist],[data-adjquick],[data-adjone]');
    if (!el) return;
    var d = el.dataset;
    if (d.profile) return openProfile(d.profile);
    if (d.adjquick) { readAdjustForm(); ui.adjD = +d.adjquick; var di = document.getElementById('adj-d'); if (di) di.value = d.adjquick; return; }
    if (d.adjone) { var aid = d.adjone, dv = +d.adjv; closeLayer(); return applyAdjust([aid], dv, '선생님 ' + (dv > 0 ? '칭찬' : '조정')); }
    if (d.hist) { ui.histFilter = d.hist; render(); var hf = document.getElementById('hist-filter'); if (hf) hf.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (d.filter) { ui.rankFilter = d.filter; return render(); }
    if (d.pickside) { if (personal() && d.pickside === 'a') return; return openPicker(d.pickside); }
    if (d.choose) {
      if (d.side === 'login') {
        var who0 = d.choose; closeLayer();
        return verifyStudent(who0, who0 + ' 로그인', '해바라기 체크리스트와 같은 비밀번호 4자리를 넣어 주세요.', function () { setMe(who0); toast(who0 + ' 로그인했어요'); });
      }
      ui[d.side] = d.choose; closeLayer(); return render();
    }
    if (d.opp) { ui.b = d.opp; render(); return scrollToArena(); }
    if (d.pair) {
      var pr = ui.pairs.pairs[+d.pair];
      ui.a = pr[0]; ui.b = pr[1]; ui.pairs.current = +d.pair;
      render(); return scrollToArena();
    }
    if (d.win) return recordWin(d.win);
    if (d.wtab) { wardrobe.tab = d.wtab; return drawWardrobe(); }
    if (d.wear) {
      if (AV.isLocked(d.wear, d.val, wardrobe.tier)) { toast(AV.findItem(d.wear, d.val).name + ' — ' + GG.TIERS[AV.findItem(d.wear, d.val).unlock].name + ' 티어에 오르면 열려요'); return; }
      wardrobe.draft[d.wear] = d.val; drawWardrobe();
      return;
    }
    switch (d.act) {
      case 'close': closeLayer(); break;
      case 'teacher-edit': verifyTeacher(function () { render(); }); break;
      case 'edit-match': openEditMatch(d.id); break;
      case 'em-swap':
        var ew = document.getElementById('em-w'), el2 = document.getElementById('em-l'), tmp = ew.value;
        ew.value = el2.value; el2.value = tmp;
        break;
      case 'em-save':
        var nw = document.getElementById('em-w').value, nl = document.getElementById('em-l').value, nt = new Date(document.getElementById('em-t').value).getTime();
        if (nw === nl) { document.getElementById('em-err').textContent = '이긴 사람과 진 사람이 같아요.'; break; }
        if (!nt) { document.getElementById('em-err').textContent = '경기 시간을 넣어 주세요.'; break; }
        store.updateMatch(d.id, { a: nw, b: nl, t: nt }).then(function () { closeLayer(); toast('경기 기록을 고쳤어요. LP를 다시 계산했어요'); }, fail);
        break;
      case 'del-match':
        var dm = matchById(d.id);
        ask('이 경기를 삭제할까요?', esc(dm.a) + ' 승 vs ' + esc(dm.b) + ' 패 (' + ago(dm.t) + ') 기록을 지우고 모든 LP를 다시 계산해요.', '삭제', function () {
          store.deleteMatch(d.id).then(function () { toast('경기를 삭제했어요'); }, fail);
        });
        break;
      case 'login': openPicker('login'); break;
      case 'adj-all': readAdjustForm(); ui.adjPick = {}; players().forEach(function (p) { ui.adjPick[p.id] = true; }); render(); document.getElementById('adjust').scrollIntoView({ block: 'start' }); break;
      case 'adj-none': readAdjustForm(); ui.adjPick = {}; render(); document.getElementById('adjust').scrollIntoView({ block: 'start' }); break;
      case 'adj-apply':
        if (ui.busy) break;
        readAdjustForm();
        var ids = Object.keys(ui.adjPick || {}).filter(function (k) { return ui.adjPick[k]; });
        var dd = ui.adjD, nn = ui.adjNote;
        if (ids.length > 1) ask(ids.length + '명에게 ' + (dd > 0 ? '+' : '−') + Math.abs(dd) + ' LP를 줄까요?', esc(nn || '사유 없음'), '적용', function () { applyAdjust(ids, dd, nn); });
        else applyAdjust(ids, dd, nn);
        break;
      case 'adj-del':
        var aj = adjusts().filter(function (x) { return x.id === d.id; })[0];
        ask('이 점수 조정을 취소할까요?', aj ? esc(aj.p) + ' ' + (aj.d > 0 ? '+' : '−') + Math.abs(aj.d) + ' LP · ' + esc(aj.note || '') : '', '취소하기', function () {
          store.deleteAdjust(d.id).then(function () { toast('점수 조정을 취소했어요'); }, fail);
        });
        break;
      case 'save-roster':
        var names = document.getElementById('roster-text').value.split(/\n|,/).map(function (x) { return x.trim(); }).filter(Boolean);
        store.setRoster(names, document.getElementById('roster-league').value.trim()).then(function () { toast('명단을 저장했어요'); }, fail);
        break;
      case 'reset-pin':
        var rw = document.getElementById('pin-reset-who').value;
        ask(rw + '의 비밀번호를 초기화할까요?', '다음에 로그인할 때 새 비밀번호를 만들어요.', '초기화', function () {
          store.resetPin(rw).then(function () { toast(rw + ' 비밀번호를 초기화했어요'); }, fail);
        });
        break;
      case 'connect-sheet':
        var cu = sheetUrlFrom(document.getElementById('sheet-url').value), cerr = document.getElementById('sheet-err');
        if (!cu) { cerr.textContent = '웹 앱 URL이 아니에요. https://script.google.com/macros/s/…/exec 모양의 주소를 붙여넣어 주세요.'; break; }
        cerr.textContent = '연결 확인 중…';
        fetch(cu + '?action=v&_=' + Date.now()).then(function (r) { return r.json(); }).then(function (r) {
          if (!r.ok) throw new Error(r.error);
          location.href = location.pathname + '?sheet=' + sheetIdOf(cu);
        }).catch(function () {
          cerr.textContent = '연결하지 못했어요. 배포할 때 "액세스 권한: 모든 사용자"로 했는지, 주소 끝이 /exec 인지 확인해 주세요.';
        });
        break;
      case 'copy-code':
        var code2 = document.getElementById('gs-code');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code2.value).then(function () { toast('코드를 복사했어요'); }, function () { code2.select(); });
        else code2.select();
        break;
      case 'init-class':
        var ilist = document.getElementById('init-students').value.split(/\n|,/).map(function (x) { return x.trim(); }).filter(Boolean);
        var ipw = document.getElementById('init-pw').value, ierr = document.getElementById('init-err');
        if (ilist.length < 2) { ierr.textContent = '학생을 2명 이상 넣어 주세요.'; break; }
        if (ipw.length < 4) { ierr.textContent = '선생님 비밀번호는 4자 이상이어야 해요.'; break; }
        if (ipw !== document.getElementById('init-pw2').value) { ierr.textContent = '두 번 넣은 비밀번호가 달라요.'; break; }
        ierr.textContent = '만드는 중…';
        store.init({ league: document.getElementById('init-league').value.trim() || '우리 반 리그', teacherPw: ipw, students: ilist })
          .then(function () { store.teacherPw = ipw; ui.teacher = true; location.hash = '#settings'; toast('반을 만들었어요! 아래 링크를 아이들에게 나눠 주세요'); }, function (e) { ierr.textContent = (e && e.message) || '만들지 못했어요.'; });
        break;
      case 'copy-url':
        var u = document.getElementById('share-url');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u.value).then(function () { toast('주소를 복사했어요'); }, function () { u.select(); });
        else u.select();
        break;
      case 'show-qr':
        var url = CLASS_LINK;
        openLayer('<div class="modal pin-wrap" role="dialog" aria-modal="true" aria-label="QR 코드"><span class="eyebrow">Join the League</span><h2>크롬북 카메라로 찍어요</h2>' +
          '<div id="qr" style="background:#fff;padding:16px"></div><div class="num" style="font-size:18px;word-break:break-all">' + esc(url) + '</div><button class="btn btn-gold" type="button" data-act="close">닫기</button></div>');
        var draw = function () { try { new window.QRCode(document.getElementById('qr'), { text: url, width: 320, height: 320 }); } catch (e) { document.getElementById('qr').textContent = 'QR 코드를 만들지 못했어요. 주소를 복사해 주세요.'; } };
        if (window.QRCode) draw();
        else { var sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = draw; sc.onerror = draw; document.head.appendChild(sc); }
        break;
      case 'me-menu':
        openLayer('<div class="modal modal-sm pin-wrap" role="dialog" aria-modal="true" aria-label="내 계정"><div class="profile-stage" style="width:100%;height:170px;background:' + tierGlow(GG.getRank(byId(me).points)) + '">' + avatarFull(byId(me)) + '</div><h2>' + esc(me) + '</h2>' +
          '<div class="row-actions" style="justify-content:center"><button class="btn" type="button" data-profile="' + esc(me) + '">내 프로필</button>' +
          '<button class="btn" type="button" data-act="customize" data-id="' + esc(me) + '">꾸미기</button><button class="btn btn-danger" type="button" data-act="logout">로그아웃</button></div>' +
          '<p class="muted" style="margin:0;font-size:13px">친구 크롬북으로 로그인했다면 꼭 로그아웃해 주세요.</p></div>');
        break;
      case 'logout': closeLayer(); ui.a = ui.b = null; setMe(null); toast('로그아웃했어요'); break;
      case 'report-win':
        var opp = byId(ui.b);
        if (!opp || ui.busy) break;
        var dup = matches().filter(function (m) { return m.a === me && m.b === opp.id && Date.now() - m.t < 5 * 60000; })[0];
        if (dup) { toast('방금 ' + opp.name + '이(가) 이미 결과를 기록했어요'); break; }
        store.addReport(me, opp.id).then(function () { toast(opp.name + '의 크롬북에 확인 요청을 보냈어요'); }, fail);
        break;
      case 'report-loss':
        var winner = byId(ui.b);
        if (!winner || ui.busy) break;
        ask(winner.name + '에게 졌나요?', '결과가 바로 기록되고 내 LP가 내려가요.', '네, 졌어요', function () {
          ui.busy = true;
          var pairIds = reports().filter(function (rp) { return (rp.winner === winner.id && rp.loser === me) || (rp.winner === me && rp.loser === winner.id); }).map(function (rp) { return rp.id; });
          store.record(winner.id, me, { cleanup: pairIds, by: me }).then(function (m) { ui.busy = false; expectResult(m.id); }, fail);
        });
        break;
      case 'report-accept':
        var rp0 = reports().filter(function (x) { return x.id === d.id; })[0];
        if (!rp0 || ui.busy) break;
        ui.busy = true;
        store.record(rp0.winner, rp0.loser, { consume: rp0.id, by: me }).then(function (m) { ui.busy = false; expectResult(m.id); }, fail);
        break;
      case 'report-reject':
        store.removeReport(d.id).then(function () { toast('요청을 지웠어요'); }, fail);
        break;
      case 'swap': var t = ui.a; ui.a = ui.b; ui.b = t; render(); break;
      case 'make-pairs':
        var res = GG.autoPair(players(), matches());
        // 지난번에 쉰 친구가 또 쉬지 않게
        if (ui.pairs && ui.pairs.rest && res.rest && res.rest.id === ui.pairs.rest && res.pairs.length) {
          var lastPair = res.pairs[res.pairs.length - 1], restP = res.rest;
          res.rest = lastPair[1]; lastPair[1] = restP;
        }
        ui.pairs = { pairs: res.pairs.map(function (p) { return [p[0].id, p[1].id]; }), rest: res.rest ? res.rest.id : null, done: {}, current: null };
        render();
        break;
      case 'close-pairs': ui.pairs = null; render(); break;
      case 'battle-with':
        ui.a = d.id; ui.b = null; closeLayer();
        if (route() !== 'battle') location.hash = '#battle'; else render();
        window.scrollTo(0, 0);
        break;
      case 'customize':
        var who = byId(d.id);
        if (who.id === me) { openCustomize(who.id); break; }
        verifyStudent(who.id, who.name + ' 확인', '내 캐릭터는 나만 꾸밀 수 있어요. 비밀번호를 넣어 주세요.', function () { openCustomize(who.id); });
        break;
      case 'save-look':
        store.updatePlayer(wardrobe.id, AV.allowed(wardrobe.draft, wardrobe.tier)).then(function () { closeLayer(); toast('캐릭터를 저장했어요'); }, fail);
        break;
      case 'wd-random':
        AV.TABS.forEach(function (t) {
          t.rows.forEach(function (row) {
            var opts = row.colors || row.items.filter(function (it) { return !(it.unlock && it.unlock > wardrobe.tier); }).map(function (it) { return it.id; });
            wardrobe.draft[row.key] = opts[Math.floor(Math.random() * opts.length)];
          });
        });
        drawWardrobe();
        break;
      case 'wd-reset':
        wardrobe.draft = AV.defaults(ROSTER.map(function (st) { return st.name; }).indexOf(wardrobe.id)); drawWardrobe();
        break;
      case 'undo-now':
        store.deleteMatch(d.id).then(function () { closeLayer(); toast('방금 대결을 취소했어요'); }, fail);
        break;
      case 'undo':
        verifyTeacher(function () {
          var lm = matches()[matches().length - 1];
          if (!lm) return;
          ask('마지막 대결을 취소할까요?', esc(lm.a) + ' 승리 vs ' + esc(lm.b) + ' (' + ago(lm.t) + ') 결과를 지우고 두 선수 LP를 대결 전으로 돌려요.', '취소하기', function () {
            store.deleteMatch(lm.id).then(function () { toast('마지막 대결을 취소했어요'); }, fail);
          });
        });
        break;
      case 'teacher-login':
        teacherLogin(document.getElementById('teacher-pin').value).then(function (ok) {
          if (ok) render(); else document.getElementById('teacher-err').textContent = '비밀번호가 맞지 않아요.';
        }, fail);
        break;
      case 'teacher-logout': ui.teacher = false; if (SHEET) store.teacherPw = ''; render(); break;
      case 'save-settings':
        store.saveSettings(Object.assign({}, settings(), {
          baseLP: Math.max(10, Math.min(60, parseInt(document.getElementById('set-base').value, 10) || 25)),
          lossShield: document.getElementById('set-shield').checked,
          startPoints: parseInt(document.getElementById('set-start').value, 10) || 0,
          streakBonus: document.getElementById('set-streak').checked
        })).then(function () { toast('규칙을 저장했어요'); }, fail);
        break;
      case 'copy-backup':
        var code = JSON.stringify({ app: 'gonggi-blox', savedAt: new Date().toISOString(), players: data.players, matches: data.matches, settings: data.settings });
        var box = document.getElementById('backup-text');
        box.value = code;
        var selectIt = function () { box.select(); toast('칸의 코드를 Ctrl+C로 복사해 주세요'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () { toast('백업 코드를 복사했어요. 메모장에 붙여넣어 보관하세요'); }, selectIt);
        } else selectIt();
        break;
      case 'reset-season':
        ask('새 시즌을 시작할까요?', '모든 선수의 LP와 전적, 대결 기록이 지워져요. 되돌릴 수 없어요. 필요하면 먼저 백업해 두세요.', '시즌 초기화', function () {
          store.resetSeason().then(function () { ui.pairs = null; toast('새 시즌이 시작됐어요'); }, fail);
        });
        break;
      case 'reset-demo':
        GGStore.LocalStore.reset(); location.reload();
        break;
    }
  });

  document.addEventListener('change', function (e) {
    var pick = e.target.dataset && e.target.dataset.adjpick;
    if (pick) { ui.adjPick = ui.adjPick || {}; ui.adjPick[pick] = e.target.checked; e.target.parentElement.classList.toggle('on', e.target.checked); return; }
    var bid = e.target.dataset && e.target.dataset.boost;
    if (bid) {
      var bl = (settings().boost || []).filter(function (x) { return x !== bid; });
      if (e.target.checked) bl.push(bid);
      store.saveSettings(Object.assign({}, settings(), { boost: bl })).then(function () { toast(bid + (e.target.checked ? ' 추천에 자주 보이기' : ' 추천 보통으로')); }, fail);
      return;
    }
    if (e.target.id === 'hist-filter') { ui.histFilter = e.target.value; render(); return; }
    var id = e.target.dataset && e.target.dataset.away;
    if (id) store.updatePlayer(id, { away: e.target.checked }).then(function () { toast(id + (e.target.checked ? ' 쉬는 중' : ' 복귀')); }, fail);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLayer();
    if (e.key === 'Enter' && e.target.id === 'teacher-pin') document.querySelector('[data-act="teacher-login"]').click();
  });

  /* 위쪽 바 */
  document.getElementById('logo-slot').innerHTML = logoMark();
  var modeChip = document.getElementById('mode-chip');
  modeChip.className = 'mode-chip ' + (REAL ? 'live' : OFFLINE || SETUP ? '' : 'demo');
  modeChip.innerHTML = '<i></i><span>' + (LIVE ? '체크리스트 연결됨' : SHEET ? '시트 연결됨' : OFFLINE ? '연결 안 됨' : SETUP ? '새 반 만들기' : '체험 모드') + '</span>';
  var meSlot = document.getElementById('me-slot');
  function drawMe() {
    if (OFFLINE || SETUP || !meSlot) return;
    var p = me && data ? byId(me) : null;
    meSlot.innerHTML = me
      ? '<button class="me-chip" type="button" data-act="me-menu">' + (p ? headshot(p, 30) : '') + '<span>' + esc(me) + '</span></button>'
      : '<button class="btn btn-sm btn-gold" type="button" data-act="login">로그인</button>';
  }
  var soundBtn = document.getElementById('sound-btn');
  function drawSound() {
    soundBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>' +
      (prefs.sound ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>') + '</svg>';
    soundBtn.setAttribute('aria-pressed', String(prefs.sound));
  }
  soundBtn.addEventListener('click', function () { prefs.sound = !prefs.sound; savePrefs(); drawSound(); });
  drawSound();

  window.addEventListener('hashchange', function () { closeLayer(); render(); window.scrollTo(0, 0); });

  render();
  if (OFFLINE || SETUP) return;
  /* 내 대결이 다른 크롬북에서 확정되면 내 화면에도 결과를 띄운다 */
  store.subscribe(function (d) {
    var fresh = [];
    (d.matches || []).forEach(function (m) {
      if (!seen[m.id] && !firstLoad && me && (m.a === me || m.b === me)) fresh.push(m);
      seen[m.id] = true;
    });
    firstLoad = false;
    data = d;
    if (SHEET) {
      ROSTER = d.roster || [];
      LEAGUE = d.league || LEAGUE; SEASON = d.season || SEASON;
      if (me && !ROSTER.some(function (st) { return st.name === me; })) { me = null; }
    }
    calc = GG.replay(ROSTER.map(function (st) { return st.name; }), d.matches, d.settings, d.adjusts);
    render();
    fresh = fresh.filter(function (m) { return !wantResult[m.id]; }).map(function (m) { return matchById(m.id); }).filter(Boolean);
    if (!showWanted() && fresh.length && !layer.querySelector('.result')) showResult(fresh[fresh.length - 1]);
  },
    function () { toast(SHEET ? '선생님 시트에 연결하지 못했어요. 링크가 맞는지, 인터넷이 되는지 확인해 주세요.' : '리그 정보를 불러오지 못했어요. Firestore 규칙에서 gonggi_ 컬렉션을 허용했는지 확인해 주세요.', true); });
})();
