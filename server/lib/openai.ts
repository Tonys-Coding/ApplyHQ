import OpenAI from 'openai'
import { env } from './env'

export const openai = new OpenAI({ apiKey: env.openaiApiKey })

export const MODELS = {
  /** Tailoring, copilot, PDF structuring — quality-sensitive. */
  tailor: env.modelTailor,
  /** Keyword extraction + fit scoring — high-volume, mechanical. */
  fast: env.modelFast,
} as const
