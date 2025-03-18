declare module 'gulp-noop' {
  import { Transform } from 'stream';
  
  // `gulp-noop` returns a Transform stream that does nothing
  function gulpNoop(): Transform;
  
  export default gulpNoop;
}
