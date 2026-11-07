import {createServer} from 'vite';
// Keep the application's isolation headers and package URL rewrites. Avoid
// crawling the large offline authoring archive during local visual reviews.
const server=await createServer({optimizeDeps:{noDiscovery:true,include:['three']},server:{host:'127.0.0.1',port:Number(process.env.REVIEW_PORT??5175),strictPort:true,hmr:false,watch:{ignored:['**/docs/**','**/.cache/**','**/.codex-attachments/**','**/references/**','**/assets-source/**']}}});
await server.listen();server.printUrls();
