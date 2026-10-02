import {parseAst} from 'rollup/parseAst';
import {readFileSync,readdirSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
const root=process.cwd(), rows=[];
function walk(directory){for(const name of readdirSync(directory)){const file=resolve(directory,name);if(statSync(file).isDirectory())walk(file);else if(name.endsWith('.js') && !file.endsWith('crops\\script-3.js')){
  try{const ast=parseAst(readFileSync(file,'utf8'));
    function visit(node){if(!node||typeof node!=='object')return;
      if(node.type==='Literal'&&typeof node.value==='string')rows.push({file:relative(root,file),value:node.value});
      if(node.type==='TemplateElement')rows.push({file:relative(root,file),value:node.value.cooked??node.value.raw});
      for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);
    }visit(ast);
  }catch(error){throw new Error(relative(root,file)+': '+error.message);}
}}}
for(const dir of ['src/app','src/ui','src/tutorial','src/simulation','src/world','src/persistence','src/rendering','src/audio','public/menu','public/selector','public/library'])walk(resolve(root,dir));
mkdirSync(resolve(root,'.cache'),{recursive:true});
writeFileSync(resolve(root,'.cache/i18n-literals.json'),JSON.stringify(rows,null,2)+'\n');
console.log(rows.length+' source literals');
