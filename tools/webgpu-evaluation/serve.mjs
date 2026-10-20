import {createServer} from 'vite';
// Evidence files are written while sampling. Disable HMR so neither those writes
// nor an unrelated editor update can navigate the benchmark tab mid-sample.
const server=await createServer({
 server:{host:'127.0.0.1',port:5294,strictPort:true,hmr:false,watch:{ignored:['**/docs/qa/webgpu-evaluation/**']}},
});
await server.listen();
server.printUrls();
