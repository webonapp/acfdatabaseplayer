
const $ = id => document.getElementById(id);
const configured = window.APP_CONFIG &&
  window.APP_CONFIG.SUPABASE_URL &&
  !window.APP_CONFIG.SUPABASE_URL.includes("INSERISCI_QUI") &&
  window.APP_CONFIG.SUPABASE_PUBLISHABLE_KEY &&
  !window.APP_CONFIG.SUPABASE_PUBLISHABLE_KEY.includes("INSERISCI_QUI");

let db = null, teams = [], players = [];

if (configured) {
  db = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_PUBLISHABLE_KEY);
} else {
  $('setupBanner').classList.remove('hidden');
}

function age(y){
  if(!y) return '';
  const d=new Date(), birthday=new Date(d.getFullYear(),2,1);
  return d.getFullYear()-Number(y)-(d<birthday?1:0);
}
function tags(v){ return Array.isArray(v) ? v : []; }
function initials(p){ return `${(p.first_name||'')[0]||''}${(p.last_name||'')[0]||''}`; }

async function loadAll(){
  if(!db) return;
  const {data:t,error:te}=await db.from('teams').select('*').order('name');
  if(te) throw te;
  teams=t||[];

  const {data:p,error:pe}=await db.from('players').select('*, teams(name)').order('updated_at',{ascending:false});
  if(pe) throw pe;
  players=p||[];

  populateFilters();
  renderTeams();
  renderPlayers();
  renderStats();
}
function renderStats(){
  $('totalPlayers').textContent=players.length;
  $('totalTeams').textContent=teams.length;
  $('totalNations').textContent=new Set(players.map(p=>p.nationality).filter(Boolean)).size;
  $('totalAnalysis').textContent=players.length;
}
function populateFilters(){
  $('fTeam').innerHTML='<option value="">Tutte</option>'+teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  $('teamId').innerHTML=teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  preserve('fRole',[...new Set(players.map(p=>p.role).filter(Boolean))].sort(),'Tutti');
  preserve('fNation',[...new Set(players.map(p=>p.nationality).filter(Boolean))].sort(),'Tutte');
  preserve('fYear',[...new Set(players.map(p=>p.birth_year).filter(Boolean))].sort((a,b)=>b-a),'Tutti');
}
function preserve(id,arr,label){
  const el=$(id),v=el.value;
  el.innerHTML=`<option value="">${label}</option>`+arr.map(x=>`<option>${x}</option>`).join('');
  el.value=v;
}
function renderTeams(){
  const counts={}; players.forEach(p=>counts[p.team_id]=(counts[p.team_id]||0)+1);
  $('teamList').innerHTML=teams
    .map(t=>({...t,count:counts[t.id]||0}))
    .sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name))
    .slice(0,6)
    .map(t=>`<div class="team-row"><div class="team-name">${t.name}</div><div class="team-count">${t.count}</div></div>`).join('');
}
function matches(p){
  const q=($('q').value||'').trim().toLowerCase();
  const team=$('fTeam').value, role=$('fRole').value, foot=$('fFoot').value, nation=$('fNation').value, year=$('fYear').value;
  const hay=[
    p.first_name,p.last_name,p.teams?.name,p.role,p.position,p.foot,p.birth_year,p.nationality,
    ...tags(p.strengths),...tags(p.weaknesses),p.notes
  ].join(' ').toLowerCase();
  return (!q||hay.includes(q)) &&
    (!team||String(p.team_id)===team) &&
    (!role||p.role===role) &&
    (!foot||p.foot===foot) &&
    (!nation||p.nationality===nation) &&
    (!year||String(p.birth_year)===year);
}
function renderPlayers(){
  const out=players.filter(matches);
  $('tbody').innerHTML=out.map(p=>`<tr>
    <td><div class="playercell"><div class="pface">${initials(p)}</div><span class="num">${p.number ?? '-'}</span><span class="playername">${p.first_name} ${p.last_name}</span></div></td>
    <td class="teamtxt">${p.teams?.name||'-'}</td><td>${p.role||'-'}</td><td>${p.birth_year||'-'}</td><td>${p.foot||'-'}</td>
    <td>${age(p.birth_year)}</td><td>${p.nationality||'-'}</td>
    <td><button class="action-btn" onclick="editPlayer('${p.id}')">MODIFICA</button> <button class="action-btn" onclick="deletePlayer('${p.id}')">ELIMINA</button></td>
  </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:28px;color:#777">Nessun giocatore trovato</td></tr>';
}
function openModal(id){$(id).classList.add('open')}
function closeModal(id){$(id).classList.remove('open')}
function resetPlayerForm(){$('playerForm').reset();$('playerId').value='';$('modalTitle').textContent='NUOVO GIOCATORE'}

$('newPlayerBtn').onclick=()=>{resetPlayerForm();openModal('playerModal')};
$('newTeamBtn').onclick=()=>openModal('teamModal');
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',renderPlayers));
$('searchBtn').onclick=renderPlayers;$('filterBtn').onclick=renderPlayers;
$('resetBtn').onclick=()=>{['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).value='');renderPlayers()};

$('teamForm').onsubmit=async e=>{
  e.preventDefault(); if(!db)return;
  const {error}=await db.from('teams').insert({
    name:$('teamName').value.trim(),
    country:$('teamCountry').value.trim(),
    competition:$('teamCompetition').value.trim()
  });
  if(error)return alert(error.message);
  $('teamForm').reset();closeModal('teamModal');await loadAll();
};

$('playerForm').onsubmit=async e=>{
  e.preventDefault(); if(!db)return;
  const payload={
    first_name:$('firstName').value.trim(),last_name:$('lastName').value.trim(),team_id:$('teamId').value,
    number:$('number').value?Number($('number').value):null,role:$('role').value.trim(),position:$('position').value.trim(),
    height:$('height').value?Number($('height').value):null,foot:$('foot').value,
    birth_year:$('birthYear').value?Number($('birthYear').value):null,nationality:$('nationality').value.trim(),
    strengths:$('strengths').value.split(',').map(x=>x.trim()).filter(Boolean),
    weaknesses:$('weaknesses').value.split(',').map(x=>x.trim()).filter(Boolean),notes:$('notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  const id=$('playerId').value;
  const query=id ? db.from('players').update(payload).eq('id',id) : db.from('players').insert(payload);
  const {error}=await query;
  if(error)return alert(error.message);
  closeModal('playerModal');await loadAll();
};

window.editPlayer=id=>{
  const p=players.find(x=>String(x.id)===String(id));if(!p)return;
  $('playerId').value=p.id;$('modalTitle').textContent='MODIFICA GIOCATORE';
  $('firstName').value=p.first_name||'';$('lastName').value=p.last_name||'';$('teamId').value=p.team_id||'';
  $('number').value=p.number??'';$('role').value=p.role||'';$('position').value=p.position||'';$('height').value=p.height??'';
  $('foot').value=p.foot||'DX';$('birthYear').value=p.birth_year??'';$('nationality').value=p.nationality||'';
  $('strengths').value=tags(p.strengths).join(', ');$('weaknesses').value=tags(p.weaknesses).join(', ');$('notes').value=p.notes||'';
  openModal('playerModal');
};
window.deletePlayer=async id=>{
  if(!db||!confirm('Eliminare questo giocatore?'))return;
  const {error}=await db.from('players').delete().eq('id',id);
  if(error)return alert(error.message);
  await loadAll();
};

if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
loadAll().catch(e=>alert(e.message));
