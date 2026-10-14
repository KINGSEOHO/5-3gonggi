# 공기 레전드 (GONGGI LEGENDS)

우리 반 공기놀이 랭크 리그. 친구와 대결해 이기면 LP를 얻고, 리그 오브 레전드처럼 아이언부터 챌린저까지 티어가 올라갑니다.
**해바라기반 체크리스트(5-3check)와 같은 학생 명단·같은 4자리 비밀번호**를 씁니다.

## 어떻게 쓰나요

1. **대결**: 아이들이 스스로 BLUE / RED 선수를 고릅니다. 상대 추천(호적수 · 도전 · 첫 만남)이나 **오늘의 대진표**를 써도 돼요.
2. 공기 대결을 합니다.
3. 이긴 쪽 버튼을 누르면 **진 친구가 자기 비밀번호를 넣어야** 결과가 기록됩니다. (몰래 이긴 걸로 올리는 걸 막아요. 선생님 비밀번호도 통과)
4. 승리 화면에서 LP가 오르고, 승급하면 새 티어 엠블럼이 나옵니다.

- 캐릭터 꾸미기(옷 색, 표정)도 본인 비밀번호가 있어야 해요.
- 비밀번호가 아직 없는 학생은 처음 쓸 때 만들고, 그 비밀번호는 체크리스트에서도 똑같이 쓰여요.
- **선생님 메뉴**: LP 규칙, 결석한 학생 "쉬는 중" 처리, 마지막 대결 취소, 백업, 새 시즌 초기화.

## 체크리스트와 연결하기 (처음 한 번)

`js/config.js`를 열고 체크리스트 `app.js` 맨 위에 있는 내용을 그대로 옮겨 적어요.

```js
window.GG_CONFIG = {
  FIREBASE: { apiKey: "...", authDomain: "...", projectId: "...", ... }, // firebase.initializeApp( ) 괄호 안
  STUDENTS: [{ id: 1, name: "..." }, ...],                               // var STUDENTS = [ ... ]
  TEACHER_PASSWORD: '...',                                                // 체크리스트 관리자 비밀번호
  LEAGUE_NAME: '해바라기 리그',
  SEASON: 1
};
```

비워 두면 **체험 모드**(예시 선수 16명, 비밀번호 모두 `0000`, 이 브라우저에만 저장)로 열려요.

### Firestore 규칙

공기 리그는 같은 Firebase 프로젝트에 컬렉션 3개를 새로 씁니다: `gonggi_players`, `gonggi_matches`, `gonggi_settings`.
비밀번호는 체크리스트의 `studentPins`를 그대로 읽어요.
Firebase 콘솔 → Firestore → 규칙에서 컬렉션별로 막아 두셨다면 아래를 추가해 주세요. (모두 허용으로 되어 있으면 손댈 필요 없어요)

```
match /gonggi_players/{id}  { allow read, write: if true; }
match /gonggi_matches/{id}  { allow read, write: if true; }
match /gonggi_settings/{id} { allow read, write: if true; }
```

## 올리기

GitHub Pages(저장소 Settings → Pages → 브랜치 선택)로 올리면 아이들이 태블릿·컴퓨터 어디서나 같은 기록을 봅니다.
`dist/gonggi-legends.html` 파일 하나로도 열 수 있어요(`npm run build`로 다시 만듦).

## 티어와 LP

| 티어 | LP | 단계 |
| --- | --- | --- |
| 아이언 · 브론즈 · 실버 · 골드 · 플래티넘 · 에메랄드 · 다이아몬드 | 0부터 200씩 | IV → I (단계마다 50) |
| 마스터 | 1400+ | 없음 |
| 그랜드마스터 | 1700+ | 없음 |
| 챌린저 | 2000+ | 없음 |

- 비슷한 실력끼리: 이기면 **+25**, 지면 **−15** (선생님 메뉴에서 변경)
- 낮은 티어가 높은 티어를 이기면 최대 **+50**, 높은 티어는 그만큼 크게 잃음. 높은 쪽이 이기면 최소 +5. (Elo 공식)
- 3연승부터 연승 보너스 +2 … 최대 +10. LP는 0 아래로 안 내려감.

## 개발

```
npm test        # 점수·티어·추천 계산, 저장소(가짜 Firestore) 테스트
npm run build   # dist/gonggi-legends.html
```

- `js/config.js` 연동 설정
- `js/logic.js` 티어·LP·추천·대진표 계산
- `js/store.js` 저장소 (Firestore / 체험용 localStorage)
- `js/app.js` 화면
- `css/style.css` 디자인
