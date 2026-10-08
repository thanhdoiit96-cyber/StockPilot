import test from 'node:test'
import assert from 'node:assert/strict'
import { applyTheme, resolvedTheme, themePreference } from './userTheme.mjs'

test('normalizes and resolves dark, light and system themes', () => {
  assert.equal(themePreference('sepia'), 'system')
  assert.equal(resolvedTheme('system', true), 'dark')
  assert.equal(resolvedTheme('system', false), 'light')
  assert.equal(resolvedTheme('dark', false), 'dark')
})

test('applies accessible theme metadata to the document target', () => {
  const target = { dataset: {}, style: {} }
  assert.equal(applyTheme('light', target, true), 'light')
  assert.deepEqual(target.dataset, { themePreference: 'light', theme: 'light' })
  assert.equal(target.style.colorScheme, 'light')
})
