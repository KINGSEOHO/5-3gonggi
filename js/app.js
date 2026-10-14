/* 공기 블록스 — 화면 */
(function () {
  'use strict';

  var STORE_KEY = 'gonggi-blox-v1';
  var PREF_KEY = 'gonggi-blox-prefs';
  var SHIRTS = ['#e0393e', '#f28c28', '#f2c80f', '#2fb466', '#1fa5a5', '#3a7bff', '#6b4fe0', '#d54bb0', '#5b6170', '#20232a', '#ffffff', '#8b5a3c'];
  var FACES = ['smile', 'grin', 'cool', 'wink', 'wow', 'fierce'];
  var SKIN = '#f5cd30';
  var NAV = [
    { id: 'home', label: '홈', icon: 'M3 11l9-8 9 8v10h-6v-6H9v6H3z' },
    { id: 'battle', label: '대결', icon: 'M5 3l6 6-2 2-6-6V3zm14 0v2l-9.5 9.5 2 2L21 7h0V3zM4 17l3 3 2-2 2 2 2-2-8-8-2 2 2 2z' },
    { id: 'rank', label: '랭킹', icon: 'M4 21V10h4v11zm6 0V4h4v17zm6 0v-7h4v7z' },
    { id: 'history', label: '기록', icon: 'M12 3a9 9 0 1 1-9 9h2a7 7 0 1 0 2-5l2 2H3V3l2.6 2.6A9 9 0 0 1 12 3zm-1 4h2v5l4 2-1 1.7-5-2.7z' },
    { id: 'tiers', label: '티어', icon: 'M12 2l8 3.5-.8 8.2C18.6 18 15.8 20.6 12 22c-3.8-1.4-6.6-4-7.2-8.3L4 5.5z', optional: false },
    { id: 'settings', label: '친구 관리', icon: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm-8 9c0-4 3.6-7 8-7s8 3 8 7z' }
  ];

  var GG = window.GG;
  var state = load();
  var prefs = loadPrefs();
  var ui = { a: null, b: null, rankFilter: 'all', pairs: null, toastTimer: null };
  var uid = 0;

  /* ───────── 저장 ───────── */
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* 저장소를 못 쓰면 예시로 시작 */ }
    return sampleState();
  }
  function normalize(d) {
    d = d || {};
    return {
      students: Array.isArray(d.students) ? d.students : [],
      matches: Array.isArray(d.matches) ? d.matches : [],
      settings: Object.assign({}, GG.DEFAULT_SETTINGS, d.settings || {}),
      isSample: !!d.isSample
    };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }
  function loadPrefs() {
    try { return Object.assign({ sound: true, theme: '' }, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); }
    catch (e) { return { sound: true, theme: '' }; }
  }
  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* 무시 */ }
  }

  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function makeStudent(name, i) {
    return {
      id: newId(), name: name, points: state ? state.settings.startPoints : 0,
      wins: 0, losses: 0, streak: 0, bestStreak: 0, peak: 0,
      color: SHIRTS[i % SHIRTS.length], face: FACES[i % FACES.length], away: false, created: Date.now()
    };
  }

  /* 처음 열었을 때 보여 줄 예시 반 (설정에서 지울 수 있음) */
  function sampleState() {
    var names = ['하늘', '도윤', '서연', '지호', '민준', '하린', '시우', '수아', '예준', '지안', '은우', '채원', '유준', '나윤'];
    var skill = [9, 7, 8, 4, 6, 5, 3, 6, 2, 7, 4, 5, 3, 1];
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var s = { students: [], matches: [], settings: Object.assign({}, GG.DEFAULT_SETTINGS), isSample: true };
    names.forEach(function (n, i) {
      s.students.push({
        id: 'ex' + i, name: n, points: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, peak: 0,
        color: SHIRTS[i % SHIRTS.length], face: FACES[(i * 5) % FACES.length], away: false, created: 0
      });
    });
    var t = Date.now() - 1000 * 60 * 60 * 24 * 20;
    for (var k = 0; k < 420; k++) {
      var i1 = Math.floor(rnd() * names.length), i2 = Math.floor(rnd() * names.length);
      if (i1 === i2) continue;
      var p = skill[i1] / (skill[i1] + skill[i2]);
      var w = rnd() < p ? i1 : i2, l = w === i1 ? i2 : i1;
      t += 1000 * 60 * (15 + Math.floor(rnd() * 50));
      record(s, s.students[w], s.students[l], t);
    }
    return s;
  }

  function byId(id) {
    for (var i = 0; i < state.students.length; i++) if (state.students[i].id === id) return state.students[i];
    return null;
  }
  function sorted(list) {
    return (list || state.students).slice().sort(function (a, b) {
      return b.points - a.points || (b.wins - a.wins) || a.name.localeCompare(b.name, 'ko');
    });
  }
  function placeOf(s) { return sorted().indexOf(s) + 1; }

  /* 승패 기록 (s = 저장 상태) */
  function record(s, winner, loser, time) {
    var out = GG.applyResult(winner, loser, s.settings);
    var m = {
      id: newId(), a: winner.id, b: loser.id, t: time || Date.now(),
      gain: out.result.total, bonus: out.result.bonus, loss: out.result.loss, upset: out.result.upset,
      before: { a: Object.assign({}, winner), b: Object.assign({}, loser) },
      after: { a: out.winner.points, b: out.loser.points }
    };
    Object.assign(winner, out.winner);
    Object.assign(loser, out.loser);
    s.matches.push(m);
    return m;
  }

  function undoLast() {
    var m = state.matches.pop();
    if (!m) return;
    var w = byId(m.a), l = byId(m.b);
    if (w) Object.assign(w, m.before.a, { color: w.color, face: w.face, name: w.name, away: w.away });
    if (l) Object.assign(l, m.before.b, { color: l.color, face: l.face, name: l.name, away: l.away });
    save();
  }

  /* ───────── 그림 ───────── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function faceSvg(face) {
    var eyes = '<ellipse cx="7" cy="8" rx="1.25" ry="1.8" fill="#1b1b1b"/><ellipse cx="13" cy="8" rx="1.25" ry="1.8" fill="#1b1b1b"/>';
    var smile = '<path d="M6 12.3 Q10 16 14 12.3" stroke="#1b1b1b" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
    switch (face) {
      case 'grin': return eyes + '<path d="M5.5 11.5 Q10 18.5 14.5 11.5 Z" fill="#1b1b1b"/><path d="M7 12 L13 12 L12.6 13 L7.4 13Z" fill="#fff"/>';
      case 'cool': return '<rect x="3.6" y="6.4" width="12.8" height="3.4" rx="1" fill="#111"/><rect x="5" y="7" width="3" height="1" fill="#555"/>' + smile;
      case 'wink': return '<ellipse cx="7" cy="8" rx="1.25" ry="1.8" fill="#1b1b1b"/><path d="M11.6 8.3 Q13 7 14.4 8.3" stroke="#1b1b1b" stroke-width="1.2" fill="none" stroke-linecap="round"/>' + smile;
      case 'wow': return eyes + '<ellipse cx="10" cy="13.6" rx="1.7" ry="2.1" fill="#1b1b1b"/>';
      case 'fierce': return eyes + '<path d="M5 5.2 L8.8 6.6 M15 5.2 L11.2 6.6" stroke="#1b1b1b" stroke-width="1.3" stroke-linecap="round"/><path d="M7.3 13.4 L12.7 13.4" stroke="#1b1b1b" stroke-width="1.3" stroke-linecap="round"/>';
      default: return eyes + smile;
    }
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  /* 로블록스 블록 캐릭터 (전신) */
  function avatarFull(s) {
    var c = s.color || SHIRTS[0], dark = shade(c, -40);
    return '<svg class="avatar-full" viewBox="0 0 60 84" aria-hidden="true">' +
      '<rect x="15" y="54" width="14" height="28" rx="2" fill="#3b4a63"/><rect x="31" y="54" width="14" height="28" rx="2" fill="#34425a"/>' +
      '<rect x="3" y="27" width="11" height="27" rx="3" fill="' + SKIN + '"/><rect x="46" y="27" width="11" height="27" rx="3" fill="#e6be22"/>' +
      '<rect x="3" y="27" width="11" height="10" rx="3" fill="' + c + '"/><rect x="46" y="27" width="11" height="10" rx="3" fill="' + dark + '"/>' +
      '<rect x="14" y="26" width="32" height="29" rx="3" fill="' + c + '"/><rect x="14" y="48" width="32" height="7" rx="2" fill="' + dark + '"/>' +
      '<rect x="24" y="22" width="12" height="6" fill="#e6be22"/>' +
      '<rect x="17" y="2" width="26" height="23" rx="6" fill="' + SKIN + '"/><rect x="17" y="2" width="26" height="23" rx="6" fill="none" stroke="rgba(0,0,0,.12)"/>' +
      '<g transform="translate(19 3) scale(1.1)">' + faceSvg(s.face) + '</g></svg>';
  }
  /* 얼굴 + 어깨 (목록용) */
  function headshot(s, size) {
    size = size || 34;
    var c = s.color || SHIRTS[0];
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40" style="flex-shrink:0;border-radius:8px;background:' + shade(c, 70) + '22" aria-hidden="true">' +
      '<rect x="5" y="29" width="30" height="14" rx="3" fill="' + c + '"/>' +
      '<rect x="10" y="5" width="20" height="20" rx="5" fill="' + SKIN + '"/>' +
      '<g transform="translate(10 6)">' + faceSvg(s.face) + '</g></svg>';
  }
  /* 티어 엠블럼 */
  function badge(rank, size) {
    var t = rank.tier, i = rank.tierIndex, g = 'tg' + (++uid);
    var wings = '';
    if (i >= 3) {
      var wing = '<path d="M18 24 L3 30 L11 40 L2 50 L13 52 L7 62 L22 60 Z" fill="' + t.color + '" stroke="rgba(0,0,0,.35)" stroke-width="2"/>';
      wings = wing + '<g transform="translate(100 0) scale(-1 1)">' + wing + '</g>';
    }
    var crown = i >= 7 ? '<path d="M30 17 L33 3 L42 11 L50 0 L58 11 L67 3 L70 17 Z" fill="' + t.light + '" stroke="rgba(0,0,0,.4)" stroke-width="2" stroke-linejoin="round"/>' : '';
    var inner = rank.division
      ? '<text x="50" y="61" text-anchor="middle" font-family="Do Hyeon, sans-serif" font-size="' + (rank.division.length > 2 ? 17 : 21) + '" fill="' + shade(t.color, -50) + '">' + rank.division + '</text>'
      : '<path d="M50 36 L54 46 L65 46 L56 53 L59 64 L50 57 L41 64 L44 53 L35 46 L46 46 Z" fill="' + t.color + '"/>';
    return '<svg class="badge" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" role="img" aria-label="' + rank.label + '" style="flex-shrink:0">' +
      '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + t.light + '"/><stop offset="1" stop-color="' + t.color + '"/></linearGradient></defs>' +
      wings + crown +
      '<path d="M50 9 L83 22 L79 60 Q74 82 50 94 Q26 82 21 60 L17 22 Z" fill="url(#' + g + ')" stroke="rgba(0,0,0,.4)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M50 30 L66 50 L50 72 L34 50 Z" fill="rgba(255,255,255,.88)" stroke="rgba(0,0,0,.25)" stroke-width="2"/>' +
      inner + '</svg>';
  }
  function gpIcon() {
    return '<svg class="gp" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5 17.4 5.8v8.4L10 18.5 2.6 14.2V5.8z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><rect x="7.3" y="7.3" width="5.4" height="5.4" rx="1" fill="currentColor"/></svg>';
  }
  function navIcon(d, size) {
    return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  function tierBg(rank) {
    return 'linear-gradient(160deg,' + rank.tier.light + ',' + rank.tier.color + ')';
  }
  function progressBar(rank) {
    if (!rank.lpMax) return '<div class="progress"><span style="width:100%;background:' + rank.tier.color + '"></span></div>';
    var pct = Math.round(rank.lp / rank.lpMax * 100);
    return '<div class="progress" role="progressbar" aria-valuenow="' + rank.lp + '" aria-valuemax="' + rank.lpMax + '"><span style="width:' + pct + '%;background:' + rank.tier.color + '"></span></div>';
  }
  function nextStepText(rank) {
    var next = GG.TIERS[rank.tierIndex + 1];
    if (rank.division && rank.division !== 'I') return '다음 단계까지 ' + (rank.lpMax - rank.lp) + '점';
    if (next) return next.name + ' 승급까지 ' + (next.min - rank.points) + '점';
    return '최고 티어!';
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
  function winRate(s) {
    var g = (s.wins || 0) + (s.losses || 0);
    return g ? Math.round(s.wins / g * 100) : 0;
  }
  function streakText(s) {
    if (s.streak >= 2) return '<span class="pill pill-up">🔥 ' + s.streak + '연승</span>';
    if (s.streak <= -2) return '<span class="pill pill-down">' + (-s.streak) + '연패</span>';
    return '';
  }

  /* ───────── 화면 ───────── */
  var main = document.getElementById('main');
  var layer = document.getElementById('layer');

  function route() { return (location.hash || '#home').slice(1).split('-')[0] || 'home'; }

  function render() {
    var r = route();
    if (!VIEWS[r]) r = 'home';
    renderNav(r);
    main.innerHTML = '<div class="page">' + VIEWS[r]() + '</div>';
    if (AFTER[r]) AFTER[r]();
    document.getElementById('total-chip').innerHTML = '⚔️ <span class="num">' + state.matches.length + '</span>판';
  }

  function renderNav(active) {
    var html = NAV.map(function (n) {
      return '<a class="navlink' + (n.id === active ? ' active' : '') + '" href="#' + n.id + '"' + (n.id === active ? ' aria-current="page"' : '') + '>' + navIcon(n.icon) + '<span>' + n.label + '</span></a>';
    }).join('');
    html += '<div class="nav-foot">공기놀이 우리반 리그<br>대결 ' + state.matches.length + '판 · 친구 ' + state.students.length + '명</div>';
    document.getElementById('nav').innerHTML = html;
  }

  function sampleBanner() {
    if (!state.isSample) return '';
    return '<div class="sample-banner"><div><b>지금은 예시 반이에요</b><div class="muted">예시 친구 14명과 대결 기록으로 미리 둘러볼 수 있어요. 우리 반으로 시작하려면 예시를 지우고 친구들을 등록하세요.</div></div>' +
      '<button class="btn btn-play" type="button" data-act="clear-sample">예시 지우고 시작하기</button></div>';
  }

  var VIEWS = {};
  var AFTER = {};

  /* 홈 */
  VIEWS.home = function () {
    var list = sorted();
    var html = sampleBanner();
    var top = list.slice(0, 3);
    var podium = '';
    if (top.length) {
      var order = [top[1], top[0], top[2]];
      podium = '<div class="podium" aria-label="1~3등">' + order.map(function (s, k) {
        if (!s) return '';
        var place = k === 1 ? 1 : k === 0 ? 2 : 3;
        return '<button class="podium-col podium-' + place + '" type="button" data-profile="' + s.id + '" style="background:none;border:0;color:inherit;padding:0">' +
          avatarFull(s) + '<span class="podium-name">' + esc(s.name) + '</span><span class="podium-block">' + place + '</span></button>';
      }).join('') + '</div>';
    }
    html += '<section class="hero"><div><h1>오늘도 공기 한 판!</h1>' +
      '<p>친구와 대결해서 이기면 점수가 오르고 티어가 올라가요. 나보다 높은 티어를 이기면 점수를 훨씬 많이 받아요.</p>' +
      '<div class="hero-actions"><a class="btn btn-play btn-lg" href="#battle">▶ 대결하기</a><a class="btn btn-ghost" href="#rank">랭킹 보기</a></div></div>' +
      podium + '</section>';

    if (!list.length) {
      return html + '<div class="card empty"><h2>아직 등록된 친구가 없어요</h2><p>친구 관리에서 우리 반 친구들 이름을 넣어 주세요.</p><a class="btn btn-play" href="#settings">친구 등록하기</a></div>';
    }

    // 티어 분포
    var counts = GG.TIERS.map(function () { return 0; });
    list.forEach(function (s) { counts[GG.getRank(s.points).tierIndex]++; });
    var dist = '<div class="dist" role="img" aria-label="티어 분포">' + counts.map(function (c, i) {
      return c ? '<span style="flex:' + c + ';background:' + GG.TIERS[i].color + '" title="' + GG.TIERS[i].name + ' ' + c + '명"></span>' : '';
    }).join('') + '</div><div class="dist-legend">' + counts.map(function (c, i) {
      return c ? '<span><i style="background:' + GG.TIERS[i].color + '"></i>' + GG.TIERS[i].name + ' ' + c + '명</span>' : '';
    }).join('') + '</div>';

    // 오늘 가장 많이 오른 친구
    var since = new Date(); since.setHours(0, 0, 0, 0);
    var gains = {};
    state.matches.forEach(function (m) {
      if (m.t < since.getTime()) return;
      gains[m.a] = (gains[m.a] || 0) + m.gain;
      gains[m.b] = (gains[m.b] || 0) - m.loss;
    });

    html += '<section class="section"><div class="section-head"><h2>우리 반 친구들</h2><a href="#rank">전체 랭킹 →</a></div>' +
      '<div class="grid grid-tiles">' + list.slice(0, 12).map(function (s, i) { return tile(s, i + 1, gains[s.id]); }).join('') + '</div></section>';

    html += '<div class="two-col"><section class="card section"><div class="section-head"><h2>최근 대결</h2><a href="#history">모두 보기 →</a></div>' +
      feed(state.matches.slice(-6).reverse()) + '</section>' +
      '<section class="card section"><h2>티어 분포</h2>' + dist + '<p class="muted" style="margin:0">티어는 아이언부터 챌린저까지 10단계예요. 다이아몬드까지는 티어마다 IV → I 네 단계가 있어요.</p><a class="btn" href="#tiers">티어 안내 보기</a></section></div>';
    return html;
  };

  function tile(s, place, todayGain) {
    var rank = GG.getRank(s.points);
    var gain = todayGain ? '<span class="' + (todayGain > 0 ? 'up' : 'delta-down') + '">오늘 ' + (todayGain > 0 ? '+' : '') + todayGain + '</span>' : '';
    return '<button class="tile" type="button" data-profile="' + s.id + '">' +
      '<div class="tile-thumb" style="background:' + tierBg(rank) + '">' +
      (place ? '<span class="tile-rank">#' + place + '</span>' : '') +
      '<span class="tile-badge">' + badge(rank, 40) + '</span>' + avatarFull(s) + '</div>' +
      '<div class="tile-name">' + esc(s.name) + (s.away ? '<span class="away-tag">쉬는 중</span>' : '') + '</div>' +
      '<div class="tile-meta"><span>' + rank.label + '</span><span class="points-chip">' + gpIcon() + s.points + '</span>' + gain + '</div></button>';
  }

  function feed(matches, opts) {
    if (!matches.length) return '<p class="muted" style="margin:0">아직 대결 기록이 없어요. 첫 대결을 해 보세요!</p>';
    return '<div class="feed">' + matches.map(function (m) {
      var w = byId(m.a), l = byId(m.b);
      if (!w || !l) return '';
      var wr0 = GG.getRank(m.before.a.points), wr1 = GG.getRank(m.after.a);
      var lr0 = GG.getRank(m.before.b.points), lr1 = GG.getRank(m.after.b);
      var tags = '';
      if (m.upset) tags += ' <span class="pill pill-gold">⚡ 역전승</span>';
      if (wr1.value > wr0.value) tags += ' <span class="pill pill-up">▲ ' + esc(w.name) + ' ' + wr1.label + '</span>';
      if (lr1.value < lr0.value) tags += ' <span class="pill pill-down">▼ ' + esc(l.name) + ' ' + lr1.label + '</span>';
      return '<div class="feed-row">' + headshot(w, 36) +
        '<div class="feed-text"><b>' + esc(w.name) + '</b> 승리 <span class="muted">vs</span> ' + esc(l.name) + tags +
        '<div class="feed-time">' + ago(m.t) + '</div></div>' +
        '<div style="text-align:right"><div class="delta-up">+' + m.gain + '</div><div class="delta-down">−' + m.loss + '</div></div></div>';
    }).join('') + '</div>';
  }

  /* 랭킹 */
  VIEWS.rank = function () {
    var list = sorted();
    var f = ui.rankFilter;
    var present = {};
    list.forEach(function (s) { present[GG.getRank(s.points).tier.id] = true; });
    var chips = '<button class="chip' + (f === 'all' ? ' on' : '') + '" type="button" data-filter="all">전체</button>' +
      GG.TIERS.filter(function (t) { return present[t.id]; }).map(function (t) {
        return '<button class="chip' + (f === t.id ? ' on' : '') + '" type="button" data-filter="' + t.id + '"><i style="width:9px;height:9px;border-radius:3px;background:' + t.color + '"></i>' + t.name + '</button>';
      }).join('');
    var rows = list.map(function (s, i) {
      var r = GG.getRank(s.points);
      if (f !== 'all' && r.tier.id !== f) return '';
      return '<tr data-profile="' + s.id + '" tabindex="0"><td class="rank-no">' + (i + 1) + '</td>' +
        '<td><div class="who">' + headshot(s, 34) + '<b>' + esc(s.name) + '</b>' + (s.away ? '<span class="away-tag">쉬는 중</span>' : '') + '</div></td>' +
        '<td><div class="tier-cell">' + badge(r, 34) + '<span class="tier-name">' + r.label + '</span></div></td>' +
        '<td class="num"><span class="points-chip">' + gpIcon() + s.points + '</span></td>' +
        '<td class="num">' + s.wins + '승 ' + s.losses + '패</td><td class="num">' + winRate(s) + '%</td><td>' + streakText(s) + '</td></tr>';
    }).join('');
    return sampleBanner() +
      '<div class="page-head"><div><h1>랭킹</h1><p>점수가 높은 순서예요. 이름을 누르면 자세히 볼 수 있어요.</p></div><a class="btn btn-play" href="#battle">▶ 대결하기</a></div>' +
      '<div class="filter-row">' + chips + '</div>' +
      (list.length ? '<div class="card" style="padding:6px 8px"><div class="table-wrap"><table><thead><tr><th>순위</th><th>이름</th><th>티어</th><th>점수</th><th>전적</th><th>승률</th><th>연승</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>'
        : '<div class="card empty"><p>등록된 친구가 없어요.</p><a class="btn btn-play" href="#settings">친구 등록하기</a></div>');
  };

  /* 대결 */
  VIEWS.battle = function () {
    var active = sorted().filter(function (s) { return !s.away; });
    if (active.length < 2) {
      return '<div class="page-head"><div><h1>대결</h1></div></div><div class="card empty"><h2>대결하려면 친구가 2명 이상 있어야 해요</h2><a class="btn btn-play" href="#settings">친구 등록하기</a></div>';
    }
    var a = ui.a && byId(ui.a), b = ui.b && byId(ui.b);
    if (a && b && a.id === b.id) b = null;

    function options(selected, other) {
      return '<option value="">친구를 골라요</option>' + sorted().map(function (s) {
        if (s.away && s.id !== selected) return '';
        return '<option value="' + s.id + '"' + (s.id === selected ? ' selected' : '') + (s.id === other ? ' disabled' : '') + '>' + esc(s.name) + ' · ' + GG.getRank(s.points).label + '</option>';
      }).join('');
    }
    var pv = a && b ? GG.preview(a, b, state.settings) : null;

    function fighter(s, side, other) {
      var sel = '<select id="pick-' + side + '" data-pick="' + side + '" aria-label="' + (side === 'a' ? '빨강 팀' : '파랑 팀') + ' 선수">' + options(s && s.id, other && other.id) + '</select>';
      var label = '<div class="team-label">' + (side === 'a' ? '빨강 팀' : '파랑 팀') + '</div>';
      if (!s) return '<div class="fighter ' + (side === 'a' ? 'red' : 'blue') + '">' + label + sel + '<div class="fighter-empty">' + (side === 'b' && a ? '아래 추천 상대를 눌러도 돼요' : '누가 대결하나요?') + '</div></div>';
      var r = GG.getRank(s.points);
      var mine = pv ? pv[side] : null;
      return '<div class="fighter ' + (side === 'a' ? 'red' : 'blue') + '">' + label + sel +
        avatarFull(s) + '<div class="fighter-name">' + esc(s.name) + '</div>' +
        '<div class="tier-cell">' + badge(r, 36) + '<span class="tier-name">' + r.label + '</span></div>' +
        '<div class="points-chip">' + gpIcon() + s.points + '점 ' + streakText(s) + '</div>' +
        (mine ? '<div class="stakes"><span class="stake delta-up">이기면 +' + mine.win + '</span><span class="stake delta-down">지면 −' + mine.lose + '</span></div>' : '') + '</div>';
    }

    var vs = '<div class="vs"><div class="vs-text">VS</div>' +
      (a || b ? '<button class="btn btn-sm btn-ghost" type="button" data-act="swap">⇄ 바꾸기</button>' : '') + '</div>';

    var html = '<div class="page-head"><div><h1>대결</h1><p>두 친구를 고르고 공기 대결이 끝나면 이긴 친구 버튼을 눌러요.</p></div>' +
      '<button class="btn btn-blue" type="button" data-act="make-pairs">🎲 오늘의 대진표 만들기</button></div>';

    if (ui.pairs) html += pairsView();

    html += '<div class="arena">' + fighter(a, 'a', b) + vs + fighter(b, 'b', a) + '</div>';

    if (pv) {
      var ca = Math.round(pv.a.chance * 100);
      html += '<div class="card section"><div class="chance"><div class="chance-bar"><span style="flex:' + ca + '"></span><span style="flex:' + (100 - ca) + '"></span></div>' +
        '<div class="chance-label"><span>' + esc(a.name) + ' 예상 승률 ' + ca + '%</span><span>' + esc(b.name) + ' ' + (100 - ca) + '%</span></div></div>' +
        '<p class="muted" style="margin:0;font-size:14px">' + upsetHint(a, b, pv) + '</p>' +
        '<div class="decide"><button class="btn btn-lg btn-red" type="button" data-win="a">🏆 ' + esc(a.name) + ' 승리!</button>' +
        '<button class="btn btn-lg btn-bluet" type="button" data-win="b">🏆 ' + esc(b.name) + ' 승리!</button></div></div>';
    }

    if (a) html += recommendView(a);
    else html += '<div class="card"><h2>상대 추천</h2><p class="muted" style="margin:6px 0 0">빨강 팀 친구를 먼저 고르면 딱 맞는 상대를 추천해 줄게요.</p></div>';
    return html;
  };

  function upsetHint(a, b, pv) {
    var ra = GG.getRank(a.points), rb = GG.getRank(b.points);
    if (ra.tierIndex === rb.tierIndex && Math.abs(a.points - b.points) < 60) return '실력이 비슷한 대결이에요. 누가 이길지 몰라요!';
    var low = a.points < b.points ? a : b, high = low === a ? b : a;
    var lowWin = low === a ? pv.a.win : pv.b.win;
    return esc(low.name) + '이(가) ' + esc(high.name) + '을(를) 이기면 <b class="delta-up">+' + lowWin + '점</b>으로 크게 올라가요. 높은 티어 친구는 지면 점수가 많이 떨어지니 조심!';
  }

  function recommendView(a) {
    var rec = GG.recommend(a, state.students, state.matches, state.settings);
    function item(c) {
      var r = GG.getRank(c.student.points);
      var sub = r.label + (c.met ? ' · ' + c.met + '번 붙어 봄' : ' · 처음 붙어요');
      return '<button class="rec-item" type="button" data-opp="' + c.student.id + '">' + headshot(c.student, 38) +
        '<span style="min-width:0"><span class="rec-name">' + esc(c.student.name) + '</span><span class="rec-sub" style="display:block">' + sub + '</span></span>' +
        '<span class="rec-gain"><span class="delta-up">+' + c.preview.a.win + '</span><br><span class="delta-down">−' + c.preview.a.lose + '</span></span></button>';
    }
    function group(title, desc, list, emptyText) {
      return '<div class="rec-group"><h3>' + title + '</h3><p>' + desc + '</p>' +
        (list.length ? list.map(item).join('') : '<div class="rec-empty">' + emptyText + '</div>') + '</div>';
    }
    return '<section class="card section"><div class="section-head"><h2>' + esc(a.name) + '에게 추천하는 상대</h2></div>' +
      '<div class="rec-groups">' +
      group('🤝 비슷한 실력', '점수가 가깝고 최근에 안 붙어 본 친구', rec.close, '추천할 친구가 없어요') +
      group('🔥 도전!', '나보다 조금 높은 친구. 이기면 점수를 많이 받아요', rec.challenge, '이미 최고 점수예요!') +
      group('✨ 처음 붙는 친구', '아직 한 번도 대결하지 않은 친구', rec.fresh, '더 추천할 친구가 없어요') +
      '</div></section>';
  }

  function pairsView() {
    var p = ui.pairs;
    return '<section class="card section"><div class="section-head"><h2>오늘의 대진표</h2><div style="display:flex;gap:8px">' +
      '<button class="btn btn-sm" type="button" data-act="make-pairs">다시 섞기</button><button class="btn btn-sm btn-ghost" type="button" data-act="close-pairs">닫기</button></div></div>' +
      '<p class="muted" style="margin:0;font-size:14px">점수가 비슷한 친구끼리, 최근에 붙은 친구는 피해서 짝을 지었어요.</p>' +
      '<div class="pairs">' + p.pairs.map(function (pair, i) {
        var x = byId(pair[0]), y = byId(pair[1]);
        if (!x || !y) return '';
        var done = p.done[i];
        return '<div class="pair' + (done ? ' done' : '') + '"><div class="p">' + headshot(x, 30) + '<span>' + esc(x.name) + '</span></div><span class="pv">VS</span>' +
          '<div class="p">' + headshot(y, 30) + '<span>' + esc(y.name) + '</span></div>' +
          '<div class="pair-foot">' + (done ? '<span class="pill">끝난 대결</span>' : '<button class="btn btn-sm btn-play" type="button" data-pair="' + i + '">▶ 이 대결 하기</button>') + '</div></div>';
      }).join('') + '</div>' +
      (p.rest && byId(p.rest) ? '<p class="muted" style="margin:0;font-size:14px">' + esc(byId(p.rest).name) + '은(는) 이번엔 쉬어요. 다음 대진표에서 먼저 넣어 줄게요.</p>' : '') + '</section>';
  }

  /* 기록 */
  VIEWS.history = function () {
    var ms = state.matches.slice().reverse();
    return '<div class="page-head"><div><h1>대결 기록</h1><p>모두 ' + ms.length + '판. 잘못 누른 결과는 마지막 대결부터 되돌릴 수 있어요.</p></div>' +
      (ms.length ? '<button class="btn" type="button" data-act="undo">↶ 마지막 대결 취소</button>' : '') + '</div>' +
      '<div class="card">' + feed(ms.slice(0, 200)) + '</div>' +
      (ms.length > 200 ? '<p class="muted">최근 200판만 보여요.</p>' : '');
  };

  /* 티어 안내 */
  VIEWS.tiers = function () {
    var counts = {};
    state.students.forEach(function (s) { var id = GG.getRank(s.points).tier.id; counts[id] = (counts[id] || 0) + 1; });
    var cards = GG.TIERS.slice().reverse().map(function (t, k) {
      var idx = GG.TIERS.length - 1 - k;
      var next = GG.TIERS[idx + 1];
      var rank = GG.getRank(t.min + (t.divs ? GG.DIV_SIZE * 3 : 0));
      var range = next ? t.min + ' ~ ' + (next.min - 1) + '점' : t.min + '점 이상';
      var divs = t.divs ? 'IV · III · II · I (단계마다 ' + GG.DIV_SIZE + '점)' : '단계 없이 점수로 겨뤄요';
      return '<div class="card tier-card">' + badge(rank, 84) + '<div class="tier-name" style="color:' + t.color + '">' + t.name + '</div>' +
        '<div class="num">' + range + '</div><div class="muted" style="font-size:13px">' + divs + '</div><div class="count">우리 반 ' + (counts[t.id] || 0) + '명</div></div>';
    }).join('');

    var s = state.settings;
    var ex = [
      ['같은 티어끼리', 500, 500],
      ['한 단계 아래가 이김', 450, 500],
      ['한 티어 아래가 이김', 400, 600],
      ['두 티어 아래가 이김', 300, 700],
      ['한 티어 위가 이김', 600, 400]
    ].map(function (e) {
      var r = GG.calcMatch(e[1], e[2], 0, s);
      return '<tr><td>' + e[0] + '<div class="muted" style="font-size:12px">' + GG.getRank(e[1]).label + ' vs ' + GG.getRank(e[2]).label + '</div></td><td class="delta-up">+' + r.gain + '</td><td class="delta-down">−' + r.loss + '</td></tr>';
    }).join('');

    return '<div class="page-head"><div><h1>티어 안내</h1><p>리그 오브 레전드처럼 아이언부터 챌린저까지 10개의 티어가 있어요.</p></div></div>' +
      '<div class="tier-list">' + cards + '</div>' +
      '<div class="two-col"><section class="card section rules"><h2>점수 규칙</h2>' +
      '<p>• 처음에는 <b>' + GG.getRank(s.startPoints).label + '</b>(' + s.startPoints + '점)에서 시작해요.</p>' +
      '<p>• 실력이 같은 친구를 이기면 <b class="delta-up">+' + s.winBase + '점</b>, 지면 <b class="delta-down">−' + s.lossBase + '점</b>이에요.</p>' +
      '<p>• <b>낮은 티어가 높은 티어를 이기면</b> 점수를 훨씬 많이 받아요 (최대 +' + s.winBase * 2 + '점). 높은 티어 친구는 그만큼 많이 잃어요.</p>' +
      '<p>• 높은 티어가 낮은 티어를 이기면 조금만 올라요. 그래서 비슷한 친구나 더 센 친구에게 도전하는 게 좋아요.</p>' +
      (s.streakBonus ? '<p>• 3연승부터 <b>연승 보너스</b>가 붙어요 (3연승 +2, 4연승 +4 … 최대 +10).</p>' : '') +
      '<p>• 점수는 0점 아래로 내려가지 않아요.</p></section>' +
      '<section class="card section"><h2>이런 대결이면?</h2><div class="table-wrap"><table class="example-table"><thead><tr><th>대결</th><th>이긴 친구</th><th>진 친구</th></tr></thead><tbody>' + ex + '</tbody></table></div></section></div>';
  };

  /* 친구 관리 / 설정 */
  VIEWS.settings = function () {
    var s = state.settings;
    var list = state.students.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    return sampleBanner() +
      '<div class="page-head"><div><h1>친구 관리</h1><p>친구 등록, 점수 규칙, 백업을 여기서 해요. (선생님용)</p></div></div>' +
      '<div class="two-col"><section class="card section"><h2>친구 등록</h2>' +
      '<div class="form-row"><label for="bulk-names">이름 넣기 (한 줄에 한 명, 또는 쉼표로 구분)</label>' +
      '<textarea class="input" id="bulk-names" placeholder="김하늘&#10;이도윤&#10;박서연"></textarea></div>' +
      '<div class="row-actions"><button class="btn btn-play" type="button" data-act="add-names">친구 추가</button></div>' +
      '<h3>등록된 친구 ' + list.length + '명</h3>' +
      (list.length ? '<div class="feed">' + list.map(function (st) {
        var r = GG.getRank(st.points);
        return '<div class="feed-row">' + headshot(st, 34) + '<div class="feed-text"><b>' + esc(st.name) + '</b>' + (st.away ? '<span class="away-tag">쉬는 중</span>' : '') +
          '<div class="feed-time">' + r.label + ' · ' + st.points + '점 · ' + st.wins + '승 ' + st.losses + '패</div></div>' +
          '<button class="btn btn-sm" type="button" data-profile="' + st.id + '">편집</button></div>';
      }).join('') + '</div>' : '<p class="muted" style="margin:0">아직 없어요.</p>') + '</section>' +

      '<div class="section"><section class="card section"><h2>점수 규칙</h2>' +
      '<div class="form-row"><label for="set-win">비슷한 친구를 이겼을 때 얻는 점수</label><input class="input" id="set-win" type="number" min="5" max="100" value="' + s.winBase + '"></div>' +
      '<div class="form-row"><label for="set-loss">비슷한 친구에게 졌을 때 잃는 점수</label><input class="input" id="set-loss" type="number" min="0" max="100" value="' + s.lossBase + '"></div>' +
      '<div class="form-row"><label for="set-start">새 친구 시작 점수</label><select class="input" id="set-start">' +
      [0, 200, 400, 600].map(function (v) { return '<option value="' + v + '"' + (s.startPoints === v ? ' selected' : '') + '>' + v + '점 (' + GG.getRank(v).label + ')</option>'; }).join('') + '</select></div>' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:700"><input type="checkbox" id="set-streak"' + (s.streakBonus ? ' checked' : '') + '> 연승 보너스 주기</label>' +
      '<div class="row-actions"><button class="btn btn-blue" type="button" data-act="save-settings">규칙 저장</button></div>' +
      '<p class="muted" style="margin:0;font-size:13px">이기면 얻는 점수를 잃는 점수보다 크게 두면 대결을 많이 할수록 모두 조금씩 올라가요.</p></section>' +

      '<section class="card section"><h2>백업과 옮기기</h2>' +
      '<p class="muted" style="margin:0;font-size:14px">기록은 이 컴퓨터의 브라우저에 저장돼요. 다른 컴퓨터로 옮기거나 혹시 모를 때를 위해 가끔 백업해 두세요.</p>' +
      '<div class="row-actions" style="justify-content:flex-start">' + (window.GG_NO_FILE_SAVE ? '' : '<button class="btn" type="button" data-act="export-file">⬇ 파일로 저장</button>') +
      '<button class="btn" type="button" data-act="copy-backup">백업 코드 복사</button>' +
      '<label class="btn" for="import-file" style="cursor:pointer">⬆ 파일 불러오기</label><input id="import-file" type="file" accept=".json,application/json" hidden></div>' +
      '<div class="form-row"><label for="import-text">백업 코드 붙여넣기</label><textarea class="input" id="import-text" style="min-height:70px" placeholder="복사한 백업 코드를 여기에 붙여넣고 불러오기를 눌러요"></textarea></div>' +
      '<div class="row-actions"><button class="btn" type="button" data-act="import-text">코드로 불러오기</button></div></section>' +

      '<section class="card section"><h2>새 학기</h2><p class="muted" style="margin:0;font-size:14px">친구는 그대로 두고 점수와 기록만 지우거나, 모두 지울 수 있어요.</p>' +
      '<div class="row-actions" style="justify-content:flex-start"><button class="btn" type="button" data-act="reset-scores">점수만 초기화</button><button class="btn btn-danger" type="button" data-act="reset-all">모두 지우기</button></div></section></div></div>';
  };

  /* ───────── 프로필 창 ───────── */
  function openProfile(id) {
    var s = byId(id);
    if (!s) return;
    var r = GG.getRank(s.points);
    var peak = GG.getRank(s.peak || s.points);
    var mine = state.matches.filter(function (m) { return m.a === id || m.b === id; }).slice(-8).reverse();
    var recent = mine.length ? '<div class="feed">' + mine.map(function (m) {
      var won = m.a === id, other = byId(won ? m.b : m.a);
      return '<div class="feed-row">' + (other ? headshot(other, 30) : '<span></span>') +
        '<div class="feed-text"><b class="' + (won ? 'delta-up' : 'delta-down') + '">' + (won ? '승' : '패') + '</b> vs ' + (other ? esc(other.name) : '(지운 친구)') +
        '<div class="feed-time">' + ago(m.t) + '</div></div><span class="' + (won ? 'delta-up' : 'delta-down') + '">' + (won ? '+' + m.gain : '−' + m.loss) + '</span></div>';
    }).join('') + '</div>' : '<p class="muted" style="margin:0">아직 대결 기록이 없어요.</p>';

    var html = '<div class="overlay" data-close><div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(s.name) + ' 프로필">' +
      '<div class="modal-head"><span class="pill">#' + placeOf(s) + '위</span><button class="icon-btn" type="button" data-act="close" aria-label="닫기">✕</button></div>' +
      '<div class="profile-top"><div class="profile-stage" style="background:' + tierBg(r) + '">' + avatarFull(s) + '</div>' +
      '<div class="section" style="gap:8px;min-width:0;width:100%"><h1>' + esc(s.name) + '</h1>' +
      '<div class="profile-rank">' + badge(r, 52) + '<div><div class="tier-name" style="font-size:22px">' + r.label + '</div><div class="points-chip">' + gpIcon() + s.points + '점</div></div></div>' +
      progressBar(r) + '<div class="muted" style="font-size:13px">' + nextStepText(r) + '</div></div></div>' +
      '<div class="stats"><div class="stat"><b>' + s.wins + '</b><span>승</span></div><div class="stat"><b>' + s.losses + '</b><span>패</span></div>' +
      '<div class="stat"><b>' + winRate(s) + '%</b><span>승률</span></div><div class="stat"><b>' + (s.bestStreak || 0) + '</b><span>최고 연승</span></div></div>' +
      '<div class="muted" style="font-size:13px">최고 기록: ' + peak.label + ' (' + (s.peak || s.points) + '점)</div>' +
      '<div class="row-actions" style="justify-content:flex-start"><button class="btn btn-play" type="button" data-act="battle-with" data-id="' + id + '">▶ 이 친구로 대결하기</button></div>' +
      '<h3>최근 대결</h3>' + recent +
      '<details><summary style="cursor:pointer;font-weight:700">캐릭터 꾸미기 · 편집</summary><div class="section" style="margin-top:12px">' +
      '<div class="form-row"><label for="edit-name">이름</label><input class="input" id="edit-name" value="' + esc(s.name) + '" maxlength="12"></div>' +
      '<div class="form-row"><label>옷 색깔</label><div class="swatches">' + SHIRTS.map(function (c) {
        return '<button class="swatch' + (c === s.color ? ' on' : '') + '" type="button" data-color="' + c + '" style="background:' + c + '" aria-label="옷 색깔 ' + c + '"></button>';
      }).join('') + '</div></div>' +
      '<div class="form-row"><label>표정</label><div class="faces">' + FACES.map(function (f) {
        return '<button class="face-btn' + (f === s.face ? ' on' : '') + '" type="button" data-face="' + f + '" aria-label="표정 ' + f + '">' + headshot({ color: s.color, face: f }, 38) + '</button>';
      }).join('') + '</div></div>' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:700"><input type="checkbox" id="edit-away"' + (s.away ? ' checked' : '') + '> 쉬는 중 (결석 등, 추천과 대진표에서 빠져요)</label>' +
      '<div class="row-actions"><button class="btn btn-danger btn-sm" type="button" data-act="delete-student" data-id="' + id + '">친구 삭제</button>' +
      '<button class="btn btn-blue" type="button" data-act="save-student" data-id="' + id + '">저장</button></div></div></details>' +
      '</div></div>';
    layer.innerHTML = html;
    var first = layer.querySelector('[data-act="close"]');
    if (first) first.focus();
  }

  function closeLayer() { layer.innerHTML = ''; }

  /* 확인 창 (브라우저 confirm 대신) */
  function ask(title, text, okLabel, danger, onOk) {
    layer.innerHTML = '<div class="overlay" data-close><div class="modal modal-sm" role="alertdialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<h2>' + esc(title) + '</h2><p style="margin:0">' + text + '</p>' +
      '<div class="row-actions"><button class="btn btn-ghost" type="button" data-act="close">아니요</button>' +
      '<button class="btn ' + (danger ? 'btn-danger' : 'btn-play') + '" type="button" id="ask-ok">' + esc(okLabel) + '</button></div></div></div>';
    var ok = document.getElementById('ask-ok');
    ok.focus();
    ok.onclick = function () { closeLayer(); onOk(); };
  }

  /* ───────── 결과 축하 ───────── */
  function showResult(m) {
    var w = byId(m.a), l = byId(m.b);
    var wr0 = GG.getRank(m.before.a.points), wr1 = GG.getRank(m.after.a);
    var lr0 = GG.getRank(m.before.b.points), lr1 = GG.getRank(m.after.b);
    var promo = '';
    if (wr1.tierIndex > wr0.tierIndex) promo += '<div class="promo">' + badge(wr1, 40) + esc(w.name) + ' ' + wr1.tier.name + ' 승급!</div>';
    else if (wr1.value > wr0.value) promo += '<div class="promo">' + badge(wr1, 34) + esc(w.name) + ' ' + wr1.label + '(으)로 올라갔어요</div>';
    if (lr1.value < lr0.value) promo += '<div class="promo down">' + badge(lr1, 30) + esc(l.name) + ' ' + lr1.label + '(으)로 내려갔어요. 다시 도전!</div>';
    layer.innerHTML = '<div class="overlay" data-close><div class="result" role="dialog" aria-modal="true" aria-label="대결 결과">' +
      '<div class="result-top">' + avatarFull(w) + '<h2>' + (m.upset ? '대역전승!' : '승리!') + '</h2><div style="font-weight:700">' + esc(w.name) + '</div></div>' +
      '<div class="result-body">' +
      '<div class="result-line"><div class="who">' + headshot(w, 36) + '<b>' + esc(w.name) + '</b></div><div style="text-align:right"><div class="result-delta delta-up">+' + m.gain + '</div>' +
      (m.bonus ? '<div class="muted" style="font-size:12px">연승 보너스 +' + m.bonus + ' 포함</div>' : '') + '<div class="muted" style="font-size:13px">' + wr1.label + ' · ' + m.after.a + '점</div></div></div>' +
      '<div class="result-line"><div class="who">' + headshot(l, 36) + '<b>' + esc(l.name) + '</b></div><div style="text-align:right"><div class="result-delta delta-down">−' + m.loss + '</div><div class="muted" style="font-size:13px">' + lr1.label + ' · ' + m.after.b + '점</div></div></div>' +
      promo +
      '<div class="row-actions"><button class="btn btn-ghost" type="button" data-act="undo-now">↶ 잘못 눌렀어요</button><button class="btn btn-play" type="button" data-act="close">확인</button></div></div></div></div>';
    confetti(wr1.tierIndex > wr0.tierIndex ? 90 : 45);
    fanfare(wr1.tierIndex > wr0.tierIndex);
    var btn = layer.querySelector('.btn-play');
    if (btn) btn.focus();
  }

  function confetti(n) {
    var box = document.createElement('div');
    box.className = 'confetti';
    var colors = ['#ef4a52', '#3a7bff', '#00b06f', '#f2b705', '#9b51e0', '#ffffff'];
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
      p.style.animationDelay = Math.random() * .4 + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3600);
  }

  var audio = null;
  function fanfare(big) {
    if (!prefs.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var notes = big ? [523, 659, 784, 1047, 784, 1047] : [523, 659, 784, 1047];
      notes.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = 'square'; o.frequency.value = f;
        var t0 = audio.currentTime + i * 0.11;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        o.connect(g); g.connect(audio.destination);
        o.start(t0); o.stop(t0 + 0.18);
      });
    } catch (e) { /* 소리 없이 진행 */ }
  }

  function toast(text, undoable) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + text + '</span>' + (undoable ? '<button type="button" data-act="undo-toast">되돌리기</button>' : '');
    document.body.appendChild(t);
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(function () { t.remove(); }, 4000);
  }

  /* ───────── 동작 ───────── */
  function addNames(text) {
    var names = text.split(/[\n,]+/).map(function (n) { return n.trim().slice(0, 12); }).filter(Boolean);
    var have = {};
    state.students.forEach(function (s) { have[s.name] = true; });
    var added = 0;
    names.forEach(function (n) {
      if (have[n]) return;
      have[n] = true;
      state.students.push(makeStudent(n, state.students.length));
      added++;
    });
    save();
    return { added: added, skipped: names.length - added };
  }

  function exportJson() {
    return JSON.stringify({ app: 'gonggi-blox', version: 1, savedAt: new Date().toISOString(), students: state.students, matches: state.matches, settings: state.settings });
  }
  function importJson(text) {
    var d;
    try { d = JSON.parse(text); } catch (e) { return '백업 코드가 올바르지 않아요. 처음부터 끝까지 빠짐없이 복사했는지 확인해 주세요.'; }
    if (!d || !Array.isArray(d.students)) return '공기 블록스 백업이 아니에요.';
    state = normalize(d);
    state.isSample = false;
    save();
    return null;
  }

  function startBattleWith(id) {
    ui.a = id; ui.b = null;
    closeLayer();
    if (route() !== 'battle') location.hash = '#battle'; else render();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act],[data-profile],[data-filter],[data-win],[data-opp],[data-pair],[data-color],[data-face]');
    if (!el) {
      if (e.target.matches && e.target.matches('.overlay[data-close]')) closeLayer();
      if (!e.target.closest('.search')) hideSearch();
      return;
    }
    if (el.dataset.profile) { hideSearch(); openProfile(el.dataset.profile); return; }
    if (el.dataset.filter) { ui.rankFilter = el.dataset.filter; render(); return; }
    if (el.dataset.opp) { ui.b = el.dataset.opp; render(); document.querySelector('.arena').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (el.dataset.pair) {
      var pair = ui.pairs.pairs[+el.dataset.pair];
      ui.a = pair[0]; ui.b = pair[1]; ui.pairs.current = +el.dataset.pair; render();
      document.querySelector('.arena').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (el.dataset.color || el.dataset.face) {
      var box = el.parentElement;
      box.querySelectorAll('.on').forEach(function (x) { x.classList.remove('on'); });
      el.classList.add('on');
      return;
    }
    if (el.dataset.win) {
      var a = byId(ui.a), b = byId(ui.b);
      if (!a || !b) return;
      var w = el.dataset.win === 'a' ? a : b, l = w === a ? b : a;
      var m = record(state, w, l);
      if (ui.pairs && ui.pairs.current != null) {
        var cp = ui.pairs.pairs[ui.pairs.current];
        if (cp && ((cp[0] === a.id && cp[1] === b.id) || (cp[0] === b.id && cp[1] === a.id))) ui.pairs.done[ui.pairs.current] = true;
        ui.pairs.current = null;
      }
      save();
      render();
      showResult(m);
      return;
    }
    var act = el.dataset.act;
    switch (act) {
      case 'close': closeLayer(); break;
      case 'swap': var t = ui.a; ui.a = ui.b; ui.b = t; render(); break;
      case 'make-pairs':
        var res = GG.autoPair(state.students, state.matches);
        // 지난번에 쉰 친구가 이번에도 쉬지 않게 맨 앞에 넣는다
        if (ui.pairs && ui.pairs.rest && res.rest && res.rest.id === ui.pairs.rest) {
          var swapIn = res.pairs[res.pairs.length - 1];
          var restStudent = res.rest;
          res.rest = swapIn[1]; swapIn[1] = restStudent;
        }
        ui.pairs = { pairs: res.pairs.map(function (p) { return [p[0].id, p[1].id]; }), rest: res.rest ? res.rest.id : null, done: {}, current: null };
        render();
        break;
      case 'close-pairs': ui.pairs = null; render(); break;
      case 'undo':
        var last = state.matches[state.matches.length - 1];
        if (!last) break;
        ask('마지막 대결을 취소할까요?', esc((byId(last.a) || { name: '?' }).name) + ' 승리 vs ' + esc((byId(last.b) || { name: '?' }).name) + ' (' + ago(last.t) + ') 결과를 지우고 두 친구 점수를 대결 전으로 돌려요.', '취소하기', true, function () {
          undoLast(); render(); toast('마지막 대결을 취소했어요');
        });
        break;
      case 'undo-now': case 'undo-toast':
        undoLast(); closeLayer(); render(); toast('대결 결과를 취소했어요');
        break;
      case 'battle-with': startBattleWith(el.dataset.id); break;
      case 'clear-sample':
        ask('예시를 지울까요?', '예시 친구와 기록을 모두 지우고 빈 반에서 시작해요.', '지우고 시작', false, function () {
          state = normalize({ settings: state.settings });
          save(); ui.a = ui.b = null; ui.pairs = null;
          location.hash = '#settings'; render();
          toast('이제 우리 반 친구들을 등록해 주세요');
        });
        break;
      case 'add-names':
        var ta = document.getElementById('bulk-names');
        if (!ta.value.trim()) { toast('이름을 한 명 이상 적어 주세요'); ta.focus(); break; }
        if (state.isSample) { state.isSample = false; }
        var r = addNames(ta.value);
        render();
        toast(r.added + '명 추가했어요' + (r.skipped ? ' (같은 이름 ' + r.skipped + '명은 건너뜀)' : ''));
        break;
      case 'save-settings':
        var wv = Math.max(5, Math.min(100, parseInt(document.getElementById('set-win').value, 10) || 25));
        var lv = Math.max(0, Math.min(100, parseInt(document.getElementById('set-loss').value, 10) || 0));
        state.settings.winBase = wv;
        state.settings.lossBase = lv;
        state.settings.startPoints = parseInt(document.getElementById('set-start').value, 10) || 0;
        state.settings.streakBonus = document.getElementById('set-streak').checked;
        save(); render(); toast('규칙을 저장했어요');
        break;
      case 'save-student':
        var st = byId(el.dataset.id);
        var nm = document.getElementById('edit-name').value.trim().slice(0, 12);
        if (!nm) { toast('이름을 적어 주세요'); break; }
        st.name = nm;
        var col = layer.querySelector('.swatch.on'), fc = layer.querySelector('.face-btn.on');
        if (col) st.color = col.dataset.color;
        if (fc) st.face = fc.dataset.face;
        st.away = document.getElementById('edit-away').checked;
        save(); render(); openProfile(st.id); toast('저장했어요');
        break;
      case 'delete-student':
        var del = byId(el.dataset.id);
        ask(del.name + '을(를) 삭제할까요?', '이 친구의 점수와 프로필이 사라져요. 다른 친구들 기록에는 남아 있지만 이름이 보이지 않아요.', '삭제', true, function () {
          state.students = state.students.filter(function (x) { return x.id !== del.id; });
          state.matches = state.matches.filter(function (m) { return m.a !== del.id && m.b !== del.id; });
          if (ui.a === del.id) ui.a = null;
          if (ui.b === del.id) ui.b = null;
          save(); render(); toast('삭제했어요');
        });
        break;
      case 'export-file':
        try {
          var blob = new Blob([exportJson()], { type: 'application/json' });
          var link = document.createElement('a');
          var d = new Date();
          link.href = URL.createObjectURL(blob);
          link.download = '공기블록스-백업-' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + '.json';
          document.body.appendChild(link); link.click(); link.remove();
          toast('백업 파일을 저장했어요. 저장이 안 되면 "백업 코드 복사"를 써 주세요');
        } catch (err) { toast('파일 저장이 안 돼요. "백업 코드 복사"를 써 주세요'); }
        break;
      case 'copy-backup':
        var code = exportJson();
        var box2 = document.getElementById('import-text');
        var fallback = function () { box2.value = code; box2.focus(); box2.select(); toast('코드를 칸에 넣었어요. Ctrl+C로 복사해 두세요'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () { toast('백업 코드를 복사했어요. 메모장 같은 곳에 붙여넣어 보관하세요'); }, fallback);
        } else fallback();
        break;
      case 'import-text':
        var txt = document.getElementById('import-text').value.trim();
        if (!txt) { toast('백업 코드를 먼저 붙여넣어 주세요'); break; }
        ask('백업을 불러올까요?', '지금 있는 친구와 기록은 백업 내용으로 바뀌어요.', '불러오기', false, function () {
          var err = importJson(txt);
          render(); toast(err || '백업을 불러왔어요');
        });
        break;
      case 'reset-scores':
        ask('점수를 초기화할까요?', '친구 목록과 캐릭터는 그대로 두고 점수, 전적, 대결 기록을 모두 지워요.', '초기화', true, function () {
          state.students.forEach(function (s) {
            Object.assign(s, { points: state.settings.startPoints, wins: 0, losses: 0, streak: 0, bestStreak: 0, peak: state.settings.startPoints });
          });
          state.matches = []; state.isSample = false; ui.pairs = null;
          save(); render(); toast('점수를 초기화했어요');
        });
        break;
      case 'reset-all':
        ask('정말 모두 지울까요?', '친구, 점수, 기록이 모두 사라져요. 되돌릴 수 없어요.', '모두 지우기', true, function () {
          state = normalize({ settings: state.settings }); ui.a = ui.b = null; ui.pairs = null;
          save(); render(); toast('모두 지웠어요');
        });
        break;
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.dataset && e.target.dataset.pick) {
      ui[e.target.dataset.pick] = e.target.value || null;
      render();
      var sel = document.getElementById(e.target.id);
      if (sel) sel.focus();
    }
    if (e.target.id === 'import-file' && e.target.files[0]) {
      var reader = new FileReader();
      reader.onload = function () {
        var err = importJson(String(reader.result));
        render(); toast(err || '백업 파일을 불러왔어요');
      };
      reader.readAsText(e.target.files[0]);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeLayer(); hideSearch(); }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('tr[data-profile]')) openProfile(e.target.dataset.profile);
  });

  /* 검색 */
  var searchInput = document.getElementById('search');
  var searchBox = document.getElementById('search-results');
  function hideSearch() { searchBox.hidden = true; }
  searchInput.addEventListener('input', function () {
    var q = searchInput.value.trim();
    if (!q) { hideSearch(); return; }
    var hits = sorted().filter(function (s) { return s.name.indexOf(q) !== -1; }).slice(0, 6);
    searchBox.innerHTML = hits.length ? hits.map(function (s) {
      return '<button type="button" data-profile="' + s.id + '">' + headshot(s, 30) + '<span><b>' + esc(s.name) + '</b> <span class="muted">' + GG.getRank(s.points).label + '</span></span></button>';
    }).join('') : '<div style="padding:10px 12px" class="muted">찾는 친구가 없어요</div>';
    searchBox.hidden = false;
  });

  /* 테마 / 소리 */
  function applyTheme() {
    if (prefs.theme) document.documentElement.setAttribute('data-theme', prefs.theme);
    else document.documentElement.removeAttribute('data-theme');
  }
  document.getElementById('theme-btn').addEventListener('click', function () {
    var dark = prefs.theme ? prefs.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    prefs.theme = dark ? 'light' : 'dark';
    savePrefs(); applyTheme();
  });
  var soundBtn = document.getElementById('sound-btn');
  function drawSound() {
    soundBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>' +
      (prefs.sound ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>') + '</svg>';
    soundBtn.setAttribute('aria-pressed', prefs.sound ? 'true' : 'false');
  }
  soundBtn.addEventListener('click', function () { prefs.sound = !prefs.sound; savePrefs(); drawSound(); });

  window.addEventListener('hashchange', function () { closeLayer(); render(); window.scrollTo(0, 0); });

  applyTheme();
  drawSound();
  render();
})();
