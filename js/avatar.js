/* 공기 레전드 — 블록 캐릭터 옷장과 그리기
 * look = { skin, face, hair, hairColor, hat, top, shirt, pants, back }
 * unlock = 그 아이템이 열리는 티어 번호(시즌 최고 티어 기준). 0 = 처음부터
 * teacher: true 인 아이템은 선생님 계정만 쓸 수 있다
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
    { id: 'cat', name: '고양이 귀' }, { id: 'party', name: '파티 모자' }, { id: 'bunny', name: '토끼 귀', unlock: 1 },
    { id: 'pirate', name: '해적 모자', unlock: 3 },
    { id: 'crown', name: '왕관', unlock: 7 }, { id: 'horns', name: '마왕의 뿔', unlock: 8 }, { id: 'halo', name: '천사 고리', unlock: 9 },
    { id: 'mortarboard', name: '선생님 학사모', teacher: true }
  ];
  var TOPS = [
    { id: 'plain', name: '기본 티' }, { id: 'stripe', name: '줄무늬' }, { id: 'jersey', name: '번호 유니폼' },
    { id: 'hoodie', name: '후드티', unlock: 1 }, { id: 'suit', name: '정장', unlock: 2 },
    { id: 'armor', name: '기사 갑옷', unlock: 4 }, { id: 'royal', name: '왕족 예복', unlock: 6 },
    { id: 'teacher', name: '선생님 카디건', teacher: true }
  ];
  var BACKS = [
    { id: 'none', name: '없음' }, { id: 'backpack', name: '책가방' }, { id: 'cape', name: '망토', unlock: 3 },
    { id: 'jetpack', name: '제트팩', unlock: 4 }, { id: 'sword', name: '전설의 검', unlock: 5 }, { id: 'wings', name: '날개', unlock: 6 }
  ];
  var ACCS = [
    { id: 'none', name: '없음' }, { id: 'glasses', name: '동그란 안경' }, { id: 'scarf', name: '목도리' }, { id: 'bowtie', name: '나비넥타이' },
    { id: 'medal', name: '금메달', unlock: 3 }, { id: 'pointer', name: '선생님 지시봉', teacher: true }
  ];
  /* 오라: 캐릭터 뒤에서 빛나는 효과 */
  var AURAS = [
    { id: 'none', name: '없음' }, { id: 'sparkle', name: '반짝이' }, { id: 'bubble', name: '비눗방울' }, { id: 'hearts', name: '하트', unlock: 1 },
    { id: 'flame', name: '불꽃', unlock: 3 }, { id: 'ice', name: '얼음 결정', unlock: 4 }, { id: 'thunder', name: '번개', unlock: 5 },
    { id: 'galaxy', name: '은하수', unlock: 6 }, { id: 'rainbow', name: '무지개', unlock: 7 }, { id: 'legend', name: '전설의 빛', unlock: 9 },
    { id: 'sage', name: '현자의 오라', teacher: true }
  ];

  /* 꾸미기 화면 탭 */
  var TABS = [
    { id: 'body', label: '얼굴', rows: [{ key: 'skin', label: '피부', colors: SKINS }, { key: 'face', label: '표정', items: FACES, view: 'head' }] },
    { id: 'hair', label: '머리', rows: [{ key: 'hair', label: '머리 모양', items: HAIRS, view: 'head' }, { key: 'hairColor', label: '머리 색', colors: HAIR_COLORS }] },
    { id: 'hat', label: '모자', rows: [{ key: 'hat', label: '모자', items: HATS, view: 'head' }] },
    { id: 'outfit', label: '옷', rows: [{ key: 'top', label: '상의', items: TOPS, view: 'full' }, { key: 'shirt', label: '상의 색', colors: SHIRTS }, { key: 'pants', label: '하의 색', colors: PANTS }] },
    { id: 'acc', label: '장신구', rows: [{ key: 'acc', label: '장신구', items: ACCS, view: 'full' }] },
    { id: 'back', label: '등', rows: [{ key: 'back', label: '등 장식', items: BACKS, view: 'full' }] },
    { id: 'aura', label: '오라', rows: [{ key: 'aura', label: '오라', items: AURAS, view: 'full' }] }
  ];
  var ITEMS = { face: FACES, hair: HAIRS, hat: HATS, top: TOPS, back: BACKS, acc: ACCS, aura: AURAS };
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
      hairColor: HAIR_COLORS[(i * 3) % 4], hat: 'none', top: 'plain', shirt: SHIRTS[i % SHIRTS.length], pants: PANTS[0], back: 'none',
      acc: 'none', aura: 'none'
    };
  }
  /* 선생님 계정의 처음 모습 */
  function teacherDefaults() {
    return Object.assign(defaults(0), { face: 'smile', hair: 'short', hairColor: HAIR_COLORS[0], hat: 'mortarboard', top: 'teacher', shirt: '#2f9e63', acc: 'pointer', aura: 'sage' });
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
  /* teacher = 선생님 계정이면 모든 아이템이 열려 있다 */
  function isLocked(key, id, tierIndex, teacher) {
    var it = findItem(key, id);
    if (!it || teacher) return false;
    return !!(it.teacher || (it.unlock && it.unlock > (tierIndex || 0)));
  }
  /* 잠긴 아이템을 입고 있으면 기본으로 되돌린 look */
  function allowed(look, tierIndex, teacher) {
    var out = Object.assign({}, look);
    Object.keys(ITEMS).forEach(function (k) { if (isLocked(k, out[k], tierIndex, teacher)) out[k] = ITEMS[k][0].id; });
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
      case 'cat':
        var ear = '<path d="M17.5 8 L19 -6 L28 3 Z" fill="' + (look.hairColor || '#4a2e1c') + '"/><path d="M20 4 L20.6 -2.5 L25 2.5 Z" fill="#f4a3b5"/>';
        return ear + '<g transform="translate(60 0) scale(-1 1)">' + ear + '</g>';
      case 'bunny':
        var be = '<ellipse cx="23" cy="-9" rx="3.6" ry="11" fill="#f4f1ea" stroke="#cfc8b8" stroke-width=".8" transform="rotate(-10 23 -9)"/><ellipse cx="23" cy="-8" rx="1.6" ry="8" fill="#f4a3b5" transform="rotate(-10 23 -8)"/>';
        return be + '<g transform="translate(60 0) scale(-1 1)">' + be + '</g>';
      case 'party': return '<path d="M23 5 L31 -18 L38 5 Z" fill="#3d72d9"/><path d="M25.3 -1.5 L35.8 -1.5 M27.6 -8 L33.6 -8" stroke="#f2c94c" stroke-width="2.4"/><circle cx="31" cy="-18" r="2.6" fill="#e84057"/>';
      case 'pirate': return '<path d="M13 9 Q30 -14 47 9 Q30 4 13 9 Z" fill="#14161c"/><path d="M13 9 Q30 4 47 9" stroke="#c8aa6e" stroke-width="1.6" fill="none"/><circle cx="30" cy="0" r="2.6" fill="#f2f2f2"/><path d="M27.5 3.5 L32.5 5.5 M32.5 3.5 L27.5 5.5" stroke="#f2f2f2" stroke-width="1"/>';
      case 'mortarboard': return '<rect x="20" y="0" width="20" height="7" rx="1" fill="#1a1d24"/><path d="M10 0 L30 -7 L50 0 L30 7 Z" fill="#23262e" stroke="#0b0c10" stroke-width=".8"/><circle cx="30" cy="0" r="1.3" fill="#e2c46a"/>' +
        '<path d="M30 0 L45 1 L45 10" stroke="#e2c46a" stroke-width="1.2" fill="none"/><rect x="43.8" y="9" width="2.4" height="5" rx="1" fill="#e2c46a"/>';
      case 'halo': return '<ellipse cx="30" cy="-8" rx="13" ry="3.6" fill="none" stroke="#ffe58a" stroke-width="6" opacity=".3"/><ellipse cx="30" cy="-8" rx="13" ry="3.6" fill="none" stroke="#ffe58a" stroke-width="2.4"/>';
      default: return '';
    }
  }

  function back(id, look) {
    switch (id) {
      case 'cape': return '<path d="M13 27 L47 27 L55 82 L5 82 Z" fill="#8b1e2d"/><path d="M30 27 L47 27 L55 82 L30 82 Z" fill="#000" opacity=".2"/>';
      case 'sword': return '<g transform="rotate(-32 30 40)"><rect x="27.5" y="-12" width="5" height="52" fill="#d5dde8" stroke="#6b7a90" stroke-width="1"/><path d="M27.5 -12 L30 -17 L32.5 -12 Z" fill="#d5dde8" stroke="#6b7a90" stroke-width="1"/>' +
        '<rect x="21" y="38" width="18" height="4" rx="1" fill="#c8aa6e" stroke="#785a28" stroke-width="1"/><rect x="28" y="42" width="4" height="10" fill="#5a3a22"/><circle cx="30" cy="53.5" r="2.6" fill="#c8aa6e"/></g>';
      case 'jetpack':
        var jp = '<rect x="7" y="18" width="9" height="24" rx="4" fill="#9aa6b8" stroke="#5f6b7e" stroke-width="1"/><rect x="7" y="22" width="9" height="3" fill="#e84057"/>' +
          '<path class="fx-flicker" d="M8.5 42 Q11.5 56 14.5 42 Z" fill="#ffb02e"/><path class="fx-flicker" d="M10 42 Q11.5 50 13 42 Z" fill="#fff3b0"/>';
        return jp + '<g transform="translate(60 0) scale(-1 1)">' + jp + '</g>';
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
      case 'teacher':
        out = '<path d="M24 26 L30 34 L36 26 Z" fill="#f4f1ea"/><path d="M23 26 L30 36 L30 55 L14 55 L14 26 Z" fill="' + dk + '" opacity=".55"/><path d="M37 26 L30 36 L30 55 L46 55 L46 26 Z" fill="' + dk + '" opacity=".55"/>' +
          '<circle cx="30" cy="40" r="1" fill="#e2c46a"/><circle cx="30" cy="45" r="1" fill="#e2c46a"/>' +
          '<path d="M22 26 L27 39 M38 26 L33 39" stroke="#3d72d9" stroke-width="1"/><rect x="24" y="38" width="12" height="7" rx="1" fill="#fff" stroke="#c8aa6e" stroke-width=".8"/>' +
          '<text x="30" y="43.6" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="4.6" fill="#1a1d24">선생님</text>';
        break;
      case 'royal':
        out = '<rect x="28.5" y="26" width="3" height="23" fill="#e2c46a"/><rect x="14" y="26" width="32" height="3" fill="#e2c46a"/><circle cx="30" cy="35" r="3.2" fill="#e2c46a" stroke="#8a6d1e" stroke-width="1"/><circle cx="30" cy="35" r="1.4" fill="#e84057"/>' +
          '<rect x="3" y="27" width="11" height="4" fill="#e2c46a"/><rect x="46" y="27" width="11" height="4" fill="#e2c46a"/>';
        break;
    }
    return out;
  }

  /* 장신구 */
  function acc(id, look) {
    switch (id) {
      case 'glasses': return '<circle cx="26.7" cy="11.8" r="3.4" fill="#ffffff" fill-opacity=".15" stroke="#1a1410" stroke-width="1.2"/><circle cx="33.3" cy="11.8" r="3.4" fill="#ffffff" fill-opacity=".15" stroke="#1a1410" stroke-width="1.2"/><path d="M30.1 11.6 h-.2" stroke="#1a1410" stroke-width="1.2"/>';
      case 'scarf': return '<rect x="19" y="22.5" width="22" height="6" rx="3" fill="#c8423d"/><path d="M34 26 L37 40 L32 40 L30.5 27 Z" fill="#a8322e"/><path d="M21 24 h18" stroke="#f2e6d0" stroke-width="1" stroke-dasharray="2 2"/>';
      case 'bowtie': return '<path d="M24 25 L29 27.5 L24 30 Z M36 25 L31 27.5 L36 30 Z" fill="#c8423d"/><rect x="28.6" y="26.2" width="2.8" height="2.6" rx=".6" fill="#8e2420"/>';
      case 'medal': return '<path d="M25 26 L30 36 L35 26" stroke="#3d72d9" stroke-width="2.4" fill="none"/><circle cx="30" cy="39" r="4" fill="#f2c94c" stroke="#a5803f" stroke-width="1"/><path d="M30 36.8 l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" fill="#fff6c8"/>';
      case 'pointer': return '<g transform="rotate(-38 52 50)"><rect x="50.8" y="22" width="2.4" height="32" rx="1" fill="#8a5a2b"/><rect x="50.5" y="19" width="3" height="4" rx="1" fill="#e84057"/></g><circle cx="51.5" cy="51" r="3" fill="' + (look.skin || SKINS[0]) + '"/>';
      default: return '';
    }
  }

  var auid = 0;
  /* 오라 (캐릭터 뒤, 중심 30,42) */
  function aura(id) {
    var g = 'av' + (++auid), out = '';
    var star4 = function (x, y, r, c, d) { return '<path class="fx-twinkle" style="animation-delay:' + d + 's" d="M' + x + ' ' + (y - r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'Z" fill="' + c + '"/>'; };
    switch (id) {
      case 'sparkle':
        return '<circle cx="30" cy="40" r="40" fill="#fff6c8" opacity=".08"/>' + [[2, 10, 4], [60, 6, 5], [-6, 40, 3.5], [66, 38, 4], [4, 70, 3], [58, 72, 4.5], [30, -12, 3.5]].map(function (q, k) { return star4(q[0], q[1], q[2], '#fff3b0', k * 0.3); }).join('');
      case 'bubble':
        return [[0, 20, 5], [62, 14, 4], [-6, 52, 6], [66, 50, 5], [10, 78, 4], [52, 80, 3.5], [30, -10, 4]].map(function (q, k) {
          return '<g class="fx-float" style="animation-delay:' + (k * 0.4) + 's"><circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + q[2] + '" fill="#9fd8f0" fill-opacity=".18" stroke="#c9ecff" stroke-width="1"/><circle cx="' + (q[0] - q[2] / 3) + '" cy="' + (q[1] - q[2] / 3) + '" r="' + (q[2] / 4) + '" fill="#fff" opacity=".8"/></g>';
        }).join('');
      case 'hearts':
        return [[0, 16, 1], [62, 10, .8], [-6, 48, .9], [66, 46, 1.1], [8, 76, .7], [54, 78, .9]].map(function (q, k) {
          return '<path class="fx-float" style="animation-delay:' + (k * 0.5) + 's" transform="translate(' + q[0] + ' ' + q[1] + ') scale(' + q[2] + ')" d="M0 3 C-6 -3 -10 4 0 10 C10 4 6 -3 0 3Z" fill="#ff7a9a" opacity=".85"/>';
        }).join('');
      case 'flame': return flames('#ff5a1f', '#ffb02e', '#ffe680', 1);
      case 'ice':
        out = '<circle cx="30" cy="40" r="42" fill="#9fd8f0" opacity=".1"/><g class="fx-spin">';
        for (var k = 0; k < 8; k++) out += '<path transform="rotate(' + (k * 45) + ' 30 40)" d="M30 -6 L34 2 L30 10 L26 2 Z" fill="#c9f1ff" stroke="#5fb8e0" stroke-width=".8" opacity=".9"/>';
        return out + '</g>';
      case 'thunder':
        var bolt = function (x, flip, d) { return '<path class="fx-flash" style="animation-delay:' + d + 's" transform="translate(' + x + ' 0)' + (flip ? ' scale(-1 1)' : '') + '" d="M0 4 L-8 26 L-1 26 L-9 52 L8 20 L1 20 L8 4 Z" fill="#ffe14d" stroke="#a46bff" stroke-width="1.4"/>'; };
        return '<circle cx="30" cy="40" r="42" fill="#a46bff" opacity=".12"/>' + bolt(-2, false, 0) + bolt(62, true, .6) + bolt(4, false, 1.1).replace('M0 4', 'M0 40');
      case 'galaxy':
        out = '<defs><radialGradient id="' + g + '"><stop offset="0" stop-color="#b78cff" stop-opacity=".7"/><stop offset=".6" stop-color="#4b2a9a" stop-opacity=".35"/><stop offset="1" stop-color="#0b0c20" stop-opacity="0"/></radialGradient></defs>' +
          '<circle cx="30" cy="40" r="46" fill="url(#' + g + ')"/><g class="fx-spin">';
        [[-2, 8], [62, 12], [-8, 50], [68, 58], [14, 82], [50, 84], [30, -8], [8, 30], [56, 28]].forEach(function (q, k) { out += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (k % 3 ? 1 : 1.8) + '" fill="#fff"/>'; });
        return out + '<path d="M30 40 m-36 0 a36 14 0 1 0 72 0 a36 14 0 1 0 -72 0" fill="none" stroke="#d9c2ff" stroke-width=".8" opacity=".6" transform="rotate(-20 30 40)"/></g>';
      case 'rainbow':
        return ['#e84057', '#f28c28', '#f2c94c', '#2fb466', '#3a7bff', '#6a4fd0'].map(function (c, k) {
          var r = 46 - k * 4;
          return '<path d="M' + (30 - r) + ' 46 A' + r + ' ' + r + ' 0 0 1 ' + (30 + r) + ' 46" fill="none" stroke="' + c + '" stroke-width="4" opacity=".8"/>';
        }).join('') + '<circle class="fx-pulse" cx="30" cy="40" r="30" fill="#fff" opacity=".06"/>';
      case 'legend':
        out = '<circle class="fx-pulse" cx="30" cy="40" r="44" fill="#ffd34d" opacity=".18"/><g class="fx-spin">';
        for (var r2 = 0; r2 < 16; r2++) out += '<path transform="rotate(' + (r2 * 22.5) + ' 30 40)" d="M28.5 40 L30 -10 L31.5 40 Z" fill="#fff1b0" opacity=".45"/>';
        return out + '</g>' + star4(-4, 6, 4, '#fff', 0) + star4(64, 10, 5, '#fff', .7) + star4(66, 70, 4, '#fff', 1.2);
      case 'sage':
        out = '<circle class="fx-pulse" cx="30" cy="40" r="44" fill="#2fd28a" opacity=".12"/><g class="fx-spin"><circle cx="30" cy="40" r="40" fill="none" stroke="#e2c46a" stroke-width="1.4" stroke-dasharray="3 5"/>';
        for (var q = 0; q < 12; q++) out += '<rect transform="rotate(' + (q * 30) + ' 30 40)" x="28.5" y="-2.5" width="3" height="5" fill="#e2c46a"/>';
        out += '</g>';
        var book = function (x, y, d) { return '<g class="fx-float" style="animation-delay:' + d + 's"><path d="M' + x + ' ' + y + ' l7 -2 l7 2 v9 l-7 -2 l-7 2 Z" fill="#f4f1ea" stroke="#785a28" stroke-width=".8"/><path d="M' + (x + 7) + ' ' + (y - 2) + ' v9" stroke="#785a28" stroke-width=".8"/></g>'; };
        return out + book(-12, 18, 0) + book(58, 14, .8) + book(-8, 66, 1.4) + book(60, 64, .4);
      default: return '';
    }
  }
  function flames(c1, c2, c3, k) {
    var path = 'M30 -14 Q36 0 42 -6 Q44 8 52 4 Q52 22 60 24 Q56 40 62 50 Q54 60 56 78 L4 78 Q6 60 -2 50 Q4 40 0 24 Q8 22 8 4 Q16 8 18 -6 Q24 0 30 -14Z';
    return '<g class="fx-flicker" style="transform-origin:30px 78px"><path d="' + path + '" fill="' + c1 + '" opacity="' + (.55 * k) + '"/>' +
      '<path d="' + path + '" transform="translate(30 78) scale(.82) translate(-30 -78)" fill="' + c2 + '" opacity="' + (.6 * k) + '"/>' +
      '<path d="' + path + '" transform="translate(30 78) scale(.62) translate(-30 -78)" fill="' + c3 + '" opacity="' + (.55 * k) + '"/></g>';
  }
  /* 연승 효과: 3연승부터 주황 불꽃, 5연승부터 푸른 불꽃 */
  function streakFx(n) {
    if (!n || n < 3) return '';
    return n >= 5 ? flames('#3a7bff', '#5fd0ff', '#e6fbff', 1.15) : flames('#ff4d1f', '#ff9a1f', '#ffd34d', .85);
  }

  /* 캐릭터 SVG. mode: 'full' 전신 / 'head' 얼굴과 어깨 */
  function render(look, opts) {
    opts = opts || {};
    var L = look, sk = L.skin || SKINS[0], skd = shade(sk, -30), c = L.shirt || SHIRTS[0], dk = shade(c, -45), lt = shade(c, 25), pn = L.pants || PANTS[0];
    var full = opts.mode !== 'head';
    var body =
      (full ? streakFx(opts.streak) + aura(L.aura) : '') +
      back(L.back, L) +
      '<rect x="15" y="54" width="14" height="28" rx="1.5" fill="' + pn + '"/><rect x="31" y="54" width="14" height="28" rx="1.5" fill="' + shade(pn, -18) + '"/>' +
      '<rect x="3" y="27" width="11" height="27" rx="2" fill="' + sk + '"/><rect x="46" y="27" width="11" height="27" rx="2" fill="' + skd + '"/>' +
      '<rect x="3" y="27" width="11" height="11" rx="2" fill="' + lt + '"/><rect x="46" y="27" width="11" height="11" rx="2" fill="' + dk + '"/>' +
      '<rect x="14" y="26" width="32" height="29" rx="2" fill="' + c + '"/><rect x="30" y="26" width="16" height="29" rx="2" fill="' + dk + '" opacity=".35"/>' +
      top(L.top, L, opts.no) +
      '<rect x="14" y="49" width="32" height="6" fill="' + shade(pn, -25) + '"/><rect x="27" y="49" width="6" height="6" fill="#c8aa6e"/>' +
      (L.back === 'backpack' ? '<rect x="17.5" y="26" width="4" height="22" fill="#7a4e33"/><rect x="38.5" y="26" width="4" height="22" fill="#5e3b26"/>' : '') +
      (L.back === 'cape' ? '<rect x="13" y="25" width="34" height="4" rx="1.5" fill="#c8aa6e"/>' : '') +
      (L.acc === 'scarf' || L.acc === 'medal' ? acc(L.acc, L) : '') +
      '<rect x="24" y="22" width="12" height="6" fill="' + skd + '"/>' +
      '<rect x="17" y="2" width="26" height="23" rx="6" fill="' + sk + '"/><path d="M36 2h1a6 6 0 0 1 6 6v11a6 6 0 0 1-6 6h-1z" fill="#000" opacity=".1"/>' +
      '<g transform="translate(19 3) scale(1.1)">' + face(L.face) + '</g>' +
      hair(L.hair, L.hairColor || HAIR_COLORS[0]) + hat(L.hat, L) +
      (L.acc === 'glasses' || L.acc === 'bowtie' || L.acc === 'pointer' ? acc(L.acc, L) : '');
    var vb = opts.mode === 'head' ? '7 -9 46 46' : '-14 -20 88 104';
    var attrs = opts.mode === 'head'
      ? ' width="' + (opts.size || 34) + '" height="' + (opts.size || 34) + '" style="flex-shrink:0;background:linear-gradient(180deg,#1a2338,#0b101b);border:1px solid #2a3550"'
      : ' class="avatar-full' + (opts.streak >= 3 ? ' on-streak' : '') + '"';
    return '<svg viewBox="' + vb + '"' + attrs + ' aria-hidden="true">' + body + '</svg>';
  }

  var api = {
    SKINS: SKINS, HAIR_COLORS: HAIR_COLORS, SHIRTS: SHIRTS, PANTS: PANTS,
    FACES: FACES, HAIRS: HAIRS, HATS: HATS, TOPS: TOPS, BACKS: BACKS, ACCS: ACCS, AURAS: AURAS, TABS: TABS, ITEMS: ITEMS, COLORS: COLORS,
    defaults: defaults, teacherDefaults: teacherDefaults, normalize: normalize, isLocked: isLocked, allowed: allowed, findItem: findItem, render: render
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GGAvatar = api;
})(typeof window !== 'undefined' ? window : globalThis);
