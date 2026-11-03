import { handler as h0 } from "../../../cloudflare/handlers/admin-login.mjs";
import { handler as h1 } from "../../../cloudflare/handlers/admin-session.mjs";
import { handler as h2 } from "../../../cloudflare/handlers/admin-logout.mjs";
import { handler as h3 } from "../../../cloudflare/handlers/admin-add-vehicle.mjs";
import { handler as h4 } from "../../../cloudflare/handlers/admin-upload-photo.mjs";
import { handler as h5 } from "../../../cloudflare/handlers/admin-delete-photo.mjs";
import { handler as h6 } from "../../../cloudflare/handlers/admin-manage-vehicle.mjs";
const handlers={"admin-login":h0,"admin-session":h1,"admin-logout":h2,"admin-add-vehicle":h3,"admin-upload-photo":h4,"admin-delete-photo":h5,"admin-manage-vehicle":h6};
const reply=(status,data)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function onRequest({request,env}){
 const url=new URL(request.url);
 const name=url.pathname.split("/").filter(Boolean).pop();
 const handler=handlers[name];
 if(!handler)return reply(503,{error:"Ce service n’est pas encore migré sur Cloudflare."});
 if(!["GET","POST"].includes(request.method))return reply(405,{error:"Méthode non autorisée"});
 const origin=request.headers.get("origin");
 if(request.method==="POST" && origin && origin!==url.origin)return reply(403,{error:"Origine non autorisée"});
 const required=name==="admin-logout"?[]:name==="admin-login"?["MBOA_ADMIN_PASSWORD","MBOA_ADMIN_SESSION_SECRET"]:name==="admin-session"?["MBOA_ADMIN_SESSION_SECRET"]:["MBOA_ADMIN_SESSION_SECRET","MBOA_GITHUB_TOKEN"];
 const missing=required.filter(k=>!env[k]);
 if(missing.length)return reply(503,{error:"Configuration Cloudflare incomplète : "+missing.join(", ")});
 try{
 const body=request.method==="POST"?await request.text():"";
 if(body.length>12000000)return reply(413,{error:"Demande trop volumineuse"});
 const result=await handler({httpMethod:request.method,headers:Object.fromEntries(request.headers),body,queryStringParameters:Object.fromEntries(url.searchParams),requestOrigin:url.origin},env);
 return new Response(result.body||"{}",{status:result.statusCode||200,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...result.headers}});
 }catch(error){console.error("Cloudflare admin request failed");return reply(500,{error:"Service administrateur indisponible. Réessayez."});}
}
