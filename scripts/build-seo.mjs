import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
export function buildSeo(output) {
 const vehicles=JSON.parse(readFileSync(resolve(output,'data/vehicules.json'),'utf8'));
 // Keep established vehicle URLs, including those already found by Google.
 // Publish this mapping with the catalogue so every browser uses the same links.
 let redirects=readFileSync(resolve(output,'_redirects'),'utf8').trimEnd()+'\n';
 for(const v of vehicles) {
  if(!/^[a-z0-9-]+$/.test(v.slug))throw new Error('Invalid slug');
  const existing='/vehicules/'+v.slug+'.html';
  if(!v.detail_url&&existsSync(resolve(output,existing.slice(1))))v.detail_url=existing;
  if(v.detail_url) {
   const alias='/vehicules/annonce-'+v.slug;
   if(v.detail_url!==alias+'.html')redirects+=`${alias}.html ${v.detail_url} 301!\n${alias} ${v.detail_url} 301!\n`;
  }
 }
 writeFileSync(resolve(output,'data/vehicules.json'),JSON.stringify(vehicles,null,2)+'\n');
 writeFileSync(resolve(output,'_redirects'),redirects);
 const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
 const href=v=>v.detail_url||'/vehicules/annonce-'+v.slug+'.html';
 const model=v=>v.name+(String(v.name).includes(String(v.year))?'':' '+v.year);
 const description=v=>`${model(v)} à vendre à ${v.location}, Cameroun. ${v.fuel} · ${v.type}. Prix : ${v.price_display}. Photos et contact direct avec Mboa Auto.`;
 const cards=vehicles.filter(v=>v.status==='disponible').map((v,i)=>`<article class="card" data-catalog-order="${i+1}" data-brand="${esc(v.brand)}" data-type="${esc(v.type)}" data-year="${esc(v.year)}" data-fuel="${esc(v.fuel)}" data-price="${esc(v.price)}" data-search="${esc([v.brand,v.name,v.specs].join(' '))}"><a class="card-photo" href="${esc(href(v))}"><img src="/assets/cars/${esc(v.slug)}/${esc(v.cover||'01.jpg')}" alt="${esc(model(v))} à vendre à ${esc(v.location)}" loading="lazy"><span class="tag">${esc(v.type)}</span></a><div class="card-body"><p class="card-brand">${esc(v.brand)} · ${esc(v.year)}</p><h3><a href="${esc(href(v))}">${esc(v.name)}</a></h3><div class="price">${esc(v.price_display)}</div><div class="specs">${esc(v.specs)}</div><div class="card-actions"><a class="details" href="${esc(href(v))}">Voir le véhicule</a><a class="wa" href="https://wa.me/237691650428?text=${encodeURIComponent('Bonjour Mboa Auto, je suis intéressé par '+v.name+' affiché à '+v.price_display+'.')}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></div></article>`).join('');
 let index=readFileSync(resolve(output,'index.html'),'utf8');
 const marker='<div class="cards" id="vehicleGrid">', start=index.indexOf(marker)+marker.length;
 const end=index.indexOf('</div></section>',start);
 if(start<marker.length||end<0)throw new Error('Catalogue markup missing');
 index=index.slice(0,start)+cards+index.slice(end);
 writeFileSync(resolve(output,'index.html'),index);
 const template=readFileSync(resolve(output,'vehicules/vehicle.html'),'utf8');
 let sitemap=readFileSync(resolve(output,'sitemap.xml'),'utf8');
 // List each available vehicle once, at its preferred URL.
 sitemap=sitemap.replace(/<url>\s*<loc>https:\/\/mboaauto\.com\/vehicules\/[^<]+<\/loc>[\s\S]*?<\/url>/g,'');
 for(const v of vehicles.filter(v=>v.status==='disponible')) {
  sitemap=sitemap.replace('</urlset>','<url><loc>'+esc('https://mboaauto.com'+href(v))+'</loc></url>\n</urlset>');
 }
 for(const v of vehicles) {
  if(!/^[a-z0-9-]+$/.test(v.slug))throw new Error('Invalid slug');
  if(v.detail_url)continue;
  const url='https://mboaauto.com'+href(v), title=model(v)+' à '+v.location+' | Mboa Auto', desc=description(v);
  const files=Array.isArray(v.photo_files)&&v.photo_files.length?v.photo_files:Array.from({length:Number(v.photos||1)},(_,i)=>String(i+1).padStart(2,'0')+'.jpg');
  const cover=files.includes(v.cover)?v.cover:files[0], ordered=[cover,...files.filter(x=>x!==cover)];
  const photo=file=>'/assets/cars/'+esc(v.slug)+'/'+esc(file);
  const facts=[['Année',v.year],['Carburant',v.fuel],['Type',v.type],['Localisation',v.location]];
  const body=`<div class="breadcrumbs"><a href="/">Accueil</a><span>›</span><a href="/#vehicules">Voitures au Cameroun</a><span>›</span><span>${esc(v.name)}</span></div><section class="vehicle-detail"><div class="detail-gallery"><div class="detail-main"><img id="mainVehicleImage" src="${photo(cover)}" alt="${esc(model(v))} à vendre à ${esc(v.location)}"></div><div class="detail-thumbs">${ordered.map((file,i)=>`<button class="detail-thumb" data-src="${photo(file)}"><img src="${photo(file)}" alt="${esc(v.name)} photo ${i+1}" loading="lazy"></button>`).join('')}</div></div><aside class="vehicle-info"><p class="eyebrow">${esc(v.brand)} · ${esc(v.year)}</p><h1>${esc(v.name)}</h1><div class="detail-price">${esc(v.price_display)}</div><p class="detail-desc">${esc(v.description)}</p><div class="fact-grid">${facts.map(([label,value])=>`<span><small>${label}</small><strong>${esc(value)}</strong></span>`).join('')}</div><div class="detail-spec"><strong>Caractéristiques</strong><p>${esc(v.specs)}</p></div><a class="btn wa-big" href="https://wa.me/237691650428?text=${encodeURIComponent('Bonjour Mboa Auto, je suis intéressé par '+v.name+'.') }" target="_blank" rel="noopener noreferrer">Demander sur WhatsApp</a><a class="back-stock" href="/#vehicules">← Retour aux véhicules</a><a class="back-stock" href="/acheter-depuis-etranger.html">Acheter depuis l’étranger →</a></aside></section>`;
  const schema={'@context':'https://schema.org','@type':'Car',name:model(v),brand:{'@type':'Brand',name:v.brand},model:v.name,vehicleModelDate:String(v.year),fuelType:v.fuel,description:v.description,image:'https://mboaauto.com'+photo(cover),url,offers:{'@type':'Offer',price:v.price,priceCurrency:'XAF',availability:'https://schema.org/'+(v.status==='disponible'?'InStock':'OutOfStock'),url,seller:{'@type':'AutomotiveBusiness',name:'Mboa Auto',url:'https://mboaauto.com/'}}};
  let html=template.replace(/<title>.*?<\/title>/s,'<title>'+esc(title)+'</title>').replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+esc(desc)+'">').replace(/<main id="vehicleDynamic" class="vehicle-page">.*?<\/main>/s,'<main id="vehicleDynamic" class="vehicle-page">'+body+'</main>');
  html=html.replace('</head>',`<link rel="canonical" href="${url}"><meta property="og:type" content="product"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://mboaauto.com${photo(cover)}"><script type="application/ld+json">${json(schema)}</script></head>`);
  writeFileSync(resolve(output,'vehicules/annonce-'+v.slug+'.html'),html);
 }
 writeFileSync(resolve(output,'sitemap.xml'),sitemap);
 console.log('SEO: catalogue lisible sans JavaScript et fiches véhicules avec titres, descriptions et sitemap.');
}
if(process.argv[1]===import.meta.filename)buildSeo(resolve(process.argv[2]||'public-site'));
