'use strict';

const esc=s=>(s??'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Number(n||0).toLocaleString('ja-JP');
function norm(s){
  s=(s??'').toString().normalize('NFKC').toLowerCase().replace(/　/g,' ');
  s=s.replace(/[\s_・･]+/g,'');
  return s.replace(/[\-‐‑‒–—―〜～~!！?？,，.。'"“”‘’「」『』【】\[\]（）()<>＜＞/:：;；\\|@＠#＃$＄%％^＾&＆*＊+=＋＝]/g,'');
}
function vals(s){return (s??'').toString().split(/[,;\/／、；|\n]+/).map(x=>x.trim()).filter(Boolean)}
function categoryVals(s){return (s??'').toString().split(/[,;；|、\n]+/).map(x=>x.trim()).filter(Boolean)}
function hira(s){return (s??'').toString().replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60))}
function kanaBucket(s){const t=hira((s??'').toString().trim());if(!t)return'他';const c=t[0];const gs={あ:'あいうえおぁぃぅぇぉゔ',か:'かきくけこがぎぐげご',さ:'さしすせそざじずぜぞ',た:'たちつてとだぢづでどっ',な:'なにぬねの',は:'はひふへほばびぶべぼぱぴぷぺぽ',ま:'まみむめも',や:'やゆよゃゅょ',ら:'らりるれろ',わ:'わをんゎ'};for(const [k,v] of Object.entries(gs))if(v.includes(c))return k;return'他'}
function flagPath(lang){return ({英語:'gb',北京語:'cn',広東語:'cn',中国語:'cn',ドイツ語:'de',スウェーデン語:'se'}[lang]||'globe')+'.svg'}
function topLinkShade(hex,amount=-34){
  const m=/^#([0-9a-f]{6})$/i.exec(String(hex||''));if(!m)return '#315bc1';
  const n=parseInt(m[1],16),clamp=x=>Math.max(0,Math.min(255,x));
  const r=clamp((n>>16)+amount),g=clamp(((n>>8)&255)+amount),b=clamp((n&255)+amount);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function topCustomLinksHtml(items){
  const links=(Array.isArray(items)?items:[]).filter(x=>x&&x.url&&x.label);
  if(!links.length)return '';
  return `<div class="top-custom-grid">${links.map(x=>{
    const color=/^#[0-9a-f]{6}$/i.test(x.color||'')?x.color:'#4f8cff';
    return `<a class="category-btn top-custom-btn" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" style="background:linear-gradient(180deg,${color},${topLinkShade(color)})">${x.emoji?`<span class="category-icon">${esc(x.emoji)}</span>`:''}<span>${esc(x.label)}</span></a>`;
  }).join('')}</div>`;
}

let DATA=null;
const app=document.getElementById('app');
const state={};

function footer(){return `<div class="web-static-footer">ITSUKI Web Song Search<br><span>最終データ更新: ${esc(DATA.generated_at||'')}</span></div>`}
function topNav(){return `<div class="top nav common-user-nav"><a class="navbtn" href="#top">🏠 TOP</a></div>`}
function pageShell(inner, cls='web-static-page'){app.innerHTML=`<div class="wrap ${cls}">${inner}${footer()}</div>`;window.scrollTo(0,0)}

function songMeta(s){return [s.tie_up,s.op_ed,s.tie_up_category,s.release_year?`${s.release_year}年`:'' ].filter(Boolean).join(' / ')}
function songHref(s){return `#song/${encodeURIComponent(String(s?.id||''))}`}
function entityHref(mode,value){if(['artist','lyricist','composer','arranger'].includes(mode))return `#person/${encodeURIComponent(String(value||''))}/${encodeURIComponent(mode)}`;return `#entity/${encodeURIComponent(String(mode||''))}/${encodeURIComponent(String(value||''))}`}
function songRow(s){
  const tags=[];
  if(s.video_count>1)tags.push(`${s.video_count}動画`);
  for(const x of (s.vocal_labels||[]))tags.push(x);
  for(const x of (s.languages||[]))tags.push(x);
  return `<a class="denmoku-song-row web-song-row-link" href="${songHref(s)}"><div class="denmoku-song-main"><div class="denmoku-song-title">${esc(s.song_name||'曲名不明')}</div><div class="denmoku-song-artist">${esc(s.artists||'歌手情報なし')}</div>${songMeta(s)?`<div class="denmoku-song-meta">${esc(songMeta(s))}</div>`:''}${tags.length?`<div>${tags.map(x=>`<span class="web-chip">${esc(x)}</span>`).join('')}</div>`:''}</div><div class="web-song-count web-detail-open"><strong>›</strong>詳細</div></a>`
}
function renderSongList(target, list, empty='該当する曲がありません', limit=300){
  target.innerHTML='';
  if(!list.length){target.innerHTML=`<div class="denmoku-empty">${esc(empty)}</div>`;return}
  const shown=list.slice(0,limit);
  target.innerHTML=shown.map(songRow).join('')+(list.length>limit?`<div class="web-result-note">${nf(list.length)}曲中、先頭${nf(limit)}曲を表示しています。検索語を追加して絞り込んでください。</div>`:'');
}
function entityRows(list, clickFn){
  return list.map(x=>`<button type="button" class="denmoku-entity-row web-linklike" data-key="${esc(x.key)}"><span><strong>${esc(x.name)}</strong>${x.sub?`<small class="web-entity-sub">${esc(x.sub)}</small>`:''}</span><span class="denmoku-entity-count">${nf(x.count)}曲　›</span></button>`).join('');
}
function bindEntityClicks(root, list, fn){root.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>fn(list.find(x=>x.key===b.dataset.key)))}

function renderTop(){
  document.title='ITSUKI - 曲検索';
  pageShell(`
    <div class="home-page top-menu-page">
      <div class="top home-title"><div><div class="big">🎤 ITSUKI</div><div class="home-subtitle">曲検索</div><div class="web-top-count">${nf(DATA.song_count)}曲 / ${nf(DATA.video_count)}動画</div></div><div class="web-static-meta">Web Song Search</div></div>
      <section class="category-section top-category-section">
        <div class="top-main-grid">
          <a class="category-btn top-main-btn c-red" href="#updates"><span class="category-icon">✨</span><span>新曲・更新曲</span></a>
          <a class="category-btn top-main-btn c-orange" href="#search/person"><span class="category-icon">👤</span><span>人物検索</span></a>
          <a class="category-btn top-main-btn c-green" href="#search/title"><span class="category-icon">🎵</span><span>曲名</span></a>
          <a class="category-btn top-main-btn c-blue" href="#folder"><span class="category-icon">📁</span><span>フォルダから探す</span></a>
        </div>
        <div class="top-middle-grid">
          <a class="category-btn top-middle-btn c-pink" href="#feature/mv-pv"><span class="category-icon">🎬</span><span>MV・PV</span></a>
          <a class="category-btn top-middle-btn c-lime" href="#feature/live"><span class="category-icon">🎙️</span><span>LIVEカラオケ</span></a>
          <a class="category-btn top-middle-btn c-emerald" href="#feature/anime"><span class="category-icon">📺</span><span>アニメ・ゲーム映像</span></a>
          <a class="category-btn top-middle-btn c-sky" href="#feature/parts"><span class="category-icon">👥</span><span>パート分け</span></a>
          <a class="category-btn top-middle-btn c-rose" href="#era"><span class="category-icon">🕒</span><span>あの頃・この頃</span></a>
          <a class="category-btn top-middle-btn c-gold" href="#search/keyword"><span class="category-icon">🔎</span><span>キーワード</span></a>
          <a class="category-btn top-middle-btn c-teal" href="#tieup"><span class="category-icon">🎞️</span><span>タイアップ</span></a>
          <a class="category-btn top-middle-btn c-purple" href="#foreign"><span class="category-icon">🌐</span><span>外国曲</span></a>
          <a class="category-btn top-middle-btn c-blue" href="#all"><span class="category-icon">📚</span><span>全曲一覧</span></a>
        </div>
        ${topCustomLinksHtml(DATA.home_links)}
      </section>
    </div>`);
}

