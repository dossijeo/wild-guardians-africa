import test from 'node:test';import assert from 'node:assert/strict';
import {LoadingTransferOwner} from '../src/app/loading-transfer-owner.js';
import {LoadingProgress} from '../src/app/loading-progress.js';
import {LoadingDownloads} from '../src/app/loading-downloads.js';
import {beginAssetTransfer,finishAssetTransfer,cachedAssetTransfer} from '../src/rendering/asset-transfer.js';

test('a verified cached load has zero download weight, preserving preparation progress',()=>{
 const downloads=new LoadingDownloads(),id=downloads.begin('resident');downloads.finish(id,{timing:{transferSize:0,decodedBodySize:100}});
 const progress=new LoadingProgress([{id:'gpu',weight:1}],{downloads,workEstimateMs:1000});assert.equal(progress.update('gpu',.4).progress,.4);assert.equal(progress.snapshot().downloads.estimatedMs,0);
});
test('missing downloads share the aggregate by their observed wall time; new totals never reverse it',()=>{
 let now=0;const downloads=new LoadingDownloads({now:()=>now,expectedBytes:()=>1000,bytesPerSecond:1000,latencyMs:0}),id=downloads.begin('missing');
 const progress=new LoadingProgress([{id:'gpu',weight:1}],{downloads,workEstimateMs:1000,now:()=>now});progress.update('gpu',.5);
 now=2000;downloads.finish(id,{loaded:1000,timing:{startTime:0,responseEnd:2000,transferSize:1200,encodedBodySize:1000,decodedBodySize:1000}});assert.equal(progress.refresh(),2.5/3);
 const before=progress.value,next=downloads.begin('discovered-later');downloads.update(next,0,100000);progress.refresh();assert.equal(progress.value,before);assert.throws(()=>progress.confirmReady());progress.update('gpu');assert.throws(()=>progress.confirmReady(),/asset transfer/);downloads.finish(next,{loaded:100000});assert.equal(progress.confirmReady().progress,1);
});
test('owner spans early preparation and detaches cache and native callbacks on cancellation',()=>{
 const owner=new LoadingTransferOwner(),first=beginAssetTransfer('/early');assert.equal(owner.downloads.snapshot().pending,1);cachedAssetTransfer('/owned');assert.equal(owner.downloads.snapshot().cacheHits,1);assert.equal(owner.ids.size,1);
 finishAssetTransfer(first,{loaded:30});assert.equal(owner.downloads.snapshot().pending,0);owner.dispose();const size=owner.downloads.requests.size;assert.equal(beginAssetTransfer('/after'),null);finishAssetTransfer(first,{loaded:50});assert.equal(owner.downloads.requests.size,size);owner.dispose();
});
test('completed DOM assets are observed without requests; explicit transfers are not counted twice',()=>{
 const owner=new LoadingTransferOwner(),now=performance.now(),entry={name:'http://localhost/assets/hud.webp',initiatorType:'img',startTime:now,responseEnd:now,transferSize:0,encodedBodySize:30,decodedBodySize:30};
 owner.resource(entry);assert.equal(owner.downloads.snapshot().cacheHits,1);owner.resource(entry);assert.equal(owner.downloads.requests.size,1);
 owner.dispose();owner.resource({...entry,name:'http://localhost/assets/late.webp'});assert.equal(owner.downloads.requests.size,1);
});
test('ResourceTiming received before parse is retained even when the native resource buffer loses it',()=>{
 const owner=new LoadingTransferOwner(),token=beginAssetTransfer('/delayed.glb','gltf'),timing={name:token.url,initiatorType:'fetch',startTime:token.start,responseEnd:performance.now(),transferSize:0,encodedBodySize:80,decodedBodySize:80};
 owner.resource(timing);assert.equal(owner.downloads.snapshot().pending,1);assert.equal(owner.timings.size,1);assert.equal(owner.downloads.snapshot().cacheHits,1);assert.equal(owner.downloads.snapshot().estimatedMs,0);assert.equal(owner.downloads.snapshot().networkPending,0);
 finishAssetTransfer(token);assert.equal(owner.downloads.snapshot().pending,0);assert.equal(owner.downloads.snapshot().cacheHits,1);assert.equal(owner.downloads.snapshot().estimatedMs,0);assert.equal(owner.timings.size,0);owner.dispose();
});
