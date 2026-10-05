const crypto=require("crypto");
const COOKIE_NAME="mboa_admin_session";
const OWNER="arthur-ambadiang05", REPO="mboa-auto-site", BRANCH="main", FILE="data/vehicules.json";

function cookies(h=""){return h.split(";").map(x=>x.trim()).filter(Boolean).reduce((a,c)=>{const i=c.indexOf("=");if(i>-1)a[c.slice(0,i)]=c.slice(i+1);return a;},{});}
function validSession(s,secret){if(!s||!secret)return false;const p=s.split(".");if(p.length!==2)return false;const [e,sig]=p;const exp=crypto.createHmac("sha256",secret).update(e).digest("hex");const a=Buffer.from(sig),b=Buffer.from(exp);return a.length===b.length&&crypto.timingSafeEqual(a,b)&&Number(e)>Math.floor(Date.now()/1000);}
function out(code,data){return{statusCode:code,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(data)};}
function ghHeaders(t){return{Authorization:"Bearer "+t,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"Mboa-Auto-Admin","Content-Type":"application/json"};}

exports.handler=async(event)=>{
  if(!["GET","POST"].includes(event.httpMethod)) return out(405,{error:"Méthode non autorisée"});
  const secret=process.env.MBOA_ADMIN_SESSION_SECRET, token=process.env.MBOA_GITHUB_TOKEN;
  if(!secret||!token) return out(500,{error:"Configuration serveur incomplète"});
  if(!validSession(cookies(event.headers.cookie||"")[COOKIE_NAME],secret)) return out(401,{error:"Session administrateur invalide"});

  try{
    if(event.httpMethod==="POST" && event.headers.origin && event.headers.origin!=="https://mboaauto.com") return out(403,{error:"Origine non autorisée"});
    const body=JSON.parse(event.body||"{}");
    const action=body.action, slug=String(body.slug||"").trim();
    if(event.httpMethod!=="GET" && !/^[a-z0-9-]+$/.test(slug)) return out(400,{error:"Identifiant véhicule invalide"});

    const url=`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;
    const headers=ghHeaders(token);
    const r=await fetch(url,{headers});
    if(!r.ok) throw new Error("Lecture du registre impossible");
    const f=await r.json();
    const vehicles=JSON.parse(Buffer.from(f.content,"base64").toString("utf8"));
    if(event.httpMethod==="GET") return out(200,{vehicles});
    const idx=vehicles.findIndex(v=>v.slug===slug);
    if(idx===-1) return out(404,{error:"Véhicule introuvable"});

    let message="";
    if(action==="status"){
      if(!["disponible","reserve","vendu"].includes(body.status)) return out(400,{error:"Statut invalide"});
      vehicles[idx].status=body.status;
      message="Statut véhicule : "+slug;
    }else if(action==="delete"){
      vehicles.splice(idx,1);
      message="Suppression annonce : "+slug;
    }else if(action==="update"){
      const v=body.vehicle||{};
      const keepSlug=vehicles[idx].slug;
      if(!["disponible","reserve","vendu"].includes(v.status)) return out(400,{error:"Statut invalide"});
      const fields=["brand","name","year","type","fuel","price","price_display","location","specs","description","status"];
      for(const k of fields){ if(v[k]===undefined||v[k]===null||v[k]==="") return out(400,{error:"Champ manquant : "+k}); }
      vehicles[idx]={...vehicles[idx],...v,slug:keepSlug,year:Number(v.year),price:Number(v.price)};
      message="Modification véhicule : "+vehicles[idx].name;
    }else return out(400,{error:"Action invalide"});

    const content=Buffer.from(JSON.stringify(vehicles,null,2)+"\n","utf8").toString("base64");
    const w=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`,{
      method:"PUT",headers,body:JSON.stringify({message,content,sha:f.sha,branch:BRANCH})
    });
    if(!w.ok){const t=await w.text();console.error(t);return out(502,{error:"GitHub a refusé la mise à jour"});}
    const result=await w.json();
    return out(200,{success:true,commit:result.commit?.sha||null});
  }catch(e){console.error(e);return out(500,{error:"Erreur pendant la mise à jour de l’annonce"});}
};