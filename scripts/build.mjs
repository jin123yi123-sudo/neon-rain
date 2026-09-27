import {mkdir,copyFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'dist');
await mkdir(resolve(out,'assets'),{recursive:true});
for(const name of ['index.html','style.css','mobile.css','main.js','touch.js','progress.js','assets.js','renderer.js','animation.js','combat.js','level-design.js'])await copyFile(resolve(root,name),resolve(out,name));
for(const name of await readdir(resolve(root,'assets')))if(name.endsWith('.png'))await copyFile(resolve(root,'assets',name),resolve(out,'assets',name));
console.log(`H5 static build: ${out}`);
