// docs/03_detail_design/ci_cd_design.md 3章で定めた「デプロイ物検証ステップ」の実装。
// ビルド成果物(dist/)に設計書(docs/)やテスト(tests/)由来のファイルが
// 混入していないことを確認し、混入していればデプロイを失敗させる。
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const DIST_DIR = "dist";
const FORBIDDEN_EXTENSIONS = [".md", ".sql"];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

const files = await walk(DIST_DIR);
const offending = files.filter((f) => FORBIDDEN_EXTENSIONS.some((ext) => f.endsWith(ext)));

if (offending.length > 0) {
  console.error("デプロイ成果物にドキュメント/SQLファイルが混入しています:");
  for (const f of offending) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log(`OK: ${DIST_DIR}/ にドキュメント/SQLファイルの混入はありません (${files.length} files checked)`);
