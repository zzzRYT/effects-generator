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
  gp150-amps.md     # 앰프 모델 ↔ 캐릭터 매핑 (핵심 데이터)
  gp150-effects.md  # 이펙트 블록 캐릭터
patches/
  INDEX.md          # 전체 곡 목록
  <artist>-<song>.md
.claude/skills/tone-builder/SKILL.md
```

## 현재 상태

- [x] 장비 프로파일 (G250 + GP-150)
- [x] 이펙트 레퍼런스
- [x] tone-builder 스킬
- [ ] **앰프 모델 레퍼런스 — GP-150 앰프 목록 입력 대기 중**
- [ ] 첫 곡으로 검증

## 다음 할 일

GP-150 기기/매뉴얼의 **앰프 모델 이름 목록**을 알려주면 `gp150-amps.md`를 채운다.
각 모델의 소리 캐릭터는 검색으로 보강한다.

## 설계 문서

`docs/plans/2026-06-18-gp150-tone-builder-design.md`
