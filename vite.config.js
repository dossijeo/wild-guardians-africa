import {defineConfig} from 'vite';
import {webPackagePlugin} from './tools/web-package.mjs';
export default defineConfig({base:'./',plugins:[webPackagePlugin()]});