const modeLabels={person:'人物',artist:'歌手',lyricist:'作詞',composer:'作曲',arranger:'編曲',title:'曲名','tie-up':'タイアップ',keyword:'キーワード'};
const modePlaceholders={person:'人物名を入力',title:'曲名を入力','tie-up':'タイアップ名を入力',keyword:'キーワードを入力'};
const roleOrder=['artist','lyricist','composer','arranger'];
function peopleArray(){return Array.isArray(DATA.people)?DATA.people:[]}
function peopleMap(){const m=new Map();for(const p of peopleArray())m.set(norm(p.name),p);return m}
function roleCounts(p){const out={};for(const r of roleOrder)out[r]=Array.isArray(p?.roles?.[r])?p.roles[r].length:0;return out}
function personTotalCount(p){const ids=new Set();for(const r of roleOrder)for(const id of (p?.roles?.[r]||[]))ids.add(String(id));return ids.size}
function songsForIds(ids){const wanted=new Set((ids||[]).map(String));return DATA.songs.filter(s=>wanted.has(String(s.id))).sort((a,b)=>norm(a.song_name).localeCompare(norm(b.song_name),'ja'))}
function directNameMatch(name,q,mode){const n=norm(name);if(mode==='exact')return n===q;if(mode==='prefix')return n.startsWith(q);return n.includes(q)}
function ordinaryPersonReason(p,q){
  if(!p||!q)return null;
  if(norm(p.name).includes(q))return '';
  if(String(p.own_search||'').includes(q))return '';
  if(String(p.alias_search||'').includes(q))return '別名義';
  // Candidate is the group, query matched one of its members.
  if(String(p.members_for_group_search||'').includes(q))return '所属グループ';
  // Candidate is a member, query matched the group it belongs to.
  if(String(p.groups_for_member_search||'').includes(q))return '所属メンバー';
  if(String(p.group_search||'').includes(q))return '関連人物';
  if(String(p.other_search||'').includes(q))return '関連人物';
  if(String(p.relation_search||'').includes(q))return '関連人物';
  return null;
}
function combinedArtistReason(p,q,pmap){
  const reasons=[];
  for(const name of (p.combined_members||[])){
    const mp=pmap.get(norm(name));
    const r=ordinaryPersonReason(mp||{name},q);
    if(r!==null)reasons.push(r);
  }
  if(!reasons.length&&norm(p.name).includes(q))return '所属グループ';
  if(!reasons.length)return null;
  if(reasons.includes('所属メンバー')&&!reasons.some(r=>r===''||r==='別名義'||r==='所属グループ'))return '所属メンバー';
  if(reasons.some(r=>r===''||r==='別名義'))return '所属グループ';
  if(reasons.includes('所属グループ'))return '所属グループ';
  if(reasons.includes('所属メンバー'))return '所属メンバー';
  return '関連人物';
}
function personCandidateReason(p,q,matchMode,includeRelated,pmap){
  if(directNameMatch(p.name,q,matchMode))return '';
  if(matchMode==='partial'&&String(p.own_search||'').includes(q))return '';
  if(!includeRelated)return null;
  if(p.combined_artist_credit){
    const rr=combinedArtistReason(p,q,pmap);
    return rr===''?null:rr;
  }
  const rr=ordinaryPersonReason(p,q);
  return rr!==null&&rr!==''?rr:null;
}
function flattenFolderFiles(){
  const out=[],fb=DATA.folder_browser||{};
  for(const root of (fb.roots||[])){
    for(const [folder,node] of Object.entries(root.entries||{})){
      for(const f of (node.files||[])){
        const rel=[root.name,folder,f.name].filter(Boolean).join('/');
        out.push({...f,root_name:root.name,folder,rel_path:rel});
      }
    }
  }
  return out;
}
function renderFileSearchResults(target,list,hit){
  hit.textContent=String(list.length);
  if(!list.length){target.innerHTML='<div class="denmoku-empty">ファイル名・フォルダ名に一致する動画が見つかりませんでした</div>';return}
  target.innerHTML=list.slice(0,300).map(v=>{
    const song=v.song_id?DATA.songs.find(s=>String(s.id)===String(v.song_id)):null;
    const tag=song?'DB紐づけ済み':'DB未紐づけ';
    const inner=`<div class="denmoku-song-main"><div class="denmoku-song-title">${esc(v.name||'動画')}</div><div class="denmoku-song-artist">${tag}</div><div class="denmoku-song-meta">${esc(v.rel_path||'')}</div></div><div class="web-song-count web-detail-open"><strong>${song?'›':'―'}</strong>${song?'詳細':'情報'}</div>`;
    return song?`<a class="denmoku-song-row web-song-row-link" href="${songHref(song)}">${inner}</a>`:`<div class="denmoku-song-row">${inner}</div>`;
  }).join('')+(list.length>300?`<div class="web-result-note">${nf(list.length)}件中、先頭300件を表示しています。</div>`:'');
}
function renderSearch(initialMode='title',directPerson='',directRole=''){
  let currentMode=['person','title','tie-up','keyword'].includes(initialMode)?initialMode:'title';
  let selectedEntity='',selectedRole='',selectedRoleCounts={},selectedRelations=[],lastEntityQuery='',personTrail=[];
  document.title=`ITSUKI - ${currentMode==='person'?'人物検索':modeLabels[currentMode]+'検索'}`;
  // Keep the search page structure as close as possible to KaraokeLocal v1.0.13's
  // denmoku_search.html.  The static site omits only the remote-control button,
  // because there is no running KaraokeLocal server to control.
  app.innerHTML=`<div class="wrap denmoku-page">
    <div class="denmoku-toolbar">
      <a class="denmoku-top-btn" href="#top">TOP</a>
      <div class="denmoku-searchbox">
        <input id="searchInput" type="search" autocomplete="off" enterkeyhint="search" placeholder="検索語を入力">
        <button id="clearBtn" type="button" title="入力を消去">×</button>
      </div>
      <button id="searchBtn" class="denmoku-hit-btn" type="button"><span id="hitCount">0</span><small>Hits</small></button>
    </div>
    <div id="searchTabs" class="denmoku-tabs" role="tablist" aria-label="検索対象"></div>
    <div class="denmoku-subbar"><div id="modeGuide">検索語を入力してEnterキーを押してください</div></div>
    <div id="fileOnlyPanel" class="denmoku-file-only" style="display:none">
      <label><input id="fileOnly" type="checkbox"> ファイル名・フォルダ名だけで検索</label>
      <small>ONのときは楽曲DB情報ではなく、公開済みの動画ファイル名・相対フォルダ名だけを検索します</small>
    </div>
    <div id="personSearchOptions" class="denmoku-artist-options" style="display:none">
      <label><span>一致方法</span><select id="personMatchMode"><option value="partial">部分一致</option><option value="exact">完全一致</option><option value="prefix">前方一致</option></select></label>
      <label class="check-label"><input id="personIncludeRelated" type="checkbox" checked> 別名義・所属グループ・所属メンバーでヒットした候補も表示</label>
    </div>
    <div id="entityHeader" class="denmoku-entity-header" style="display:none"></div>
    <div id="personRelations" class="denmoku-person-relations" style="display:none"></div>
    <main id="results" class="denmoku-results"><div class="denmoku-empty">検索語を入力してください</div></main>
    <div id="toast" class="toast" style="display:none"></div>
  </div>`;
  window.scrollTo(0,0);
  const input=document.getElementById('searchInput'),results=document.getElementById('results'),hit=document.getElementById('hitCount'),header=document.getElementById('entityHeader');
  const searchTabs=document.getElementById('searchTabs'),modeGuide=document.getElementById('modeGuide'),fileOnlyPanel=document.getElementById('fileOnlyPanel'),fileOnly=document.getElementById('fileOnly'),personOptions=document.getElementById('personSearchOptions'),personMatch=document.getElementById('personMatchMode'),personRelated=document.getElementById('personIncludeRelated'),relationsBox=document.getElementById('personRelations');
  const pmap=peopleMap();

  function renderMainTabs(){
    searchTabs.innerHTML='';
    for(const [mode,label] of [['person','人物検索'],['title','曲名'],['tie-up','タイアップ'],['keyword','キーワード']]){
      const b=document.createElement('button');b.type='button';b.dataset.mode=mode;b.textContent=label;b.classList.toggle('active',currentMode===mode&&!selectedEntity);b.onclick=()=>applyMode(mode,true);searchTabs.appendChild(b);
    }
    searchTabs.setAttribute('aria-label','検索対象');
  }
  function renderRoleTabs(counts,active){
    searchTabs.innerHTML='';
    for(const role of roleOrder){const count=Number(counts?.[role]||0);const b=document.createElement('button');b.type='button';b.dataset.role=role;b.className='denmoku-role-tab';b.innerHTML=`<span>${esc(modeLabels[role])}</span><small>${count}</small>`;b.disabled=count<=0;b.classList.toggle('active',role===active&&count>0);b.onclick=()=>{if(!b.disabled)loadPersonRole(role)};searchTabs.appendChild(b)}
    searchTabs.setAttribute('aria-label','人物の担当区分');
  }
  function applyMode(mode,run=false){
    currentMode=mode;selectedEntity='';selectedRole='';selectedRoleCounts={};selectedRelations=[];personTrail=[];header.style.display='none';header.innerHTML='';relationsBox.style.display='none';relationsBox.innerHTML='';renderMainTabs();
    input.placeholder=modePlaceholders[mode]||'検索語を入力';
    modeGuide.textContent=['person','tie-up'].includes(mode)?`${modeLabels[mode]}を検索し、候補を選択してください`:`${modeLabels[mode]}だけを対象に検索します`;
    fileOnlyPanel.style.display=mode==='keyword'?'flex':'none';personOptions.style.display=mode==='person'?'flex':'none';if(mode!=='keyword')fileOnly.checked=false;
    document.title=`ITSUKI - ${mode==='person'?'人物検索':modeLabels[mode]+'検索'}`;
    hit.textContent='0';if(run&&input.value.trim())doSearch();else results.innerHTML='<div class="denmoku-empty">検索語を入力してください</div>';
  }
  function renderPersonEntities(list){
    hit.textContent=String(list.length);if(!list.length){results.innerHTML='<div class="denmoku-empty">該当する人物が見つかりませんでした</div>';return}
    results.innerHTML=list.map(x=>{const counts=x.role_counts||{};const active=roleOrder.filter(r=>Number(counts[r]||0)>0).map(r=>`${modeLabels[r]} ${counts[r]}`);return `<button type="button" class="denmoku-entity-row artist-entity-row" data-person="${esc(norm(x.name))}"><span><span>${esc(x.name)}${x.reason?` <small class="denmoku-relation-badge">(${esc(x.reason)})</small>`:''}</span>${active.length?`<small class="denmoku-person-role-summary">${esc(active.join(' / '))}</small>`:''}</span><span class="denmoku-entity-count">${nf(x.count)}曲　›</span></button>`}).join('');
    results.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>{const x=list.find(v=>norm(v.name)===b.dataset.person);if(x)openPerson(x.name)});
  }
  function renderTieEntities(list){hit.textContent=String(list.length);if(!list.length){results.innerHTML='<div class="denmoku-empty">該当するタイアップが見つかりませんでした</div>';return}results.innerHTML=entityRows(list);bindEntityClicks(results,list,x=>openTieupEntity(x.name))}
  function renderPersonRelations(){
    if(!selectedEntity||!selectedRelations.length){relationsBox.style.display='none';relationsBox.innerHTML='';return}
    relationsBox.innerHTML='<div class="denmoku-relations-title">別名義・グループ</div><div class="denmoku-relations-list"></div>';const list=relationsBox.querySelector('.denmoku-relations-list');
    for(const x of selectedRelations){const b=document.createElement('button');b.type='button';b.className='denmoku-related-person';b.innerHTML=`<span>${esc(x.name)}</span><small>${esc(x.relation||'関連人物')}</small>`;b.onclick=()=>openPerson(x.name,'','forward');list.appendChild(b)}relationsBox.style.display='block';
  }
  function closeRelations(){relationsBox.style.display='none'}
  function openPerson(name,preferredRole='',navigation='forward'){
    const p=pmap.get(norm(name));if(!p){results.innerHTML='<div class="denmoku-empty">人物情報が見つかりませんでした</div>';return}
    const relationsWereOpen=relationsBox.style.display==='block';
    const previousName=selectedEntity,previousRole=selectedRole;if(navigation==='forward'&&previousName&&norm(previousName)!==norm(name))personTrail.push({name:previousName,role:previousRole||''});
    currentMode='person';selectedEntity=p.name;selectedRoleCounts=roleCounts(p);selectedRelations=(p.related||[]).filter(x=>pmap.has(norm(x.name)));selectedRole=(preferredRole&&selectedRoleCounts[preferredRole]>0)?preferredRole:roleOrder.find(r=>selectedRoleCounts[r]>0)||'artist';
    personOptions.style.display='none';fileOnlyPanel.style.display='none';header.style.display='flex';
    const backLabel=lastEntityQuery?`← ${esc(lastEntityQuery)} の検索結果`:'← 人物検索へ';const previous=personTrail.length?personTrail[personTrail.length-1]:null;const previousButton=previous?`<button type="button" id="personBack" class="denmoku-person-back">← ${esc(previous.name)} に戻る</button>`:'';
    header.innerHTML=`<div class="denmoku-entity-nav">${previousButton}<button type="button" id="entityBack">${backLabel}</button></div><div class="denmoku-person-head"><strong>人物：${esc(p.name)}</strong><button type="button" id="relationToggle" class="denmoku-relation-toggle" style="display:none">別名義・グループ</button></div>`;
    header.querySelector('#entityBack').onclick=backToPersonSearch;const pb=header.querySelector('#personBack');if(pb)pb.onclick=backToPreviousPerson;
    const toggle=header.querySelector('#relationToggle');if(selectedRelations.length){toggle.style.display='inline-flex';toggle.textContent=`別名義・グループ ${selectedRelations.length}`;toggle.onclick=()=>relationsBox.style.display==='block'?closeRelations():renderPersonRelations()}
    // 人物を関連リンクから辿ったとき、開いたままの所属パネルも
    // 新しい人物の直接リレーションへ即時更新する。
    // 旧実装では selectedRelations だけ更新され、DOMが前の人物のまま残っていた。
    if(relationsWereOpen)renderPersonRelations();else{relationsBox.style.display='none';relationsBox.innerHTML=''}
    renderRoleTabs(selectedRoleCounts,selectedRole);modeGuide.textContent=`${p.name} が関わる曲を担当区分ごとに表示します`;hit.textContent=String(selectedRoleCounts[selectedRole]||0);renderSongList(results,songsForIds(p.roles?.[selectedRole]||[]));
  }
  function loadPersonRole(role){const p=pmap.get(norm(selectedEntity));if(!p||Number(selectedRoleCounts[role]||0)<=0)return;selectedRole=role;closeRelations();renderRoleTabs(selectedRoleCounts,role);hit.textContent=String(selectedRoleCounts[role]||0);renderSongList(results,songsForIds(p.roles?.[role]||[]))}
  function backToPreviousPerson(){if(!personTrail.length)return;const prev=personTrail.pop();openPerson(prev.name,prev.role||'','back')}
  function backToPersonSearch(){personTrail=[];selectedEntity='';selectedRole='';selectedRoleCounts={};selectedRelations=[];header.style.display='none';relationsBox.style.display='none';relationsBox.innerHTML='';currentMode='person';renderMainTabs();personOptions.style.display='flex';input.placeholder='人物名を入力';modeGuide.textContent='人物を検索し、候補を選択してください';if(lastEntityQuery){input.value=lastEntityQuery;doSearch(false)}else{hit.textContent='0';results.innerHTML='<div class="denmoku-empty">検索語を入力してください</div>';input.focus()}}
  function openTieupEntity(name){selectedEntity=name;header.style.display='flex';header.innerHTML=`<button type="button" id="entityBack">${lastEntityQuery?`← ${esc(lastEntityQuery)} の検索結果`:'← タイアップ検索へ'}</button><strong>タイアップ：${esc(name)}</strong>`;header.querySelector('button').onclick=()=>lastEntityQuery?doSearch(false):(header.style.display='none');const list=DATA.songs.filter(s=>norm(s.tie_up)===norm(name));hit.textContent=String(list.length);renderSongList(results,list)}
  function doSearch(storeQuery=true){
    const raw=input.value.trim(),q=norm(raw);if(!q){hit.textContent='0';results.innerHTML='<div class="denmoku-empty">検索語を入力してください</div>';return}if(storeQuery)lastEntityQuery=raw;
    personTrail=[];selectedEntity='';selectedRole='';selectedRoleCounts={};selectedRelations=[];header.style.display='none';relationsBox.style.display='none';relationsBox.innerHTML='';renderMainTabs();personOptions.style.display=currentMode==='person'?'flex':'none';
    if(currentMode==='keyword'&&fileOnly.checked){const list=flattenFolderFiles().filter(v=>norm(`${v.name} ${v.rel_path}`).includes(q));renderFileSearchResults(results,list,hit);return}
    if(currentMode==='person'){
      const matchMode=personMatch.value,includeRelated=personRelated.checked,reasonRank={'':0,'別名義':1,'所属グループ':2,'所属メンバー':2,'関連人物':3};const list=[];
      for(const p of peopleArray()){const reason=personCandidateReason(p,q,matchMode,includeRelated,pmap);if(reason===null)continue;const counts=roleCounts(p);list.push({name:p.name,count:personTotalCount(p),role_counts:counts,reason})}
      list.sort((a,b)=>(norm(a.name)===q?0:1)-(norm(b.name)===q?0:1)||(reasonRank[a.reason]??9)-(reasonRank[b.reason]??9)||a.name.localeCompare(b.name,'ja'));renderPersonEntities(list.slice(0,300));return;
    }
    if(currentMode==='tie-up'){
      const map=new Map();for(const song of DATA.songs){const hay=norm([song.tie_up,song.tie_up_ruby,song.series].join(' '));if(!hay.includes(q)||!song.tie_up)continue;const key=norm(song.tie_up);if(!map.has(key))map.set(key,{key,name:song.tie_up,count:0,ids:new Set()});const e=map.get(key);e.ids.add(song.id);e.count=e.ids.size}const list=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));renderTieEntities(list);return;
    }
    const filtered=DATA.songs.filter(song=>{
      if(currentMode==='title')return norm([song.song_name,song.song_ruby,song.aliases].join(' ')).includes(q);
      const hay=norm([song.song_name,song.song_ruby,song.song_keyword,song.artists,song.lyricists,song.composers,song.arrangers,song.tags,song.tag_keywords,song.tie_up,song.tie_up_ruby,song.tie_up_category,song.series,song.op_ed,song.aliases].join(' '))+' '+(song.artist_relation_search||'')+' '+(song.lyricist_relation_search||'')+' '+(song.composer_relation_search||'')+' '+(song.arranger_relation_search||'');
      return hay.includes(q);
    });
    hit.textContent=String(filtered.length);renderSongList(results,filtered);
  }
  document.getElementById('searchBtn').onclick=()=>{if(selectedEntity&&currentMode==='person'){selectedEntity='';renderMainTabs();personOptions.style.display='flex'}doSearch()};
  document.getElementById('clearBtn').onclick=()=>{input.value='';lastEntityQuery='';personTrail=[];selectedEntity='';selectedRole='';selectedRoleCounts={};selectedRelations=[];header.style.display='none';relationsBox.style.display='none';renderMainTabs();personOptions.style.display=currentMode==='person'?'flex':'none';hit.textContent='0';results.innerHTML='<div class="denmoku-empty">検索語を入力してください</div>';input.focus()};
  input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();if(selectedEntity&&currentMode==='person'){selectedEntity='';renderMainTabs();personOptions.style.display='flex'}doSearch()}};
  fileOnly.onchange=()=>{modeGuide.textContent=fileOnly.checked?'動画ファイル名・相対フォルダ名だけを検索します':'キーワードはDB連携情報全体を検索します';if(input.value.trim())doSearch(false)};
  personMatch.onchange=()=>{if(currentMode==='person'&&!selectedEntity&&input.value.trim())doSearch(false)};personRelated.onchange=()=>{if(currentMode==='person'&&!selectedEntity&&input.value.trim())doSearch(false)};
  applyMode(currentMode,false);if(directPerson)openPerson(directPerson,directRole);else setTimeout(()=>input.focus(),30);
}

