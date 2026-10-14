'use strict';
const $=id=>document.getElementById(id);
const db=window.supabase?.createClient('https://xilykohtdxtczrdnoujx.supabase.co','sb_publishable_b1fT8Gm9lOxcu3fglJ7V-A_OitqVSO7');
const titles={classic:'CFW11 · Bancada antiga',cfw11:'WEG CFW11 · Bancada original',integrated:'S7‑1200 + CFW11 · Esteira integrada'};
let session=null,permission=null,selected=null,authMode='login',busy=false,requestNumber=0,lastEmailAt=0,activeLab=null;
const message=text=>$('authStatus').textContent=text;
async function api(body){
 const current=await db.auth.getSession();
 if(!current.data.session)throw new Error('Entre na sua conta para continuar.');
 const response=await fetch('https://xilykohtdxtczrdnoujx.supabase.co/functions/v1/factory-labs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+current.data.session.access_token},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível consultar o laboratório.');return data;
}
function closeLab(){requestNumber++;activeLab=null;$('labFrame').removeAttribute('srcdoc');$('workspace').hidden=true;$('home').hidden=false;$('footer').hidden=false;document.body.classList.remove('in-lab');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}
function showLogin(){if(!$('authDialog').open)$('authDialog').showModal();$('selectedInfo').textContent=selected?'Você escolheu '+titles[selected]+'. Entre para continuar.':'Use o e-mail cadastrado para acessar suas bancadas.';$('email').focus();}
async function refresh(){
 const {data}=await db.auth.getSession();session=data.session;permission=null;
 $('accountLabel').textContent=session?.user.email||'Seu laboratório de prática';$('logout').hidden=!session;$('accountButton').textContent=session?'Ver meu acesso':'Entrar na minha conta';
 if(!session){closeLab();$('accessStatus').textContent='Escolha uma bancada para entrar. O acesso é liberado para administrador ou conta com licença ativa.';return;}
 try{permission=await api({action:'access'});$('accessStatus').textContent=permission.admin?'Acesso de administrador ativo. Escolha uma bancada para testar.':permission.allowed?'Sua licença está ativa. Escolha uma bancada para praticar.':'Você está conectado. Sua conta ainda não tem licença ativa; o pagamento está em configuração.';if($('authDialog').open){if(permission.allowed){$('authDialog').close();if(selected)await openLab(selected)}else message($('accessStatus').textContent)}}catch(e){$('accessStatus').textContent=e.message;if($('authDialog').open)message(e.message)}
}
async function openLab(lab){
 selected=lab;if(!session){showLogin();return;}
 const ticket=++requestNumber;const buttons=document.querySelectorAll('.open-lab');buttons.forEach(b=>b.disabled=true);$('accessStatus').textContent='Abrindo '+titles[lab]+'…';
 try{const result=await api({action:'lab',lab});if(ticket!==requestNumber)return;
  activeLab=lab;let html=result.html;
  if(lab==='integrated'){let cache={};try{cache=JSON.parse(localStorage.getItem('fv4:assembly:'+session.user.id)||'{}')}catch{}html=html.replace('const storeCache={}', 'const storeCache='+JSON.stringify(cache).replace(/</g,'\\u003c'));}
  $('labFrame').srcdoc=html;$('workspaceTitle').textContent=titles[lab];$('home').hidden=true;$('footer').hidden=true;$('workspace').hidden=false;document.body.classList.add('in-lab');$('authDialog').close();window.scrollTo(0,0);$('back').focus();
 }catch(e){$('accessStatus').textContent=e.message;if($('authDialog').open)message(e.message)}finally{buttons.forEach(b=>b.disabled=false)}
}
window.addEventListener('message',event=>{if(event.source!==$('labFrame').contentWindow||activeLab!=='integrated'||!session)return;const d=event.data;if(d?.type!=='lab-save'||d.lab!=='integrated'||typeof d.key!=='string'||typeof d.value!=='string'||d.value.length>100000)return;try{const key='fv4:assembly:'+session.user.id;const cache=JSON.parse(localStorage.getItem(key)||'{}');cache[d.key]=d.value;localStorage.setItem(key,JSON.stringify(cache))}catch{}});
function setBusy(value){busy=value;document.querySelectorAll('#authDialog button').forEach(b=>{if(b.id!=='closeDialog')b.disabled=value});}
$('authForm').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;if(!db)return message('O serviço de acesso não carregou. Atualize a página.');setBusy(true);message(authMode==='login'?'Entrando…':'Criando sua conta…');try{const email=$('email').value.trim(),password=$('password').value;const result=authMode==='login'?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/'}});if(result.error)throw result.error;$('password').value='';if(result.data.session){await refresh()}else message('Cadastro solicitado. Confirme seu e-mail para entrar.')}catch(e){message(e.status===429?'Limite de tentativas atingido. Aguarde antes de tentar novamente.':e.message==='Invalid login credentials'?'E-mail ou senha incorretos. Confira os dados ou solicite um link de acesso.':e.message==='Email not confirmed'?'Confirme seu e-mail antes de entrar. Veja a ajuda abaixo.':e.message)}finally{setBusy(false)}});
$('toggleAuth').onclick=()=>{authMode=authMode==='login'?'signup':'login';$('authTitle').textContent=authMode==='login'?'Entre na sua conta':'Crie sua conta';$('submitAuth').textContent=authMode==='login'?'Entrar':'Criar conta';$('toggleAuth').textContent=authMode==='login'?'Criar uma conta':'Já tenho uma conta';$('password').autocomplete=authMode==='login'?'current-password':'new-password';message('')};
async function emailAction(resend){if(busy)return;if(!db)return message('Atualize a página para carregar o serviço de acesso.');if(!$('email').reportValidity())return;if(Date.now()-lastEmailAt<60000)return message('Aguarde um minuto antes de solicitar outro e-mail.');setBusy(true);lastEmailAt=Date.now();message('Solicitando e-mail…');try{const email=$('email').value.trim();const result=resend?await db.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+'/'}}):await db.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+'/'}});if(result.error)throw result.error;message('Solicitação aceita. Confira a mensagem mais recente na caixa de entrada e no spam.')}catch(e){message(e.status===429?'O serviço atingiu o limite de envio. Aguarde; pedidos repetidos não resolvem.':e.message)}finally{setBusy(false)}}
$('magicLink').onclick=()=>emailAction(false);$('resend').onclick=()=>emailAction(true);$('closeDialog').onclick=()=>$('authDialog').close();$('accountButton').onclick=()=>{selected=null;showLogin();if(session)message($('accessStatus').textContent)};$('logout').onclick=async()=>{closeLab();await db?.auth.signOut();await refresh()};$('back').onclick=()=>{closeLab();$('catalogTitle').scrollIntoView({behavior:'smooth'});refresh()};$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('workspace').requestFullscreen()}catch{$('fullscreen').textContent='Use o modo horizontal'}};
document.querySelectorAll('.open-lab').forEach(button=>button.onclick=()=>openLab(button.dataset.lab));
if(db){db.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh()}else{$('accessStatus').textContent='Falha ao carregar o serviço de acesso. Atualize a página.'}
