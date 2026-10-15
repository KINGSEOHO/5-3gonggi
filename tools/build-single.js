// index.html + css + js 를 파일 하나로 합친다: dist/gonggi-legends.html
// 사용: node tools/build-single.js            → dist/gonggi-legends.html (Firebase 연동 포함)
//       node tools/build-single.js --demo 경로 → 문서 뼈대와 Firebase 없이 체험 모드만 (미리보기용)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const inline = (src) => '<script>\n' + read(src) + '</script>';

let html = read('index.html')
  .replace('<link rel="stylesheet" href="css/style.css">', () => '<style>\n' + read('css/style.css') + '</style>');
['js/config.js', 'js/logic.js', 'js/store.js', 'js/avatar.js', 'js/app.js'].forEach((src) => {
  html = html.replace('<script src="' + src + '"></script>', () => inline(src));
});

const i = process.argv.indexOf('--demo');
if (i !== -1) {
  // 미리보기에는 실제 명단·접속 정보를 넣지 않고 체험 모드로만
  html = html.replace(/<!--FIREBASE-->[\s\S]*?<!--\/FIREBASE-->/, '')
    .replace(inline('js/config.js'), () => "<script>window.GG_CONFIG = { FIREBASE: null, STUDENTS: [], DEMO_ONLY: true, LEAGUE_NAME: '해바라기 리그', SEASON: 1 };</script>");
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*/g, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  fs.writeFileSync(process.argv[i + 1], head.trim() + '\n' + body.trim() + '\n');
} else {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'gonggi-legends.html'), html);
  console.log('dist/gonggi-legends.html');
}
