// Ambient declarations for packages that don't ship their own types.
declare module 'cypress-mochawesome-reporter/plugin' {
  const plugin: (on: Cypress.PluginEvents) => void
  export default plugin
}

declare module 'cypress-mochawesome-reporter/register'

declare module '@bahmutov/cy-grep' {
  const registerCyGrep: () => void
  export default registerCyGrep
}

declare module '@bahmutov/cy-grep/src/plugin' {
  const cyGrepPlugin: (config: Cypress.PluginConfigOptions) => Cypress.PluginConfigOptions
  export default cyGrepPlugin
}

declare module 'cypress-mochawesome-reporter/lib' {
  import type { BeforeRunDetails } from 'cypress'
  import type { CypressRunResult, CypressFailedRunResult } from 'cypress'

  export function beforeRunHook(details?: BeforeRunDetails): Promise<void>
  export function afterRunHook(results?: CypressRunResult | CypressFailedRunResult): Promise<void>
}

declare module 'mochawesome-merge'

declare module 'mochawesome-report-generator'

// Allow `tags` in it()/describe() config for @bahmutov/cy-grep.
declare namespace Cypress {
  interface TestConfigOverrides {
    tags?: string | string[]
  }
  interface SuiteConfigOverrides {
    tags?: string | string[]
  }
}
