import test from 'node:test';

import { assertBaseline, scanJavascriptRoots } from './object-key-policy.js';

test('application object keys remain short lower camel case', async () => {
  assertBaseline('app', await scanJavascriptRoots(['src/js']));
});
