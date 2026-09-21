/* 光遇身高查询 · 纯前端实现 */
const $ = s => document.querySelector(s);
let DB = [], byId = new Map(), byIC = new Map();
let rankKey = 'h', rankShown = 20;

const H_MIN = -2.0, H_MAX = 2.0;
const clamp = h => Math.max(0, Math.min(1, (h - H_MIN) / (H_MAX - H_MIN)));

/* ── 加载数据库 ── */
function loadDB(){
  try{
    const D = window.SKY_DATA;
    if(!D){ throw new Error('数据未加载'); }
    DB = [];
    byId.clear(); byIC.clear();
    for(let i = 0; i < D.id.length; i++){
      const p = { id:D.id[i], h:D.h[i], ch:D.ch[i], mx:D.mx[i],
                  mn:D.mn[i], s:D.s[i], ic:D.ic[i], t:D.t[i] };
      DB.push(p);
      byId.set(p.id, p);
      if(p.ic) byIC.set(p.ic.toUpperCase(), p);
    }
    $('#dbinfo').textContent = `📊 已收录 ${DB.length.toLocaleString()} 位玩家`;
    renderRank(); renderStats();
  }catch(e){
    $('#dbinfo').innerHTML = '<span class="err">加载失败: ' + (e && e.message ? e.message : e) + '</span>';
  }
}

/* ── 查询 ── */
function query(){
  const raw = $('#q').value.trim();
  const box = $('#result');
  if(!raw){ box.innerHTML = ''; return; }

  const key = raw.toUpperCase().replace(/\s/g,'');
  let hit = byIC.get(key);
  let showIC = !!hit;                    // 用好友码直接命中时才展示该码

  // 好友码格式检测（兜底）
  if(!hit && /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)){
    hit = byIC.get(key);
    if(hit) showIC = true;
    if(!hit){
      box.innerHTML = `<div class="empty"><b>🔍</b>未收录该好友码<br><span style="font-size:12px;opacity:.7">好友码为一次性，数据库按 UUID 归档</span></div>`;
      return;
    }
  }
  // UUID 精确 / 前缀匹配
  if(!hit){
    const lk = raw.toLowerCase();
    hit = byId.get(lk);
    if(!hit){
      const cands = DB.filter(p => p.id.startsWith(lk));
      if(cands.length === 1) hit = cands[0];
      else if(cands.length > 1){
        box.innerHTML = `<div class="res"><div style="font-size:13px;color:var(--dim);margin-bottom:10px">找到 ${cands.length} 个匹配，请精确输入：</div>` +
          cands.slice(0,8).map(p => `<div style="padding:7px 0;cursor:pointer;font-family:monospace;font-size:12px;color:var(--cyan)" onclick="$('#q').value='${p.id}';query()">${p.id} <b style="color:var(--gold2)">${p.h}</b></div>`).join('') + '</div>';
        return;
      }
    }
  }
  if(!hit){
    box.innerHTML = `<div class="empty"><b>❌</b>未找到该玩家<br><span style="font-size:12px;opacity:.7">数据库中暂无此记录</span></div>`;
    return;
  }
  renderResult(hit, showIC);
}

function renderResult(p, showIC){
  const h = p.h ?? 0;
  const pct = (clamp(h) * 100).toFixed(1);
  const lvl = h >= 1.5 ? '巨人' : h >= 0.9 ? '偏高' : h >= 0.2 ? '标准' : h >= -0.5 ? '偏矮' : h >= -1.3 ? '小巧' : '迷你';
  $('#result').innerHTML = `
    <div class="res">
      <div class="name">🆔 ${p.id}<br>${showIC && p.ic ? '🎫 ' + p.ic + ' ' : ''}${p.t ? '· 更新于 ' + p.t.slice(0,10) : ''}</div>
      <div class="bignum"><b>${h.toFixed(2)}</b><span>身高系数 · ${lvl}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="barlab"><span>-2.00 最矮</span><span>2.00 最高</span></div>
      <div class="mini">
        <div><em>历史最高</em><b>${p.mx ?? '—'}</b></div>
        <div><em>历史最矮</em><b>${p.mn ?? '—'}</b></div>
        <div><em>缩放</em><b>${p.s ?? '—'}</b></div>
      </div>
    </div>`;
}

/* ── 排行榜 ── */
function renderRank(){
  const li = document.querySelectorAll('.tab');
  let arr = DB.filter(p => p[rankKey] != null);
  arr = rankKey === 'mn'
    ? arr.slice().sort((a,b) => a.mn - b.mn)
    : arr.slice().sort((a,b) => b[rankKey] - a[rankKey]);
  const top = arr.slice(0, rankShown);
  $('#rank').innerHTML = top.map((p,i) => `
    <li onclick="$('#q').value='${p.id}';query();window.scrollTo({top:0,behavior:'smooth'})">
      <span class="pos">${i+1}</span>
      <span class="uid">${p.id}</span>
      <span class="val">${p[rankKey]}</span>
    </li>`).join('');
  $('#more').style.display = rankShown >= arr.length ? 'none' : 'block';
}

/* ── 统计 ── */
function renderStats(){
  const hs = DB.map(p => p.h).filter(v => v != null);
  if(!hs.length){ $('#stats').innerHTML = ''; return; }
  const avg = (hs.reduce((a,b)=>a+b,0) / hs.length).toFixed(2);
  const items = [
    ['收录玩家', DB.length.toLocaleString()],
    ['平均身高', avg],
    ['最高记录', Math.max(...hs).toFixed(2)],
    ['最矮记录', Math.min(...hs).toFixed(2)],
  ];
  $('#stats').innerHTML = items.map(([k,v]) => `<div><em>${k}</em><b>${v}</b></div>`).join('');
}

/* ── 事件 ── */
$('#btn').onclick = query;
$('#q').addEventListener('keydown', e => { if(e.key === 'Enter') query(); });
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  t.classList.add('on'); rankKey = t.dataset.k; rankShown = 20; renderRank();
});
$('#more').onclick = () => { rankShown += 20; renderRank(); };

/* ── 启动（等 DOM 就绪 + 数据就绪，兼容大数据异步解析） ── */
function boot(){
  if(!document.getElementById('dbinfo')) return;      // DOM 未就绪
  if(!(window.SKY_DATA && window.SKY_DATA.id && window.SKY_DATA.id.length)) return;
  loadDB();
}
document.addEventListener('DOMContentLoaded', () => {
  let n = 0;
  (function tick(){
    boot();
    if(n++ < 50 && DB.length === 0) setTimeout(tick, 100);
  })();
});
