import {defineConfig} from 'vite';
import {webPackagePlugin} from './tools/web-package.mjs';
const headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'};
const isolation={name:'wild-engine-isolation',configureServer(server){server.middlewares.use((_req,res,next)=>{for(const [key,value] of Object.entries(headers))res.setHeader(key,value);next();});}};
export default defineConfig({base:'./',cacheDir:'node_modules/.vite-pthreads',server:{headers,watch:{ignored:['**/.cache/**','**/.codex-attachments/**','**/docs/**']}},preview:{headers},worker:{format:'es'},optimizeDeps:{entries:['index.html'],esbuildOptions:{define:{__WG_THREE_ASYNC_PIPELINE_FIX__:'true'}}},plugins:[isolation,webPackagePlugin()]});
