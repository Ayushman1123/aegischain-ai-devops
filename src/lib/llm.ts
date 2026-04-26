const HUGGING_FACE_API_URL = 'https://router.huggingface.co/v1/chat/completions'

const hfApiKey = import.meta.env.VITE_HUGGING_FACE_API_KEY
const hfModel = import.meta.env.VITE_HUGGING_FACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'

function stripCodeFences(text: string) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

async function callHuggingFace(prompt: string): Promise<string> {
  const response = await fetch(HUGGING_FACE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hfApiKey}`,
    },
    body: JSON.stringify({
      model: hfModel,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 900,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Hugging Face request failed (${response.status}): ${details}`)
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Hugging Face response did not include message content')
  }

  return stripCodeFences(content)
}

export async function generateRiskAnalysis(prompt: string): Promise<string> {
  if (hfApiKey) {
    return callHuggingFace(prompt)
  }

  return window.spark.llm(prompt, 'gpt-4o', true)
}

export function getActiveLlmProviderLabel(): string {
  if (hfApiKey) {
    return `Hugging Face (${hfModel})`
  }

  return 'Spark LLM (gpt-4o)'
}
