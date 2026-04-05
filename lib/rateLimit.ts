const store = new Map<string, { count: number; resetAt: number }>()

export function isRateLimited(key: string, max = 30, windowMs = 60_000): boolean {
  if (process.env.VITEST) return false

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  entry.count += 1
  return entry.count > max
}

export function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
): Promise<Response> {
  const baseDelay = process.env.VITEST ? 0 : 500
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (err) {
      lastError = err as Error
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * 2 ** attempt))
      }
    }
  }
  throw lastError
}
