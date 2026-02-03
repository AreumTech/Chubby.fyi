declare module 'loglevel-plugin-remote' {
  import * as log from 'loglevel';
  
  interface RemoteOptions {
    url?: string;
    format?: (messages: any[]) => any;
    sendWithBuffer?: boolean;
    bufferSize?: number;
  }
  
  function apply(logger: log.RootLogger, options?: RemoteOptions): void;
  
  export { apply };
  export default { apply };
}