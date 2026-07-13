import {ConfigInterface, CopyConfigInterface, ImageConfigInterface, JsConfigInterface, SassConfigInterface, SrcDestInterface, StreamsInterface, ViewConfigInterface} from './interfaces'

// Node
import browserSync, {BrowserSyncInstance} from 'browser-sync'
import {extname} from 'path'
import Vinyl from 'vinyl'
import http2 from 'http2'
import {deleteSync} from 'del'
import {finished} from 'stream'
import cssnano from 'cssnano'
import minimist from 'minimist'

// Gulp
import gulp, {TaskFunction, TaskFunctionCallback} from 'gulp'
import dartSass from 'gulp-dart-sass'
import postcss from 'gulp-postcss'
import imagemin, {gifsicle, mozjpeg, optipng, svgo} from 'gulp-imagemin'
import depOrder from 'gulp-deporder'
import concat from 'gulp-concat'
import stripDebug from 'gulp-strip-debug'
import terser from 'gulp-terser'
import fileInclude from 'gulp-file-include'
import localize from 'gulp-i18n-localize'
import autoprefixer from 'autoprefixer'
import rename from 'gulp-rename'
import uglify from 'gulp-uglify'
import htmlMin from 'gulp-htmlmin'
import sortMediaQueries from 'postcss-sort-media-queries'
import gulpIf from 'gulp-if'
import debug from 'gulp-debug'
import sourcemaps from 'gulp-sourcemaps'
import header from 'gulp-header'
import changed from 'gulp-changed'
import brotli from 'gulp-brotli'
import gzip from 'gulp-gzip'
import newer from 'gulp-newer'
import webp from 'gulp-webp'
import avif from 'gulp-avif'
import plumber from 'gulp-plumber'

export class Gulp
{
  public argv = minimist(process.argv.slice(2))
  public browserSyncInstance?: BrowserSyncInstance
  public postCss: Array<any> = []
  
  constructor(
    public config: ConfigInterface = {},
    public tasks: string[] = [],
    public tasksFunctions: { [key: string]: Function } = {
      sass: this.sass,
      js: this.js,
      image: this.image,
      view: this.view,
      copy: this.copy,
      compress: this.compress,
    },
    public streams: StreamsInterface = {
      sass: [],
      js: [],
      image: [],
      view: [],
      copy: [],
      compress: [],
    },
  ) {
    this.prepareTasks()
  }
  
  handleError(error: any) {
    console.error('Gulp task error:', error)
  }

  finishTask(stream: NodeJS.ReadWriteStream, cb: TaskFunctionCallback): void {
    finished(stream, (error) => cb(error || undefined))
  }

  finishTasks(streams: NodeJS.ReadWriteStream[], cb: TaskFunctionCallback): void {
    if (streams.length === 0) {
      cb()
      return
    }

    let pendingStreams = streams.length
    let completed = false

    streams.forEach((stream) => {
      finished(stream, (error) => {
        if (completed) return

        if (error) {
          completed = true
          cb(error)
          return
        }

        pendingStreams -= 1
        if (pendingStreams === 0) {
          completed = true
          cb()
        }
      })
    })
  }
  
  deleteDest(config: SrcDestInterface) {
    if (this.argv.delete === 'false' && config.verbose)
      console.log('Delete is disabled')
    
    if (config.delete && this.argv.delete !== 'false') {
      let path: null | string | string[] = null
      
      if (Array.isArray(config.delete) || typeof config.delete === 'string') {
        path = config.delete
      }
      else if (typeof config.dest !== 'function') {
        path = config.dest
      }
      
      if (path) {
        const options = config.deleteOptions || {}
        if (config.verbose) console.log('Deleting:', path, 'options:', options)
        return deleteSync(path, options)
      }
      else {
        if (config.verbose) console.log('Nothing to delete')
      }
    }
  }
  
