// Standalone frozen receipt verifier: Node built-ins, no runtime/tools/assets.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const here=new URL('./',import.meta.url),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let frames=0,captures=0;
for(const seam of[0,1]){
 const dir=new URL('seam'+seam+'/',here),read=name=>fs.readFileSync(new URL(name,dir)),m=JSON.parse(read('manifest.json'));
 assert.equal(m.tab,928+seam);assert.equal(m.seam,seam);assert.equal(m.sourceHead,'637f0ad7');
 for(const f of m.files){const b=read(f.file);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
 assert.equal(m.sourceFiles[0].sha256,'7ffb62000696e39d21610726cf20a7edc4b1bd4b91e9a4e1cbc57b6c2be6e8ab');
 const r=JSON.parse(read('root-report.json')),server=JSON.parse(read('server-report.json')),a=structuredClone(r),b=structuredClone(server);delete a.capture;delete b.capture;assert.deepEqual(a,b);
 assert.equal(r.youngLeafFrontContinuousHuman,true);assert.equal(r.viewProfile,'YOUNG_LEAF_DOUBLE_CONTINUITY_V1'); // Preserved legacy camera-plan label, not geometry sidedness.
 assert.equal(r.status,'VISUAL_SCREEN_NOT_APPROVED');assert.equal(r.visualAcceptancePolicyVersion,3);assert.equal(r.metricPolicyVersion,2);assert.equal(r.visualReview.status,'HUMAN_REVIEW_PENDING');assert.equal(r.campaignConditions.gpuTiming,false);
 assert.equal(r.archiveSha256,'d4796b80770b472ace76372cbb12f75138a294eed8daa0ed8085606f8b2d8335');assert.equal(r.sourceMapping.sourceSha256,'be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef');assert.equal(r.sourceMapping.runtimeSha256,'617568fc66595c635739ff83bc0256535a72fdf7bfcb016dc68a7f7f1e1a8a52');assert.equal(r.source,r.sourceMapping.runtime);
 assert.equal(r.seam,seam);assert.equal(r.mode,'closeup');assert.equal(r.night,0);assert.equal(r.plantCount,9);assert.equal(r.cameraFov,42);assert.deepEqual(r.cameraPosition,[2,2.5,3]);assert.deepEqual(r.cameraTarget,[0,.6,0]);assert.equal(r.durationSeconds,16);
 const mid=seam===0?.065+(.27-.065)*.81:.27+(.53-.27)*.81,start=mid-.014,half=1/270,landmarks=[mid-half-.00011,mid-half+.00011,mid,mid+half-.00011,mid+half+.00011];assert.equal(r.growthStart,start);
 assert.equal(r.frames.length,seam===0?964:788);assert.equal(r.frames.length,m.frames);assert.equal(r.frames.at(-1).elapsed,16);assert.equal(r.frames.at(-1).clock,22.1875);
 assert.ok(r.frames.every((f,i)=>Math.abs(f.clock-(6.1875+f.elapsed))<1e-12&&Math.abs(f.growth-(start+f.elapsed/270))<1e-12&&f.elapsed>=0&&f.elapsed<=16&&(!i||f.elapsed>=r.frames[i-1].elapsed)&&f.state.length===4&&f.state.every(s=>s.phase===f.state[0].phase&&s.stage===f.state[0].stage&&s.youngActive===f.state[0].youngActive&&s.count===f.state[0].count)));
 assert.equal(r.preparation.length,2);assert.equal(r.preparation[0].rightArm,0);assert.equal(r.preparation[1].rightArm,2); // Numeric preparation differences are diagnostic, not acceptance gates.
 assert.deepEqual(r.materialSides.map(s=>s.sides),[[2],[2],[2],[0,0,0]]);assert.deepEqual(r.materialSides.map(s=>s.shadowSides),[[2],[2],[2],[2,2,2]]);assert.equal(r.resources[1].vertices,1921);assert.equal(r.resources[1].triangles,1254);assert.equal(r.resources[1].attributeBytes+r.resources[1].indexBytes,68996);assert.equal(r.resources[1].liveGrowthShared,true);
 assert.equal(r.captures.length,5);assert.deepEqual(r.captures.map(c=>c.state[0].phase),['original','morph','morph','morph','original']);
 for(const[i,c]of r.captures.entries()){
  assert.equal(c.row,i+2);assert.equal(c.requestedGrowth,landmarks[i]);assert.ok(Math.abs(c.actualGrowth-(start+c.elapsed/270))<1e-12);assert.ok(c.state.every(s=>s.phase===c.state[0].phase&&s.stage===c.state[0].stage&&s.youngActive===c.state[0].youngActive&&s.count===c.state[0].count));
  const active=seam===0?i===4:i===0;assert.equal(c.state[3].youngActive,active);const colour=c.colourDraws.filter(d=>d.arm===3);
  assert.equal(colour.length,active?3:0);if(active){assert.deepEqual(colour.map(d=>d.group),[0,1,2]);assert.deepEqual(colour.map(d=>d.indexCount),[2808,477,477]);assert.ok(colour.every(d=>d.activeArm===3&&d.instances===9&&d.materialSide===0&&d.shadowSide===2&&d.cullEnabled===true&&d.cullFaceMode===1029&&d.frontFace===2305&&d.sourceDoubleShaderDefine===true));}
  assert.equal(c.shadowOn,1);assert.ok(c.shadowDraws.length>0&&c.shadowDraws.every(d=>d.depthSide===2));assert.ok(!i||c.combinedDualViewSubmission.frame>r.captures[i-1].combinedDualViewSubmission.frame);
 }
 assert.equal(r.cleanup.closed,true);assert.deepEqual(r.cleanup.errors,[]);assert.equal(r.contextLost,true);assert.deepEqual(JSON.parse(read('console.json')),[]);
 const png=read('atlas.png');assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),5040);assert.equal(png.subarray(-12).toString('hex'),'0000000049454e44ae426082');
 frames+=r.frames.length;captures+=r.captures.length;console.log('PASS native'+m.tab+' hashes/root-POST match/'+r.frames.length+' chronology rows/Front colour witnesses/source bridge phases/Double shadows/cleanup/full PNG.');
}
console.log('PASS '+frames+' frames and '+captures+' retained moments; limited Root AI still screening, not human-user/full video/World/shadowFront/GPU approval.');
