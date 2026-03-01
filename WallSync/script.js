// ═══════════════════════════════════════════════════════
// !! PASTE YOUR APPS SCRIPT URL BELOW !!
// ═══════════════════════════════════════════════════════
const GS_URL = 'https://script.google.com/macros/s/AKfycbyLLLHOjoZsf-56tSMA6IEhAQqLNVKyWvYmp2e4mSWA643Ot_HZvqID3rv4d5q-r5IS/exec';

// ═══════════════════════════════════════════════════════
// LOCAL STORAGE — instant, always works
// ═══════════════════════════════════════════════════════
const LS_S   = 'ws_signups_v2';
const LS_R   = 'ws_reviews_v3';
const ADM_PW = 'Atlantis';

function lsGet(k)    { try { const v=localStorage.getItem(k); return v?JSON.parse(v):[]; } catch(e){ return []; } }
function lsSet(k,v)  { try { localStorage.setItem(k,JSON.stringify(v)); return true; } catch(e){ return false; } }
function getSignups(){ return lsGet(LS_S); }
function getReviews(){ return lsGet(LS_R); }
function saveSignups(a){ return lsSet(LS_S,a); }
function saveReviews(a){ return lsSet(LS_R,a); }

// ═══════════════════════════════════════════════════════
// GOOGLE SHEETS — via hidden form (bypasses CORS)
// This is the correct way to POST to Apps Script from
// a local HTML file or any page without a server
// ═══════════════════════════════════════════════════════
const gsReady = GS_URL !== 'https://script.google.com/macros/s/AKfycbyNbTMDwX5iTzwXB_W2KkK5q79J80BTOp_61FiEvsFL4uI1Dk8IHywaNt334d_oYxhf/exec' && GS_URL.includes('script.google.com');

function gsPost(payload) {
  if (!gsReady) return;
  // Use Image beacon — works from any origin, no CORS, no 403 redirect issues
  try {
    const encoded = encodeURIComponent(JSON.stringify(payload));
    const img = new Image();
    img.src = GS_URL + "?method=post&payload=" + encoded;
  } catch(e) {
    console.warn("GS sync failed:", e);
  }
}

// GET data via script tag (bypasses CORS)
function gsCall(params, callback) {
  if (!gsReady) { callback(null); return; }
  const script = document.createElement('script');
  const cbName = 'gsCb_' + Date.now();
  window[cbName] = function(data) {
    delete window[cbName];
    script.remove();
    callback(data);
  };
  const query = Object.entries({...params, callback: cbName}).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
  script.src = GS_URL + '?' + query;
  script.onerror = () => { delete window[cbName]; callback(null); };
  document.head.appendChild(script);
}

function gsGetCount(callback) {
  gsCall({ action: 'count' }, data => callback(data && data.count !== undefined ? data.count : null));
}

function gsGetAll(callback) {
  gsCall({ action: 'all' }, data => callback(data));
}

// ═══════════════════════════════════════════════════════
// COUNT
// ═══════════════════════════════════════════════════════
function refreshCount() {
  const local = getSignups().length;
  setCount(local);
  gsGetCount(n => { if (n !== null && n >= local) setCount(n); });
}
function setCount(n) {
  const fmt = n.toLocaleString('en-IN');
  ['heroCount','badgeCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmt;
  });
}

// ═══════════════════════════════════════════════════════
// WAITLIST FORM
// ═══════════════════════════════════════════════════════
document.getElementById('waitlistForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const name  = document.getElementById('wlName').value.trim();
  const email = document.getElementById('wlEmail').value.trim().toLowerCase();
  const btn   = document.getElementById('wlBtn');
  const msg   = document.getElementById('wlMsg');

  if (!name || !email) return;

  const signups = getSignups();
  if (signups.find(s => s.email === email)) {
    showMsg(msg, '✓ You\'re already on the list!', '#1DB954');
    return;
  }

  const now = new Date();
  const entry = {
    id:    now.getTime(),
    name,  email,
    date:  now.toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}),
    time:  now.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}),
    iso:   now.toISOString()
  };

  // Save locally first
  signups.push(entry);
  saveSignups(signups);

  // Send to Google Sheets
  gsPost({ type: 'signup', ...entry });

  // Update UI
  btn.textContent      = '🎉 You\'re on the list!';
  btn.style.background = '#1DB954';
  btn.style.color      = '#fff';
  btn.disabled         = true;
  document.getElementById('wlName').disabled  = true;
  document.getElementById('wlEmail').disabled = true;
  showMsg(msg, `Welcome ${name}! We'll email you on launch day. 🎵`, '#1DB954');
  refreshCount();
});

