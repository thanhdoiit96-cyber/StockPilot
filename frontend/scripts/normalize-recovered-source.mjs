import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import generatorModule from '@babel/generator'

const generate = generatorModule.default || generatorModule

const sourcePath = path.resolve(process.cwd(), 'src/App.jsx')
const source = fs.readFileSync(sourcePath, 'utf8')
const ast = parse(source, {
  sourceType: 'module',
  plugins: ['jsx']
})
const normalized = `${generate(ast, {
  comments: true,
  compact: false,
  retainLines: false,
  jsescOption: { minimal: true }
}, source).code}\n`

if (process.argv.includes('--check')) {
  if (normalized !== source) {
    console.error('Recovered source needs normalization. Run npm run normalize:recovered-source.')
    process.exitCode = 1
  } else {
    console.log('Recovered source is normalized.')
  }
} else {
  fs.writeFileSync(sourcePath, normalized)
  console.log('Normalized frontend/src/App.jsx with Babel AST.')
}
