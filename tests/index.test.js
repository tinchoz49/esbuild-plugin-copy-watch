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
    assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
  }
})

test('watch', async () => {
  await del(['tests/to', 'tests/from/z'])

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
          { from: ['from/d/**', '!from/d/ignore.txt'], to: 'd' },
          { from: 'from/z/**', to: 'z' }
        ]
      })
    ]
  })

  try {
    await ctx.watch()

    await new Promise(resolve => setTimeout(resolve, 2_000))

    let files = ['to/a/file-a0.txt', 'to/b/file-b0.txt', 'to/c/file-c0.txt', 'to/c/cc/file-cc0.txt', 'to/d/include.txt', 'to/z/test-0.txt', 'to/z/test-1.txt']

    await fs.mkdir('./tests/from/z')

    await Promise.all([
      fs.writeFile('./tests/from/z/test-0.txt', 'content'),
      fs.writeFile('./tests/from/z/test-1.txt', 'content')
    ])

    await new Promise(resolve => setTimeout(resolve, 2_000))

    for (const file of files) {
      assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
    }

    // delete the z/test file

    await fs.unlink('./tests/from/z/test-0.txt')
    await new Promise(resolve => setTimeout(resolve, 2_000))

    files = files.filter(file => file !== 'to/z/test-0.txt')
    for (const file of files) {
      assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
    }

    assert.not.ok(await fs.pathExists(join(__dirname, 'to/z/test-0.txt')))

    await fs.rm('./tests/from/z', {
      recursive: true
    })
    await new Promise(resolve => setTimeout(resolve, 2_000))

    files = files.filter(file => file !== 'to/z/test-1.txt')
    for (const file of files) {
      assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
    }

    assert.not.ok(await fs.pathExists(join(__dirname, 'to/z/test-1.txt')))
    assert.not.ok(await fs.pathExists(join(__dirname, 'to/z')))
  } finally {
    await ctx.dispose()
  }
})

test.run()
