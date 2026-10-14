// index.html + css + js 를 파일 하나로 합친다: dist/gonggi-blox.html
// 사용: node tools/build-single.js [--fragment 출력경로]
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html')
  .replace('<link rel="stylesheet" href="css/style.css">', () => '<style>\n' + read('css/style.css') + '</style>')
  .replace('<script src="js/logic.js"></script>', () => '<script>\n' + read('js/logic.js') + '</script>')
  .replace('<script src="js/app.js"></script>', () => '<script>\n' + read('js/app.js') + '</script>');

const i = process.argv.indexOf('--fragment');
if (i !== -1) {
  // 문서 뼈대 없이 내용만 (호스팅 쪽에서 뼈대를 씌우는 경우)
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*/g, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  fs.writeFileSync(process.argv[i + 1], head.trim() + '\n' + body.trim() + '\n');
} else {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'gonggi-blox.html'), html);
  console.log('dist/gonggi-blox.html');
}
