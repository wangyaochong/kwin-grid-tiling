import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);

const testFiles = [
  './unit/list.test.mjs',
  './unit/config.test.mjs',
  './unit/output.test.mjs',
  './unit/desktop.test.mjs',
  './unit/activity.test.mjs',
  './unit/layout.test.mjs',
  './unit/manager.test.mjs',
  './integration/workflow.test.mjs',
  './e2e/lifecycle.test.mjs',
];

for (const file of testFiles) {
  await import(file);
}
