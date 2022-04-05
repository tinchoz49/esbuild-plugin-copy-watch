import path from 'path'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import globParent from 'glob-parent'
import anymatch from 'anymatch'
import isGlob from 'is-glob'

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

  paths = paths.map(({ from, to }) => {
    const ignored = from.startsWith('!')
    if (ignored) {
      from = from.slice(1)
    }

    let pattern = from
    let isDirectory = false
    const glob = isGlob(from)
    if (!glob) {
      pattern = path.resolve(absWorkingDir, from)
      const stats = getStats(pattern)
      if (!stats) return null
      if (stats.isDirectory()) {
        // treat as a glob directory
        from = path.join(from, '**')
        isDirectory = true
      }
    }

    return {
      from,
      to: path.resolve(defaultTo, to),
      parent: path.resolve(absWorkingDir, globParent(from)),
      ignored,
      valid: (srcFile, fullPath) => {
        if (glob) return anymatch(pattern, srcFile, { dot: true })
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

export default (userPaths = []) => ({
  name: 'copy-watch',
  setup (build) {
    if (userPaths.length === 0) return

    const { absWorkingDir = process.cwd(), outdir, outfile } = build.initialOptions
    const defaultTo = path.resolve(absWorkingDir, outdir || path.dirname(outfile))

    let watcher = null
    const jobs = new Set()
    const { paths, ignorePaths } = parseUserPaths(userPaths, absWorkingDir, defaultTo)

    const onFile = (srcFile) => {
      const fullPath = path.resolve(absWorkingDir, srcFile)
      const pathOptions = paths.find(pathOptions => pathOptions.valid(srcFile, fullPath))
      if (!pathOptions) return
      const destFile = path.resolve(pathOptions.to, fullPath.replace(`${pathOptions.parent}${path.sep}`, ''))
      const job = copy(fullPath, destFile)
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
      if (watcher) return checkFinish()
      watcher = chokidar.watch(paths.map(pathOptions => pathOptions.from), {
        ignored: ignorePaths,
        cwd: absWorkingDir
      })

      watcher.on('add', onFile)
      watcher.on('change', onFile)
      await new Promise(resolve => watcher.once('ready', resolve))
      await checkFinish()

      if (!build.initialOptions.watch) {
        await watcher.close()
      }
    })
  }
})
