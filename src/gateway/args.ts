export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const
export type ThinkingLevel = (typeof THINKING_LEVELS)[number]

/** Flags that leave a gateway call with no tools, files, sessions, extensions or extra services. */
export const ISOLATION_FLAGS = [
  "--mode",
  "json",
  "--no-tools",
  "--no-session",
  "--no-extensions",
  "--no-skills",
  "--no-prompt-templates",
  "--no-themes",
  "--no-context-files",
  "--no-mcp",
  "--no-approve",
] as const

/** A Pi model reference without the `:thinking` suffix, which has its own option here. */
const MODEL_REF = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/

export interface GatewayRequest {
  /** Pi model reference written as provider/model. */
  model: string
  thinking?: ThinkingLevel
  systemPrompt?: string
}

export function isThinkingLevel(value: string): value is ThinkingLevel {
  return (THINKING_LEVELS as readonly string[]).includes(value)
}

export function modelRef(model: string): { provider: string; id: string } {
  if (!MODEL_REF.test(model)) {
    throw new Error(`Model must be written as provider/model, got "${model}".`)
  }
  const [provider = "", id = ""] = model.split("/")
  return { provider, id }
}

/** Every gateway call carries the same isolation flags, whatever else the request holds. */
export function piArgs(request: GatewayRequest): string[] {
  modelRef(request.model)
  return [
    "--model",
    request.model,
    ...(request.thinking ? ["--thinking", request.thinking] : []),
    ...(request.systemPrompt ? ["--system-prompt", request.systemPrompt] : []),
    ...ISOLATION_FLAGS,
  ]
}
