import {defineConfig} from 'vite';
import {webPackagePlugin} from './tools/web-package.mjs';
const headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'};
export default defineConfig({base:'./',server:{headers},preview:{headers},optimizeDeps:{entries:['index.html']},plugins:[webPackagePlugin()]});
