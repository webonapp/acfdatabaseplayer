const $=id=>document.getElementById(id);
const cfg=window.APP_CONFIG||{};
const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes('INSERISCI_QUI')&&cfg.SUPABASE_PUBLISHABLE_KEY&&!cfg.SUPABASE_PUBLISHABLE_KEY.includes('INSERISCI_QUI');

const AUTH_STORAGE_KEY='player-database-auth';
try{
  if(!localStorage.getItem(AUTH_STORAGE_KEY)){
    for(const oldKey of ['player-database-auth-v20','player-database-auth-v18','player-database-auth-v17']){
      const value=localStorage.getItem(oldKey);
      if(value){localStorage.setItem(AUTH_STORAGE_KEY,value);break;}
    }
  }
}catch(_){}

let db=configured?window.supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY,
  {auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storage:window.localStorage,
    storageKey:AUTH_STORAGE_KEY
  }}
):null;

let teams=[],players=[],selectedFile=null;
let selectedFiles=[],batchResults=[],currentBatchIndex=0,batchMode=false;
let currentSession=null;
let authBooted=false;

if(!configured)$('setupBanner')?.classList.remove('hidden');

function setLoginError(message=''){
  const box=$('loginError');
  if(!box)return;
  box.textContent=message||'';
  box.classList.toggle('hidden',!message);
}
function showLogin(message=''){
  currentSession=null;
  document.body.classList.add('auth-locked');
  $('authGate')?.classList.remove('hidden');
  setLoginError(message);
}
function hideLogin(session){
  currentSession=session||null;
  document.body.classList.remove('auth-locked');
  $('authGate')?.classList.add('hidden');
  setLoginError('');
  if($('sideAccountEmail'))$('sideAccountEmail').textContent=session?.user?.email||'';
}
async function loginWithPassword(email,password){
  if(!db)throw new Error('SUPABASE NON CONFIGURATO.');
  if(!email)throw new Error('INSERISCI L’EMAIL.');
  if(!password)throw new Error('INSERISCI LA PASSWORD.');
  const {data,error}=await db.auth.signInWithPassword({email:email.trim(),password});
  if(error){
    if(String(error.message).toLowerCase().includes('invalid login credentials'))throw new Error('EMAIL O PASSWORD NON CORRETTI.');
    throw error;
  }
  if(!data?.session)throw new Error('ACCESSO NON COMPLETATO.');
  return data.session;
}
async function logout(){
  if(!db)return;
  const {error}=await db.auth.signOut();
  if(error)return alert(error.message);
  showLogin();
}
async function initializeAuth(){
  if(authBooted)return;
  authBooted=true;
  if(!db){showLogin('SUPABASE NON CONFIGURATO.');return;}

  try{
    const {data,error}=await db.auth.getSession();
    if(error)throw error;
    const session=data?.session||null;

    if(session){
      hideLogin(session);
      try{
        await loadAll();
      }catch(dbErr){
        console.error('DATABASE LOAD ERROR',dbErr);
        alert('SESSIONE RIPRISTINATA. ERRORE CARICAMENTO DATABASE: '+(dbErr?.message||dbErr));
      }
    }else{
      showLogin();
    }

    db.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){showLogin();return;}
      if(session)hideLogin(session);
    });
  }catch(err){
    console.error('AUTH INIT ERROR',err);
    showLogin(err?.message||'ERRORE RIPRISTINO SESSIONE.');
  }
}
async function ensureWriteSession(){
  if(!db)throw new Error('SUPABASE NON CONFIGURATO.');
  const {data,error}=await db.auth.getSession();
  if(error)throw error;
  if(!data?.session){
    showLogin('SESSIONE SCADUTA. EFFETTUA NUOVAMENTE IL LOGIN.');
    throw new Error('SESSIONE SCADUTA.');
  }
  currentSession=data.session;
  return data.session;
}

(function bindAuth(){
  $('loginForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=$('loginBtn');
    if(btn){btn.disabled=true;btn.textContent='ACCESSO...';}
    try{
      const session=await loginWithPassword($('loginEmail')?.value||'',$('loginPassword')?.value||'');
      hideLogin(session);
      if($('loginPassword'))$('loginPassword').value='';
      await loadAll();
    }catch(err){
      console.error(err);
      showLogin(err?.message||'ERRORE LOGIN.');
    }finally{
      if(btn){btn.disabled=false;btn.textContent='ACCEDI';}
    }
  });

  $('togglePassword')?.addEventListener('click',e=>{
    e.preventDefault();
    const p=$('loginPassword');
    if(!p)return;
    const show=p.type==='password';
    p.type=show?'text':'password';
    $('togglePassword').textContent=show?'NASCONDI':'MOSTRA';
  });

  $('logoutBtn')?.addEventListener('click',logout);
})();

// Nazioni disponibili: bandiera emoji + nome. Nessun file esterno necessario.
const COUNTRIES=[
['AF','AFGHANISTAN'],['AL','ALBANIA'],['DZ','ALGERIA'],['AD','ANDORRA'],['AO','ANGOLA'],['AG','ANTIGUA E BARBUDA'],['SA','ARABIA SAUDITA'],['AR','ARGENTINA'],['AM','ARMENIA'],['AU','AUSTRALIA'],['AT','AUSTRIA'],['AZ','AZERBAIGIAN'],['BS','BAHAMAS'],['BH','BAHRAIN'],['BD','BANGLADESH'],['BB','BARBADOS'],['BE','BELGIO'],['BZ','BELIZE'],['BJ','BENIN'],['BT','BHUTAN'],['BY','BIELORUSSIA'],['BO','BOLIVIA'],['BA','BOSNIA ED ERZEGOVINA'],['BW','BOTSWANA'],['BR','BRASILE'],['BN','BRUNEI'],['BG','BULGARIA'],['BF','BURKINA FASO'],['BI','BURUNDI'],['KH','CAMBOGIA'],['CM','CAMERUN'],['CA','CANADA'],['CV','CAPO VERDE'],['TD','CIAD'],['CL','CILE'],['CN','CINA'],['CY','CIPRO'],['CO','COLOMBIA'],['KM','COMORE'],['CG','CONGO'],['CD','REPUBBLICA DEMOCRATICA DEL CONGO'],['KP','COREA DEL NORD'],['KR','COREA DEL SUD'],['CI','COSTA D’AVORIO'],['CR','COSTA RICA'],['HR','CROAZIA'],['CU','CUBA'],['DK','DANIMARCA'],['DM','DOMINICA'],['EC','ECUADOR'],['EG','EGITTO'],['SV','EL SALVADOR'],['AE','EMIRATI ARABI UNITI'],['ER','ERITREA'],['EE','ESTONIA'],['SZ','ESWATINI'],['ET','ETIOPIA'],['FJ','FIJI'],['PH','FILIPPINE'],['FI','FINLANDIA'],['FR','FRANCIA'],['GA','GABON'],['GM','GAMBIA'],['GE','GEORGIA'],['DE','GERMANIA'],['GH','GHANA'],['JM','GIAMAICA'],['JP','GIAPPONE'],['DJ','GIBUTI'],['JO','GIORDANIA'],['GR','GRECIA'],['GD','GRENADA'],['GT','GUATEMALA'],['GN','GUINEA'],['GW','GUINEA-BISSAU'],['GQ','GUINEA EQUATORIALE'],['GY','GUYANA'],['HT','HAITI'],['HN','HONDURAS'],['IN','INDIA'],['ID','INDONESIA'],['IR','IRAN'],['IQ','IRAQ'],['IE','IRLANDA'],['IS','ISLANDA'],['IL','ISRAELE'],['IT','ITALIA'],['KZ','KAZAKISTAN'],['KE','KENYA'],['KG','KIRGHIZISTAN'],['KI','KIRIBATI'],['KW','KUWAIT'],['LA','LAOS'],['LS','LESOTHO'],['LV','LETTONIA'],['LB','LIBANO'],['LR','LIBERIA'],['LY','LIBIA'],['LI','LIECHTENSTEIN'],['LT','LITUANIA'],['LU','LUSSEMBURGO'],['MK','MACEDONIA DEL NORD'],['MG','MADAGASCAR'],['MW','MALAWI'],['MY','MALESIA'],['MV','MALDIVE'],['ML','MALI'],['MT','MALTA'],['MA','MAROCCO'],['MH','ISOLE MARSHALL'],['MR','MAURITANIA'],['MU','MAURITIUS'],['MX','MESSICO'],['FM','MICRONESIA'],['MD','MOLDAVIA'],['MC','MONACO'],['MN','MONGOLIA'],['ME','MONTENEGRO'],['MZ','MOZAMBICO'],['MM','MYANMAR'],['NA','NAMIBIA'],['NR','NAURU'],['NP','NEPAL'],['NI','NICARAGUA'],['NE','NIGER'],['NG','NIGERIA'],['NO','NORVEGIA'],['NZ','NUOVA ZELANDA'],['OM','OMAN'],['NL','PAESI BASSI'],['PK','PAKISTAN'],['PW','PALAU'],['PS','PALESTINA'],['PA','PANAMA'],['PG','PAPUA NUOVA GUINEA'],['PY','PARAGUAY'],['PE','PERÙ'],['PL','POLONIA'],['PT','PORTOGALLO'],['QA','QATAR'],['GB','REGNO UNITO'],['CZ','REPUBBLICA CECA'],['CF','REPUBBLICA CENTRAFRICANA'],['DO','REPUBBLICA DOMINICANA'],['RO','ROMANIA'],['RW','RUANDA'],['RU','RUSSIA'],['KN','SAINT KITTS E NEVIS'],['LC','SAINT LUCIA'],['VC','SAINT VINCENT E GRENADINE'],['WS','SAMOA'],['SM','SAN MARINO'],['ST','SÃO TOMÉ E PRÍNCIPE'],['SN','SENEGAL'],['RS','SERBIA'],['SC','SEYCHELLES'],['SL','SIERRA LEONE'],['SG','SINGAPORE'],['SY','SIRIA'],['SK','SLOVACCHIA'],['SI','SLOVENIA'],['SB','ISOLE SALOMONE'],['SO','SOMALIA'],['ES','SPAGNA'],['LK','SRI LANKA'],['US','STATI UNITI'],['ZA','SUDAFRICA'],['SD','SUDAN'],['SS','SUD SUDAN'],['SR','SURINAME'],['SE','SVEZIA'],['CH','SVIZZERA'],['TJ','TAGIKISTAN'],['TW','TAIWAN'],['TZ','TANZANIA'],['TH','THAILANDIA'],['TL','TIMOR EST'],['TG','TOGO'],['TO','TONGA'],['TT','TRINIDAD E TOBAGO'],['TN','TUNISIA'],['TR','TURCHIA'],['TM','TURKMENISTAN'],['TV','TUVALU'],['UA','UCRAINA'],['UG','UGANDA'],['HU','UNGHERIA'],['UY','URUGUAY'],['UZ','UZBEKISTAN'],['VU','VANUATU'],['VA','CITTÀ DEL VATICANO'],['VE','VENEZUELA'],['VN','VIETNAM'],['YE','YEMEN'],['ZM','ZAMBIA'],['ZW','ZIMBABWE'],
// Selezioni calcistiche utili
['GB-ENG','INGHILTERRA'],['GB-SCT','SCOZIA'],['GB-WLS','GALLES'],['GB-NIR','IRLANDA DEL NORD'],['XK','KOSOVO']
];
const COUNTRY_FLAG_OVERRIDES={
  'GB-ENG':'🇬🇧',
  'GB-SCT':'🇬🇧',
  'GB-WLS':'🇬🇧',
  'GB-NIR':'🇬🇧',
  'XK':'🇽🇰'
};
function flagEmoji(code){
 if(COUNTRY_FLAG_OVERRIDES[code])return COUNTRY_FLAG_OVERRIDES[code];
 if(!/^[A-Z]{2}$/.test(code))return '🌐';
 return code.replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt()));
}

function countryCodeForName(name){
 const target=norm(name);
 const found=COUNTRIES.find(([,n])=>norm(n)===target);
 return found?.[0]||'';
}

function countryLabel(name){
 const c=COUNTRIES.find(x=>norm(x[1])===norm(name));
 return c?`${flagEmoji(c[0])} ${c[1]}`:String(name||'');
}

function populateCountrySearch(){
 const list=$('nationalityOptions');
 if(!list)return;

 const sorted=COUNTRIES
   .slice()
   .sort((a,b)=>a[1].localeCompare(b[1],'it'));

 // value stays clean (e.g. INGHILTERRA), label displays the flag.
 list.innerHTML=sorted
   .map(([code,name])=>`<option value="${esc(name)}" label="${flagEmoji(code)} ${esc(name)}"></option>`)
   .join('');
}

function sanitizeNationalityInput(value){
 let text=String(value||'').trim();

 // Accept pasted/selected values that may contain a leading flag emoji.
 text=text.replace(/^[\p{Regional_Indicator}\u{1F3F4}\u{1F30D}\u{1F310}\u{1F5FA}\uFE0F\u200D\s]+/u,'').trim();

 return resolveNationality(text);
}

function syncNationalityField(el){
 if(!el)return;
 const resolved=sanitizeNationalityInput(el.value);
 if(resolved)el.value=resolved;
}

function populateCountrySelects(){
 populateCountrySearch();

 // Keep previously stored values normalized.
 ['fNation','iNationality','nationality'].forEach(id=>{
   const el=$(id);
   if(el&&el.value)el.value=sanitizeNationalityInput(el.value);
 });
}


function upper(v){return String(v??'').toUpperCase().trim()}
function resolveNationality(v){
  const raw=String(v??'').trim();
  if(!raw)return '';
  const aliases={
    'DENMARK':'DANIMARCA','DANMARK':'DANIMARCA',
    'ITALY':'ITALIA','SPAIN':'SPAGNA','FRANCE':'FRANCIA','GERMANY':'GERMANIA',
    'CROATIA':'CROAZIA','ENGLAND':'INGHILTERRA','UNITED KINGDOM':'REGNO UNITO',
    'NETHERLANDS':'PAESI BASSI','HOLLAND':'PAESI BASSI','PORTUGAL':'PORTOGALLO',
    'BRAZIL':'BRASILE','TURKEY':'TURCHIA','SWITZERLAND':'SVIZZERA',
    'BELGIUM':'BELGIO','NORWAY':'NORVEGIA','SWEDEN':'SVEZIA','POLAND':'POLONIA',
    'UKRAINE':'UCRAINA','USA':'STATI UNITI','UNITED STATES':'STATI UNITI',
    'MOROCCO':'MAROCCO','CAMEROON':'CAMERUN','IVORY COAST':"COSTA D'AVORIO"
  };
  const target=upper(aliases[upper(raw)]||raw);
  const found=COUNTRIES.find(([,name])=>norm(name)===norm(target));
  return found?found[1]:target;
}

