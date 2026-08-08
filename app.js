const $=id=>document.getElementById(id);const cfg=window.APP_CONFIG||{};const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes('INSERISCI_QUI')&&cfg.SUPABASE_PUBLISHABLE_KEY&&!cfg.SUPABASE_PUBLISHABLE_KEY.includes('INSERISCI_QUI');let db=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY):null,teams=[],players=[],selectedFile=null;
let selectedFiles=[],batchResults=[],currentBatchIndex=0,batchMode=false;if(!configured)$('setupBanner').classList.remove('hidden');

let currentSession=null;
let authBooted=false;

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
  setTimeout(()=>$('loginEmail')?.focus(),50);
}

function hideLogin(session){
  currentSession=session||null;
  document.body.classList.remove('auth-locked');
  $('authGate')?.classList.add('hidden');
  setLoginError('');
  const mail=session?.user?.email||'';
  if($('sideAccountEmail')) $('sideAccountEmail').textContent=mail;
}

async function loginWithPassword(email,password){
  if(!db) throw new Error('Supabase non configurato.');
  if(!email) throw new Error('Inserisci l’email.');
  if(!password) throw new Error('Inserisci la password.');

  const {data,error}=await db.auth.signInWithPassword({
    email:email.trim(),
    password
  });

  if(error){
    if(error.message?.toLowerCase().includes('invalid login credentials')){
      throw new Error('Email o password non corretti.');
    }
    if(error.message?.toLowerCase().includes('email not confirmed')){
      throw new Error('Email non confermata su Supabase.');
    }
    throw error;
  }

  if(!data?.session) throw new Error('Accesso non completato.');
  return data.session;
}

async function logout(){
  if(!db)return;
  const {error}=await db.auth.signOut();
  if(error){
    alert('Errore logout: '+error.message);
    return;
  }
  currentSession=null;
  teams=[];
  players=[];
  showLogin();
}

async function initializeAuth(){
  if(authBooted)return;
  authBooted=true;

  if(!db){
    showLogin('Supabase non configurato.');
    return;
  }

  const {data,error}=await db.auth.getSession();
  if(error){
    showLogin(error.message);
    return;
  }

  if(data?.session){
    hideLogin(data.session);
    try{
      await loadAll();
    }catch(err){
      console.error(err);
      alert('Accesso effettuato, ma il database ha restituito un errore: '+(err?.message||err));
    }
  }else{
    showLogin();
  }

  db.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'||!session){
      currentSession=null;
      showLogin();
      return;
    }
    currentSession=session;
    hideLogin(session);
  });
}