const featureDefs={
  'mv-pv':['mv_pv','🎬','MV・PV','MV / PVタグが付いた曲を歌手名から選択'],
  'live':['live','🎙️','LIVEカラオケ','LIVEタグが付いた曲を歌手名から選択'],
  'anime':['anime','📺','アニメ・ゲーム映像','MADタグ＋アニメ・ゲーム系タイアップから選択'],
  'parts':['parts','👥','パート分け','キーワード「パート分け」の曲を歌手名から選択']
};
function renderFeature(slug){const d=featureDefs[slug]||featureDefs['mv-pv'];const rows=DATA.songs.filter(s=>s.features&&s.features[d[0]]);document.title='ITSUKI - '+d[2];pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">${d[1]}</div><div><div class="browse-title">${d[2]}</div><div class="browse-note">${d[3]}</div></div></header><div id="entityHeader" class="browse-entity-header" style="display:none"></div><main id="browseResults" class="browse-results"></main>`,'browse-page');const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader');const map=new Map();for(const s of rows){const name=(s.artists||'歌手情報なし').trim();const key=norm(name);if(!map.has(key))map.set(key,{key,name,count:0,ids:new Set()});const e=map.get(key);e.ids.add(s.id);e.count=e.ids.size}const list=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));root.innerHTML=entityRows(list);bindEntityClicks(root,list,x=>{head.style.display='flex';head.innerHTML=`<button type="button">← 歌手一覧へ</button><strong>${esc(x.name)}</strong>`;head.querySelector('button').onclick=()=>renderFeature(slug);renderSongList(root,rows.filter(s=>norm(s.artists)===x.key))})}


function renderFolderBrowser(){
  document.title='ITSUKI - フォルダから探す';
  const fb=DATA.folder_browser||{};
  if(!fb.available||!Array.isArray(fb.roots)||!fb.roots.length){
    pageShell(`${topNav()}<div class="card bad"><div class="big">フォルダ一覧を作成できません</div><p>KaraokeLocalに動画ルートが設定され、動画スキャンが完了しているか確認してください。</p></div>`);
    return;
  }
  app.innerHTML=`
  <div class="digizo-browser-page web-folder-browser-page">
    <section class="digizo-browser-screen" aria-label="フォルダから探す">
      <div class="digizo-browser-head">
        <strong id="screenTitle">デバイス(すべて)</strong>
        <span id="itemCounter">0 / 0</span>
      </div>
      <div class="digizo-list-shell">
        <div id="fileList" class="digizo-file-list" role="listbox" aria-label="フォルダと動画ファイル"></div>
        <div class="digizo-scrollbar" aria-hidden="true"><span id="scrollThumb"></span></div>
      </div>
      <div class="digizo-browser-foot">
        <div id="currentPathLabel" class="digizo-current-path">デバイス/</div>
        <button id="editToggle" type="button" class="digizo-edit-button" aria-expanded="false">🔍 編集</button>
      </div>
      <div id="editPanel" class="digizo-edit-panel" hidden>
        <input id="filterText" type="search" placeholder="フォルダ名・ファイル名で絞り込み" autocomplete="off">
        <select id="sortMode" aria-label="並び替え">
          <option value="name-asc">名前：昇順</option>
          <option value="name-desc">名前：降順</option>
        </select>
      </div>
    </section>
    <section class="digizo-browser-controls">
      <div id="selectionInfo" class="digizo-selection-info">項目を選択してください</div>
      <div class="digizo-control-grid">
        <div class="digizo-dpad" aria-label="方向キー">
          <button type="button" class="pad-up" data-folder-action="up">▲</button>
          <button type="button" class="pad-left" data-folder-action="back">◀</button>
          <button type="button" class="pad-center" data-folder-action="open">●</button>
          <button type="button" class="pad-right" data-folder-action="open">▶</button>
          <button type="button" class="pad-down" data-folder-action="down">▼</button>
        </div>
        <div class="digizo-action-buttons">
          <button type="button" data-folder-action="top">TOP</button>
          <button type="button" data-folder-action="back">戻る</button>
          <button type="button" class="primary" data-folder-action="open">決定</button>
        </div>
      </div>
    </section>
  </div>
  <div id="folderDetailModal" class="web-folder-modal-backdrop" hidden>
    <div class="web-folder-modal" role="dialog" aria-modal="true" aria-labelledby="folderDetailTitle">
      <button id="folderDetailClose" class="web-folder-modal-close" type="button" aria-label="閉じる">×</button>
      <div id="folderDetailBody"></div>
    </div>
  </div>`;

  const fileList=document.getElementById('fileList');
  const filterText=document.getElementById('filterText');
  const sortMode=document.getElementById('sortMode');
  const selectionInfo=document.getElementById('selectionInfo');
  const screenTitle=document.getElementById('screenTitle');
  const itemCounter=document.getElementById('itemCounter');
  const currentPathLabel=document.getElementById('currentPathLabel');
  const scrollThumb=document.getElementById('scrollThumb');
  const editToggle=document.getElementById('editToggle');
  const editPanel=document.getElementById('editPanel');
  const detailModal=document.getElementById('folderDetailModal');
  const detailBody=document.getElementById('folderDetailBody');
  const songMap=new Map((DATA.songs||[]).map(s=>[String(s.id),s]));
  let rootId='',currentPath='',currentRootName='',rawItems=[],visibleItems=[],selectedIndex=0;

  function itemKey(x){return x?`${x.type}:${x.video_id||x.root_id||x.name}`:''}
  function selectedItem(){return visibleItems[selectedIndex]||null}
  function rowIconClass(item){return item.type==='video'?'video':'folder'}
  function displayPath(){
    if(rootId==='')return 'デバイス/';
    const tail=currentPath?'/'+currentPath.replace(/\\/g,'/'):'';
    return `${currentRootName||'HDD'}${tail}/`;
  }
  function updateChrome(){
    screenTitle.textContent=rootId===''?'デバイス(すべて)':`${currentRootName||'HDD'}(すべて)`;
    currentPathLabel.textContent=displayPath();
    const total=visibleItems.length;
    itemCounter.textContent=total?`${selectedIndex+1} / ${total}`:'0 / 0';
    const row=fileList.querySelector('.digizo-file-row');
    const rowH=row?Math.max(1,row.getBoundingClientRect().height):48;
    const visibleRows=Math.max(1,Math.floor((fileList.clientHeight||rowH)/rowH));
    const ratio=total?Math.min(1,visibleRows/total):1;
    const thumbH=Math.max(10,ratio*100);
    const top=total<=1?0:(selectedIndex/(total-1))*(100-thumbH);
    scrollThumb.style.height=`${thumbH}%`;scrollThumb.style.top=`${top}%`;
  }
  function selectionLabel(item){
    if(!item)return '項目がありません';
    if(item.type!=='video')return `フォルダ：${item.name}`;
    const song=item.song_id?songMap.get(String(item.song_id)):null;
    return song?`動画：${item.name}　｜　${song.song_name||''} / ${song.artists||''}`:`動画：${item.name}`;
  }
  function updateSelection(){
    [...fileList.querySelectorAll('.digizo-file-row')].forEach((el,i)=>{
      const on=i===selectedIndex;el.classList.toggle('selected',on);el.setAttribute('aria-selected',on?'true':'false');
      if(on)el.scrollIntoView({block:'nearest'});
    });
    selectionInfo.textContent=selectionLabel(selectedItem());updateChrome();
  }
  function applyView(){
    const keepKey=itemKey(selectedItem()),q=filterText.value.trim().toLocaleLowerCase('ja');
    visibleItems=rawItems.filter(item=>!q||item.name.toLocaleLowerCase('ja').includes(q));
    const desc=sortMode.value==='name-desc';
    visibleItems.sort((a,b)=>{
      if(a.type!==b.type)return a.type==='video'?1:-1;
      const cmp=a.name.localeCompare(b.name,'ja',{numeric:true,sensitivity:'base'});return desc?-cmp:cmp;
    });
    const kept=keepKey?visibleItems.findIndex(x=>itemKey(x)===keepKey):-1;
    if(kept>=0)selectedIndex=kept;
    selectedIndex=Math.max(0,Math.min(selectedIndex,visibleItems.length-1));renderRows();
  }
  function renderRows(){
    if(!visibleItems.length){fileList.innerHTML='<div class="digizo-empty">表示できる項目がありません</div>';updateSelection();return}
    fileList.innerHTML=visibleItems.map((item,i)=>`<button type="button" class="digizo-file-row${i===selectedIndex?' selected':''}" role="option" aria-selected="${i===selectedIndex?'true':'false'}" data-index="${i}"><span class="digizo-item-icon ${rowIconClass(item)}" aria-hidden="true"></span><span class="digizo-item-name">${esc(item.name)}</span></button>`).join('');
    fileList.querySelectorAll('.digizo-file-row').forEach(row=>{
      row.addEventListener('focus',()=>{selectedIndex=Number(row.dataset.index)||0;updateSelection()});
      row.addEventListener('click',()=>{selectedIndex=Number(row.dataset.index)||0;updateSelection()});
      row.addEventListener('dblclick',()=>{selectedIndex=Number(row.dataset.index)||0;updateSelection();activateSelected()});
    });updateSelection();
  }
  function loadFolder(rid='',path=''){
    if(rid===''){
      rootId='';currentPath='';currentRootName='';
      rawItems=fb.roots.map(r=>({type:'root',name:r.name||'動画ルート',root_id:String(r.id)}));
      selectedIndex=0;applyView();return;
    }
    const root=fb.roots.find(r=>String(r.id)===String(rid));
    if(!root){rawItems=[];selectedIndex=0;renderRows();return}
    const key=String(path||'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');
    const node=(root.entries||{})[key];
    rootId=String(root.id);currentPath=key;currentRootName=root.name||'HDD';
    if(!node){rawItems=[];selectedIndex=0;renderRows();return}
    const folders=(node.folders||[]).map(name=>({type:'folder',name:String(name)}));
    const files=(node.files||[]).map(x=>({type:'video',name:String(x.name||''),video_id:Number(x.video_id||0),song_id:String(x.song_id||'')}));
    rawItems=folders.concat(files);selectedIndex=0;applyView();
  }
  function childPath(name){return [currentPath,name].filter(Boolean).join('/')}
  function closeDetail(){detailModal.hidden=true}
  function showVideoDetail(item){
    const song=item.song_id?songMap.get(String(item.song_id)):null;
    if(song){location.hash=songHref(song);return}
    detailBody.innerHTML=`
      <div class="web-folder-detail-file">🎬 ${esc(item.name)}</div>
      <h2 id="folderDetailTitle">楽曲DB未紐づけ動画</h2>
      <div class="web-folder-detail-note">この動画は楽曲DBに紐づいていないため、ファイル名のみ表示しています。</div>`;
    detailModal.hidden=false;
  }
  function activateSelected(){
    const item=selectedItem();if(!item)return;
    if(item.type==='root'){loadFolder(item.root_id,'');return}
    if(item.type==='folder'){loadFolder(rootId,childPath(item.name));return}
    if(item.type==='video')showVideoDetail(item);
  }
  function goBack(){
    if(rootId===''){location.hash='#top';return}
    if(!currentPath){loadFolder('','');return}
    const parts=currentPath.split('/').filter(Boolean);parts.pop();loadFolder(rootId,parts.join('/'));
  }
  function moveSelection(delta){
    if(!visibleItems.length)return;
    selectedIndex=(selectedIndex+delta+visibleItems.length)%visibleItems.length;updateSelection();
  }
  function toggleEdit(force){
    const open=typeof force==='boolean'?force:editPanel.hidden;editPanel.hidden=!open;
    editToggle.setAttribute('aria-expanded',open?'true':'false');if(open)setTimeout(()=>filterText.focus(),0);
  }

  document.querySelectorAll('[data-folder-action]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.folderAction;
    if(a==='up')moveSelection(-1);else if(a==='down')moveSelection(1);else if(a==='back')goBack();
    else if(a==='open')activateSelected();else if(a==='top')location.hash='#top';
  });
  editToggle.onclick=()=>toggleEdit();
  filterText.oninput=()=>{selectedIndex=0;applyView()};
  sortMode.onchange=()=>{selectedIndex=0;applyView()};
  fileList.addEventListener('scroll',updateChrome,{passive:true});
  document.getElementById('folderDetailClose').onclick=closeDetail;
  detailModal.onclick=e=>{if(e.target===detailModal)closeDetail()};
  document.onkeydown=e=>{
    if(detailModal&&!detailModal.hidden){if(e.key==='Escape'){e.preventDefault();closeDetail()}return}
    if(document.activeElement===filterText){if(e.key==='Escape'){e.preventDefault();toggleEdit(false)}return}
    if(e.key==='ArrowUp'){e.preventDefault();moveSelection(-1)}
    else if(e.key==='ArrowDown'){e.preventDefault();moveSelection(1)}
    else if(e.key==='ArrowLeft'||e.key==='Backspace'){e.preventDefault();goBack()}
    else if(e.key==='ArrowRight'||e.key==='Enter'){e.preventDefault();activateSelected()}
    else if(e.key==='Escape'){e.preventDefault();goBack()}
  };
  loadFolder();
}