function age(y){if(!y)return'';const d=new Date(),b=new Date(d.getFullYear(),2,1);return d.getFullYear()-Number(y)-(d<b?1:0)}function tags(v){return Array.isArray(v)?v:[]}function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function initials(p){return`${(p.first_name||'')[0]||''}${(p.last_name||'')[0]||''}`}
async function loadAll(){if(!db||!currentSession)return;const{data:t,error:te}=await db.from('teams').select('*').order('name');if(te)throw te;teams=t||[];const{data:p,error:pe}=await db.from('players').select('*, teams(name)').order('updated_at',{ascending:false});if(pe)throw pe;players=p||[];populateFilters();renderDashboard();renderPlayersPage();renderTeamsPage();renderStats()}
function preserve(id,a,l){const e=$(id),v=e.value;e.innerHTML=`<option value="">${l}</option>`+a.map(x=>`<option>${esc(x)}</option>`).join('');e.value=v}
function populateFilters(){
 $('fTeam').innerHTML='<option value="">Tutte</option>'+teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
 $('teamsDatalist').innerHTML=teams.map(t=>`<option value="${esc(t.name)}"></option>`).join('');
 populateCountrySelects();
 preserve('fYear',[...new Set(players.map(p=>p.birth_year).filter(Boolean))].sort((a,b)=>b-a),'Tutti');
}
function matches(p){const q=norm($('q').value),team=$('fTeam').value,role=$('fRole').value,foot=$('fFoot').value,n=$('fNation').value,y=$('fYear').value,hay=norm([p.first_name,p.last_name,p.teams?.name,p.role,p.position,p.foot,p.birth_year,p.nationality,...tags(p.strengths),...tags(p.weaknesses),p.notes].join(' '));return(!q||hay.includes(q))&&(!team||String(p.team_id)===team)&&(!role||norm(p.role)===norm(role))&&(!foot||p.foot===foot)&&(!n||p.nationality===n)&&(!y||String(p.birth_year)===y)}
function row(p){return`<tr><td><div class="playercell"><div class="pface">${esc(initials(p))}</div><span class="num">${p.number??'-'}</span><span class="playername">${esc(p.first_name)} ${esc(p.last_name)}</span></div></td><td class="teamtxt">${esc(p.teams?.name||'-')}</td><td>${esc(p.role||'-')}</td><td>${p.birth_year||'-'}</td><td>${esc(p.foot||'-')}</td><td>${age(p.birth_year)}</td><td>${esc(p.nationality||'-')}</td><td><button class="action-btn" onclick="editPlayer('${p.id}')">MODIFICA</button></td></tr>`}
function renderDashboard(){$('totalPlayers').textContent=players.length;$('totalTeams').textContent=teams.length;$('totalNations').textContent=new Set(players.map(p=>p.nationality).filter(Boolean)).size;$('totalAnalysis').textContent=players.length;const c={};players.forEach(p=>c[p.team_id]=(c[p.team_id]||0)+1);$('tbody').innerHTML=players.filter(matches).slice(0,12).map(row).join('')||'<tr><td colspan="8" style="text-align:center;padding:28px;color:#777">Nessun giocatore trovato</td></tr>'}
function sortedPlayers(){const q=norm($('playersSearch')?.value||'');let out=players.filter(p=>!q||norm([p.first_name,p.last_name,p.teams?.name,p.role,p.nationality,...tags(p.strengths),...tags(p.weaknesses)].join(' ')).includes(q)),m=$('playerSort')?.value||'alphabetical',rr={DIFENSORE:1,CENTROCAMPISTA:2,ATTACCANTE:3};out.sort((a,b)=>m==='age'?age(a.birth_year)-age(b.birth_year)||a.last_name.localeCompare(b.last_name):m==='foot'?String(a.foot).localeCompare(String(b.foot))||a.last_name.localeCompare(b.last_name):m==='role'?(rr[String(a.role).toUpperCase()]||9)-(rr[String(b.role).toUpperCase()]||9)||a.last_name.localeCompare(b.last_name):m==='nationality'?String(a.nationality||'').localeCompare(String(b.nationality||''))||a.last_name.localeCompare(b.last_name):`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));return out}
function renderPlayersPage(){$('playerGrid').innerHTML=sortedPlayers().map(p=>`<article class="player-card"><div class="player-card-head"><div class="pface">${esc(initials(p))}</div><div><h3>${esc(p.last_name)} ${esc(p.first_name)}</h3><div class="sub">${esc(p.teams?.name||'-')} · ${esc(p.role||'-')} · ${age(p.birth_year)} anni · ${esc(p.foot||'-')}</div></div></div><div class="chips">${tags(p.strengths).slice(0,4).map(s=>`<span class="chip">${esc(s)}</span>`).join('')}</div><div class="player-card-actions"><button class="secondary" onclick="editPlayer('${p.id}')">MODIFICA</button><button class="secondary" onclick="deletePlayer('${p.id}')">ELIMINA</button></div></article>`).join('')||'<div style="padding:30px;color:#777">Nessun giocatore.</div>'}
function renderTeamsPage(){
  const counts={};
  players.forEach(p=>counts[p.team_id]=(counts[p.team_id]||0)+1);

  $('teamsGrid').innerHTML=teams
    .slice()
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')))
    .map(t=>`<article class="team-card">
      <h3>${esc(t.name)}</h3>
      <p>${esc(t.country||'')} ${t.competition?'· '+esc(t.competition):''}</p>
      <div class="bigstat">${counts[t.id]||0}</div>
      <p>GIOCATORI ARCHIVIATI</p>
      <div class="team-card-actions">
        <button class="secondary" onclick="openTeamPlayers('${t.id}')">VEDI GIOCATORI</button>
        <button class="secondary" onclick="editTeam('${t.id}')">MODIFICA</button>
        <button class="danger-btn" onclick="deleteTeam('${t.id}')">ELIMINA SQUADRA</button>
      </div>
    </article>`).join('');
}

function renderStats(){
  const roles={DIFENSORE:0,CENTROCAMPISTA:0,ATTACCANTE:0};
  players.forEach(p=>{
    const r=String(p.role||'').toUpperCase();
    if(r in roles)roles[r]++;
  });
  $('statsGrid').innerHTML=[
    ['GIOCATORI',players.length],
    ['SQUADRE',teams.length],
    ['NAZIONALITÀ',new Set(players.map(p=>p.nationality).filter(Boolean)).size],
    ['DIFENSORI',roles.DIFENSORE],
    ['CENTROCAMPISTI',roles.CENTROCAMPISTA],
    ['ATTACCANTI',roles.ATTACCANTE]
  ].map(([l,v])=>`<div class="stat-card"><h3>${l}</h3><div class="bigstat">${v}</div></div>`).join('');
}

function showView(n){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('view-'+n)?.classList.add('active');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===n));if(n==='players')renderPlayersPage();if(n==='teams')renderTeamsPage();if(n==='stats')renderStats();$('sidebar').classList.remove('mobile-open');scrollTo({top:0,behavior:'smooth'})}document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showView(b.dataset.go));['q','fTeam','fRole','fFoot','fYear'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',renderDashboard));
$('fNation')?.addEventListener('input',renderDashboard);$('searchBtn').onclick=renderDashboard;$('filterBtn').onclick=renderDashboard;$('resetBtn').onclick=()=>{['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).value='');renderDashboard()};$('playersSearch').oninput=renderPlayersPage;$('playerSort').onchange=renderPlayersPage;


function openModal(id){$(id).classList.add('open')}function closeModal(id){$(id).classList.remove('open')}$('manualTeamBtn').onclick=()=>openNewTeamModal();
$('teamForm').onsubmit=async e=>{e.preventDefault();if(!db)return alert('SUPABASE NON CONFIGURATO.');try{await ensureWriteSession();const id=$('teamEditId').value;const payload={name:upper($('teamName').value),country:upper($('teamCountry').value),competition:upper($('teamCompetition').value)};if(!payload.name)throw new Error('IL NOME DELLA SQUADRA È OBBLIGATORIO.');const duplicate=teams.find(t=>norm(t.name)===norm(payload.name)&&String(t.id)!==String(id||''));if(duplicate)throw new Error('ESISTE GIÀ UNA SQUADRA CON QUESTO NOME.');if(id){const{error}=await db.from('teams').update(payload).eq('id',id);if(error)throw error}else{const{error}=await db.from('teams').insert(payload);if(error)throw error}$('teamForm').reset();$('teamEditId').value='';closeModal('teamModal');await loadAll();showView('teams')}catch(err){console.error(err);alert(err?.message||'ERRORE DURANTE IL SALVATAGGIO DELLA SQUADRA.')}};
function normalizeRole(v){const n=norm(v);if(n.includes('dif')||n.includes('terz')||n.includes('bracc'))return'DIFENSORE';if(n.includes('centr')||n.includes('mezz')||n.includes('med')||n.includes('trequart'))return'CENTROCAMPISTA';return'ATTACCANTE'}
function openNewTeamModal(){$('teamForm').reset();$('teamEditId').value='';$('teamModalTitle').textContent='NUOVA SQUADRA';openModal('teamModal')}
window.editTeam=id=>{const t=teams.find(x=>String(x.id)===String(id));if(!t)return;$('teamEditId').value=t.id;$('teamModalTitle').textContent='MODIFICA SQUADRA';$('teamName').value=upper(t.name||'');$('teamCountry').value=upper(t.country||'');$('teamCompetition').value=upper(t.competition||'');openModal('teamModal')};
window.deleteTeam=async id=>{const t=teams.find(x=>String(x.id)===String(id));if(!t)return;const linked=players.filter(p=>String(p.team_id)===String(id));let msg=`ELIMINARE DEFINITIVAMENTE LA SQUADRA "${t.name}"?`;if(linked.length)msg+=`\n\nATTENZIONE: CI SONO ${linked.length} GIOCATORI ASSOCIATI.\nELIMINANDO LA SQUADRA VERRANNO ELIMINATI ANCHE TUTTI I GIOCATORI DELLA SQUADRA.`;if(!confirm(msg))return;try{await ensureWriteSession();if(linked.length){const{error:e1}=await db.from('players').delete().eq('team_id',id);if(e1)throw new Error('ERRORE ELIMINAZIONE GIOCATORI: '+e1.message)}const{error:e2}=await db.from('teams').delete().eq('id',id);if(e2)throw new Error('ERRORE ELIMINAZIONE SQUADRA: '+e2.message);await loadAll();showView('teams')}catch(err){console.error(err);alert(err?.message||'ERRORE DURANTE L’ELIMINAZIONE DELLA SQUADRA.')}};
window.editPlayer=id=>{const p=players.find(x=>String(x.id)===String(id));if(!p)return;$('playerId').value=p.id;$('firstName').value=p.first_name||'';$('lastName').value=p.last_name||'';$('teamNameEdit').value=upper(p.teams?.name||'');$('number').value=p.number??'';$('role').value=normalizeRole(p.role);$('position').value=p.position||'';$('height').value=p.height??'';$('foot').value=(p.foot==='SX'||p.foot==='DX')?p.foot:'';$('birthYear').value=p.birth_year??'';$('nationality').value=sanitizeNationalityInput(p.nationality||'');$('strengths').value=tags(p.strengths).join(', ');$('weaknesses').value=tags(p.weaknesses).join(', ');$('notes').value=p.notes||'';openModal('playerModal')};$('playerForm').onsubmit=async e=>{
  e.preventDefault();
  if(!db)return alert('SUPABASE NON CONFIGURATO.');

  try{
    await ensureWriteSession();

    const typedTeamName=upper($('teamNameEdit').value);
    if(!typedTeamName)throw new Error('LA SQUADRA È OBBLIGATORIA.');

    let team=teams.find(t=>norm(t.name)===norm(typedTeamName));

    // Se la squadra digitata non esiste, la crea automaticamente.
    if(!team){
      const {data,error}=await db
        .from('teams')
        .insert({name:typedTeamName,country:'',competition:''})
        .select()
        .single();

      if(error)throw new Error('ERRORE CREAZIONE SQUADRA: '+error.message);
      team=data;
      teams.push(team);
    }

    const payload={
      first_name:upper($('firstName').value),
      last_name:upper($('lastName').value),
      team_id:team.id,
      number:$('number').value?Number($('number').value):null,
      role:upper($('role').value),
      position:upper($('position').value),
      height:$('height').value?Number($('height').value):null,
      foot:upper($('foot').value),
      birth_year:$('birthYear').value?Number($('birthYear').value):null,
      nationality:sanitizeNationalityInput($('nationality').value),
      strengths:$('strengths').value.split(',').map(upper).filter(Boolean),
      weaknesses:$('weaknesses').value.split(',').map(upper).filter(Boolean),
      notes:upper($('notes').value),
      updated_at:new Date().toISOString()
    };

    const {error}=await db.from('players').update(payload).eq('id',$('playerId').value);
    if(error)throw error;

    closeModal('playerModal');
    await loadAll();
  }catch(err){
    console.error(err);
    alert(err?.message||'ERRORE DURANTE IL SALVATAGGIO.');
  }
};

/*
  CARD READER - ZONE FISSE DEL TEMPLATE
  Coordinate calibrate sul template 2048×1149, espresse in proporzione.
  NON MODIFICARE: sono le stesse zone della versione con lettura corretta.
*/
const CARD_REGIONS={
  role:       {x:.345,y:.012,w:.330,h:.095,psm:'7',mode:'dark'},
  first:      {x:.020,y:.360,w:.215,h:.057,psm:'7',mode:'white'},
  last:       {x:.018,y:.399,w:.222,h:.068,psm:'7',mode:'white'},
  team:       {x:.008,y:.448,w:.235,h:.064,psm:'7',mode:'white'},
  number:     {x:.010,y:.505,w:.225,h:.218,psm:'7',mode:'white',digits:true},
  flag:       {x:.065,y:.720,w:.145,h:.245},
  height:     {x:.785,y:.055,w:.205,h:.175,psm:'6',mode:'dark',digits:true},
  foot:       {x:.790,y:.300,w:.195,h:.225,psm:'6',mode:'blue'},
  year:       {x:.775,y:.700,w:.215,h:.240,psm:'6',mode:'dark',digits:true},
  strengths:  {x:.285,y:.552,w:.455,h:.265,psm:'6',mode:'green'},
  weaknesses: {x:.275,y:.765,w:.475,h:.205,psm:'6',mode:'red'}
};


/* ===== V26: SECONDO TEMPLATE CARD =====
   Template giallo:
   - cognome grande sotto la foto
   - nome, squadra e numero NON presenti
   - ruolo in alto al centro
   - piede scritto DESTRO / SINISTRO
   - bandiera circolare in basso a sinistra
*/
const CARD_REGIONS_YELLOW={
  surname:     {x:.018,y:.350,w:.225,h:.125,psm:'7',mode:'dark'},
  role:        {x:.330,y:.008,w:.355,h:.095,psm:'7',mode:'dark'},
  height:      {x:.790,y:.060,w:.195,h:.160,psm:'6',mode:'dark',digits:true},

  // Include sia PIEDE sia la parola DESTRO / SINISTRO.
  footText:    {x:.775,y:.245,w:.220,h:.405,psm:'6',mode:'dark'},

  year:        {x:.785,y:.705,w:.195,h:.220,psm:'6',mode:'dark',digits:true},

  // Zone ampliate a sinistra per non perdere la prima lettera.
  strengths:   {x:.230,y:.515,w:.550,h:.315,psm:'6',mode:'green'},
  weaknesses:  {x:.235,y:.715,w:.545,h:.285,psm:'6',mode:'red'},

  // Box stretto sulla sola bandiera circolare.
  flag:        {x:.090,y:.770,w:.070,h:.130}
};

function pixelAtImage(img,nx,ny){
  const c=document.createElement('canvas');
  c.width=1;c.height=1;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,Math.round(img.naturalWidth*nx),Math.round(img.naturalHeight*ny),1,1,0,0,1,1);
  const d=ctx.getImageData(0,0,1,1).data;
  return[d[0],d[1],d[2]];
}

function isYellowCardLayout(img){
  // Il pannello sinistro del nuovo template è giallo saturo.
  const samples=[
    pixelAtImage(img,.10,.52),
    pixelAtImage(img,.10,.60),
    pixelAtImage(img,.10,.68)
  ];
  let yellow=0;
  for(const [r,g,b] of samples){
    if(r>190&&g>165&&b<100)yellow++;
  }
  return yellow>=2;
}

function cropCustomRegion(img,r,scale=3.2){
  const sx=Math.max(0,Math.round(img.naturalWidth*r.x));
  const sy=Math.max(0,Math.round(img.naturalHeight*r.y));
  const sw=Math.min(img.naturalWidth-sx,Math.round(img.naturalWidth*r.w));
  const sh=Math.min(img.naturalHeight-sy,Math.round(img.naturalHeight*r.h));

  const c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(sw*scale));
  c.height=Math.max(1,Math.round(sh*scale));

  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);

  const data=ctx.getImageData(0,0,c.width,c.height);
  const a=data.data;
  const mode=r.mode||'dark';

  for(let i=0;i<a.length;i+=4){
    const R=a[i],G=a[i+1],B=a[i+2];
    let ink=false;

    // Soglie più permissive: preservano le lettere sottili e le iniziali.
    if(mode==='green'){
      ink=G>80 && G>R*1.04 && G>B*.98;
    }else if(mode==='red'){
      ink=R>100 && R>G*1.05 && R>B*1.03;
    }else{
      const gray=.299*R+.587*G+.114*B;
      ink=gray<185;
    }

    const v=ink?0:255;
    a[i]=a[i+1]=a[i+2]=v;
    a[i+3]=255;
  }

  ctx.putImageData(data,0,0);
  return c;
}

async function readCustomRegion(worker,img,r,whitelist){
  const c=cropCustomRegion(img,r,r===CARD_REGIONS_YELLOW.surname?3.0:2.6);
  const params={
    tessedit_pageseg_mode:r.psm||'7',
    preserve_interword_spaces:'1',
    user_defined_dpi:'300',
    load_system_dawg:'0',
    load_freq_dawg:'0'
  };
  if(whitelist)params.tessedit_char_whitelist=whitelist;
  await worker.setParameters(params);
  const {data}=await worker.recognize(c);
  return data.text||'';
}


function detectYellowCardFootByColor(img){
  /*
    V33 - QUADRATO IMMAGINARIO PIEDE
    Nel template giallo analizziamo esclusivamente il riquadro grafico
    che contiene PIEDE + impronte + DESTRO/SINISTRO.

    Regola richiesta:
      presenza BLU/AZZURRO dominante -> DX
      presenza GIALLO/ORO dominante -> SX

    Coordinate calibrate sulle card gialle 2048×1152 fornite.
  */
  const box={
    x:.795,
    y:.285,
    w:.150,
    h:.355
  };

  const sx=Math.round(img.naturalWidth*box.x);
  const sy=Math.round(img.naturalHeight*box.y);
  const sw=Math.round(img.naturalWidth*box.w);
  const sh=Math.round(img.naturalHeight*box.h);

  const c=document.createElement('canvas');
  c.width=sw;
  c.height=sh;

  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);

  const d=ctx.getImageData(0,0,sw,sh).data;

  let blue=0;
  let yellow=0;
  let colored=0;

  for(let y=0;y<sh;y++){
    for(let x=0;x<sw;x++){
      const i=(y*sw+x)*4;
      const R=d[i],G=d[i+1],B=d[i+2];

      // BLU / AZZURRO saturo dell'impronta.
      const isBlue=
        B>100 &&
        B>R*1.18 &&
        B>G*1.05 &&
        (B-R)>28;

      // GIALLO / ORO dell'impronta sinistra.
      const isYellow=
        R>150 &&
        G>115 &&
        B<135 &&
        (R-B)>35 &&
        (G-B)>20;

      if(isBlue){blue++;colored++}
      if(isYellow){yellow++;colored++}
    }
  }

  const area=sw*sh;
  const minEvidence=Math.max(90,Math.round(area*.0020));

  // Richiediamo anche un vantaggio netto per evitare falsi positivi.
  if(blue>=minEvidence && blue>yellow*1.30)return 'DX';
  if(yellow>=minEvidence && yellow>blue*1.30)return 'SX';

  return '';
}


function detectClassicCardFootByColor(img){
  /*
    TEMPLATE BIANCO:
    - DX viene scritto in BLU
    - SX viene scritto in GIALLO/ORO

    Non usiamo OCR per decidere il piede: analizziamo il colore del testo
    nella zona PIEDE. Questo evita che SX venga letto come DX o vuoto.
  */
  const sx=Math.round(img.naturalWidth*.795);
  const sy=Math.round(img.naturalHeight*.340);
  const sw=Math.round(img.naturalWidth*.165);
  const sh=Math.round(img.naturalHeight*.205);

  const c=document.createElement('canvas');
  c.width=sw;
  c.height=sh;

  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);

  const d=ctx.getImageData(0,0,sw,sh).data;

  let blue=0;
  let yellow=0;

  for(let i=0;i<d.length;i+=4){
    const R=d[i],G=d[i+1],B=d[i+2];

    // BLU: usato dal template per DX.
    if(
      B>105 &&
      B>R*1.18 &&
      B>G*1.06 &&
      (B-R)>30
    ){
      blue++;
    }

    // GIALLO/ORO: usato dal template per SX.
    if(
      R>145 &&
      G>105 &&
      B<125 &&
      (R-B)>45 &&
      (G-B)>30
    ){
      yellow++;
    }
  }

  const minPixels=Math.max(120,Math.round(sw*sh*.004));

  if(yellow>=minPixels && yellow>blue*1.35)return 'SX';
  if(blue>=minPixels && blue>yellow*1.35)return 'DX';

  return '';
}

async function readFootRobust(worker,img,isYellow){
  if(isYellow){
    // Template giallo: impronta blu a destra = DX, a sinistra = SX.
    return detectYellowCardFootByColor(img);
  }

  // Template bianco: prima scelta deterministica dal colore della sigla.
  const byColor=detectClassicCardFootByColor(img);
  if(byColor)return byColor;

  // Fallback OCR solo se il colore non è abbastanza chiaro.
  const raw=await readRegion(worker,img,'foot');
  const t=cleanFieldText(raw).replace(/[^A-Z]/g,'');

  if(t.includes('SX'))return'SX';
  if(t.includes('DX'))return'DX';

  // Ultimo fallback: parole complete su eventuali varianti.
  const r={x:.780,y:.285,w:.205,h:.270,psm:'6',mode:'dark'};
  const raw2=await readCustomRegion(worker,img,r,"ABCDEFGHIJKLMNOPQRSTUVWXYZ ");
  const t2=cleanFieldText(raw2).replace(/[^A-Z]/g,'');

  if(t2.includes('SINISTRO')||t2.includes('SINISTR'))return'SX';
  if(t2.includes('DESTRO')||t2.includes('DESTR'))return'DX';

  // Mai inventare DX.
  return '';
}

function loadImage(file){return new Promise((ok,ko)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=ko;im.src=URL.createObjectURL(file)})}
function cropCanvas(img,r,scale=2.2){
 const sx=Math.round(img.naturalWidth*r.x),sy=Math.round(img.naturalHeight*r.y),sw=Math.round(img.naturalWidth*r.w),sh=Math.round(img.naturalHeight*r.h);
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
 // Nessuna interpretazione linguistica. Isoliamo solo il colore tipografico atteso nella zona.
 const im=ctx.getImageData(0,0,c.width,c.height),a=im.data,mode=r.mode||'dark';
 for(let i=0;i<a.length;i+=4){
   const R=a[i],G=a[i+1],B=a[i+2];let ink=false;
   if(mode==='white') ink=R>185&&G>185&&B>185;
   else if(mode==='green') ink=G>115&&G>R*1.12&&G>B*1.04;
   else if(mode==='red') ink=R>145&&R>G*1.18&&R>B*1.12;
   else if(mode==='blue') ink=B>120&&B>R*1.10&&B>G*1.02;
   else ink=(R+G+B)/3<155;
   const v=ink?0:255;a[i]=a[i+1]=a[i+2]=v;a[i+3]=255;
 }
 ctx.putImageData(im,0,0);return c;
}
function cleanLine(t){return String(t||'').replace(/[\r\n]+/g,' ').replace(/[|]/g,'I').replace(/\s+/g,' ').trim()}
function cleanFieldText(t){
 let x=cleanLine(t)
   .toUpperCase()
   .replace(/[^A-ZÀ-ÖØ-Ý0-9'’\-\. ]/g,' ')
   .replace(/\s+/g,' ')
   .trim();

 let parts=x.split(' ').filter(Boolean);

 // OCR può separare la prima lettera dal resto della parola:
 // "J ENSEN" -> "JENSEN", "L ETTURA" -> "LETTURA".
 if(parts.length>1 && /^[A-ZÀ-ÖØ-Ý]$/.test(parts[0]) && /^[A-ZÀ-ÖØ-Ý]{2,}$/.test(parts[1])){
   parts[1]=parts[0]+parts[1];
   parts.shift();
 }

 // Stesso recupero a fine parola, solo quando è chiaramente alfabetico.
 if(parts.length>1 && /^[A-ZÀ-ÖØ-Ý]$/.test(parts.at(-1)) && /^[A-ZÀ-ÖØ-Ý]{2,}$/.test(parts.at(-2))){
   parts[parts.length-2]=parts.at(-2)+parts.at(-1);
   parts.pop();
 }

 return parts.join(' ');
}
function cleanDigits(t){const m=String(t||'').match(/\d+/g);return m?m.join(''):''}
function cleanMulti(t){
 return String(t||'')
   .split(/\n+/)
   .map(cleanFieldText)
   .filter(x=>x.length>1)
   .join('\n');
}
function normalizeCardRole(t){
 const n=cleanFieldText(t).replace(/[^A-Z]/g,'');

 // Exact / partial recognition, tolerant to one missing or incorrect OCR letter.
 if(n.includes('DIFENSORE') || n.includes('DIFENS') || /^DIF/.test(n)) return 'DIFENSORE';
 if(n.includes('CENTROCAMPISTA') || n.includes('CENTRO') || n.includes('CAMPISTA') || /^CEN/.test(n)) return 'CENTROCAMPISTA';
 if(n.includes('ATTACCANTE') || n.includes('ATTACC') || /^ATT/.test(n)) return 'ATTACCANTE';

 // Character-pattern fallbacks for typical OCR distortions.
 if(/D.?F.?NS/.test(n)) return 'DIFENSORE';
 if(/C.?NTR/.test(n) || /CAMP.?ST/.test(n)) return 'CENTROCAMPISTA';
 if(/A.?T.?ACC/.test(n)) return 'ATTACCANTE';

 return '';
}

async function readRoleRobust(worker,img){
  // Primo passaggio: stessa pipeline colore della card.
  const first=await readRegion(worker,img,'role');
  if(normalizeCardRole(first))return first;

  // Secondo passaggio soltanto se il primo non produce un ruolo:
  // crop più ampio e contrasto in scala di grigi.
  const r={x:.325,y:.005,w:.370,h:.115};
  const sx=Math.max(0,Math.round(img.naturalWidth*r.x));
  const sy=Math.max(0,Math.round(img.naturalHeight*r.y));
  const sw=Math.min(img.naturalWidth-sx,Math.round(img.naturalWidth*r.w));
  const sh=Math.min(img.naturalHeight-sy,Math.round(img.naturalHeight*r.h));

  const c=document.createElement('canvas');
  c.width=Math.max(1,sw*3);
  c.height=Math.max(1,sh*3);
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);

  const im=ctx.getImageData(0,0,c.width,c.height);
  const a=im.data;
  for(let i=0;i<a.length;i+=4){
    const gray=Math.round(.299*a[i]+.587*a[i+1]+.114*a[i+2]);
    const v=gray<185?0:255;
    a[i]=a[i+1]=a[i+2]=v;
    a[i+3]=255;
  }
  ctx.putImageData(im,0,0);

  await worker.setParameters({
    tessedit_pageseg_mode:'7',
    preserve_interword_spaces:'1',
    user_defined_dpi:'300',
    load_system_dawg:'0',
    load_freq_dawg:'0',
    tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ "
  });

  const {data}=await worker.recognize(c);
  return data.text||first||'';
}

async function readRegion(worker,img,key){
 const r=CARD_REGIONS[key],c=cropCanvas(img,r,key==='number'?2.7:2.2);
 const params={tessedit_pageseg_mode:r.psm||'7',preserve_interword_spaces:'1',user_defined_dpi:'300',load_system_dawg:'0',load_freq_dawg:'0'};
 if(['first','last','team','role'].includes(key))params.tessedit_char_whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÓÙÑÇ -'";
 else if(key==='foot')params.tessedit_char_whitelist='DXSX';
 else if(r.digits)params.tessedit_char_whitelist='0123456789';
 else params.tessedit_char_whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÓÙÑÇ 0123456789,'";
 await worker.setParameters(params);const{data}=await worker.recognize(c);return data.text||'';
}
function detectFlagNationality(img){
  const yellowLayout=isYellowCardLayout(img);

  // Sul template giallo la bandiera è sempre nello stesso punto.
  // Usiamo un crop calibrato sui pixel reali delle card inviate.
  const r=yellowLayout
    ?{x:.088,y:.772,w:.070,h:.118}
    :CARD_REGIONS.flag;

  const sx=Math.max(0,Math.round(img.naturalWidth*r.x));
  const sy=Math.max(0,Math.round(img.naturalHeight*r.y));
  const sw=Math.min(img.naturalWidth-sx,Math.round(img.naturalWidth*r.w));
  const sh=Math.min(img.naturalHeight-sy,Math.round(img.naturalHeight*r.h));

  const c=document.createElement('canvas');
  c.width=300;
  c.height=300;

  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,sx,sy,sw,sh,0,0,300,300);

  const px=ctx.getImageData(0,0,300,300).data;

  function colorAt(x,y){
    const i=(y*300+x)*4;
    const R=px[i],G=px[i+1],B=px[i+2];
    const mx=Math.max(R,G,B),mn=Math.min(R,G,B);

    if(R<85&&G<85&&B<85)return'K';
    if(R>145&&R>G*1.32&&R>B*1.25)return'R';
    if(R>185&&G>185&&B>185&&mx-mn<65)return'W';
    if(B>95&&B>R*1.28&&B>G*1.08)return'B';
    if(G>88&&G>R*1.10&&G>B*1.03)return'G';
    if(R>145&&G>112&&B<120&&R>B*1.25&&G>B*1.12)return'Y';
    return'O';
  }

  function dominant(rect){
    const count={K:0,R:0,W:0,B:0,G:0,Y:0,O:0};
    let n=0;
    const [x0,y0,x1,y1]=rect;

    for(let y=y0;y<y1;y+=3){
      for(let x=x0;x<x1;x+=3){
        // Ignora gli angoli esterni al disco.
        const dx=x-150,dy=y-150;
        if(dx*dx+dy*dy>116*116)continue;

        count[colorAt(x,y)]++;
        n++;
      }
    }

    let best='O',bestN=-1;
    for(const k of ['K','R','W','B','G','Y']){
      if(count[k]>bestN){best=k;bestN=count[k]}
    }
    return{color:best,ratio:bestN/Math.max(1,n),count,n};
  }

  // Campioni nelle bande verticali.
  const left  =dominant([45,65,120,235]);
  const midV  =dominant([120,65,180,235]);
  const right =dominant([180,65,255,235]);

  // Campioni nelle bande orizzontali.
  const top   =dominant([55,45,245,120]);
  const midH  =dominant([55,120,245,180]);
  const bottom=dominant([55,180,245,255]);

  // Percentuali globali nel cuore del disco.
  const global=dominant([40,40,260,260]).count;
  const globalN=Object.values(global).reduce((a,b)=>a+b,0)||1;
  const q=k=>(global[k]||0)/globalN;

  /*
    CLASSIFICAZIONE PER STRUTTURA.
    È molto più stabile del solo conteggio colori.
  */

  // GERMANIA: tre bande orizzontali nero / rosso / giallo.
  if(
    top.color==='K' &&
    midH.color==='R' &&
    bottom.color==='Y'
  ) return 'GERMANIA';

  // SCOZIA: blu dominante con croce diagonale bianca.
  // Sul crop i tre terzi sono comunque prevalentemente blu.
  if(
    q('B')>.48 &&
    q('W')>.16 &&
    q('R')<.04 &&
    q('Y')<.05
  ) return 'SCOZIA';

  // FRANCIA: bande verticali blu / bianco / rosso.
  if(left.color==='B'&&midV.color==='W'&&right.color==='R')return'FRANCIA';

  // ITALIA: bande verticali verde / bianco / rosso.
  if(left.color==='G'&&midV.color==='W'&&right.color==='R')return'ITALIA';

  // BELGIO: bande verticali nero / giallo / rosso.
  if(left.color==='K'&&midV.color==='Y'&&right.color==='R')return'BELGIO';

  // PAESI BASSI: rosso / bianco / blu.
  if(top.color==='R'&&midH.color==='W'&&bottom.color==='B')return'PAESI BASSI';

  // ARGENTINA: azzurro/blu / bianco / azzurro/blu.
  if(top.color==='B'&&midH.color==='W'&&bottom.color==='B'&&q('R')<.05)return'ARGENTINA';

  // SPAGNA: rosso / giallo / rosso.
  if(top.color==='R'&&midH.color==='Y'&&bottom.color==='R')return'SPAGNA';

  // DANIMARCA: rosso dominante con bianco significativo.
  if(q('R')>.48&&q('W')>.08&&q('B')<.04&&q('G')<.04&&q('Y')<.06)return'DANIMARCA';

  // INGHILTERRA: bianco dominante + croce rossa.
  if(q('W')>.48&&q('R')>.10&&q('B')<.05&&q('G')<.05)return'INGHILTERRA';

  // BRASILE: verde e giallo con una componente blu centrale.
  if(q('G')>.20&&q('Y')>.12&&q('B')>.015)return'BRASILE';

  // Fallback specifici sulle proporzioni, utili con compressione JPEG.
  if(q('K')>.14&&q('R')>.25&&q('Y')>.12&&q('B')<.03)return'GERMANIA';
  if(q('B')>.45&&q('W')>.12&&q('R')<.04)return'SCOZIA';

  // Mai assegnare una nazione se il pattern non è abbastanza chiaro.
  return '';
}

function resetImport(){
  selectedFile=null;
  selectedFiles=[];
  batchResults=[];
  currentBatchIndex=0;
  batchMode=false;

  if($('cardFile'))$('cardFile').value='';
  if($('cardPreview')){
    $('cardPreview').src='';
    $('cardPreview').classList.add('hidden');
  }
  $('batchQueue')?.classList.add('hidden');
  if($('batchList'))$('batchList').innerHTML='';
  $('cardTabsWrap')?.classList.add('hidden');
  if($('cardTabs'))$('cardTabs').innerHTML='';
  $('ocrProgress')?.classList.add('hidden');
  if($('progressFill'))$('progressFill').style.width='0%';
  if($('progressText'))$('progressText').textContent='PREPARAZIONE...';
  $('importReview')?.classList.add('hidden');
  $('uploadStage')?.classList.remove('hidden');

  if($('processCardBtn')){
    $('processCardBtn').disabled=true;
    $('processCardBtn').textContent='ELABORA CARD';
  }
}

function setSelectedFiles(files){
  const good=(files||[]).filter(f=>f&&String(f.type||'').startsWith('image/'));
  if(!good.length)return false;

  selectedFiles=good;
  selectedFile=good[0];
  currentBatchIndex=0;
  batchMode=good.length>1;
  batchResults=new Array(good.length).fill(null);

  if($('cardPreview')){
    $('cardPreview').src=URL.createObjectURL(selectedFile);
    $('cardPreview').classList.remove('hidden');
  }

  if($('processCardBtn')){
    $('processCardBtn').disabled=false;
    $('processCardBtn').textContent=batchMode?`ELABORA ${good.length} CARD`:'ELABORA CARD';
  }

  renderBatchQueue();
  return true;
}

function renderBatchQueue(){
  if(!$('batchQueue')||!$('batchList'))return;
  $('batchQueue').classList.toggle('hidden',!batchMode);
  if(!batchMode)return;

  $('batchCounter').textContent=`${selectedFiles.length} CARD`;
  $('batchList').innerHTML=selectedFiles.map((f,i)=>{
    const status=batchResults[i]?.status||'ready';
    const text=status==='done'?'LETTA':status==='error'?'ERRORE':status==='archived'?'ARCHIVIATA':status==='processing'?'LETTURA...':'PRONTA';
    return `<button type="button" class="batch-item ${i===currentBatchIndex?'active':''}" data-preview-card="${i}">
      <div class="batch-name">${esc(f.name)}</div>
      <div class="batch-status ${status}">${text}</div>
    </button>`;
  }).join('');

  document.querySelectorAll('[data-preview-card]').forEach(btn=>{
    btn.onclick=()=>{
      const i=Number(btn.dataset.previewCard);
      currentBatchIndex=i;
      selectedFile=selectedFiles[i];
      $('cardPreview').src=URL.createObjectURL(selectedFile);
      renderBatchQueue();
    };
  });
}

function captureReview(){
  return {
    first:upper($('iFirstName').value),
    last:upper($('iLastName').value),
    team:upper($('iTeam').value),
    number:$('iNumber').value,
    role:upper($('iRole').value),
    position:upper($('iPosition').value),
    height:$('iHeight').value,
    foot:upper($('iFoot').value),
    year:$('iBirthYear').value,
    nationality:sanitizeNationalityInput($('iNationality').value),
    strengths:$('iStrengths').value.split(',').map(upper).filter(Boolean),
    weaknesses:$('iWeaknesses').value.split(',').map(upper).filter(Boolean)
  };
}

function saveCurrentBatchReview(){
  if(batchMode&&batchResults[currentBatchIndex]?.parsed){
    batchResults[currentBatchIndex].parsed=captureReview();
  }
}

function renderCardTabs(){
  if(!$('cardTabsWrap')||!$('cardTabs'))return;
  $('cardTabsWrap').classList.toggle('hidden',!batchMode);
  if(!batchMode)return;

  $('cardTabs').innerHTML=batchResults.map((item,i)=>{
    const p=item?.parsed||{};
    const label=((p.last||'')+' '+(p.first||'')).trim()||`CARD ${i+1}`;
    const status=item?.status||'ready';
    const symbol=status==='archived'?'✓':status==='error'?'!':'';

    return `<button type="button" class="card-tab ${i===currentBatchIndex?'active':''} ${status==='archived'?'archived':''} ${status==='error'?'error':''}" data-card-tab="${i}">
      <span class="card-tab-number">${i+1}</span>
      <span class="card-tab-name">${esc(label)}</span>
      <span class="card-tab-state">${symbol}</span>
    </button>`;
  }).join('');

  document.querySelectorAll('[data-card-tab]').forEach(tab=>{
    tab.onclick=()=>{
      saveCurrentBatchReview();
      const i=Number(tab.dataset.cardTab);
      if(batchResults[i]?.parsed){
        currentBatchIndex=i;
        fillImport(batchResults[i].parsed);
        renderCardTabs();
      }
    };
  });
}

async function createCardWorker(logger){
  return await Tesseract.createWorker('eng',1,{logger});
}



/* ===== V32: SMART CARD READER ===== */

function cardLeftPanelType(img){
  if(isYellowCardLayout(img))return 'yellow';

  const pts=[
    pixelAtImage(img,.10,.55),
    pixelAtImage(img,.10,.62),
    pixelAtImage(img,.10,.69)
  ];
  const avg=pts.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]).map(x=>x/pts.length);
  const [R,G,B]=avg;
  if(B>R*1.20 && B>G*1.05 && B>115)return 'blue';
  return 'light';
}

function textCandidateQuality(text,kind='text'){
  const t=cleanFieldText(text);
  if(!t)return -999;

  const letters=(t.match(/[A-ZÀ-ÖØ-Ý]/g)||[]).length;
  const digits=(t.match(/[0-9]/g)||[]).length;
  const spaces=(t.match(/ /g)||[]).length;
  const weird=(t.match(/[^A-ZÀ-ÖØ-Ý0-9'’\-\. ]/g)||[]).length;

  let score=letters*2 + digits*.5 + spaces*.2 - weird*5;

  if(kind==='name'){
    if(digits)score-=digits*8;
    if(t.length>=2&&t.length<=32)score+=4;
  }
  if(kind==='team'){
    if(digits)score-=digits*5;
    if(t.length>=3&&t.length<=40)score+=3;
  }
  if(kind==='role'){
    if(normalizeCardRole(t))score+=25;
  }
  return score;
}

async function readIdentityRobust(worker,img,region,kind='name',mode='dark'){
  const r=expandedRegion(region,.014,.010);
  const whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÓÙÑÇÜÖÄÉÈÁÍÓÚÂÊÔÃÕÇ -.'";

  const canvases=[];
  const base={...r,mode};

  // Original preserves accents/shape. Gray and binary help low contrast.
  canvases.push(cropRegionVariant(img,base,3.4,'original'));
  canvases.push(cropRegionVariant(img,base,3.6,'gray'));
  canvases.push(cropRegionVariant(img,base,3.8,'soft'));
  canvases.push(cropRegionVariant(img,base,4.0,'hard'));

  const reads=[];
  for(const c of canvases){
    for(const psm of ['7','6']){
      const raw=await recognizeCanvas(worker,c,{psm,whitelist});
      reads.push(raw);
    }
  }

  reads.sort((a,b)=>textCandidateQuality(b,kind)-textCandidateQuality(a,kind));
  return cleanFieldText(reads[0]||'');
}

async function readNumberRobust(worker,img){
  // The old crop occasionally clipped the first digit (e.g. 15 -> 5).
  const r={x:0,y:.495,w:.240,h:.235,mode:'dark'};
  const canvases=[
    cropRegionVariant(img,r,3.8,'original'),
    cropRegionVariant(img,r,4.0,'gray'),
    cropRegionVariant(img,r,4.0,'soft')
  ];

  const votes=new Map();
  for(const c of canvases){
    for(const psm of ['6','7','11']){
      const raw=await recognizeCanvas(worker,c,{psm,whitelist:'0123456789'});
      const ds=String(raw||'').replace(/\D/g,'');
      for(let len=1;len<=2;len++){
        for(let i=0;i<=ds.length-len;i++){
          const s=ds.slice(i,i+len);
          const n=Number(s);
          if(n>=1&&n<=99){
            // Prefer two-digit shirt numbers when the OCR returned them as a unit.
            const bonus=len===2?1.5:0;
            votes.set(s,(votes.get(s)||0)+1+bonus);
          }
        }
      }
    }
  }

  if(!votes.size)return '';
  return [...votes.entries()].sort((a,b)=>b[1]-a[1])[0][0];
}

function extractYearCandidates(text){
  const raw=String(text||'').replace(/\D/g,'');
  const out=new Set();

  for(let i=0;i<=raw.length-4;i++){
    const n=Number(raw.slice(i,i+4));
    if(n>=1980&&n<=2015)out.add(String(n));
  }

  // OCR sometimes duplicates a zero: 20006 -> 2006.
  const collapsed=raw.replace(/0{3,}/g,'00');
  for(let i=0;i<=collapsed.length-4;i++){
    const n=Number(collapsed.slice(i,i+4));
    if(n>=1980&&n<=2015)out.add(String(n));
  }

  return [...out];
}

function extractAgeCandidates(text){
  const nums=String(text||'').match(/\d{1,2}/g)||[];
  return nums.map(Number).filter(n=>n>=15&&n<=45);
}

function expectedBirthYearFromAge(age){
  const now=new Date();
  const year=now.getFullYear();
  const passedMar1=(now.getMonth()>2)||(now.getMonth()===2&&now.getDate()>=1);
  return year-age-(passedMar1?0:1);
}

async function readYearRobust(worker,img,isYellow){
  const r=isYellow
    ?{x:.785,y:.675,w:.205,h:.285,mode:'dark'}
    :{x:.785,y:.675,w:.205,h:.285,mode:'dark'};

  const canvases=[
    cropRegionVariant(img,r,3.6,'original'),
    cropRegionVariant(img,r,3.8,'gray'),
    cropRegionVariant(img,r,4.0,'soft')
  ];

  const yearVotes=new Map();
  const ages=[];

  for(const c of canvases){
    for(const psm of ['6','11']){
      const raw=await recognizeCanvas(worker,c,{psm,whitelist:'0123456789'});
      for(const y of extractYearCandidates(raw))yearVotes.set(y,(yearVotes.get(y)||0)+1);
      ages.push(...extractAgeCandidates(raw));
    }
  }

  const ranked=[...yearVotes.entries()].sort((a,b)=>b[1]-a[1]);

  if(ranked.length){
    if(ages.length){
      const age=ages.sort((a,b)=>a-b)[Math.floor(ages.length/2)];
      const expected=expectedBirthYearFromAge(age);
      const consistent=ranked.filter(([y])=>Math.abs(Number(y)-expected)<=1);
      if(consistent.length)return consistent.sort((a,b)=>b[1]-a[1])[0][0];
    }
    return ranked[0][0];
  }

  if(ages.length){
    const age=ages.sort((a,b)=>a-b)[Math.floor(ages.length/2)];
    const y=expectedBirthYearFromAge(age);
    if(y>=1980&&y<=2015)return String(y);
  }

  return '';
}

function colorInkMatch(R,G,B,mode,strictness='normal'){
  if(mode==='green'){
    if(strictness==='soft')return G>65&&G>R*1.01&&G>B*.94;
    if(strictness==='hard')return G>100&&G>R*1.08&&G>B*1.00;
    return G>82&&G>R*1.04&&G>B*.97;
  }
  if(mode==='red'){
    if(strictness==='soft')return R>80&&R>G*1.01&&R>B*1.00;
    if(strictness==='hard')return R>125&&R>G*1.10&&R>B*1.07;
    return R>100&&R>G*1.05&&R>B*1.03;
  }
  return false;
}

function findColoredTextRegion(img,baseRegion,mode){
  const x0=Math.max(0,Math.round(img.naturalWidth*baseRegion.x));
  const y0=Math.max(0,Math.round(img.naturalHeight*baseRegion.y));
  const w=Math.min(img.naturalWidth-x0,Math.round(img.naturalWidth*baseRegion.w));
  const h=Math.min(img.naturalHeight-y0,Math.round(img.naturalHeight*baseRegion.h));

  const c=document.createElement('canvas');
  c.width=w;c.height=h;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,x0,y0,w,h,0,0,w,h);
  const d=ctx.getImageData(0,0,w,h).data;

  let minX=w,minY=h,maxX=-1,maxY=-1,count=0;
  const rowInk=new Array(h).fill(0);

  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      if(colorInkMatch(d[i],d[i+1],d[i+2],mode,'soft')){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);
        minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        rowInk[y]++;count++;
      }
    }
  }

  if(count<40||maxX<0)return {region:baseRegion,lineBands:[]};

  const padX=Math.max(8,Math.round(w*.018));
  const padY=Math.max(6,Math.round(h*.012));

  minX=Math.max(0,minX-padX);maxX=Math.min(w-1,maxX+padX);
  minY=Math.max(0,minY-padY);maxY=Math.min(h-1,maxY+padY);

  // Detect horizontal text lines from the color mask.
  const threshold=Math.max(2,Math.round(w*.006));
  const bands=[];
  let start=null;
  for(let y=minY;y<=maxY;y++){
    const active=rowInk[y]>=threshold;
    if(active&&start===null)start=y;
    if((!active||y===maxY)&&start!==null){
      const end=active&&y===maxY?y:y-1;
      if(end-start>=3)bands.push([Math.max(minY,start-padY),Math.min(maxY,end+padY)]);
      start=null;
    }
  }

  // Merge nearby fragments from the same line.
  const merged=[];
  for(const b of bands){
    const last=merged.at(-1);
    if(last&&b[0]-last[1]<Math.max(8,h*.018))last[1]=b[1];
    else merged.push(b.slice());
  }

  const region={
    x:(x0+minX)/img.naturalWidth,
    y:(y0+minY)/img.naturalHeight,
    w:(maxX-minX+1)/img.naturalWidth,
    h:(maxY-minY+1)/img.naturalHeight,
    mode
  };

  const lineBands=merged.map(([a,b])=>({
    x:region.x,
    y:(y0+a)/img.naturalHeight,
    w:region.w,
    h:(b-a+1)/img.naturalHeight,
    mode
  }));

  return {region,lineBands};
}

async function readColoredLinesSmart(worker,img,baseRegion,mode){
  const detected=findColoredTextRegion(img,baseRegion,mode);
  const whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÓÙÑÇÜÖÄÁÍÚ 0123456789,'’-/ ";

  const wholeReads=[];
  for(const strictness of ['original','soft','hard','gray']){
    const c=cropRegionVariant(img,detected.region,3.5,strictness);
    wholeReads.push(await recognizeCanvas(worker,c,{psm:'6',whitelist}));
  }

  const whole=mergeBestTextCandidates(wholeReads);
  const wholeLines=splitOcrLines(whole);

  // Line-by-line OCR is much less likely to lose the first glyph.
  const lineReads=[];
  for(const lineRegion of detected.lineBands.slice(0,7)){
    const variants=[
      cropRegionVariant(img,lineRegion,4.2,'original'),
      cropRegionVariant(img,lineRegion,4.4,'soft'),
      cropRegionVariant(img,lineRegion,4.4,'hard')
    ];

    const candidates=[];
    for(const c of variants){
      candidates.push(await recognizeCanvas(worker,c,{psm:'7',whitelist}));
    }
    candidates.sort((a,b)=>lineQuality(b)-lineQuality(a));
    const line=normalizeOcrLine(candidates[0]||'');
    if(line.length>1)lineReads.push(line);
  }

  if(!lineReads.length)return whole;

  // Prefer line-by-line if it has at least as much alphabetic content.
  const scoreWhole=wholeLines.reduce((s,l)=>s+lineQuality(l),0);
  const scoreLines=lineReads.reduce((s,l)=>s+lineQuality(l),0);

  return scoreLines>=scoreWhole*.90?lineReads.join('\n'):whole;
}

/* Flag classifier V32:
   tighter crop, includes TURCHIA, and only returns high-confidence matches. */
function detectFlagNationalityV32(img){
  /*
    V33 - CLASSIFICATORE BANDIERE ESTESO.
    Manteniamo il nome della funzione per compatibilità con il reader V32,
    ma il motore è stato ampliato.

    Strategia:
    1. crop circolare preciso
    2. classificazione cromatica
    3. analisi per bande orizzontali/verticali
    4. analisi centro/angoli
    5. scoring con confidence gate
  */
  const yellow=isYellowCardLayout(img);
  const r=yellow
    ?{x:.083,y:.748,w:.084,h:.158}
    :{x:.078,y:.742,w:.090,h:.166};

  const sx=Math.round(img.naturalWidth*r.x);
  const sy=Math.round(img.naturalHeight*r.y);
  const sw=Math.round(img.naturalWidth*r.w);
  const sh=Math.round(img.naturalHeight*r.h);

  const c=document.createElement('canvas');
  c.width=300;c.height=300;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,sx,sy,sw,sh,0,0,300,300);
  const px=ctx.getImageData(0,0,300,300).data;

  const classify=(R,G,B)=>{
    const max=Math.max(R,G,B),min=Math.min(R,G,B);
    if(R<80&&G<80&&B<80)return'K';
    if(R>145&&R>G*1.26&&R>B*1.22)return'R';
    if(R>190&&G>190&&B>190&&max-min<62)return'W';
    if(B>95&&B>R*1.18&&B>G*1.05)return'B';
    if(G>88&&G>R*1.07&&G>B*1.02)return'G';
    if(R>145&&G>110&&B<125&&R>B*1.20&&G>B*1.08)return'Y';
    return'O';
  };

  function stats(x0,y0,x1,y1){
    const count={K:0,R:0,W:0,B:0,G:0,Y:0,O:0};
    let n=0;
    for(let y=y0;y<y1;y+=2){
      for(let x=x0;x<x1;x+=2){
        const dx=x-150,dy=y-150;
        if(dx*dx+dy*dy>108*108)continue;
        const i=(y*300+x)*4;
        count[classify(px[i],px[i+1],px[i+2])]++;
        n++;
      }
    }
    const q=k=>(count[k]||0)/Math.max(1,n);
    return{q,count,n};
  }

  const all=stats(35,35,265,265);
  const left=stats(45,55,115,245);
  const midV=stats(115,55,185,245);
  const right=stats(185,55,255,245);
  const top=stats(55,45,245,115);
  const midH=stats(55,115,245,185);
  const bottom=stats(55,185,245,255);
  const center=stats(105,105,195,195);
  const tl=stats(55,55,120,120);
  const tr=stats(180,55,245,120);
  const bl=stats(55,180,120,245);
  const br=stats(180,180,245,245);
  const q=all.q;

  const scores=[];
  const add=(name,score,guard=true)=>{
    if(guard && Number.isFinite(score))scores.push([name,score]);
  };

  // ----- EUROPA: bande classiche -----
  add('GERMANIA', top.q('K')*2.6 + midH.q('R')*2.6 + bottom.q('Y')*2.6 - q('B')*2);
  add('SPAGNA', top.q('R')*1.7 + midH.q('Y')*2.7 + bottom.q('R')*1.7 - q('B')*1.5);
  add('PAESI BASSI', top.q('R')*2.3 + midH.q('W')*2.3 + bottom.q('B')*2.3);
  add('FRANCIA', left.q('B')*2.3 + midV.q('W')*2.3 + right.q('R')*2.3);
  add('ITALIA', left.q('G')*2.3 + midV.q('W')*2.3 + right.q('R')*2.3);
  add('BELGIO', left.q('K')*2.3 + midV.q('Y')*2.3 + right.q('R')*2.3);
  add('ROMANIA', left.q('B')*2.1 + midV.q('Y')*2.1 + right.q('R')*2.1);
  add('IRLANDA', left.q('G')*2.2 + midV.q('W')*2.2 + right.q('Y')*1.7);
  add('POLONIA', top.q('W')*2.4 + bottom.q('R')*2.4);
  add('AUSTRIA', top.q('R')*2.1 + midH.q('W')*2.5 + bottom.q('R')*2.1);
  add('UCRAINA', top.q('B')*2.4 + bottom.q('Y')*2.4);

  // Portogallo: verde a sinistra + rosso dominante a destra.
  add('PORTOGALLO', left.q('G')*2.5 + right.q('R')*2.5 + q('Y')*.5 - q('B')*1.5);

  // Ungheria: rosso / bianco / verde.
  add('UNGHERIA', top.q('R')*2.2 + midH.q('W')*2.2 + bottom.q('G')*2.2);

  // Bulgaria: bianco / verde / rosso.
  add('BULGARIA', top.q('W')*2.2 + midH.q('G')*2.2 + bottom.q('R')*2.2);

  // Russia / Serbia / Slovenia / Slovacchia / Croazia use W-B-R families.
  add('RUSSIA', top.q('W')*2.1 + midH.q('B')*2.1 + bottom.q('R')*2.1);
  add('SERBIA', top.q('R')*2.0 + midH.q('B')*2.0 + bottom.q('W')*2.0 + left.q('Y')*.25);
  add('SLOVENIA', top.q('W')*2.0 + midH.q('B')*2.0 + bottom.q('R')*2.0 + tl.q('B')*.25);
  add('SLOVACCHIA', top.q('W')*2.0 + midH.q('B')*2.0 + bottom.q('R')*2.0 + left.q('R')*.25);
  add('CROAZIA', top.q('R')*1.7 + midH.q('W')*1.7 + bottom.q('B')*1.7 + center.q('R')*.5 + center.q('W')*.5);

  // Nordic / crosses.
  add('SCOZIA', q('B')*3.5 + q('W')*1.5 - q('R')*3 - q('Y')*1.8);
  add('DANIMARCA', q('R')*3.1 + q('W')*1.5 - q('Y')*2 - q('B')*2);
  add('INGHILTERRA', q('W')*3.1 + q('R')*1.5 - q('B')*1.7 - q('Y')*1.2);
  add('SVEZIA', q('B')*2.6 + q('Y')*1.7 - q('R')*2);
  add('FINLANDIA', q('W')*2.6 + q('B')*1.5 - q('R')*1.5 - q('Y')*1.2);
  add('NORVEGIA', q('R')*2.5 + q('B')*.8 + q('W')*.5 - q('Y')*1.5);
  add('ISLANDA', q('B')*2.5 + q('R')*.8 + q('W')*.6 - q('Y')*1.5);

  // Grecia: blue/white striped family.
  add('GRECIA', q('B')*2.5 + q('W')*2.0 - q('R')*2 - q('Y')*1.5);

  // Svizzera: red field, white center cross.
  add('SVIZZERA', q('R')*3.2 + center.q('W')*1.6 - q('Y')*2 - q('B')*2);

  // Albania: red + black.
  add('ALBANIA', q('R')*3.0 + center.q('K')*1.6 - q('Y')*2 - q('B')*2);

  // Turchia: red + white center.
  add('TURCHIA', q('R')*3.5 + center.q('W')*1.5 - q('Y')*3 - q('B')*3 - q('G')*3);

  // Bosnia: blue + yellow + white.
  add('BOSNIA ED ERZEGOVINA', q('B')*2.5 + q('Y')*1.6 + q('W')*.7 - q('R')*1.5);
  add('KOSOVO', q('B')*2.7 + center.q('Y')*1.4 + q('W')*.5 - q('R')*1.5);
  add('MACEDONIA DEL NORD', q('R')*2.4 + center.q('Y')*1.4 - q('B')*1.7);

  // Georgia: white + red.
  add('GEORGIA', q('W')*2.8 + q('R')*1.5 - q('B')*1.5 - q('Y')*1.5);
  add('ARMENIA', top.q('R')*2 + midH.q('B')*2 + bottom.q('Y')*2);

  // ----- AFRICA -----
  add('MAROCCO', q('R')*3.0 + center.q('G')*1.0 - q('B')*2 - q('Y'));
  add('ALGERIA', left.q('G')*2.2 + right.q('W')*2.2 + center.q('R')*.8);
  add('TUNISIA', q('R')*3.0 + center.q('W')*1.1 - q('G')*1.5 - q('B')*2);
  add('EGITTO', top.q('R')*2 + midH.q('W')*2 + bottom.q('K')*2);
  add('SENEGAL', left.q('G')*2 + midV.q('Y')*2 + right.q('R')*2 + center.q('G')*.5);
  add("COSTA D'AVORIO", left.q('Y')*1.8 + midV.q('W')*2 + right.q('G')*2);
  add('GHANA', top.q('R')*2 + midH.q('Y')*2 + bottom.q('G')*2 + center.q('K')*.5);
  add('CAMERUN', left.q('G')*2 + midV.q('R')*2 + right.q('Y')*2 + center.q('Y')*.5);
  add('MALI', left.q('G')*2 + midV.q('Y')*2 + right.q('R')*2);
  add('GUINEA', left.q('R')*2 + midV.q('Y')*2 + right.q('G')*2);
  add('NIGERIA', left.q('G')*2.2 + midV.q('W')*2.2 + right.q('G')*2.2);
  add('SUDAFRICA', q('G')*1.8 + q('R')*1.0 + q('B')*.8 + q('Y')*.7 + q('W')*.7 + q('K')*.4);
  add('CAPO VERDE', q('B')*2.6 + q('W')*.8 + q('R')*.4 + q('Y')*.4);
  add('GAMBIA', top.q('R')*1.8 + midH.q('B')*1.8 + bottom.q('G')*1.8 + q('W')*.5);
  add('BURKINA FASO', top.q('R')*2 + bottom.q('G')*2 + center.q('Y')*.8);
  add('GABON', top.q('G')*2 + midH.q('Y')*2 + bottom.q('B')*2);
  add('ANGOLA', top.q('R')*2 + bottom.q('K')*2 + center.q('Y')*.5);

  // RD Congo / Congo.
  add('REPUBBLICA DEMOCRATICA DEL CONGO', q('B')*2.0 + q('R')*.9 + q('Y')*.8);
  add('CONGO', top.q('G')*1.8 + midH.q('Y')*1.8 + bottom.q('R')*1.8);

  // ----- AMERICHE -----
  add('STATI UNITI', q('R')*1.6 + q('W')*1.5 + tl.q('B')*1.5);
  add('CANADA', left.q('R')*2 + midV.q('W')*2 + right.q('R')*2 + center.q('R')*.5);
  add('MESSICO', left.q('G')*2 + midV.q('W')*2 + right.q('R')*2 + center.q('K')*.15);
  add('URUGUAY', q('W')*2.0 + q('B')*1.7 + tl.q('Y')*.4);
  add('PARAGUAY', top.q('R')*2 + midH.q('W')*2 + bottom.q('B')*2);
  add('CILE', top.q('W')*1.6 + bottom.q('R')*2 + tl.q('B')*1.6);
  add('PERÙ', left.q('R')*2 + midV.q('W')*2 + right.q('R')*2);
  add('ECUADOR', top.q('Y')*2.3 + midH.q('B')*1.5 + bottom.q('R')*1.6);
  add('VENEZUELA', top.q('Y')*2 + midH.q('B')*1.7 + bottom.q('R')*1.7);
  add('BOLIVIA', top.q('R')*2 + midH.q('Y')*2 + bottom.q('G')*2);
  add('COSTA RICA', top.q('B')*1.4 + midH.q('R')*2 + bottom.q('B')*1.4 + q('W')*.7);
  add('PANAMA', q('W')*2.0 + q('R')*.9 + q('B')*.9);
  add('GIAMAICA', q('K')*2.0 + q('G')*1.4 + q('Y')*.8);
  add('BRASILE', q('G')*2.8 + q('Y')*2.0 + q('B')*.8 - q('R'));

  // ----- ASIA / OCEANIA -----
  add('GIAPPONE', q('W')*2.8 + center.q('R')*1.8 - q('B')*1.5 - q('Y')*1.5);
  add('COREA DEL SUD', q('W')*2.2 + center.q('R')*.7 + center.q('B')*.7 + q('K')*.4);
  add('CINA', q('R')*3.0 + tl.q('Y')*.8 - q('B')*2 - q('G')*2);
  add('AUSTRALIA', q('B')*2.5 + q('W')*.7 + q('R')*.4);
  add('NUOVA ZELANDA', q('B')*2.7 + q('R')*.4 + q('W')*.3);
  add('IRAN', top.q('G')*2 + midH.q('W')*2 + bottom.q('R')*2);
  add('IRAQ', top.q('R')*2 + midH.q('W')*2 + bottom.q('K')*2 + center.q('G')*.4);
  add('ARABIA SAUDITA', q('G')*3.0 + center.q('W')*.7 - q('R')*2 - q('B')*2);
  add('QATAR', left.q('W')*1.7 + right.q('R')*2.4 - q('B')*2 - q('G')*2);
  add('ISRAELE', q('W')*2.6 + q('B')*1.2 - q('R')*1.5 - q('Y')*1.5);

  // Existing South American.
  add('ARGENTINA', top.q('B')*2 + midH.q('W')*2.3 + bottom.q('B')*2 - q('R')*2);
  add('COLOMBIA', top.q('Y')*2.4 + midH.q('B')*1.5 + bottom.q('R')*1.6);

  scores.sort((a,b)=>b[1]-a[1]);
  if(!scores.length)return '';

  const [best,score]=scores[0];
  const second=scores[1]?.[1]??0;

  // Confidence stricter than V32: wrong nation is worse than blank.
  if(score<1.72)return '';
  if(score-second<.16)return '';

  // Hard guards for common/confusable families.
  if(best==='GERMANIA' && !(q('K')>.08&&q('R')>.14&&q('Y')>.08))return '';
  if(best==='SPAGNA' && !(q('R')>.15&&q('Y')>.13))return '';
  if(best==='SCOZIA' && !(q('B')>.30&&q('W')>.07&&q('R')<.08))return '';
  if(best==='TURCHIA' && !(q('R')>.45&&q('W')>.07&&q('Y')<.07&&q('B')<.07))return '';
  if(best==='MAROCCO' && !(q('R')>.45&&q('G')>.005))return '';
  if(best==='GIAPPONE' && !(q('W')>.40&&center.q('R')>.07))return '';
  if(best==='CAMERUN' && !(q('G')>.08&&q('R')>.08&&q('Y')>.07))return '';
  if(best==='PORTOGALLO' && !(q('G')>.08&&q('R')>.18))return '';

  return best;
}

/* ===== V31: LETTURA MULTI-PASS ===== */

function expandedRegion(r,padX=.012,padY=.010){
  return {
    ...r,
    x:Math.max(0,r.x-padX),
    y:Math.max(0,r.y-padY),
    w:Math.min(1-(Math.max(0,r.x-padX)),r.w+padX*2),
    h:Math.min(1-(Math.max(0,r.y-padY)),r.h+padY*2)
  };
}

function cropRegionVariant(img,r,scale=3.2,variant='normal'){
  const sx=Math.max(0,Math.round(img.naturalWidth*r.x));
  const sy=Math.max(0,Math.round(img.naturalHeight*r.y));
  const sw=Math.min(img.naturalWidth-sx,Math.round(img.naturalWidth*r.w));
  const sh=Math.min(img.naturalHeight-sy,Math.round(img.naturalHeight*r.h));

  const c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(sw*scale));
  c.height=Math.max(1,Math.round(sh*scale));

  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);

  if(variant==='original')return c;

  const data=ctx.getImageData(0,0,c.width,c.height);
  const a=data.data;
  const mode=r.mode||'dark';

  for(let i=0;i<a.length;i+=4){
    const R=a[i],G=a[i+1],B=a[i+2];
    const gray=.299*R+.587*G+.114*B;
    let ink=false;

    if(variant==='gray'){
      ink=gray<195;
    }else if(mode==='green'){
      // Due passaggi: permissivo e più selettivo.
      ink=variant==='soft'
        ?(G>72 && G>R*1.015 && G>B*.96)
        :(G>90 && G>R*1.055 && G>B*.99);
    }else if(mode==='red'){
      ink=variant==='soft'
        ?(R>90 && R>G*1.025 && R>B*1.015)
        :(R>115 && R>G*1.075 && R>B*1.055);
    }else{
      ink=variant==='soft'?gray<205:gray<175;
    }

    const v=ink?0:255;
    a[i]=a[i+1]=a[i+2]=v;
    a[i+3]=255;
  }
  ctx.putImageData(data,0,0);
  return c;
}

async function recognizeCanvas(worker,canvas,{psm='6',whitelist=''}={}){
  const params={
    tessedit_pageseg_mode:String(psm),
    preserve_interword_spaces:'1',
    user_defined_dpi:'300',
    load_system_dawg:'0',
    load_freq_dawg:'0'
  };
  if(whitelist)params.tessedit_char_whitelist=whitelist;
  await worker.setParameters(params);
  const {data}=await worker.recognize(canvas);
  return String(data?.text||'');
}

function extractHeightCandidate(text){
  const digits=String(text||'').replace(/\D/g,'');
  const candidates=[];

  // Search all 3-digit windows, not only the first OCR result.
  for(let i=0;i<=digits.length-3;i++){
    const n=Number(digits.slice(i,i+3));
    if(n>=150&&n<=215)candidates.push(String(n));
  }
  return candidates;
}

async function readHeightRobust(worker,img,isYellow){
  const base=isYellow?CARD_REGIONS_YELLOW.height:CARD_REGIONS.height;
  const r=expandedRegion(base,.018,.018);

  const variants=[
    cropRegionVariant(img,r,3.5,'original'),
    cropRegionVariant(img,r,3.5,'gray'),
    cropRegionVariant(img,r,3.8,'soft'),
    cropRegionVariant(img,r,4.0,'hard')
  ];

  const votes=new Map();

  for(const canvas of variants){
    for(const psm of ['6','7']){
      const raw=await recognizeCanvas(worker,canvas,{psm,whitelist:'0123456789CMcm '});
      for(const c of extractHeightCandidate(raw)){
        votes.set(c,(votes.get(c)||0)+1);
      }
    }
  }

  if(!votes.size)return '';

  const ranked=[...votes.entries()]
    .sort((a,b)=>b[1]-a[1] || Math.abs(Number(a[0])-182)-Math.abs(Number(b[0])-182));

  // Require consensus when possible.
  if(ranked[0][1]>=2)return ranked[0][0];

  // A single plausible read is accepted only if unique.
  return ranked.length===1?ranked[0][0]:'';
}

function normalizeOcrLine(s){
  return cleanFieldText(s)
    .replace(/\s*-\s*/g,' - ')
    .replace(/\s+/g,' ')
    .trim();
}

function lineQuality(s){
  const text=normalizeOcrLine(s);
  const letters=(text.match(/[A-ZÀ-ÖØ-Ý]/g)||[]).length;
  const words=text.split(/\s+/).filter(Boolean).length;
  const bad=(text.match(/[^A-ZÀ-ÖØ-Ý0-9'’\-\/ ]/g)||[]).length;
  return letters + words*.45 - bad*2;
}

function splitOcrLines(text){
  return String(text||'')
    .split(/\n+/)
    .map(normalizeOcrLine)
    .filter(x=>x.length>1);
}

function mergeBestTextCandidates(candidates){
  const lineSets=candidates.map(splitOcrLines).filter(x=>x.length);
  if(!lineSets.length)return '';

  // Pick the candidate with the strongest total textual content.
  let best=lineSets[0];
  let bestScore=-Infinity;

  for(const lines of lineSets){
    const score=lines.reduce((s,l)=>s+lineQuality(l),0);
    if(score>bestScore){
      bestScore=score;
      best=lines;
    }
  }

  // Recover a likely clipped first letter using corresponding lines
  // from another pass when that pass is one character longer.
  const result=best.slice();

  for(let i=0;i<result.length;i++){
    const current=result[i];
    let chosen=current;

    for(const lines of lineSets){
      const alt=lines[i];
      if(!alt)continue;

      const a=alt.replace(/\s/g,'');
      const b=chosen.replace(/\s/g,'');

      if(
        a.length===b.length+1 &&
        a.slice(1)===b &&
        /^[A-ZÀ-ÖØ-Ý]/.test(a[0])
      ){
        chosen=alt;
      }

      // Also recover OCR split initial: "F ILTRANTE" -> "FILTRANTE".
      if(/^[A-ZÀ-ÖØ-Ý]\s+[A-ZÀ-ÖØ-Ý]{2,}/.test(alt)){
        const repaired=alt.replace(/^([A-ZÀ-ÖØ-Ý])\s+([A-ZÀ-ÖØ-Ý])/, '$1$2');
        if(lineQuality(repaired)>lineQuality(chosen))chosen=repaired;
      }
    }

    result[i]=chosen;
  }

  return result.join('\n');
}

async function readColoredTextRobust(worker,img,baseRegion,mode){
  const r=expandedRegion(baseRegion,.030,.018);
  r.mode=mode;

  const canvases=[
    cropRegionVariant(img,r,3.1,'original'),
    cropRegionVariant(img,r,3.3,'soft'),
    cropRegionVariant(img,r,3.3,'hard'),
    cropRegionVariant(img,r,3.1,'gray')
  ];

  const whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÓÙÑÇ 0123456789,'’-/ ";
  const reads=[];

  for(const c of canvases){
    reads.push(await recognizeCanvas(worker,c,{psm:'6',whitelist}));
  }

  return mergeBestTextCandidates(reads);
}

/*
  V31 - Bandiera:
  confidence più alta e struttura spaziale.
  Meglio lasciare vuoto un valore dubbio che assegnare una nazione sbagliata.
*/
function detectFlagNationalityV31(img){
  const yellowLayout=isYellowCardLayout(img);
  const r=yellowLayout
    ?{x:.086,y:.758,w:.078,h:.145}
    :{x:.070,y:.735,w:.105,h:.180};

  const sx=Math.max(0,Math.round(img.naturalWidth*r.x));
  const sy=Math.max(0,Math.round(img.naturalHeight*r.y));
  const sw=Math.min(img.naturalWidth-sx,Math.round(img.naturalWidth*r.w));
  const sh=Math.min(img.naturalHeight-sy,Math.round(img.naturalHeight*r.h));

  const c=document.createElement('canvas');
  c.width=240;c.height=240;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,sx,sy,sw,sh,0,0,240,240);
  const px=ctx.getImageData(0,0,240,240).data;

  function cls(R,G,B){
    const max=Math.max(R,G,B),min=Math.min(R,G,B);
    if(R<78&&G<78&&B<78)return'K';
    if(R>150&&R>G*1.30&&R>B*1.25)return'R';
    if(R>190&&G>190&&B>190&&max-min<58)return'W';
    if(B>100&&B>R*1.24&&B>G*1.08)return'B';
    if(G>90&&G>R*1.08&&G>B*1.03)return'G';
    if(R>150&&G>118&&B<115&&R>B*1.28&&G>B*1.15)return'Y';
    return'O';
  }

  function stats(x0,y0,x1,y1){
    const count={K:0,R:0,W:0,B:0,G:0,Y:0,O:0};
    let n=0;
    for(let y=y0;y<y1;y+=2){
      for(let x=x0;x<x1;x+=2){
        const dx=x-120,dy=y-120;
        if(dx*dx+dy*dy>88*88)continue;
        const i=(y*240+x)*4;
        count[cls(px[i],px[i+1],px[i+2])]++;
        n++;
      }
    }
    const q=k=>(count[k]||0)/Math.max(1,n);
    const order=['K','R','W','B','G','Y'].sort((a,b)=>q(b)-q(a));
    return{count,n,q,dom:order[0],domRatio:q(order[0])};
  }

  const all=stats(25,25,215,215);
  const left=stats(35,45,95,195);
  const midV=stats(95,45,145,195);
  const right=stats(145,45,205,195);
  const top=stats(45,35,195,95);
  const midH=stats(45,95,195,145);
  const bottom=stats(45,145,195,205);
  const q=all.q;

  const scores=[];

  function add(name,score){
    if(Number.isFinite(score))scores.push([name,score]);
  }

  // Horizontal tricolors.
  add('GERMANIA',
    (top.q('K')*2.2)+(midH.q('R')*2.2)+(bottom.q('Y')*2.2)
    -q('B')-q('G'));

  add('PAESI BASSI',
    (top.q('R')*2)+(midH.q('W')*2)+(bottom.q('B')*2)-q('G'));

  add('SPAGNA',
    (top.q('R')*1.5)+(midH.q('Y')*2.3)+(bottom.q('R')*1.5)-q('B')-q('G'));

  add('ARGENTINA',
    (top.q('B')*1.8)+(midH.q('W')*2.1)+(bottom.q('B')*1.8)-q('R'));

  // Vertical tricolors.
  add('FRANCIA',
    (left.q('B')*2)+(midV.q('W')*2)+(right.q('R')*2)-q('G')-q('Y'));

  add('ITALIA',
    (left.q('G')*2)+(midV.q('W')*2)+(right.q('R')*2)-q('B'));

  add('BELGIO',
    (left.q('K')*2)+(midV.q('Y')*2)+(right.q('R')*2)-q('B')-q('G'));

  // Cross / field flags.
  add('DANIMARCA', q('R')*3.1 + q('W')*.9 - q('B')*2 - q('G')*2 - q('Y'));
  add('INGHILTERRA', q('W')*2.7 + q('R')*1.4 - q('B')*1.3 - q('G')*1.3 - q('Y'));
  add('SCOZIA', q('B')*3 + q('W')*1.15 - q('R')*2 - q('Y')*1.5);
  add('BRASILE', q('G')*2.5 + q('Y')*1.7 + q('B')*.7 - q('R'));

  // Other common football flags, high-level color signatures.
  add('POLONIA', top.q('W')*2.2 + bottom.q('R')*2.2 - q('B')-q('G')-q('Y'));
  add('UCRAINA', top.q('B')*2.1 + bottom.q('Y')*2.1 - q('R')-q('G'));
  add('AUSTRIA', top.q('R')*1.8 + midH.q('W')*2.2 + bottom.q('R')*1.8 - q('B')-q('G'));
  add('NIGERIA', left.q('G')*2 + midV.q('W')*2 + right.q('G')*2 - q('R')-q('B'));
  add('IRLANDA', left.q('G')*2 + midV.q('W')*2 + right.q('Y')*1.6 - q('B'));
  add('ROMANIA', left.q('B')*1.8 + midV.q('Y')*1.8 + right.q('R')*1.8 - q('G'));
  add('COLOMBIA', top.q('Y')*2 + midH.q('B')*1.4 + bottom.q('R')*1.5 - q('G'));

  scores.sort((a,b)=>b[1]-a[1]);

  if(!scores.length)return '';

  const [bestName,bestScore]=scores[0];
  const second=scores[1]?.[1]??-Infinity;

  // Confidence gating. Stops the current "wrong nation" issue.
  if(bestScore<1.55)return '';
  if(bestScore-second<.18)return '';

  // Additional hard guards for flags which otherwise overlap.
  if(bestName==='DANIMARCA' && !(q('R')>.34&&q('W')>.055))return '';
  if(bestName==='INGHILTERRA' && !(q('W')>.32&&q('R')>.07))return '';
  if(bestName==='SCOZIA' && !(q('B')>.33&&q('W')>.08))return '';
  if(bestName==='BRASILE' && !(q('G')>.12&&q('Y')>.07))return '';

  return bestName;
}


/* ===== V34: DUE TIPOLOGIE CARD, INDIPENDENTI DAL COLORE LATERALE =====

   TIPO 1: senza NOME e SQUADRA
     - cognome
     - numero
     - nazione
     - ruolo
     - altezza
     - piede
     - età/anno
     - punti forza/deboli

   TIPO 2: con NOME + COGNOME + SQUADRA
     - nome
     - cognome
     - squadra
     - numero
     - nazione
     - ruolo
     - altezza
     - piede
     - età/anno
     - punti forza/deboli

   NOTA: il colore della fascia laterale NON viene usato per riconoscere
   il tipo di card. Milan rosso, Juventus nero, Inter blu, ecc. funzionano
   allo stesso modo.
*/

const CARD_TYPE1={
  surname:   {x:.000,y:.355,w:.250,h:.125},
  number:    {x:.018,y:.485,w:.215,h:.235},
  flag:      {x:.075,y:.745,w:.100,h:.165},
  role:      {x:.375,y:.010,w:.270,h:.095},
  height:    {x:.785,y:.055,w:.190,h:.190},
  foot:      {x:.775,y:.285,w:.200,h:.350},
  ageYear:   {x:.785,y:.680,w:.190,h:.285},
  strengths: {x:.275,y:.555,w:.475,h:.250,mode:'green'},
  weaknesses:{x:.275,y:.765,w:.475,h:.205,mode:'red'}
};

const CARD_TYPE2={
  first:     {x:.000,y:.340,w:.245,h:.055},
  surname:   {x:.000,y:.390,w:.245,h:.070},
  team:      {x:.000,y:.455,w:.245,h:.055},
  number:    {x:.015,y:.500,w:.220,h:.235},
  flag:      {x:.073,y:.745,w:.105,h:.170},
  role:      {x:.365,y:.010,w:.290,h:.095},
  height:    {x:.785,y:.055,w:.190,h:.190},
  foot:      {x:.775,y:.285,w:.200,h:.350},
  ageYear:   {x:.785,y:.680,w:.190,h:.285},
  strengths: {x:.275,y:.555,w:.475,h:.250,mode:'green'},
  weaknesses:{x:.275,y:.765,w:.475,h:.205,mode:'red'}
};

function cropRawRegion(img,r,scale=4){
  const sx=Math.max(0,Math.round(img.naturalWidth*r.x));
  const sy=Math.max(0,Math.round(img.naturalHeight*r.y));
  const sw=Math.min(img.naturalWidth-sx,Math.round(img.naturalWidth*r.w));
  const sh=Math.min(img.naturalHeight-sy,Math.round(img.naturalHeight*r.h));

  const c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(sw*scale));
  c.height=Math.max(1,Math.round(sh*scale));

  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
  return c;
}

function otsuThreshold(gray){
  const hist=new Array(256).fill(0);
  for(const v of gray)hist[v]++;

  const total=gray.length;
  let sum=0;
  for(let i=0;i<256;i++)sum+=i*hist[i];

  let sumB=0,wB=0,maxVar=-1,threshold=127;

  for(let t=0;t<256;t++){
    wB+=hist[t];
    if(!wB)continue;
    const wF=total-wB;
    if(!wF)break;

    sumB+=t*hist[t];
    const mB=sumB/wB;
    const mF=(sum-sumB)/wF;
    const between=wB*wF*(mB-mF)*(mB-mF);

    if(between>maxVar){
      maxVar=between;
      threshold=t;
    }
  }
  return threshold;
}

function adaptiveTextCanvases(img,r,scale=4){
  const raw=cropRawRegion(img,r,scale);
  const ctx=raw.getContext('2d',{willReadFrequently:true});
  const im=ctx.getImageData(0,0,raw.width,raw.height);
  const src=im.data;
  const gray=new Uint8Array(raw.width*raw.height);

  for(let p=0,i=0;i<src.length;i+=4,p++){
    gray[p]=Math.round(.299*src[i]+.587*src[i+1]+.114*src[i+2]);
  }

  const thr=otsuThreshold(gray);
  const result=[];

  // Variant A: dark glyphs on white.
  for(const invert of [false,true]){
    const c=document.createElement('canvas');
    c.width=raw.width;c.height=raw.height;
    const cctx=c.getContext('2d',{willReadFrequently:true});
    const out=cctx.createImageData(c.width,c.height);

    for(let p=0,i=0;i<out.data.length;i+=4,p++){
      let black=gray[p] < thr;
      if(invert)black=!black;
      const v=black?0:255;
      out.data[i]=out.data[i+1]=out.data[i+2]=v;
      out.data[i+3]=255;
    }
    cctx.putImageData(out,0,0);
    result.push(c);
  }

  // Variant C: plain grayscale, useful with antialiasing and accents.
  const gc=document.createElement('canvas');
  gc.width=raw.width;gc.height=raw.height;
  const gctx=gc.getContext('2d',{willReadFrequently:true});
  const gout=gctx.createImageData(gc.width,gc.height);
  for(let p=0,i=0;i<gout.data.length;i+=4,p++){
    const v=gray[p];
    gout.data[i]=gout.data[i+1]=gout.data[i+2]=v;
    gout.data[i+3]=255;
  }
  gctx.putImageData(gout,0,0);
  result.push(gc);

  return result;
}

function alphaQuality(text,kind='name'){
  const t=cleanFieldText(text);
  if(!t)return -999;
  const letters=(t.match(/[A-ZÀ-ÖØ-Ý]/g)||[]).length;
  const digits=(t.match(/[0-9]/g)||[]).length;
  const words=t.split(/\s+/).filter(Boolean).length;

  let score=letters*2 + words*.5 - digits*6;
  if(kind==='team'&&letters>=3)score+=4;
  if(kind==='name'&&letters>=2&&letters<=30)score+=3;
  if(t.length>45)score-=10;
  return score;
}

async function readAdaptiveAlpha(worker,img,r,kind='name'){
  const canvases=adaptiveTextCanvases(img,r,4.2);
  const whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÓÙÑÇÜÖÄÁÍÚÂÊÔÃÕ -.'";
  const reads=[];

  for(const c of canvases){
    for(const psm of ['7','6']){
      const raw=await recognizeCanvas(worker,c,{psm,whitelist});
      reads.push(raw);
    }
  }

  reads.sort((a,b)=>alphaQuality(b,kind)-alphaQuality(a,kind));
  return cleanFieldText(reads[0]||'');
}

function looksLikeTeamText(text){
  const t=cleanFieldText(text);
  const letters=(t.match(/[A-ZÀ-ÖØ-Ý]/g)||[]).length;
  const digits=(t.match(/\d/g)||[]).length;
  return letters>=3 && digits===0 && t.length<=40;
}

async function detectCardTypeByContent(worker,img){
  /*
    Il discriminante è la PRESENZA DELLA RIGA SQUADRA.
    Il colore della fascia laterale non conta.
    Nel tipo 1 quella zona è vuota.
    Nel tipo 2 contiene sempre il nome della squadra sotto al cognome.
  */
  const teamProbe=await readAdaptiveAlpha(worker,img,CARD_TYPE2.team,'team');

  if(looksLikeTeamText(teamProbe)){
    const firstProbe=await readAdaptiveAlpha(worker,img,CARD_TYPE2.first,'name');
    const lastProbe=await readAdaptiveAlpha(worker,img,CARD_TYPE2.surname,'name');

    const identityEvidence=
      alphaQuality(firstProbe,'name')>3 ||
      alphaQuality(lastProbe,'name')>5;

    if(identityEvidence){
      return {type:2,probe:{first:firstProbe,last:lastProbe,team:teamProbe}};
    }
  }

  return {type:1,probe:{}};
}

async function readNumberInRegion(worker,img,r){
  const canvases=adaptiveTextCanvases(img,r,4.2);
  const votes=new Map();

  for(const c of canvases){
    for(const psm of ['6','7','11']){
      const raw=await recognizeCanvas(worker,c,{psm,whitelist:'0123456789'});
      const parts=String(raw||'').match(/\d{1,2}/g)||[];

      for(const p of parts){
        const n=Number(p);
        if(n>=1&&n<=99){
          const bonus=p.length===2?2:1;
          votes.set(String(n),(votes.get(String(n))||0)+bonus);
        }
      }
    }
  }

  if(!votes.size)return '';
  return [...votes.entries()].sort((a,b)=>b[1]-a[1])[0][0];
}

async function readRoleInRegion(worker,img,r){
  const reads=[];
  const canvases=adaptiveTextCanvases(img,r,4.0);

  for(const c of canvases){
    const raw=await recognizeCanvas(
      worker,c,
      {psm:'7',whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ "}
    );
    reads.push(raw);
  }

  for(const raw of reads){
    const role=normalizeCardRole(raw);
    if(role)return role;
  }
  return '';
}

async function readHeightInRegion(worker,img,r){
  const canvases=adaptiveTextCanvases(img,r,4.0);
  const votes=new Map();

  for(const c of canvases){
    for(const psm of ['6','7']){
      const raw=await recognizeCanvas(worker,c,{psm,whitelist:'0123456789 CMcm'});
      for(const h of extractHeightCandidate(raw)){
        votes.set(h,(votes.get(h)||0)+1);
      }
    }
  }

  const ranked=[...votes.entries()].sort((a,b)=>b[1]-a[1]);
  if(!ranked.length)return '';
  if(ranked[0][1]>=2)return ranked[0][0];
  return ranked.length===1?ranked[0][0]:'';
}

async function readAgeYearInRegion(worker,img,r){
  const canvases=adaptiveTextCanvases(img,r,4.0);
  const years=new Map();
  const ages=[];

  for(const c of canvases){
    for(const psm of ['6','11']){
      const raw=await recognizeCanvas(worker,c,{psm,whitelist:'0123456789'});
      for(const y of extractYearCandidates(raw))years.set(y,(years.get(y)||0)+1);
      ages.push(...extractAgeCandidates(raw));
    }
  }

  const ranked=[...years.entries()].sort((a,b)=>b[1]-a[1]);

  if(ranked.length&&ages.length){
    const age=ages.sort((a,b)=>a-b)[Math.floor(ages.length/2)];
    const expected=expectedBirthYearFromAge(age);
    const compatible=ranked.filter(([y])=>Math.abs(Number(y)-expected)<=1);
    if(compatible.length)return compatible.sort((a,b)=>b[1]-a[1])[0][0];
  }

  if(ranked.length)return ranked[0][0];

  if(ages.length){
    const age=ages.sort((a,b)=>a-b)[Math.floor(ages.length/2)];
    const y=expectedBirthYearFromAge(age);
    if(y>=1980&&y<=2015)return String(y);
  }

  return '';
}

function detectFootByBoxColor(img,r){
  /*
    Regola unica per ENTRAMBE le tipologie:
      BLU/AZZURRO nel box rosso => DX
      GIALLO/ORO nel box rosso => SX

    Non leggiamo DX/SX/DESTRO/SINISTRO con OCR.
  */
  const sx=Math.round(img.naturalWidth*r.x);
  const sy=Math.round(img.naturalHeight*r.y);
  const sw=Math.round(img.naturalWidth*r.w);
  const sh=Math.round(img.naturalHeight*r.h);

  const c=document.createElement('canvas');
  c.width=sw;c.height=sh;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);

  const d=ctx.getImageData(0,0,sw,sh).data;
  let blue=0,yellow=0;

  for(let i=0;i<d.length;i+=4){
    const R=d[i],G=d[i+1],B=d[i+2];

    const isBlue=
      B>100 &&
      B>R*1.17 &&
      B>G*1.04 &&
      B-R>28;

    const isYellow=
      R>145 &&
      G>108 &&
      B<140 &&
      R-B>32 &&
      G-B>18;

    if(isBlue)blue++;
    if(isYellow)yellow++;
  }

  const min=Math.max(80,Math.round(sw*sh*.0018));

  if(blue>=min && blue>yellow*1.22)return 'DX';
  if(yellow>=min && yellow>blue*1.22)return 'SX';
  return '';
}

function detectFlagNationalityInRegion(img,r){
  /*
    Riusa il classificatore V33 ma gli fornisce un'immagine virtualmente
    centrata sulla bandiera: sostituiamo temporaneamente il crop atteso
    mediante una canvas con la bandiera al centro.
  */
  const sx=Math.round(img.naturalWidth*r.x);
  const sy=Math.round(img.naturalHeight*r.y);
  const sw=Math.round(img.naturalWidth*r.w);
  const sh=Math.round(img.naturalHeight*r.h);

  const c=document.createElement('canvas');
  c.width=img.naturalWidth;
  c.height=img.naturalHeight;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,c.width,c.height);

  // Place the crop where the V33 classifier expects it on a "classic" card.
  const tx=Math.round(c.width*.078);
  const ty=Math.round(c.height*.742);
  const tw=Math.round(c.width*.090);
  const th=Math.round(c.height*.166);
  ctx.drawImage(img,sx,sy,sw,sh,tx,ty,tw,th);

  return detectFlagNationalityV32(c);
}

async function readCardWithWorker(file,worker,index=0,total=1){
  const img=await loadImage(file);

  const progress=(label,step,totalSteps)=>{
    if($('progressText')){
      $('progressText').textContent=total>1
        ?`CARD ${index+1}/${total} · ${label}`
        :`LETTURA ${label}...`;
    }
    if($('progressFill')){
      const overall=((index+(step/totalSteps))/total)*100;
      $('progressFill').style.width=`${Math.round(overall)}%`;
    }
  };

  progress('TIPOLOGIA CARD',0,12);
  const detected=await detectCardTypeByContent(worker,img);
  const type=detected.type;
  const R=type===2?CARD_TYPE2:CARD_TYPE1;

  let step=1;
  const steps=12;

  let first='';
  let last='';
  let team='';

  if(type===2){
    progress('NOME',step++,steps);
    first=detected.probe.first || await readAdaptiveAlpha(worker,img,R.first,'name');

    progress('COGNOME',step++,steps);
    last=detected.probe.last || await readAdaptiveAlpha(worker,img,R.surname,'name');

    progress('SQUADRA',step++,steps);
    team=detected.probe.team || await readAdaptiveAlpha(worker,img,R.team,'team');
  }else{
    progress('COGNOME',step++,steps);
    last=await readAdaptiveAlpha(worker,img,R.surname,'name');

    // Keep progress proportions aligned.
    step+=2;
  }

  progress('NUMERO',step++,steps);
  const number=await readNumberInRegion(worker,img,R.number);

  progress('RUOLO',step++,steps);
  const role=await readRoleInRegion(worker,img,R.role);

  progress('ALTEZZA',step++,steps);
  const height=await readHeightInRegion(worker,img,R.height);

  progress('PIEDE',step++,steps);
  const foot=detectFootByBoxColor(img,R.foot);

  progress('ETÀ / ANNO',step++,steps);
  const year=await readAgeYearInRegion(worker,img,R.ageYear);

  progress('NAZIONALITÀ',step++,steps);
  const nationality=resolveNationality(detectFlagNationalityInRegion(img,R.flag));

  progress('PUNTI DI FORZA',step++,steps);
  const strengthsRaw=await readColoredLinesSmart(worker,img,R.strengths,'green');

  progress('PUNTI DEBOLI',step++,steps);
  const weaknessesRaw=await readColoredLinesSmart(worker,img,R.weaknesses,'red');

  return{
    first,
    last,
    team,
    number,
    role,
    position:'',
    height,
    foot,
    year,
    nationality,
    strengths:splitOcrLines(strengthsRaw),
    weaknesses:splitOcrLines(weaknessesRaw),
    card_type:type
  };
}

async function readSingleCardFile(file,index=0,total=1){
  let worker=null;
  try{
    worker=await createCardWorker(m=>{
      if(m.status==='recognizing text'&&$('progressText')){
        const p=Math.round((m.progress||0)*100);
        $('progressText').textContent=total>1?`CARD ${index+1}/${total} · OCR ${p}%`:`OCR ${p}%`;
      }
    });
    return await readCardWithWorker(file,worker,index,total);
  }finally{
    if(worker)try{await worker.terminate()}catch(_){}
  }
}

async function processBatchCards(){
  if(!selectedFiles.length)return;

  $('ocrProgress')?.classList.remove('hidden');
  if($('processCardBtn'))$('processCardBtn').disabled=true;
  batchResults=new Array(selectedFiles.length).fill(null);

  let worker=null;
  let firstError='';

  try{
    if($('progressText'))$('progressText').textContent='AVVIO MOTORE OCR...';
    if($('progressFill'))$('progressFill').style.width='2%';

    // Un solo worker per tutte le card. Evita crash/memoria quando vengono selezionate molte immagini.
    worker=await createCardWorker(m=>{
      if(m.status==='loading tesseract core'&&$('progressText'))$('progressText').textContent='CARICAMENTO LETTORE...';
      else if(m.status==='loading language traineddata'&&$('progressText'))$('progressText').textContent='CARICAMENTO MODELLO OCR...';
      else if(m.status==='initializing api'&&$('progressText'))$('progressText').textContent='PREPARAZIONE OCR...';
    });

    for(let i=0;i<selectedFiles.length;i++){
      currentBatchIndex=i;
      batchResults[i]={status:'processing',parsed:null};
      renderBatchQueue();

      try{
        const parsed=await readCardWithWorker(selectedFiles[i],worker,i,selectedFiles.length);
        batchResults[i]={status:'done',parsed};
      }catch(err){
        console.error('CARD OCR ERROR',i,err);
        const msg=String(err?.message||err||'ERRORE OCR');
        if(!firstError)firstError=msg;
        batchResults[i]={status:'error',parsed:null,error:msg};
      }

      if($('progressFill'))$('progressFill').style.width=`${Math.round(((i+1)/selectedFiles.length)*100)}%`;
      renderBatchQueue();
      await new Promise(r=>setTimeout(r,20));
    }
  }catch(err){
    console.error('BATCH WORKER ERROR',err);
    firstError=String(err?.message||err||'ERRORE AVVIO OCR');
  }finally{
    if(worker)try{await worker.terminate()}catch(_){}
    if($('processCardBtn'))$('processCardBtn').disabled=false;
  }

  const first=batchResults.findIndex(x=>x?.parsed);
  if(first<0){
    const detail=firstError?`\n\nDETTAGLIO: ${firstError}`:'';
    alert('NON È STATO POSSIBILE LEGGERE LE CARD.'+detail);
    return;
  }

  currentBatchIndex=first;
  fillImport(batchResults[first].parsed);
  $('uploadStage')?.classList.add('hidden');
  $('importReview')?.classList.remove('hidden');
  renderCardTabs();
  renderBatchQueue();

  const failed=batchResults.filter(x=>x?.status==='error').length;
  if(failed){
    alert(`${batchResults.length-failed} CARD LETTE CORRETTAMENTE · ${failed} CARD CON ERRORE. PUOI ARCHIVIARE QUELLE LETTE E RIPROVARE LE ALTRE.`);
  }
}

async function archiveParsedPlayer(parsed){
  await ensureWriteSession();

  const teamName=upper(parsed.team);
  if(!teamName)throw new Error('LA SQUADRA È OBBLIGATORIA.');

  let team=teams.find(t=>norm(t.name)===norm(teamName));
  if(!team){
    const {data,error}=await db.from('teams').insert({name:teamName,country:'',competition:''}).select().single();
    if(error)throw error;
    team=data;
    teams.push(team);
  }

  const payload={
    first_name:upper(parsed.first),
    last_name:upper(parsed.last),
    team_id:team.id,
    number:parsed.number!==''?Number(parsed.number):null,
    role:upper(parsed.role||''),
    position:upper(parsed.position),
    height:parsed.height!==''?Number(parsed.height):null,
    foot:upper(parsed.foot||''),
    birth_year:parsed.year!==''?Number(parsed.year):null,
    nationality:resolveNationality(parsed.nationality),
    strengths:(parsed.strengths||[]).map(upper),
    weaknesses:(parsed.weaknesses||[]).map(upper),
    notes:'',
    updated_at:new Date().toISOString()
  };

  if(!payload.first_name||!payload.last_name)throw new Error('NOME E COGNOME SONO OBBLIGATORI.');

  const {data,error}=await db.from('players').insert(payload).select('*, teams(name)').single();
  if(error)throw error;
  return data;
}

function handlePickedFiles(files,autoProcess=true){
  resetImport();
  if(!setSelectedFiles(files))return;
  openModal('importModal');
  if(autoProcess)setTimeout(()=>processCard(),50);
}

function bindImportUI(){
  const input=$('cardFile');

  input?.addEventListener('change',e=>{
    const files=Array.from(e.target.files||[]);
    if(files.length)handlePickedFiles(files,true);
  });

  ['importCardBtn','dashboardImportBtn','playersImportBtn','settingsImportBtn','dropzone'].forEach(id=>{
    const el=$(id);
    if(!el)return;
    el.addEventListener('keydown',e=>{
      if((e.key==='Enter'||e.key===' ')&&input){
        e.preventDefault();
        input.click();
      }
    });
  });

  for(const id of ['dashboardImportBtn','dropzone']){
    const el=$(id);
    if(!el)continue;
    el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag')});
    el.addEventListener('dragleave',()=>el.classList.remove('drag'));
    el.addEventListener('drop',e=>{
      e.preventDefault();
      el.classList.remove('drag');
      const files=Array.from(e.dataTransfer?.files||[]);
      if(files.length)handlePickedFiles(files,true);
    });
  }

  $('processCardBtn')?.addEventListener('click',processCard);
  $('restartImportBtn')?.addEventListener('click',()=>{
    const files=selectedFiles.slice();
    if(files.length)handlePickedFiles(files,true);
  });
  $('clearBatchBtn')?.addEventListener('click',resetImport);
}

async function processCard(){
  if(batchMode)return processBatchCards();
  if(!selectedFile)return;

  $('ocrProgress').classList.remove('hidden');
  $('processCardBtn').disabled=true;
  $('progressFill').style.width='5%';
  $('progressText').textContent='LETTURA CARD...';

  try{
    const parsed=await readSingleCardFile(selectedFile,0,1);
    $('progressFill').style.width='100%';
    $('progressText').textContent='LETTURA COMPLETATA';
    fillImport(parsed);
    $('uploadStage').classList.add('hidden');
    $('importReview').classList.remove('hidden');
  }catch(err){
    console.error(err);
    alert('ERRORE LETTURA CARD: '+(err?.message||err));
  }finally{
    $('processCardBtn').disabled=false;
  }
}
function fillImport(p){
  $('iFirstName').value=upper(p.first);
  $('iLastName').value=upper(p.last);
  $('iTeam').value=upper(p.team);
  $('iNumber').value=p.number||'';
  $('iRole').value=['DIFENSORE','CENTROCAMPISTA','ATTACCANTE'].includes(p.role)?p.role:'';
  $('iPosition').value='';
  $('iHeight').value=p.height||'';

  const foot=(p.foot==='SX'||p.foot==='DX')?p.foot:'';
  $('iFoot').value=foot;

  $('iBirthYear').value=p.year||'';

  const nation=sanitizeNationalityInput(p.nationality||'');
  $('iNationality').value=nation;
  updateNationalityFlagPreview($('iNationality'));

  $('iStrengths').value=(p.strengths||[]).map(upper).join(', ');
  $('iWeaknesses').value=(p.weaknesses||[]).map(upper).join(', ');
}


async function archiveImportedPlayer(){
  const btn=$('archivePlayerBtn');
  if(btn){btn.disabled=true;btn.textContent='ARCHIVIAZIONE...';}

  try{
    if(batchMode){
      saveCurrentBatchReview();
      const item=batchResults[currentBatchIndex];
      if(!item?.parsed)throw new Error('DATI CARD NON DISPONIBILI.');

      await archiveParsedPlayer(item.parsed);
      item.status='archived';
      renderCardTabs();
      renderBatchQueue();

      const next=batchResults.findIndex((x,i)=>i>currentBatchIndex&&x?.parsed&&x.status!=='archived');
      if(next>=0){
        currentBatchIndex=next;
        fillImport(batchResults[next].parsed);
        renderCardTabs();
      }else{
        await loadAll();
        closeModal('importModal');
        resetImport();
        showView('players');
      }
      return;
    }

    await archiveParsedPlayer(captureReview());
    await loadAll();
    closeModal('importModal');
    resetImport();
    showView('players');
  }catch(err){
    console.error(err);
    alert(err?.message||'ERRORE ARCHIVIAZIONE.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='ARCHIVIA GIOCATORE';}
  }
}







populateCountrySelects();





document.addEventListener('input',e=>{
  const el=e.target;
  if(!el?.closest?.('#playerModal,#importModal,#teamModal'))return;
  if(!['INPUT','TEXTAREA'].includes(el.tagName))return;
  if(['email','password','file'].includes(el.type))return;
  const a=el.selectionStart,b=el.selectionEnd;
  el.value=el.value.toUpperCase();
  try{el.setSelectionRange(a,b)}catch(_){}
});




window.addEventListener('error',e=>{
  console.error('APP ERROR',e.error||e.message);
  if(!$('authGate')?.classList.contains('hidden')){
    setLoginError('ERRORE APPLICAZIONE: '+String(e.message||'errore JavaScript'));
  }
});
window.addEventListener('unhandledrejection',e=>{
  console.error('UNHANDLED PROMISE',e.reason);
});

$('logoutBtn')?.addEventListener('click',logout);




$('importReview')?.addEventListener('submit',async e=>{
  e.preventDefault();
  await archiveImportedPlayer();
});
document.querySelectorAll('[data-close]').forEach(b=>{
  b.onclick=()=>closeModal(b.dataset.close);
});
bindImportUI();

if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister())).catch(()=>{});
}


function installNationalitySearchUX(){
  ['fNation','iNationality','nationality'].forEach(id=>{
    const input=$(id);
    if(!input)return;

    input.setAttribute('spellcheck','false');

    input.addEventListener('input',()=>{
      // Keep free typing so the browser datalist can filter live.
      input.value=input.value.toUpperCase();
      updateNationalityFlagPreview(input);
    });

    input.addEventListener('change',()=>{
      syncNationalityField(input);
      updateNationalityFlagPreview(input);
      if(id==='fNation')renderDashboard();
    });

    input.addEventListener('blur',()=>{
      syncNationalityField(input);
      updateNationalityFlagPreview(input);
    });

    ensureNationalityFlagPreview(input);
    updateNationalityFlagPreview(input);
  });
}

function ensureNationalityFlagPreview(input){
  if(!input||input.parentElement?.querySelector('.nationality-flag-preview'))return;
  const preview=document.createElement('span');
  preview.className='nationality-flag-preview';
  preview.setAttribute('aria-hidden','true');
  input.parentElement?.classList.add('nationality-search-field');
  input.parentElement?.appendChild(preview);
}

function updateNationalityFlagPreview(input){
  if(!input)return;
  const preview=input.parentElement?.querySelector('.nationality-flag-preview');
  if(!preview)return;

  const clean=sanitizeNationalityInput(input.value);
  const code=countryCodeForName(clean);
  preview.textContent=code?flagEmoji(code):'';
  input.classList.toggle('has-nationality-flag',!!code);
}

populateCountrySearch();
installNationalitySearchUX();
initializeAuth().catch(e=>{console.error(e);showLogin(e.message)});