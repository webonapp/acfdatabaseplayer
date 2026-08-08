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
const COUNTRY_FLAG_OVERRIDES={'GB-ENG':'🏴','GB-SCT':'🏴','GB-WLS':'🏴','GB-NIR':'🇬🇧','XK':'🇽🇰'};
function flagEmoji(code){if(COUNTRY_FLAG_OVERRIDES[code])return COUNTRY_FLAG_OVERRIDES[code];return code.replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt()))}
function countryLabel(name){const c=COUNTRIES.find(x=>x[1]===name);return c?`${flagEmoji(c[0])} ${c[1]}`:name}
function countryOptions(includeAll=false){return (includeAll?'<option value="">Tutte</option>':'<option value="">SELEZIONA NAZIONALITÀ</option>')+COUNTRIES.slice().sort((a,b)=>a[1].localeCompare(b[1],'it')).map(([code,name])=>`<option value="${name}">${flagEmoji(code)} ${name}</option>`).join('')}
function populateCountrySelects(){
 if($('fNation')){const v=$('fNation').value;$('fNation').innerHTML=countryOptions(true);$('fNation').value=v}
 if($('iNationality')){const v=$('iNationality').value;$('iNationality').innerHTML=countryOptions(false);$('iNationality').value=v}
 if($('nationality')){const v=$('nationality').value;$('nationality').innerHTML=countryOptions(false);$('nationality').value=v}
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

function showView(n){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('view-'+n)?.classList.add('active');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===n));if(n==='players')renderPlayersPage();if(n==='teams')renderTeamsPage();if(n==='stats')renderStats();$('sidebar').classList.remove('mobile-open');scrollTo({top:0,behavior:'smooth'})}document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showView(b.dataset.go));['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',renderDashboard));$('searchBtn').onclick=renderDashboard;$('filterBtn').onclick=renderDashboard;$('resetBtn').onclick=()=>{['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).value='');renderDashboard()};$('playersSearch').oninput=renderPlayersPage;$('playerSort').onchange=renderPlayersPage;


function openModal(id){$(id).classList.add('open')}function closeModal(id){$(id).classList.remove('open')}$('manualTeamBtn').onclick=()=>openNewTeamModal();
$('teamForm').onsubmit=async e=>{e.preventDefault();if(!db)return alert('SUPABASE NON CONFIGURATO.');try{await ensureWriteSession();const id=$('teamEditId').value;const payload={name:upper($('teamName').value),country:upper($('teamCountry').value),competition:upper($('teamCompetition').value)};if(!payload.name)throw new Error('IL NOME DELLA SQUADRA È OBBLIGATORIO.');const duplicate=teams.find(t=>norm(t.name)===norm(payload.name)&&String(t.id)!==String(id||''));if(duplicate)throw new Error('ESISTE GIÀ UNA SQUADRA CON QUESTO NOME.');if(id){const{error}=await db.from('teams').update(payload).eq('id',id);if(error)throw error}else{const{error}=await db.from('teams').insert(payload);if(error)throw error}$('teamForm').reset();$('teamEditId').value='';closeModal('teamModal');await loadAll();showView('teams')}catch(err){console.error(err);alert(err?.message||'ERRORE DURANTE IL SALVATAGGIO DELLA SQUADRA.')}};
function normalizeRole(v){const n=norm(v);if(n.includes('dif')||n.includes('terz')||n.includes('bracc'))return'DIFENSORE';if(n.includes('centr')||n.includes('mezz')||n.includes('med')||n.includes('trequart'))return'CENTROCAMPISTA';return'ATTACCANTE'}
function openNewTeamModal(){$('teamForm').reset();$('teamEditId').value='';$('teamModalTitle').textContent='NUOVA SQUADRA';openModal('teamModal')}
window.editTeam=id=>{const t=teams.find(x=>String(x.id)===String(id));if(!t)return;$('teamEditId').value=t.id;$('teamModalTitle').textContent='MODIFICA SQUADRA';$('teamName').value=upper(t.name||'');$('teamCountry').value=upper(t.country||'');$('teamCompetition').value=upper(t.competition||'');openModal('teamModal')};
window.deleteTeam=async id=>{const t=teams.find(x=>String(x.id)===String(id));if(!t)return;const linked=players.filter(p=>String(p.team_id)===String(id));let msg=`ELIMINARE DEFINITIVAMENTE LA SQUADRA "${t.name}"?`;if(linked.length)msg+=`\n\nATTENZIONE: CI SONO ${linked.length} GIOCATORI ASSOCIATI.\nELIMINANDO LA SQUADRA VERRANNO ELIMINATI ANCHE TUTTI I GIOCATORI DELLA SQUADRA.`;if(!confirm(msg))return;try{await ensureWriteSession();if(linked.length){const{error:e1}=await db.from('players').delete().eq('team_id',id);if(e1)throw new Error('ERRORE ELIMINAZIONE GIOCATORI: '+e1.message)}const{error:e2}=await db.from('teams').delete().eq('id',id);if(e2)throw new Error('ERRORE ELIMINAZIONE SQUADRA: '+e2.message);await loadAll();showView('teams')}catch(err){console.error(err);alert(err?.message||'ERRORE DURANTE L’ELIMINAZIONE DELLA SQUADRA.')}};
window.editPlayer=id=>{const p=players.find(x=>String(x.id)===String(id));if(!p)return;$('playerId').value=p.id;$('firstName').value=p.first_name||'';$('lastName').value=p.last_name||'';$('teamNameEdit').value=upper(p.teams?.name||'');$('number').value=p.number??'';$('role').value=normalizeRole(p.role);$('position').value=p.position||'';$('height').value=p.height??'';$('foot').value=p.foot==='SX'?'SX':'DX';$('birthYear').value=p.birth_year??'';$('nationality').value=resolveNationality(p.nationality||'');$('strengths').value=tags(p.strengths).join(', ');$('weaknesses').value=tags(p.weaknesses).join(', ');$('notes').value=p.notes||'';openModal('playerModal')};$('playerForm').onsubmit=async e=>{
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
      nationality:resolveNationality($('nationality').value),
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
  role:       {x:.381,y:.017,w:.259,h:.083,psm:'7',mode:'dark'},
  first:      {x:.032,y:.366,w:.188,h:.048,psm:'7',mode:'white'},
  last:       {x:.032,y:.405,w:.188,h:.057,psm:'7',mode:'white'},
  team:       {x:.015,y:.457,w:.215,h:.052,psm:'7',mode:'white'},
  number:     {x:.015,y:.513,w:.215,h:.209,psm:'7',mode:'white',digits:true},
  flag:       {x:.065,y:.720,w:.145,h:.245},
  height:     {x:.796,y:.061,w:.185,h:.165,psm:'6',mode:'dark',digits:true},
  foot:       {x:.800,y:.313,w:.176,h:.209,psm:'6',mode:'blue'},
  year:       {x:.781,y:.714,w:.205,h:.226,psm:'6',mode:'dark',digits:true},
  strengths:  {x:.317,y:.566,w:.391,h:.244,psm:'6',mode:'green'},
  weaknesses: {x:.305,y:.780,w:.430,h:.180,psm:'6',mode:'red'}
};

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
 let x=cleanLine(t).toUpperCase().replace(/[^A-ZÀ-ÖØ-Ý0-9'’\-\. ]/g,' ').replace(/\s+/g,' ').trim();
 // Scarta esclusivamente frammenti isolati generati dal bordo, senza correggere parole.
 const parts=x.split(' ').filter(Boolean);while(parts.length>1&&parts.at(-1).length===1)parts.pop();while(parts.length>1&&parts[0].length===1)parts.shift();return parts.join(' ');
}
function cleanDigits(t){const m=String(t||'').match(/\d+/g);return m?m.join(''):''}
function cleanMulti(t){return String(t||'').split(/\n+/).map(cleanFieldText).filter(x=>x.length>2).join('\n')}
function normalizeCardRole(t){const n=cleanFieldText(t);if(n.includes('DIFENS'))return'DIFENSORE';if(n.includes('CENTRO'))return'CENTROCAMPISTA';if(n.includes('ATTACC'))return'ATTACCANTE';return'ATTACCANTE'}
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
 const r=CARD_REGIONS.flag,sx=Math.round(img.naturalWidth*r.x),sy=Math.round(img.naturalHeight*r.y),sw=Math.round(img.naturalWidth*r.w),sh=Math.round(img.naturalHeight*r.h);
 const c=document.createElement('canvas');c.width=180;c.height=180;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,sx,sy,sw,sh,0,0,180,180);const d=x.getImageData(0,0,180,180).data;
 const pix=(xx,yy)=>{const i=(yy*180+xx)*4;return[d[i],d[i+1],d[i+2]]};
 const red=([R,G,B])=>R>145&&R>G*1.25&&R>B*1.25, white=([R,G,B])=>R>190&&G>190&&B>190, blue=([R,G,B])=>B>100&&B>R*1.15;
 // Danimarca: cerchiamo il pattern croce bianca su campo rosso nel nucleo del simbolo, ignorando sfondo e bordo circolare.
 let coreR=0,coreW=0,n=0;for(let yy=28;yy<152;yy+=3)for(let xx=28;xx<152;xx+=3){const p=pix(xx,yy);if(red(p))coreR++;if(white(p))coreW++;n++}
 let hW=0,hN=0,vW=0,vN=0;
 for(let yy=76;yy<104;yy+=2)for(let xx=32;xx<148;xx+=2){hN++;if(white(pix(xx,yy)))hW++}
 for(let yy=32;yy<148;yy+=2)for(let xx=65;xx<91;xx+=2){vN++;if(white(pix(xx,yy)))vW++}
 if(coreR/n>.13&&coreW/n>.05&&hW/hN>.15&&vW/vN>.12)return'DANIMARCA';
 // Fallback molto prudente per alcuni pattern semplici.
 let R=0,W=0,B=0,G=0,Y=0,K=0,T=0;for(let yy=25;yy<155;yy+=4)for(let xx=25;xx<155;xx+=4){const [a,b,z]=pix(xx,yy);T++;if(a>145&&a>b*1.25&&a>z*1.25)R++;else if(a>195&&b>195&&z>195)W++;else if(z>110&&z>a*1.15)B++;else if(b>100&&b>a*1.08&&b>z*1.05)G++;else if(a>150&&b>120&&z<95)Y++;else if(a<65&&b<65&&z<65)K++}
 if(G/T>.12&&W/T>.08&&R/T>.08)return'ITALIA';if(B/T>.10&&W/T>.10&&R/T>.08)return'FRANCIA';if(K/T>.07&&R/T>.10&&Y/T>.07)return'GERMANIA';if(R/T>.18&&Y/T>.06)return'SPAGNA';return'';
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
    nationality:resolveNationality($('iNationality').value),
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

async function readCardWithWorker(file,worker,index=0,total=1){
  const img=await loadImage(file);
  const keys=['role','first','last','team','number','height','foot','year','strengths','weaknesses'];
  const raw={};

  for(let k=0;k<keys.length;k++){
    const key=keys[k];
    if($('progressText')){
      $('progressText').textContent=total>1
        ?`CARD ${index+1}/${total} · ${key.toUpperCase()}`
        :`LETTURA ${key.toUpperCase()}...`;
    }
    const overall=((index+(k/keys.length))/total)*100;
    if($('progressFill'))$('progressFill').style.width=`${Math.round(overall)}%`;
    raw[key]=await readRegion(worker,img,key);
  }

  return {
    first:cleanFieldText(raw.first),
    last:cleanFieldText(raw.last),
    team:cleanFieldText(raw.team),
    number:cleanDigits(raw.number).slice(0,2),
    role:normalizeCardRole(raw.role),
    position:'',
    height:(cleanDigits(raw.height).match(/1[5-9]\d|2[0-1]\d/)||[''])[0],
    foot:/SX/i.test(raw.foot)?'SX':'DX',
    year:(cleanDigits(raw.year).match(/19\d{2}|20\d{2}/)||[''])[0],
    nationality:resolveNationality(detectFlagNationality(img)),
    strengths:cleanMulti(raw.strengths).split('\n').map(cleanFieldText).filter(Boolean),
    weaknesses:cleanMulti(raw.weaknesses).split('\n').map(cleanFieldText).filter(Boolean)
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
    role:upper(parsed.role||'ATTACCANTE'),
    position:upper(parsed.position),
    height:parsed.height!==''?Number(parsed.height):null,
    foot:upper(parsed.foot||'DX'),
    birth_year:parsed.year!==''?Number(parsed.year):null,
    nationality:resolveNationality(parsed.nationality),
    strengths:(parsed.strengths||[]).map(upper),
    weaknesses:(parsed.weaknesses||[]).map(upper),
    notes:'IMPORTATO AUTOMATICAMENTE DA CARD',
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
function fillImport(p){$('iFirstName').value=upper(p.first);$('iLastName').value=upper(p.last);$('iTeam').value=upper(p.team);$('iNumber').value=p.number||'';$('iRole').value=['DIFENSORE','CENTROCAMPISTA','ATTACCANTE'].includes(p.role)?p.role:'ATTACCANTE';$('iPosition').value='';$('iHeight').value=p.height||'';$('iFoot').value=p.foot==='SX'?'SX':'DX';$('iBirthYear').value=p.year||'';$('iNationality').value=resolveNationality(p.nationality||'');$('iStrengths').value=(p.strengths||[]).map(upper).join(', ');$('iWeaknesses').value=(p.weaknesses||[]).map(upper).join(', ')}


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

initializeAuth().catch(e=>{console.error(e);showLogin(e.message)});