function uniqueValues(values){return [...new Set((Array.isArray(values)?values:[]).map(v=>String(v??'').trim()).filter(Boolean))]}
function relatedSongs(mode,value){
  const key=norm(value);
  if(!key)return[];
  return DATA.songs.filter(s=>{
    if(mode==='artist')return norm(s.artists)===key;
    if(mode==='lyricist')return vals(s.lyricists).some(v=>norm(v)===key);
    if(mode==='composer')return vals(s.composers).some(v=>norm(v)===key);
    if(mode==='arranger')return vals(s.arrangers).some(v=>norm(v)===key);
    if(mode==='tieup')return norm(s.tie_up)===key;
    if(mode==='series')return vals(s.series).some(v=>norm(v)===key);
    if(mode==='category')return vals(s.tie_up_category_id).some(v=>String(v)===String(value));
    if(mode==='year')return String(s.release_year||'')===String(value)||String(s.tie_up_release_year||'')===String(value);
    return false;
  });
}
function entityLabel(mode){return ({artist:'歌手',lyricist:'作詞',composer:'作曲',arranger:'編曲',tieup:'タイアップ',series:'シリーズ',category:'カテゴリー',year:'リリース年'}[mode]||'関連項目')}
function entityDisplayName(mode,value){
  if(mode!=='category')return String(value||'');
  for(const s of DATA.songs){
    const ids=vals(s.tie_up_category_id), names=vals(s.tie_up_category);
    const i=ids.findIndex(v=>String(v)===String(value));
    if(i>=0)return names[i]||String(value);
  }
  return String(value||'');
}
function renderEntity(mode,value){
  const label=entityLabel(mode), display=entityDisplayName(mode,value), list=relatedSongs(mode,value);
  document.title=`ITSUKI - ${display}`;
  pageShell(`${topNav()}<header class="browse-header web-related-header"><div class="browse-icon">🔗</div><div><div class="browse-title">${esc(display||label)}</div><div class="browse-note">${esc(label)}から関連する曲 / ${nf(list.length)}曲</div></div></header><div class="web-detail-toolbar"><button id="relatedBack" type="button">← 戻る</button></div><main id="relatedResults" class="browse-results"></main>`,'browse-page');
  document.getElementById('relatedBack').onclick=()=>{if(history.length>1)history.back();else location.hash='#top'};
  renderSongList(document.getElementById('relatedResults'),list,`${display||label}に関連する曲はありません`,500);
}
function detailLinkList(mode,values){
  const list=uniqueValues(values);
  if(!list.length)return '<span class="web-detail-empty">―</span>';
  return list.map(v=>`<a class="web-detail-entity-link" href="${entityHref(mode,v)}">${esc(v)}<span>›</span></a>`).join('');
}
function detailCell(label,mode,values,wide=false){
  const list=uniqueValues(values);
  return `<div class="reserve-detail-cell${wide?' reserve-detail-wide':''}"><div class="reserve-detail-label">${esc(label)}</div><div class="web-detail-values">${mode?detailLinkList(mode,list):(list.length?list.map(esc).join(' / '):'<span class="web-detail-empty">―</span>')}</div></div>`;
}
function categoryDetailCell(s){
  const ids=vals(s.tie_up_category_id), names=vals(s.tie_up_category);
  const links=ids.map((id,i)=>({id,name:names[i]||id})).filter(x=>x.id);
  return `<div class="reserve-detail-cell"><div class="reserve-detail-label">カテゴリー</div><div class="web-detail-values">${links.length?links.map(x=>`<a class="web-detail-entity-link" href="${entityHref('category',x.id)}">${esc(x.name)}<span>›</span></a>`).join(''):'<span class="web-detail-empty">―</span>'}</div></div>`;
}
function renderSongDetail(songId){
  const song=DATA.songs.find(s=>String(s.id)===String(songId));
  if(!song){document.title='ITSUKI - 曲が見つかりません';pageShell(`${topNav()}<div class="card bad"><div class="big">曲が見つかりません</div><p>公開データが更新された可能性があります。</p></div>`);return}
  document.title=`ITSUKI - ${song.song_name||'曲詳細'}`;
  const badges=[];
  if(song.video_count)badges.push(`${song.video_count}動画`);
  for(const x of (song.vocal_labels||[]))badges.push(x);
  for(const x of (song.languages||[]))badges.push(x);
  if(song.features?.mv_pv)badges.push('MV・PV');
  if(song.features?.live)badges.push('LIVEカラオケ');
  if(song.features?.anime)badges.push('アニメ・ゲーム映像');
  if(song.features?.parts)badges.push('パート分け');
  const artistLinks=song.artists?[song.artists]:[];
  const tieDisplay=[song.tie_up||'',song.op_ed?`(${song.op_ed})`:''].filter(Boolean).join(' ');
  const tags=uniqueValues(vals(song.tags));
  const aliases=uniqueValues(vals(song.aliases));
  pageShell(`${topNav()}<div class="web-song-detail-page">
    <div class="web-detail-toolbar"><button id="songDetailBack" type="button">← 戻る</button><span>曲詳細</span></div>
    <section class="reserve-song-card web-song-detail-card">
      <div class="reserve-song-line reserve-song-title-line"><div class="reserve-title">${esc(song.song_name||'曲名不明')}</div></div>
      ${song.song_ruby?`<div class="web-detail-ruby">${esc(song.song_ruby)}</div>`:''}
      <div class="reserve-song-line reserve-artist-row"><div class="reserve-song-icon reserve-person-icon" aria-hidden="true"></div><div class="web-detail-artist-links">${detailLinkList('artist',artistLinks)}</div></div>
      <div class="reserve-core-grid">
        <div class="reserve-core-cell"><span>公開動画</span><strong>${nf(song.video_count)}本</strong></div>
        <div class="reserve-core-cell reserve-year-cell"><span>リリース年</span><strong>${song.release_year?`<a class="web-detail-year-link" href="${entityHref('year',song.release_year)}">${esc(song.release_year)}年 ›</a>`:'―'}</strong></div>
      </div>
      <div class="reserve-detail-grid">
        ${detailCell('作詞','lyricist',vals(song.lyricists))}
        ${detailCell('作曲','composer',vals(song.composers))}
        ${detailCell('編曲','arranger',vals(song.arrangers),true)}
        ${detailCell('タイアップ','tieup',song.tie_up?[song.tie_up]:[],true)}
        ${categoryDetailCell(song)}
        ${detailCell('シリーズ','series',vals(song.series))}
        ${detailCell('OP / ED',null,song.op_ed?[song.op_ed]:[])}
        ${detailCell('タイアップ年',null,song.tie_up_release_year?[`${song.tie_up_release_year}年`]:[])}
        ${detailCell('別名・別表記',null,aliases,true)}
        ${detailCell('キーワード',null,vals(song.song_keyword),true)}
      </div>
      ${tieDisplay?`<div class="web-detail-tie-summary">🎞️ ${esc(tieDisplay)}</div>`:''}
      ${tags.length?`<div class="web-detail-tag-section"><div class="reserve-related-title">タグ</div><div class="reserve-related-tags">${tags.map(t=>`<span class="reserve-related-chip">${esc(t)}</span>`).join('')}</div></div>`:''}
      ${badges.length?`<div class="web-detail-tag-section"><div class="reserve-related-title">この曲の公開情報</div><div class="reserve-related-tags">${uniqueValues(badges).map(t=>`<span class="reserve-related-chip">${esc(t)}</span>`).join('')}</div></div>`:''}
    </section>
  </div>`,'web-song-detail-wrap');
  document.getElementById('songDetailBack').onclick=()=>{if(history.length>1)history.back();else location.hash='#top'};
}

