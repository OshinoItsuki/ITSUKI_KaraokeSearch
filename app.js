'use strict';

const esc=s=>(s??'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Number(n||0).toLocaleString('ja-JP');
function norm(s){
  s=(s??'').toString().normalize('NFKC').toLowerCase().replace(/　/g,' ');
  s=s.replace(/[\s_・･]+/g,'');
  return s.replace(/[\-‐‑‒–—―〜～~!！?？,，.。'"“”‘’「」『』【】\[\]（）()<>＜＞/:：;；\\|@＠#＃$＄%％^＾&＆*＊+=＋＝]/g,'');
}
function vals(s){return (s??'').toString().split(/[,;\/／、；|\n]+/).map(x=>x.trim()).filter(Boolean)}
function hira(s){return (s??'').toString().replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60))}
function kanaBucket(s){const t=hira((s??'').toString().trim());if(!t)return'他';const c=t[0];const gs={あ:'あいうえおぁぃぅぇぉゔ',か:'かきくけこがぎぐげご',さ:'さしすせそざじずぜぞ',た:'たちつてとだぢづでどっ',な:'なにぬねの',は:'はひふへほばびぶべぼぱぴぷぺぽ',ま:'まみむめも',や:'やゆよゃゅょ',ら:'らりるれろ',わ:'わをんゎ'};for(const [k,v] of Object.entries(gs))if(v.includes(c))return k;return'他'}
function flagPath(lang){return ({英語:'gb',北京語:'cn',広東語:'cn',中国語:'cn',ドイツ語:'de',スウェーデン語:'se'}[lang]||'globe')+'.svg'}

let DATA=null;
const app=document.getElementById('app');
const state={};

function footer(){return `<div class="web-static-footer">ITSUKI Web Song Search<br><span>最終データ更新: ${esc(DATA.generated_at||'')}</span></div>`}
function topNav(){return `<div class="top nav common-user-nav"><a class="navbtn" href="#top">🏠 TOP</a></div>`}
function pageShell(inner, cls='web-static-page'){app.innerHTML=`<div class="wrap ${cls}">${inner}${footer()}</div>`;window.scrollTo(0,0)}

function songMeta(s){return [s.tie_up,s.op_ed,s.tie_up_category,s.release_year?`${s.release_year}年`:'' ].filter(Boolean).join(' / ')}
function songRow(s){
  const tags=[];
  if(s.video_count>1)tags.push(`${s.video_count}動画`);
  for(const x of (s.vocal_labels||[]))tags.push(x);
  for(const x of (s.languages||[]))tags.push(x);
  return `<article class="denmoku-song-row"><div class="denmoku-song-main"><div class="denmoku-song-title">${esc(s.song_name||'曲名不明')}</div><div class="denmoku-song-artist">${esc(s.artists||'歌手情報なし')}</div>${songMeta(s)?`<div class="denmoku-song-meta">${esc(songMeta(s))}</div>`:''}${tags.length?`<div>${tags.map(x=>`<span class="web-chip">${esc(x)}</span>`).join('')}</div>`:''}</div><div class="web-song-count"><strong>✓</strong>選曲可能</div></article>`
}
function renderSongList(target, list, empty='該当する曲がありません', limit=300){
  target.innerHTML='';
  if(!list.length){target.innerHTML=`<div class="denmoku-empty">${esc(empty)}</div>`;return}
  const shown=list.slice(0,limit);
  target.innerHTML=shown.map(songRow).join('')+(list.length>limit?`<div class="web-result-note">${nf(list.length)}曲中、先頭${nf(limit)}曲を表示しています。検索語を追加して絞り込んでください。</div>`:'');
}
function entityRows(list, clickFn){
  return list.map(x=>`<button type="button" class="denmoku-entity-row web-linklike" data-key="${esc(x.key)}"><span><strong>${esc(x.name)}</strong>${x.sub?`<small>${esc(x.sub)}</small>`:''}</span><span class="denmoku-entity-count">${nf(x.count)}曲　›</span></button>`).join('');
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
          <a class="category-btn top-main-btn c-orange" href="#search/artist"><span class="category-icon">🎤</span><span>歌手名</span></a>
          <a class="category-btn top-main-btn c-green" href="#search/title"><span class="category-icon">🎵</span><span>曲名</span></a>
          <a class="category-btn top-main-btn c-blue" href="#all"><span class="category-icon">📚</span><span>全曲一覧</span></a>
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
        </div>
      </section>
    </div>`);
}

const modeLabels={artist:'歌手名',title:'曲名','tie-up':'タイアップ',keyword:'キーワード',lyricist:'作詞',composer:'作曲',arranger:'編曲'};
function modeHay(s,mode){
  if(mode==='title')return norm([s.song_name,s.song_ruby,s.aliases].join(' '));
  if(mode==='artist')return norm(s.artists)+' '+(s.artist_relation_search||'');
  if(mode==='tie-up')return norm([s.tie_up,s.tie_up_ruby,s.series].join(' '));
  if(mode==='lyricist')return norm(s.lyricists)+' '+(s.lyricist_relation_search||'');
  if(mode==='composer')return norm(s.composers)+' '+(s.composer_relation_search||'');
  if(mode==='arranger')return norm(s.arrangers)+' '+(s.arranger_relation_search||'');
  return norm([s.song_name,s.song_ruby,s.song_keyword,s.artists,s.lyricists,s.composers,s.arrangers,s.tags,s.tag_keywords,s.tie_up,s.tie_up_ruby,s.tie_up_category,s.series,s.op_ed,s.aliases].join(' '))+' '+(s.artist_relation_search||'')+' '+(s.lyricist_relation_search||'')+' '+(s.composer_relation_search||'')+' '+(s.arranger_relation_search||'');
}
function renderSearch(mode='title'){
  mode=modeLabels[mode]?mode:'title';document.title=`ITSUKI - ${modeLabels[mode]}検索`;
  pageShell(`${topNav()}<div class="denmoku-page">
    <div class="denmoku-toolbar"><a class="denmoku-top-btn" href="#top">TOP</a><div class="denmoku-searchbox"><input id="searchInput" type="search" autocomplete="off" enterkeyhint="search" placeholder="${esc(modeLabels[mode])}を入力"><button id="clearBtn" type="button">×</button></div><button id="searchBtn" class="denmoku-hit-btn" type="button"><span id="hitCount">0</span><small>Hits</small></button></div>
    <div class="denmoku-tabs"><button data-mode="artist">歌手名</button><button data-mode="title">曲名</button><button data-mode="tie-up">タイアップ</button><button data-mode="keyword">キーワード</button></div>
    <div class="web-search-extra-tabs"><button data-extra="lyricist">作詞</button><button data-extra="composer">作曲</button><button data-extra="arranger">編曲</button></div>
    <div class="denmoku-subbar"><div id="modeGuide">検索語を入力してEnterキーを押してください</div></div>
    <div id="entityHeader" class="denmoku-entity-header" style="display:none"></div>
    <main id="results" class="denmoku-results"><div class="denmoku-empty">検索語を入力してください</div></main>
  </div>`);
  const input=document.getElementById('searchInput'), results=document.getElementById('results'), hit=document.getElementById('hitCount'), header=document.getElementById('entityHeader');
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.onclick=()=>location.hash='#search/'+b.dataset.mode});
  document.querySelectorAll('[data-extra]').forEach(b=>{b.classList.toggle('active',b.dataset.extra===mode);b.onclick=()=>location.hash='#search/'+b.dataset.extra});
  const entityMode=['artist','tie-up','lyricist','composer','arranger'].includes(mode);
  document.getElementById('modeGuide').textContent=entityMode?`${modeLabels[mode]}を検索し、候補を選択してください`:`${modeLabels[mode]}だけを対象に検索します`;
  function doSearch(){
    const q=norm(input.value);header.style.display='none';
    if(!q){hit.textContent='0';results.innerHTML='<div class="denmoku-empty">検索語を入力してください</div>';return}
    if(entityMode){
      const field=mode==='artist'?'artists':mode==='tie-up'?'tie_up':mode==='lyricist'?'lyricists':mode==='composer'?'composers':'arrangers';
      const map=new Map();
      for(const s of DATA.songs){if(!modeHay(s,mode).includes(q))continue;const names=mode==='artist'||mode==='tie-up'?[s[field]]:vals(s[field]);for(const name0 of names){const name=(name0||'').trim();if(!name)continue;const key=norm(name);if(!map.has(key))map.set(key,{key,name,count:0,ids:new Set(),related:!norm(name).includes(q)});const e=map.get(key);e.ids.add(s.id);e.count=e.ids.size}}
      const list=[...map.values()].sort((a,b)=>(a.related-b.related)||a.name.localeCompare(b.name,'ja'));
      hit.textContent=String(list.length);results.innerHTML=entityRows(list.map(x=>({...x,sub:x.related?'関連名義・関連人物を含む':''})));bindEntityClicks(results,list,x=>{header.style.display='flex';header.innerHTML=`<button type="button">← 検索結果へ</button><strong>${esc(x.name)}</strong>`;header.querySelector('button').onclick=doSearch;const songs=DATA.songs.filter(s=>mode==='artist'?norm(s.artists)===x.key:mode==='tie-up'?norm(s.tie_up)===x.key:vals(s[field]).some(v=>norm(v)===x.key));hit.textContent=String(songs.length);renderSongList(results,songs)});
    }else{
      const list=DATA.songs.filter(s=>modeHay(s,mode).includes(q));hit.textContent=String(list.length);renderSongList(results,list);
    }
  }
  document.getElementById('searchBtn').onclick=doSearch;document.getElementById('clearBtn').onclick=()=>{input.value='';doSearch();input.focus()};input.onkeydown=e=>{if(e.key==='Enter')doSearch()};input.focus();
}

const featureDefs={
  'mv-pv':['mv_pv','🎬','MV・PV','MV / PVタグが付いた曲を歌手名から選択'],
  'live':['live','🎙️','LIVEカラオケ','LIVEタグが付いた曲を歌手名から選択'],
  'anime':['anime','📺','アニメ・ゲーム映像','MADタグ＋アニメ・ゲーム系タイアップから選択'],
  'parts':['parts','👥','パート分け','キーワード「パート分け」の曲を歌手名から選択']
};
function renderFeature(slug){const d=featureDefs[slug]||featureDefs['mv-pv'];const rows=DATA.songs.filter(s=>s.features&&s.features[d[0]]);document.title='ITSUKI - '+d[2];pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">${d[1]}</div><div><div class="browse-title">${d[2]}</div><div class="browse-note">${d[3]}</div></div></header><div id="entityHeader" class="browse-entity-header" style="display:none"></div><main id="browseResults" class="browse-results"></main>`,'browse-page');const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader');const map=new Map();for(const s of rows){const name=(s.artists||'歌手情報なし').trim();const key=norm(name);if(!map.has(key))map.set(key,{key,name,count:0,ids:new Set()});const e=map.get(key);e.ids.add(s.id);e.count=e.ids.size}const list=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));root.innerHTML=entityRows(list);bindEntityClicks(root,list,x=>{head.style.display='flex';head.innerHTML=`<button type="button">← 歌手一覧へ</button><strong>${esc(x.name)}</strong>`;head.querySelector('button').onclick=()=>renderFeature(slug);renderSongList(root,rows.filter(s=>norm(s.artists)===x.key))})}

function renderAll(){document.title='ITSUKI - 全曲一覧';pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">📚</div><div><div class="browse-title">全曲一覧</div><div class="browse-note">選曲可能な${nf(DATA.song_count)}曲</div></div></header><main id="browseResults" class="browse-results"></main>`,'browse-page');renderSongList(document.getElementById('browseResults'),DATA.songs,'',500)}

function renderForeign(){const counts=new Map();for(const s of DATA.songs)for(const l of (s.languages||[]))counts.set(l,(counts.get(l)||0)+1);const langs=[...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ja'));document.title='ITSUKI - 外国曲';pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">🌐</div><div><div class="browse-title">外国曲</div><div class="browse-note">言語を選択して曲一覧を表示</div></div></header><div id="entityHeader" class="browse-entity-header" style="display:none"></div><main id="browseResults" class="browse-results"><div class="web-language-grid">${langs.map(([l,c])=>`<button class="web-language-btn" data-lang="${esc(l)}"><img src="./assets/flags/${flagPath(l)}" alt=""><strong>${esc(l)}</strong><small>${nf(c)}曲</small></button>`).join('')}</div></main>`,'browse-page');const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader');root.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{const l=b.dataset.lang;head.style.display='flex';head.innerHTML=`<button type="button">← 言語一覧へ</button><strong>${esc(l)}</strong>`;head.querySelector('button').onclick=renderForeign;renderSongList(root,DATA.songs.filter(s=>(s.languages||[]).includes(l)))})}

function renderTieup(){document.title='ITSUKI - タイアップ';const catMap=new Map(),seriesMap=new Map();for(const s of DATA.songs){const ids=vals(s.tie_up_category_id),names=vals(s.tie_up_category);ids.forEach((id,i)=>{const name=names[i]||id;if(!catMap.has(id))catMap.set(id,{key:id,name,count:0,ids:new Set()});const e=catMap.get(id);e.ids.add(s.id);e.count=e.ids.size});for(const ser of vals(s.series)){const k=norm(ser);if(!seriesMap.has(k))seriesMap.set(k,{key:k,name:ser,count:0,ids:new Set()});const e=seriesMap.get(k);e.ids.add(s.id);e.count=e.ids.size}}
  pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">🎞️</div><div><div class="browse-title">タイアップ</div><div class="browse-note">シリーズまたはジャンルからタイアップを探します</div></div></header><div id="entityHeader" class="browse-entity-header" style="display:none"></div><main id="browseResults" class="browse-results"></main>`,'browse-page');const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader');
  function rootView(){head.style.display='none';const cats=[...catMap.values()].sort((a,b)=>a.key.localeCompare(b.key));root.innerHTML=`<div class="web-browse-grid"><button class="denmoku-entity-row" id="seriesBtn"><span><strong>📚 シリーズ</strong></span><span class="denmoku-entity-count">${nf(seriesMap.size)}件　›</span></button>${cats.map(x=>`<button class="denmoku-entity-row" data-cat="${esc(x.key)}"><span><strong>${esc(x.name)}</strong></span><span class="denmoku-entity-count">${nf(x.count)}曲　›</span></button>`).join('')}</div>`;root.querySelector('#seriesBtn').onclick=seriesView;root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>tieupsFor(s=>vals(s.tie_up_category_id).includes(b.dataset.cat),catMap.get(b.dataset.cat).name,rootView))}
  function seriesView(){head.style.display='flex';head.innerHTML='<button type="button">← ジャンル一覧へ</button><strong>シリーズ</strong>';head.querySelector('button').onclick=rootView;const list=[...seriesMap.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));root.innerHTML=entityRows(list);bindEntityClicks(root,list,x=>tieupsFor(s=>vals(s.series).some(v=>norm(v)===x.key),x.name,seriesView))}
  function tieupsFor(pred,label,back){head.style.display='flex';head.innerHTML=`<button type="button">← 一覧へ</button><strong>${esc(label)}</strong>`;head.querySelector('button').onclick=back;const map=new Map();for(const s of DATA.songs.filter(pred)){if(!s.tie_up)continue;const k=norm(s.tie_up);if(!map.has(k))map.set(k,{key:k,name:s.tie_up,count:0,ids:new Set(),sub:s.tie_up_category||''});const e=map.get(k);e.ids.add(s.id);e.count=e.ids.size}const list=[...map.values()].sort((a,b)=>(hira(a.name)).localeCompare(hira(b.name),'ja'));root.innerHTML=entityRows(list);bindEntityClicks(root,list,x=>{head.innerHTML=`<button type="button">← タイアップ一覧へ</button><strong>${esc(x.name)}</strong>`;head.querySelector('button').onclick=()=>tieupsFor(pred,label,back);renderSongList(root,DATA.songs.filter(s=>norm(s.tie_up)===x.key&&pred(s)))})}
  rootView();
}

