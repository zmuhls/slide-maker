import { test, expect } from './fixtures'
import fs from 'node:fs'
import path from 'node:path'

const API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:3001'

function makeTinyPdf(text = 'Hello PDF for test'): Buffer {
  const header = '%PDF-1.4\n'
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  const streamContent = `BT /F1 12 Tf 100 700 Td (${text}) Tj ET`
  const obj4 = `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'

  const offsets: number[] = []
  let pos = header.length
  for (const obj of [obj1, obj2, obj3, obj4, obj5]) {
    offsets.push(pos)
    pos += Buffer.byteLength(obj, 'utf8')
  }
  const xrefStart = pos

  const entries = ['0000000000 65535 f \n', ...offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`)]
  const xref = `xref\n0 6\n${entries.join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + obj5 + xref, 'utf8')
}

test('uploading a PDF extracts Markdown sidecar for model context', async ({ authedPage, createDeck }) => {
  const { id: deckId } = await createDeck('Doc Extract Deck')

  const buffer = makeTinyPdf()
  const res = await authedPage.request.post(`${API_URL}/api/decks/${deckId}/files`, {
    headers: { origin: 'http://localhost:5173' },
    multipart: {
      file: {
        name: 'sample.pdf',
        mimeType: 'application/pdf',
        buffer,
      },
    },
  })

  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body?.file?.id).toBeTruthy()
  expect(body?.file?.textExtracted).toBeTruthy()

  const fileId: string = body.file.id
  const mdPath = path.join(process.cwd(), 'apps/api/uploads', deckId, `${fileId}.md`)
  expect(fs.existsSync(mdPath)).toBe(true)
  const md = fs.readFileSync(mdPath, 'utf8')
  // Not all parsers keep exact punctuation/spacing; look for a key token
  expect(md.toLowerCase()).toContain('hello')
})

