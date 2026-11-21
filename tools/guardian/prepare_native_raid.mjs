import fs from 'node:fs';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {planNight} from '../../src/simulation/raids.js';
const root='docs/guardian/phase2/performance-components/';
const s=deserialize(fs.readFileSync(root+'native-populated-snapshot.json','utf8'));
// A declared QA scenario, not a simulated 26-day progression or migrated save.
s.day=31;s.hiringPaidDay=31;for(const w of s.workers)w.contractDay=31;
s.nightPlan=null;s.raid=null;s.raidPressureMemory=null;planNight(s);s.time=s.nightPlan.at;
fs.writeFileSync(root+'native-raid-snapshot.json',serialize(s));
fs.writeFileSync(root+'native-raid-preparation.json',JSON.stringify({scope:'QA-derived night 31, reset pressure history; same native farm and validated purchases. No fabricated historical night samples.',animals:s.nightPlan.group,workers:s.workers.length,crops:s.plants.length,structures:s.structures.length},null,2));
