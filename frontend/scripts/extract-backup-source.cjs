const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const inputPath = process.argv[2] || path.join(root, 'dist/assets/index_backup.js');
const outputPath = process.argv[3] || path.join(root, 'src/App.restored.jsx');
const input = fs.readFileSync(inputPath, 'utf8');
const ast = parser.parse(input, { sourceType: 'module' });
const applicationStart = ast.program.body.find(node => node.type === 'ClassDeclaration' && node.id?.name === 'ur');
const renderBoundary = ast.program.body.find(node => node.type === 'VariableDeclaration' && node.declarations.some(item => item.id?.name === 'iv'));
if (!applicationStart || !renderBoundary) throw new Error('Không tìm thấy biên application trong bundle backup');
const body = input.slice(applicationStart.start, renderBoundary.start);
const source = [
  '// Recovered from the user-provided shipped bundle. Do not overwrite this baseline without verification.',
  "import * as D from 'react';",
  "import * as O from 'react/jsx-runtime';",
  body,
  'export default lv;'
].join('\n');
fs.writeFileSync(outputPath, source, 'utf8');
console.log(`Extracted ${path.relative(root, outputPath)} from ${path.relative(root, inputPath)} (${source.length} bytes)`);
