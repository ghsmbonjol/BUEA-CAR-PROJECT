const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'

const DEPRECATED_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
])

export function getGroqModel() {
  const configuredModel = process.env.GROQ_MODEL?.trim()

  if (!configuredModel || DEPRECATED_GROQ_MODELS.has(configuredModel)) {
    return DEFAULT_GROQ_MODEL
  }

  return configuredModel
}

export { DEFAULT_GROQ_MODEL }