  /**
   * Executes a task to process Sass files according to the provided configuration.
   *
   * @param config - The configuration object for processing Sass files.
   * @return A function that can be called to execute the Sass task.
   */
  sass(config: SassConfigInterface): TaskFunction {
    this.injectGlobal(config, 'sass')
    
    return (cb: TaskFunctionCallback) => {
      // clean dest first
      this.deleteDest(config)
      
      // set the stream src
      let stream = gulp.src(config.src, config.srcOptions || {})
      
      // source map initialization
      if (config.sourceMaps?.enable) stream = stream.pipe(sourcemaps.init(config.sourceMaps?.initOptions || {}))
      
      // display processing sass
      if (config.verbose) stream = stream.pipe(debug({title: '[SASS]'}))
      
      // append header to every sass files (variables etc.)
      if (config.header) stream = stream.pipe(header(config.header))
      
      // execute dart sass
      stream = stream.pipe(dartSass.sync(config.compilerOptions || {}).on('error', dartSass.logError))
      
      const postCssPlugins = [...this.postCss]

      // automatically add prefixes
      if (config.autoprefixer) postCssPlugins.push(autoprefixer())
      
      // minify the css
      if (config.minify) postCssPlugins.push(cssnano())
      
      // sort media queries
      if (config.sortMediaQueries) postCssPlugins.push(sortMediaQueries())
      
      // execute post-css
      stream = stream.pipe(postcss(postCssPlugins))
      
      if (config.concat) {
        // force dependencies correct order
        if (config.depOrder) stream = stream.pipe(depOrder())
        
        // concat files into a single file
        stream = stream.pipe(concat(config.concat))
      }
      
      // add min suffix if minified
      if (config.minify) stream = stream.pipe(rename({suffix: '.min'}))
      
      // rename
      if (config.rename) stream = stream.pipe(rename(config.renameOptions || {}))
      
      // write source maps
      if (config.sourceMaps?.enable) stream = stream.pipe(sourcemaps.write(config.sourceMaps?.writePath || '.', config.sourceMaps?.writeOptions || {}))
      
      // set gulp dest
      stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      
      // compress result using brotli
      if (config.brotli) {
        if (config.verbose) stream = stream.pipe(debug({title: '[Brotli]'}))
        stream = stream.pipe(brotli.compress(config.brotliOptions || {}))
        stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      }
      
      // compress result using gzip
      if (config.gzip) {
        if (config.verbose) stream = stream.pipe(debug({title: '[Gzip]'}))
        stream = stream.pipe(gzip(config.gzipOptions || {}))
        stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      }
      
      this.streams.sass.push([stream])
      
      this.finishTask(stream, cb)
    }
  }
  
  /**
   * Executes the JavaScript task with the provided configuration.
   *
   * @param {JsConfigInterface} config - The configuration object for the JavaScript task.
   * @return {TaskFunction} - The function that performs the JavaScript task.
   */
  js(config: JsConfigInterface): TaskFunction {
    this.injectGlobal(config, 'js')
    
    return (cb: TaskFunctionCallback) => {
      // clean dest first
      this.deleteDest(config)
      
      let stream = gulp.src(config.src, config.srcOptions || {})
      
      // source map initialization
      if (config.sourceMaps?.enable) stream = stream.pipe(sourcemaps.init(config.sourceMaps?.initOptions || {}))
      
      // display processing js
      if (config.verbose) stream = stream.pipe(debug({title: '[JS]'}))
      
      // strip debug functions from the js
      if (config.stripDebug) stream = stream.pipe(stripDebug())
      
      if (config.concat) {
        // force dependencies correct order
        if (config.depOrder) stream = stream.pipe(depOrder())
        
        // concat files into a single file
        stream = stream.pipe(concat(config.concat))
      }
      
      // minify using terser
      if (config.terser) {
        
        // terser the js
        stream = stream.pipe(terser(config.terserOptions || {}))
        
        // add min suffix
        stream = stream.pipe(rename({suffix: '.min'}))
      }
      
      // minify using uglify
      if (config.minify || config.uglify) {
        
        // uglify the js
        stream = stream.pipe(uglify(config.uglifyOptions || {}))
        
        // add min suffix if minified
        stream = stream.pipe(rename({suffix: '.min'}))
      }
      
      // rename
      if (config.rename) stream = stream.pipe(rename(config.renameOptions || {}))
      
      // write source maps
      if (config.sourceMaps?.enable) stream = stream.pipe(sourcemaps.write(config.sourceMaps?.writePath || '.', config.sourceMaps?.writeOptions || {}))
      
      // set gulp dest
      stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      
      // compress result using brotli
      if (config.brotli) {
        if (config.verbose) stream = stream.pipe(debug({title: '[Brotli]'}))
        stream = stream.pipe(brotli.compress(config.brotliOptions || {}))
        stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      }
      
      // compress result using gzip
      if (config.gzip) {
        if (config.verbose) stream = stream.pipe(debug({title: '[Gzip]'}))
        stream = stream.pipe(gzip(config.gzipOptions || {}))
        stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      }
      
      // keep js stream
      this.streams.js.push([stream])
      
      this.finishTask(stream, cb)
    }
  }
  
