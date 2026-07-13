# jTurbide Gulp

> A maintained compatibility layer for existing Gulp-based frontend projects. It is not recommended for new applications.

`jturbide-gulp` centralizes common Gulp tasks for Sass, JavaScript, images, HTML views, copied files, compression, and BrowserSync. It exists so established projects can keep a predictable, reproducible build while they are maintained or migrated.

## Status: legacy support, not a greenfield choice

This package preserves a Gulp-style asset pipeline: an approach that comes from an earlier generation of frontend tooling and has been in widespread use for more than a decade. It is public and kept current for a deliberate reason: some production sites still depend on this workflow, and replacing a working build system is not always the safest or most valuable change.

Maintenance here is intentionally narrow. Releases focus on keeping the package installable with supported Node.js versions, publishing reliable package metadata, and fixing defects that affect existing users. They are not an endorsement of Gulp as the default choice for modern frontend development.

For new applications, prefer a current framework and build system such as [Astro](https://astro.build/), [SvelteKit](https://svelte.dev/docs/kit/introduction), or another framework suited to the product. These tools provide a stronger foundation for component-based UI, routing, server rendering, testing, accessibility, and long-term application architecture.

## When this package is appropriate

Use `jturbide-gulp` when the project already has a Gulp-based asset pipeline and one of these conditions applies:

- You need to maintain a stable marketing site, CMS theme, or server-rendered application without rewriting its frontend.
- You are incrementally modernizing a legacy codebase and need its existing Sass, JavaScript, image, and HTML tasks to remain reliable during the transition.
- A deployment environment expects prebuilt static assets from a conventional Gulp workflow.
- The scope is small, well-understood, and a framework migration would add more risk than value.

Avoid it for a new product, a component-heavy UI, an application needing modern routing or rendering, or any project where a current framework can be adopted from the start.

## Maintenance scope

This repository is maintained as infrastructure for legacy projects. That means changes are expected to be conservative and release-oriented:

- Keep supported Node.js and pnpm installations reproducible.
- Correct packaging, type, and build defects that block existing projects.
- Preserve the documented Gulp configuration model where practical.
- Avoid speculative features and avoid turning this package into a competing frontend framework.

If an existing site needs a larger architectural change, the preferred outcome is a gradual migration to its next frontend stack—not an expansion of this package.

## Requirements

- Node.js 20 or newer
- [pnpm](https://pnpm.io/installation)
- An ESM gulpfile (`gulpfile.mjs`, `gulpfile.ts`, or a `gulpfile.js` in a package with `"type": "module"`)

Install it in an existing project:

```sh
pnpm add jturbide-gulp
```

## Real-world example

The example below suits a small, server-rendered marketing site or CMS theme. It compiles Sass, bundles project JavaScript, optimizes images, processes HTML includes, and copies static downloads to `public/`.

Create `gulpfile.js`:

```js
import { task, series } from 'gulp';
import { Gulp } from 'jturbide-gulp';

const build = new Gulp({
  global: {
    delete: true,
    minify: true,
    watch: true,
    sass: {
      autoprefixer: true,
      sourceMaps: { enable: false },
    },
  },

  sass: [
    {
      src: 'src/scss/**/*.scss',
      dest: 'public/assets/css/',
      concat: 'site.css',
    },
  ],

  js: [
    {
      src: 'src/js/**/*.js',
      dest: 'public/assets/js/',
      concat: 'site.js',
      stripDebug: true,
    },
  ],

  image: [
    {
      src: 'src/images/**/*.{jpg,jpeg,png,gif,svg}',
      dest: 'public/assets/images/',
      imagemin: true,
      newer: true,
    },
  ],

  view: [
    {
      src: 'src/views/pages/**/index.html',
      dest: 'public/',
      fileInclude: {
        prefix: '@@',
        basepath: '@file',
      },
      watch: 'src/views/**/*.html',
    },
  ],

  copy: [
    {
      src: 'src/files/**/*',
      dest: 'public/files/',
    },
  ],
});

task('build', build.build());
task('watch', build.watch.bind(build));
task('default', series('build'));
```

Then run:

```sh
pnpm exec gulp build
pnpm exec gulp watch
```

Set `--delete=false` to keep destination files, or pass a task prefix such as `--sass` to limit a build or watch command to matching tasks.

## Configuration model

Each item in `sass`, `js`, `image`, `view`, `copy`, and `compress` becomes a named Gulp task such as `sass-1` or `image-1`. `build()` runs them in parallel. The `global` object supplies defaults to each task, while `env` lets a command-line environment override them.

For example, a production override can turn off source maps while retaining the same task definitions:

```js
const build = new Gulp({
  global: {
    minify: false,
    sass: {
      sourceMaps: { enable: true },
    },
  },
  env: {
    production: {
      delete: true,
      minify: true,
      sass: {
        sourceMaps: { enable: false },
      },
    },
  },
  // task arrays…
});
```

Run the production build with:

```sh
pnpm exec gulp build --env=production
```

### Common task options

| Task | Typical options | Purpose |
| --- | --- | --- |
| `sass` | `concat`, `autoprefixer`, `minify`, `sourceMaps`, `compilerOptions` | Compile and optionally combine Sass/CSS. |
| `js` | `concat`, `terser`, `uglify`, `stripDebug`, `sourceMaps` | Process legacy JavaScript bundles. |
| `image` | `imagemin`, `webp`, `avif`, `newer`, `changed` | Copy or optimize source images. |
| `view` | `fileInclude`, `localize`, `minify`, `watch` | Build static HTML pages and localized variants. |
| `copy` | `newer`, `changed`, `rename` | Copy downloads, fonts, and other non-compiled files. |
| `compress` | `brotli`, `gzip` | Write pre-compressed asset variants. |

All task types accept `src` and `dest`. Most also support `delete`, `rename`, `watch`, `verbose`, and their corresponding option objects. Refer to the exported TypeScript interfaces for the complete, versioned API surface.

## What it provides

- Sass compilation with Autoprefixer, cssnano, optional source maps, and media-query sorting.
- JavaScript concatenation, minification, and debug stripping.
- Image copying, optimization, and optional WebP or AVIF output.
- HTML file includes, optional localization, and minification.
- File-copy and Brotli/Gzip compression tasks.
- BrowserSync support for legacy local-development workflows.

The exported TypeScript interfaces describe every task configuration: `SassConfigInterface`, `JsConfigInterface`, `ImageConfigInterface`, `ViewConfigInterface`, `CopyConfigInterface`, and `CompressConfigInterface`.

## Operational notes

- **ESM only:** use `import` in an ESM gulpfile. CommonJS `require()` is not supported.
- **Clean builds:** use `delete: true` when the destination contains only generated assets. Set `--delete=false` while diagnosing a build or when generated and hand-authored files share a directory.
- **Image tooling:** image optimization and WebP/AVIF conversion depend on native binaries. pnpm may ask you to approve these dependency build scripts; use your organization’s normal dependency-review process before doing so.
- **Executable reference:** [`tests/gulpfile.js`](tests/gulpfile.js) is the integration fixture used by `pnpm test` and is the most complete working configuration in this repository.

## Troubleshooting

| Symptom | Recommended check |
| --- | --- |
| `Cannot use import statement outside a module` | Use `gulpfile.mjs` or set `"type": "module"` in the consuming project’s `package.json`. |
| A build finishes before files appear | Upgrade to a current package release and ensure each configured task has a valid `src` and `dest`. |
| Images fail to optimize or convert | Reinstall with pnpm, review its blocked dependency-build prompts, and confirm the source image format is supported. |
| Output appears stale | Run with the default `delete: true`, or remove the generated destination directory before rebuilding. |
| Unexpected production output | Inspect the selected `--env` value and the task-specific values that override global defaults. |

## Migration guidance

Treat this package as a bridge, not a destination. Keep Gulp changes small and well-tested while moving page templates, client-side behavior, and build responsibilities into the modern stack selected for the project. A phased migration—one page, component, or asset pipeline at a time—usually carries less delivery risk than a full rewrite.

A practical migration sequence is:

1. Stabilize the existing Gulp build and document its production outputs.
2. Move new pages or UI features into the chosen framework without coupling them to the legacy pipeline.
3. Replace asset, template, and development-server responsibilities incrementally.
4. Retire Gulp only after the replacement build produces the same required deployable assets.

## Development and releases

```sh
pnpm install
pnpm test
pnpm pack --dry-run
```

`pnpm test` type-checks the library, builds its ESM bundle and declarations, and builds the generic integration fixture in `tests/`.

To publish a reviewed release:

```sh
pnpm version patch
pnpm publish
```

## License

Licensed under the [BSD 3-Clause License](LICENSE).
