import test from 'node:test'
import assert from 'node:assert/strict'
import { exitGuidanceLabel, exitGuidanceReason, exitGuidanceTone } from './exitGuidanceView.mjs'

test('presents exit statuses as review-only labels', () => {
  assert.equal(exitGuidanceLabel('cut_loss'), 'Cắt lỗ — cần xem xét')
  assert.equal(exitGuidanceLabel('take_profit_review', 'en'), 'Review partial profit taking')
  assert.equal(exitGuidanceTone('cut_loss'), 'review')
  assert.equal(exitGuidanceTone('hold'), 'neutral')
  assert.equal(exitGuidanceTone('unavailable'), 'unavailable')
})

test('does not invent an explanation for an unknown exit reason', () => {
  assert.match(exitGuidanceReason('unknown_reason'), /Snapshot/)
})
