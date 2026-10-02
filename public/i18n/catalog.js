import {messages} from './messages.js';
export {messages};
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keys = Object.keys(messages).filter(key => messages[key] !== key).sort((a,b) => b.length-a.length);
// Match complete source phrases in a single pass. Translated output is never
// processed as source, and a crop name cannot replace part of another word.
const phrases = new RegExp('(?<![\\p{L}\\p{N}_])(?:'+keys.map(escape).join('|')+')(?![\\p{L}\\p{N}_])','gu');
const templates=keys.filter(key=>/\{\w+\}/.test(key)).map(key=>{
  const names=[];
  const parts=key.split(/(\{\w+\})/).map(part=>{
    if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1,-1)); return '(.+?)'; }
    return escape(part);
  });
  return {key,names,pattern:new RegExp('^'+parts.join('')+'$','u')};
});
export function translate(source, language='en') {
  if (language === 'es' || !source?.trim()) return source;
  const normalized=source.replace(/\s+/g,' ').trim();
  if (messages[normalized] !== undefined) return source.replace(source.trim(),messages[normalized]);
  for (const template of templates) {
    const match=normalized.match(template.pattern);
    if (match) return source.replace(source.trim(),formatMessage(template.key,Object.fromEntries(template.names.map((name,index)=>[name,translate(match[index+1],language)])),language));
  }
  return source.replace(phrases,key=>messages[key]);
}
export function formatMessage(key, parameters={}, language='en') {
  const template=language==='es'?key:messages[key]??key;
  return template.replace(/\{(\w+)\}/g,(_,name)=>String(parameters[name]??'{'+name+'}'));
}
