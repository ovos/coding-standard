import type { Rules } from './core.js';

// custom helpers running tests conditionally, plus hooks, where standalone expects are fine
const additionalTestBlockFunctions = [
  'beforeAll',
  'beforeEach',
  'afterEach',
  'afterAll',
  'testif',
  'itif',
  'testskipif',
  'itskipif',
];

// oxlint's jest plugin, recommended set listed explicitly, with the v3 tweaks
export function jestRules(): Rules {
  return {
    'jest/no-commented-out-tests': 'error',
    'jest/no-deprecated-functions': 'error',
    'jest/no-done-callback': 'error',
    'jest/no-export': 'error',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/no-interpolation-in-snapshots': 'error',
    'jest/no-jasmine-globals': 'error',
    'jest/no-mocks-import': 'error',
    'jest/no-test-prefixes': 'error',
    'jest/valid-describe-callback': 'error',
    'jest/valid-expect': 'error',
    'jest/valid-expect-in-promise': 'error',
    // the recommended set is too strict for us
    'jest/expect-expect': 'off',
    'jest/no-alias-methods': 'off',
    'jest/no-conditional-expect': 'off',
    'jest/no-disabled-tests': 'off',
    // on by default in oxlint's jest plugin but not part of eslint-plugin-jest's recommended set
    'jest/prefer-snapshot-hint': 'off',
    'jest/require-to-throw-message': 'off',
    'jest/no-standalone-expect': ['error', { additionalTestBlockFunctions }],
    // allow titles to be parameterized, using variables or ternaries
    'jest/valid-title': ['error', { ignoreTypeOfDescribeName: true, ignoreTypeOfTestName: true }],
    'no-console': 'error',
  };
}

// @vitest/eslint-plugin recommended listed explicitly, plus the v3 additions (no-focused-tests, no-console)
export function vitestRules(): Rules {
  return {
    'vitest/expect-expect': 'off',
    'vitest/no-commented-out-tests': 'error',
    'vitest/no-identical-title': 'error',
    'vitest/no-import-node-test': 'error',
    'vitest/require-local-test-context-for-concurrent-snapshots': 'error',
    'vitest/valid-describe-callback': 'error',
    'vitest/valid-expect': 'error',
    'vitest/valid-title': ['error', { ignoreTypeOfDescribeName: true }],
    'vitest/prefer-to-be': 'off',
    'vitest/no-focused-tests': 'error',
    // on by default in oxlint's vitest plugin but not part of @vitest/eslint-plugin's recommended set
    'vitest/hoisted-apis-on-top': 'off',
    'vitest/no-conditional-expect': 'off',
    'vitest/no-conditional-tests': 'off',
    'vitest/no-disabled-tests': 'off',
    'vitest/no-standalone-expect': 'off',
    'vitest/prefer-snapshot-hint': 'off',
    'vitest/require-awaited-expect-poll': 'off',
    'vitest/require-mock-type-parameters': 'off',
    'vitest/require-to-throw-message': 'off',
    'vitest/warn-todo': 'off',
    'no-console': 'error',
  };
}

// eslint-plugin-mocha 12 recommended, everything at error, with the v3 tweaks: no-pending-tests off (v3 turned off
// the equivalent no-skipped-tests), no-setup-in-suite off (was no-setup-in-describe; incompatible with mocha-each
// and dynamically generated tests), exclusive tests promoted from warn to error, mocha's own prefer-arrow-callback
// instead of the core one (mocha prefers function expressions for `this` access)
export function mochaRules(): Rules {
  return {
    'mocha/consistent-structure': ['error', { disallowDuplicateHooks: true }],
    'mocha/handle-done-callback': 'error',
    'mocha/no-async-and-done': 'error',
    'mocha/no-async-in-sync-tests': 'error',
    'mocha/no-async-suite': 'error',
    'mocha/no-code-after-done': 'error',
    'mocha/no-conditional-tests': 'error',
    'mocha/no-done-twice': 'error',
    'mocha/no-empty-title': 'error',
    'mocha/no-exclusive-tests': 'error',
    'mocha/no-exports': 'error',
    'mocha/no-identical-title': 'error',
    'mocha/no-mocha-arrows': 'error',
    'mocha/no-nested-tests': 'error',
    'mocha/no-pending-tests': 'off',
    'mocha/no-return-and-done': 'error',
    'mocha/no-setup-in-suite': 'off',
    'mocha/no-top-level-tests': 'error',
    'prefer-arrow-callback': 'off',
    'mocha/prefer-arrow-callback': 'error',
  };
}

// eslint-plugin-playwright flat/recommended promoted to error (errors-only policy), with the same tweaks as jest:
// no-skipped-test, expect-expect and no-conditional-expect off
export function playwrightRules(): Rules {
  return {
    'no-empty-pattern': 'off',
    'playwright/consistent-spacing-between-blocks': 'error',
    'playwright/max-nested-describe': 'error',
    'playwright/missing-playwright-await': 'error',
    'playwright/no-conditional-in-test': 'error',
    'playwright/no-duplicate-hooks': 'error',
    'playwright/no-duplicate-slow': 'error',
    'playwright/no-element-handle': 'error',
    'playwright/no-eval': 'error',
    'playwright/no-focused-test': 'error',
    'playwright/no-force-option': 'error',
    'playwright/no-nested-step': 'error',
    'playwright/no-networkidle': 'error',
    'playwright/no-page-pause': 'error',
    'playwright/no-standalone-expect': 'error',
    'playwright/no-unnecessary-assertions': 'error',
    'playwright/no-unsafe-references': 'error',
    'playwright/no-unused-locators': 'error',
    'playwright/no-useless-await': 'error',
    'playwright/no-useless-not': 'error',
    'playwright/no-wait-for-navigation': 'error',
    'playwright/no-wait-for-selector': 'error',
    'playwright/no-wait-for-timeout': 'error',
    'playwright/prefer-hooks-in-order': 'error',
    'playwright/prefer-hooks-on-top': 'error',
    'playwright/prefer-locator': 'error',
    'playwright/prefer-to-have-count': 'error',
    'playwright/prefer-to-have-length': 'error',
    'playwright/prefer-web-first-assertions': 'error',
    'playwright/valid-describe-callback': 'error',
    'playwright/valid-expect': 'error',
    'playwright/valid-expect-in-promise': 'error',
    'playwright/valid-test-tags': 'error',
    'playwright/valid-title': 'error',
    'playwright/expect-expect': 'off',
    'playwright/no-conditional-expect': 'off',
    'playwright/no-skipped-test': 'off',
  };
}
