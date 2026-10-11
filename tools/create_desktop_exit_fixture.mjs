import {writeFileSync} from 'node:fs';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',culture:'mapungubwe',slotId:'qa-desktop-exit-712'});
const center=s.structures[0];let planted=false;
for(let dz=-6;dz<=6&&!planted;dz+=1.5)for(let dx=5;dx<=12&&!planted;dx+=1.5){
 const x=center.x+dx,z=center.z+dz;
 if(nav.placement(x,z,.4).valid){Game.plant(s,'exit-qa-seed','mijo',x,z,nav);planted=true;}
}
if(!planted)throw Error('Exit QA needs a native paid crop');
Game.openInitialHiring(s);Game.hire(s,'exit-qa-hire',{olderFemale:1});s.tutorial.step='done';Game.pause(s,'menu');
writeFileSync(process.argv[2],JSON.stringify({slotId:s.slotId,snapshot:serialize(s)},null,2));
