import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8').replaceAll('\r\n', '\n');

test('regenerating the native menu retains the complete production integration', () => {
 const source = read('src/ui/menu-integration.js').trimEnd();
 const native = read('public/menu/native.js');
 const start = native.indexOf('// Inserted inside the original menu closure');
 const end = native.indexOf('function libraryTab(', start);
 assert.ok(start >= 0 && end > start, 'Published integration boundaries must exist');
 assert.equal(native.slice(start, end).trimEnd(), source);
 // Preserve existing user-visible controls instead of synchronizing to an older template.
 assert.match(source, /sendProduction\('delete-slot',\{slotId:button\.dataset\.productionDelete\}\)/);
 assert.match(source, /data-language-select id="menu-language"/);
 assert.match(source, /resolution:\$\('#production-resolution'\)\.value/);
 assert.match(source, /settings\.resolution\?\?'profile'/);
 assert.match(read('tools/prepare_menu.py'), /integration=\(root\/'src\/ui\/menu-integration\.js'\)\.read_text/);
});
