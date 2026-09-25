// One-time recovery of application code (not React/vendor code) from the last
// shipped asset. Preserve pre-recovery files and record the exact input hash.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
if (fs.existsSync(path.join(root, 'recovery/README.md'))) throw new Error('Recovery already completed; edit src instead');
const asset = path.join(root, 'dist/assets/index-DO9E2zle.js');
const input = fs.readFileSync(asset, 'utf8');
const ast = parser.parse(input, { sourceType: 'module' });
const start = ast.program.body.find(node => node.type === 'ClassDeclaration' && node.id.name === 'Re');
const end = ast.program.body.find(node => node.type === 'VariableDeclaration' && node.declarations[0].id.name === 'Ap');
if (!start || !end) throw new Error('Expected application boundaries missing');
const app = parser.parse(input.slice(start.start, end.start), { sourceType: 'module' });
traverse(app, { Program(scope) { scope.scope.rename('$p', 'App'); } });
const directory = path.join(root, 'recovery');
fs.mkdirSync(directory, { recursive: true });
for (const name of ['App.jsx', 'styles.css']) {
  const backup = path.join(directory, `${name}.before-recovery.txt`);
  if (!fs.existsSync(backup)) fs.copyFileSync(path.join(root, 'src', name), backup);
}
fs.writeFileSync(path.join(root, 'src/App.jsx'),
  '// Application recovered from the shipped asset; see recovery/README.md.\n' +
  "import * as I from 'react';\nimport * as s from 'react/jsx-runtime';\n" +
  generate(app, { comments: false, jsescOption: { minimal: true } }).code + '\nexport default App;\n');
const css = fs.readFileSync(path.join(root, 'dist/assets/index-DeH77X5A.css'), 'utf8');
fs.writeFileSync(path.join(root, 'src/styles.css'), esbuild.transformSync(css, { loader: 'css', minify: false }).code);
fs.writeFileSync(path.join(directory, 'README.md'), `# Source recovery\n\nApplication-only source recovered on 2026-09-25 from index-DO9E2zle.js, SHA-256 ${crypto.createHash('sha256').update(input).digest('hex')}. React/vendor code was excluded and replaced by normal package imports. Styles recovered from index-DeH77X5A.css. Original truncated source is retained in this directory. This is formatted compiled application code, not the original JSX; local variable names remain compiled. Subsequent fixes belong in src and must be built normally. Do not patch dist directly.\n`);
