// Native HUD: 1 home, 2 build, 3 grow, 4 magic, H village, P menu.
// Dispatch through the live buttons so their disabled state and handlers apply.
const selectors={
  '1':'[data-menu="home"]','2':'[data-menu="build"]',
  '3':'[data-menu="grow"]','4':'[data-menu="magic"]',
  h:'[data-menu="home"]',p:'#menuButton'
};
export function hudShortcut(event,root,{enabled=true}={}){
  if(!enabled||event.defaultPrevented||event.repeat||event.ctrlKey||event.altKey||event.metaKey)return false;
  if(event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return false;
  const selector=selectors[event.key?.toLowerCase()];
  if(!selector)return false;
  const button=root.querySelector(selector);
  if(!button||button.disabled||button.closest?.('[inert]'))return false;
  event.preventDefault();button.click();return true;
}
