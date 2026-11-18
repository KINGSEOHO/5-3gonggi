/* 공기 블록스 — 티어 / 점수 / 상대 추천 계산 (화면과 분리된 순수 함수) */
(function (root) {
  'use strict';

  // 한 단계(디비전) = 50점, 한 티어 = 4단계(IV → I) = 200점.
  // 마스터 이상은 단계 없이 점수만 쌓인다.
  var DIV_SIZE = 50;
  var TIERS = [
    { id: 'iron',        name: '아이언',       en: 'IRON',        min: 0,    divs: 4, color: '#7d7a78', light: '#b8b2ae' },
    { id: 'bronze',      name: '브론즈',       en: 'BRONZE',      min: 200,  divs: 4, color: '#a5653d', light: '#e2a273' },
    { id: 'silver',      name: '실버',         en: 'SILVER',      min: 400,  divs: 4, color: '#8394a6', light: '#d6e0ea' },
    { id: 'gold',        name: '골드',         en: 'GOLD',        min: 600,  divs: 4, color: '#d29b1f', light: '#ffe08a' },
    { id: 'platinum',    name: '플래티넘',     en: 'PLATINUM',    min: 800,  divs: 4, color: '#2aa198', light: '#9ff0e2' },
    { id: 'emerald',     name: '에메랄드',     en: 'EMERALD',     min: 1000, divs: 4, color: '#1f9d55', light: '#8ff0b0' },
    { id: 'diamond',     name: '다이아몬드',   en: 'DIAMOND',     min: 1200, divs: 4, color: '#4b7bec', light: '#b9d0ff' },
    { id: 'master',      name: '마스터',       en: 'MASTER',      min: 1400, divs: 0, color: '#9b51e0', light: '#e2c2ff' },
    { id: 'grandmaster', name: '그랜드마스터', en: 'GRANDMASTER', min: 1700, divs: 0, color: '#e0393e', light: '#ffb3b5' },
    { id: 'challenger',  name: '챌린저',       en: 'CHALLENGER',  min: 2000, divs: 0, color: '#f2b705', light: '#fff4b8' }
  ];
  var ROMAN = ['IV', 'III', 'II', 'I'];

  var DEFAULT_SETTINGS = {
    startPoints: 0,    // 시즌 시작 점수
    baseLP: 25,        // 골드에서 비슷한 친구를 이겼을 때 얻는 LP (모든 티어의 기준)
    streakBonus: true, // 3연승부터 보너스
    lossShield: true,  // 3연패부터 잃는 LP 절반
    repeatPenalty: true // 같은 상대를 연달아 이기면 LP 감소 (100 → 70 → 50 → 30 → 10%)
  };
  /* 피라미드: 낮은 티어는 많이 얻고 적게 잃고, 높은 티어는 적게 얻고 많이 잃는다.
     비슷한 실력끼리 반반 이기면 골드 근처에서 멈추고, 그 위는 확실히 잘해야 올라간다. */
  var WIN_MUL  = [1.6, 1.4, 1.2, 1.0, 0.85, 0.7, 0.6, 0.5, 0.45, 0.4];
  var LOSS_MUL = [0.5, 0.7, 0.85, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
  function streakBonusFor(newStreak) { return newStreak >= 5 ? 8 : newStreak === 4 ? 5 : newStreak === 3 ? 3 : 0; }

  /* 티어 구간 배율: 1이면 챌린저 2000, 0.5면 챌린저 1000 (선생님 설정 tierScale) */
  var BASE_MIN = TIERS.map(function (t) { return t.min; });
  var tierScaleNow = 1;
  function setTierScale(sc) {
    sc = Number(sc) || 1;
    if (sc === tierScaleNow) return;
    tierScaleNow = sc;
    TIERS.forEach(function (t, i) { t.min = Math.round(BASE_MIN[i] * sc); });
    DIV_SIZE = Math.round(50 * sc);
    api.DIV_SIZE = DIV_SIZE;
  }
  /* 피라미드 강도: 1이면 지금처럼 높은 티어가 많이 잃음, 0이면 모든 티어가 같음 */
  function mulAt(arr, i, strength) {
    var k = strength == null ? 1 : Number(strength);
    return 1 + (arr[i] - 1) * k;
  }
  function tierIndexOf(points) {
    for (var i = TIERS.length - 1; i >= 0; i--) {
      if (points >= TIERS[i].min) return i;
    }
    return 0;
  }

  /* 점수 → 티어 정보 (이름, 단계, 다음 단계까지 진행도) */
  function getRank(points) {
    points = Math.max(0, Math.round(points || 0));
    var idx = tierIndexOf(points);
    var t = TIERS[idx];
    var next = TIERS[idx + 1];
    var rank = { tier: t, tierIndex: idx, points: points, division: '', divIndex: 0, lp: 0, lpMax: 0, label: t.name, value: 0 };

    if (t.divs > 0) {
      var d = Math.min(t.divs - 1, Math.floor((points - t.min) / DIV_SIZE));
      rank.divIndex = d;
      rank.division = ROMAN[d];
      rank.lp = points - t.min - d * DIV_SIZE;
      rank.lpMax = DIV_SIZE;
      rank.label = t.name + ' ' + rank.division;
    } else {
      rank.lp = points - t.min;
      rank.lpMax = next ? next.min - t.min : 0;
    }
    // 티어+단계를 하나의 숫자로 (비교용): 아이언 IV = 0, 아이언 III = 1 …
    rank.value = idx * 4 + rank.divIndex;
    return rank;
  }

  /* 기대 승률 (엘로 공식). 점수 차 200점(한 티어)이면 약 76% */
  /* scale: LP 몇 점 차이면 기대 승률이 10배 차이 나는지. 클수록 실력 차가 LP 차로 크게 벌어진다 */
  function expectedScore(myPoints, oppPoints, scale) {
    return 1 / (1 + Math.pow(10, (oppPoints - myPoints) / (scale || 400)));
  }

  /* 대결 결과 계산. winnerStreak = 이기기 전 연승 수, loserStreak = 지기 전 연패 수(양수) */
  /* 같은 상대 반복: 같은 친구를 연달아 이길수록 LP가 줄어든다 (그 친구에게 한 번 지면 다시 100%)
     repeat = 이번 판 전까지 이 상대를 연속으로 이긴 횟수 */
  var REPEAT_MUL = [1, 0.7, 0.5, 0.3, 0.1];
  function repeatMul(n) { return REPEAT_MUL[Math.min(n || 0, REPEAT_MUL.length - 1)]; }
  function calcMatch(winnerPoints, loserPoints, winnerStreak, settings, loserStreak, repeat) {
    var s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    setTierScale(s.tierScale);
    var base = s.baseLP || s.winBase || 25;
    var wm = mulAt(WIN_MUL, tierIndexOf(winnerPoints), s.pyramid), lm = mulAt(LOSS_MUL, tierIndexOf(loserPoints), s.pyramid);
    var eWin = expectedScore(winnerPoints, loserPoints, s.eloScale);
    var wt = tierIndexOf(winnerPoints), lt = tierIndexOf(loserPoints);

    // 티어 차이: 낮은 쪽이 이기면 크게, 높은 쪽이 이기면 조금 (엘로)
    var maxGain = Math.round(base * wm * 2);
    var gain = Math.max(3, Math.min(maxGain, Math.round(base * wm * 2 * (1 - eWin))));
    var maxLoss = Math.round(base * lm * 2);
    var loss = Math.max(2, Math.min(maxLoss, Math.round(base * lm * 2 * (1 - eWin))));
    var shield = !!(s.lossShield && (loserStreak || 0) >= 2); // 이번에 지면 3연패
    if (shield) loss = Math.ceil(loss / 2);
    loss = Math.min(loss, loserPoints); // 0 아래로는 안 내려감

    // 연승 보너스도 기준 LP에 비례 (기준 25일 때 +3/+5/+8)
    var rawBonus = s.streakBonus ? streakBonusFor((winnerStreak || 0) + 1) : 0;
    var bonus = rawBonus ? Math.max(1, Math.round(rawBonus * base / 25)) : 0;
    var upset = getRank(loserPoints).value - getRank(winnerPoints).value >= 4; // 한 티어 이상 위를 이김
    // 같은 상대 반복 감소: 이긴 쪽이 얻는 LP(보너스 포함)와 진 쪽이 잃는 LP를 같은 비율로 줄인다
    var rm = s.repeatPenalty === false ? 1 : repeatMul(repeat);
    if (rm < 1) {
      gain = Math.max(1, Math.round(gain * rm));
      bonus = Math.round(bonus * rm);
      loss = Math.min(loserPoints, Math.max(loss ? 1 : 0, Math.round(loss * rm)));
    }
    return { gain: gain, bonus: bonus, total: gain + bonus, loss: loss, shield: shield, upset: upset, winChance: eWin, repeat: rm < 1 ? repeat : 0, repeatMul: rm };
  }

  /* 두 사람이 붙었을 때 각자 이기면/지면 얼마인지 */
  /* matches(다시 계산된 기록, 오래된 → 최근)에서 w 가 l 을 연속으로 이긴 횟수 */
  function repeatCount(matches, w, l) {
    var n = 0;
    for (var i = (matches || []).length - 1; i >= 0; i--) {
      var m = matches[i];
      if (m.a === w && m.b === l) n++;
      else if (m.a === l && m.b === w) break;
    }
    return n;
  }
  function preview(a, b, settings, matches) {
    var aWins = calcMatch(a.points, b.points, a.streak > 0 ? a.streak : 0, settings, b.streak < 0 ? -b.streak : 0, repeatCount(matches, a.id, b.id));
    var bWins = calcMatch(b.points, a.points, b.streak > 0 ? b.streak : 0, settings, a.streak < 0 ? -a.streak : 0, repeatCount(matches, b.id, a.id));
    return {
      a: { win: aWins.total, lose: bWins.loss, chance: aWins.winChance, repeat: aWins.repeat, repeatMul: aWins.repeatMul },
      b: { win: bWins.total, lose: aWins.loss, chance: bWins.winChance, repeat: bWins.repeat, repeatMul: bWins.repeatMul }
    };
  }

  /* 최근 대결 기록에서 두 사람이 마지막으로 붙은 뒤 지난 경기 수 */
  function lastMetAgo(matches, idA, idB) {
    for (var i = matches.length - 1, n = 0; i >= 0; i--, n++) {
      var m = matches[i];
      if ((m.a === idA && m.b === idB) || (m.a === idB && m.b === idA)) return n;
    }
    return Infinity;
  }

  function timesMet(matches, idA, idB) {
    var c = 0;
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i];
      if ((m.a === idA && m.b === idB) || (m.a === idB && m.b === idA)) c++;
    }
    return c;
  }

  /* 상대 추천: 비슷한 실력 / 도전 / 처음 붙는 친구 */
  function recommend(player, students, matches, settings) {
    var others = students.filter(function (s) { return s.id !== player.id && !s.away; });
    var boost = (settings && settings.boost) || [];
    var scored = others.map(function (o) {
      var diff = o.points - player.points;
      var ago = lastMetAgo(matches, player.id, o.id);
      var met = timesMet(matches, player.id, o.id);
      // 점수가 가까울수록, 최근에 안 붙었을수록 좋은 상대
      var score = Math.abs(diff);
      if (ago < 3) score += 300;
      else if (ago < 10) score += 80;
      score += met * 15;
      // 선생님이 '추천에 자주'로 고른 친구는 더 앞에 (최근에 붙은 상대여도)
      var boosted = boost.indexOf(o.id) !== -1;
      if (boosted) score = Math.max(0, score - 200);
      return { boosted: boosted, student: o, diff: diff, met: met, ago: ago, score: score, preview: preview(player, o, settings, matches) };
    });

    var close = scored.slice().sort(function (x, y) { return x.score - y.score; }).slice(0, 3);
    var used = {};
    close.forEach(function (c) { used[c.student.id] = true; });

    var challenge = scored
      .filter(function (c) { return c.diff > 0 && !used[c.student.id]; })
      .sort(function (x, y) {
        // 너무 멀지 않은 위쪽 상대 우선 (50~300점 차이가 이상적)
        var dx = Math.abs(x.diff - 150) + (x.ago < 3 ? 300 : 0);
        var dy = Math.abs(y.diff - 150) + (y.ago < 3 ? 300 : 0);
        return dx - dy;
      })
      .slice(0, 2);
    challenge.forEach(function (c) { used[c.student.id] = true; });

    var fresh = scored
      .filter(function (c) { return c.met === 0 && !used[c.student.id]; })
      .sort(function (x, y) { return Math.abs(x.diff) - Math.abs(y.diff); })
      .slice(0, 2);

    // 그래도 안 보이면 호적수 마지막 자리에 넣는다
    var shown = close.concat(challenge, fresh).some(function (c) { return c.boosted; });
    var extra = scored.filter(function (c) { return c.boosted; }).sort(function (x, y) { return x.score - y.score; })[0];
    if (!shown && extra) { if (close.length >= 3) close.pop(); close.push(extra); }
    return { close: close, challenge: challenge, fresh: fresh };
  }

  /* 오늘의 대진표: 점수 순으로 정렬한 뒤 가까운 친구끼리 짝. 최근 상대는 피한다 */
  function autoPair(students, matches) {
    var pool = students.filter(function (s) { return !s.away; })
      .slice().sort(function (a, b) { return b.points - a.points; });
    var pairs = [];
    while (pool.length > 1) {
      var p = pool.shift();
      var best = 0, bestCost = Infinity;
      for (var i = 0; i < Math.min(pool.length, 4); i++) {
        var cost = Math.abs(pool[i].points - p.points) + (lastMetAgo(matches, p.id, pool[i].id) < 5 ? 250 : 0);
        if (cost < bestCost) { bestCost = cost; best = i; }
      }
      pairs.push([p, pool.splice(best, 1)[0]]);
    }
    return { pairs: pairs, rest: pool[0] || null };
  }

  /* 승패 결과를 학생 객체에 반영 (새 객체 반환) */
  function applyResult(winner, loser, settings, repeat) {
    var r = calcMatch(winner.points, loser.points, winner.streak > 0 ? winner.streak : 0, settings, loser.streak < 0 ? -loser.streak : 0, repeat);
    var w = Object.assign({}, winner);
    var l = Object.assign({}, loser);
    w.points += r.total;
    w.wins = (w.wins || 0) + 1;
    w.streak = (w.streak > 0 ? w.streak : 0) + 1;
    w.bestStreak = Math.max(w.bestStreak || 0, w.streak);
    w.peak = Math.max(w.peak || 0, w.points);
    l.points = Math.max(0, l.points - r.loss);
    l.losses = (l.losses || 0) + 1;
    l.streak = (l.streak < 0 ? l.streak : 0) - 1;
    return { winner: w, loser: l, result: r };
  }

  /* 경기 기록(원본)을 시간 순서대로 다시 계산해 모든 선수 점수와 경기별 결과를 만든다.
     기록을 고치거나 지워도 이것만 다시 돌리면 된다. */
  /* adjusts: 선생님이 직접 더하거나 뺀 LP [{id, p: 이름, d: +/-LP, note, t}]. 승패·연승에는 영향 없음 */
  /* fixed: 점수가 고정된 선수 {id: LP} (선생님 계정) */
  function replay(ids, matches, settings, adjusts, fixed) {
    fixed = fixed || {};
    var s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    setTierScale(s.tierScale);
    var P = {};
    function get(id) {
      // 시작 LP는 '챌린저 2000 기준' 값이라 티어 구간 배율을 곱한다
      // 지난 시즌 이월: carry[이름] = 시작 LP(챌린저 2000 기준)
      var c0 = s.carry && s.carry[id] != null ? s.carry[id] : s.startPoints || 0;
      var st0 = Math.round(c0 * (Number(s.tierScale) || 1));
      if (!P[id]) P[id] = { id: id, points: id in fixed ? fixed[id] : st0, wins: 0, losses: 0, streak: 0, bestStreak: 0, peak: st0, adjusted: 0 };
      return P[id];
    }
    (ids || []).forEach(get);
    var events = (matches || []).map(function (m) { return { k: 'm', v: m }; })
      .concat((adjusts || []).map(function (a) { return { k: 'j', v: a }; }))
      .sort(function (x, y) { return x.v.t - y.v.t || (x.v.id < y.v.id ? -1 : 1); });
    var results = [], adj = [], rep = {}; // rep[승자\0패자] = 연속으로 이긴 횟수
    events.forEach(function (e) {
      var m = e.v;
      if (e.k === 'j') {
        if (m.p in fixed) return;
        var p = get(m.p), before = p.points;
        p.points = Math.max(0, p.points + (Number(m.d) || 0));
        p.peak = Math.max(p.peak, p.points);
        p.adjusted += p.points - before;
        adj.push({ id: m.id, p: m.p, d: Number(m.d) || 0, note: m.note || '', t: m.t, before: before, after: p.points });
        return;
      }
      var w = get(m.a), l = get(m.b);
      var rk = m.a + '\u0000' + m.b, n = rep[rk] || 0;
      var out = applyResult(w, l, s, n);
      rep[rk] = n + 1; rep[m.b + '\u0000' + m.a] = 0;
      results.push({
        id: m.id, a: m.a, b: m.b, t: m.t, by: m.by, edited: m.edited,
        gain: out.result.total, bonus: out.result.bonus, loss: out.result.loss, shield: out.result.shield, upset: out.result.upset, repeat: out.result.repeat, repeatMul: out.result.repeatMul,
        before: { a: { points: w.points, streak: w.streak }, b: { points: l.points, streak: l.streak } },
        after: { a: out.winner.points, b: out.loser.points }
      });
      Object.assign(w, out.winner); Object.assign(l, out.loser);
      if (w.id in fixed) { w.points = w.peak = fixed[w.id]; results[results.length - 1].after.a = w.points; }
      if (l.id in fixed) { l.points = l.peak = fixed[l.id]; results[results.length - 1].after.b = l.points; }
    });
    return { players: P, matches: results, adjusts: adj };
  }

  /* 이월 시작점: 지난 시즌 최종 티어와 기본 시작 티어 사이에서 rate 만큼 반영 (0이면 모두 같은 출발)
     players: {이름: {points, wins, losses}} (지난 시즌 규칙으로 계산된 값), prevSettings: 지난 시즌 규칙
     돌려주는 값: {이름: 시작 LP(챌린저 2000 기준)}. 경기가 minGames 판 미만이면 기본 시작 */
  function carryStarts(players, prevSettings, rate, baseStart, minGames) {
    var keep = tierScaleNow, out = {};
    rate = rate == null ? 0.5 : Number(rate); minGames = minGames == null ? 3 : minGames;
    setTierScale(1);
    var baseVal = getRank(baseStart || 0).value;
    setTierScale((prevSettings && prevSettings.tierScale) || 1);
    var vals = {};
    Object.keys(players).forEach(function (id) {
      var p = players[id];
      vals[id] = (p.wins || 0) + (p.losses || 0) >= minGames ? getRank(p.points).value : baseVal;
    });
    setTierScale(1);
    Object.keys(vals).forEach(function (id) {
      var v = Math.max(0, Math.round(baseVal + rate * (vals[id] - baseVal)));
      var idx = Math.min(TIERS.length - 1, Math.floor(v / 4)), div = TIERS[idx].divs ? v % 4 : 0;
      out[id] = BASE_MIN[idx] + div * 50;
    });
    setTierScale(keep);
    return out;
  }

  var api;
  api = {
    TIERS: TIERS, DIV_SIZE: DIV_SIZE, ROMAN: ROMAN, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    getRank: getRank, expectedScore: expectedScore, calcMatch: calcMatch, preview: preview,
    recommend: recommend, autoPair: autoPair, applyResult: applyResult, replay: replay, WIN_MUL: WIN_MUL, LOSS_MUL: LOSS_MUL,
    lastMetAgo: lastMetAgo, timesMet: timesMet, repeatCount: repeatCount, repeatMul: repeatMul, setTierScale: setTierScale, carryStarts: carryStarts, tierIndexOf: tierIndexOf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GG = api;
})(this);
