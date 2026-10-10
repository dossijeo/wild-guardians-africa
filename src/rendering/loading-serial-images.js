// Only independent resource scheduling: two original GLB loads and one serial
// image chain. All failures are observed before any caller adoption/GPU work.
export async function loadWithSerialImages({assertOpen,model,bridges,soil,atlas}){
 let failed=false;
 const check=()=>{assertOpen();if(failed)throw Error('Loading resource sibling failed');};
 const start=run=>Promise.resolve().then(()=>{check();return run();}).catch(error=>{failed=true;throw error;});
 check();
 const modelPending=start(model),bridgePending=start(bridges);
 const images=start(soil).then(async texture=>{const backdrop=await start(atlas);return [texture,backdrop];});
 const [gltf,prepared,[texture,backdrop]]=await Promise.all([modelPending,bridgePending,images]);
 check();return [gltf,prepared,texture,backdrop];
}
