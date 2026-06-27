// Scaffolds a new test from templates/.
//   npm run new:test -- <Name> [--data]
// Examples:
//   npm run new:test -- Cart            → CartPage.ts + cart.cy.ts
//   npm run new:test -- CheckoutFlow --data
//       → CheckoutFlowPage.ts + checkout-flow.cy.ts (data-driven)
//       + data/checkout-flow.json + CheckoutFlowRow type
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dataDriven = args.includes('--data')
const rawName = args.find((a) => !a.startsWith('-'))

if (!rawName) {
  console.error('Usage: npm run new:test -- <Name> [--data]')
  process.exit(1)
}

const pascal = rawName.charAt(0).toUpperCase() + rawName.slice(1)
const kebab = pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const PageFile = join(ROOT, 'cypress', 'pages', `${pascal}Page.ts`)
const SpecFile = join(ROOT, 'cypress', 'e2e', `${kebab}.cy.ts`)
const DataFile = join(ROOT, 'data', `${kebab}.json`)
const TypesFile = join(ROOT, 'cypress', 'support', 'types.ts')

const created = []
const skipped = []

// Strip the leading banner comment block (everything before the first import).
const body = (file) => {
  const src = readFileSync(join(ROOT, 'templates', file), 'utf8')
  return src.slice(src.indexOf('import'))
}

const write = (path, content) => {
  if (existsSync(path)) return skipped.push(path)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  created.push(path)
}

// 1. Page
write(PageFile, body('Page.template.ts').replaceAll('TemplatePage', `${pascal}Page`))

// 2. Spec
if (dataDriven) {
  write(
    SpecFile,
    body('spec.data-driven.template.ts')
      .replaceAll('TemplatePage', `${pascal}Page`)
      .replaceAll('TemplateRow', `${pascal}Row`)
      .replace("('TODO')", `('${kebab}')`)
      .replace('TODO: feature (data-driven)', `${pascal} (data-driven)`),
  )
  // 3. Data file (seed one row so it runs)
  write(DataFile, JSON.stringify([{ id: 'TC001' }], null, 2) + '\n')
  // 4. Type
  if (existsSync(TypesFile) && !readFileSync(TypesFile, 'utf8').includes(`${pascal}Row`)) {
    appendFileSync(
      TypesFile,
      `\n/** One row of data/${kebab}.json. */\nexport interface ${pascal}Row {\n  id: string // stable key used in the test title\n  // TODO: add the fields your rows actually have\n}\n`,
    )
    created.push(`${TypesFile} (+${pascal}Row)`)
  }
} else {
  write(
    SpecFile,
    body('spec.template.ts')
      .replaceAll('TemplatePage', `${pascal}Page`)
      .replace('TODO: feature name', pascal),
  )
}

console.log(`\n  Scaffolded "${pascal}"${dataDriven ? ' (data-driven)' : ''}:`)
created.forEach((f) => console.log('   + ' + f.replace(ROOT + '/', '')))
skipped.forEach((f) => console.log('   • skipped (exists): ' + f.replace(ROOT + '/', '')))
console.log('\n  Next: fill the TODOs, then `npm run typecheck && npm run lint`.\n')
