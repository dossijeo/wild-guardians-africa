export const LANGUAGES = ['en', 'es'];
export const LANGUAGE_KEY = 'wild-guardians:language';
export function supportedLanguage(value) {
  if (typeof value !== 'string') return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.includes(base) ? base : null;
}
export function detectLanguage(saved, languages = [], language = '') {
  if (LANGUAGES.includes(saved)) return saved;
  for (const candidate of [...languages, language]) {
    const supported = supportedLanguage(candidate);
    if (supported) return supported;
  }
  return 'en';
}
export function readLanguage(storage, browser = {}) {
  let saved;
  try { saved = storage?.getItem(LANGUAGE_KEY); } catch {}
  return detectLanguage(saved, browser.languages ?? [], browser.language ?? '');
}
export function numberLocale(language) { return language === 'es' ? 'es-ES' : 'en-US'; }
