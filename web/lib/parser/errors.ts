// 파서 진단 타입. gen-patches 래퍼가 모아서 출력하고, 에러가 있으면 빌드를 실패시킨다.

export interface ParseError {
  file: string;
  line: number;
  ruleId: string;
  message: string;
}

export interface ParseWarning {
  file: string;
  line: number;
  message: string;
}

export function formatError(e: ParseError): string {
  return `${e.file}:${e.line} [${e.ruleId}] ${e.message}`;
}

export function formatWarning(w: ParseWarning): string {
  return `${w.file}:${w.line} [warn] ${w.message}`;
}
