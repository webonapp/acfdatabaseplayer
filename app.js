const $=id=>document.getElementById(id);const cfg=window.APP_CONFIG||{};const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes('INSERISCI_QUI')&&cfg.SUPABASE_PUBLISHABLE_KEY&&!cfg.SUPABASE_PUBLISHABLE_KEY.includes('INSERISCI_QUI');let db=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY):null,teams=[],players=[],selectedFile=null;if(!configured)$('setupBanner').classList.remove('hidden');
function age(y){if(!y)return'';const d=new Date(),b=new Date(d.getFullYear(),2,1);return d.getFullYear()-Number(y)-(d<b?1:0)}function tags(v){return Array.isArray(v)?v:[]}function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function initials(p){return`${(p.first_name||'')[0]||''}${(p.last_name||'')[0]||''}`}
async function loadAll(){if(!db)return;const{data:t,error:te}=await db.from('teams').select('*').order('name');if(te)throw te;teams=t||[];const{data:p,error:pe}=await db.from('players').select('*, teams(name)').order('updated_at',{ascending:false});if(pe)throw pe;players=p||[];populateFilters();renderDashboard();renderPlayersPage();renderTeamsPage();renderStats()}
function preserve(id,a,l){const e=$(id),v=e.value;e.innerHTML=`<option value="">${l}</option>`+a.map(x=>`<option>${esc(x)}</option>`).join('');e.value=v}function populateFilters(){$('fTeam').innerHTML='<option value="">Tutte</option>'+teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');$('teamId').innerHTML=teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');preserve('fNation',[...new Set(players.map(p=>p.nationality).filter(Boolean))].sort(),'Tutte');preserve('fYear',[...new Set(players.map(p=>p.birth_year).filter(Boolean))].sort((a,b)=>b-a),'Tutti')}
function matches(p){const q=norm($('q').value),team=$('fTeam').value,role=$('fRole').value,foot=$('fFoot').value,n=$('fNation').value,y=$('fYear').value,hay=norm([p.first_name,p.last_name,p.teams?.name,p.role,p.position,p.foot,p.birth_year,p.nationality,...tags(p.strengths),...tags(p.weaknesses),p.notes].join(' '));return(!q||hay.includes(q))&&(!team||String(p.team_id)===team)&&(!role||norm(p.role)===norm(role))&&(!foot||p.foot===foot)&&(!n||p.nationality===n)&&(!y||String(p.birth_year)===y)}
function row(p){return`<tr><td><div class="playercell"><div class="pface">${esc(initials(p))}</div><span class="num">${p.number??'-'}</span><span class="playername">${esc(p.first_name)} ${esc(p.last_name)}</span></div></td><td class="teamtxt">${esc(p.teams?.name||'-')}</td><td>${esc(p.role||'-')}</td><td>${p.birth_year||'-'}</td><td>${esc(p.foot||'-')}</td><td>${age(p.birth_year)}</td><td>${esc(p.nationality||'-')}</td><td><button class="action-btn" onclick="editPlayer('${p.id}')">MODIFICA</button></td></tr>`}
function renderDashboard(){$('totalPlayers').textContent=players.length;$('totalTeams').textContent=teams.length;$('totalNations').textContent=new Set(players.map(p=>p.nationality).filter(Boolean)).size;$('totalAnalysis').textContent=players.length;const c={};players.forEach(p=>c[p.team_id]=(c[p.team_id]||0)+1);$('teamList').innerHTML=teams.map(t=>({...t,count:c[t.id]||0})).sort((a,b)=>b.count-a.count).slice(0,6).map(t=>`<div class="team-row"><div class="team-name">${esc(t.name)}</div><div class="team-count">${t.count}</div></div>`).join('');$('tbody').innerHTML=players.filter(matches).slice(0,12).map(row).join('')||'<tr><td colspan="8" style="text-align:center;padding:28px;color:#777">Nessun giocatore trovato</td></tr>'}
function sortedPlayers(){const q=norm($('playersSearch')?.value||'');let out=players.filter(p=>!q||norm([p.first_name,p.last_name,p.teams?.name,p.role,p.nationality,...tags(p.strengths),...tags(p.weaknesses)].join(' ')).includes(q)),m=$('playerSort')?.value||'alphabetical',rr={DIFENSORE:1,CENTROCAMPISTA:2,ATTACCANTE:3};out.sort((a,b)=>m==='age'?age(a.birth_year)-age(b.birth_year)||a.last_name.localeCompare(b.last_name):m==='foot'?String(a.foot).localeCompare(String(b.foot))||a.last_name.localeCompare(b.last_name):m==='role'?(rr[String(a.role).toUpperCase()]||9)-(rr[String(b.role).toUpperCase()]||9)||a.last_name.localeCompare(b.last_name):m==='nationality'?String(a.nationality||'').localeCompare(String(b.nationality||''))||a.last_name.localeCompare(b.last_name):`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));return out}
function renderPlayersPage(){$('playerGrid').innerHTML=sortedPlayers().map(p=>`<article class="player-card"><div class="player-card-head"><div class="pface">${esc(initials(p))}</div><div><h3>${esc(p.last_name)} ${esc(p.first_name)}</h3><div class="sub">${esc(p.teams?.name||'-')} · ${esc(p.role||'-')} · ${age(p.birth_year)} anni · ${esc(p.foot||'-')}</div></div></div><div class="chips">${tags(p.strengths).slice(0,4).map(s=>`<span class="chip">${esc(s)}</span>`).join('')}</div><div class="player-card-actions"><button class="secondary" onclick="editPlayer('${p.id}')">MODIFICA</button><button class="secondary" onclick="deletePlayer('${p.id}')">ELIMINA</button></div></article>`).join('')||'<div style="padding:30px;color:#777">Nessun giocatore.</div>'}
function renderTeamsPage(){const c={};players.forEach(p=>c[p.team_id]=(c[p.team_id]||0)+1);$('teamsGrid').innerHTML=teams.map(t=>`<article class="team-card"><h3>${esc(t.name)}</h3><p>${esc(t.country||'')} ${t.competition?'· '+esc(t.competition):''}</p><div class="bigstat">${c[t.id]||0}</div><p>giocatori archiviati</p><button class="secondary" onclick="openTeamPlayers('${t.id}')">VEDI GIOCATORI</button></article>`).join('')}
function renderStats(){const r={DIFENSORE:0,CENTROCAMPISTA:0,ATTACCANTE:0};players.forEach(p=>{const x=String(p.role||'').toUpperCase();if(x in r)r[x]++});$('statsGrid').innerHTML=[['GIOCATORI',players.length],['SQUADRE',teams.length],['NAZIONALITÀ',new Set(players.map(p=>p.nationality).filter(Boolean)).size],['DIFENSORI',r.DIFENSORE],['CENTROCAMPISTI',r.CENTROCAMPISTA],['ATTACCANTI',r.ATTACCANTE]].map(([l,v])=>`<div class="stat-card"><h3>${l}</h3><div class="bigstat">${v}</div></div>`).join('')}
function showView(n){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('view-'+n)?.classList.add('active');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===n));if(n==='players')renderPlayersPage();if(n==='teams')renderTeamsPage();if(n==='stats')renderStats();$('sidebar').classList.remove('mobile-open');scrollTo({top:0,behavior:'smooth'})}document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showView(b.dataset.go));$('menuBtn').onclick=()=>$('sidebar').classList.toggle('mobile-open');['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',renderDashboard));$('searchBtn').onclick=renderDashboard;$('filterBtn').onclick=renderDashboard;$('resetBtn').onclick=()=>{['q','fTeam','fRole','fFoot','fNation','fYear'].forEach(id=>$(id).value='');renderDashboard()};$('playersSearch').oninput=renderPlayersPage;$('playerSort').onchange=renderPlayersPage;
function openModal(id){$(id).classList.add('open')}function closeModal(id){$(id).classList.remove('open')}document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));['importCardBtn','playersImportBtn','settingsImportBtn'].forEach(id=>$(id).onclick=()=>{resetImport();openModal('importModal')});$('manualTeamBtn').onclick=()=>openModal('teamModal');
$('teamForm').onsubmit=async e=>{e.preventDefault();if(!db)return;const{error}=await db.from('teams').insert({name:$('teamName').value.trim(),country:$('teamCountry').value.trim(),competition:$('teamCompetition').value.trim()});if(error)return alert(error.message);$('teamForm').reset();closeModal('teamModal');await loadAll()};
function normalizeRole(v){const n=norm(v);if(n.includes('dif')||n.includes('terz')||n.includes('bracc'))return'DIFENSORE';if(n.includes('centr')||n.includes('mezz')||n.includes('med')||n.includes('trequart'))return'CENTROCAMPISTA';return'ATTACCANTE'}
window.editPlayer=id=>{const p=players.find(x=>String(x.id)===String(id));if(!p)return;$('playerId').value=p.id;$('firstName').value=p.first_name||'';$('lastName').value=p.last_name||'';$('teamId').value=p.team_id||'';$('number').value=p.number??'';$('role').value=normalizeRole(p.role);$('position').value=p.position||'';$('height').value=p.height??'';$('foot').value=p.foot==='SX'?'SX':'DX';$('birthYear').value=p.birth_year??'';$('nationality').value=p.nationality||'';$('strengths').value=tags(p.strengths).join(', ');$('weaknesses').value=tags(p.weaknesses).join(', ');$('notes').value=p.notes||'';openModal('playerModal')};$('playerForm').onsubmit=async e=>{e.preventDefault();const p={first_name:$('firstName').value.trim(),last_name:$('lastName').value.trim(),team_id:$('teamId').value,number:$('number').value?+$('number').value:null,role:$('role').value,position:$('position').value.trim(),height:$('height').value?+$('height').value:null,foot:$('foot').value,birth_year:$('birthYear').value?+$('birthYear').value:null,nationality:$('nationality').value.trim(),strengths:$('strengths').value.split(',').map(x=>x.trim()).filter(Boolean),weaknesses:$('weaknesses').value.split(',').map(x=>x.trim()).filter(Boolean),notes:$('notes').value.trim(),updated_at:new Date().toISOString()};const{error}=await db.from('players').update(p).eq('id',$('playerId').value);if(error)return alert(error.message);closeModal('playerModal');await loadAll()};window.deletePlayer=async id=>{if(!confirm('Eliminare questo giocatore?'))return;const{error}=await db.from('players').delete().eq('id',id);if(error)return alert(error.message);await loadAll()};window.openTeamPlayers=id=>{showView('players');const t=teams.find(x=>String(x.id)===String(id));if(t)$('playersSearch').value=t.name;renderPlayersPage()};
$('cardFile').onchange=e=>selectFile(e.target.files?.[0]);
$('dropzone').ondragover=e=>e.preventDefault();
$('dropzone').ondrop=e=>{e.preventDefault();selectFile(e.dataTransfer.files?.[0])};
function selectFile(f){
 if(!f||!f.type.startsWith('image/'))return;
 selectedFile=f;
 $('cardPreview').src=URL.createObjectURL(f);
 $('cardPreview').classList.remove('hidden');
 $('processCardBtn').disabled=false;
}
function resetImport(){selectedFile=null;$('cardFile').value='';$('cardPreview').classList.add('hidden');$('processCardBtn').disabled=true;$('ocrProgress').classList.add('hidden');$('importReview').classList.add('hidden');$('uploadStage').classList.remove('hidden');$('progressFill').style.width='0%'}
$('restartImportBtn').onclick=()=>{$('importReview').classList.add('hidden');$('uploadStage').classList.remove('hidden')};
$('processCardBtn').onclick=processCard;

/*
  CARD READER V3
  La card ha un layout fisso. Non proviamo più a capire il testo come una frase intera:
  leggiamo ogni area separatamente, esattamente dove il dato è stampato.
*/
const CARD_REGIONS={
 role:       {x:.31,y:.018,w:.42,h:.075,psm:'7'},
 first:      {x:.045,y:.350,w:.205,h:.042,psm:'7'},
 last:       {x:.045,y:.392,w:.205,h:.052,psm:'7'},
 team:       {x:.020,y:.438,w:.235,h:.050,psm:'7'},
 number:     {x:.035,y:.500,w:.205,h:.175,psm:'7',digits:true},
 flag:       {x:.070,y:.745,w:.115,h:.150},
 height:     {x:.800,y:.095,w:.175,h:.100,psm:'7',digits:true},
 foot:       {x:.825,y:.380,w:.135,h:.100,psm:'7'},
 year:       {x:.800,y:.800,w:.170,h:.110,psm:'7',digits:true},
 strengths:  {x:.320,y:.650,w:.405,h:.155,psm:'6'},
 weaknesses: {x:.305,y:.842,w:.425,h:.105,psm:'6'}
};
function loadImage(file){return new Promise((ok,ko)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=ko;im.src=URL.createObjectURL(file)})}
function cropCanvas(img,r,scale=2.4){
 const sx=Math.round(img.naturalWidth*r.x),sy=Math.round(img.naturalHeight*r.y),sw=Math.round(img.naturalWidth*r.w),sh=Math.round(img.naturalHeight*r.h);
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
 // Aumenta il contrasto senza cambiare la geometria dei caratteri.
 const d=ctx.getImageData(0,0,c.width,c.height),a=d.data;
 for(let i=0;i<a.length;i+=4){const y=.299*a[i]+.587*a[i+1]+.114*a[i+2];let v=(y-128)*1.55+128;v=Math.max(0,Math.min(255,v));a[i]=a[i+1]=a[i+2]=v}
 ctx.putImageData(d,0,0);return c;
}
function cleanLine(t){return String(t||'').replace(/[\r\n]+/g,' ').replace(/[|]/g,'I').replace(/\s+/g,' ').trim().replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9)('’\-\. ]+$/g,'')}
function cleanLetters(t){return cleanLine(t).replace(/[^A-Za-zÀ-ÿ0-9'’\-\. ]/g,'').replace(/\s+/g,' ').trim()}
function cleanFieldText(t){const raw=cleanLetters(t).toUpperCase();const toks=raw.split(/\s+/).filter(Boolean);const filtered=toks.filter((tok,i)=>tok.length>1||toks.length===1);return filtered.join(' ').replace(/\s+/g,' ').trim()}
function cleanDigits(t){const m=String(t||'').match(/\d+/g);return m?m.join(''):''}
function cleanMulti(t){return String(t||'').split(/\n+/).map(cleanLetters).filter(x=>x.length>1&&!/^I$/.test(x)).join('\n')}
function normalizeCardRole(t){const n=norm(t);if(n.includes('difensor'))return'DIFENSORE';if(n.includes('centrocamp'))return'CENTROCAMPISTA';if(n.includes('attacc'))return'ATTACCANTE';return cleanLetters(t).toUpperCase()||'ATTACCANTE'}
async function readRegion(worker,img,key){
 const r=CARD_REGIONS[key],c=cropCanvas(img,r,key==='number'?3:2.4);
 const params={tessedit_pageseg_mode:r.psm||'7',preserve_interword_spaces:'1',user_defined_dpi:'300'};if(['first','last','team','role','foot'].includes(key))params.tessedit_char_whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÈÉÌÒÓÙÑÇ -'";else if(r.digits)params.tessedit_char_whitelist='0123456789';else params.tessedit_char_whitelist='';await worker.setParameters(params);
 const {data}=await worker.recognize(c);return data.text||'';
}
function detectFlagNationality(img){
 const r=CARD_REGIONS.flag,sx=Math.round(img.naturalWidth*r.x),sy=Math.round(img.naturalHeight*r.y),sw=Math.round(img.naturalWidth*r.w),sh=Math.round(img.naturalHeight*r.h);
 const c=document.createElement('canvas');c.width=160;c.height=160;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,sx,sy,sw,sh,0,0,160,160);const d=x.getImageData(0,0,160,160).data;
 const cls=(R,G,B)=>{if(R>190&&G>190&&B>190)return'W';if(R>120&&R>G*1.25&&R>B*1.25)return'R';if(B>95&&B>R*1.12&&B>G*1.05)return'B';if(G>85&&G>R*1.1&&G>B*1.02)return'G';if(R>140&&G>110&&B<90)return'Y';if(R<85&&G<85&&B<85)return'K';return'N'};
 const grid=Array.from({length:7},()=>Array(7).fill('N'));
 for(let gy=0;gy<7;gy++)for(let gx=0;gx<7;gx++){let cnt={R:0,W:0,B:0,G:0,Y:0,K:0,N:0};for(let yy=Math.floor((gy+.18)*160/7);yy<Math.floor((gy+.82)*160/7);yy+=2)for(let xx=Math.floor((gx+.18)*160/7);xx<Math.floor((gx+.82)*160/7);xx+=2){const i=(yy*160+xx)*4;cnt[cls(d[i],d[i+1],d[i+2])]++}grid[gy][gx]=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0]}
 const count=k=>grid.flat().filter(v=>v===k).length, row=(y,k)=>grid[y].filter(v=>v===k).length, col=(z,k)=>grid.map(r=>r[z]).filter(v=>v===k).length;
 const R=count('R'),W=count('W'),B=count('B'),G=count('G'),Y=count('Y'),K=count('K');
 // Croce nordica bianca su rosso: Danimarca. La barra verticale è spostata leggermente a sinistra.
 if(R>=10&&W>=4&&Math.max(col(2,'W'),col(3,'W'))>=4&&Math.max(row(3,'W'),row(4,'W'))>=4)return'DANIMARCA';
 // Croce rossa su bianco: Inghilterra.
 if(W>=12&&R>=4&&Math.max(col(3,'R'),col(4,'R'))>=4&&Math.max(row(3,'R'),row(4,'R'))>=4)return'INGHILTERRA';
 // Tricolori verticali.
 const left=grid.flatMap((r,i)=>r.slice(0,2)),mid=grid.flatMap(r=>r.slice(2,5)),right=grid.flatMap(r=>r.slice(5,7));
 const n=(a,k)=>a.filter(v=>v===k).length;
 if(n(left,'G')>=4&&n(mid,'W')>=5&&n(right,'R')>=4)return'ITALIA';
 if(n(left,'B')>=4&&n(mid,'W')>=5&&n(right,'R')>=4)return'FRANCIA';
 if(n(left,'K')>=3&&n(mid,'Y')>=4&&n(right,'R')>=4)return'BELGIO';
 // Tricolori orizzontali.
 const top=grid.slice(0,2).flat(),middle=grid.slice(2,5).flat(),bottom=grid.slice(5,7).flat();
 if(n(top,'R')>=5&&n(middle,'W')>=6&&n(bottom,'B')>=5)return'PAESI BASSI';
 if(n(top,'K')>=4&&n(middle,'R')>=5&&n(bottom,'Y')>=5)return'GERMANIA';
 if(n(top,'R')>=5&&n(middle,'Y')>=7&&n(bottom,'R')>=5)return'SPAGNA';
 if(n(top,'B')>=5&&n(middle,'W')>=6&&n(bottom,'R')>=5)return'RUSSIA';
 if(B>=7&&W>=7&&R>=3)return'CROAZIA';
 if(G>=9&&Y>=3&&B>=2)return'BRASILE';
 if(B>=8&&W>=7&&R<=3)return'ARGENTINA';
 return'';
}
async function processCard(){
 if(!selectedFile)return;
 $('ocrProgress').classList.remove('hidden');$('processCardBtn').disabled=true;
 const img=await fileToImage(selectedFile);
 const canvas=document.createElement('canvas');
 const scale=Math.min(1,1800/img.naturalWidth);
 canvas.width=Math.round(img.naturalWidth*scale);
 canvas.height=Math.round(img.naturalHeight*scale);
 const ctx=canvas.getContext('2d');
 ctx.drawImage(img,0,0,canvas.width,canvas.height);
 try{
   $('progressText').textContent='LETTURA STRUTTURATA DELLA CARD...';
   $('progressFill').style.width='35%';
   const parsed=await parseCardStructured(canvas);
   $('progressFill').style.width='100%';
   fillImport(parsed);
   $('uploadStage').classList.add('hidden');
   $('importReview').classList.remove('hidden');
 }catch(err){
   console.error(err);
   alert('Non sono riuscito a leggere correttamente la card. Verifica che il layout sia quello standard.');
 }finally{
   $('processCardBtn').disabled=false;
 }
}
function fillImport(p){$('iFirstName').value=p.first||'';$('iLastName').value=p.last||'';$('iTeam').value=p.team||'';$('iNumber').value=p.number||'';$('iRole').value=['DIFENSORE','CENTROCAMPISTA','ATTACCANTE'].includes(p.role)?p.role:'ATTACCANTE';$('iPosition').value='';$('iHeight').value=p.height||'';$('iFoot').value=p.foot==='SX'?'SX':'DX';$('iBirthYear').value=p.year||'';$('iNationality').value=p.nationality||'';$('iStrengths').value=(p.strengths||[]).join(', ');$('iWeaknesses').value=(p.weaknesses||[]).join(', ')}
async function ensureWriteSession(){
 const {data:{session},error:getErr}=await db.auth.getSession();if(getErr)throw getErr;if(session)return session;
 const {data,error}=await db.auth.signInAnonymously();if(error)throw new Error('ARCHIVIAZIONE BLOCCATA DA SUPABASE: abilita Authentication → Providers → Anonymous Sign-Ins, poi riprova. Dettaglio: '+error.message);return data.session;
}
async function archiveImportedPlayer(){
 if(!db)return alert('Supabase non configurato.');
 const btn=$('importReview').querySelector('button[type="submit"]');const old=btn.textContent;btn.disabled=true;btn.textContent='ARCHIVIAZIONE...';
 try{
   await ensureWriteSession();
   const teamName=$('iTeam').value.trim();if(!teamName)throw new Error('Il nome della squadra è obbligatorio.');
   let team=teams.find(t=>norm(t.name)===norm(teamName));
   if(!team){
     const {data,error}=await db.from('teams').insert({name:teamName,country:'',competition:''}).select().single();
     if(error)throw error;team=data;
   }
   const payload={first_name:$('iFirstName').value.trim(),last_name:$('iLastName').value.trim(),team_id:team.id,number:$('iNumber').value?+$('iNumber').value:null,role:$('iRole').value,position:$('iPosition').value.trim(),height:$('iHeight').value?+$('iHeight').value:null,foot:$('iFoot').value,birth_year:$('iBirthYear').value?+$('iBirthYear').value:null,nationality:$('iNationality').value.trim(),strengths:$('iStrengths').value.split(',').map(x=>x.trim()).filter(Boolean),weaknesses:$('iWeaknesses').value.split(',').map(x=>x.trim()).filter(Boolean),notes:'Importato automaticamente da card',updated_at:new Date().toISOString()};
   if(!payload.first_name||!payload.last_name)throw new Error('Nome e cognome sono obbligatori.');
   const {error}=await db.from('players').insert(payload);if(error)throw error;
   closeModal('importModal');resetImport();await loadAll();showView('players');alert('GIOCATORE ARCHIVIATO CORRETTAMENTE.');
 }catch(err){console.error(err);alert(err.message||'Errore durante l’archiviazione.');}
 finally{btn.disabled=false;btn.textContent=old;}
}
$('importReview').onsubmit=async e=>{e.preventDefault();e.stopPropagation();await archiveImportedPlayer()};loadAll().catch(e=>{console.error(e);alert(e.message)});