function renderAll(){document.title='ITSUKI - 全曲一覧';pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">📚</div><div><div class="browse-title">全曲一覧</div><div class="browse-note">選曲可能な${nf(DATA.song_count)}曲</div></div></header><main id="browseResults" class="browse-results"></main>`,'browse-page');renderSongList(document.getElementById('browseResults'),DATA.songs,'',500)}

function renderForeign(){const counts=new Map();for(const s of DATA.songs)for(const l of (s.languages||[]))counts.set(l,(counts.get(l)||0)+1);const langs=[...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ja'));document.title='ITSUKI - 外国曲';pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">🌐</div><div><div class="browse-title">外国曲</div><div class="browse-note">言語を選択して曲一覧を表示</div></div></header><div id="entityHeader" class="browse-entity-header" style="display:none"></div><main id="browseResults" class="browse-results"><div class="web-language-grid">${langs.map(([l,c])=>`<button class="web-language-btn" data-lang="${esc(l)}"><img src="./assets/flags/${flagPath(l)}" alt=""><strong>${esc(l)}</strong><small>${nf(c)}曲</small></button>`).join('')}</div></main>`,'browse-page');const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader');root.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{const l=b.dataset.lang;head.style.display='flex';head.innerHTML=`<button type="button">← 言語一覧へ</button><strong>${esc(l)}</strong>`;head.querySelector('button').onclick=renderForeign;renderSongList(root,DATA.songs.filter(s=>(s.languages||[]).includes(l)))})}

