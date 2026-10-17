import { tr } from './index'

type Parameter = string | number | LocalizedMessage | (() => string)
/** Owned copy retains its identity until rendering, including after an async error. */
export class LocalizedMessage {
  constructor(readonly source: string, readonly parameters: Record<string, Parameter> = {}) {}
  toString(): string {
    const values = Object.fromEntries(Object.entries(this.parameters).map(([key, value]) => [
      key, typeof value === 'function' ? value() : String(value),
    ]))
    return tr(this.source, values)
  }
}
export type DisplayText = string | LocalizedMessage
export const localized = (source: string, parameters: Record<string, Parameter> = {}) => new LocalizedMessage(source, parameters)

export class LocalizedError extends Error {
  constructor(readonly displayText: LocalizedMessage) { super(String(displayText)) }
}
export const localizedError = (source: string, parameters: Record<string, Parameter> = {}) => new LocalizedError(localized(source, parameters))
export const displayError = (text: DisplayText): Error => text instanceof LocalizedMessage ? new LocalizedError(text) : new Error(text)
/** Only our tagged errors are localized; provider/controller diagnostics stay literal. */
export function errorText(cause: unknown, fallback: string): DisplayText {
  return cause instanceof LocalizedError ? cause.displayText : cause instanceof Error ? cause.message : localized(fallback)
}
