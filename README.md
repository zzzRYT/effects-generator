# GP-150 톤 빌더

Cort G250 + Valeton GP-150로 곡마다 맞는 기타 사운드를 빠르게 세팅하기 위한 시스템.
곡 이름을 주면 그 곡의 실제 톤을 조사해 GP-150 패치로 매핑하고, 곡별로 라이브러리에 쌓는다.

## 쓰는 법

곡 이름/아티스트를 주면서 톤을 요청하면 `tone-builder` 스킬이 동작한다:

> "Oasis - Wonderwall 톤 만들어줘"

→ 원곡 톤 조사 → GP-150 앰프 매칭 → 풀 체인(앰프+캐비닛+이펙트) + 노브 값 + 픽업 포지션
→ `patches/`에 곡별 파일 저장 → `patches/INDEX.md` 갱신

## 구조

```
reference/
  gear-profile.md   # 내 장비(G250 HSS + GP-150) 고정 스펙 + 픽업/체인 규칙
  gp150-hardware.md # 본체 패널·시그널 체인·EXP/CTRL·글로벌 EQ 운용
  gp150-amps.md     # 앰프 모델 전체(60여 종) ↔ 기반 앰프 ↔ 노브 (핵심 데이터)
  gp150-cabs.md     # 캐비넷 모델 전체 ↔ 기반 스피커 ↔ 노브
  gp150-effects.md  # 이펙트 블록 전체(NR·PRE·WAH·DST·EQ·MOD·DLY·RVB·VOL) ↔ 기반 페달 ↔ 노브
patches/
  INDEX.md          # 전체 곡 목록
  <artist>-<song>.md
.claude/skills/tone-builder/SKILL.md
```

레퍼런스는 V1.0.5 영문 온라인 매뉴얼(PDF)에서 추출·정리했다.

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
