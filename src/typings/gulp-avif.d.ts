declare module 'gulp-avif' {
  interface AvifOptions {
    quality?: number;          // 0-100 (default ~50)
    lossless?: boolean;        // Lossless compression
    speed?: number;            // Encoding speed (0-10, lower = slower/better)
    chromaSubsampling?: string; // '4:4:4', '4:2:2', '4:2:0'
  }
  
  function gulpAvif(options?: AvifOptions): NodeJS.ReadWriteStream;
  
  export = gulpAvif;
}
