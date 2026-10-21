export function auditBankResources(w){
 const textures=new Map();
 const add=(t,label)=>{if(!t?.isTexture)return;let e=textures.get(t);if(!e){const p=w.renderer.properties.get(t);e={labels:[],width:t.image?.width,height:t.image?.height,url:t.image?.src??null,uploaded:!!p.__webglTexture};textures.set(t,e)}if(!e.labels.includes(label))e.labels.push(label)};
 w.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m)continue;for(const [k,t]of Object.entries(m))add(t,k);for(const [k,u]of Object.entries(m.userData.biomeGround??{}))add(u.value,k)}});
 for(const t of w.biomeGround.masks)add(t,'ownedGroundMask');add(w.biomeGround.unmappedMask,'unmappedMask');
 return {memory:{...w.renderer.info.memory},masks:w.biomeGround.masks.size,textures:[...textures.values()],maskBuilds:globalThis.qaBankMaskBuilds??[]};
}
