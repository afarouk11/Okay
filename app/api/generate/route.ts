import { NextRequest, NextResponse } from 'next/server'
import { POST as generateGcse } from '../../../kids/src/app/api/generate-gcse/route'
import { POST as generateIq } from '../../../kids/src/app/api/generate-iq/route'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { type?: string }
  const { type, ...rest } = body

  // Re-create a Request with the remaining body fields for the delegate handler
  const delegateRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(rest),
  })

  if (type === 'gcse') return generateGcse(delegateRequest)
  if (type === 'iq') return generateIq(delegateRequest)

  return NextResponse.json({ error: 'type must be "gcse" or "iq"' }, { status: 400 })
}
