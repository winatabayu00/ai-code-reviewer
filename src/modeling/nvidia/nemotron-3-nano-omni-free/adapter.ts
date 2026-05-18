import { ModelAdapter } from "../../base"
import type { APIRequest, APIResponse } from "../../../types"

function extractJSONFromText(text: string): string {
  const firstBrace = text.indexOf('{')
  if (firstBrace === -1) return ""

  let braceCount = 0
  let lastValid = -1
  for (let i = firstBrace; i < text.length; i++) {
    if (text[i] === '{') braceCount++
    if (text[i] === '}') {
      braceCount--
      if (braceCount === 0) {
        lastValid = i
        break
      }
    }
  }
  if (lastValid === -1) return ""

  let jsonStr = text.substring(firstBrace, lastValid + 1)
  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

  if (!jsonStr.includes('"decision"') && !jsonStr.includes('"issues"')) {
    return ""
  }

  return jsonStr
}

export class NvidiaNemotronAdapter implements ModelAdapter {
  readonly provider = "nvidia" as const
  readonly modelName = "nvidia/nemotron-3-super-120b-a12b:free"

  buildRequest(systemPrompt: string, userContent: string): APIRequest {
    return {
      model: this.modelName,
      temperature: 0,
      maxTokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    }
  }

  extractContent(response: APIResponse): string {
    console.log(response.choices?.[0])
    let content = response.choices?.[0]?.message?.content || ""
    if (content && content.trim().length > 0) {
      if (content.includes('{')) {
        const jsonPart = extractJSONFromText(content)
        if (jsonPart) return jsonPart
      }
      return content
    }

    content = response.choices?.[0]?.message?.reasoning || ""
    if (content && content.includes('{')) {
      const jsonPart = extractJSONFromText(content)
      if (jsonPart) return jsonPart
      return content
    }

    const fullMessage = response.choices?.[0]?.message as any
    if (fullMessage && typeof fullMessage === 'object') {
      for (const key of Object.keys(fullMessage)) {
        const val = fullMessage[key]
        if (typeof val === 'string' && val.includes('{')) {
          const jsonPart = extractJSONFromText(val)
          if (jsonPart) return jsonPart
          return val
        }
      }
    }
    return ""
  }

  getAPIEndpoint(): string {
    return "https://openrouter.ai/api/v1/chat/completions"
  }

  getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ai-code-reviewer"
    }
  }
}