export interface OpenReportStep {
  name: string
  message: string
  state: string
  screenshot?: string | null
}

export interface OpenReportTest {
  fullTitle: string
  title: string
  state: string
  duration: number
  error?: string | null
  steps?: OpenReportStep[]
}

export interface OpenReportPayload {
  spec: string
  browser?: string
  cypressVersion?: string
  platform?: string
  viewport?: string
  tests: OpenReportTest[]
}

export function writeOpenReport(payload: OpenReportPayload): string