  /**
   * Method to process and optimize images using Gulp and imagemin.
   *
   * @param {ImageConfigInterface} config - The configuration for processing images.
   *
   * @return {TaskFunction} - A function that can be executed as a Gulp task.
   */
  image(config: ImageConfigInterface): TaskFunction {
    this.injectGlobal(config, 'image')
    
    return (cb: TaskFunctionCallback) => {
      this.deleteDest(config)
      
      const streams: Array<NodeJS.ReadWriteStream> = []
      const srcOptions = config.srcOptions || {encoding: false}
      
      const processImage = (pipeline: NodeJS.ReadWriteStream) => {
        if (config.newer) pipeline = pipeline.pipe(newer(config.newerOptions || {dest: config.dest.toString()}))
        if (config.changed) pipeline = pipeline.pipe(changed(config.dest.toString(), config.changedOptions || {}))
        return pipeline
      }
      
      // Original Images
      let baseStream = processImage(gulp.src(config.src, srcOptions))
        .pipe(plumber({errorHandler: this.handleError}))
      
      if (config.verbose)
        baseStream = baseStream.pipe(debug({title: '[Image]'}))
      
      if (config.imagemin) {
        const optimizers = config.imageminOptimizers || [gifsicle(), mozjpeg(), optipng(), svgo()]
        const imageMinOptions = config.imageminOptions || {}
        if (config.verbose) imageMinOptions.verbose = true
        baseStream = baseStream.pipe(gulpIf(this.isValidImage, imagemin(optimizers, imageMinOptions)))
      }
      
      baseStream = baseStream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      streams.push(baseStream)
      
      // AVIF Images
      if (config.avif) {
        let avifStream = processImage(gulp.src(config.src, srcOptions))
          .pipe(plumber({errorHandler: this.handleError}))
          .pipe(avif(config.avifOptions || {}))
        
        if (config.verbose)
          avifStream = avifStream.pipe(debug({title: '[Avif]'}))
        
        avifStream = avifStream.pipe(gulp.dest(config.dest, config.destOptions || {}))
        streams.push(avifStream)
      }
      
      // WebP Images
      if (config.webp) {
        let webpStream = processImage(gulp.src(config.src, srcOptions))
          .pipe(plumber({errorHandler: this.handleError}))
          .pipe(webp(config.webpOptions || {}))
        
        if (config.verbose)
          webpStream = webpStream.pipe(debug({title: '[WebP]'}))
        
        webpStream = webpStream.pipe(gulp.dest(config.dest, config.destOptions || {}))
        streams.push(webpStream)
      }
      
      this.streams.image.push(streams)
      
      this.finishTasks(streams, cb)
    }
  }
  
  /**
   * Executes the specified view configuration.
   *
   * @param {ViewConfigInterface} config - The configuration object for the view.
   * @return {TaskFunction} - Returns a function that can be used as a gulp task.
   */
  view(config: ViewConfigInterface): TaskFunction {
    this.injectGlobal(config, 'view')
    
    return (cb: TaskFunctionCallback) => {
      // clean dest first
      this.deleteDest(config)
      
      // set gulp src
      let stream = gulp.src(config.src, config.srcOptions || {})
      
      // display processing view
      if (config.verbose) stream = stream.pipe(debug({title: '[View]'}))
      
      // add gulp-file-include
      if (config.fileInclude) stream = stream.pipe(fileInclude(config.fileInclude))
      
      // add gulp-localize
      if (config.localize) stream = stream.pipe(localize(config.localize))
      
      // minify html
      if (config.minify) stream = stream.pipe(htmlMin(config.htmlMinOptions || {}))
      
      // @todo add html beautifier // prettifier
      
      // rename
      if (config.rename) {
        stream = stream.pipe(rename(config.renameOptions || {}))
      }

      // set gulp dest
      stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      
      // keep the stream
      this.streams.view.push([stream])
      
      this.finishTask(stream, cb)
    }
  }
  
