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
  FIREBASE: ({
  apiKey: "AIzaSyAs4VI1JZNxnIWb5wUe5b1k9YbiXxSc7ro",
  authDomain: "sunflower-checklist.firebaseapp.com",
  projectId: "sunflower-checklist",
  storageBucket: "sunflower-checklist.firebasestorage.app",
  messagingSenderId: "339122015370",
  appId: "1:339122015370:web:dbb2579440d18568d67173"
});
  STUDENTS = [
  {id:1,name:"길선균"},{id:2,name:"김시우"},{id:3,name:"김주혁"},{id:4,name:"김지안"},
  {id:5,name:"류승호"},{id:6,name:"박인채"},{id:7,name:"박제이"},{id:8,name:"박준혁"},
  {id:9,name:"박태현"},{id:10,name:"배규연"},{id:11,name:"임순"},{id:12,name:"정한율"},
  {id:13,name:"고예은"},{id:14,name:"김가율"},{id:15,name:"김규빈"},{id:16,name:"김윤재"},
  {id:17,name:"박세아"},{id:18,name:"박예솜"},{id:19,name:"신수아"},{id:20,name:"심해나"},
  {id:21,name:"장하나"},{id:22,name:"정유주"}
];
  TEACHER_PASSWORD: '9494',
  LEAGUE_NAME: '해바라기 리그',
  SEASON: 1
};
