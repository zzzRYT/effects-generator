export function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function parseTimestamp(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (parts.some((part) => !/^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  const seconds = numbers.at(-1)!;
  const minutes = numbers.at(-2)!;
  const hours = parts.length === 3 ? numbers[0]! : 0;
  if (seconds >= 60 || minutes >= 60) return null;
  return (hours * 3_600 + minutes * 60 + seconds) * 1_000;
}
