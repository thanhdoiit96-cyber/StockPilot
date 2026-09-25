import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const dist = path.join(root, 'dist')
const backup = path.join(root, '.dist-safe-backup')
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this script through npm run build')
const runNpm = script => spawnSync(process.execPath, [npmCli, 'run', script], { cwd: root, stdio: 'inherit' })

fs.rmSync(backup, { recursive: true, force: true })
if (fs.existsSync(dist)) fs.cpSync(dist, backup, { recursive: true })

const build = runNpm('build:raw')
const check = build.status === 0 ? runNpm('check:bundle') : { status: build.status }

if (build.status !== 0 || check.status !== 0) {
  fs.rmSync(dist, { recursive: true, force: true })
  if (fs.existsSync(backup)) fs.cpSync(backup, dist, { recursive: true })
  fs.rmSync(backup, { recursive: true, force: true })
  console.error('Safe build rejected; previous dist was restored.')
  if (build.error || check.error) console.error(build.error || check.error)
  process.exit(build.status || check.status || 1)
}

fs.rmSync(backup, { recursive: true, force: true })
console.log('Safe build accepted.')
