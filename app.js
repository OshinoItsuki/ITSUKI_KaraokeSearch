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
function topCustomLinksHtml(items,includeSettings=false){
  const links=(Array.isArray(items)?items:[]).filter(x=>x&&x.url&&x.label);
  if(!links.length&&!includeSettings)return '';
  const buttons=links.map(x=>{
    const color=/^#[0-9a-f]{6}$/i.test(x.color||'')?x.color:'#4f8cff';
    return `<a class="category-btn top-custom-btn" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" style="background:linear-gradient(180deg,${color},${topLinkShade(color)})">${x.emoji?`<span class="category-icon">${esc(x.emoji)}</span>`:''}<span>${esc(x.label)}</span></a>`;
  });
  if(includeSettings)buttons.push(`<a class="category-btn top-custom-btn dam-display-shortcut" href="#settings"><span class="category-icon">⚙️</span><span>表示切替</span></a>`);
  return `<div class="top-custom-grid${includeSettings?' has-display-shortcut':''}">${buttons.join('')}</div>`;
}

let DATA=null;
const app=document.getElementById('app');
const state={};
const THEME_KEY='itsuki-web-theme';
const THEMES=new Set(['joy','dam']);
function currentTheme(){
  try{const saved=localStorage.getItem(THEME_KEY);return saved==='joy'?'joy':(saved==='dam'||saved==='classic'?'dam':'joy')}catch(e){return 'joy'}
}
function applyTheme(theme){
  const value=theme==='classic'?'dam':(THEMES.has(theme)?theme:'joy');
  document.documentElement.dataset.theme=value;
  if(document.body)document.body.dataset.theme=value;
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=value==='joy'?'#181818':'#0d0d0d';
  return value;
}
function setTheme(theme){const value=applyTheme(theme);try{localStorage.setItem(THEME_KEY,value)}catch(e){}return value}
applyTheme(currentTheme());

function formatGeneratedAt(value){
  const raw=String(value||'').trim();if(!raw)return '更新日時不明';
  const d=new Date(raw);if(Number.isNaN(d.getTime()))return raw;
  const parts=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(d);
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}年${Number(get('month'))}月${Number(get('day'))}日　${Number(get('hour'))}時${get('minute')}分${get('second')}秒更新`;
}
function footer(){return `<div class="web-static-footer"><strong>ITSUKI Web Song Search</strong><br><span>${esc(formatGeneratedAt(DATA.generated_at))}</span></div>`}
function joyHeader(){return `<nav class="joy-command-bar" aria-label="Web検索メニュー"><a class="joy-home-tab" href="#top"><strong>曲を選ぶ</strong><small>WEB検索 TOPへ</small></a><a href="#search/title">🎵 曲名</a><a href="#search/person">🎤 人物</a><a href="#tieup">🎞 タイアップ</a><a href="#feature/anime">📺 映像</a><a class="joy-reserve-tab" href="#updates">✨ 新譜</a><a class="joy-settings-tab" href="#settings">⚙ 表示</a></nav>`}
function topNav(home=false){return home?'':`<div class="top nav common-user-nav classic-nav"><a class="navbtn" href="#top">🏠 TOP</a><a class="navbtn" href="#settings">⚙ 表示設定</a></div>`}
function pageShell(inner, cls='web-static-page'){
  app.innerHTML=`<div class="wrap ${cls} joy-stage">${joyHeader()}${inner}${footer()}</div>`;
  window.scrollTo(0,0);
}

function tieUpDisplay(s){
  if(!s)return '';
  const name=String(s.tie_up||'').trim();if(!name)return '';
  // KaraokeLocal本体と同じ優先順: カテゴリ細分類 > カテゴリ。
  // Modern KVDB stores fine classifications in normalized detail tables;
  // tie_up_sub_category remains only as compatibility for old exports.
  const canonicalFine=categoryVals(s.tie_up_category_detail||'').filter(x=>x&&x!=='-').join(' / ');
  const legacyFine=categoryVals(s.tie_up_sub_category||'').filter(x=>x&&x!=='-').join(' / ');
  const broad=categoryVals(s.tie_up_category||'').filter(x=>x&&x!=='-').join(' / ');
  const label=canonicalFine||legacyFine||broad;
  const type=String(s.op_ed||'').trim();
  return `${label}${name?`「${name}」`:''}${type&&type!=='-'?type:''}`;
}
function tieUpDetailIds(s){return categoryVals(s?.tie_up_category_detail_ids||'')}
function categoryDetailMaster(){return Array.isArray(DATA?.category_details)?DATA.category_details:[]}
function categoryDetailDescendants(detailId){
  const all=categoryDetailMaster(),found=new Set([String(detailId||'')]),queue=[String(detailId||'')];
  while(queue.length){const parent=queue.shift();for(const x of all){const id=String(x?.id||'');if(id&&String(x?.parent_id||'')===parent&&!found.has(id)){found.add(id);queue.push(id)}}}
  return found;
}
function songMeta(s){return [tieUpDisplay(s),s.release_year?`${s.release_year}年`:'' ].filter(Boolean).join(' / ')}
function songHref(s){return `#song/${encodeURIComponent(String(s?.id||''))}`}
function entityHref(mode,value){if(['artist','lyricist','composer','arranger'].includes(mode))return `#person/${encodeURIComponent(String(value||''))}/${encodeURIComponent(mode)}`;return `#entity/${encodeURIComponent(String(mode||''))}/${encodeURIComponent(String(value||''))}`}
function songFeatureTags(s){
  const out=[];const f=s?.features||{};
  if(f.anime)out.push(['アニメ映像','anime']);
  if(f.tokusatsu)out.push(['特撮映像','tokusatsu']);
  if(f.live)out.push(['ライブ映像','live']);
  if(f.parts)out.push(['パート分け','parts']);
  return out;
}
function songRow(s){
  const tags=[];
  if(s.video_count>1)tags.push(`${s.video_count}動画`);
  for(const x of (s.vocal_labels||[]))tags.push(x);
  for(const x of (s.languages||[]))tags.push(x);
  const ft=songFeatureTags(s);
  const featureHtml=ft.length?ft.map(([label,key])=>`<span class="web-list-feature-tag ${key}">${esc(label)}</span>`).join(''):`<span class="web-list-feature-tag none">♪</span>`;
  return `<a class="denmoku-song-row web-song-row-link" href="${songHref(s)}"><div class="web-list-feature-column">${featureHtml}</div><div class="denmoku-song-main"><div class="denmoku-song-title">${esc(s.song_name||'曲名不明')}</div><div class="denmoku-song-artist">${esc(s.artists||'歌手情報なし')}</div>${songMeta(s)?`<div class="denmoku-song-meta">${esc(songMeta(s))}</div>`:''}${tags.length?`<div>${tags.map(x=>`<span class="web-chip">${esc(x)}</span>`).join('')}</div>`:''}</div><div class="web-song-count web-detail-open"><strong>›</strong>詳細</div></a>`
}
function renderSongList(target, list, empty='該当する曲がありません', limit=300){
  target.innerHTML='';
  if(!list.length){target.innerHTML=`<div class="denmoku-empty">${esc(empty)}</div>`;return}
  // Centralize KaraokeLocal v1.3.0's result-order rule so every static song
  // list behaves the same: mixed artists -> artist 50-on then song reading;
  // one credited artist -> song reading only.
  const ordered=sortSongsByReading(list);
  const shown=ordered.slice(0,limit);
  target.innerHTML=shown.map(songRow).join('')+(ordered.length>limit?`<div class="web-result-note">${nf(ordered.length)}曲中、先頭${nf(limit)}曲を表示しています。検索語を追加して絞り込んでください。</div>`:'');
}
function entityRows(list, clickFn){
  return list.map(x=>`<button type="button" class="denmoku-entity-row web-linklike" data-key="${esc(x.key)}"><span><strong>${esc(x.name)}</strong>${x.sub?`<small class="web-entity-sub">${esc(x.sub)}</small>`:''}</span><span class="denmoku-entity-count">${nf(x.count)}曲　›</span></button>`).join('');
}
function bindEntityClicks(root, list, fn){root.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>fn(list.find(x=>x.key===b.dataset.key)))}

