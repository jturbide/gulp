import {ConfigInterface, CopyConfigInterface, ImageConfigInterface, JsConfigInterface, SassConfigInterface, ServeConfig, SrcDestInterface, StreamsInterface, ViewConfigInterface} from './interfaces'

// Node
import browserSync, {BrowserSyncInstance} from 'browser-sync'
import {extname} from 'path'
import Vinyl from 'vinyl'
import http2 from 'http2'
import {deleteSync} from 'del';
import cssnano from 'cssnano'
import minimist from 'minimist'

// Gulp
import gulp, {TaskFunction, TaskFunctionCallback} from 'gulp'
import gulpDartSass from 'gulp-dart-sass'
import postcss from 'gulp-postcss'
import imagemin, {gifsicle, mozjpeg, optipng, svgo} from 'gulp-imagemin'
import depOrder from 'gulp-deporder'
import concat from 'gulp-concat'
import stripDebug from 'gulp-strip-debug'
import terser from 'gulp-terser'
import fileInclude from 'gulp-file-include'
import localize from 'gulp-i18n-localize'
import autoprefixer from 'gulp-autoprefixer'
import rename from 'gulp-rename'
import uglify from 'gulp-uglify'
import htmlMin from 'gulp-htmlmin'
import sortMediaQueries from 'postcss-sort-media-queries'
import gulpIf from 'gulp-if'
import gulpDebug from 'gulp-debug'
import sourcemaps from 'gulp-sourcemaps'
import gulpHeader from 'gulp-header'
import gulpChanged from 'gulp-changed'

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
    },
    public streams: StreamsInterface = {
      sass: [],
      js: [],
      image: [],
      view: [],
      copy: [],
    },
  ) {
    this.prepareTasks()
  }
  
  deleteDest(config: SrcDestInterface) {
    if (this.argv.delete === 'false' && config.verbose)
      console.log('Delete is disabled')
    
    if (config.delete && this.argv.delete !== "false") {
      let path: null | string | string[] = null
      
      if (Array.isArray(config.delete) || typeof config.delete === 'string') {
        path = config.delete
      } else if (typeof config.dest !== 'function') {
        path = config.dest
      }
      
      if (path) {
        const options = config.deleteOptions || {};
        if (config.verbose) console.log('Deleting:', path, 'options:', options)
        return deleteSync(path, options);
      } else {
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
      if (config.verbose) stream = stream.pipe(gulpDebug({title: 'Processing SASS:'}))
      
      if (config.header) stream = stream.pipe(gulpHeader(config.header))
      
      // execute dart sass
      stream = stream.pipe(gulpDartSass.sync(config.compilerOptions || {}).on('error', gulpDartSass.logError))
      
      // automatically add prefixes
      if (config.autoprefixer) this.postCss.push(autoprefixer())
      
      // minify the css
      if (config.minify) this.postCss.push(cssnano())
      
      // sort media queries
      if (config.sortMediaQueries) this.postCss.push(sortMediaQueries())
      
      // execute post-css
      stream = stream.pipe(postcss(this.postCss))
      
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
      
      stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      
      this.streams.sass.push(stream)
      
      cb()
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
      if (config.verbose) stream = stream.pipe(gulpDebug({title: 'Processing JS:'}))
      
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
      if (config.rename) {
        stream = stream.pipe(rename(config.renameOptions || {}))
      }
      
      // write source maps
      if (config.sourceMaps?.enable) stream = stream.pipe(sourcemaps.write(config.sourceMaps?.writePath || '.', config.sourceMaps?.writeOptions || {}))
      
      // set gulp dest
      stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      
      // keep js stream
      this.streams.js.push(stream)
      
      // gulp callback
      cb()
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
      // clean dest first
      this.deleteDest(config)
      
      // prepare options
      const srcOptions = config.srcOptions || {}
      
      // @todo add gulp newer to check if image is newer before processing
      
      // force encoding to false if not defined
      if (!srcOptions.encoding) srcOptions.encoding = false
      
      // set gulp source
      let stream = gulp.src(config.src, srcOptions)

      // check changed
      if (config.changed) stream = stream.pipe(gulpChanged(config.dest.toString(), config.changedOptions || {}))
      
      // display processing image
      if (config.verbose) stream = stream.pipe(gulpDebug({title: 'Processing Image:'}))

      // prepare imagemin optimizers & options
      const optimizers = config.imageMinOptimizers || [gifsicle(), mozjpeg(), optipng(), svgo()]
      const options = config.imageMinOptions || {}
      
      // if debug is enabled force imagemin verbose
      if (config.verbose) options.verbose = true

      // execute imagemin
      if (config.minify) stream = stream.pipe(gulpIf(this.isValidImage, imagemin(optimizers, options)))

      // set gulp dest
      stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      
      // keep the stream
      this.streams.image.push(stream)
      
      // gulp callback
      cb()
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
      if (config.verbose) stream = stream.pipe(gulpDebug({title: 'Processing View:'}))
      
      // add gulp-file-include
      if (config.fileInclude) stream = stream.pipe(fileInclude(config.fileInclude))
      
      // add gulp-localize
      if (config.localize) stream = stream.pipe(localize(config.localize))
      
      // minify html
      if (config.minify) stream = stream.pipe(htmlMin(config.htmlMinOptions || {}))

      // @todo add html beautifier // prettifier

      // set gulp dest
      stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))

      // rename
      if (config.rename) {
        stream = stream.pipe(rename(config.renameOptions || {}))
        stream = stream.pipe(gulp.dest(config.dest, config.destOptions || {}))
      }

      // keep the stream
      this.streams.view.push(stream)
      
      // gulp callback
      cb()
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
      
      // display processing view
      if (config.verbose) stream = stream.pipe(gulpDebug({title: 'Processing Copy:'}))
      
      // set gulp dest
      stream = stream.pipe(gulp.dest(config.dest))
      
      // keep the stream
      this.streams.copy.push(stream)
      
      // gulp callback
      cb()
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
      this.streams[key as keyof StreamsInterface].forEach((el: NodeJS.ReadWriteStream, index: number) => {
        const config = this.config[key as keyof ConfigInterface]
        this.injectGlobal(config, key)
        if (this.browserSyncInstance && Array.isArray(config) && config[index].watch) {
          el.pipe(this.browserSyncInstance.stream())
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
    const taskKeys = Object.keys(this.tasksFunctions);
    const argvKeys = Object.keys(this.argv);
    return argvKeys.filter(key => taskKeys.includes(key));
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
      if (filteredTasks.length === 0) filteredTasks = this.tasks;
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
    };
  }
}