function renderTieup(){document.title='ITSUKI - タイアップ';const catMap=new Map(),seriesMap=new Map();for(const s of DATA.songs){const ids=vals(s.tie_up_category_id),names=vals(s.tie_up_category);ids.forEach((id,i)=>{const name=names[i]||id;if(!catMap.has(id))catMap.set(id,{key:id,name,count:0,ids:new Set()});const e=catMap.get(id);e.ids.add(s.id);e.count=e.ids.size});for(const ser of vals(s.series)){const k=norm(ser);if(!seriesMap.has(k))seriesMap.set(k,{key:k,name:ser,count:0,ids:new Set()});const e=seriesMap.get(k);e.ids.add(s.id);e.count=e.ids.size}}
  pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">🎞️</div><div><div class="browse-title">タイアップ</div><div class="browse-note">シリーズまたはジャンルからタイアップを探します</div></div></header><div id="entityHeader" class="browse-entity-header" style="display:none"></div><main id="browseResults" class="browse-results"></main>`,'browse-page');const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader');
  function rootView(){head.style.display='none';const cats=[...catMap.values()].sort((a,b)=>a.key.localeCompare(b.key));root.innerHTML=`<div class="web-browse-grid"><button class="denmoku-entity-row" id="seriesBtn"><span><strong>📚 シリーズ</strong></span><span class="denmoku-entity-count">${nf(seriesMap.size)}件　›</span></button>${cats.map(x=>`<button class="denmoku-entity-row" data-cat="${esc(x.key)}"><span><strong>${esc(x.name)}</strong></span><span class="denmoku-entity-count">${nf(x.count)}曲　›</span></button>`).join('')}</div>`;root.querySelector('#seriesBtn').onclick=seriesView;root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>tieupsFor(s=>vals(s.tie_up_category_id).includes(b.dataset.cat),catMap.get(b.dataset.cat).name,rootView,false))}
  function seriesView(){head.style.display='flex';head.innerHTML='<button type="button">← ジャンル一覧へ</button><strong>シリーズ</strong>';head.querySelector('button').onclick=rootView;const list=[...seriesMap.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));root.innerHTML=entityRows(list);bindEntityClicks(root,list,x=>tieupsFor(s=>vals(s.series).some(v=>norm(v)===x.key),x.name,seriesView,true))}
  function tieupsFor(pred,label,back,showCategory=false){head.style.display='flex';head.innerHTML=`<button type="button">← 一覧へ</button><strong>${esc(label)}</strong>`;head.querySelector('button').onclick=back;const map=new Map();for(const s of DATA.songs.filter(pred)){if(!s.tie_up)continue;const k=norm(s.tie_up);if(!map.has(k))map.set(k,{key:k,name:s.tie_up,count:0,ids:new Set(),categories:new Set()});const e=map.get(k);e.ids.add(s.id);e.count=e.ids.size;if(showCategory)for(const cat of categoryVals(s.tie_up_category))if(cat)e.categories.add(cat)}const list=[...map.values()].map(x=>({...x,sub:showCategory&&x.categories.size?`(${[...x.categories].join(' / ')})`:''})).sort((a,b)=>(hira(a.name)).localeCompare(hira(b.name),'ja'));root.innerHTML=entityRows(list);bindEntityClicks(root,list,x=>{head.innerHTML=`<button type="button">← タイアップ一覧へ</button><strong>${esc(x.name)}</strong>`;head.querySelector('button').onclick=()=>tieupsFor(pred,label,back,showCategory);renderSongList(root,DATA.songs.filter(s=>norm(s.tie_up)===x.key&&pred(s)))})}
  rootView();
}

