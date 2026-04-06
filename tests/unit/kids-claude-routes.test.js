import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST as generateGcse } from '../../kids/src/app/api/generate-gcse/route.ts'
import { POST as generateIq } from '../../kids/src/app/api/generate-iq/route.ts'

const originalFetch = global.fetch

describe('kids Claude-powered routes', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.ANTHROPIC_API_KEY
    global.fetch = originalFetch
  })

  it('uses the current Claude Haiku model for both kids generators', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: '[{"type":"pattern","question":"Q","options":["1","2","3","4"],"answer":"A","explanation":"Because"}]' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'QUESTION:\nExample question\n\nSOLUTION:\nExample solution' }],
        }),
      })

    const iqResponse = await generateIq(
      new Request('http://localhost/api/generate-iq', {
        method: 'POST',
        body: JSON.stringify({ exerciseType: 'patterns', difficulty: 'medium' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const gcseResponse = await generateGcse(
      new Request('http://localhost/api/generate-gcse', {
        method: 'POST',
        body: JSON.stringify({ topic: 'algebra', tier: 'Higher', marks: '5' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    expect(iqResponse.status).toBe(200)
    expect(gcseResponse.status).toBe(200)

    const models = global.fetch.mock.calls.map(([, options]) => JSON.parse(options.body).model)
    expect(models).toEqual(['claude-haiku-4-5-20251001', 'claude-haiku-4-5-20251001'])
  })
})