  /**
   * Copies files using gulp.
   *
   * @param {CopyConfigInterface} config - The configuration for the file copying.
   * @return {TaskFunction} - A function that can be used as a gulp task.
   */
  copy(config: CopyConfigInterface): TaskFunction {
    this.injectGlobal(config, 'copy')
    
    return (cb: TaskFunctionCallback) => {
      // clean dest first
      this.deleteDest(config)
      
      // prepare options
      const srcOptions = config.srcOptions || {}
      
      // force encoding to false if not defined
      if (!srcOptions.encoding) srcOptions.encoding = false
      
      // set gulp src
      let stream = gulp.src(config.src, srcOptions)
      
      // newer condition
      if (config.newer) stream = stream.pipe(newer(config.newerOptions || {dest: config.dest.toString()}))
      
      // changed condition
      if (config.changed) stream = stream.pipe(changed(config.dest.toString(), config.changedOptions || {}))
      
      // display copy
      if (config.verbose) stream = stream.pipe(debug({title: '[Copy]'}))
      
      // set gulp dest
      stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      
      // keep the stream
      this.streams.copy.push([stream])
      
      this.finishTask(stream, cb)
    }
  }
  
  /**
   * Compress files using gulp.
   *
   * @param {CopyConfigInterface} config - The configuration for the file compressing.
   * @return {TaskFunction} - A function that can be used as a gulp task.
   */
  compress(config: any): TaskFunction {
    this.injectGlobal(config, 'compress')
    
    return (cb: TaskFunctionCallback) => {
      this.deleteDest(config)
      
      const streams: Array<NodeJS.ReadWriteStream> = []
      const dest = config.dest || config.src
      
      if (config.brotli) {
        let brotliStream = gulp.src(config.src, config.srcOptions || {})
          .pipe(plumber({errorHandler: this.handleError}))
          .pipe(newer({
            dest: dest.toString(),
            map: (relativePath: string) => relativePath + '.br',
          }))
          .pipe(brotli.compress(config.brotliOptions || {}))
          .pipe(rename(config.renameOptions || {extname: '.br'}))
        
        if (config.verbose) brotliStream = brotliStream.pipe(debug({title: '[Brotli]'}))
        
        brotliStream = brotliStream.pipe(gulp.dest(dest, config.destOptions || {}))
        streams.push(brotliStream)
      }
      
      if (config.gzip) {
        let gzipStream = gulp.src(config.src, config.srcOptions || {})
          .pipe(plumber({errorHandler: this.handleError}))
          .pipe(newer({
            dest: dest.toString(),
            map: (relativePath: string) => relativePath + '.gz',
          }))
          .pipe(gzip(config.gzipOptions || {}))
          .pipe(rename(config.renameOptions || {extname: '.gz'}))
        
        if (config.verbose) gzipStream = gzipStream.pipe(debug({title: '[Gzip]'}))
        
        gzipStream = gzipStream.pipe(gulp.dest(dest, config.destOptions || {}))
        streams.push(gzipStream)
      }
      
      this.streams.compress.push(streams)
      
      this.finishTasks(streams, cb)
    }
  }
  
  /**
   * Binds stream with browser-sync instance.
   *
   * This method binds the streams with the browser-sync instance, allowing for live reloading and synchronization of
   * changes made to the streams.
   *
   * @return {void}
   */
  streamBindBrowserSync(): void {
    Object.keys(this.streams).forEach((key: any) => {
      this.streams[key as keyof StreamsInterface].forEach((streams: NodeJS.ReadWriteStream[], index: number) => {
        const config = this.config[key as keyof ConfigInterface]
        this.injectGlobal(config, key)
        if (Array.isArray(config) && config[index].watch) {
          streams.forEach((stream: NodeJS.ReadWriteStream) => {
            if (this.browserSyncInstance) {
              stream.pipe(this.browserSyncInstance.stream())
            }
          })
        }
      })
    })
  }
  
  /**
   * Injects global configuration and specific action configuration into the provided config object.
   *
   * @param {any} config - The configuration object to be modified.
   * @param {string} [action] - The specific action for which to merge the configuration.
   * @return {void} - This method does not return a value.
   */
  injectGlobal(config: any, action?: string): void {
    
    // force provided env config
    if (this.config.env && this.argv.env && this.config.env[this.argv.env]) {
      if (this.config.global?.debug) console.log('Forcing Env Config: ', this.argv.env, this.config.env[this.argv.env])
      for (const [key, value] of Object.entries(this.config.env[this.argv.env])) {
        config[key] = value
      }
    }
    
    // Inject global config if the key doesn't exist in the current config
    for (const [key, value] of Object.entries(this.config.global || {})) {
      if (this.config.global?.debug) console.log('Injecting Global: ', action, this.config.global)
      if (!(key in config)) {
        config[key] = value
      }
    }
    
    // Merge specific action configuration without overriding existing properties
    if (action && config[action]) {
      if (this.config.global?.debug) console.log('Injecting Action: ', action, config[action])
      for (const [key, value] of Object.entries(config[action])) {
        if (!(key in config)) {
          config[key] = value
        }
      }
    }
    
    if (this.config.global?.debug) console.log('Injecting Config: ', action, config)
  }
  
