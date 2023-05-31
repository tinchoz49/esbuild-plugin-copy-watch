import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'
import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import del from 'del'
import esbuild from 'esbuild'

import copy from '../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const test = suite('Tests')

test('basic', async () => {
  await del(['tests/to'])

  await esbuild.build({
    entryPoints: ['from/index.js'],
    bundle: true,
    absWorkingDir: __dirname,
    target: ['node14'],
    outfile: 'to/out.js',
    write: false,
    plugins: [
      copy({
        paths: [
          { from: 'from/a', to: 'a' },
          { from: 'from/b/*.txt', to: 'b' },
          { from: 'from/c/**', to: 'c' },
          { from: ['from/d/**', '!from/d/ignore.txt'], to: 'd' }
        ]
      })
    ]
  })

  const files = ['to/a/file-a0.txt', 'to/b/file-b0.txt', 'to/c/file-c0.txt', 'to/c/cc/file-cc0.txt', 'to/d/include.txt']

  for (const file of files) {
    assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${file}`)
  }
})

test('watch', async () => {
  await del(['tests/to'])

  const ctx = await esbuild.context({
    entryPoints: ['from/index.js'],
    bundle: true,
    absWorkingDir: __dirname,
    target: ['node14'],
    outfile: 'to/out.js',
    write: false,
    plugins: [
      copy({
        paths: [
          { from: 'from/a', to: 'a' },
          { from: 'from/b/*.txt', to: 'b' },
          { from: 'from/c/**', to: 'c' },
          { from: ['from/d/**', '!from/d/ignore.txt'], to: 'd' }
        ]
      })
    ]
  })

  await ctx.watch()

  await new Promise(resolve => setTimeout(resolve, 2 * 1000))

  const files = ['to/a/file-a0.txt', 'to/b/file-b0.txt', 'to/c/file-c0.txt', 'to/c/cc/file-cc0.txt', 'to/d/include.txt']

  for (const file of files) {
    assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${file}`)
  }

  await ctx.dispose()
})

test.run()
