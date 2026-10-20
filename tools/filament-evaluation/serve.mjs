import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5296,strictPort:true,hmr:false,
  headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'},
  watch:{ignored:['**/docs/qa/filament-evaluation/**']}}});
await server.listen();server.printUrls();
