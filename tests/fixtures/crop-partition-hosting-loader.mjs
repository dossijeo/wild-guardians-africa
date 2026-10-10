import fs from 'node:fs';
// Execute the shipped resolver with its module URL at a production hosting base.
// All other imports/parsers/loaders remain original Node modules.
export async function load(url,context,next){
 if(new URL(url).pathname.endsWith('/src/rendering/asset-url.js')){
  const source=fs.readFileSync(new URL(url),'utf8').replaceAll('import.meta.url',JSON.stringify(process.env.CROP_HOST_MODULE));
  return {format:'module',source,shortCircuit:true};
 }
 return next(url,context);
}
