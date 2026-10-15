// Apps Script(Code.gs)를 Node에서 돌려 보기 위한 가짜 구글 시트 환경
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function makeEnv() {
  const sheets = {};
  function Sheet(name) {
    this.name = name; this.data = [];
  }
  Sheet.prototype.getLastRow = function () { return this.data.length; };
  Sheet.prototype.appendRow = function (row) { this.data.push(row.map(norm)); };
  Sheet.prototype.deleteRow = function (r) { this.data.splice(r - 1, 1); };
  Sheet.prototype.deleteRows = function (r, n) { this.data.splice(r - 1, n); };
  Sheet.prototype.setFrozenRows = function () {};
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    const sh = this; nr = nr || 1; nc = nc || 1;
    const cell = (i, j) => { while (sh.data.length < r + i) sh.data.push([]); const row = sh.data[r - 1 + i]; return [row, c - 1 + j]; };
    return {
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const rr = sh.data[r - 1 + i] || []; const v = rr[c - 1 + j]; row.push(v === undefined ? '' : v); } out.push(row); } return out; },
      setValues(v) { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { const [row, k] = cell(i, j); row[k] = norm(v[i][j]); } return this; },
      getValue() { return this.getValues()[0][0]; },
      setValue(v) { const [row, k] = cell(0, 0); row[k] = norm(v); return this; },
      clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { const [row, k] = cell(i, j); row[k] = ''; } return this; },
      setFontWeight() { return this; }
    };
  };
  // 시트처럼 "'1234" 는 글자 1234 로 저장
  function norm(v) { return typeof v === 'string' && v[0] === "'" ? v.slice(1) : v; }
  const props = {};
  const env = {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = new Sheet(n)) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 16).replace('T', ' ') },
    Session: { getScriptTimeZone: () => 'Asia/Seoul' },
    console
  };
  vm.createContext(env);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), env);
  return {
    sheets,
    get: (action) => JSON.parse(env.doGet({ parameter: { action } }).text),
    post: (body) => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).text),
    edit: () => env.onEdit()
  };
}
module.exports = makeEnv;
