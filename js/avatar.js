/* 공기 레전드 — 블록 캐릭터 옷장과 그리기
 * look = { skin, face, hair, hairColor, hat, top, shirt, pants, back }
 * unlock = 그 아이템이 열리는 티어 번호(시즌 최고 티어 기준). 0 = 처음부터
 * 티어 번호: 0 아이언, 1 브론즈, 2 실버, 3 골드, 4 플래티넘, 5 에메랄드, 6 다이아몬드, 7 마스터, 8 그랜드마스터, 9 챌린저
 */
(function (root) {
  'use strict';

  var SKINS = ['#f2c94c', '#f6d7b8', '#eab68c', '#c98c5f', '#8f5b3a', '#5e3b25', '#9fd8f0', '#a6e3a1'];
  var HAIR_COLORS = ['#1a1410', '#4a2e1c', '#8a5a2b', '#d9b04a', '#e8e4da', '#c8423d', '#3d72d9', '#b8489a', '#2f9e63'];
  var SHIRTS = ['#c8423d', '#d97a2b', '#d9b23a', '#2f9e63', '#1f9aa0', '#3d72d9', '#6a4fd0', '#b8489a', '#4a5160', '#1a1d24', '#e8e4da', '#7a4e33'];
  var PANTS = ['#2b3446', '#1a1d24', '#3d5a8a', '#5a4a3a', '#e8e4da', '#2f6e4a', '#7a2a35', '#6b6f7a'];

  var FACES = [
    { id: 'smile', name: '미소' }, { id: 'grin', name: '활짝' }, { id: 'happy', name: '싱글벙글' }, { id: 'wink', name: '윙크' },
    { id: 'cool', name: '선글라스' }, { id: 'wow', name: '깜짝' }, { id: 'fierce', name: '불타는 눈썹' }, { id: 'tongue', name: '메롱' },
    { id: 'smug', name: '여유' }, { id: 'sleepy', name: '졸림' }, { id: 'blush', name: '발그레' },
    { id: 'star', name: '반짝 눈', unlock: 4 }, { id: 'glow', name: '각성', unlock: 7 }
  ];
  var HAIRS = [
    { id: 'none', name: '없음' }, { id: 'short', name: '짧은 머리' }, { id: 'spiky', name: '삐죽 머리' }, { id: 'bangs', name: '앞머리' },
    { id: 'long', name: '긴 머리' }, { id: 'ponytail', name: '포니테일' }, { id: 'bun', name: '똥머리' }
  ];
  var HATS = [
    { id: 'none', name: '없음' }, { id: 'cap', name: '야구모자' }, { id: 'beanie', name: '털모자' }, { id: 'headband', name: '머리띠' },
    { id: 'headphones', name: '헤드폰', unlock: 1 }, { id: 'wizard', name: '마법사 모자', unlock: 2 },
    { id: 'crown', name: '왕관', unlock: 7 }, { id: 'horns', name: '마왕의 뿔', unlock: 8 }, { id: 'halo', name: '천사 고리', unlock: 9 }
  ];
  var TOPS = [
    { id: 'plain', name: '기본 티' }, { id: 'stripe', name: '줄무늬' }, { id: 'jersey', name: '번호 유니폼' },
    { id: 'hoodie', name: '후드티', unlock: 1 }, { id: 'suit', name: '정장', unlock: 2 },
    { id: 'armor', name: '기사 갑옷', unlock: 4 }, { id: 'royal', name: '왕족 예복', unlock: 6 }
  ];
  var BACKS = [
    { id: 'none', name: '없음' }, { id: 'backpack', name: '책가방' }, { id: 'cape', name: '망토', unlock: 3 },
    { id: 'sword', name: '전설의 검', unlock: 5 }, { id: 'wings', name: '날개', unlock: 6 }
  ];

  /* 꾸미기 화면 탭 */
  var TABS = [
    { id: 'body', label: '얼굴', rows: [{ key: 'skin', label: '피부', colors: SKINS }, { key: 'face', label: '표정', items: FACES, view: 'head' }] },
    { id: 'hair', label: '머리', rows: [{ key: 'hair', label: '머리 모양', items: HAIRS, view: 'head' }, { key: 'hairColor', label: '머리 색', colors: HAIR_COLORS }] },
    { id: 'hat', label: '모자', rows: [{ key: 'hat', label: '모자', items: HATS, view: 'head' }] },
    { id: 'outfit', label: '옷', rows: [{ key: 'top', label: '상의', items: TOPS, view: 'full' }, { key: 'shirt', label: '상의 색', colors: SHIRTS }, { key: 'pants', label: '하의 색', colors: PANTS }] },
    { id: 'back', label: '등', rows: [{ key: 'back', label: '등 장식', items: BACKS, view: 'full' }] }
  ];
  var ITEMS = { face: FACES, hair: HAIRS, hat: HATS, top: TOPS, back: BACKS };
  var COLORS = { skin: SKINS, hairColor: HAIR_COLORS, shirt: SHIRTS, pants: PANTS };

  function shade(hex, amt) {
    var n = parseInt(String(hex).slice(1), 16);
    if (isNaN(n)) return hex;
    var r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function isLight(hex) {
    var n = parseInt(String(hex).slice(1), 16);
    return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150;
  }

  /* 학생 순번으로 서로 다른 기본 모습 */
  function defaults(i) {
    var faces = ['smile', 'grin', 'happy', 'wink', 'cool', 'fierce', 'smug', 'blush'];
    return {
      skin: SKINS[0], face: faces[(i * 5) % faces.length], hair: ['short', 'spiky', 'bangs', 'long', 'ponytail', 'bun'][i % 6],
      hairColor: HAIR_COLORS[(i * 3) % 4], hat: 'none', top: 'plain', shirt: SHIRTS[i % SHIRTS.length], pants: PANTS[0], back: 'none'
    };
  }
  /* 저장된 값 + 기본값 (예전 버전의 color 필드도 받아 줌) */
  function normalize(saved, i) {
    var look = defaults(i || 0);
    saved = saved || {};
    if (saved.color && !saved.shirt) look.shirt = saved.color;
    Object.keys(look).forEach(function (k) { if (saved[k]) look[k] = saved[k]; });
    return look;
  }
  function findItem(key, id) {
    var list = ITEMS[key] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function isLocked(key, id, tierIndex) {
    var it = findItem(key, id);
    return !!(it && it.unlock && it.unlock > (tierIndex || 0));
  }
  /* 잠긴 아이템을 입고 있으면 기본으로 되돌린 look */
  function allowed(look, tierIndex) {
    var out = Object.assign({}, look);
    Object.keys(ITEMS).forEach(function (k) { if (isLocked(k, out[k], tierIndex)) out[k] = ITEMS[k][0].id; });
    return out;
  }

  /* ───────── 그리기 (20×20 얼굴 좌표) ───────── */
  var INK = '#16130c';
  function face(id) {
    var eyes = '<ellipse cx="7" cy="8" rx="1.2" ry="1.8" fill="' + INK + '"/><ellipse cx="13" cy="8" rx="1.2" ry="1.8" fill="' + INK + '"/>';
    var smile = '<path d="M6.2 12.4 Q10 15.6 13.8 12.4" stroke="' + INK + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    var bigSmile = '<path d="M5.6 11.6 Q10 18 14.4 11.6 Z" fill="' + INK + '"/><path d="M7 12 L13 12 L12.6 13 L7.4 13Z" fill="#fff"/>';
    var arc = function (x) { return '<path d="M' + (x - 1.6) + ' 8.8 Q' + x + ' 6.4 ' + (x + 1.6) + ' 8.8" stroke="' + INK + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>'; };
    var star = function (x) { return '<path d="M' + x + ' 5.4 l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#f2b705" stroke="#8a5a00" stroke-width=".4"/>'; };
    switch (id) {
      case 'grin': return eyes + bigSmile;
      case 'happy': return arc(7) + arc(13) + bigSmile;
      case 'cool': return '<path d="M3.6 6.4h12.8v1.6l-1 2.2h-4l-1.4-1.6-1.4 1.6h-4l-1-2.2z" fill="#0b0b0b"/><path d="M5 7.2h2.4" stroke="#fff" stroke-width=".6" opacity=".7"/>' + smile;
      case 'wink': return '<ellipse cx="7" cy="8" rx="1.2" ry="1.8" fill="' + INK + '"/>' + arc(13) + smile;
      case 'wow': return eyes + '<ellipse cx="10" cy="13.6" rx="1.6" ry="2" fill="' + INK + '"/>';
      case 'fierce': return eyes + '<path d="M4.8 5.2 L8.8 6.7 M15.2 5.2 L11.2 6.7" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/><path d="M7.3 13.4 Q10 12.4 12.7 13.4" stroke="' + INK + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
      case 'tongue': return arc(7) + '<ellipse cx="13" cy="8" rx="1.2" ry="1.8" fill="' + INK + '"/>' + smile + '<path d="M10.2 13.4 h2.6 v1.6 a1.3 1.3 0 0 1 -2.6 0z" fill="#e8577a"/>';
      case 'smug': return eyes + '<path d="M5.4 7 h3.2 M11.4 7 h3.2" stroke="' + INK + '" stroke-width="1.3"/><path d="M7.4 13.2 Q11.4 14.6 14 12" stroke="' + INK + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
      case 'sleepy': return '<path d="M5.6 8.6h2.8 M11.6 8.6h2.8" stroke="' + INK + '" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="10" cy="13.4" rx="1" ry="1.2" fill="' + INK + '"/><text x="15" y="4" font-size="4" font-weight="900" fill="#3d72d9" font-family="sans-serif">z</text>';
      case 'blush': return eyes + smile + '<ellipse cx="4.6" cy="11" rx="1.7" ry="1" fill="#ff7a8a" opacity=".65"/><ellipse cx="15.4" cy="11" rx="1.7" ry="1" fill="#ff7a8a" opacity=".65"/>';
      case 'star': return star(7) + star(13) + bigSmile;
      case 'glow': return '<ellipse cx="7" cy="8" rx="1.8" ry="1.6" fill="#0ac8b9"/><ellipse cx="13" cy="8" rx="1.8" ry="1.6" fill="#0ac8b9"/><ellipse cx="7" cy="8" rx="3" ry="2.6" fill="#0ac8b9" opacity=".3"/><ellipse cx="13" cy="8" rx="3" ry="2.6" fill="#0ac8b9" opacity=".3"/>' +
        '<path d="M4.8 5.2 L8.8 6.4 M15.2 5.2 L11.2 6.4" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/><path d="M7.3 13.4 h5.4" stroke="' + INK + '" stroke-width="1.2" stroke-linecap="round"/>';
      default: return eyes + smile;
    }
  }

  function hair(id, c) {
    var dk = shade(c, -30);
    var top = '<path d="M16 11 V8 a8 8 0 0 1 8-8 h12 a8 8 0 0 1 8 8 v3 h-3 v-4 h-22 v4z" fill="' + c + '"/><path d="M36 0 a8 8 0 0 1 8 8 v3 h-3 v-4 h-5z" fill="' + dk + '" opacity=".6"/>';
    switch (id) {
      case 'short': return top;
      case 'spiky': return '<path d="M16 11 L16 4 L18 -4 L22 1 L25 -6 L29 0 L32 -7 L35 0 L38 -5 L41 1 L44 -2 L44 11 L41 8 L19 8 Z" fill="' + c + '"/><path d="M38 -5 L41 1 L44 -2 L44 11 L41 8 L38 8 Z" fill="' + dk + '" opacity=".6"/>';
      case 'bangs': return '<path d="M16 11 V8 a8 8 0 0 1 8-8 h12 a8 8 0 0 1 8 8 v3 l-3.5 -2.5 l-3.5 2.5 l-3.5 -2.5 l-3.5 2.5 l-3.5 -2.5 l-3.5 2.5 l-3.5 -2.5 l-3.5 2.5 z" fill="' + c + '"/>';
      case 'long': return '<path d="M15 27 V8 a8 8 0 0 1 8-8 h14 a8 8 0 0 1 8 8 v19 h-4 V7 h-22 v20 z" fill="' + c + '"/><path d="M41 7 h4 v20 h-4z" fill="' + dk + '" opacity=".6"/>';
      case 'ponytail': return '<path d="M43 5 q10 2 8 18 q-4 -7 -8 -9 z" fill="' + dk + '"/>' + top;
      case 'bun': return '<circle cx="30" cy="-3" r="5.5" fill="' + c + '"/><circle cx="32" cy="-4.5" r="1.6" fill="#fff" opacity=".2"/>' + top;
      default: return '';
    }
  }

  function hat(id, look) {
    var c = look.shirt;
    switch (id) {
      case 'cap': return '<path d="M15.5 9 a14.5 10 0 0 1 29 0 z" fill="' + c + '"/><path d="M30 -1 a14.5 10 0 0 1 14.5 10 h-8z" fill="#000" opacity=".2"/><ellipse cx="30" cy="9" rx="17" ry="2.6" fill="' + shade(c, -40) + '"/><circle cx="30" cy="-0.6" r="1.4" fill="' + shade(c, -40) + '"/>';
      case 'beanie': return '<path d="M16 10 V6 a14 10 0 0 1 28 0 v4 z" fill="' + c + '"/><rect x="15" y="5" width="30" height="6" rx="2" fill="' + shade(c, -35) + '"/><circle cx="30" cy="-5" r="3.6" fill="' + shade(c, 40) + '"/>';
      case 'headband': return '<rect x="16" y="4.5" width="28" height="4" fill="#e84057"/><path d="M43 5 l8 -4 l-1.5 5.5 l2.5 2.5 z" fill="#c22c42"/>';
      case 'headphones': return '<path d="M15 15 V9 a15 12 0 0 1 30 0 v6" stroke="#1a1d24" stroke-width="3" fill="none"/><rect x="11.5" y="10" width="6.5" height="11" rx="2.5" fill="' + c + '" stroke="#1a1d24" stroke-width="1.5"/><rect x="42" y="10" width="6.5" height="11" rx="2.5" fill="' + c + '" stroke="#1a1d24" stroke-width="1.5"/>';
      case 'wizard': return '<path d="M18 6 L31 -20 L42 6 Z" fill="#4b2a9a"/><path d="M31 -20 L42 6 L35 6 Z" fill="#000" opacity=".2"/><ellipse cx="30" cy="6.5" rx="17" ry="3.5" fill="#3a1f7a"/><path d="M30 -5 l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" fill="#f2c94c"/>';
      case 'crown': return '<path d="M17 7 L17 -6 L23 0 L30 -10 L37 0 L43 -6 L43 7 Z" fill="#f2c94c" stroke="#8a6d1e" stroke-width="1.2" stroke-linejoin="round"/><rect x="17" y="3" width="26" height="4" fill="#d9a520"/><circle cx="30" cy="1" r="2" fill="#e84057"/><circle cx="22.5" cy="3" r="1.4" fill="#3d72d9"/><circle cx="37.5" cy="3" r="1.4" fill="#2f9e63"/>';
      case 'horns':
        var horn = '<path d="M20 5 C 13 0, 11 -7, 15 -15 C 17 -6, 21 -2, 25 2 Z" fill="#2a1418" stroke="#0e0608" stroke-width="1"/><path d="M15 -15 C 14.5 -11, 15 -9, 16.5 -7 L 17.5 -9 Z" fill="#e84057"/>';
        return horn + '<g transform="translate(60 0) scale(-1 1)">' + horn + '</g>';
      case 'halo': return '<ellipse cx="30" cy="-8" rx="13" ry="3.6" fill="none" stroke="#ffe58a" stroke-width="6" opacity=".3"/><ellipse cx="30" cy="-8" rx="13" ry="3.6" fill="none" stroke="#ffe58a" stroke-width="2.4"/>';
      default: return '';
    }
  }

  function back(id, look) {
    switch (id) {
      case 'cape': return '<path d="M13 27 L47 27 L55 82 L5 82 Z" fill="#8b1e2d"/><path d="M30 27 L47 27 L55 82 L30 82 Z" fill="#000" opacity=".2"/>';
      case 'sword': return '<g transform="rotate(-32 30 40)"><rect x="27.5" y="-12" width="5" height="52" fill="#d5dde8" stroke="#6b7a90" stroke-width="1"/><path d="M27.5 -12 L30 -17 L32.5 -12 Z" fill="#d5dde8" stroke="#6b7a90" stroke-width="1"/>' +
        '<rect x="21" y="38" width="18" height="4" rx="1" fill="#c8aa6e" stroke="#785a28" stroke-width="1"/><rect x="28" y="42" width="4" height="10" fill="#5a3a22"/><circle cx="30" cy="53.5" r="2.6" fill="#c8aa6e"/></g>';
      case 'wings':
        var w = '<path d="M17 32 L-10 10 L-7 22 L-14 26 L-6 32 L-12 40 L-2 42 L-6 50 L8 48 L17 48 Z" fill="#eef4ff" stroke="#9fb6d9" stroke-width="1.2" stroke-linejoin="round"/><path d="M17 36 L-4 24 M17 42 L-2 38" stroke="#9fb6d9" stroke-width="1"/>';
        return w + '<g transform="translate(60 0) scale(-1 1)">' + w + '</g>';
      default: return '';
    }
  }

  function top(id, look, no) {
    var c = look.shirt, dk = shade(c, -45), lt = shade(c, 40), out = '';
    switch (id) {
      case 'stripe': out = '<rect x="14" y="31" width="32" height="3.5" fill="' + lt + '"/><rect x="14" y="38" width="32" height="3.5" fill="' + lt + '"/><rect x="14" y="45" width="32" height="3.5" fill="' + lt + '"/>'; break;
      case 'jersey':
        out = '<path d="M24 26 L30 31 L36 26" stroke="' + lt + '" stroke-width="2" fill="none"/>' +
          '<text x="30" y="46" text-anchor="middle" font-family="Rajdhani, Arial, sans-serif" font-weight="700" font-size="14" fill="' + (isLight(c) ? '#1a1d24' : '#ffffff') + '">' + (no || 7) + '</text>';
        break;
      case 'hoodie':
        out = '<path d="M17 26 Q30 36 43 26 L43 30 Q30 40 17 30Z" fill="' + dk + '"/><path d="M27 31 v7 M33 31 v7" stroke="#f0ece2" stroke-width="1.2" stroke-linecap="round"/><rect x="20" y="41" width="20" height="7" rx="2" fill="' + dk + '" opacity=".7"/>';
        break;
      case 'suit':
        out = '<path d="M23 26 L30 41 L37 26 Z" fill="#f2f2f2"/><path d="M29 28.5 h2 l1 9 -2 3 -2 -3z" fill="#c8423d"/><path d="M23 26 L30 41 L26 41 L20 28 Z" fill="' + dk + '"/><path d="M37 26 L30 41 L34 41 L40 28 Z" fill="' + dk + '"/>';
        break;
      case 'armor':
        out = '<rect x="14" y="26" width="32" height="23" rx="2" fill="#a3afc2"/><path d="M30 26 h16 v23 h-16z" fill="#7d899c"/><path d="M19 29 h22 v6 Q30 40 19 35z" fill="#c7d1e0"/><path d="M30 38 v10" stroke="#5f6b7e" stroke-width="1.5"/>' +
          '<rect x="1" y="24" width="15" height="9" rx="3" fill="#c7d1e0" stroke="#5f6b7e" stroke-width="1"/><rect x="44" y="24" width="15" height="9" rx="3" fill="#a3afc2" stroke="#5f6b7e" stroke-width="1"/><circle cx="30" cy="33" r="2.4" fill="' + c + '"/>';
        break;
      case 'royal':
        out = '<rect x="28.5" y="26" width="3" height="23" fill="#e2c46a"/><rect x="14" y="26" width="32" height="3" fill="#e2c46a"/><circle cx="30" cy="35" r="3.2" fill="#e2c46a" stroke="#8a6d1e" stroke-width="1"/><circle cx="30" cy="35" r="1.4" fill="#e84057"/>' +
          '<rect x="3" y="27" width="11" height="4" fill="#e2c46a"/><rect x="46" y="27" width="11" height="4" fill="#e2c46a"/>';
        break;
    }
    return out;
  }

  /* 캐릭터 SVG. mode: 'full' 전신 / 'head' 얼굴과 어깨 */
  function render(look, opts) {
    opts = opts || {};
    var L = look, sk = L.skin || SKINS[0], skd = shade(sk, -30), c = L.shirt || SHIRTS[0], dk = shade(c, -45), lt = shade(c, 25), pn = L.pants || PANTS[0];
    var body =
      back(L.back, L) +
      '<rect x="15" y="54" width="14" height="28" rx="1.5" fill="' + pn + '"/><rect x="31" y="54" width="14" height="28" rx="1.5" fill="' + shade(pn, -18) + '"/>' +
      '<rect x="3" y="27" width="11" height="27" rx="2" fill="' + sk + '"/><rect x="46" y="27" width="11" height="27" rx="2" fill="' + skd + '"/>' +
      '<rect x="3" y="27" width="11" height="11" rx="2" fill="' + lt + '"/><rect x="46" y="27" width="11" height="11" rx="2" fill="' + dk + '"/>' +
      '<rect x="14" y="26" width="32" height="29" rx="2" fill="' + c + '"/><rect x="30" y="26" width="16" height="29" rx="2" fill="' + dk + '" opacity=".35"/>' +
      top(L.top, L, opts.no) +
      '<rect x="14" y="49" width="32" height="6" fill="' + shade(pn, -25) + '"/><rect x="27" y="49" width="6" height="6" fill="#c8aa6e"/>' +
      (L.back === 'backpack' ? '<rect x="17.5" y="26" width="4" height="22" fill="#7a4e33"/><rect x="38.5" y="26" width="4" height="22" fill="#5e3b26"/>' : '') +
      (L.back === 'cape' ? '<rect x="13" y="25" width="34" height="4" rx="1.5" fill="#c8aa6e"/>' : '') +
      '<rect x="24" y="22" width="12" height="6" fill="' + skd + '"/>' +
      '<rect x="17" y="2" width="26" height="23" rx="6" fill="' + sk + '"/><path d="M36 2h1a6 6 0 0 1 6 6v11a6 6 0 0 1-6 6h-1z" fill="#000" opacity=".1"/>' +
      '<g transform="translate(19 3) scale(1.1)">' + face(L.face) + '</g>' +
      hair(L.hair, L.hairColor || HAIR_COLORS[0]) + hat(L.hat, L);
    var vb = opts.mode === 'head' ? '7 -9 46 46' : '-14 -20 88 104';
    var attrs = opts.mode === 'head'
      ? ' width="' + (opts.size || 34) + '" height="' + (opts.size || 34) + '" style="flex-shrink:0;background:linear-gradient(180deg,#1a2338,#0b101b);border:1px solid #2a3550"'
      : ' class="avatar-full"';
    return '<svg viewBox="' + vb + '"' + attrs + ' aria-hidden="true">' + body + '</svg>';
  }

  var api = {
    SKINS: SKINS, HAIR_COLORS: HAIR_COLORS, SHIRTS: SHIRTS, PANTS: PANTS,
    FACES: FACES, HAIRS: HAIRS, HATS: HATS, TOPS: TOPS, BACKS: BACKS, TABS: TABS, ITEMS: ITEMS, COLORS: COLORS,
    defaults: defaults, normalize: normalize, isLocked: isLocked, allowed: allowed, findItem: findItem, render: render
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GGAvatar = api;
})(typeof window !== 'undefined' ? window : globalThis);
