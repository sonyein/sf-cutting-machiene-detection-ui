# 스마트팩토리 커팅기 진단 대시보드

Vite + React + TypeScript + Chart.js 기반의 가상 데이터 웹 프로토타입. 현재 프로젝트 루트에 구현했으며 `reference/proposal.pdf` 원본을 유지한다.

## 구현 기능

- **설비 전체:** SVG 구조도의 4개 지점, 핀/목록/범례 선택, 마우스·키보드 툴팁, 전체 HI와 지점 상태, 기간별 HI 추이, 상태 기준 모달, 상세 진단·최근 이력 연결.
- **상세 진단:** 지점별 진동·전류·압력·변위·위치·PLC 센서 탭, 10초/30초/전체 2분 구간, 재생·정지·배속·위치 탐색, 현재 구간 특징값과 예시 기준 비교, HI 추이, 판단 근거·점검 항목·최근 이력.
- **점검 입력:** 지점·원인·조치·결과·상태·날짜·의견·선택적 조치 후 HI, 필수값/길이/날짜/HI 검증, 저장 진행 상태, 저장 오류 시 입력 유지.
- **이력 활용:** 예시 12건과 사용자 입력, 날짜/지점 필터, 페이지 이동, 상세와 HI 비교, 유사 사례, 완료·개선 기록에 근거한 조치 참고 가이드.

모든 화면은 가상 데이터임을 표시한다. 실제 진단 모델·실시간 수집·설비 제어·학습·진단 정확도는 구현하지 않았다.

## 실행

Node.js 24 LTS(24.15 이상) 권장. Node 22는 테스트 도구 호환성을 위해 22.22.2 이상을 사용한다.

```powershell
Set-Location -LiteralPath 'C:\Users\symply_yi\Documents\2026-2 SF\SF_cutting_machine_detection_UI'
npm ci
npm run dev
```

현재 컴퓨터에는 Node/npm이 시스템 PATH에 없어 Codex의 Node 24.21.0과 프로젝트 `.tools/`의 npm을 사용했다. 현재 환경에서는 다음 명령 또는 `scripts/dev.cmd`로 시작한다. 시스템 실행 정책은 변경하지 않는다.

```powershell
.\scripts\dev.cmd
```

- 설비 전체: <http://127.0.0.1:5173/#/>
- 상세 진단 예시: <http://127.0.0.1:5173/#/diagnosis/blade>
- 점검 이력: <http://127.0.0.1:5173/#/history>

포트 5173은 고정한다. 서버가 이미 실행 중이면 그 주소를 사용한다. `npm run preview`는 빌드 결과를 4173에서 확인한다.

