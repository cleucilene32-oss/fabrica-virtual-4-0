const db = window.supabase?.createClient('https://xilykohtdxtczrdnoujx.supabase.co','sb_publishable_b1fT8Gm9lOxcu3fglJ7V-A_OitqVSO7');
let activeUser=null,hasLifetimeLicense=false;
const showAuth=(message)=>document.querySelector('#authStatus').textContent=message;
async function refreshAccess(){
 if(!db){showAuth('Falha ao carregar a autenticação. Recarregue a página.');return;}
 const {data:{user},error}=await db.auth.getUser();
 activeUser=error?null:user;hasLifetimeLicense=false;
 if(!activeUser){document.querySelector('#licenseStatus').textContent='Acesso às bancadas bloqueado até a confirmação da conta e a ativação de uma licença.';return;}
 const result=await db.from('lifetime_licenses').select('granted_at').eq('user_id',activeUser.id).maybeSingle();
 if(result.error){showAuth('Não foi possível verificar a licença: '+result.error.message);return;}
 hasLifetimeLicense=!!result.data;
 showAuth('Conectado: '+activeUser.email);
 document.querySelector('#licenseStatus').textContent=hasLifetimeLicense?'Licença vitalícia ativa. Bancadas liberadas.':'Sem licença ativa. Valor: R$ 99,99, pagamento único. O checkout ainda não está disponível.';
}
async function authenticate(event){
 event.preventDefault();if(!db)return showAuth('Serviço de login indisponível.');
 const {error}=await db.auth.signInWithPassword({email:document.querySelector('#email').value.trim(),password:document.querySelector('#password').value});
 if(error)return showAuth('Não foi possível entrar: '+error.message);
 await refreshAccess();
}
async function register(){
 if(authRequestRunning)return showAuth('Aguarde a resposta da solicitação anterior.');
 if(Date.now()-lastSignupAt<60000)return showAuth('Aguarde um minuto para evitar bloqueio por tentativas repetidas.');
 if(!db)return showAuth('Serviço de cadastro indisponível.');
 const email=document.querySelector('#email').value.trim();
 const password=document.querySelector('#password').value;
 if(!email||password.length<6)return showAuth('Informe e-mail e senha de pelo menos 6 caracteres.');
 lastSignupAt=Date.now();authRequestRunning=true;
 showAuth('Solicitando cadastro...');
 try{
  const {error}=await db.auth.signUp({email,password,options:{emailRedirectTo:'https://fabrica-virtual-4-0.netlify.app/'}});
  if(error)return showAuth(error.status===429?'Muitas tentativas. Aguarde um minuto e tente novamente.':'Cadastro não concluído: '+error.message);
  showAuth('Verifique o e-mail mais recente para confirmar o cadastro. Caso já tenha conta, use Reenviar confirmação.');
 }catch(e){showAuth('Falha na conexão com o serviço de cadastro. Tente novamente.')}
 finally{authRequestRunning=false}
}
let lastResendAt=0, lastSignupAt=0, authRequestRunning=false;
async function resendConfirmation(){
 if(authRequestRunning)return showAuth('Aguarde a resposta da solicitação anterior.');
 if(!db)return showAuth('Serviço de cadastro indisponível.');
 const email=document.querySelector('#email').value.trim();
 if(!email)return showAuth('Digite seu e-mail para reenviar a confirmação.');
 if(Date.now()-lastResendAt<60000)return showAuth('Aguarde um minuto antes de solicitar outro e-mail.');
 lastResendAt=Date.now();authRequestRunning=true;
 showAuth('Solicitando novo e-mail...');
 try{
  const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:'https://fabrica-virtual-4-0.netlify.app/'}});
  if(error)return showAuth(error.status===429?'Limite temporário de envios. Aguarde alguns minutos.':'Não foi possível reenviar: '+error.message);
  showAuth('Novo e-mail solicitado! Abra a mensagem mais recente do Supabase Auth e confirme.');
 }catch(e){showAuth('Falha de conexão. Tente novamente mais tarde.')}
 finally{authRequestRunning=false}
}
async function logout(){if(db)await db.auth.signOut();activeUser=null;hasLifetimeLicense=false;voltarSeAberto();await refreshAccess()}
function voltarSeAberto(){document.querySelector('#lab').classList.add('hidden');document.querySelector('#factory').classList.add('hidden');document.querySelector('.hero').classList.remove('hidden')}
if(db){db.auth.onAuthStateChange(()=>setTimeout(refreshAccess,0));refreshAccess()}else{showAuth('Não foi possível iniciar o login.')}
let running=false,faulted=false,count=0,mode='Treinamento',timer=null;
function entrar(){if(!hasLifetimeLicense){document.querySelector('#access').scrollIntoView({behavior:'smooth'});showAuth(activeUser?'Sua conta ainda não possui licença vitalícia ativa.':'Faça login e adquira a licença para abrir as bancadas.');return;}document.querySelector('.hero').classList.add('hidden');document.querySelector('#factory').classList.remove('hidden')}
function openLab(n){if(!hasLifetimeLicense){voltarSeAberto();document.querySelector('#access').scrollIntoView({behavior:'smooth'});return;}document.querySelector('#factory').classList.add('hidden');document.querySelector('#lab').classList.remove('hidden');document.querySelector('#labTitle').textContent=n;para();progress();window.scrollTo(0,0)}
function voltar(){para();document.querySelector('#lab').classList.add('hidden');document.querySelector('#factory').classList.remove('hidden');window.scrollTo(0,0)}
function setMode(m){mode=m;document.querySelector('#modeText').textContent='Modo: '+m+(m==='Treinamento'?' — siga as etapas e receba orientação.':m==='Desafio'?' — resolva sem indicação de ligação correta.':' — explore livremente a bancada.');progress()}
function wire(b){b.classList.toggle('connected');faulted=false;progress()}
function ready(){return document.querySelectorAll('.terminal.connected').length===3}
function gira(){if(faulted){diag('Falha ativa. Faça o reset conectando novamente o circuito.');return}if(!ready()){diag('Intertravamento: complete as três ligações antes de partir.');return}running=true;document.querySelector('#belt').classList.add('running');updateRpm();startCount();progress()}
function para(){running=false;document.querySelector('#belt').classList.remove('running');document.querySelector('#press').classList.remove('active');document.querySelector('#status').textContent='PARADO • 0 rpm';if(timer){clearInterval(timer);timer=null}progress()}
function fault(){faulted=true;para();document.querySelector('#status').textContent='FALHA • acionamento bloqueado';diag('Falha simulada: verifique cabos, referência e comando antes de reiniciar.')}
function updateRpm(){let r=document.querySelector('#rpm').value;document.querySelector('#rpmv').textContent=r;if(running)document.querySelector('#status').textContent='GIRANDO • '+r+' rpm'}
function startCount(){if(timer)return;timer=setInterval(()=>{if(running){count++;document.querySelector('#counter').textContent='Peças: '+count;document.querySelector('#press').classList.toggle('active')}},1800)}
function diag(t){document.querySelector('#diag').textContent=t}
function progress(){let c=document.querySelectorAll('.terminal.connected').length;let p=Math.min(100,c*25+(running?25:0));document.querySelector('#score').textContent=p+'%';document.querySelector('#bar').style.width=p+'%';if(!faulted){if(c<3)diag(mode==='Desafio'?'Diagnostique o circuito e libere a máquina.':'Conecte os três circuitos para liberar a operação.');else if(!running)diag('Circuito pronto. Acione GIRA para iniciar a célula.');else diag('Célula em produção: inversor, motor, esteira e prensa operando.')}}