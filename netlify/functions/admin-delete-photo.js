const crypto=require("crypto");
const COOKIE_NAME="mboa_admin_session";
const OWNER="arthur-ambadiang05",REPO="mboa-auto-site",BRANCH="main";
function cookies(h=""){return h.split(";").map(x=>x.trim()).filter(Boolean).reduce((a,c)=>{const i=c.indexOf("=");if(i>-1)a[c.slice(0,i)]=c.slice(i+1);return a;},{});}
function validSession(s,secret){if(!s||!secret)return false;const p=s.split(".");if(p.length!==2)return false;const[e,sig]=p;const exp=crypto.createHmac("sha256",secret).update(e).digest("hex");const a=Buffer.from(sig),b=Buffer.from(exp);return a.length===b.length&&crypto.timingSafeEqual(a,b)&&Number(e)>Math.floor(Date.now()/1000);}
function out(code,data){return{statusCode:code,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)};}
function ghHeaders(t){return{Authorization:"Bearer "+t,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"Mboa-Auto-Admin","Content-Type":"application/json"};}
exports.handler=async(event)=>{
  if(event.httpMethod!=="POST")return out(405,{error:"Méthode non autorisée"});
  const secret=process.env.MBOA_ADMIN_SESSION_SECRET,token=process.env.MBOA_GITHUB_TOKEN;
  if(!secret||!token)return out(500,{error:"Configuration serveur incomplète"});
  if(!validSession(cookies(event.headers.cookie||"")[COOKIE_NAME],secret))return out(401,{error:"Session administrateur invalide"});
  try{
    const body=JSON.parse(event.body||"{}");
    const slug=String(body.slug||"").trim(),filename=String(body.filename||"").trim();
    if(!/^[a-z0-9-]+$/.test(slug))return out(400,{error:"Identifiant véhicule invalide"});
    if(!/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(filename))return out(400,{error:"Nom de photo invalide"});
    const path=`assets/cars/${slug}/${filename}`;
    const url=`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    const headers=ghHeaders(token);
    const current=await fetch(url+"?ref="+BRANCH,{headers});
    if(current.status===404)return out(404,{error:"Photo introuvable"});
    if(!current.ok)return out(502,{error:"Impossible de lire la photo"});
    const file=await current.json();
    const del=await fetch(url,{method:"DELETE",headers,body:JSON.stringify({
      message:`[skip netlify] Suppression photo véhicule : ${slug}/${filename}`,
      sha:file.sha,branch:BRANCH
    })});
    if(!del.ok){console.error(await del.text());return out(502,{error:"GitHub a refusé la suppression de la photo"});}
    return out(200,{success:true});
  }catch(e){console.error(e);return out(500,{error:"Erreur pendant la suppression de la photo"});}
};