// Exporter supplies an ordered catalog; images are stored under assets/shop/.
function creatorShopHtml(){
  const items=Array.isArray(window.ITSUKI_SHOP_LINKS)?window.ITSUKI_SHOP_LINKS:[];
  if(!items.length)return '';
  const cards=items.map(item=>{
    const href=String(item.url||'');
    if(!/^https?:\/\//i.test(href))return '';
    const thumb=item.image?`<img class="creator-shop-thumbnail" src="${esc(item.image)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`:'';
    return `<a class="creator-shop-card" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${thumb}<span class="creator-shop-icon" aria-hidden="true" style="${thumb?'display:none':''}">🛍️</span><span class="creator-shop-text"><strong>${esc(item.title||'販売ページ')}</strong><small>${esc(item.description||'販売ページを見る')}</small></span><span class="creator-shop-arrow" aria-hidden="true">↗</span></a>`;
  }).join('');
  return `<section class="creator-shop" aria-label="オリジナルグッズ・スタンプ"><div class="creator-shop-heading"><span>🎁 オリジナルグッズ・スタンプ</span><small>公式販売ページ</small></div><div class="creator-shop-grid">${cards}</div></section>`;
}

// The official YouTube channel is a direct external link, not a video embed.
// Keep it independent of shop_links.json and only show it on TOP.
function creatorYoutubeHtml(){
  return `<section class="creator-youtube" aria-label="公式YouTubeチャンネル"><a class="creator-youtube-button" href="https://www.youtube.com/channel/UCEBuTXqgPftB6q36HtILlgA" target="_blank" rel="noopener noreferrer" aria-label="犬こ屋 公式YouTubeチャンネルを見る（新しいタブ）"><span class="creator-youtube-mark" aria-hidden="true"><svg viewBox="0 0 28 20" width="32" height="24" focusable="false"><rect x="0" y="0" width="28" height="20" rx="6" fill="currentColor"/><path d="M11 5.2L19 10L11 14.8Z" fill="#fff"/></svg></span><span class="creator-youtube-text"><strong>YouTube 公式チャンネル</strong><small>動画はこちらからチェック！</small></span><span class="creator-youtube-arrow" aria-hidden="true">↗</span></a></section>`;
}


// Voluntary support for video production and original software development.
// Do not accept gift card codes on the site or add them to URLs / analytics.
function creatorSupportHtml(){
  return `<section class="creator-support" aria-label="制作・開発支援">
    <div class="creator-support-heading"><span aria-hidden="true">🎁</span><strong>動画制作・ツール開発を応援する</strong></div>
    <p class="creator-support-description">いただいたご支援は、動画制作や各種オリジナルツールの開発費用に役立てます！</p>
    <p class="creator-support-note">Amazonギフトカードで150円～（手数料なし）から応援できるよ！ ご支援は任意です。</p>
    <div class="creator-support-actions">
      <a class="creator-support-amazon" href="https://www.amazon.co.jp/dp/B06X982RQ9?th=1&amp;gpo=150" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">🎁</span> Amazonギフトカードを購入 <span aria-hidden="true">↗</span></a>
      <a class="creator-support-x" href="https://x.com/Itsuki_karaoke" target="_blank" rel="noopener noreferrer"><span class="creator-support-x-icon" aria-hidden="true">𝕏</span> 忍野カラオケ製作所のDMへ <span aria-hidden="true">↗</span></a>
    </div>
    <p class="creator-support-instructions">購入したギフトコードは、X（@Itsuki_karaoke）のDMで送ってね。<strong>公開ポストやリプライには記載しないでください。</strong></p>
  </section>`;
}

// AdMax ad is mounted only on TOP. Never insert it into search results or
// create synthetic refreshes/impressions. Missing ad scripts do not block navigation.
function mountTopAd(){
  const slot=document.getElementById('itsuki-top-admax-slot');
  if(!slot)return;
  const script=document.createElement('script');
  script.src='https://adm.shinobi.jp/s/7b255a8a84e1a99b2cf3daf98e0e89b8';
  script.async=true;
  script.onerror=()=>{slot.classList.add('admax-unavailable')};
  slot.appendChild(script);
}
function topAdHtml(){
  return `<section class="web-top-admax" aria-label="スポンサー広告"><div class="web-top-admax-title">広告</div><div id="itsuki-top-admax-slot" class="web-top-admax-slot"></div></section>`;
}

function renderTop(){
  document.title='ITSUKI - 曲検索';
  pageShell(`
    ${topNav(true)}
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
          <a class="category-btn top-middle-btn c-orange" href="#feature/tokusatsu"><span class="category-icon">⚡</span><span>特撮映像</span></a>
          <a class="category-btn top-middle-btn c-sky" href="#feature/parts"><span class="category-icon">👥</span><span>パート分け</span></a>
          <a class="category-btn top-middle-btn c-rose" href="#era"><span class="category-icon">🕒</span><span>あの頃・この頃</span></a>
          <a class="category-btn top-middle-btn c-gold" href="#search/keyword"><span class="category-icon">🔎</span><span>キーワード</span></a>
          <a class="category-btn top-middle-btn c-teal" href="#tieup"><span class="category-icon">🎞️</span><span>タイアップ</span></a>
          <a class="category-btn top-middle-btn c-purple" href="#foreign"><span class="category-icon">🌐</span><span>外国曲</span></a>
          <a class="category-btn top-middle-btn c-blue" href="#all"><span class="category-icon">📚</span><span>全曲一覧</span></a>
        </div>
        ${topCustomLinksHtml(DATA.home_links,currentTheme()==='dam')}
      </section>
      ${creatorShopHtml()}
      ${creatorYoutubeHtml()}
      ${creatorSupportHtml()}
      ${topAdHtml()}
    </div>`);
  mountTopAd();
}

const modeLabels={person:'人物',artist:'歌手',lyricist:'作詞',composer:'作曲',arranger:'編曲',title:'曲名','tie-up':'タイアップ',keyword:'キーワード'};
const modePlaceholders={person:'人物名を入力',title:'曲名を入力','tie-up':'タイアップ名を入力',keyword:'キーワードを入力'};
const roleOrder=['artist','lyricist','composer','arranger'];
function peopleArray(){return Array.isArray(DATA.people)?DATA.people:[]}
function peopleMap(){const m=new Map();for(const p of peopleArray())m.set(norm(p.name),p);return m}
function roleCounts(p){const out={};for(const r of roleOrder)out[r]=Array.isArray(p?.roles?.[r])?p.roles[r].length:0;return out}
function personTotalCount(p){const ids=new Set();for(const r of roleOrder)for(const id of (p?.roles?.[r]||[]))ids.add(String(id));return ids.size}
function songReadingKey(s){
  const filename=String(s?.filename||'').replace(/\.[^.]+$/,'');
  const title=String(s?.song_name||filename||'').trim();
  const reading=String(s?.song_ruby||title).trim();
  return hira(reading)+'\u0000'+hira(title)+'\u0000'+String(s?.filename||'')+'\u0000'+String(s?.id||s?.song_id||'');
}
function artistReadingKey(s){
  const artist=String(s?.artists||'').trim();
  const reading=String(s?.artist_rubies||'').trim();
  return `${artist?'0':'1'}\u0000${hira(reading||artist)}\u0000${artist}`;
}
function sortSongsByReading(list){
  const rows=[...(list||[])];
  const artists=new Set(rows.map(s=>norm(String(s?.artists||'').trim())).filter(Boolean));
  // KaraokeLocal v1.3.0: only lists that actually mix credited artists are
  // grouped by singer 50-on order. Artist-scoped pages keep song-reading order.
  rows.sort((a,b)=>{
    if(artists.size>1){const ar=artistReadingKey(a).localeCompare(artistReadingKey(b),'ja');if(ar)return ar}
    return songReadingKey(a).localeCompare(songReadingKey(b),'ja');
  });
  return rows;
}
function songsForIds(ids){const wanted=new Set((ids||[]).map(String));return sortSongsByReading(DATA.songs.filter(s=>wanted.has(String(s.id))))}
function directNameMatch(name,q,mode){const n=norm(name);if(mode==='exact')return n===q;if(mode==='prefix')return n.startsWith(q);return n.includes(q)}
function ordinaryPersonReason(p,q){
  if(!p||!q)return null;
  if(norm(p.name).includes(q))return '';
  if(String(p.own_search||'').includes(q))return '';
  if(String(p.alias_search||'').includes(q))return '別名義';
  if(String(p.members_for_group_search||'').includes(q))return '所属グループ';
  if(String(p.groups_for_member_search||'').includes(q))return '所属メンバー';
  if(String(p.group_search||'').includes(q))return '関連人物';
  if(String(p.other_search||'').includes(q))return '関連人物';
  if(String(p.relation_search||'').includes(q))return '関連人物';
  return null;
}
function combinedArtistReason(p,q,pmap){
  const reasons=[];
  for(const name of (p.combined_members||[])){
    const mp=pmap.get(norm(name));const r=ordinaryPersonReason(mp||{name},q);if(r!==null)reasons.push(r);
  }
  if(!reasons.length&&norm(p.name).includes(q))return '連名';
  if(!reasons.length)return null;
  if(reasons.some(r=>r===''||r==='別名義'))return '連名';
  if(reasons.includes('所属グループ'))return '所属グループ';
  if(reasons.includes('所属メンバー'))return '所属メンバー';
  return '関連人物';
}
function personCandidateReason(p,q,matchMode,pmap){
  if(directNameMatch(p.name,q,matchMode))return p.combined_artist_credit&&norm(p.name)!==q?'連名':'';
  if(matchMode==='partial'&&String(p.own_search||'').includes(q))return '';
  if(p.combined_artist_credit)return combinedArtistReason(p,q,pmap);
  const rr=ordinaryPersonReason(p,q);return rr!==null&&rr!==''?rr:null;
}
function personRelationLabel(reason){return (!reason||reason==='連名')?'':`(${reason})`}
function combinedCreditsFor(memberName,pmap,exclude=new Set()){
  const key=norm(memberName),out=[];
  for(const p of pmap.values()){
    const pk=norm(p.name);if(!p.combined_artist_credit||pk===key||exclude.has(pk))continue;
    const members=(p.combined_members||[]).map(norm);const pos=members.indexOf(key);if(pos>=0)out.push({p,pos});
  }
  return out.sort((a,b)=>a.pos-b.pos||String(a.p.name).localeCompare(String(b.p.name),'ja'));
}
function personTreeLeafData(name,relation,pmap,kind='related'){
  const p=pmap.get(norm(name));const count=p?personTotalCount(p):0;
  return {name:p?.name||name,count,role_counts:p?roleCounts(p):{},relation,relation_label:personRelationLabel(relation),selectable:!!p&&count>0,kind,children:[]};
}
function buildPersonFamily(rootName,pmap,ancestors=new Set(),depth=0,claimed=new Set()){
  const root=pmap.get(norm(rootName));if(!root)return[];
  const rootKey=norm(root.name),localAnc=new Set(ancestors),children=[],seen=new Set();localAnc.add(rootKey);
  const add=(item,force=false)=>{const k=norm(item?.name);if(!k||seen.has(k)||!item?.name)return false;if(!force&&claimed.has(k))return false;seen.add(k);claimed.add(k);children.push(item);return true};
  add(personTreeLeafData(root.name,'',pmap,'single'),true);
  for(const {p:credit,pos} of combinedCreditsFor(root.name,pmap,localAnc)){
    const item=personTreeLeafData(credit.name,'',pmap,'combined');item._group=1;item._pos=pos;add(item);
  }
  const rels=Array.isArray(root.related)?root.related:[];
  const buckets={alias:[],group:[],member:[],other:[]};
  for(const r of rels){const rel=String(r.relation||'関連人物');if(rel==='別名義')buckets.alias.push(r);else if(rel==='所属グループ')buckets.group.push(r);else if(rel==='所属メンバー')buckets.member.push(r);else buckets.other.push(r)}
  const byName=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja');
  for(const r of buckets.alias.sort(byName)){
    const k=norm(r.name);if(!k||localAnc.has(k)||claimed.has(k))continue;
    const item=personTreeLeafData(r.name,'別名義',pmap,'alias');item._group=2;claimed.add(k);
    if(depth<6&&pmap.has(k)){
      const nested=buildPersonFamily(r.name,pmap,localAnc,depth+1,claimed);const keys=treePersonKeys(nested);
      if(keys.size>1){item.children=nested;item.tree_count=keys.size}
    }
    seen.add(k);children.push(item);
  }
  for(const r of buckets.group.sort(byName)){
    const k=norm(r.name);if(!k||localAnc.has(k)||claimed.has(k))continue;
    const item=personTreeLeafData(r.name,'所属グループ',pmap,'group');item._group=3;claimed.add(k);
    if(pmap.has(k)){
      const nested=[personTreeLeafData(r.name,'',pmap,'group-self')],nestedKeys=new Set([k]);
      for(const {p:credit,pos} of combinedCreditsFor(r.name,pmap,localAnc)){
        const ck=norm(credit.name);if(claimed.has(ck)||nestedKeys.has(ck))continue;claimed.add(ck);nestedKeys.add(ck);
        const c=personTreeLeafData(credit.name,'所属グループ',pmap,'group-combined');c._pos=pos;nested.push(c);
      }
      if(nested.length>1){item.children=nested;item.tree_count=nestedKeys.size}
    }
    seen.add(k);children.push(item);
  }
  for(const r of buckets.member.sort(byName)){const item=personTreeLeafData(r.name,'所属メンバー',pmap,'member');item._group=5;add(item)}
  for(const r of buckets.other.sort(byName)){const item=personTreeLeafData(r.name,'関連人物',pmap,'related');item._group=6;add(item)}
  children.sort((a,b)=>(a._group??0)-(b._group??0)||(a._pos??999)-(b._pos??999)||String(a.name).localeCompare(String(b.name),'ja'));
  return children;
}
function treePersonKeys(items,out=new Set()){for(const x of (items||[])){const k=norm(x?.name);if(k)out.add(k);if(x?.children?.length)treePersonKeys(x.children,out)}return out}
function fileSearchNorm(value,fuzzy=true){const t=String(value||'').normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/　/g,' ');return fuzzy?norm(t):t.trim()}
function fileSearchCandidates(v){const vals=[v.name,v.rel_path].filter(Boolean),out=[];for(const raw of vals){if(!out.includes(raw))out.push(raw);for(const part of String(raw).split(/[\\/]+/)){const x=part.trim();if(x&&!out.includes(x))out.push(x)}}return out}
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
    const linkedInfo=song?`${song.song_name||'曲名情報なし'} / ${song.artists||'歌手情報なし'}`:'DB未紐づけ';
    const inner=`<div class="denmoku-song-main"><div class="denmoku-song-title">${esc(v.name||'動画')}</div><div class="denmoku-song-artist">${esc(linkedInfo)}</div><div class="denmoku-song-meta">${esc(v.rel_path||'')}</div></div><div class="web-song-count web-detail-open"><strong>${song?'›':'―'}</strong>${song?'詳細':'情報'}</div>`;
    return song?`<a class="denmoku-song-row web-song-row-link" href="${songHref(song)}">${inner}</a>`:`<div class="denmoku-song-row">${inner}</div>`;
  }).join('')+(list.length>300?`<div class="web-result-note">${nf(list.length)}件中、先頭300件を表示しています。</div>`:'');
}
function renderSearch(initialMode='title',directPerson='',directRole=''){
  let currentMode=['person','title','tie-up','keyword'].includes(initialMode)?initialMode:'title';
  let selectedEntity='',selectedRole='',selectedRoleCounts={},selectedRelations=[],lastEntityQuery='',personTrail=[],lastSongResults=[],currentSongKanaBucket='';
  document.title=`ITSUKI - ${currentMode==='person'?'人物検索':modeLabels[currentMode]+'検索'}`;
  app.innerHTML=`<div class="wrap denmoku-page">
    ${joyHeader()}
    <div class="denmoku-toolbar"><a class="denmoku-top-btn" href="#top">TOP</a><div class="denmoku-searchbox"><input id="searchInput" type="search" autocomplete="off" enterkeyhint="search" placeholder="検索語を入力"><button id="clearBtn" type="button" title="入力を消去">×</button></div><button id="searchBtn" class="denmoku-hit-btn" type="button"><span id="hitCount">0</span><small>Hits</small></button></div>
    <div id="searchTabs" class="denmoku-tabs" role="tablist" aria-label="検索対象"></div>
    <div id="featureFilterPanel" class="web-search-feature-filters" aria-label="曲の特徴で絞り込み" style="display:none"><span class="web-filter-title">絞り込み</span><button type="button" data-feature-filter="anime">アニメ・ゲーム映像</button><button type="button" data-feature-filter="tokusatsu">特撮映像</button><button type="button" data-feature-filter="live">ライブ映像</button><button type="button" data-feature-filter="parts">パート分け</button><small>複数選択はAND条件 / 4つすべてONで解除</small></div>
    <div class="denmoku-subbar"><div id="modeGuide">検索語を入力してEnterキーを押してください</div></div>
    <div id="fileOnlyPanel" class="denmoku-file-only" style="display:none"><label class="file-only-main"><input id="fileOnly" type="checkbox"> ファイル名・フォルダ名だけで検索</label><div id="fileSearchOptions" class="denmoku-file-search-options" style="display:none"><label><span>一致方法</span><select id="fileMatchMode"><option value="partial">部分一致</option><option value="exact">完全一致</option><option value="prefix">前方一致</option><option value="suffix">後方一致</option></select></label><label class="check-label"><input id="fileFuzzy" type="checkbox" checked> 記号・スペースをあいまいにする</label></div><small>あいまいONでは空白・_・記号の違いを無視します。公開済みの相対パスだけを検索します。</small></div>
    <div id="personSearchOptions" class="denmoku-artist-options" style="display:none"><label><span>一致方法</span><select id="personMatchMode"><option value="partial">部分一致</option><option value="exact">完全一致</option><option value="prefix">前方一致</option></select></label></div>
    <div id="entityHeader" class="denmoku-entity-header" style="display:none"></div><div id="personRelations" class="denmoku-person-relations" style="display:none"></div><div id="personSongKanaBar" class="kana-jump denmoku-person-song-kana" style="display:none" aria-label="曲名の五十音絞り込み"></div>
    <main id="results" class="denmoku-results"><div class="denmoku-empty">検索語を入力してください</div></main><div id="toast" class="toast" style="display:none"></div></div>`;
  window.scrollTo(0,0);
  const input=document.getElementById('searchInput'),results=document.getElementById('results'),hit=document.getElementById('hitCount'),header=document.getElementById('entityHeader');
  const searchTabs=document.getElementById('searchTabs'),modeGuide=document.getElementById('modeGuide'),fileOnlyPanel=document.getElementById('fileOnlyPanel'),fileOnly=document.getElementById('fileOnly'),fileSearchOptions=document.getElementById('fileSearchOptions'),fileMatchMode=document.getElementById('fileMatchMode'),fileFuzzy=document.getElementById('fileFuzzy'),personOptions=document.getElementById('personSearchOptions'),personMatch=document.getElementById('personMatchMode'),relationsBox=document.getElementById('personRelations'),personSongKanaBar=document.getElementById('personSongKanaBar');
  const featureFilterPanel=document.getElementById('featureFilterPanel'),featureFilterButtons=[...featureFilterPanel.querySelectorAll('[data-feature-filter]')],selectedFeatureFilters=new Set(),pmap=peopleMap(),kanaKeys=['あ','か','さ','た','な','は','ま','や','ら','わ'];
  function syncFeatureVisibility(){const visible=currentMode==='title'&&!selectedEntity;featureFilterPanel.style.display=visible?'flex':'none';if(!visible&&selectedFeatureFilters.size){selectedFeatureFilters.clear();refreshFeatureButtons()}}
  function applyFeatures(list){if(currentMode!=='title'||!selectedFeatureFilters.size)return list;return list.filter(s=>[...selectedFeatureFilters].every(k=>!!s?.features?.[k]))}
  function hidePersonKana(){currentSongKanaBucket='';personSongKanaBar.style.display='none';personSongKanaBar.innerHTML=''}
  function renderPersonKana(list){if(currentMode!=='person'||!selectedEntity){personSongKanaBar.style.display='none';personSongKanaBar.innerHTML='';return}const songs=list||[];if(currentSongKanaBucket&&!songs.some(s=>kanaBucket(s.song_ruby||s.song_name)===currentSongKanaBucket))currentSongKanaBucket='';personSongKanaBar.style.display='grid';personSongKanaBar.innerHTML='';for(const k of kanaKeys){const b=document.createElement('button');b.type='button';b.textContent=k;b.disabled=!songs.some(s=>kanaBucket(s.song_ruby||s.song_name)===k);b.classList.toggle('active',currentSongKanaBucket===k);b.onclick=()=>{currentSongKanaBucket=currentSongKanaBucket===k?'':k;renderFilteredSongs(lastSongResults,false)};personSongKanaBar.appendChild(b)}}
  function renderFilteredSongs(list,remember=true,empty='該当する曲がありません'){if(remember)lastSongResults=sortSongsByReading(list||[]);const f=applyFeatures(lastSongResults);renderPersonKana(f);const shown=currentMode==='person'&&selectedEntity&&currentSongKanaBucket?f.filter(s=>kanaBucket(s.song_ruby||s.song_name)===currentSongKanaBucket):f;hit.textContent=String(shown.length);renderSongList(results,shown,empty)}
  function refreshFeatureButtons(){for(const b of featureFilterButtons)b.classList.toggle('active',selectedFeatureFilters.has(b.dataset.featureFilter))}
  featureFilterButtons.forEach(b=>b.onclick=()=>{const k=b.dataset.featureFilter;selectedFeatureFilters.has(k)?selectedFeatureFilters.delete(k):selectedFeatureFilters.add(k);if(selectedFeatureFilters.size===featureFilterButtons.length)selectedFeatureFilters.clear();refreshFeatureButtons();if(lastSongResults.length)renderFilteredSongs(lastSongResults,false)});
  function renderMainTabs(){searchTabs.innerHTML='';for(const [mode,label] of [['person','人物検索'],['title','曲名'],['tie-up','タイアップ'],['keyword','キーワード']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.classList.toggle('active',currentMode===mode&&!selectedEntity);b.onclick=()=>applyMode(mode,true);searchTabs.appendChild(b)}}
  function renderRoleTabs(counts,active){searchTabs.innerHTML='';for(const role of roleOrder){const count=Number(counts?.[role]||0),b=document.createElement('button');b.type='button';b.className='denmoku-role-tab';b.innerHTML=`<span>${esc(modeLabels[role])}</span><small>${count}</small>`;b.disabled=count<=0;b.classList.toggle('active',role===active&&count>0);b.onclick=()=>{if(!b.disabled)loadPersonRole(role)};searchTabs.appendChild(b)}}
  function applyMode(mode,run=false){currentMode=mode;selectedEntity='';selectedRole='';selectedRoleCounts={};selectedRelations=[];personTrail=[];lastSongResults=[];hidePersonKana();header.style.display='none';relationsBox.style.display='none';relationsBox.innerHTML='';renderMainTabs();syncFeatureVisibility();input.placeholder=modePlaceholders[mode]||'検索語を入力';modeGuide.textContent=['person','tie-up'].includes(mode)?`${modeLabels[mode]}を検索し、候補を選択してください`:`${modeLabels[mode]}だけを対象に検索します`;fileOnlyPanel.style.display=mode==='keyword'?'flex':'none';personOptions.style.display=mode==='person'?'flex':'none';if(mode!=='keyword')fileOnly.checked=false;fileSearchOptions.style.display=mode==='keyword'&&fileOnly.checked?'flex':'none';hit.textContent='0';if(run&&input.value.trim())doSearch();else results.innerHTML='<div class="denmoku-empty">検索語を入力してください</div>'}
  function personTreeLeaf(item){const count=Number(item?.count||0),selectable=item?.selectable!==false&&count>0,b=document.createElement('button');b.type='button';b.className='denmoku-entity-row artist-entity-row denmoku-person-tree-child'+(selectable?'':' no-songs');const relation=item?.relation_label?` <small class="denmoku-relation-badge">${esc(item.relation_label)}</small>`:'';b.innerHTML=`<span><span>${esc(item?.name||'')}${relation}</span></span><span class="denmoku-entity-count">${selectable?count+'曲':'登録曲なし'}　›</span>`;b.disabled=!selectable;if(selectable)b.onclick=()=>openPerson(item.name);return b}
  function personTreeBranch(item,isRoot=false){const children=item?.children||[];if(!children.length)return personTreeLeaf(item);const tree=document.createElement('div');tree.className='denmoku-person-tree'+(isRoot?' denmoku-person-tree-top':' denmoku-person-tree-nested');const root=document.createElement('button');root.type='button';root.className='denmoku-entity-row artist-entity-row denmoku-person-tree-root';const relation=item?.relation_label?` <small class="denmoku-relation-badge">${esc(item.relation_label)}</small>`:'';root.innerHTML=`<span class="denmoku-person-tree-name"><span class="denmoku-tree-arrow">▶</span><span>${esc(item?.name||'')}${relation}</span></span><span class="denmoku-entity-count">(${Number(item?.tree_count||0)||treePersonKeys(children).size}件)</span>`;const branch=document.createElement('div');branch.className='denmoku-person-tree-children';branch.hidden=true;for(const child of children)branch.appendChild(child?.children?.length?personTreeBranch(child):personTreeLeaf(child));root.onclick=()=>{const open=branch.hidden;branch.hidden=!open;root.querySelector('.denmoku-tree-arrow').textContent=open?'▼':'▶'};tree.append(root,branch);return tree}
  function renderPersonEntities(list){hit.textContent=String(list.length);results.innerHTML='';if(!list.length){results.innerHTML='<div class="denmoku-empty">該当する人物が見つかりませんでした</div>';return}for(const x of list){if((x.children||[]).length>1){results.appendChild(personTreeBranch(x,true));continue}const target=(x.children||[])[0]||x,count=Number(target.count??x.count??0),b=document.createElement('button');b.type='button';b.className='denmoku-entity-row artist-entity-row';const counts=target.role_counts||{},active=roleOrder.filter(r=>Number(counts[r]||0)>0).map(r=>`${modeLabels[r]} ${counts[r]}`),relation=target.relation_label?` <small class="denmoku-relation-badge">${esc(target.relation_label)}</small>`:'';b.innerHTML=`<span><span>${esc(target.name||x.name)}${relation}</span>${active.length?`<small class="denmoku-person-role-summary">${esc(active.join(' / '))}</small>`:''}</span><span class="denmoku-entity-count">${count}曲　›</span>`;b.onclick=()=>openPerson(target.name||x.name);results.appendChild(b)}}
  function renderTieEntities(list){hit.textContent=String(list.length);if(!list.length){results.innerHTML='<div class="denmoku-empty">該当するタイアップが見つかりませんでした</div>';return}results.innerHTML=entityRows(list);bindEntityClicks(results,list,x=>openTieupEntity(x.name))}
  function renderPersonRelations(){if(!selectedRelations.length){relationsBox.style.display='none';return}relationsBox.innerHTML='<div class="denmoku-relations-title">別名義・所属人物</div><div class="denmoku-relations-list"></div>';const box=relationsBox.querySelector('.denmoku-relations-list');for(const x of selectedRelations){const p=pmap.get(norm(x.name)),count=p?personTotalCount(p):0,b=document.createElement('button');b.type='button';b.className='denmoku-related-person'+(count?'':' no-songs');b.innerHTML=`<span>${esc(x.name)}</span><small>${esc(x.relation||'関連人物')} / ${count?count+'曲':'登録曲なし'}</small>`;b.disabled=!count;if(count)b.onclick=()=>openPerson(x.name);box.appendChild(b)}relationsBox.style.display='block'}
  function closeRelations(){relationsBox.style.display='none'}
  function openPerson(name,preferredRole='',navigation='forward'){const p=pmap.get(norm(name));if(!p)return;const wasOpen=relationsBox.style.display==='block',prev=selectedEntity;if(prev&&norm(prev)!==norm(name)){currentSongKanaBucket='';if(navigation==='forward')personTrail.push({name:prev,role:selectedRole||''})}currentMode='person';selectedEntity=p.name;selectedRoleCounts=roleCounts(p);selectedRelations=p.related||[];selectedRole=preferredRole&&selectedRoleCounts[preferredRole]>0?preferredRole:roleOrder.find(r=>selectedRoleCounts[r]>0)||'artist';personOptions.style.display='none';fileOnlyPanel.style.display='none';syncFeatureVisibility();header.style.display='flex';const previous=personTrail.at(-1);header.innerHTML=`<div class="denmoku-entity-nav">${previous?`<button id="personBack" class="denmoku-person-back">← ${esc(previous.name)} に戻る</button>`:''}<button id="entityBack">${lastEntityQuery?`← ${esc(lastEntityQuery)} の検索結果`:'← 人物検索へ'}</button></div><div class="denmoku-person-head"><strong>人物：${esc(p.name)}</strong><button id="relationToggle" class="denmoku-relation-toggle" style="display:${selectedRelations.length?'inline-flex':'none'}">別名義・所属 ${selectedRelations.length}</button></div>`;header.querySelector('#entityBack').onclick=backToPersonSearch;const pb=header.querySelector('#personBack');if(pb)pb.onclick=backToPreviousPerson;const t=header.querySelector('#relationToggle');if(t)t.onclick=()=>relationsBox.style.display==='block'?closeRelations():renderPersonRelations();if(wasOpen)renderPersonRelations();else closeRelations();renderRoleTabs(selectedRoleCounts,selectedRole);modeGuide.textContent=`${p.name} が関わる曲を担当区分ごとに表示します`;renderFilteredSongs(songsForIds(p.roles?.[selectedRole]||[]))}
  function loadPersonRole(role){const p=pmap.get(norm(selectedEntity));if(!p||!selectedRoleCounts[role])return;currentSongKanaBucket='';selectedRole=role;closeRelations();renderRoleTabs(selectedRoleCounts,role);renderFilteredSongs(songsForIds(p.roles?.[role]||[]))}
  function backToPreviousPerson(){const prev=personTrail.pop();if(prev)openPerson(prev.name,prev.role||'','back')}
  function backToPersonSearch(){personTrail=[];hidePersonKana();selectedEntity='';selectedRole='';header.style.display='none';relationsBox.style.display='none';currentMode='person';renderMainTabs();syncFeatureVisibility();personOptions.style.display='flex';if(lastEntityQuery){input.value=lastEntityQuery;doSearch(false)}else{hit.textContent='0';results.innerHTML='<div class="denmoku-empty">検索語を入力してください</div>'}}
  function openTieupEntity(name){selectedEntity=name;syncFeatureVisibility();header.style.display='flex';header.innerHTML=`<button id="entityBack">${lastEntityQuery?`← ${esc(lastEntityQuery)} の検索結果`:'← タイアップ検索へ'}</button><strong>タイアップ：${esc(name)}</strong>`;header.querySelector('button').onclick=()=>lastEntityQuery?doSearch(false):(header.style.display='none');renderFilteredSongs(sortSongsByReading(DATA.songs.filter(s=>norm(s.tie_up)===norm(name))))}
  function buildPersonSearchList(q,matchMode){const reasonRank={'':0,'連名':1,'別名義':2,'所属グループ':3,'所属メンバー':4,'関連人物':5},matched=new Map();for(const p of pmap.values()){const reason=personCandidateReason(p,q,matchMode,pmap);if(reason!==null)matched.set(norm(p.name),{name:p.name,count:personTotalCount(p),role_counts:roleCounts(p),reason})}const ordered=[...matched.keys()].sort((a,b)=>{const A=matched.get(a),B=matched.get(b);return (norm(A.name)===q?0:1)-(norm(B.name)===q?0:1)||(reasonRank[A.reason]??9)-(reasonRank[B.reason]??9)||A.name.localeCompare(B.name,'ja')});const entities=[],consumed=new Set();for(const key of ordered){if(consumed.has(key))continue;const item=matched.get(key),p=pmap.get(key);if(item.reason===''&&!p.combined_artist_credit){const family=buildPersonFamily(p.name,pmap,new Set(),0,new Set());const keys=treePersonKeys(family);for(const k of keys)consumed.add(k);entities.push({name:p.name,count:keys.size,tree_count:keys.size,children:family});}else{const leaf=personTreeLeafData(p.name,item.reason,pmap,p.combined_artist_credit?'combined':'single');entities.push({name:p.name,count:1,tree_count:1,children:[leaf]});consumed.add(key)}}return entities.slice(0,300)}
  function fileMatch(v,raw){const fuzzy=fileFuzzy.checked,needle=fileSearchNorm(raw,fuzzy),mode=fileMatchMode.value;return fileSearchCandidates(v).some(c=>{const x=fileSearchNorm(c,fuzzy);if(mode==='exact')return x===needle;if(mode==='prefix')return x.startsWith(needle);if(mode==='suffix')return x.endsWith(needle);return x.includes(needle)})}
  function doSearch(storeQuery=true){const raw=input.value.trim(),q=norm(raw);if(!q){hit.textContent='0';return}if(storeQuery)lastEntityQuery=raw;personTrail=[];hidePersonKana();selectedEntity='';header.style.display='none';relationsBox.style.display='none';renderMainTabs();syncFeatureVisibility();personOptions.style.display=currentMode==='person'?'flex':'none';if(currentMode==='keyword'&&fileOnly.checked){renderFileSearchResults(results,flattenFolderFiles().filter(v=>fileMatch(v,raw)),hit);return}if(currentMode==='person'){renderPersonEntities(buildPersonSearchList(q,personMatch.value));return}if(currentMode==='tie-up'){const map=new Map();for(const s of DATA.songs){if(!s.tie_up||!norm([s.tie_up,s.tie_up_ruby,s.series].join(' ')).includes(q))continue;const k=norm(s.tie_up);if(!map.has(k))map.set(k,{key:k,name:s.tie_up,count:0,ids:new Set()});const e=map.get(k);e.ids.add(s.id);e.count=e.ids.size}renderTieEntities([...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja')));return}const list=sortSongsByReading(DATA.songs.filter(s=>currentMode==='title'?norm([s.song_name,s.song_ruby,s.aliases].join(' ')).includes(q):norm([s.song_name,s.song_ruby,s.song_keyword,s.artists,s.lyricists,s.composers,s.arrangers,s.tags,s.tag_keywords,s.tie_up,s.tie_up_ruby,s.tie_up_category,s.tie_up_category_detail,s.tie_up_sub_category,s.series,s.op_ed,s.aliases].join(' ')).includes(q)));renderFilteredSongs(list)}
  document.getElementById('searchBtn').onclick=()=>doSearch();document.getElementById('clearBtn').onclick=()=>{input.value='';lastEntityQuery='';hidePersonKana();hit.textContent='0';results.innerHTML='<div class="denmoku-empty">検索語を入力してください</div>';input.focus()};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doSearch()}};fileOnly.onchange=()=>{fileSearchOptions.style.display=fileOnly.checked?'flex':'none';if(input.value.trim())doSearch(false)};fileMatchMode.onchange=fileFuzzy.onchange=()=>{if(fileOnly.checked&&input.value.trim())doSearch(false)};personMatch.onchange=()=>{if(currentMode==='person'&&!selectedEntity&&input.value.trim())doSearch(false)};
  applyMode(currentMode);if(directPerson&&currentMode==='person')openPerson(directPerson,directRole);else setTimeout(()=>input.focus(),30);
}

const featureDefs={
  'mv-pv':['mv_pv','🎬','MV・PV'],
  'live':['live','🎙️','LIVEカラオケ'],
  'anime':['anime','📺','アニメ・ゲーム映像'],
  'tokusatsu':['tokusatsu','⚡','特撮映像'],
  'parts':['parts','👥','パート分け']
};
function featureRuleNote(key){
  const labels=(DATA.feature_tag_rules&&Array.isArray(DATA.feature_tag_rules[key]))?DATA.feature_tag_rules[key].filter(Boolean):[];
  const via=(key==='anime'||key==='tokusatsu')?'タイアップ作品':'歌手名';
  return labels.length?`設定タグ「${labels.map(esc).join(' / ')}」のいずれかが付いた曲を${via}から選択`:`設定された楽曲タグに一致する曲を${via}から選択`;
}
function renderFeature(slug){
  const d=featureDefs[slug]||featureDefs['mv-pv'],rows=DATA.songs.filter(s=>s.features&&s.features[d[0]]),artistList=['mv_pv','live','parts'].includes(d[0]),pmap=peopleMap();
  document.title='ITSUKI - '+d[2];
  pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">${d[1]}</div><div><div class="browse-title">${d[2]}</div><div class="browse-note">${featureRuleNote(d[0])}</div></div></header><div id="browseStickyArea" class="browse-sticky-area"><div id="entityHeader" class="browse-entity-header" style="display:none"></div><div id="featureFilterDock" class="tieup-filter-dock"><div id="featureNameFilter" class="artist-name-filter"></div><div id="featureKanaBar" class="kana-jump"></div></div></div><main id="browseResults" class="browse-results"></main>`,'browse-page');
  const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader'),dock=document.getElementById('featureFilterDock'),filter=document.getElementById('featureNameFilter'),kana=document.getElementById('featureKanaBar'),kanaKeys=['あ','か','さ','た','な','は','ま','や','ら','わ'];
  const map=new Map();
  for(const s of rows){
    let name,key,ruby;
    if(artistList){name=String(s.artists||'歌手情報なし').trim();key=norm(name);ruby=String(pmap.get(key)?.ruby||name)}
    else {const raw=String(s.tie_up||'').trim();name=raw||'タイアップ情報なし';key=raw?norm(raw):'__no_tieup__';ruby=String(s.tie_up_ruby||raw||name)}
    if(!map.has(key))map.set(key,{key,name,ruby,count:0,ids:new Set()});const e=map.get(key);e.ids.add(String(s.id));e.count=e.ids.size;if(!e.ruby&&ruby)e.ruby=ruby;
  }
  const entities=[...map.values()].sort((a,b)=>{if(a.key==='__no_tieup__')return 1;if(b.key==='__no_tieup__')return -1;return hira(a.ruby||a.name).localeCompare(hira(b.ruby||b.name),'ja')});
  const state={q:'',kana:''};
  function normFilter(v){return String(v||'').normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[\s　]+/g,'')}
  function renderDock(){
    filter.innerHTML='';const label=document.createElement('span');label.className='artist-name-filter-label';label.textContent=artistList?'歌手名':'タイアップ名';const input=document.createElement('input');input.type='search';input.className='artist-name-filter-input';input.placeholder=(artistList?'歌手名':'タイアップ名')+'で絞り込み';input.value=state.q;const clear=document.createElement('button');clear.type='button';clear.className='artist-name-filter-clear';clear.textContent='クリア';clear.disabled=!state.q;input.oninput=()=>{state.q=input.value;clear.disabled=!state.q;renderList(false)};clear.onclick=()=>{state.q='';input.value='';clear.disabled=true;renderList(false);input.focus()};filter.append(label,input,clear);
    kana.innerHTML='';for(const k of kanaKeys){const b=document.createElement('button');b.type='button';b.textContent=k;b.disabled=!entities.some(x=>kanaBucket(x.ruby||x.name)===k);b.classList.toggle('active',state.kana===k);b.onclick=()=>{state.kana=state.kana===k?'':k;renderList()};kana.appendChild(b)}
  }
  function renderList(refresh=true){
    let list=entities;if(state.kana)list=list.filter(x=>kanaBucket(x.ruby||x.name)===state.kana);if(state.q){const q=normFilter(state.q);list=list.filter(x=>normFilter(`${x.name} ${x.ruby}`).includes(q))}if(refresh)renderDock();root.innerHTML='';
    if(!list.length){root.innerHTML=`<div class="browse-empty">この条件に該当する${artistList?'歌手':'タイアップ'}はありません</div>`;return}
    for(const x of list){const b=document.createElement('button');b.type='button';b.className='denmoku-entity-row browse-entity-row'+(artistList?' artist-browse-entity-row':'');b.innerHTML=`<span><strong>${esc(x.name)}</strong></span><span class="denmoku-entity-count">${x.count}曲　›</span>`;b.onclick=()=>openEntity(x);root.appendChild(b)}
  }
  function openEntity(x){dock.style.display='none';head.style.display='flex';head.innerHTML=`<button type="button">← 一覧へ</button><strong>${esc(x.name)}</strong>`;head.querySelector('button').onclick=()=>{head.style.display='none';dock.style.display='grid';renderList()};const selected=rows.filter(s=>artistList?norm(s.artists)===x.key:(x.key==='__no_tieup__'?!String(s.tie_up||'').trim():norm(s.tie_up)===x.key));renderSongList(root,sortSongsByReading(selected))}
  renderList();
}

function renderFolderBrowser(){
  document.title='ITSUKI - フォルダから探す';
  const fb=DATA.folder_browser||{};
  if(!fb.available||!Array.isArray(fb.roots)||!fb.roots.length){
    pageShell(`${topNav()}<div class="card bad"><div class="big">フォルダ一覧を作成できません</div><p>KaraokeLocalに動画ルートが設定され、動画スキャンが完了しているか確認してください。</p></div>`);
    return;
  }
  app.innerHTML=`<div class="digizo-browser-page web-folder-browser-page">
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
    if(mode==='year')return String(s.release_year||'')===String(value);
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
  if(song.features?.tokusatsu)badges.push('特撮映像');
  if(song.features?.parts)badges.push('パート分け');
  const artistLinks=song.artists?[song.artists]:[];
  const tieDisplay=tieUpDisplay(song);
  const tags=uniqueValues(vals(song.tags));
  const categoryIds=vals(song.tie_up_category_id),categoryNames=vals(song.tie_up_category);
  const categoryLinks=categoryIds.map((id,i)=>({id,name:categoryNames[i]||id})).filter(x=>x.id);
  const fineCategory=categoryVals(song.tie_up_category_detail||song.tie_up_sub_category||'').filter(x=>x&&x!=='-').join(' / ');
  const lyricsQuery=encodeURIComponent([song.song_name,song.artists,'歌詞'].filter(Boolean).join(' '));
  const lyricsArtist=(vals(song.artists)[0]||song.artists||'').toString().trim();
  const utaTenParams=new URLSearchParams({
    sort:'popular_sort:asc',
    artist_name:lyricsArtist,
    title:(song.song_name||'').toString().trim(),
    beginning:'',
    body:'',
    sub_title:'',
    tag:'',
    lyricist:'',
    composer:'',
    show_artists:'1'
  });
  const utaTenLyricsUrl='https://utaten.com/search?'+utaTenParams.toString();
  const otherSongsHref=song.artists?entityHref('artist',song.artists):'';
  const infoValue=(html,empty='―')=>html&&String(html).trim()?html:`<span class="joy-song-info-empty">${empty}</span>`;
  const plainValues=values=>{const list=uniqueValues(values);return list.length?list.map(esc).join(' / '):''};
  const infoRow=(label,value,wide=false)=>`<div class="joy-song-info-row${wide?' wide':''}"><div class="joy-song-info-label">${esc(label)}</div><div class="joy-song-info-value">${infoValue(value)}</div></div>`;
  const videoPaths=(song.video_paths||[]);
  const videoHtml=`<details class="joy-song-video-details"><summary><strong>${nf(song.video_count)}本</strong><span>相対パスを表示</span></summary><div class="joy-song-video-list">${videoPaths.length?videoPaths.map(p=>`<div>🎬 ${esc(p)}</div>`).join(''):'<div class="joy-song-info-empty">公開フォルダ内の相対パス情報はありません。</div>'}</div></details>`;

  if(currentTheme()==='joy'){
    const joyInfo=[
      infoRow('公開動画',videoHtml,true),
      infoRow('リリース年',song.release_year?`<a href="${entityHref('year',song.release_year)}">${esc(song.release_year)}年 ›</a>`:''),
      infoRow('作詞',detailLinkList('lyricist',vals(song.lyricists))),
      infoRow('作曲',detailLinkList('composer',vals(song.composers))),
      infoRow('編曲',detailLinkList('arranger',vals(song.arrangers))),
      infoRow('タイアップ',song.tie_up?`<a href="${entityHref('tieup',song.tie_up)}">${esc(song.tie_up)} ›</a>`:''),
      infoRow('カテゴリ細分類',esc(fineCategory||'')),
      infoRow('カテゴリー',categoryLinks.length?categoryLinks.map(x=>`<a href="${entityHref('category',x.id)}">${esc(x.name)} ›</a>`).join(''):''),
      infoRow('シリーズ',detailLinkList('series',vals(song.series))),
      infoRow('OP / ED',plainValues(song.op_ed?[song.op_ed]:[])),
      infoRow('タイアップ年',song.tie_up_release_year?`${esc(song.tie_up_release_year)}年`:''),
      infoRow('キーワード',plainValues(vals(song.song_keyword)),true),
      infoRow('タグ',plainValues(tags),true),
      infoRow('公開情報',plainValues(uniqueValues(badges)),true),
    ].join('');
    pageShell(`${topNav()}<div class="joy-song-detail-layout">
      <div class="joy-song-detail-topline"><button id="songDetailBack" type="button">← 戻る</button><span>曲詳細</span></div>
      <section class="joy-song-summary-card">
        <div class="joy-song-summary-main">
          <h1>${esc(song.song_name||'曲名不明')}</h1>
          ${song.song_ruby?`<div class="joy-song-ruby">${esc(song.song_ruby)}</div>`:''}
          <div class="joy-song-artist-line"><span class="joy-song-note-icon">♫</span><div class="joy-song-artist-text">${esc(song.artists||'歌手情報なし')}</div></div>
          <div class="joy-song-lyrics-line"><a class="joy-song-lyrics-search joy-song-lyrics-site" href="${esc(utaTenLyricsUrl)}" target="_blank" rel="noopener noreferrer" title="UtaTenで曲名・歌手名から歌詞を検索">♪ 歌詞検索</a><a class="joy-song-lyrics-search joy-song-lyrics-web" href="https://www.google.com/search?q=${lyricsQuery}" target="_blank" rel="noopener noreferrer" title="曲名・歌手名＋歌詞でWeb検索">🔎 Web検索</a></div>
        </div>
        <div class="joy-song-summary-actions">${otherSongsHref?`<a class="joy-other-artist-songs" href="${otherSongsHref}">この歌手の他の曲 <span>›</span></a>`:''}</div>
      </section>
      <section class="joy-song-info-panel">
        <div class="joy-song-info-heading">♫ 曲情報</div>
        <div class="joy-song-info-grid">${joyInfo}</div>
        ${tieDisplay?`<div class="joy-song-tie-summary">${esc(tieDisplay)}</div>`:''}
      </section>
    </div>`,'web-song-detail-wrap joy-song-detail-wrap');
  }else{
    pageShell(`${topNav()}<div class="web-song-detail-page">
      <div class="web-detail-toolbar"><button id="songDetailBack" type="button">← 戻る</button><span>曲詳細</span></div>
      <section class="reserve-song-card web-song-detail-card">
        <div class="reserve-song-line reserve-song-title-line"><div class="reserve-title">${esc(song.song_name||'曲名不明')}</div></div>
        ${song.song_ruby?`<div class="web-detail-ruby">${esc(song.song_ruby)}</div>`:''}
        <div class="reserve-song-line reserve-artist-row"><div class="reserve-song-icon reserve-person-icon" aria-hidden="true"></div><div class="web-detail-artist-links">${detailLinkList('artist',artistLinks)}</div></div>
        <div class="reserve-core-grid">
          <div class="reserve-core-cell web-video-path-cell"><details class="web-video-paths"><summary><span>公開動画</span><strong>${nf(song.video_count)}本</strong><span class="web-video-path-arrow" aria-hidden="true">⌄</span></summary><div class="web-video-path-list">${videoPaths.length?videoPaths.map(p=>`<div class="web-video-path-item">🎬 ${esc(p)}</div>`).join(''):'<div class="web-video-path-empty">公開フォルダ内の相対パス情報はありません。</div>'}</div></details></div>
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
          ${detailCell('キーワード',null,vals(song.song_keyword),true)}
        </div>
        ${tieDisplay?`<div class="web-detail-tie-summary">🎞️ ${esc(tieDisplay)}</div>`:''}
        ${tags.length?`<div class="web-detail-tag-section"><div class="reserve-related-title">タグ</div><div class="reserve-related-tags">${tags.map(t=>`<span class="reserve-related-chip">${esc(t)}</span>`).join('')}</div></div>`:''}
        ${badges.length?`<div class="web-detail-tag-section"><div class="reserve-related-title">この曲の公開情報</div><div class="reserve-related-tags">${uniqueValues(badges).map(t=>`<span class="reserve-related-chip">${esc(t)}</span>`).join('')}</div></div>`:''}
      </section>
    </div>`,'web-song-detail-wrap');
  }
  document.getElementById('songDetailBack').onclick=()=>{if(history.length>1)history.back();else location.hash='#top'};
}

function renderAll(){
  document.title='ITSUKI - 全曲一覧';
  const kanaKeys=['あ','か','さ','た','な','は','ま','や','ら','わ'];
  const state={title:'',artist:'',kana:'',features:new Set()};
  pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">📚</div><div><div class="browse-title">全曲一覧</div><div class="browse-note">選曲可能な${nf(DATA.song_count)}曲</div></div></header>
    <div class="web-all-sticky-filters">
      <div class="web-all-text-filters"><label><span>曲名</span><input id="allTitleFilter" type="search" placeholder="曲名で絞り込み" autocomplete="off"></label><label><span>歌手名</span><input id="allArtistFilter" type="search" placeholder="歌手名で絞り込み" autocomplete="off"></label><button id="allFilterClear" type="button">クリア</button></div>
      <div class="web-all-feature-filters"><span>映像・パート</span><button type="button" data-all-feature="anime">アニメ・ゲーム映像</button><button type="button" data-all-feature="tokusatsu">特撮映像</button><button type="button" data-all-feature="live">ライブ映像</button><button type="button" data-all-feature="parts">パート分け</button></div>
      <div id="allKanaFilter" class="kana-jump web-all-kana-filter"></div>
    </div>
    <div id="allResultCount" class="web-tieup-result-count"></div><main id="browseResults" class="browse-results"></main>`,'browse-page');
  const root=document.getElementById('browseResults'),titleInput=document.getElementById('allTitleFilter'),artistInput=document.getElementById('allArtistFilter'),clear=document.getElementById('allFilterClear'),kana=document.getElementById('allKanaFilter'),count=document.getElementById('allResultCount'),featureButtons=[...document.querySelectorAll('[data-all-feature]')];
  function normalizeFilterText(v){return String(v||'').normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[\s　]+/g,'')}
  const searchable=DATA.songs.map(s=>({...s,__title:normalizeFilterText(`${s.song_name||''} ${s.song_ruby||''} ${s.aliases||''}`),__artist:normalizeFilterText(s.artists||'')}));
  function refreshButtons(){for(const b of featureButtons)b.classList.toggle('active',state.features.has(b.dataset.allFeature));for(const b of kana.querySelectorAll('button'))b.classList.toggle('active',state.kana===b.dataset.kana)}
  function filtered(){
    const tq=normalizeFilterText(state.title),aq=normalizeFilterText(state.artist);
    return searchable.filter(s=>{
      if(tq&&!s.__title.includes(tq))return false;
      if(aq&&!s.__artist.includes(aq))return false;
      if(state.kana&&kanaBucket(s.song_ruby||s.song_name)!==state.kana)return false;
      if(state.features.size&&![...state.features].every(k=>!!s.features?.[k]))return false;
      return true;
    });
  }
  function render(){const list=sortSongsByReading(filtered());count.textContent=`${nf(list.length)}曲`;clear.disabled=!state.title&&!state.artist&&!state.kana&&!state.features.size;refreshButtons();renderSongList(root,list,'条件に一致する曲がありません',500)}
  kana.innerHTML=kanaKeys.map(k=>`<button type="button" data-kana="${k}">${k}</button>`).join('');
  titleInput.oninput=()=>{state.title=titleInput.value;render()};artistInput.oninput=()=>{state.artist=artistInput.value;render()};
  kana.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.kana=state.kana===b.dataset.kana?'':b.dataset.kana;render()});
  featureButtons.forEach(b=>b.onclick=()=>{const k=b.dataset.allFeature;state.features.has(k)?state.features.delete(k):state.features.add(k);if(state.features.size===featureButtons.length)state.features.clear();render()});
  clear.onclick=()=>{state.title='';state.artist='';state.kana='';state.features.clear();titleInput.value='';artistInput.value='';render()};
  render();
}

