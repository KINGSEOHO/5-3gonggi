/* 공기 블록스 — 해바라기반 체크리스트(5-3check)와 연동 설정
 *
 * 체크리스트 app.js 맨 위에 있는 두 가지를 그대로 복사해 넣으면
 * 같은 학생 명단과 같은 4자리 비밀번호로 공기 리그를 쓸 수 있어요.
 *   1) firebase.initializeApp({ ... }) 괄호 안의 내용  → FIREBASE 에
 *   2) var STUDENTS = [ ... ]                         → STUDENTS 에
 * 선생님 비밀번호도 체크리스트와 같게 맞춰 주세요.
 *
 * FIREBASE 가 비어 있으면 이 컴퓨터에만 저장되는 체험 모드로 열려요.
 */
window.GG_CONFIG = {
  FIREBASE: null, // 예: { apiKey: "...", authDomain: "...", projectId: "...", ... }
  STUDENTS: [],   // 예: [{ id: 1, name: "홍길동" }, { id: 2, name: "김철수" }]
  TEACHER_PASSWORD: '',
  LEAGUE_NAME: '해바라기 리그',
  SEASON: 1
};
