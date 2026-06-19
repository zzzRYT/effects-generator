# GP-150 톤 빌더

Cort G250 + Valeton GP-150로 곡마다 맞는 기타 사운드를 빠르게 세팅하기 위한 시스템.
곡 이름을 주면 그 곡의 실제 톤을 조사해 GP-150 패치로 매핑하고, 곡별로 라이브러리에 쌓는다.

## 쓰는 법

곡 이름/아티스트를 주면서 톤을 요청하면 `tone-builder` 스킬이 동작한다:

> "Oasis - Wonderwall 톤 만들어줘"

→ 원곡 톤 조사 → GP-150 앰프 매칭 → 풀 체인(앰프+캐비닛+이펙트) + 노브 값 + 픽업 포지션
→ `patches/`에 곡별 파일 저장 → `patches/INDEX.md` 갱신

## 구조

장비를 **모델**로 분리하고, 기타 + 프로세서 **조합(rig)** 을 정의해 패치가 그 rig를 참조하게 한다.
GP-150처럼 여러 기타에서 공통으로 쓰는 장비는 한 번만 정의하고 rig에서 재사용한다.

```
models/
  guitars/
    cort-g250.md          # 기타 모델 — 바디/픽업/셀렉터/픽업 선택 가이드
  processors/
    valeton-gp150/        # 프로세서 모델 (여러 기타에서 공통 사용)
      profile.md          # 개요 + 시그널 체인 규칙
      hardware.md         # 본체 패널·시그널 체인·EXP/CTRL·글로벌 EQ
      amps.md             # 앰프 모델 전체(60여 종) ↔ 기반 앰프 ↔ 노브
      cabs.md             # 캐비넷 모델 전체 ↔ 기반 스피커 ↔ 노브
      effects.md          # 이펙트 블록 전체 ↔ 기반 페달 ↔ 노브
rigs/
  g250-gp150.md           # 조합 정의(기타 + 프로세서). default rig
patches/
  INDEX.md                # 전체 곡 목록 (Rig 컬럼 포함)
  <rig>/<artist>-<song>.md
.claude/skills/tone-builder/SKILL.md
```

레퍼런스는 V1.0.5 영문 온라인 매뉴얼(PDF)에서 추출·정리했다.

### 장비 추가하는 법

- **새 기타**: `models/guitars/<guitar>.md` 추가 → 기존 프로세서와 묶어 `rigs/<guitar>-gp150.md` 생성
- **새 프로세서**: `models/processors/<processor>/` 추가 → `rigs/<guitar>-<processor>.md` 생성
- 패치는 `patches/<rig>/`에 쌓이므로 같은 곡을 여러 조합으로도 만들 수 있다.

## 현재 상태

- [x] 장비 프로파일 (G250 + GP-150)
- [x] 하드웨어/시그널 체인 레퍼런스
- [x] 앰프 모델 레퍼런스 (매뉴얼 전체 추출 완료)
- [x] 캐비넷 모델 레퍼런스
- [x] 이펙트 레퍼런스 (전 모듈 모델/노브 추출 완료)
- [x] tone-builder 스킬
- [ ] 첫 곡으로 검증

## 다음 할 일

곡 이름을 주고 `tone-builder`로 첫 패치를 만들어 레퍼런스 매핑을 검증한다.

## 설계 문서

`docs/plans/2026-06-18-gp150-tone-builder-design.md`
