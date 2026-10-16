import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';

const [directory,destination]=process.argv.slice(2);
if(!directory||!destination)throw Error('Pass campaign output directory and archive path');
const root=resolve(directory),read=name=>JSON.parse(readFileSync(join(root,name)));
const payload={source:read('source.json'),receipt:read('receipt.json'),
  report:read('report.json'),
  days:readFileSync(join(root,'days.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse),
  state:JSON.parse(gunzipSync(readFileSync(join(root,'state.json.gz'))))};
writeFileSync(resolve(destination),gzipSync(Buffer.from(JSON.stringify(payload)),{level:9}));