function showMsg(el, text, color) {
  el.textContent = text;
  el.style.cssText = `display:block;color:${color};background:${color}18;border:1px solid ${color}35;padding:12px 16px;border-radius:8px;font-family:'Space Mono',monospace;font-size:0.78rem;margin-bottom:12px`;
}

// ═══════════════════════════════════════════════════════
// STARS
// ═══════════════════════════════════════════════════════
let stars = 5;
function setStars(n) {
  stars = n;
  document.querySelectorAll('.star-btn').forEach((b,i) => b.classList.toggle('on', i < n));
}
document.querySelectorAll('.star-btn').forEach(btn => {
  btn.addEventListener('mouseenter', () => document.querySelectorAll('.star-btn').forEach((b,i) => b.classList.toggle('on', i < +btn.dataset.s)));
  btn.addEventListener('mouseleave', () => setStars(stars));
  btn.addEventListener('click',      () => setStars(+btn.dataset.s));
});
setStars(5);

// ═══════════════════════════════════════════════════════
// REVIEW FORM
// ═══════════════════════════════════════════════════════
document.getElementById('reviewForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const name   = document.getElementById('rvName').value.trim();
  const handle = document.getElementById('rvHandle').value.trim();
  const text   = document.getElementById('rvText').value.trim();
  const btn    = document.getElementById('rvBtn');
  const msg    = document.getElementById('rvMsg');

  if (!name || !text) return;

  btn.disabled    = true;
  btn.textContent = 'Posting...';

  const review = {
    id:     Date.now(),
    name,   handle, stars, text,
    date:   new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}),
    iso:    new Date().toISOString(),
    avatar: ['🎧','🎸','🎵','🎤','🎶','🎼','🎷','🎺'][Math.floor(Math.random()*8)]
  };

  const reviews = getReviews();
  reviews.unshift(review);
  saveReviews(reviews);
  gsPost({ type: 'review', ...review });

  addReviewCard(review, true);
  toggleEmptyReviews();
  btn.textContent      = '✓ Posted!';
  btn.style.background = '#1DB954';
  btn.style.color      = '#fff';
  showMsg(msg, 'Thanks for sharing! 🙌', '#1DB954');
  e.target.reset();
  setStars(5);
  setTimeout(() => {
    btn.textContent   = 'Post Reaction →';
    btn.style.cssText = '';
    btn.disabled      = false;
    msg.style.display = 'none';
  }, 3000);
});

function addReviewCard(r, top=false) {
  const grid = document.getElementById('reviewsGrid');
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;transition:border-color 0.2s,transform 0.2s';
  if (top) card.style.animation = 'fadeUp 0.4s ease both';
  card.innerHTML = `
    <div style="color:#c8ff00;font-size:14px;margin-bottom:12px;letter-spacing:2px">${'★'.repeat(r.stars)}<span style="opacity:0.2">${'☆'.repeat(5-r.stars)}</span></div>
    <p style="font-size:0.87rem;color:var(--soft);line-height:1.7;font-weight:300;margin-bottom:16px;font-style:italic">"${r.text}"</p>
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:36px;height:36px;border-radius:50%;background:rgba(200,255,0,0.08);border:1px solid rgba(200,255,0,0.15);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${r.avatar}</div>
      <div>
        <div style="font-size:0.82rem;font-weight:600">${r.name}</div>
        <div style="font-size:0.72rem;color:var(--muted);font-family:'Space Mono',monospace;margin-top:1px">${r.handle||r.date}</div>
      </div>
    </div>`;
  if (top) grid.prepend(card); else grid.appendChild(card);
}

function toggleEmptyReviews() {
  const has = document.getElementById('reviewsGrid').children.length > 0;
  document.getElementById('noReviewsState').style.display = has ? 'none' : 'block';
}

function loadReviews() {
  getReviews().forEach(r => addReviewCard(r, false));
  toggleEmptyReviews();
}

// ═══════════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════════
const lb = document.getElementById('lb');
document.getElementById('lbClose').onclick = closeLb;
lb.onclick = e => { if(e.target===lb) closeLb(); };
document.addEventListener('keydown', e => { if(e.key==='Escape') closeLb(); });
function openLb(src,cap) {
  document.getElementById('lbImg').src = src;
  document.getElementById('lbCap').textContent = cap||'Press ESC to close';
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeLb() { lb.style.display='none'; document.body.style.overflow=''; }
function attachLightbox() {
  document.querySelectorAll('.desktop-frame img,.figma-mockup img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', ev => {
      ev.stopPropagation();
      const tag = img.closest('.desktop-frame,.figma-mockup')?.querySelector('.design-tag')?.textContent||'';
      openLb(img.src, (tag?tag+' · ':'')+' Click outside or ESC to close');
    });
  });
}

