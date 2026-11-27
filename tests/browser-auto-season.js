// 브라우저 시험: 월요일 자동 새 시즌 (가짜 Firebase). 실행: node tests/browser-auto-season.js (localhost:8765 에 앱이 떠 있어야 함)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const FAKE = require('fs').readFileSync(__dirname + '/fake-firebase-browser.js', 'utf8');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.route('**/firebase-app-compat.js', r => r.fulfill({ contentType: 'text/javascript', body: FAKE }));
  await p.route('**/firebase-firestore-compat.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  // 시작 전: 시즌 3, 어제가 새 시즌 시작일, 경기 20판
  await p.addInitScript(() => {
    window.__seed = function () {
      const db = firebase.firestore(), S = GG_CONFIG.STUDENTS.map(s => s.name);
      const y = new Date(Date.now() - 86400000), ymd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
      db.collection('gonggi_settings').doc('main').set({ season: 3, tierScale: 0.1, pyramid: 0.5, startPoints: 200, eloScale: 300, baseLP: 10, streakBonus: true, lossShield: true, teacherLP: 2000,
        seasonEnd: ymd, nextSeasonAt: ymd, carryRate: 0.5, boost: [S[20], S[7]], history: [{ s: 2, end: '2026-11-13', r: { [S[0]]: { t: '챌린저', v: 36, p: 261, w: 30, l: 0, k: 1 } } }] });
      for (let k = 0; k < 20; k++) db.collection('gonggi_matches').doc('m' + k).set({ a: S[k % 3], b: S[10 + k % 5], t: Date.now() - 3 * 86400000 + k });
      db.collection('gonggi_adjust').doc('j').set({ p: S[1], d: 20, t: Date.now() - 3 * 86400000 });
    };
  });
  await p.goto('http://localhost:8765/#home');
  await p.evaluate(() => new Promise(r => { const t = setInterval(() => { if (window.firebase && window.GG_CONFIG) { clearInterval(t); r(); } }, 20); }));
  await p.evaluate(() => window.__seed());
  await p.waitForTimeout(1200);
  const st = await p.evaluate(() => __fakeCols.gonggi_settings.main);
  console.log('자동 새 시즌 →', '시즌', st.season, '| 종료', st.seasonEnd, '| 다음 자동', st.nextSeasonAt, '| 이월', Object.keys(st.carry || {}).length + '명', '| 역대', st.history.map(h => 'S' + h.s + '(' + Object.keys(h.r).length + '명)').join(' '), '| boost 유지', (st.boost || []).length);
  console.log('남은 경기/LP조정:', await p.evaluate(() => Object.keys(__fakeCols.gonggi_matches || {}).length + '/' + Object.keys(__fakeCols.gonggi_adjust || {}).length));
  console.log('토스트:', await p.textContent('.toast').catch(() => '-'));
  console.log('로비:', (await p.textContent('.hero .eyebrow')).trim());
  // 다시 열어도 또 넘어가지 않음 (같은 페이지에서 재평가)
  // 같은 시즌에서 다시 판단해도 또 넘어가지 않음
  await p.evaluate(() => { location.hash = '#rank'; }); await p.waitForTimeout(300);
  console.log('두 번째 판단 뒤 시즌:', await p.evaluate(() => __fakeCols.gonggi_settings.main.season));
  await p.click('.navlink[href="#history"]'); await p.waitForTimeout(300);
  console.log('역대 시즌 표:', await p.$$eval('h2', h => h.map(x => x.textContent).filter(t => t.includes('역대'))), '| 챔피언 카드', await p.$$eval('.champ-card', x => x.map(c => c.textContent.replace(/\s+/g, ' ').trim())));
  await p.evaluate(() => { location.hash = '#rank'; }); await p.waitForSelector('.board-row'); await p.click('.board-row'); await p.waitForTimeout(200);
  console.log('프로필 역대 칩:', await p.$$eval('.hist-chip', x => x.map(c => c.textContent.trim())));
  console.log('errors', errs); await b.close();
})();
