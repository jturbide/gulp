# jTurbide Gulp

A TypeScript-based Gulp setup class to streamline common tasks like compiling Sass, bundling/minifying JavaScript, optimizing images, processing HTML views, and copying files. The main goal is to reduce repetitive boilerplate and centralize Gulp task configuration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Examples](#examples)
- [License](#license)

## Features

- **Sass Compilation**: Compiles Sass (via `gulp-dart-sass`), handles prefixing (`autoprefixer`), media query sorting, and optional minification with `cssnano`.
- **JavaScript Processing**: Supports both `terser` and `uglify` for minification, optional debug stripping, and file concatenation.
- **Image Optimization**: Uses `gulp-imagemin` with customizable optimizers and checks to avoid reprocessing unchanged files.
- **HTML/Views**: Includes file includes, localization, and optional HTML minification.
- **File Copy**: Simple file copy tasks with optional cleaning of destination folders.
- **Globally Injected Settings**: Merge global or environment-specific configs automatically.
- **Live Reload with BrowserSync**: Automatic streaming with `browser-sync`.
- **CLI Args**: Pass `--env`, `--delete=false`, or a custom prefix for tasks to run only a subset of them.

## Installation

1. Install Node.js (v14+ recommended) and Yarn or npm.
2. Add this library to your project:
    - Using Yarn: `yarn add jturbide-gulp`
    - Or using npm: `npm install jturbide-gulp`

## Usage

1. Create a `gulpfile.ts` (or `gulpfile.js`) in your project root.
2. Import the `Gulp` class and instantiate with a configuration object.

For example:
```
import { Gulp } from 'jturbide-gulp';
```

3. Run tasks from your terminal:
    - `yarn gulp build` or `npx gulp build`
    - `yarn gulp watch` or `npx gulp watch`
    - `yarn gulp serve` or `npx gulp serve`

## Configuration

Below is a high-level breakdown of the most important interfaces:

- `SassConfigInterface`: Config for Sass compilation. Key options include:
    - `src`, `dest`, `compilerOptions`, `minify`, `autoprefixer`, `sortMediaQueries`, etc.
- `JsConfigInterface`: Config for JavaScript processing:
    - `src`, `dest`, `terser`, `uglify`, `concat`, `stripDebug`, etc.
- `ImageConfigInterface`: Config for image optimization.
- `ViewConfigInterface`: Config for HTML/Views.
- `CopyConfigInterface`: Config for copying any file type.
- `ServeConfig`: Config for BrowserSync, for local development and live reloading.
- `ConfigInterface`: Main configuration object that ties them all together.
- `StreamsInterface`: Keeps track of the streams for each task type.

### Global and Environment Config

You can define a top-level `global` config and optionally multiple `env` configs. When you run a command like `gulp build --env=production`, settings under `env.production` are merged into each task’s configuration.

### Deleting Destinations

By default, if `delete` is `true` (in global or individual task config), the destination directory will be cleaned on each run. You can disable via CLI arg `--delete=false`.

### Watching Specific Tasks

If you only want to watch certain tasks, pass them as CLI arguments, for example:
`gulp watch --sass`  
This filters watch tasks to only those whose name starts with `sass-`. Similarly, you can do the same for build tasks.

## Examples

1. **Basic Gulp Setup**:
    - Place the provided `Gulp` class and `interfaces` in `src`, import them in `gulpfile.ts`, configure tasks, and run `gulp build` or `gulp watch`.
2. **Multiple Sass Configs**:
    - You might have multiple Sass outputs (e.g., different sets of SCSS with distinct destinations). Just add more objects to the `sass` array.
3. **Enable/Disable Source Maps**:
    - Each task can enable `sourceMaps`. For example, `sass.sourceMaps.enable = true`, and you can pass `initOptions` or `writeOptions`.

## License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC). Feel free to modify and integrate it into your workflow!
