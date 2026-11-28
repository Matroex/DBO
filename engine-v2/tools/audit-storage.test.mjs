import test from 'node:test';
import assert from 'node:assert/strict';
import { scanSource, missingPrefixCandidates, audit } from './audit-storage.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('scan deduplicates literal keys and counts references', () => {
  const result = scanSource("localStorage.getItem('dboidle_inventory_v1_'+id); sessionStorage.getItem('dboidle_demo_session_v1'); localStorage.setItem('dboidle_inventory_v1_'+id,'x')");
  assert.deepEqual(result.keys, ['dboidle_demo_session_v1', 'dboidle_inventory_v1_']);
  assert.equal(result.localStorage, 2);
  assert.equal(result.sessionStorage, 1);
});

test('missing prefix candidates are unique and exclude exact non-prefix keys', () => {
  assert.deepEqual(missingPrefixCandidates(['dboidle_known_', 'dboidle_new_', 'dboidle_new_', 'dboidle_session'], ['dboidle_known_']), ['dboidle_new_']);
});

test('audit scans root and js source files but excludes vendor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dbo-audit-'));
  try {
    await mkdir(join(root, 'js', 'vendor'), { recursive: true });
    await mkdir(join(root, 'server'));
    await writeFile(join(root, 'server', 'save-prefixes.json'), '["dboidle_known_"]');
    await writeFile(join(root, 'app.js'), "localStorage.getItem('dboidle_known_')");
    await writeFile(join(root, 'js', 'world.js'), "localStorage.getItem('dboidle_new_')");
    await writeFile(join(root, 'js', 'vendor', 'ignored.js'), "'dboidle_ignored_'");
    const result = await audit(root);
    assert.deepEqual(result.files.map(x => x.file), ['app.js', 'js/world.js']);
    assert.deepEqual(result.missingPrefixCandidates, ['dboidle_new_']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
