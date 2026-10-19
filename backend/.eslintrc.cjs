module.exports = {
  root: true,
  env: { es2022: true, node: true, jest: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'script' },
  ignorePatterns: ['coverage/', 'evidence/', 'node_modules/'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-empty': 'warn',
    'no-control-regex': 'warn',
    'no-useless-escape': 'warn'
  }
}
