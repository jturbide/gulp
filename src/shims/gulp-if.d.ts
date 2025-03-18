declare module 'gulp-if' {
  import { Transform } from 'stream';
  
  function gulpIf(condition: boolean | ((file: any) => boolean), stream: Transform | Transform[], elseStream?: Transform | Transform[]): Transform;
  
  export default gulpIf;
}
