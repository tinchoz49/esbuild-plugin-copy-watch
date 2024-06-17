/**
 * @typedef { import("esbuild").Plugin } Plugin
 */

import path from 'path'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import globParent from 'glob-parent'
import anymatch from 'anymatch'
import isGlob from 'is-glob'

function normalize (pathName) {
  if (path.sep === '/') return pathName
  if (pathName.includes(':\\')) {
    pathName = pathName.split(':')[1]
  }

  return path.posix.normalize(pathName.startsWith('\\\\?\\') ? pathName : pathName.replace(/\\/g, '/'))
}

async function copy (src, dest) {
  return fs.copy(src, dest, {
    dereference: true,
    errorOnExist: false,
    force: true,
    preserveTimestamps: true,
    recursive: true
  }).catch(err => {
    console.error(err)
  })
}

function getStats (src) {
  try {
    return fs.lstatSync(src)
  } catch (err) {
    return null
  }
}

function parseUserPaths (userPaths, absWorkingDir, defaultTo) {
  let paths = []

  userPaths.forEach(({ from, to = defaultTo }) => {
    if (Array.isArray(from)) {
      from.forEach(from => {
        paths.push({ from, to })
      })
      return
    }

    paths.push({ from, to })
  })

  paths = paths.map((props = {}) => {
    let { from, to } = props

    const ignored = from.startsWith('!')
    if (ignored) {
      from = from.slice(1)
    }

    let pattern = from
    let isDirectory = false
    const glob = isGlob(from)
    if (!glob) {
      const fullPath = path.resolve(absWorkingDir, from)
      pattern = normalize(fullPath)
      const stats = getStats(fullPath)
      if (!stats) return null
      if (stats.isDirectory()) {
        // treat as a glob directory
        from = path.posix.join(from, '**')
        isDirectory = true
      }
    }

    return {
      from,
      to: path.resolve(defaultTo, to),
      parent: path.resolve(absWorkingDir, globParent(from)),
      ignored,
      valid: (srcFile, fullPath) => {
        srcFile = normalize(srcFile)
        fullPath = normalize(fullPath)
        if (glob) return anymatch(pattern, srcFile, { dot: true }) || anymatch(pattern, fullPath, { dot: true })
        if (isDirectory) return fullPath.startsWith(`${pattern}/`)
        return fullPath === pattern
      },
      glob
    }
  }).filter(Boolean)

  return {
    paths: paths.filter(({ ignored }) => !ignored),
    ignorePaths: paths.filter(({ ignored }) => ignored).map(({ from }) => from)
  }
}

/**
 * @param {{
 *  paths: Array<{from: string, to: string}>
 *  forceCopyOnRebuild?: boolean
 * }} options
 * @returns {Plugin}
 */
export default function copyPlugin (options) {
  return {
    name: 'copy-watch',
    setup (build) {
      const { paths: userPaths = [], forceCopyOnRebuild = false } = options

      if (userPaths.length === 0) return

      const { absWorkingDir = process.cwd(), outdir, outfile } = build.initialOptions
      const defaultTo = path.resolve(absWorkingDir, outdir || path.dirname(outfile))

      let watcher = null
      const jobs = new Set()
      const { paths, ignorePaths } = parseUserPaths(userPaths, absWorkingDir, defaultTo)

      const getPaths = (srcFile) => {
        const srcPath = path.resolve(absWorkingDir, srcFile)
        const pathOptions = paths.find(pathOptions => pathOptions.valid(srcFile, srcPath))

        if (!pathOptions) return
        let subPath = srcPath.replace(pathOptions.parent, '')
        if (subPath.startsWith(path.sep)) {
          subPath = subPath.slice(1)
        }
        const destPath = path.resolve(pathOptions.to, subPath)
        return { srcPath, destPath }
      }

      const onFile = (srcFile) => {
        const { srcPath, destPath } = getPaths(srcFile)
        const job = copy(srcPath, destPath)
        jobs.add(job)
        job.finally(() => {
          jobs.delete(job)
        })
      }

      const onUnlink = recursive => (srcFile) => {
        const { destPath } = getPaths(srcFile)
        const job = fs.rm(destPath, {
          recursive
        }).catch(() => {})
        jobs.add(job)
        job.finally(() => {
          jobs.delete(job)
        })
      }

      const checkFinish = async () => {
        await Promise.all(Array.from(jobs.values()))
        if (jobs.size === 0) return
        await new Promise(resolve => setTimeout(resolve, 100))
        await checkFinish()
      }

      build.onEnd(async () => {
        if (watcher) {
          if (forceCopyOnRebuild) {
            await watcher.close()
          } else {
            return checkFinish()
          }
        }

        watcher = chokidar.watch(paths.map(pathOptions => pathOptions.from), {
          ignored: ignorePaths,
          cwd: absWorkingDir
        })

        watcher.on('add', onFile)
        watcher.on('change', onFile)
        watcher.on('unlink', onUnlink(false))
        watcher.on('unlinkDir', onUnlink(true))
        await new Promise(resolve => watcher.once('ready', resolve))
        await checkFinish()
      })

      build.onDispose(() => {
        if (!watcher) return
        watcher.close().finally(() => {
          watcher = null
        })
      })
    }
  }
}
