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

// Allow `tags` in it()/describe() config for @bahmutov/cy-grep.
declare namespace Cypress {
  interface TestConfigOverrides {
    tags?: string | string[]
  }
  interface SuiteConfigOverrides {
    tags?: string | string[]
  }
}
