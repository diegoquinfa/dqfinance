import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isAllowedDocumentType, MAX_DOCUMENT_BYTES, mediaType } from './document-rules.ts'

test('PDFs and common images are accepted', () => {
  for (const type of ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']) {
    assert.equal(isAllowedDocumentType(type), true, type)
  }
})

test('parameters and casing do not change the decision', () => {
  assert.equal(mediaType('IMAGE/JPEG; charset=binary'), 'image/jpeg')
  assert.equal(isAllowedDocumentType('image/jpeg; charset=binary'), true)
})

test('other files are refused', () => {
  for (const type of ['text/html', 'application/zip', 'image/svg+xml', '', 'application/pdf.exe']) {
    assert.equal(isAllowedDocumentType(type), false, type)
  }
})

test('the size limit is 10 MB', () => {
  assert.equal(MAX_DOCUMENT_BYTES, 10 * 1024 * 1024)
})
