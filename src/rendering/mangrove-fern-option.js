export function mangroveFernEnabled(search=globalThis.location?.search??''){const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('mangroveFerns')==='holly';}
