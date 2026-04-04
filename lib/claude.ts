import Anthropic from '@anthropic-ai/sdk'
import { JARVIS_SYSTEM_PROMPT } from './jarvis'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

export async function sendToClaude(
  messages: Message[],
  systemPrompt?: string,
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt ?? JARVIS_SYSTEM_PROMPT,
    messages,
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}

export async function streamToClaude(
  messages: Message[],
  systemPrompt?: string,
): Promise<ReadableStream<Uint8Array>> {
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt ?? JARVIS_SYSTEM_PROMPT,
    messages,
  })

  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
