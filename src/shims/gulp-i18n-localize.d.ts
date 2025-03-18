declare module 'gulp-i18n-localize' {
  import { Transform } from 'stream';
  
  interface LocalizeOptions {
    locales: string[];
    localeDir: string;
    fallback?: string;
    schema?: 'suffix' | 'subdirectory';
    localeRegExp?: RegExp;
    src?: string;
    delimeters?: [string, string];
  }
  
  function localize(options: LocalizeOptions): Transform;
  
  export = localize;
}
