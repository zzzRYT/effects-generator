/**
 * 빌드 타임 패치 파서 진입점 — patches/<rig>/*.md → web/lib/patches.generated.ts.
 *
 * 순수 로직은 lib/parser/ 에 있고, 이 파일은 glob·read·write·exit 만 담당하는 얇은 래퍼다.
 * 검증(docs/parser-contract.md 5규칙) 위반이 하나라도 있으면 stderr 로 전부 출력하고 exit(1)
 * → next build 가 중단된다(잘못된 패치가 조용히 빠지지 않게).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import {
  parseAll,
  buildGuitarRegistry,
  extractCatalog,
  formatError,
  formatWarning,
  extractCatalog,
  type PatchFile,
  type CatalogByProcessor,
  type ProcessorByRig,
} from '../lib/parser';
import { serialize } from '../lib/parser/serialize';

const WEB_DIR = process.cwd();
const REPO_ROOT = resolve(WEB_DIR, '..');
const PATCHES_DIR = resolve(REPO_ROOT, 'patches');
const RIGS_DIR = resolve(REPO_ROOT, 'rigs');
const GUITARS_DIR = resolve(REPO_ROOT, 'models', 'guitars');
const MODELS_DIR = resolve(REPO_ROOT, 'models', 'processors');
const OUTPUT = resolve(WEB_DIR, 'lib', 'patches.generated.ts');

// 디렉터리 바로 아래 *.md 의 내용만(셀렉터 라벨 파생용 rig/기타 모델).
function readMdRaws(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => readFileSync(join(dir, e.name), 'utf8'));
}

// 프로세서별 모델 카탈로그: models/processors/<proc>/{amps,cabs,effects}.md 의 모델명 허용목록(규칙 7).
const CATALOG_FILES = ['amps.md', 'cabs.md', 'effects.md'] as const;

function buildCatalogByProcessor(): CatalogByProcessor {
  const out: Record<string, ReturnType<typeof extractCatalog>> = {};
  if (!existsSync(MODELS_DIR)) return out;
  for (const ent of readdirSync(MODELS_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const texts = CATALOG_FILES.map((f) => join(MODELS_DIR, ent.name, f))
      .filter((p) => existsSync(p))
      .map((p) => readFileSync(p, 'utf8'));
    if (texts.length) out[ent.name] = extractCatalog(texts);
  }
  return out;
}

// rigs/<rig>.md frontmatter 의 rig·processor 로 rig→프로세서 매핑.
function buildProcessorByRig(): ProcessorByRig {
  const out: Record<string, string> = {};
  if (!existsSync(RIGS_DIR)) return out;
  for (const ent of readdirSync(RIGS_DIR, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
    const raw = readFileSync(join(RIGS_DIR, ent.name), 'utf8');
    const rig = /^rig:\s*(.+)$/m.exec(raw)?.[1]?.trim();
    const processor = /^processor:\s*(.+)$/m.exec(raw)?.[1]?.trim();
    if (rig && processor) out[rig] = processor;
  }
  return out;
}

function walkMd(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMd(p));
    else if (ent.isFile() && ent.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function toRepoPath(absPath: string): string {
  return relative(REPO_ROOT, absPath).split(sep).join('/');
}

function main(): void {
  // 패치는 patches/<rig>/<file>.md (rig 하위 폴더). 최상위 INDEX.md 등은 제외.
  const files: PatchFile[] = walkMd(PATCHES_DIR)
    .filter((p) => relative(PATCHES_DIR, p).includes(sep))
    .map((p) => ({ path: toRepoPath(p), raw: readFileSync(p, 'utf8') }));

  // rig + 기타 모델 → 셀렉터 라벨 파생 레지스트리.
  const registry = buildGuitarRegistry(
    readMdRaws(RIGS_DIR),
    readMdRaws(GUITARS_DIR),
  );

  const { songs, errors, warnings } = parseAll(files, registry, {
    catalogByProcessor: buildCatalogByProcessor(),
    processorByRig: buildProcessorByRig(),
  });

  for (const w of warnings) console.warn(formatWarning(w));

  if (errors.length > 0) {
    console.error(
      `\n[gen:patches] 패치 검증 실패 — ${errors.length}건. 빌드를 중단합니다:\n`,
    );
    for (const e of errors) console.error('  ' + formatError(e));
    process.exit(1);
  }

  writeFileSync(OUTPUT, serialize(songs), 'utf8');
  const variations = songs.reduce((n, s) => n + s.variations.length, 0);
  console.log(
    `[gen:patches] ${files.length}파일 → ${songs.length}곡 / ${variations}변주 → lib/patches.generated.ts`,
  );
}

main();
