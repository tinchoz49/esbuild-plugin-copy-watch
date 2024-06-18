# esbuild-plugin-copy-watch
Esbuild plugin to copy and watch for files

![Test Status](https://github.com/tinchoz49/esbuild-plugin-copy-watch/actions/workflows/test.yml/badge.svg)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard--ext-gren.svg)](https://github.com/tinchoz49/eslint-config-standard-ext)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

## Install

```bash
$ npm install esbuild-plugin-copy-watch
```

## Usage

```javascript
import esbuild from 'esbuild'
import copy from 'esbuild-plugin-copy-watch'

await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dest/build.js',
  write: false,
  plugins: [
    copy({
      paths: [
        { from: 'static/**', to: 'static' }, // will copy into dest/static
        { from: ['config/*.js', '!config/private.js'], to: 'config' } // will copy config files into dest/config and ignore the private.js
      ],
      forceCopyOnRebuild: false // force to copy the files in every rebuild
    })
  ]
})
```

## Issues

:bug: If you found an issue we encourage you to report it on [github](https://github.com/tinchoz49/esbuild-plugin-copy-watch/issues). Please specify your OS and the actions to reproduce it.

## Contributing

:busts_in_silhouette: Ideas and contributions to the project are welcome. You must follow this [guideline](https://github.com/tinchoz49/esbuild-plugin-copy-watch/blob/main/CONTRIBUTING.md).

## License

MIT
