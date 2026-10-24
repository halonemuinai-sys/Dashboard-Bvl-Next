import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

function loadTS(relative) {
  const filename = path.resolve(relative);
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return compiled.exports;
}
const { mediaUrl } = loadTS('src/lib/media.ts');

test('maps AppSheet photo paths to the private media route', () => {
  assert.equal(mediaUrl('Form Profiling_Images/Lucy Chandra , Mrs.Attach.081442.jpg'), '/api/media/Form%20Profiling_Images/Lucy%20Chandra%20%2C%20Mrs.Attach.081442.jpg');
  assert.equal(mediaUrl('Traffic_Images/0026ba8b.Bukti Chat - Appointment.093831.jpg'), '/api/media/Traffic_Images/0026ba8b.Bukti%20Chat%20-%20Appointment.093831.jpg');
});

test('keeps full URLs and rejects empty or unknown values', () => {
  assert.equal(mediaUrl('https://bvl.mogems.co.id/cdn/foto_customer/a.jpg'), 'https://bvl.mogems.co.id/cdn/foto_customer/a.jpg');
  assert.equal(mediaUrl(''), null);
  assert.equal(mediaUrl(null), null);
  assert.equal(mediaUrl('Other_Folder/a.jpg'), null);
  assert.equal(mediaUrl('no-folder.jpg'), null);
});
