import {Options as BrowserSyncOptions} from 'browser-sync'
import {deleteSync} from 'del'
import gulpSass from 'gulp-dart-sass'
import imagemin from 'gulp-imagemin'
import gulpTerser from 'gulp-terser';
import gulpUglify from 'gulp-uglify';
import gulpChanged from 'gulp-changed';
import gulpRename from 'gulp-rename';
import * as File from 'vinyl'
import * as HTMLMinifier from 'html-minifier'
import {InitOptions, WriteOptions} from 'gulp-sourcemaps'
import {DestOptions, SrcOptions} from 'vinyl-fs'

type GulpSassOptions = Parameters<typeof gulpSass>[0];
type GulpImageMinOptimizers = Parameters<typeof imagemin>[0];
type GulpImageMinOptions = Parameters<typeof imagemin>[1];
type GulpTerserOptions = Parameters<typeof gulpTerser>[0];
type GulpUglifyOptions = Parameters<typeof gulpUglify>[0];
type GulpChangedOptions = Parameters<typeof gulpChanged>[1];
type GulpRenameOptions = Parameters<typeof gulpRename>[0];
type DeleteAsyncOptions = Parameters<typeof deleteSync>[1];

interface DebugVerboseInterface
{
  debug?: boolean,
  verbose?: boolean
}

interface SrcDestInterface extends DebugVerboseInterface
{
  src: string | string[],
  srcOptions?: SrcOptions,
  dest: string | ((file: File) => string),
  destOptions?: DestOptions,
  watch: boolean | string,
  delete: boolean | string | string[],
  deleteOptions?: DeleteAsyncOptions,
  rename: boolean,
  renameOptions?: GulpRenameOptions,
}

interface AssetConfigInterface extends SrcDestInterface
{
  concat?: string,
  minify: boolean,
  stripDebug: boolean,
  depOrder?: boolean,
  autoprefixer: boolean,
  sortMediaQueries: boolean
  sourceMaps?: {
    enable: boolean;
    initOptions: InitOptions,
    writeOptions: WriteOptions,
    writePath?: string
  }
}

interface SassConfigInterface extends AssetConfigInterface
{
  compilerOptions?: GulpSassOptions;
  header?: string,
}

interface JsConfigInterface extends AssetConfigInterface
{
  terser?: boolean,
  terserOptions?: GulpTerserOptions,
  uglify?: boolean,
  uglifyOptions?: GulpUglifyOptions,
}

interface ImageConfigInterface extends SrcDestInterface
{
  minify: boolean,
  changed: boolean,
  changedOptions: GulpChangedOptions,
  imageMinOptions?: GulpImageMinOptions,
  imageMinOptimizers?: GulpImageMinOptimizers,
}

interface ViewConfigInterface extends SrcDestInterface
{
  minify: boolean,
  htmlMinOptions: HTMLMinifier.Options,
  fileInclude?: {
    basePath: string,
    prefix: string,
  }
  localize?: {
    locales: string[];
    localeDir: string;
    fallback?: string;
    schema?: 'suffix' | 'subdirectory';
    localeRegExp?: RegExp;
    src?: string;
    delimiters?: [string, string];
  },
}

interface CopyConfigInterface extends SrcDestInterface
{
}

interface ServeConfig
{
  browserSync: BrowserSyncOptions;
}

interface GlobalConfig extends DebugVerboseInterface
{
  delete?: boolean,
  watch?: boolean,
  minify?: boolean,
  depOrder?: boolean,
  combine?: boolean,
  optimize?: boolean,
  sourceMaps?: boolean,
  sass?: Partial<SassConfigInterface>,
  js?: Partial<JsConfigInterface>,
  image?: Partial<ImageConfigInterface>,
  view?: Partial<ViewConfigInterface>
  copy?: Partial<CopyConfigInterface>
  serve?: Partial<ServeConfig>
}

interface ConfigInterface
{
  env?: {[key: string]: GlobalConfig},
  global?: GlobalConfig,
  sass?: Array<SassConfigInterface>,
  js?: Array<JsConfigInterface>,
  image?: Array<ImageConfigInterface>,
  view?: Array<ViewConfigInterface>
  copy?: Array<CopyConfigInterface>
  serve?: ServeConfig
}

interface TasksFunctionsInterface
{
  sass: Function,
  js: Function,
  image: Function,
  view: Function,
  copy: Function,
}

interface StreamsInterface
{
  sass: Array<NodeJS.ReadWriteStream>,
  js: Array<NodeJS.ReadWriteStream>,
  image: Array<NodeJS.ReadWriteStream>,
  view: Array<NodeJS.ReadWriteStream>,
  copy: Array<NodeJS.ReadWriteStream>,
}

export type {
  DebugVerboseInterface,
  SrcDestInterface,
  AssetConfigInterface,
  SassConfigInterface,
  JsConfigInterface,
  ImageConfigInterface,
  ViewConfigInterface,
  CopyConfigInterface,
  ServeConfig,
  ConfigInterface,
  TasksFunctionsInterface,
  StreamsInterface,
}
