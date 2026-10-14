import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import cfw11 from './cfw11.ts';
import classic from './classic.ts';
import integrated from './integrated.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'https://fabrica-virtual-4-0.netlify.app','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return answer({error:'Método não permitido.'},405);
 try{
  const bearer=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!bearer)return answer({error:'Entre na sua conta para abrir a bancada.'},401);
  const {data:{user},error}=await db.auth.getUser(bearer);
  if(error||!user)return answer({error:'Sessão inválida. Entre novamente.'},401);
  if(!user.email_confirmed_at)return answer({error:'Confirme seu e-mail antes de abrir a bancada.'},403);
  const [roles,orders,licenses]=await Promise.all([
   db.from('user_roles').select('role').eq('user_id',user.id).maybeSingle(),
   db.from('factory_orders').select('id').eq('user_id',user.id).eq('status','paid').limit(1),
   db.from('lifetime_licenses').select('user_id').eq('user_id',user.id).maybeSingle()
  ]);
  if(roles.error||orders.error||licenses.error)return answer({error:'Não foi possível consultar seu acesso.'},503);
  const admin=roles.data?.role==='admin';
  const allowed=admin||!!orders.data?.length||!!licenses.data;
  const body=await req.json();
  if(body.action==='access')return answer({allowed,admin,email:user.email});
  if(!allowed)return answer({error:'Sua conta ainda não possui pagamento confirmado.'},403);
  const html=body.lab==='classic'?classic:body.lab==='cfw11'?cfw11:body.lab==='integrated'?integrated:null;
  if(!html)return answer({error:'Bancada não encontrada.'},404);
  return answer({html,lab:body.lab});
 }catch{return answer({error:'Não foi possível abrir a bancada agora.'},500)}
});