function renderEra(){document.title='ITSUKI - あの頃・この頃';const currentYear=new Date().getFullYear();const cats=new Map();for(const s of DATA.songs){const ids=vals(s.tie_up_category_id),names=vals(s.tie_up_category);ids.forEach((id,i)=>{if(id&&!cats.has(id))cats.set(id,names[i]||id)})}pageShell(`${topNav()}<div class="era-shell"><div class="era-head"><span>🕒</span><div><h1>あの頃・この頃</h1><p>年代から選曲できる曲を探します</p></div></div><div class="era-panel"><div class="web-era-controls"><div class="web-era-mode"><button id="modeYear" class="active">年から探す</button><button id="modeAge">年齢から探す</button></div><div class="web-era-fields"><label><span id="field1Label">西暦</span><input id="field1" type="number" value="${currentYear}" min="1901" max="2199"></label><label><span id="field2Label">ジャンル</span><select id="genre"><option value="">すべて</option>${[...cats].sort((a,b)=>a[0].localeCompare(b[0])).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('')}</select></label><label id="ageNowWrap" style="display:none"><span>現在の年齢</span><input id="ageNow" type="number" value="30" min="0" max="120"></label><label id="ageThenWrap" style="display:none"><span>当時の年齢</span><input id="ageThen" type="number" value="18" min="0" max="120"></label></div><button class="web-primary-btn" id="eraSearch">検索</button><div id="eraComputed" class="era-computed"></div></div></div></div><main id="eraResults" class="denmoku-results era-results"><div class="denmoku-empty">条件を指定して検索してください</div></main>`,'era-page');let mode='year';const fy=document.getElementById('field1'),genre=document.getElementById('genre'),res=document.getElementById('eraResults'),computed=document.getElementById('eraComputed');function sw(m){mode=m;document.getElementById('modeYear').classList.toggle('active',m==='year');document.getElementById('modeAge').classList.toggle('active',m==='age');document.getElementById('ageNowWrap').style.display=m==='age'?'grid':'none';document.getElementById('ageThenWrap').style.display=m==='age'?'grid':'none';fy.parentElement.style.display=m==='year'?'grid':'none'}document.getElementById('modeYear').onclick=()=>sw('year');document.getElementById('modeAge').onclick=()=>sw('age');document.getElementById('eraSearch').onclick=()=>{let year;if(mode==='year')year=Number(fy.value);else year=currentYear-Number(document.getElementById('ageNow').value)+Number(document.getElementById('ageThen').value);computed.textContent=`対象年：${year}年`;const g=genre.value;const list=DATA.songs.filter(s=>(String(s.release_year)===String(year)||String(s.tie_up_release_year)===String(year))&&(!g||vals(s.tie_up_category_id).includes(g)));renderSongList(res,list,`${year}年に該当する曲がありません`)} }

