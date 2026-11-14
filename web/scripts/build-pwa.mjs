import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export async function buildPwa(root=path.join(web,'dist')){
 const file=path.join(root,'index.html');
 const html=await readFile(file,'utf8');
 const tags=`<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" type="image/png" href="/icons/app-192.png" />
<link rel="apple-touch-icon" href="/icons/app-180.png" />
<meta name="theme-color" content="#ad4979" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Family Table" />
<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(function(){console.warn('Offline support is unavailable.');});});}</script>`;
 const document=html.replace('</head>',tags+'\n</head>');
 await writeFile(file,document);
 const assets=['/offline.html','/manifest.webmanifest','/icons/app-192.png','/icons/app-512.png','/icons/app-180.png'];
 const hash=createHash('sha256').update(document);
 for(const asset of assets)hash.update(await readFile(path.join(root,asset)));
 const cacheName='family-table-pwa-'+hash.digest('hex').slice(0,16);
 const template=await readFile(path.join(web,'service-worker.js'),'utf8');
 await writeFile(path.join(root,'sw.js'),template.replace('__CACHE_NAME__',JSON.stringify(cacheName)).replace('__PUBLIC_ASSETS__',JSON.stringify(assets)));
 console.log('PWA manifest, icons, and offline page prepared.');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPwa(process.argv[2]);
