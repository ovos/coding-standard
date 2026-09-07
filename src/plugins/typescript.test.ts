import assert from 'node:assert/strict';
import { test } from 'node:test';

import { tsRuleTester } from './rule-tester.js';
import plugin, { namingConventionOptions } from './typescript.js';

const rule = plugin.rules['naming-convention'];
const options = namingConventionOptions;

test('plugin is registered under the typescript-js alias', () => {
  assert.equal(plugin.meta.name, 'typescript-js');
});

tsRuleTester.run('typescript-js/naming-convention', rule as never, {
  valid: [
    { code: 'function fetchUser() {}', options },
    { code: 'function UserCard() {}', options },
    { code: 'class Api { getData() {} }', options },
    { code: 'const r = { user_name() {}, __resolveType() {} };', options },
    { code: 'type UserProfile = {}; type UPPER_CASE = {};', options },
    { code: "import okLib from 'ok-lib'; import { some_named } from 'x'; okLib(some_named);", options },
    { code: 'const some_var = 1; const obj: any = {}; obj.some_prop = some_var;', options },
    { code: "const o = { 'quoted.key': 1 };", options },
  ],
  invalid: [
    { code: 'function fetch_user() {}', options, errors: 1 },
    { code: 'class Api { Get_Data() {} }', options, errors: 1 },
    { code: 'const r = { Bad_Method() {} };', options, errors: 1 },
    { code: 'type user_profile = {};', options, errors: 1 },
    { code: "import my_lib from 'my-lib'; my_lib();", options, errors: 1 },
    // quoted keys and function-typed properties count as methods upstream; keep parity
    { code: "const a = { 'x.y': (t: number) => t };", options, errors: 1 },
    { code: 'interface I { Foo: () => void }', options, errors: 1 },
    { code: 'class C { Foo = () => 1; }', options, errors: 1 },
  ],
});