function isoWeek(ts){const d=new Date(ts*1000);const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);const yearStart=new Date(Date.UTC(x.getUTCFullYear(),0,1));const week=Math.ceil((((x-yearStart)/86400000)+1)/7);return `${x.getUTCFullYear()}-W${String(week).padStart(2,'0')}`}
function renderUpdates(){document.title='ITSUKI - 新曲・更新曲';const days=Number(DATA.new_update_days||15),cut=Math.floor(Date.now()/1000)-days*86400;const list=DATA.songs.filter(s=>Number(s.updated_at||0)>=cut).sort((a,b)=>Number(b.updated_at)-Number(a.updated_at));const groups=new Map();for(const s of list){const k=isoWeek(s.updated_at);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s)};pageShell(`${topNav()}<div class="updates-head"><div><div class="big">✨ 新曲・更新曲</div><div class="muted">直近${days}日間 / ${nf(list.length)}曲</div></div></div><main id="updatesResults"></main>`,'updates-page');const root=document.getElementById('updatesResults');if(!list.length){root.innerHTML='<div class="card"><span class="muted">指定期間内の新曲・更新曲はありません</span></div>';return}root.innerHTML=[...groups.entries()].map(([k,items])=>`<section class="update-group"><div class="update-group-title">${esc(k)}</div><div class="update-group-list">${items.map(songRow).join('')}</div></section>`).join('')}

function route(){const h=(location.hash||'#top').replace(/^#/,'');const [a,b]=h.split('/');if(a==='top'||!a)return renderTop();if(a==='search')return renderSearch(b||'title');if(a==='feature')return renderFeature(b);if(a==='all')return renderAll();if(a==='foreign')return renderForeign();if(a==='tieup')return renderTieup();if(a==='era')return renderEra();if(a==='updates')return renderUpdates();renderTop()}

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