function renderEra(){document.title='ITSUKI - あの頃・この頃';const currentYear=new Date().getFullYear();const cats=new Map();for(const s of DATA.songs){const ids=vals(s.tie_up_category_id),names=vals(s.tie_up_category);ids.forEach((id,i)=>{if(id&&!cats.has(id))cats.set(id,names[i]||id)})}pageShell(`${topNav()}<div class="era-shell"><div class="era-head"><span>🕒</span><div><h1>あの頃・この頃</h1><p>年代から選曲できる曲を探します</p></div></div><div class="era-panel"><div class="web-era-controls"><div class="web-era-mode"><button id="modeYear" class="active">年から探す</button><button id="modeAge">年齢から探す</button></div><div class="web-era-fields"><label><span id="field1Label">西暦</span><input id="field1" type="number" value="${currentYear}" min="1901" max="2199"></label><label><span id="field2Label">ジャンル</span><select id="genre"><option value="">すべて</option>${[...cats].sort((a,b)=>a[0].localeCompare(b[0])).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('')}</select></label><label id="ageNowWrap" style="display:none"><span>現在の年齢</span><input id="ageNow" type="number" value="30" min="0" max="120"></label><label id="ageThenWrap" style="display:none"><span>当時の年齢</span><input id="ageThen" type="number" value="18" min="0" max="120"></label></div><button class="web-primary-btn" id="eraSearch">検索</button><div id="eraComputed" class="era-computed"></div></div></div></div><main id="eraResults" class="denmoku-results era-results"><div class="denmoku-empty">条件を指定して検索してください</div></main>`,'era-page');let mode='year';const fy=document.getElementById('field1'),genre=document.getElementById('genre'),res=document.getElementById('eraResults'),computed=document.getElementById('eraComputed');function sw(m){mode=m;document.getElementById('modeYear').classList.toggle('active',m==='year');document.getElementById('modeAge').classList.toggle('active',m==='age');document.getElementById('ageNowWrap').style.display=m==='age'?'grid':'none';document.getElementById('ageThenWrap').style.display=m==='age'?'grid':'none';fy.parentElement.style.display=m==='year'?'grid':'none'}document.getElementById('modeYear').onclick=()=>sw('year');document.getElementById('modeAge').onclick=()=>sw('age');document.getElementById('eraSearch').onclick=()=>{let year;if(mode==='year')year=Number(fy.value);else year=currentYear-Number(document.getElementById('ageNow').value)+Number(document.getElementById('ageThen').value);computed.textContent=`対象年：${year}年`;const g=genre.value;const list=DATA.songs.filter(s=>(String(s.release_year)===String(year)||String(s.tie_up_release_year)===String(year))&&(!g||vals(s.tie_up_category_id).includes(g)));renderSongList(res,list,`${year}年に該当する曲がありません`)} }

