import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import cypress from 'eslint-plugin-cypress'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['cypress/reports/**', 'cypress/snapshots/**', 'node_modules/**', 'templates/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  cypress.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  prettier,
)
