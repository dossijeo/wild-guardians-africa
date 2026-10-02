import {LANGUAGES, LANGUAGE_KEY, readLanguage, numberLocale} from './locale.js';
import {translate as translateCatalog} from './catalog.js';

// The native labs construct their own DOM. Keep their Spanish source messages
// as stable catalog keys, translating only presentation nodes and attributes.
// Logical IDs, save data, input values, embedded JSON and renderers stay intact.
let storage;
try { storage = window.localStorage; } catch {}
let language = readLanguage(storage, navigator);
const sources = new WeakMap();
const attributes = ['title', 'aria-label', 'aria-description', 'placeholder', 'alt'];
const excluded = 'script,style,code,pre,textarea,[data-no-i18n]';
export function getLanguage() { return language; }
export function locale() { return numberLocale(language); }
export function translate(source, selected = language) {
  return translateCatalog(source, selected);
}
function apply(node, key, current, write) {
  let record = sources.get(node);
  if (!record) sources.set(node, record = new Map());
  const previous = record.get(key);
  const original = previous && previous.rendered === current ? previous.original : current;
  const rendered = translate(original);
  record.set(key, {original, rendered});
  if (rendered !== current) write(rendered);
}
function text(node) {
  if (!node.parentElement || node.parentElement.closest(excluded)) return;
  apply(node, 'text', node.data, value => { node.data = value; });
}
function element(node) {
  if (node.closest(excluded)) return;
  for (const key of attributes) if (node.hasAttribute(key)) apply(node, key, node.getAttribute(key), value => node.setAttribute(key,value));
}
export function localize(root = document.documentElement) {
  if (root.nodeType === 3) { text(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9) return;
  if (root.nodeType === 1) element(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) node.nodeType === 3 ? text(node) : element(node);
}
function notifyChildren() {
  for (const frame of document.querySelectorAll('iframe')) frame.contentWindow?.postMessage({type:'wild-guardians:language', language}, location.origin);
}
export function setLanguage(next, {persist = true, broadcast = true} = {}) {
  if (!LANGUAGES.includes(next)) return false;
  language = next;
  if (persist) try { storage?.setItem(LANGUAGE_KEY, next); } catch {}
  document.documentElement.lang = language;
  localize();
  for (const select of document.querySelectorAll('[data-language-select]')) select.value = language;
  window.dispatchEvent(new CustomEvent('wild-guardians:language-change', {detail:{language}}));
  notifyChildren();
  if (broadcast) {
    if (parent !== window) parent.postMessage({type:'wild-guardians:language-request', language}, location.origin);
  }
  return true;
}
document.documentElement.lang = language;
localize();
const observer = new MutationObserver(records => {
  for (const record of records) {
    if (record.type === 'characterData') text(record.target);
    else if (record.type === 'attributes') element(record.target);
    else for (const node of record.addedNodes) localize(node);
  }
});
observer.observe(document.documentElement, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
document.addEventListener('DOMContentLoaded', () => { localize(); notifyChildren(); });
document.addEventListener('change', event => { if (event.target.matches('[data-language-select]')) setLanguage(event.target.value); });
window.addEventListener('storage', event => { if (event.key === LANGUAGE_KEY) setLanguage(readLanguage(storage,navigator), {persist:false}); });
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  if (event.source === parent && parent !== window && event.data?.type === 'wild-guardians:language') setLanguage(event.data.language, {persist:false,broadcast:false});
  else if (event.data?.type === 'wild-guardians:language-request' && [...document.querySelectorAll('iframe')].some(frame => frame.contentWindow === event.source)) setLanguage(event.data.language);
  else if (event.data?.type === 'wild-guardians:language-ready' && [...document.querySelectorAll('iframe')].some(frame => frame.contentWindow === event.source)) notifyChildren();
});
if (parent !== window) parent.postMessage({type:'wild-guardians:language-ready'}, location.origin);
window.WildGuardiansLanguage = Object.freeze({getLanguage,setLanguage,translate,localize,locale});
