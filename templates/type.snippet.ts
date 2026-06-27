// ─────────────────────────────────────────────────────────────────────────────
// TYPE SNIPPET
// Paste into: cypress/support/types.ts (don't copy this file as-is)
// Describes one row of your data/<name>.json so data<TemplateRow[]>('name') is typed.
// ─────────────────────────────────────────────────────────────────────────────
export interface TemplateRow {
  id: string // TODO: a stable key used in the test title
  // TODO: add the fields your JSON rows actually have, e.g.
  // username: string
  // expectSuccess: boolean
  // error?: string
}
