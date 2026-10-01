import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const runtimeAssets = [
  'quality-overlay.js',
  'stale-volume-overlay.js'
]

const externalRuntimeAssets = () => {
  let projectRoot = process.cwd()
  let outputDirectory = path.join(projectRoot, 'dist')

  return {
    name: 'external-runtime-assets',
    apply: 'build',
    configResolved(config) {
      projectRoot = config.root
      outputDirectory = path.resolve(config.root, config.build.outDir)
    },
    transformIndexHtml(html) {
      return runtimeAssets.reduce((result, asset) => result.replace(
        `<script type="module" src="/src/runtime/${asset}"></script>`,
        ''
      ), html)
    },
    generateBundle() {
      runtimeAssets.forEach(asset => {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${asset}`,
          source: fs.readFileSync(path.join(projectRoot, 'src', 'runtime', asset), 'utf8')
        })
      })
    },
    closeBundle() {
      const indexPath = path.join(outputDirectory, 'index.html')
      const classicScripts = runtimeAssets.map(asset => `    <script defer src="/assets/${asset}"></script>`).join('\n')
      const html = fs.readFileSync(indexPath, 'utf8')
      const moduleScript = '    <script type="module"'
      const withClassicScripts = html.includes(moduleScript)
        ? html.replace(moduleScript, `${classicScripts}\n${moduleScript}`)
        : html.replace('  </body>', `${classicScripts}\n  </body>`)
      fs.writeFileSync(indexPath, withClassicScripts)
    }
  }
}

export default defineConfig({
  plugins: [react(), externalRuntimeAssets()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:5000'
    }
  }
})
