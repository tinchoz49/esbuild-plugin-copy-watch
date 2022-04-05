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

test.before(async () => {
  await del(['tests/to'])
})

test('basic', async () => {
  await esbuild.build({
    entryPoints: ['from/index.js'],
    bundle: true,
    absWorkingDir: __dirname,
    target: ['node14'],
    outfile: 'to/out.js',
    watch: true,
    write: false,
    plugins: [
      copy([
        { from: 'from/a', to: 'a' },
        { from: 'from/b/*.txt', to: 'b' },
        { from: 'from/c/**', to: 'c' },
        { from: ['from/d/**', '!from/d/ignore.txt'], to: 'd' }
      ])
    ]
  })

  const files = ['to/a/file-a0.txt', 'to/b/file-b0.txt', 'to/c/file-c0.txt', 'to/c/cc/file-cc0.txt', 'to/d/include.txt']

  for (const file of files) {
    assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${file}`)
  }
})

test.run()
