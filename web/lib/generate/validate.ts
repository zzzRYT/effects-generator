// 생성 폼 입력 검증 — 순수. 클라(폼)·서버(API 라우트) 공유. request-form 패턴과 동형.
// 권위: docs/trd/r4-web-rewire.md §2 데이터 흐름 ① 요청 검증

export interface GenerateInput {
  artist: string;
  song: string;
  guitar: string;
  processor: string;
}

export type GenerateErrors = Partial<Record<keyof GenerateInput, string>>;

export const GEN_MAX = { artist: 100, song: 100, guitar: 100, processor: 100 } as const;

/** 4필드 필수 + 길이 상한. trim 후 빈값/초과면 에러. 통과면 {}. */
export function validateGenerate(input: GenerateInput): GenerateErrors {
  const errors: GenerateErrors = {};
  const artist = input.artist.trim();
  const song = input.song.trim();
  const guitar = input.guitar.trim();
  const processor = input.processor.trim();

  if (!artist) errors.artist = "아티스트를 입력하세요";
  else if (artist.length > GEN_MAX.artist) errors.artist = `아티스트는 ${GEN_MAX.artist}자 이내로`;

  if (!song) errors.song = "곡 이름을 입력하세요";
  else if (song.length > GEN_MAX.song) errors.song = `곡 이름은 ${GEN_MAX.song}자 이내로`;

  if (!guitar) errors.guitar = "기타를 선택하세요";
  else if (guitar.length > GEN_MAX.guitar) errors.guitar = `기타명은 ${GEN_MAX.guitar}자 이내로`;

  if (!processor) errors.processor = "멀티이펙터를 선택하세요";
  else if (processor.length > GEN_MAX.processor)
    errors.processor = `멀티이펙터명은 ${GEN_MAX.processor}자 이내로`;

  return errors;
}
