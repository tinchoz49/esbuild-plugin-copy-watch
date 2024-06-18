import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import del from 'del'
import esbuild from 'esbuild'
import fs from 'fs-extra'
import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import copy from '../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const test = suite('Tests')

test.before.each(async () => {
  await del(['tests/to', 'tests/from/index.js', 'tests/from/a/sub', 'tests/from/a/delete.txt'])
  await fs.writeFile('./tests/from/index.js', 'console.log("hello")')
})

test('basic', async () => {
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
          { from: ['from/d/**', '!from/d/ignore.txt'], to: 'd' },
        ],
      }),
    ],
  })

  const files = ['to/a/file-a0.txt', 'to/b/file-b0.txt', 'to/c/file-c0.txt', 'to/c/cc/file-cc0.txt', 'to/d/include.txt']

  for (const file of files) {
    assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
  }
})

test('watch', async () => {
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
        ],
      }),
    ],
  })

  try {
    await ctx.watch()

    await new Promise(resolve => setTimeout(resolve, 2_000))

    let files = [
      'to/a/file-a0.txt',
      'to/a/delete.txt',
      'to/a/sub/delete.txt',
      'to/b/file-b0.txt',
      'to/c/file-c0.txt',
      'to/c/cc/file-cc0.txt',
      'to/d/include.txt',
    ]

    await fs.mkdir('./tests/from/a/sub')

    await Promise.all([
      fs.writeFile('./tests/from/a/delete.txt', 'content'),
      fs.writeFile('./tests/from/a/sub/delete.txt', 'content'),
    ])

    await new Promise(resolve => setTimeout(resolve, 2_000))

    for (const file of files) {
      assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
    }

    // delete the z/test file

    await fs.unlink('./tests/from/a/delete.txt')
    await new Promise(resolve => setTimeout(resolve, 2_000))

    files = files.filter(file => file !== 'to/a/delete.txt')
    for (const file of files) {
      assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
    }

    assert.not.ok(await fs.pathExists(join(__dirname, 'to/a/delete.txt')))

    await fs.rm('./tests/from/a/sub', {
      recursive: true,
    })
    await new Promise(resolve => setTimeout(resolve, 2_000))

    files = files.filter(file => file !== 'to/a/sub/delete.txt')
    for (const file of files) {
      assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
    }

    assert.not.ok(await fs.pathExists(join(__dirname, 'to/a/sub/delete.txt')))
    assert.not.ok(await fs.pathExists(join(__dirname, 'to/a/sub')))
  } finally {
    await ctx.dispose()
  }
})

test('watch forceCopyOnRebuild', async () => {
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
        ],
        forceCopyOnRebuild: true,
      }),
    ],
  })

  try {
    await ctx.watch()

    await new Promise(resolve => setTimeout(resolve, 2_000))

    const files = ['to/a/file-a0.txt']

    for (const file of files) {
      assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
    }

    await fs.unlink('./tests/to/a/file-a0.txt')

    await fs.writeFile('./tests/from/index.js', 'console.log("hello!")')

    await new Promise(resolve => setTimeout(resolve, 2_000))

    for (const file of files) {
      assert.ok(await fs.pathExists(join(__dirname, file)), `Exists: ${join(__dirname, file)}`)
    }
  } finally {
    await ctx.dispose()
  }
})

test.run()