// ═══════════════════════════════════════════════════════
// ADMIN GATE
// ═══════════════════════════════════════════════════════
document.getElementById('adminLink').onclick = function(e) {
  e.preventDefault();
  document.getElementById('adminGate').style.display = 'flex';
  setTimeout(() => document.getElementById('adminPw').focus(), 80);
};
document.getElementById('adminCancel').onclick = closeGate;
document.getElementById('adminEnter').onclick  = checkPw;
document.getElementById('adminPw').addEventListener('keydown', e => { if(e.key==='Enter') checkPw(); });

function closeGate() {
  document.getElementById('adminGate').style.display = 'none';
  document.getElementById('adminPw').value = '';
  document.getElementById('adminErr').style.display = 'none';
}
function checkPw() {
  if (document.getElementById('adminPw').value === ADM_PW) { closeGate(); openAdmin(); }
  else { document.getElementById('adminErr').style.display='block'; document.getElementById('adminPw').value=''; }
}

// ═══════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════
document.getElementById('adminClose').onclick = closeAdmin;
document.getElementById('exportBtn').onclick  = exportCSV;

function openAdmin() {
  document.getElementById('adminPanel').style.display='block';
  document.body.style.overflow='hidden';
  // Show local data immediately, then fetch from Sheets
  renderAdmin(getSignups(), getReviews());
  if (gsReady) {
    document.getElementById('adminSyncStatus').innerHTML = '<span style="background:rgba(200,255,0,0.1);color:#c8ff00;border:1px solid rgba(200,255,0,0.2);border-radius:20px;padding:4px 12px;font-size:0.65rem;font-family:Space Mono,monospace;letter-spacing:0.5px">⏳ Fetching live data from Google Sheets...</span>';
    gsGetAll(data => {
      if (data && data.signups) {
        // Merge remote + local, deduplicate by id
        const remote = data.signups || [];
        const remoteReviews = data.reviews || [];
        const local = getSignups();
        const localReviews = getReviews();
        const merged = [...remote, ...local.filter(l => !remote.find(r => r.id == l.id))];
        const mergedReviews = [...remoteReviews, ...localReviews.filter(l => !remoteReviews.find(r => r.id == l.id))];
        // Update local cache
        saveSignups(merged);
        saveReviews(mergedReviews);
        renderAdmin(merged, mergedReviews);
      } else {
        renderAdmin(getSignups(), getReviews());
      }
    });
  }
}
function closeAdmin() { document.getElementById('adminPanel').style.display='none'; document.body.style.overflow=''; }