## 검증

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:build
```

현재 환경에서는 `powershell -NoProfile -ExecutionPolicy Bypass -File '.\scripts\npm.ps1' run build`처럼 같은 래퍼를 사용한다. 테스트는 끝에 `test`, 그 외 명령은 `run lint`, `run typecheck` 등으로 전달한다.

- 테스트 34개 통과: Node 규칙/특징값/시간/다운샘플링 9개, Vitest 저장소/센서/DOM 흐름/재생 25개.
- ESLint, TypeScript(애플리케이션·설정·테스트), production build 통과.
- 개발 서버 HTTP 200 확인. 빌드 HTML·청크·CSS·폰트가 `/review-repo/` 하위 경로에서 올바르게 해석되는지 정적 검사.
- **검증 한계:** 현재 세션에는 연결된 브라우저가 없어 실제 화면·Chart.js 캔버스·반응형 배치·네이티브 모달의 시각 검수를 수행하지 못했다. DOM 테스트에서는 차트와 dialog API를 대체한다. GitHub 원격 워크플로는 실행하지 않았다.

## 데이터·확장 구조

```text
src/domain/        타입, HI 분류, 특징값, 재생 시간, 기록 검증/검색/가이드
src/data/          설비·이력·점검 항목의 명시적 가상 데이터
src/services/      설비/센서/점검 저장소 어댑터와 캐시
src/hooks/         실제 경과 시간에 맞춘 재생 제어
src/components/    차트, 특징값 표, 배지, 모달
src/pages/         설비 전체, 상세 진단, 점검 이력 (lazy loading)
public/fonts/      공식 Pretendard Unicode 서브셋과 SIL OFL
scripts/           Windows 실행, 폰트 준비, 빌드 경로 검사
.github/workflows/ 검증·GitHub Pages 준비
```

`EquipmentRepository`, `SensorRepository`, `InspectionRepository`를 UI와 분리했다. Python API로 교체할 때 설비/센서는 캐시 어댑터를, 점검은 Promise 기반 `save`와 캐시/구독 인터페이스를 구현하면 된다. 점검 입력 UI는 비동기 저장에 대응한다.

localStorage 키는 `cutting-diagnostics:inspections:v1`, 저장 형식은 `{ version: 1, records: [...] }`이다. 최초에는 예시 이력을 메모리에서 제공하고, 저장 시 사용자 기록과 함께 저장한다. 다른 탭의 storage 이벤트를 반영한다. 읽기 오류·알 수 없는 버전·손상된 기록은 기존 값을 덮어쓰지 않는다. 저장 공간 부족 시 성공으로 표시하지 않는다.

기록은 **동일 브라우저·동일 origin**에서 유지된다. `localhost`, `127.0.0.1`, 포트 변경, 다른 기기 사이에는 공유되지 않는다. 브라우저 데이터 삭제 시 복구되지 않으며 서버 백업은 없다.

## PDF 반영과 가정

- 11~12쪽의 구조도·진단 지점·HI·상태·선택 이동, 13~14쪽의 원신호·특징값·HI·근거, 15~17쪽의 현장 점검 기록·이력 활용을 유지했다.
- HI는 0 정상, 1 이상. 정상 `[0, 0.4)`, 관찰 `[0.4, 0.6)`, 주의 `[0.6, 0.8)`, 위험 `[0.8, 1]`. 경계값은 높은 상태에 포함한다.
- **설비 전체 HI는 4개 지점 HI의 최댓값**이다. 점검 입력이 고정된 예시 진단 결과를 변경하지 않는다.
- HI 예시 기준 시각은 2026-10-13 09:30 KST. 원신호는 별도의 120초 가상 기록이다. 그래프의 시간축을 구분한다.
- 특징값은 현재 표시 구간의 전체 표본에서 계산한다. RMS, 모집단 표준편차, Pearson 첨도 등을 사용한다. 표본이 부족하거나 첨도가 정의되지 않는 상수 신호는 `—`로 표시한다. 예시 비교 기준은 실제 설비에서 검증한 임계값이 아니다.
- 재생은 performance clock과 실제 경과 시간/배속을 사용한다. UI는 약 100ms 간격으로 갱신하며 그래프·특징값·진행 막대가 같은 위치를 사용한다. 탐색·센서 전환·구간 변경·입력 창 열기·숨겨진 탭에서는 정지한다. 종료 후 재생을 누르면 처음부터 시작한다.
- 유사 사례는 동일 지점·원인 키워드 일치 수·최신순으로 찾는다. AI 모델이나 원인 자동 판정이 아니다. 가이드는 조치 완료/상태 개선 기록의 실제 입력 문구를 묶어 근거 이력에 연결한다.
- 구조도는 개념도이며 실제 기구 도면·센서 설치 위치가 아니다.

## 리소스와 성능

페이지·모달·차트를 lazy loading하고 Chart.js를 별도 청크로 분리한다. 센서 데이터는 지점/센서별로 캐시하고, 그래프는 최대 720점의 구간별 최솟값/최댓값 샘플로 표시한다. 특징값 계산에는 다운샘플링한 값을 사용하지 않는다. HI 추이는 최대 160점이다. Chart.js 인스턴스, animation frame, 이벤트 리스너는 언마운트 시 정리한다.

[Pretendard 공식 배포](https://github.com/orioncactus/pretendard) v1.3.9의 **원본 동적 서브셋 92개**를 수정 없이 로컬에 보관했다. CSS의 Unicode 범위에 따라 필요한 폰트 파일을 요청하며 외부 CDN에 의존하지 않는다. 전체 파일 합계는 2,957,724 bytes이며 초기 요청량을 의미하지 않는다. 라이선스는 `public/fonts/OFL.txt`. 필요 시 `python scripts/prepare-fonts.py`로 공식 리소스를 재준비할 수 있다.

빌드의 전체 JS gzip 합계와 리소스 경로는 `npm run verify:build`가 보고한다. 실제 브라우저의 로딩 시간·FPS·메모리는 측정하지 않았으며 성능 개선 수치를 주장하지 않는다.

## GitHub Pages 준비

Vite `base: './'`와 hash 경로로 저장소 하위 경로를 지원한다. [GitHub Pages 공식 가이드](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 참고한 `.github/workflows/pages.yml`을 준비했다.

- push/PR은 설치·타입 검사·lint·테스트·빌드·경로 검증·아티팩트 준비만 수행한다.
- 실제 배포는 별도 승인 후, 저장소 Pages 소스를 GitHub Actions로 설정하고 수동 workflow의 `publish`를 true로 실행할 때만 동작한다. 기본값은 false이다.
- 저장소 생성·원격 push·공개 배포·GitHub API 쓰기는 수행하지 않았다.

디자인 결정은 [DESIGN.md](DESIGN.md)에 정리했다. 전체 UI 최종 검수를 기다리는 상태다.