function renderForeign(){const counts=new Map();for(const s of DATA.songs)for(const l of (s.languages||[]))counts.set(l,(counts.get(l)||0)+1);const langs=[...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ja'));document.title='ITSUKI - 外国曲';pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">🌐</div><div><div class="browse-title">外国曲</div><div class="browse-note">言語を選択して曲一覧を表示</div></div></header><div id="entityHeader" class="browse-entity-header" style="display:none"></div><main id="browseResults" class="browse-results"><div class="web-language-grid">${langs.map(([l,c])=>`<button class="web-language-btn" data-lang="${esc(l)}"><img src="./assets/flags/${flagPath(l)}" alt=""><strong>${esc(l)}</strong><small>${nf(c)}曲</small></button>`).join('')}</div></main>`,'browse-page');const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader');root.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{const l=b.dataset.lang;head.style.display='flex';head.innerHTML=`<button type="button">← 言語一覧へ</button><strong>${esc(l)}</strong>`;head.querySelector('button').onclick=renderForeign;renderSongList(root,DATA.songs.filter(s=>(s.languages||[]).includes(l)))})}

function renderTieup(){
  document.title='ITSUKI - タイアップ';
  const catMap=new Map(),seriesMap=new Map();
  for(const s of DATA.songs){
    const ids=vals(s.tie_up_category_id),names=vals(s.tie_up_category);
    ids.forEach((id,i)=>{const name=names[i]||id;if(!catMap.has(id))catMap.set(id,{key:id,name,count:0,ids:new Set()});const e=catMap.get(id);e.ids.add(s.id);e.count=e.ids.size});
    for(const ser of vals(s.series)){const k=norm(ser);if(!seriesMap.has(k))seriesMap.set(k,{key:k,name:ser,count:0,ids:new Set()});const e=seriesMap.get(k);e.ids.add(s.id);e.count=e.ids.size}
  }
  pageShell(`${topNav()}<header class="browse-header"><div class="browse-icon">🎞️</div><div><div class="browse-title">タイアップ</div><div class="browse-note">シリーズまたはジャンルからタイアップを探します</div></div></header><div id="entityHeader" class="browse-entity-header" style="display:none"></div><main id="browseResults" class="browse-results"></main>`,'browse-page');
  const root=document.getElementById('browseResults'),head=document.getElementById('entityHeader');
  const kanaKeys=['あ','か','さ','た','な','は','ま','や','ら','わ','他'];

  function rootView(){
    head.classList.remove('web-tieup-sticky-head');head.style.display='none';
    const cats=[...catMap.values()].sort((a,b)=>a.key.localeCompare(b.key));
    root.innerHTML=`<div class="web-browse-grid"><button class="denmoku-entity-row" id="seriesBtn"><span><strong>📚 シリーズ</strong></span><span class="denmoku-entity-count">${nf(seriesMap.size)}件　›</span></button>${cats.map(x=>`<button class="denmoku-entity-row" data-cat="${esc(x.key)}"><span><strong>${esc(x.name)}</strong></span><span class="denmoku-entity-count">${nf(x.count)}曲　›</span></button>`).join('')}</div>`;
    root.querySelector('#seriesBtn').onclick=seriesView;
    root.querySelectorAll('[data-cat]').forEach(b=>{const cat=catMap.get(b.dataset.cat);b.onclick=()=>tieupsFor(s=>vals(s.tie_up_category_id).includes(b.dataset.cat),cat.name,rootView,false,true,b.dataset.cat)});
  }
  function seriesView(){
    head.classList.remove('web-tieup-sticky-head');head.style.display='flex';head.innerHTML='<button type="button">← ジャンル一覧へ</button><strong>シリーズ</strong>';head.querySelector('button').onclick=rootView;
    const list=[...seriesMap.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));root.innerHTML=entityRows(list);
    bindEntityClicks(root,list,x=>tieupsFor(s=>vals(s.series).some(v=>norm(v)===x.key),x.name,seriesView,true,false));
  }
  function tieupsFor(pred,label,back,showCategory=false,showDetailFilters=false,categoryId=''){
    head.classList.add('web-tieup-sticky-head');head.style.display='flex';head.innerHTML=`<button type="button">← 一覧へ</button><strong>${esc(label)}</strong>`;head.querySelector('button').onclick=back;
    const source=DATA.songs.filter(pred).filter(s=>s.tie_up);
    const state={detail:'',kana:'',q:''};

    // KaraokeLocal本体と同じく、カテゴリ細分類マスターのトップ階層を
    // フィルタボタンとして表示。親分類を選ぶと子孫分類もまとめて対象。
    const topDetails=showDetailFilters&&categoryId?categoryDetailMaster().filter(x=>String(x?.parent_category_id||'')===String(categoryId)&&!String(x?.parent_id||'')):[];
    const detailFilters=[];
    const modernDetails=topDetails.length>0;
    if(modernDetails){
      for(const x of topDetails){
        const accepted=categoryDetailDescendants(x.id);
        if(source.some(s=>tieUpDetailIds(s).some(id=>accepted.has(id))))detailFilters.push({id:String(x.id),name:String(x.name||'細分類'),accepted});
      }
      if(source.some(s=>!tieUpDetailIds(s).length))detailFilters.push({id:'__none__',name:'細分類なし',none:true});
    }else if(showDetailFilters){
      // Compatibility with legacy DBs that stored the fine category directly.
      const legacy=[...new Set(source.flatMap(s=>categoryVals(s.tie_up_category_detail||s.tie_up_sub_category)).filter(x=>x&&x!=='-'))].sort((a,b)=>hira(a).localeCompare(hira(b),'ja'));
      for(const x of legacy)detailFilters.push({id:'legacy:'+x,name:x,legacy:x});
    }
    const detailMap=new Map(detailFilters.map(x=>[x.id,x]));
    const matchesDetail=s=>{
      if(!state.detail)return true;const f=detailMap.get(state.detail);if(!f)return true;
      const ids=tieUpDetailIds(s);if(f.none)return !ids.length;if(f.accepted)return ids.some(id=>f.accepted.has(id));
      return categoryVals(s.tie_up_category_detail||s.tie_up_sub_category).includes(f.legacy);
    };

    function renderCurrent(){
      const nq=String(state.q||'').normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[\s　]+/g,'');
      const filtered=source.filter(s=>matchesDetail(s)&&(!state.kana||kanaBucket(s.tie_up_ruby||s.tie_up)===state.kana)&&(!nq||String((s.tie_up||'')+' '+(s.tie_up_ruby||'')).normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[\s　]+/g,'').includes(nq)));
      const map=new Map();
      for(const s of filtered){
        const k=norm(s.tie_up);if(!map.has(k))map.set(k,{key:k,name:s.tie_up,ruby:s.tie_up_ruby||s.tie_up,count:0,ids:new Set(),categories:new Set()});
        const e=map.get(k);e.ids.add(s.id);e.count=e.ids.size;if(showCategory)for(const cat of categoryVals(s.tie_up_category))if(cat&&cat!=='-')e.categories.add(cat);
      }
      const list=[...map.values()].map(x=>({...x,sub:showCategory&&x.categories.size?`(${[...x.categories].join(' / ')})`:''})).sort((a,b)=>hira(a.ruby||a.name).localeCompare(hira(b.ruby||b.name),'ja'));
      const detailHtml=showDetailFilters&&detailFilters.length?`<div class="web-tieup-filter-block"><div class="web-tieup-filter-label">細分類</div><div class="web-tieup-detail-buttons">${detailFilters.map(x=>`<button type="button" data-detail="${esc(x.id)}" class="${state.detail===x.id?'active':''}">${esc(x.name)}</button>`).join('')}</div></div>`:'';
      const kanaHtml=`<div class="web-tieup-filter-block"><div class="web-tieup-filter-label">五十音</div><div class="web-tieup-kana-buttons">${kanaKeys.map(x=>`<button type="button" data-kana="${x}" class="${state.kana===x?'active':''}">${x}</button>`).join('')}</div></div>`;
      const nameHtml=`<div class="artist-name-filter web-tieup-name-filter"><span class="artist-name-filter-label">タイアップ名</span><input id="tieupNameInput" type="search" class="artist-name-filter-input" placeholder="タイアップ名で絞り込み" value="${esc(state.q)}" autocomplete="off"><button id="tieupNameClear" type="button" class="artist-name-filter-clear" ${state.q?'':'disabled'}>クリア</button></div>`;
      root.innerHTML=`<div class="web-tieup-sticky-filters">${detailHtml}${nameHtml}${kanaHtml}</div><div class="web-tieup-result-count">${nf(list.length)}件</div><div id="tieupList">${list.length?entityRows(list):'<div class="denmoku-empty">条件に一致するタイアップがありません</div>'}</div>`;
      const ni=root.querySelector('#tieupNameInput'),nc=root.querySelector('#tieupNameClear');ni.oninput=()=>{state.q=ni.value;renderCurrent()};nc.onclick=()=>{state.q='';renderCurrent()};
      root.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{state.detail=state.detail===b.dataset.detail?'':b.dataset.detail;renderCurrent()});
      root.querySelectorAll('[data-kana]').forEach(b=>b.onclick=()=>{state.kana=state.kana===b.dataset.kana?'':b.dataset.kana;renderCurrent()});
      const listRoot=root.querySelector('#tieupList');if(list.length)bindEntityClicks(listRoot,list,x=>{
        head.innerHTML=`<button type="button">← タイアップ一覧へ</button><strong>${esc(x.name)}</strong>`;head.querySelector('button').onclick=renderCurrent;
        // Keep the selected fine-category filter when opening the work.
        renderSongList(root,filtered.filter(s=>norm(s.tie_up)===x.key));
      });
    }
    renderCurrent();
  }
  rootView();
}