function renderAdmin(signups, reviews) {
  signups = signups || getSignups();
  reviews = reviews || getReviews();
  const today   = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const todayCt = signups.filter(s=>s.iso?.startsWith(today)).length;
  const weekCt  = signups.filter(s=>s.iso&&new Date(s.iso)>weekAgo).length;

  const syncBadge = gsReady
    ? '<span style="background:rgba(29,185,84,0.15);color:#1DB954;border:1px solid rgba(29,185,84,0.3);border-radius:20px;padding:4px 12px;font-size:0.65rem;font-family:Space Mono,monospace;letter-spacing:0.5px">● LIVE — SHOWING ALL SIGNUPS FROM GOOGLE SHEETS</span>'
    : '<span style="background:rgba(255,107,107,0.12);color:#ff6b6b;border:1px solid rgba(255,107,107,0.25);border-radius:20px;padding:4px 12px;font-size:0.65rem;font-family:Space Mono,monospace;letter-spacing:0.5px">⚠ LOCAL ONLY — paste GS URL in the HTML to sync</span>';

  document.getElementById('adminSyncStatus').innerHTML = syncBadge;

  document.getElementById('adminStats').innerHTML = [
    ['TOTAL SIGNUPS', signups.length],
    ['TODAY',         todayCt],
    ['THIS WEEK',     weekCt],
    ['REVIEWS',       reviews.length]
  ].map(([l,v])=>`
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px">
      <div style="font-family:'Space Mono',monospace;font-size:2rem;font-weight:700;color:var(--accent);line-height:1;margin-bottom:6px">${v}</div>
      <div style="font-size:0.72rem;color:var(--muted);letter-spacing:0.5px">${l}</div>
    </div>`).join('');

  // Chart
  const chart = document.getElementById('adminChart');
  chart.innerHTML = '';
  const days   = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().split('T')[0]; });
  const counts = days.map(d=>signups.filter(s=>s.iso?.startsWith(d)).length);
  const maxV   = Math.max(1,...counts);
  days.forEach((d,i)=>{
    const n=counts[i], pct=Math.max(5,Math.round((n/maxV)*100)), isT=d===today;
    const col=document.createElement('div');
    col.style.cssText='display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;height:100%';
    col.innerHTML=`<div title="${n} signup${n!==1?'s':''}" style="width:100%;border-radius:4px 4px 0 0;height:${pct}%;min-height:4px;background:${n>0?'var(--accent)':'rgba(255,255,255,0.06)'};${isT?'box-shadow:0 0 12px rgba(200,255,0,0.4)':''}"></div><span style="font-family:'Space Mono',monospace;font-size:7px;color:${isT?'var(--accent)':'var(--muted)'}">${d.slice(5)}</span>`;
    chart.appendChild(col);
  });

  // Signups table
  const stWrap = document.getElementById('adminSignupsTable');
  const stRows = signups.length===0
    ? `<tr><td colspan="5" style="padding:48px;text-align:center;color:var(--muted)"><div style="font-size:2rem;margin-bottom:10px">🚀</div>No signups yet — share your waitlist link!</td></tr>`
    : [...signups].reverse().map((s,i)=>`
        <tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
          <td style="padding:13px 20px;color:var(--muted);font-family:'Space Mono',monospace;font-size:0.68rem">${signups.length-i}</td>
          <td style="padding:13px 20px;font-weight:600">${s.name}</td>
          <td style="padding:13px 20px;color:var(--accent);font-family:'Space Mono',monospace;font-size:0.78rem">${s.email}</td>
          <td style="padding:13px 20px;color:var(--muted);font-size:0.8rem">${s.date}</td>
          <td style="padding:13px 20px;color:var(--muted);font-size:0.8rem">${s.time}</td>
        </tr>`).join('');
  stWrap.innerHTML=`
    <div style="padding:15px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <span style="font-family:'Space Mono',monospace;font-size:0.68rem;letter-spacing:1.5px;color:var(--muted)">WAITLIST SIGNUPS</span>
      <span style="font-size:0.78rem;color:var(--muted)">${signups.length} total</span>
    </div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">${['#','NAME','EMAIL','DATE','TIME'].map(h=>`<th style="padding:10px 20px;text-align:left;font-family:'Space Mono',monospace;font-size:0.6rem;letter-spacing:1.5px;color:var(--muted)">${h}</th>`).join('')}</tr></thead>
      <tbody>${stRows}</tbody>
    </table></div>`;

  // Reviews table
  const rvWrap = document.getElementById('adminReviewsTable');
  const rvRows = reviews.length===0
    ? `<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--muted)">No reviews yet.</td></tr>`
    : reviews.map((r,i)=>`
        <tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
          <td style="padding:13px 20px;color:var(--muted);font-family:'Space Mono',monospace;font-size:0.68rem">${i+1}</td>
          <td style="padding:13px 20px;font-weight:600">${r.name}</td>
          <td style="padding:13px 20px;color:#c8ff00;letter-spacing:2px">${'★'.repeat(r.stars)}</td>
          <td style="padding:13px 20px;color:var(--soft);font-size:0.8rem;max-width:300px">${r.text.slice(0,110)}${r.text.length>110?'…':''}</td>
          <td style="padding:13px 20px;color:var(--muted);font-size:0.8rem">${r.date}</td>
        </tr>`).join('');
  rvWrap.innerHTML=`
    <div style="padding:15px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <span style="font-family:'Space Mono',monospace;font-size:0.68rem;letter-spacing:1.5px;color:var(--muted)">REVIEWS & REACTIONS</span>
      <span style="font-size:0.78rem;color:var(--muted)">${reviews.length} total</span>
    </div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">${['#','NAME','RATING','REVIEW','DATE'].map(h=>`<th style="padding:10px 20px;text-align:left;font-family:'Space Mono',monospace;font-size:0.6rem;letter-spacing:1.5px;color:var(--muted)">${h}</th>`).join('')}</tr></thead>
      <tbody>${rvRows}</tbody>
    </table></div>`;
}

function exportCSV() {
  const s = getSignups();
  if (!s.length) { alert('No signups to export yet!'); return; }
  const csv  = 'No,Name,Email,Date,Time\n'+[...s].reverse().map((r,i)=>`${i+1},"${r.name}","${r.email}","${r.date}","${r.time}"`).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a    = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'wallsynq-signups.csv'});
  a.click(); URL.revokeObjectURL(a.href);
}

// ═══════════════════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════════════════
new IntersectionObserver(
  entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }),
  {threshold:0.08, rootMargin:'0px 0px -40px 0px'}
).constructor.prototype; // dummy
const _ro = new IntersectionObserver(
  entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }),
  {threshold:0.08, rootMargin:'0px 0px -40px 0px'}
);
document.querySelectorAll('.reveal').forEach(el => _ro.observe(el));

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
refreshCount();
loadReviews();
attachLightbox();