async function ensureWriteSession(){
  if(!db) throw new Error('Supabase non configurato.');
  const {data,error}=await db.auth.getSession();
  if(error) throw error;
  if(!data?.session){
    showLogin('Sessione scaduta. Effettua nuovamente il login.');
    throw new Error('Sessione scaduta.');
  }
  currentSession=data.session;
  return data.session;
}


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
 $('teamId').innerHTML=teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
 populateCountrySelects();
 preserve('fYear',[...new Set(players.map(p=>p.birth_year).filter(Boolean))].sort((a,b)=>b-a),'Tutti');
}
function matches(p){const q=norm($('q').value),team=$('fTeam').value,role=$('fRole').value,foot=$('fFoot').value,n=$('fNation').value,y=$('fYear').value,hay=norm([p.first_name,p.last_name,p.teams?.name,p.role,p.position,p.foot,p.birth_year,p.nationality,...tags(p.strengths),...tags(p.weaknesses),p.notes].join(' '));return(!q||hay.includes(q))&&(!team||String(p.team_id)===team)&&(!role||norm(p.role)===norm(role))&&(!foot||p.foot===foot)&&(!n||p.nationality===n)&&(!y||String(p.birth_year)===y)}
function row(p){return`<tr><td><div class="playercell"><div class="pface">${esc(initials(p))}</div><span class="num">${p.number??'-'}</span><span class="playername">${esc(p.first_name)} ${esc(p.last_name)}</span></div></td><td class="teamtxt">${esc(p.teams?.name||'-')}</td><td>${esc(p.role||'-')}</td><td>${p.birth_year||'-'}</td><td>${esc(p.foot||'-')}</td><td>${age(p.birth_year)}</td><td>${esc(p.nationality||'-')}</td><td><button class="action-btn" onclick="editPlayer('${p.id}')">MODIFICA</button></td></tr>`}
function renderDashboard(){$('totalPlayers').textContent=players.length;$('totalTeams').textContent=teams.length;$('totalNations').textContent=new Set(players.map(p=>p.nationality).filter(Boolean)).size;$('totalAnalysis').textContent=players.length;const c={};players.forEach(p=>c[p.team_id]=(c[p.team_id]||0)+1);$('tbody').innerHTML=players.filter(matches).slice(0,12).map(row).join('')||'<tr><td colspan="8" style="text-align:center;padding:28px;color:#777">Nessun giocatore trovato</td></tr>'}
function sortedPlayers(){const q=norm($('playersSearch')?.value||'');let out=players.filter(p=>!q||norm([p.first_name,p.last_name,p.teams?.name,p.role,p.nationality,...tags(p.strengths),...tags(p.weaknesses)].join(' ')).includes(q)),m=$('playerSort')?.value||'alphabetical',rr={DIFENSORE:1,CENTROCAMPISTA:2,ATTACCANTE:3};out.sort((a,b)=>m==='age'?age(a.birth_year)-age(b.birth_year)||a.last_name.localeCompare(b.last_name):m==='foot'?String(a.foot).localeCompare(String(b.foot))||a.last_name.localeCompare(b.last_name):m==='role'?(rr[String(a.role).toUpperCase()]||9)-(rr[String(b.role).toUpperCase()]||9)||a.last_name.localeCompare(b.last_name):m==='nationality'?String(a.nationality||'').localeCompare(String(b.nationality||''))||a.last_name.localeCompare(b.last_name):`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));return out}
function renderPlayersPage(){$('playerGrid').innerHTML=sortedPlayers().map(p=>`<article class="player-card"><div class="player-card-head"><div class="pface">${esc(initials(p))}</div><div><h3>${esc(p.last_name)} ${esc(p.first_name)}</h3><div class="sub">${esc(p.teams?.name||'-')} · ${esc(p.role||'-')} · ${age(p.birth_year)} anni · ${esc(p.foot||'-')}</div></div></div><div class="chips">${tags(p.strengths).slice(0,4).map(s=>`<span class="chip">${esc(s)}</span>`).join('')}</div><div class="player-card-actions"><button class="secondary" onclick="editPlayer('${p.id}')">MODIFICA</button><button class="secondary" onclick="deletePlayer('${p.id}')">ELIMINA</button></div></article>`).join('')||'<div style="padding:30px;color:#777">Nessun giocatore.</div>'}
function renderTeamsPage(){const c={};players.forEach(p=>c[p.team_id]=(c[p.team_id]||0)+1);$('teamsGrid').innerHTML=teams.map(t=>`<article class="team-card"><h3>${esc(t.name)}</h3><p>${esc(t.country||'')} ${t.competition?'· '+esc(t.competition):''}</p><div class="bigstat">${c[t.id]||0}</div><p>giocatori archiviati</p><button class="secondary" onclick="openTeamPlayers('${t.id}')">VEDI GIOCATORI</button></article>`).join('')}
function renderStats(){const r={DIFENSORE:0,CENTROCAMPISTA:0,ATTACCANTE:0};players.forEach(p=>{const x=String(p.role||'').toUpperCase();if(x in r)r[x]++});$('statsGrid').innerHTML=[['GIOCATORI',players.length],['SQUADRE',teams.length],['NAZIONALITÀ',new Set(players.map(p=>p.nationality).filter(Boolean)).size],['DIFENSORI',r.DIFENSORE],['CENTROCAMPISTI',r.CENTROCAMPISTA],['ATTACCANTI',r.ATTACCANTE]].map(([l,v])=>`<div class="stat-card"><h3>${l}</h3><div class="bigstat">${v}</div></div>`).join('')}
function showView(n){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('view-'+n)?.classList.add('active');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===n));if(n==='players')renderPlayersPage();if(n==='teams')renderTeamsPage();if(n==='stats')renderStats();$('sidebar').classList.remove('mobile-open');scrollTo({top:0,behavior:'smooth'})}document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showView(b.dataset.go));['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',renderDashboard));$('searchBtn').onclick=renderDashboard;$('filterBtn').onclick=renderDashboard;$('resetBtn').onclick=()=>{['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).value='');renderDashboard()};$('playersSearch').oninput=renderPlayersPage;$('playerSort').onchange=renderPlayersPage;
function openModal(id){$(id).classList.add('open')}function closeModal(id){$(id).classList.remove('open')}document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));['importCardBtn','playersImportBtn','settingsImportBtn'].forEach(id=>$(id).onclick=()=>{resetImport();openModal('importModal')});$('manualTeamBtn').onclick=()=>openModal('teamModal');
$('teamForm').onsubmit=async e=>{e.preventDefault();if(!db)return;const{error}=await db.from('teams').insert({name:$('teamName').value.trim(),country:$('teamCountry').value.trim(),competition:$('teamCompetition').value.trim()});if(error)return alert(error.message);$('teamForm').reset();closeModal('teamModal');await loadAll()};
function normalizeRole(v){const n=norm(v);if(n.includes('dif')||n.includes('terz')||n.includes('bracc'))return'DIFENSORE';if(n.includes('centr')||n.includes('mezz')||n.includes('med')||n.includes('trequart'))return'CENTROCAMPISTA';return'ATTACCANTE'}
window.editPlayer=id=>{const p=players.find(x=>String(x.id)===String(id));if(!p)return;$('playerId').value=p.id;$('firstName').value=p.first_name||'';$('lastName').value=p.last_name||'';$('teamId').value=p.team_id||'';$('number').value=p.number??'';$('role').value=normalizeRole(p.role);$('position').value=p.position||'';$('height').value=p.height??'';$('foot').value=p.foot==='SX'?'SX':'DX';$('birthYear').value=p.birth_year??'';$('nationality').value=resolveNationality(p.nationality||'');$('strengths').value=tags(p.strengths).join(', ');$('weaknesses').value=tags(p.weaknesses).join(', ');$('notes').value=p.notes||'';openModal('playerModal')};$('playerForm').onsubmit=async e=>{e.preventDefault();const p={first_name:upper($('firstName').value),last_name:upper($('lastName').value),team_id:$('teamId').value,number:$('number').value?+$('number').value:null,role:upper($('role').value),position:upper($('position').value),height:$('height').value?+$('height').value:null,foot:$('foot').value,birth_year:$('birthYear').value?+$('birthYear').value:null,nationality:resolveNationality($('nationality').value),strengths:$('strengths').value.split(',').map(upper).filter(Boolean),weaknesses:$('weaknesses').value.split(',').map(upper).filter(Boolean),notes:upper($('notes').value),updated_at:new Date().toISOString()};const{error}=await db.from('players').update(p).eq('id',$('playerId').value);if(error)return alert(error.message);closeModal('playerModal');await loadAll()};window.deletePlayer=async id=>{if(!confirm('Eliminare questo giocatore?'))return;const{error}=await db.from('players').delete().eq('id',id);if(error)return alert(error.message);await loadAll()};window.openTeamPlayers=id=>{showView('players');const t=teams.find(x=>String(x.id)===String(id));if(t)$('playersSearch').value=t.name;renderPlayersPage()};
$('cardFile').onchange=e=>selectFiles(Array.from(e.target.files||[]));
$('dropzone').ondragover=e=>e.preventDefault();
$('dropzone').ondrop=e=>{e.preventDefault();selectFiles(Array.from(e.dataTransfer.files||[]))};

function selectFiles(files){
  const good=(files||[]).filter(f=>f&&f.type&&f.type.startsWith('image/'));
  if(!good.length)return;
  selectedFiles=good;
  batchMode=good.length>1;
  batchResults=[];
  currentBatchIndex=0;

  if(batchMode){
    selectedFile=good[0];
    $('cardPreview').src=URL.createObjectURL(selectedFile);
    $('cardPreview').classList.remove('hidden');
    $('processCardBtn').disabled=false;
    $('processCardBtn').textContent=`ELABORA ${good.length} CARD`;
    renderBatchQueueSimple();
  }else{
    selectFile(good[0]);
  }
}

function renderBatchQueueSimple(){
  if(!$('batchQueue'))return;
  $('batchQueue').classList.toggle('hidden',!batchMode);
  if(!batchMode)return;
  $('batchCounter').textContent=`${selectedFiles.length} CARD`;
  $('batchList').innerHTML=selectedFiles.map((f,i)=>`
    <div class="batch-item ${i===currentBatchIndex?'active':''}">
      <img class="batch-thumb" src="${URL.createObjectURL(f)}" alt="">
      <div class="batch-name">${esc(f.name)}</div>
      <div class="batch-status">${batchResults[i]?.status==='done'?'LETTA':batchResults[i]?.status==='error'?'ERRORE':'PRONTA'}</div>
    </div>`).join('');
}

function captureImportForm(){
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

function saveCurrentReviewToBatch(){
  if(!batchMode||!batchResults[currentBatchIndex])return;
  batchResults[currentBatchIndex].parsed=captureImportForm();
}

function renderCardTabs(){
  if(!$('cardTabsWrap')||!$('cardTabs'))return;
  $('cardTabsWrap').classList.toggle('hidden',!batchMode);
  if(!batchMode)return;
  $('cardTabs').innerHTML=batchResults.map((item,i)=>{
    const p=item?.parsed||{};
    const label=((p.last||'')+' '+(p.first||'')).trim()||`CARD ${i+1}`;
    const cls=item?.status==='archived'?'archived':item?.status==='error'?'error':'';
    const state=item?.status==='archived'?'✓':item?.status==='error'?'!':'';
    return `<button type="button" class="card-tab ${i===currentBatchIndex?'active':''} ${cls}" data-card-tab="${i}">
      <span class="card-tab-number">${i+1}</span>
      <span class="card-tab-name">${esc(label)}</span>
      <span class="card-tab-state">${state}</span>
    </button>`;
  }).join('');
  document.querySelectorAll('[data-card-tab]').forEach(tab=>{
    tab.onclick=()=>{
      saveCurrentReviewToBatch();
      const i=Number(tab.dataset.cardTab);
      if(batchResults[i]?.parsed){
        currentBatchIndex=i;
        fillImport(batchResults[i].parsed);
        renderCardTabs();
      }
    };
  });
}

function showBatchReview(i){
  if(!batchMode||!batchResults[i]?.parsed)return;
  currentBatchIndex=i;
  fillImport(batchResults[i].parsed);
  renderCardTabs();
  renderBatchQueueSimple();
}

async function readCardFileExact(file,index,total){
  let worker=null;
  try{
    const img=await loadImage(file);
    worker=await Tesseract.createWorker('eng',1,{
      logger:m=>{
        if(m.status==='recognizing text'){
          const pct=Math.round((m.progress||0)*100);
          $('progressText').textContent=`CARD ${index+1}/${total} · LETTURA ${pct}%`;
          $('progressFill').style.width=Math.round(((index+(m.progress||0))/total)*100)+'%';
        }
      }
    });
    const keys=['role','first','last','team','number','height','foot','year','strengths','weaknesses'];
    const raw={};
    for(const key of keys) raw[key]=await readRegion(worker,img,key);

    return {
      first:upper(cleanFieldText(raw.first)),
      last:upper(cleanFieldText(raw.last)),
      team:upper(cleanFieldText(raw.team)),
      number:cleanDigits(raw.number).slice(0,2),
      role:upper(normalizeCardRole(raw.role)),
      position:'',
      height:(cleanDigits(raw.height).match(/1[5-9]\d|2[0-1]\d/)||[''])[0],
      foot:/SX/i.test(raw.foot)?'SX':'DX',
      year:(cleanDigits(raw.year).match(/19\d{2}|20\d{2}/)||[''])[0],
      nationality:resolveNationality(detectFlagNationality(img)),
      strengths:cleanMulti(raw.strengths).split('\n').map(cleanFieldText).map(upper).filter(Boolean),
      weaknesses:cleanMulti(raw.weaknesses).split('\n').map(cleanFieldText).map(upper).filter(Boolean)
    };
  }finally{
    if(worker)try{await worker.terminate()}catch(_){}
  }
}

async function processBatchCards(){
  if(!selectedFiles.length)return;
  $('ocrProgress').classList.remove('hidden');
  $('processCardBtn').disabled=true;
  batchResults=new Array(selectedFiles.length);

  for(let i=0;i<selectedFiles.length;i++){
    currentBatchIndex=i;
    batchResults[i]={status:'processing',parsed:null};
    renderBatchQueueSimple();
    try{
      const parsed=await readCardFileExact(selectedFiles[i],i,selectedFiles.length);
      batchResults[i]={status:'done',parsed};
    }catch(err){
      console.error(err);
      batchResults[i]={status:'error',parsed:null,error:err?.message||String(err)};
    }
  }

  const first=batchResults.findIndex(x=>x?.parsed);
  $('processCardBtn').disabled=false;
  if(first<0){
    alert('NON È STATO POSSIBILE LEGGERE NESSUNA CARD.');
    return;
  }
  $('uploadStage').classList.add('hidden');
  $('importReview').classList.remove('hidden');
  showBatchReview(first);
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

function selectFile(f){
 if(!f||!f.type.startsWith('image/'))return;
 selectedFile=f;
 $('cardPreview').src=URL.createObjectURL(f);
 $('cardPreview').classList.remove('hidden');
 $('processCardBtn').disabled=false;
}
function resetImport(){
 selectedFiles=[];batchResults=[];currentBatchIndex=0;batchMode=false;
 if($('cardTabsWrap'))$('cardTabsWrap').classList.add('hidden');
 selectedFiles=[];batchResults=[];currentBatchIndex=0;batchMode=false;
 if($('batchQueue'))$('batchQueue').classList.add('hidden');
 
 
 if($('archivePlayerBtn'))$('archivePlayerBtn').textContent='ARCHIVIA GIOCATORE';selectedFile=null;$('cardFile').value='';$('cardPreview').classList.add('hidden');$('processCardBtn').disabled=true;$('ocrProgress').classList.add('hidden');$('importReview').classList.add('hidden');$('uploadStage').classList.remove('hidden');$('progressFill').style.width='0%'}
$('restartImportBtn').onclick=()=>{$('importReview').classList.add('hidden');$('uploadStage').classList.remove('hidden')};
$('processCardBtn').onclick=processCard;

async function importDashboardFiles(files){
 const good=(files||[]).filter(f=>f&&f.type&&f.type.startsWith('image/'));
 if(!good.length)return;
 resetImport();openModal('importModal');selectFiles(good);
 await new Promise(r=>setTimeout(r,80));processCard();
}
const dashboardDrop=$('dashboardImportBtn');
dashboardDrop.addEventListener('dragenter',e=>{e.preventDefault();dashboardDrop.classList.add('drag-active')});
dashboardDrop.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';dashboardDrop.classList.add('drag-active')});
dashboardDrop.addEventListener('dragleave',()=>dashboardDrop.classList.remove('drag-active'));
dashboardDrop.addEventListener('drop',e=>{e.preventDefault();dashboardDrop.classList.remove('drag-active');importDashboardFiles(Array.from(e.dataTransfer.files||[]))});
dashboardDrop.addEventListener('click',()=>{const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>importDashboardFile(input.files?.[0]);input.click()});


/*
  CARD READER V3
  La card ha un layout fisso. Non proviamo più a capire il testo come una frase intera:
  leggiamo ogni area separatamente, esattamente dove il dato è stampato.
*/
const CARD_REGIONS={
 // Coordinate calibrate sul template 2048×1149, espresse in proporzione.
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
async function processCard(){
 if(batchMode){return processBatchCards();}
 if(!selectedFile)return;
 $('ocrProgress').classList.remove('hidden');
 $('processCardBtn').disabled=true;
 $('progressFill').style.width='3%';
 $('progressText').textContent='AVVIO LETTORE...';

 let worker=null;
 try{
   const img=await loadImage(selectedFile);

   $('progressText').textContent='CARICAMENTO MOTORE OCR...';
   $('progressFill').style.width='8%';

   worker=await Tesseract.createWorker('eng',1,{
     logger:m=>{
       if(m.status==='loading tesseract core') $('progressText').textContent='CARICAMENTO LETTORE...';
       else if(m.status==='initializing tesseract') $('progressText').textContent='INIZIALIZZAZIONE...';
       else if(m.status==='loading language traineddata') $('progressText').textContent='CARICAMENTO MODELLO...';
       else if(m.status==='initializing api') $('progressText').textContent='PREPARAZIONE LETTURA...';
     }
   });

   const keys=['role','first','last','team','number','height','foot','year','strengths','weaknesses'];
   const raw={};

   for(let i=0;i<keys.length;i++){
     const key=keys[i];
     $('progressText').textContent='LETTURA '+key.toUpperCase()+'...';
     $('progressFill').style.width=(15+Math.round((i/keys.length)*75))+'%';
     raw[key]=await readRegion(worker,img,key);
   }

   const parsed={
     first:cleanFieldText(raw.first),
     last:cleanFieldText(raw.last),
     team:cleanFieldText(raw.team),
     number:cleanDigits(raw.number).slice(0,2),
     role:normalizeCardRole(raw.role),
     position:'',
     height:(cleanDigits(raw.height).match(/1[5-9]\d|2[0-1]\d/)||[''])[0],
     foot:/SX/i.test(raw.foot)?'SX':'DX',
     year:(cleanDigits(raw.year).match(/19\d{2}|20\d{2}/)||[''])[0],
     nationality:detectFlagNationality(img),
     strengths:cleanMulti(raw.strengths).split('\n').map(cleanFieldText).filter(Boolean),
     weaknesses:cleanMulti(raw.weaknesses).split('\n').map(cleanFieldText).filter(Boolean)
   };

   $('progressFill').style.width='100%';
   $('progressText').textContent='LETTURA COMPLETATA';
   fillImport(parsed);

   setTimeout(()=>{
     $('uploadStage').classList.add('hidden');
     $('importReview').classList.remove('hidden');
   },120);

 }catch(err){
   console.error(err);
   $('progressText').textContent='ERRORE LETTURA';
   alert('Errore durante la lettura della card: '+(err?.message||err));
 }finally{
   if(worker){
     try{await worker.terminate()}catch(_){}
   }
   $('processCardBtn').disabled=false;
 }
}
function fillImport(p){$('iFirstName').value=upper(p.first);$('iLastName').value=upper(p.last);$('iTeam').value=upper(p.team);$('iNumber').value=p.number||'';$('iRole').value=['DIFENSORE','CENTROCAMPISTA','ATTACCANTE'].includes(p.role)?p.role:'ATTACCANTE';$('iPosition').value='';$('iHeight').value=p.height||'';$('iFoot').value=p.foot==='SX'?'SX':'DX';$('iBirthYear').value=p.year||'';$('iNationality').value=resolveNationality(p.nationality||'');$('iStrengths').value=(p.strengths||[]).map(upper).join(', ');$('iWeaknesses').value=(p.weaknesses||[]).map(upper).join(', ')}
async function ensureWriteSession(){
 if(!db)throw new Error('Supabase non configurato.');
 const {data,error}=await db.auth.getSession();
 if(error)throw error;
 if(!data.session)throw new Error('Sessione scaduta. Effettua nuovamente il login.');
 currentSession=data.session;
 return data.session;
}
async function archiveImportedPlayer(){
 if(batchMode){
   saveCurrentReviewToBatch();
   const item=batchResults[currentBatchIndex];
   if(!item?.parsed)return alert('Dati card non disponibili.');
   const btn=$('archivePlayerBtn');const old=btn.textContent;
   btn.disabled=true;btn.textContent='ARCHIVIAZIONE...';
   try{
     await archiveParsedPlayer(item.parsed);
     item.status='archived';
     renderCardTabs();
     const next=batchResults.findIndex((x,i)=>i>currentBatchIndex&&x?.parsed&&x.status!=='archived');
     if(next>=0){
       showBatchReview(next);
     }else{
       await loadAll();
       closeModal('importModal');
       resetImport();
       showView('players');
       alert('CARD ARCHIVIATE.');
     }
   }catch(err){
     console.error(err);alert(err?.message||'Errore durante l’archiviazione.');
   }finally{
     btn.disabled=false;btn.textContent=old;
   }
   return;
 }

 if(!db){alert('Supabase non configurato.');return;}
 const btn=$('archivePlayerBtn') || $('importReview').querySelector('button:last-child');
 const oldText=btn ? btn.textContent : 'ARCHIVIA GIOCATORE';
 if(btn){btn.disabled=true;btn.textContent='ARCHIVIAZIONE...';}

 try{
   await ensureWriteSession();

   const teamName=upper($('iTeam').value);
   if(!teamName)throw new Error('Il nome della squadra è obbligatorio.');

   let team=teams.find(t=>norm(t.name)===norm(teamName));

   if(!team){
     const {data,error}=await db
       .from('teams')
       .insert({name:teamName,country:'',competition:''})
       .select()
       .single();

     if(error)throw new Error('Errore creazione squadra: '+error.message);
     team=data;
     teams.push(team);
   }

   const payload={
     first_name:upper($('iFirstName').value),
     last_name:upper($('iLastName').value),
     team_id:team.id,
     number:$('iNumber').value ? Number($('iNumber').value) : null,
     role:upper($('iRole').value),
     position:upper($('iPosition').value),
     height:$('iHeight').value ? Number($('iHeight').value) : null,
     foot:$('iFoot').value,
     birth_year:$('iBirthYear').value ? Number($('iBirthYear').value) : null,
     nationality:resolveNationality($('iNationality').value),
     strengths:$('iStrengths').value.split(',').map(upper).filter(Boolean),
     weaknesses:$('iWeaknesses').value.split(',').map(upper).filter(Boolean),
     notes:'Importato automaticamente da card',
     updated_at:new Date().toISOString()
   };

   if(!payload.first_name || !payload.last_name)
     throw new Error('Nome e cognome sono obbligatori.');

   const {data:created,error}=await db
     .from('players')
     .insert(payload)
     .select('*, teams(name)')
     .single();

   if(error)throw new Error('Errore salvataggio giocatore: '+error.message);

   if(created) players.unshift(created);

   closeModal('importModal');
   resetImport();
   await loadAll();
   showView('players');
   alert('GIOCATORE ARCHIVIATO CORRETTAMENTE.');

 }catch(err){
   console.error('Archive error:',err);
   alert(err?.message || 'Errore durante l’archiviazione.');
 }finally{
   if(btn){btn.disabled=false;btn.textContent=oldText;}
 }
}



$('clearBatchBtn')?.addEventListener('click',resetImport);



$('importReview').addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();
 if(batchMode){saveCurrentReviewToBatch();}await archiveImportedPlayer();});populateCountrySelects();

$('loginForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  e.stopPropagation();

  const btn=$('loginBtn');
  const email=$('loginEmail')?.value?.trim()||'';
  const password=$('loginPassword')?.value||'';

  setLoginError('');
  if(btn){btn.disabled=true;btn.textContent='ACCESSO...';}

  try{
    const session=await loginWithPassword(email,password);
    hideLogin(session);
    if($('loginPassword')) $('loginPassword').value='';
    await loadAll();
  }catch(err){
    console.error('Login error:',err);
    showLogin(err?.message||'Impossibile effettuare l’accesso.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='ACCEDI';}
  }
});
$('togglePassword')?.addEventListener('click',()=>{
  const input=$('loginPassword');
  if(!input)return;
  const visible=input.type==='text';
  input.type=visible?'password':'text';
  $('togglePassword').textContent=visible?'MOSTRA':'NASCONDI';
});


$('logoutBtn')?.addEventListener('click',logout);

document.addEventListener('input',e=>{
  const el=e.target;
  if(!el?.closest?.('#playerModal,#importModal,#teamModal'))return;
  if(!['INPUT','TEXTAREA'].includes(el.tagName))return;
  if(['email','password','file'].includes(el.type))return;
  const a=el.selectionStart,b=el.selectionEnd;
  el.value=el.value.toUpperCase();
  try{el.setSelectionRange(a,b)}catch(_){}
});

initializeAuth().catch(e=>{console.error(e);showLogin(e.message)});