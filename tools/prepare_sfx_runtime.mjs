// Promote hash-bound, natively validated SFX encodes; source references remain intact.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const conversion=json('.cache/opus-audit/report.json'),audited=json('docs/qa/opus-conversion/conversion-report.json'),native=json('docs/qa/opus-conversion/browser-report.json');
assert.equal(conversion.status,'measured');assert.equal(native.rows.length,294);assert.equal(native.errors.length,0);
const encodes=conversion.records.filter(r=>r.role==='sfx');assert.equal(encodes.length,126);
const records=[],mapped=new Map();mkdirSync(new URL('public/assets/audio/',root),{recursive:true});
for(const entry of encodes){
 const checked=audited.records.find(r=>r.source===entry.source);assert.equal(checked?.opusSha256,entry.opusSha256);assert.equal(entry.sampleDelta,0);
 const original=read('public'+entry.source),encoded=read(`.cache/opus-audit/${entry.sourceSha256}.opus`);
 assert.equal(sha(original),entry.sourceSha256);assert.equal(sha(encoded),entry.opusSha256);assert.equal(encoded.length,entry.opusBytes);
 const runtime=`assets/audio/${entry.opusSha256}.opus`;writeFileSync(new URL('public/'+runtime,root),encoded);
 const record={kind:'sfx',id:entry.id,source:entry.source.slice(1),runtime,sourceSha256:entry.sourceSha256,runtimeSha256:entry.opusSha256,beforeBytes:original.length,afterBytes:encoded.length,samples48000:entry.after.samples48000,channels:entry.channels,bitrate:entry.targetBitrate,decodedPeakDb:entry.after.peakDb,decodedRmsDb:entry.after.rmsDb};records.push(record);mapped.set(entry.id,record);
}
function transformItem(item){
 const record=mapped.get(item.id);assert(record);assert.equal(item.sha256,record.sourceSha256);
 return {...item,filename:item.filename.replace(/\.mp3$/,'.opus'),bytes:record.afterBytes,sha256:record.runtimeSha256,duration:record.samples48000/48000,
  runtimeFormat:{codec:'opus',mime:'audio/ogg',sampleRate:48000,channels:record.channels,bitrateKbps:record.bitrate/1000,decodedPeakDb:record.decodedPeakDb,decodedRmsDb:record.decodedRmsDb},
  normalizedSource:{filename:item.filename,bytes:item.bytes,sha256:item.sha256,lufs:item.lufs,true_peak_dbtp:item.true_peak_dbtp,duration:item.duration},
  audio:{url:'/'+record.runtime,encoding:'external-binary'}};
}
function writeDerivative(source,runtime,data){
 const original=read('public/'+source),bytes=Buffer.from(JSON.stringify(data)+'\n');writeFileSync(new URL('public/'+runtime,root),bytes);
 records.push({kind:'sfx-metadata',source,runtime,sourceSha256:sha(original),runtimeSha256:sha(bytes),beforeBytes:original.length,afterBytes:bytes.length});
}
const game=json('public/content/sfx.json');game.items=game.items.map(transformItem);game.runtimeCodec='opus';game.total_duration=game.items.reduce((n,i)=>n+i.duration,0);
writeDerivative('content/sfx.json','content/sfx-opus.json',game);
const lab=json('public/library/sfx/bankData.json');lab.items=lab.items.map(transformItem);lab.runtimeCodec='opus';lab.total_duration=game.total_duration;lab.original_audit_csv=lab.audit_csv;
lab.audit_csv='number,id,source_sha256,opus_sha256,opus_bytes,sample_rate,channels,samples,decoded_peak_db,decoded_rms_db\n'+lab.items.map(i=>{const r=mapped.get(i.id);return [i.number,i.id,r.sourceSha256,r.runtimeSha256,r.afterBytes,48000,r.channels,r.samples48000,r.decodedPeakDb,r.decodedRmsDb].join(',');}).join('\n')+'\n';
const originalManifest=lab.manifest;
lab.manifest={schema:'WG_SFX_OPUS_RUNTIME_V1',game:lab.game,version:1,source_bank_id:lab.bank_id,created_at:lab.created_at,
 format:{codec:'ogg-opus',bitrate_mode:'VBR',target_bitrate_kbps:96,sample_rate:48000,channels:2},
 validation:{audio_count:126,all_encoded_hashes_match_audited_conversion:true,pcm_samples_preserved:true,native_decodes:252,listening_verified:false},
 original_normalization:originalManifest.validation,
 items:lab.items.map(i=>{const source=originalManifest.items.find(s=>s.id===i.id),r=mapped.get(i.id);return {number:i.number,id:i.id,name:i.name,category:i.category,file:'audio/'+i.filename,duration_seconds:i.duration,bytes:i.bytes,mime_type:'audio/ogg',sample_rate:48000,channels:r.channels,target_bitrate_kbps:r.bitrate/1000,loop:i.loop,sha256:i.sha256,samples48000:r.samples48000,decoded_peak_db:r.decodedPeakDb,decoded_rms_db:r.decodedRmsDb,normalized_source:{...i.normalizedSource,normalization:source.normalization,source:source.source}};})};
lab.readme='WILD GUARDIANS — SFX OPUS\n\n126 derivados Ogg Opus VBR 96 kb/s, 48 kHz, estéreo. Reproducción y descarga usan los mismos bytes. No se vuelve a normalizar ni recortar; se preservan los samples a 48 kHz. La conversión parte de MP3 normalizados: son derivados con pérdida, no originales WAV.\n\nmanifest.json y SHA256SUMS.txt describen los Opus exportados. conversion.csv contiene tamaño, hashes y peak/RMS de PCM decodificado; no son LUFS ni true peak. normalizacion_original.csv y normalized_source conservan las mediciones previas del MP3 y no certifican los valores del Opus. La forma de onda de consulta procede del MP3.\n\nSe validaron descodificación nativa a 48/44,1 kHz, duración y canales. Escucha, móvil físico y Tauri pendientes.\n';
writeDerivative('library/sfx/bankData.json','library/sfx/bankData-opus.json',lab);
const routing=json('public/content/sfx-routing.json');routing.items=routing.items.map(item=>{const r=mapped.get(item.id);assert.equal(item.sha256,r.sourceSha256);return {...item,filename:item.filename.replace(/\.mp3$/,'.opus'),sha256:r.runtimeSha256,normalized_source:{filename:item.filename,sha256:item.sha256}};});
writeDerivative('content/sfx-routing.json','content/sfx-routing-opus.json',routing);
writeFileSync(new URL('content/manifests/sfx-runtime.json',root),JSON.stringify({version:1,scope:'126 SFX, gameplay catalogue, original lab export metadata and routing; source MP3s remain outside distribution',records},null,2)+'\n');
writeFileSync(new URL('.cache/sfx-stage.txt',root),records.filter(r=>r.kind==='sfx').map(r=>'public/'+r.runtime).join('\n')+'\n');
console.log(JSON.stringify({sfx:126,metadata:3,sourceBytes:records.reduce((n,r)=>n+r.beforeBytes,0),runtimeBytes:records.reduce((n,r)=>n+r.afterBytes,0)}));
