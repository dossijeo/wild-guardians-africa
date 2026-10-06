import test from 'node:test';
import assert from 'node:assert/strict';
import {gltfImageRoles,groundImageReferences,biomeTextureReferences,nativeCatalogImageReferences} from '../tools/audit_image_assets.mjs';

test('legacy and WebP texture references preserve normal, packed data and color roles',()=>{
 const json={textures:[{source:0},{extensions:{EXT_texture_webp:{source:1}}},{source:2}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0},metallicRoughnessTexture:{index:2}},normalTexture:{index:1},occlusionTexture:{index:2}}]};
 assert.deepEqual(gltfImageRoles(json,0).roles,['color']);assert.equal(gltfImageRoles(json,0).requiresExactPixels,false);
 assert.deepEqual(gltfImageRoles(json,1).roles,['normal']);assert.equal(gltfImageRoles(json,1).requiresExactPixels,true);
 assert.deepEqual(gltfImageRoles(json,2).roles,['data']);assert.equal(gltfImageRoles(json,2).references.length,2);
});
test('a shared color/normal map is treated as data even when color usage is found first',()=>{
 const result=gltfImageRoles({textures:[{source:0}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0}},normalTexture:{index:0}}]},0);
 assert.deepEqual(result.roles,['color','normal']);assert.equal(result.requiresExactPixels,true);
});
test('material extension colors and clearcoat normals are classified through extension nesting',()=>{
 const json={textures:[{source:0},{source:1},{source:2}],materials:[{extensions:{KHR_materials_clearcoat:{clearcoatNormalTexture:{index:0},clearcoatRoughnessTexture:{index:2}},KHR_materials_sheen:{sheenColorTexture:{index:1}}}}]};
 assert.deepEqual(gltfImageRoles(json,0).roles,['normal']);assert.deepEqual(gltfImageRoles(json,1).roles,['color']);assert.deepEqual(gltfImageRoles(json,2).roles,['data']);
});
test('unreferenced image cannot be automatically sent through lossy color optimization',()=>{
 assert.equal(gltfImageRoles({textures:[{source:0}],materials:[]},0).requiresExactPixels,true);
 assert.deepEqual(gltfImageRoles({},1).roles,['unclassified']);
});
test('mangrove secondary mud maps retain their data roles and shared files retain both references',()=>{
 const refs=groundImageReferences({mangrove:{base:'/assets/moss.webp',normal:'/assets/n.png',mudPatches:{base:'/assets/mud.jpg',normal:'/assets/n.png',arh:'/assets/a.png'}}});
 assert.equal(refs.get('assets/n.png').length,2);assert.ok(refs.get('assets/n.png').every(r=>r.role==='normal'));
 assert.equal(refs.get('assets/a.png')[0].role,'data');assert.equal(refs.get('assets/mud.jpg')[0].role,'color');
 assert.equal(refs.get('assets/a.png')[0].field,'mangrove.mudPatches.arh');
});
test('native biome atlas descriptors distinguish base color from normal and metallic roughness',()=>{
 const refs=biomeTextureReferences({textures:[{role:'baseColor',base64:{url:'/assets/color.webp'}},{role:'normal',base64:{url:'/assets/n.png'}},{role:'metallicRoughness',base64:{url:'/assets/orm.webp'}}]},'biome-mangrove');
 assert.deepEqual(refs.map(r=>r.reference.role),['color','normal','data']);
 assert.deepEqual(refs.map(r=>r.path),['assets/color.webp','assets/n.png','assets/orm.webp']);
});

test('native village texture slots and photos retain their explicit semantic roles',()=>{
 const refs=nativeCatalogImageReferences({villages:[{textures:{color:'/assets/shared.webp',normal:'/assets/shared.webp',rough:'/assets/rough.webp',unknown:'/assets/new.png'},photo:'/assets/photo.webp'}]});
 assert.deepEqual(refs.map(r=>r.reference.role),['color','normal','data','unclassified','color']);
 assert.equal(refs.filter(r=>r.path==='assets/shared.webp').length,2);
});
test('wall art and VFX thumbnails are color, but sprite atlas stays conservative data',()=>{
 const refs=nativeCatalogImageReferences({walls:{texture:'/assets/wall.jpg',icons:{adobe:'/assets/icon.webp'}},vfx:{atlas:'/assets/atlas.webp',resources:[{thumb:'/assets/thumb.webp'}]}});
 assert.deepEqual(refs.map(r=>r.reference.role),['color','color','data','color']);
});
test('menu ground alpha mask cannot be mistaken for display-color art',()=>{
 const menuHtml='<script id="skydata">/assets/sky.webp</script><script type="x" id="terrainmaskdata">/assets/mask.png</script><script id="cleandata">/assets/clean.webp</script>';
 const refs=nativeCatalogImageReferences({menuHtml});assert.equal(refs.find(r=>r.path==='assets/mask.png').reference.role,'data');assert.equal(refs.find(r=>r.path==='assets/clean.webp').reference.role,'color');
});