  /**
   * Checks if a given file is a valid image.
   *
   * @param {Vinyl} file - The file to be checked.
   * @return {boolean} - True if the file is a valid image, false otherwise.
   */
  isValidImage(file: Vinyl): boolean {
    const validFormats: string[] = ['.png', '.jpg', '.jpeg', '.gif', '.svg']
    return !!file.path && validFormats.includes(extname(file.path).toLowerCase())
  }
  
  getTaskPrefixes(): string[] {
    const taskKeys = Object.keys(this.tasksFunctions)
    const argvKeys = Object.keys(this.argv)
    return argvKeys.filter(key => taskKeys.includes(key))
  }
  
  /**
   * Prepare all the default tasks for build & watch
   */
  prepareTasks(): void {
    (Object.keys(this.tasksFunctions) as Array<keyof ConfigInterface>).forEach((taskType) => {
      const taskFn = this.tasksFunctions[taskType]
      if (taskFn && Array.isArray(this.config[taskType])) {
        this.config[taskType].forEach((taskConfig: any, index: number) => {
          const taskName = `${taskType}-${index + 1}`
          if (this.config.global?.debug) console.log('Creating new task: ', taskName, taskConfig)
          gulp.task(taskName, taskFn.call(this, taskConfig))
          this.tasks.push(taskName)
        })
      }
    })
  }
  
  /**
   * Run all existing tasks in parallel
   */
  build(): TaskFunction {
    // Get all keys from this.argv, excluding special keys like '_', '$0'
    const taskPrefixes = this.getTaskPrefixes()
    let filteredTasks = this.tasks
    
    if (taskPrefixes.length > 0) {
      // Filter the tasks that start with any of the provided prefix keys
      filteredTasks = this.tasks.filter((task) =>
        taskPrefixes.some((prefix) => task.startsWith(prefix)),
      )
      if (filteredTasks.length === 0) filteredTasks = this.tasks
      if (this.config.global?.verbose) console.log(`Executing tasks with prefixes "${taskPrefixes.join(', ')}":`, filteredTasks)
    }
    else {
      if (this.config.global?.verbose) console.log('No specific task prefixes provided, executing all tasks.')
    }
    
    return gulp.parallel(filteredTasks)
  }
  
  /**
   * Bind watches to existing tasks based on the config
   */
  watch(): void {
    const taskPrefixes = this.getTaskPrefixes()
    
    // Loop through the configuration keys
    Object.keys(this.config).forEach((key: any) => {
      const configArray = this.config[key as keyof ConfigInterface]
      
      if (Array.isArray(configArray)) {
        configArray.forEach((config: any, idx: number) => {
          this.injectGlobal(config, key)
          const taskName = `${key}-${idx + 1}`
          const method = this[key as keyof Gulp] || false // Check if task method exists
          
          // Check if the task should be watched based on the prefix filtering and 'watch' parameter
          const shouldWatch = taskPrefixes.length === 0 || taskPrefixes.some(prefix => taskName.startsWith(prefix))
          
          // Check if the 'watch' property is true or a string (indicating file pattern to watch)
          if (shouldWatch && method && (config.watch)) {
            const watchPattern = typeof config.watch === 'boolean' ? config.src : config.watch
            
            if (this.config.global?.verbose) console.log(`Watching task: ${taskName} (Pattern: ${watchPattern})`)
            
            // Set up gulp watch for the task
            gulp.watch(watchPattern, gulp.task(taskName))
          }
        })
      }
    })
  }
  
  /**
   * Create a Web server and bind browser sync to existing streams
   */
  serve(): TaskFunction {
    return (cb: TaskFunctionCallback) => {
      // fix for ssl using http2
      if (this.config.serve?.browserSync.https && this.config.serve?.browserSync.httpModule === 'http2') {
        http2.createServer = http2.createSecureServer
      }
      
      this.browserSyncInstance = browserSync.create()
      this.streamBindBrowserSync()
      this.browserSyncInstance.init(this.config.serve?.browserSync || {})
      
      cb()
    }
  }
}
