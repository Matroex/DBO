import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export function scanSource(source) {
  const keys = [...new Set([...source.matchAll(/["'`](dboidle[_-][a-zA-Z0-9_-]+)["'`]/g)].map(m => m[1]))].sort();
  return {
    keys,
    localStorage: (source.match(/\blocalStorage\b/g) || []).length,
    sessionStorage: (source.match(/\bsessionStorage\b/g) || []).length,
  };
}

export function missingPrefixCandidates(keys, exportedPrefixes) {
  const known = new Set(exportedPrefixes);
  return [...new Set(keys)].filter(k => /^dboidle_.*_$/.test(k) && !known.has(k)).sort();
}

async function filesUnder(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'vendor' || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await filesUnder(path));
    else if (entry.isFile() && /\.js$/.test(entry.name)) found.push(path);
  }
  return found.sort();
}

export async function audit(root) {
  const exportedPrefixes = JSON.parse(await readFile(join(root, 'server/save-prefixes.json'), 'utf8'));
  if (!Array.isArray(exportedPrefixes) || !exportedPrefixes.every(x => typeof x === 'string')) {
    throw new Error('Invalid save-prefixes.json');
  }
  const rootFiles = (await readdir(root, { withFileTypes: true }))
    .filter(e => e.isFile() && /\.js$/.test(e.name)).map(e => join(root, e.name));
  const sources = [...rootFiles, ...await filesUnder(join(root, 'js'))].sort();
  const files = await Promise.all(sources.map(async p => ({
    file: relative(root, p).split('\\').join('/'),
    ...scanSource(await readFile(p, 'utf8')),
  })));
  const allKeys = [...new Set(files.flatMap(f => f.keys))].sort();
  return {
    caveat: 'Static heuristic; candidates require semantic review. Dynamic keys may be missing.',
    files, exportedPrefixes, missingPrefixCandidates: missingPrefixCandidates(allKeys, exportedPrefixes)
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  console.log(JSON.stringify(await audit(root), null, 2));
}