function isoWeekNumber(y,m,d){const x=new Date(Date.UTC(y,m,d));const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);const yearStart=new Date(Date.UTC(x.getUTCFullYear(),0,1));return Math.ceil((((x-yearStart)/86400000)+1)/7)}
function updateWeekInfo(ts){
  const d=new Date(Number(ts||0)*1000);
  const start=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  start.setDate(start.getDate()-start.getDay());
  const end=new Date(start);end.setDate(end.getDate()+7);
  const probe=new Date(start);probe.setDate(probe.getDate()+1);
  const week=isoWeekNumber(probe.getFullYear(),probe.getMonth(),probe.getDate());
  const key=`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
  const label=start.getFullYear()===end.getFullYear()
    ?`W${String(week).padStart(2,'0')}(${start.getFullYear()}年${start.getMonth()+1}月${start.getDate()}日～${end.getMonth()+1}月${end.getDate()}日)更新分`
    :`W${String(week).padStart(2,'0')}(${start.getFullYear()}年${start.getMonth()+1}月${start.getDate()}日～${end.getFullYear()}年${end.getMonth()+1}月${end.getDate()}日)更新分`;
  return {key,week,label};
}
function renderUpdates(){document.title='ITSUKI - 新曲・更新曲';const days=Math.max(1,Math.min(60,Number(DATA.new_update_days||15)||15)),now=new Date(),todayStart=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/1000),cut=todayStart-(days-1)*86400;const list=DATA.songs.filter(s=>Number(s.updated_at||0)>=cut).sort((a,b)=>Number(b.updated_at)-Number(a.updated_at));const groups=new Map();for(const s of list){const info=updateWeekInfo(s.updated_at);if(!groups.has(info.key))groups.set(info.key,{...info,items:[]});groups.get(info.key).items.push(s)};pageShell(`${topNav()}<div class="updates-head"><div><div class="big">✨ 新曲・更新曲</div><div class="muted">直近${days}日間 / ${nf(list.length)}曲</div></div></div><main id="updatesResults"></main>`,'updates-page');const root=document.getElementById('updatesResults');if(!list.length){root.innerHTML='<div class="card"><span class="muted">指定期間内の新曲・更新曲はありません</span></div>';return}root.innerHTML=[...groups.values()].map(g=>`<section class="update-group"><div class="update-group-title">${esc(g.label)}</div><div class="update-group-list">${g.items.map(songRow).join('')}</div></section>`).join('')}

function route(){
  document.onkeydown=null;
  const h=(location.hash||'#top').replace(/^#/,'');
  const parts=h.split('/'),a=parts[0]||'',b=parts[1]||'';
  if(a==='top'||!a)return renderTop();
  if(a==='search')return renderSearch(b||'title');
  if(a==='person')return renderSearch('person',decodeURIComponent(b||''),decodeURIComponent(parts[2]||''));
  if(a==='feature')return renderFeature(b);
  if(a==='folder')return renderFolderBrowser();
  if(a==='all')return renderAll();
  if(a==='foreign')return renderForeign();
  if(a==='tieup')return renderTieup();
  if(a==='era')return renderEra();
  if(a==='updates')return renderUpdates();
  if(a==='song')return renderSongDetail(decodeURIComponent(parts.slice(1).join('/')));
  if(a==='entity')return renderEntity(decodeURIComponent(b),decodeURIComponent(parts.slice(2).join('/')));
  renderTop();
}

async function init(){
  try{
    DATA=window.KARAOKE_SITE_DATA||null;
    // Backward-compatible fallback for sites generated by v0.1.x.
    if(!DATA){
      const r=await fetch('./data/site_data.json',{cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      DATA=await r.json();
    }
    if(!DATA||!Array.isArray(DATA.songs))throw new Error('曲データ形式が不正です');
    window.addEventListener('hashchange',route);route();
  }
  catch(e){app.innerHTML=`<div class="wrap"><div class="card bad"><div class="big">曲データを読み込めませんでした</div><p>${esc(e.message)}</p><p class="muted">Exporterで最新版を作成し、data/site_data.js が配置されているか確認してください。</p></div></div>`}
}
init();
