import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORES = ['node_modules', 'dist', 'release', 'vscode-extension', '.git'];

function walk(dir: string, files: string[] = []) {
  for (const name of fs.readdirSync(dir)) {
    if (IGNORES.includes(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (EXTS.includes(path.extname(name))) files.push(full);
  }
  return files;
}

function convert(content: string) {
  // Patterns to replace: ../.. + services|components|hooks|utils|stores|types
  content = content.replace(/from\s+(['"])((?:\.\.\/)+)services\//g, "from $1@/services/");
  content = content.replace(/from\s+(['"])((?:\.\.\/)+)components\//g, "from $1@/components/");
  content = content.replace(/from\s+(['"])((?:\.\.\/)+)hooks\//g, "from $1@/hooks/");
  content = content.replace(/from\s+(['"])((?:\.\.\/)+)utils\//g, "from $1@/utils/");
  content = content.replace(/from\s+(['"])((?:\.\.\/)+)stores\//g, "from $1@/stores/");
  content = content.replace(/from\s+(['"])((?:\.\.\/)+)types\//g, "from $1@/types/");
  // Also jest.mock('@/services/...') -> jest.mock('@/services/...')
  content = content.replace(/jest\.mock\((['"])((?:\.\.\/)+)services\//g, "jest.mock($1@/services/");
  return content;
}

function main() {
  const files = walk(ROOT);
  let changed = 0;
  for (const file of files) {
    // Skip scripts that should remain relative? We consider all code files but avoid scripts that are not TS/JS (we already filter exts)
    const rel = path.relative(ROOT, file);
    // Skip binaries in scripts/helpers we don't want to alter (optional)
    if (rel.startsWith('node_modules')) continue;

    const content = fs.readFileSync(file, 'utf8');
    const out = convert(content);
    if (out !== content) {
      fs.writeFileSync(file, out, 'utf8');
      console.log('Updated:', rel);
      changed++;
    }
  }
  console.log(`Done. Files changed: ${changed}`);
}

main();