function renderEra(){
  document.title='ITSUKI - あの頃・この頃';
  const currentYear=new Date().getFullYear();
  const yearValues=field=>{
    const out=[];
    for(const s of DATA.songs){
      const y=Number(s[field]);
      if(Number.isInteger(y)&&y>=1901&&y<=2199)out.push(y);
    }
    return [...new Set(out)].sort((a,b)=>a-b);
  };
  const songYears=yearValues('release_year');
  const tieUpYears=yearValues('tie_up_release_year');
  const allYears=[...new Set([...songYears,...tieUpYears])].sort((a,b)=>a-b);
  const fallbackMin=allYears.length?allYears[0]:1901;
  const fallbackMax=allYears.length?allYears[allYears.length-1]:currentYear;
  const cats=new Map();
  for(const s of DATA.songs){const ids=vals(s.tie_up_category_id),names=vals(s.tie_up_category);ids.forEach((id,i)=>{if(id&&!cats.has(id))cats.set(id,names[i]||id)})}
  const initialYear=Math.min(fallbackMax,Math.max(fallbackMin,currentYear));
  const numberStepper=(id,value,min,max,label)=>`<div class="web-number-stepper"><input id="${id}" type="number" inputmode="numeric" value="${value}" min="${min}" max="${max}" aria-label="${esc(label)}"><span class="web-number-step-buttons"><button type="button" data-step-target="${id}" data-step="1" aria-label="${esc(label)}を1増やす">▲</button><button type="button" data-step-target="${id}" data-step="-1" aria-label="${esc(label)}を1減らす">▼</button></span></div>`;
  pageShell(`${topNav()}<div class="era-shell"><div class="era-head"><span>🕒</span><div><h1>あの頃・この頃</h1><p>曲は発売年、タイアップ作品は作品年を基準に探します</p></div></div><div class="era-panel"><div class="web-era-controls"><div class="web-era-mode"><button id="modeYear" class="active">年から探す</button><button id="modeAge">年齢から探す</button></div><div class="era-target-select"><span>表示対象</span><div class="era-target-buttons"><button id="targetSong" class="active" type="button">🎵 曲（発売年）</button><button id="targetTieUp" type="button">🎞️ タイアップ作品（作品年）</button></div></div><div id="eraRange" class="web-era-range"></div><div class="web-era-fields"><label><span id="field1Label">西暦</span>${numberStepper('field1',initialYear,fallbackMin,fallbackMax,'西暦')}</label><label><span id="field2Label">ジャンル</span><select id="genre"><option value="">すべて</option>${[...cats].sort((a,b)=>a[0].localeCompare(b[0])).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('')}</select></label><label id="ageNowWrap" style="display:none"><span>現在の年齢</span>${numberStepper('ageNow',30,0,120,'現在の年齢')}</label><label id="ageThenWrap" style="display:none"><span>当時の年齢</span>${numberStepper('ageThen',18,0,120,'当時の年齢')}</label></div><button class="web-primary-btn" id="eraSearch">検索</button><div id="eraComputed" class="era-computed"></div></div></div></div><main id="eraResults" class="denmoku-results era-results"><div class="denmoku-empty">条件を指定して検索してください</div></main>`,'era-page');
  let mode='year',target='song',lastTieUpView=null;
  const fy=document.getElementById('field1'),genre=document.getElementById('genre'),res=document.getElementById('eraResults'),computed=document.getElementById('eraComputed'),range=document.getElementById('eraRange');
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number.isFinite(n)?n:min));
  function targetYears(){const y=target==='tie-up'?tieUpYears:songYears;return y.length?y:allYears}
  function targetRange(){const y=targetYears();return {min:y.length?y[0]:fallbackMin,max:y.length?y[y.length-1]:fallbackMax}}
  function syncYearRange(){
    const r=targetRange();fy.min=String(r.min);fy.max=String(r.max);
    let n=Number(fy.value);if(!Number.isFinite(n))n=Math.min(r.max,Math.max(r.min,currentYear));fy.value=String(Math.round(clamp(n,r.min,r.max)));
    range.textContent=`検索可能：${r.min}年～${r.max}年`;
  }
  function clampInput(input){
    const min=Number(input.min),max=Number(input.max);let n=Number(input.value);
    n=Math.round(clamp(n,min,max));input.value=String(n);return n;
  }
  function computedYear(){
    if(mode==='year')return clampInput(fy);
    const now=clampInput(document.getElementById('ageNow'));
    const then=clampInput(document.getElementById('ageThen'));
    return currentYear-now+then;
  }
  function refreshStepperButtons(){
    const r=targetRange();
    const nowEl=document.getElementById('ageNow'),thenEl=document.getElementById('ageThen');
    const targetYear=(nowEl&&thenEl)?currentYear-Number(nowEl.value||0)+Number(thenEl.value||0):currentYear;
    document.querySelectorAll('.web-number-step-buttons button').forEach(btn=>{
      const input=document.getElementById(btn.dataset.stepTarget);if(!input)return;
      const step=Number(btn.dataset.step||0),value=Number(input.value),min=Number(input.min),max=Number(input.max);
      let disabled=(step>0&&value>=max)||(step<0&&value<=min);
      if(mode==='age'&&!disabled&&input.id==='ageNow'){const nextYear=targetYear-step;disabled=nextYear<r.min||nextYear>r.max}
      if(mode==='age'&&!disabled&&input.id==='ageThen'){const nextYear=targetYear+step;disabled=nextYear<r.min||nextYear>r.max}
      btn.disabled=disabled;
    });
  }
  function keepAgeTargetSearchable(changedId){
    if(mode!=='age')return;
    const r=targetRange(),now=document.getElementById('ageNow'),then=document.getElementById('ageThen');
    let n=clampInput(now),t=clampInput(then),year=currentYear-n+t;
    if(year<r.min||year>r.max){
      const wanted=Math.min(r.max,Math.max(r.min,year));
      if(changedId==='ageThen')t=clamp(wanted-currentYear+n,0,120),then.value=String(Math.round(t));
      else n=clamp(currentYear+t-wanted,0,120),now.value=String(Math.round(n));
    }
  }
  function sw(m){
    mode=m;document.getElementById('modeYear').classList.toggle('active',m==='year');document.getElementById('modeAge').classList.toggle('active',m==='age');document.getElementById('ageNowWrap').style.display=m==='age'?'grid':'none';document.getElementById('ageThenWrap').style.display=m==='age'?'grid':'none';fy.closest('label').style.display=m==='year'?'grid':'none';computed.textContent='';if(m==='age')keepAgeTargetSearchable('ageNow');refreshStepperButtons();
  }
  function setTarget(next){
    target=next==='tie-up'?'tie-up':'song';
    document.getElementById('targetSong').classList.toggle('active',target==='song');
    document.getElementById('targetTieUp').classList.toggle('active',target==='tie-up');
    document.getElementById('targetSong').setAttribute('aria-pressed',target==='song'?'true':'false');
    document.getElementById('targetTieUp').setAttribute('aria-pressed',target==='tie-up'?'true':'false');
    syncYearRange();keepAgeTargetSearchable('ageNow');computed.textContent='';res.innerHTML='<div class="denmoku-empty">条件を指定して検索してください</div>';refreshStepperButtons();
  }
  function tieUpEntities(year,g){
    const map=new Map();
    for(const s of DATA.songs){
      if(String(s.tie_up_release_year||'')!==String(year)||!String(s.tie_up||'').trim())continue;
      if(g&&!vals(s.tie_up_category_id).includes(g))continue;
      const key=norm(s.tie_up),ruby=String(s.tie_up_ruby||'').trim();
      if(!map.has(key))map.set(key,{key,name:s.tie_up,ruby,category:categoryVals(s.tie_up_category_detail||s.tie_up_category||'').filter(Boolean).join(' / '),ids:new Set()});
      map.get(key).ids.add(s.id);
    }
    return [...map.values()].map(x=>({...x,count:x.ids.size})).sort((a,b)=>String(a.ruby||a.name).localeCompare(String(b.ruby||b.name),'ja'));
  }
  function renderTieUps(year,g){
    const list=tieUpEntities(year,g);lastTieUpView={year,g,list};
    if(!list.length){res.innerHTML=`<div class="denmoku-empty">${year}年に該当するタイアップ作品がありません</div>`;return}
    res.innerHTML=`<div class="era-section-title tieup">🎞️ タイアップ作品（${nf(list.length)}）</div>`+list.map((x,i)=>`<button type="button" class="denmoku-entity-row era-tieup-row" data-era-tieup="${i}"><span><strong>${esc(x.name)}</strong>${[x.category,x.ruby&&x.ruby!==x.name?x.ruby:''].filter(Boolean).length?`<small>${esc([x.category,x.ruby&&x.ruby!==x.name?x.ruby:''].filter(Boolean).join(' / '))}</small>`:''}</span><span class="denmoku-entity-count">${nf(x.count)}曲　›</span></button>`).join('');
    res.querySelectorAll('[data-era-tieup]').forEach(b=>b.onclick=()=>openEraTieUp(list[Number(b.dataset.eraTieup)]));
  }
  function openEraTieUp(item){
    if(!item||!lastTieUpView)return;
    const saved=lastTieUpView;
    const songs=sortSongsByReading(DATA.songs.filter(s=>norm(s.tie_up)===item.key));
    res.innerHTML=`<div class="era-result-back"><button type="button">← ${saved.year}年のタイアップ一覧へ</button><strong>${esc(item.name)}</strong></div><div id="eraTieUpSongs"></div>`;
    res.querySelector('button').onclick=()=>renderTieUps(saved.year,saved.g);
    renderSongList(document.getElementById('eraTieUpSongs'),songs,'現在公開している曲がありません',500);
  }
  document.querySelectorAll('.web-number-step-buttons button').forEach(btn=>btn.onclick=()=>{
    const input=document.getElementById(btn.dataset.stepTarget);if(!input)return;
    input.value=String(clampInput(input)+Number(btn.dataset.step||0));clampInput(input);
    keepAgeTargetSearchable(input.id);refreshStepperButtons();
  });
  document.querySelectorAll('.web-number-stepper input').forEach(input=>{
    input.onchange=()=>{clampInput(input);keepAgeTargetSearchable(input.id);refreshStepperButtons()};
    input.oninput=()=>refreshStepperButtons();
  });
  document.getElementById('modeYear').onclick=()=>sw('year');document.getElementById('modeAge').onclick=()=>sw('age');
  document.getElementById('targetSong').onclick=()=>setTarget('song');document.getElementById('targetTieUp').onclick=()=>setTarget('tie-up');
  document.getElementById('eraSearch').onclick=()=>{
    const r=targetRange();let year=computedYear();
    if(year<r.min||year>r.max){year=Math.min(r.max,Math.max(r.min,year));computed.textContent=`対象年：${year}年（検索可能範囲へ調整） / ${target==='tie-up'?'タイアップ作品':'曲'}`}
    else computed.textContent=`対象年：${year}年 / ${target==='tie-up'?'タイアップ作品':'曲'}`;
    const g=genre.value;
    if(target==='tie-up'){renderTieUps(year,g)}
    else{
      const list=sortSongsByReading(DATA.songs.filter(s=>String(s.release_year||'')===String(year)&&(!g||vals(s.tie_up_category_id).includes(g))));
      renderSongList(res,list,`${year}年に該当する曲がありません`);
    }
    refreshStepperButtons();
  };
  syncYearRange();refreshStepperButtons();
}
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
function updateVideoRow(v){
  const linked=!!(v.song_id&&v.song_name);
  const title=linked?v.song_name:(v.filename||'名称不明の動画');
  const artist=linked?(v.artists||'歌手情報なし'):'DB未紐づけ';
  const tie=linked?tieUpDisplay(v):'';
  const meta=tie?`<div class="update-meta">${esc(tie)}</div>`:'';
  const file=v.rel_path||v.filename||'';
  const vocal=v.vocal_label?` <span class="muted">(${esc(v.vocal_label)})</span>`:'';
  const action=linked?`<div class="update-action"><a class="web-update-detail-btn" href="#song/${encodeURIComponent(v.song_id)}">曲詳細</a></div>`:'';
  return `<article class="update-video-row"><div class="update-video-main"><div class="update-song-title">${esc(title)}</div><div class="update-artist">${esc(artist)}${vocal}</div>${meta}<div class="update-file">${esc(file)}</div></div>${action}</article>`;
}
// Keep the v0.7.7 artist/song reading order; add a visible divider on artist changes.
function updateArtistGroups(items){
  const groups=[];
  for(const video of items){
    const name=String(video?.artists||'').trim()||'歌手情報なし';
    const key=norm(name);
    const last=groups[groups.length-1];
    if(last&&last.key===key){last.items.push(video)}
    else groups.push({key,name,items:[video]});
  }
  return groups;
}
function renderUpdateArtistGroups(items){
  return updateArtistGroups(items).map(g=>
    `<section class="update-artist-group"><h3 class="update-artist-heading">${esc(g.name)}</h3><div class="update-artist-songs">${g.items.map(updateVideoRow).join('')}</div></section>`
  ).join('');
}
function renderUpdates(){
  document.title='ITSUKI - 新曲・更新曲';
  const days=Math.max(1,Math.min(60,Number(DATA.new_update_days||15)||15));
  const now=new Date();
  const todayStart=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/1000);
  const cut=todayStart-(days-1)*86400;
  const source=Array.isArray(DATA.new_update_videos)
    ?DATA.new_update_videos
    :(DATA.songs||[]).map(s=>({...s,update_at:Number(s.updated_at||0),filename:'',rel_path:'',song_id:s.id}));
  const list=source.filter(v=>Number(v.update_at||0)>=cut).sort((a,b)=>Number(b.update_at||0)-Number(a.update_at||0));
  const byWeek=new Map();
  for(const v of list){
    const info=updateWeekInfo(v.update_at);
    if(!byWeek.has(info.key))byWeek.set(info.key,{...info,items:[]});
    byWeek.get(info.key).items.push(v);
  }
  const groups=[...byWeek.values()].sort((a,b)=>b.key.localeCompare(a.key));
  let currentWeekIndex=0;
  let weekViewport=null;
  pageShell(`${topNav()}<div class="updates-head"><div><div class="big">✨ 新曲・更新曲</div><div id="periodText" class="muted"></div></div></div><nav id="weekNav" class="updates-week-nav" aria-label="更新週を選択" hidden></nav><main id="updatesResults"></main>`,'updates-page');
  const root=document.getElementById('updatesResults'),period=document.getElementById('periodText'),nav=document.getElementById('weekNav');

  function updateWeekOverflowHints(){
    if(!weekViewport)return;
    const max=Math.max(0,weekViewport.scrollWidth-weekViewport.clientWidth);
    weekViewport.classList.toggle('has-left',weekViewport.scrollLeft>4);
    weekViewport.classList.toggle('has-right',weekViewport.scrollLeft<max-4);
  }
  function centerCurrentWeek(behavior='smooth'){
    if(!weekViewport)return;
    const chip=weekViewport.querySelector('.week-chip.active');
    if(!chip)return;
    const left=chip.offsetLeft-(weekViewport.clientWidth-chip.offsetWidth)/2;
    weekViewport.scrollTo({left:Math.max(0,left),behavior});
    window.setTimeout(updateWeekOverflowHints,behavior==='smooth'?260:0);
  }
  function renderWeekNav(){
    if(!groups.length){nav.hidden=true;weekViewport=null;return}
    nav.hidden=false;nav.innerHTML='';
    const newer=document.createElement('button');
    newer.type='button';newer.className='week-arrow';newer.textContent='◁';newer.title='新しい週へ';
    newer.disabled=currentWeekIndex<=0;newer.onclick=()=>selectWeek(currentWeekIndex-1);nav.appendChild(newer);

    weekViewport=document.createElement('div');weekViewport.className='week-viewport';
    const strip=document.createElement('div');strip.className='week-strip';weekViewport.appendChild(strip);
    groups.forEach((g,i)=>{
      const b=document.createElement('button');b.type='button';b.className='week-chip'+(i===currentWeekIndex?' active':'');
      b.textContent=`W${String(g.week).padStart(2,'0')}`;b.title=g.label;b.onclick=()=>selectWeek(i);strip.appendChild(b);
    });
    weekViewport.addEventListener('scroll',updateWeekOverflowHints,{passive:true});nav.appendChild(weekViewport);

    const older=document.createElement('button');
    older.type='button';older.className='week-arrow';older.textContent='▷';older.title='古い週へ';
    older.disabled=currentWeekIndex>=groups.length-1;older.onclick=()=>selectWeek(currentWeekIndex+1);nav.appendChild(older);
    requestAnimationFrame(()=>{centerCurrentWeek('auto');updateWeekOverflowHints()});
  }
  function renderCurrentWeek(){
    root.innerHTML='';
    if(!groups.length){
      period.textContent=`直近${days}日間 / 0動画`;
      root.innerHTML='<div class="card"><span class="muted">指定期間内に追加・作成・更新された動画はありません</span></div>';
      renderWeekNav();return;
    }
    currentWeekIndex=Math.max(0,Math.min(currentWeekIndex,groups.length-1));
    const g=groups[currentWeekIndex];
    const items=sortSongsByReading(g.items||[]);
    period.textContent=`${g.label} / ${nf(items.length)}動画`;
    root.innerHTML=`<section class="update-group single-week"><div class="update-group-title">${esc(g.label)}</div><div class="update-group-list">${renderUpdateArtistGroups(items)}</div></section>`;
    renderWeekNav();
  }
  function selectWeek(index){
    if(index<0||index>=groups.length)return;
    currentWeekIndex=index;renderCurrentWeek();window.scrollTo({top:0,behavior:'smooth'});
  }
  renderCurrentWeek();
}

