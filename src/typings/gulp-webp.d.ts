declare module 'gulp-webp' {
  interface WebpOptions {
    quality?: number;
    preset?: 'default' | 'photo' | 'picture' | 'drawing' | 'icon' | 'text';
    alphaQuality?: number;
    method?: number;
    sns?: number;
    autoFilter?: boolean;
    sharpness?: number;
    lossless?: boolean;
    nearLossless?: number;
    resize?: { width: number; height: number };
  }
  
  function gulpWebp(options?: WebpOptions): NodeJS.ReadWriteStream;
  
  export = gulpWebp;
}