function renderSettings(){
  document.title='ITSUKI - 表示設定';
  const selected=currentTheme();
  pageShell(`${topNav()}<section class="theme-settings-page"><div class="theme-settings-head"><span class="theme-settings-back">表示</span><div><h1>表示テーマ</h1><p>この端末のブラウザにだけ保存されます。</p></div></div><div class="theme-choice-grid theme-choice-main"><button type="button" class="theme-choice joy-choice ${selected==='joy'?'selected':''}" data-theme-choice="joy"><span class="theme-preview joy-preview"><i></i><b></b><b></b><b></b></span><strong>JOYSOUND風</strong><small>白い一覧・赤い操作色・全画面共通の上部操作帯を使います。</small></button><button type="button" class="theme-choice dam-choice ${selected==='dam'?'selected':''}" data-theme-choice="dam"><span class="theme-preview dam-preview"><i></i><b></b><b></b><b></b></span><strong>DAM WAO!風（ITSUKI風）</strong><small>これまでのITSUKIの黒背景・カラフルな大型ボタン表示です。</small></button></div><div class="theme-setting-note">設定はLocalStorageへ保存するため、公開サイトを更新してもこの端末では選択したテーマを維持します。旧「従来のITSUKI」設定は自動的にDAM WAO!風へ移行します。</div></section>`,`theme-settings-wrap`);
  document.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.onclick=()=>{setTheme(btn.dataset.themeChoice);renderSettings()});
}

function route(){
  document.onkeydown=null;
  const h=(location.hash||'#top').replace(/^#/,'');
  const parts=h.split('/'),a=parts[0]||'',b=parts[1]||'';
  const folderView=a==='folder';
  document.documentElement.dataset.folderView=folderView?'true':'false';
  if(document.body)document.body.classList.toggle('folder-neutral',folderView);
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
  if(a==='settings')return renderSettings();
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
