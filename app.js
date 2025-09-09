// Minimal site config (edit here)
const CONFIG = {
  socialLinks: {
    note: "https://note.com/uh_datascience",
    noteMembership: "https://note.com/uh_datascience/membership",
    latestNote: "https://note.com/uh_datascience/n/n00208f724b76",
    x: "https://x.com/uki_datascience",
    qiita: "https://qiita.com/UKI_datascience",
    github: "https://github.com/ukimotodatascience",
    standfm: "https://stand.fm/channels/61471f0b9ccb419e5f2041e3",
    marshmallow: "https://marshmallow-qa.com/azq079rlotqnldq?t=22YXcV&utm_medium=url_text&utm_source=promotion",
    email: "＜公開用メール＞"
  },
  experiments: {
    ab_001_header_cta_label: { A: "メンバーになる", B: "限定ノートを読む" },
    ab_002_hero_copy: { A: "学びと実験の“裏側”まで可視化する。", B: "失敗の共有で、学びは加速する。" }
  }
};

// Simple analytics/event layer
function trackEvent(name, params = {}) {
  try {
    if (window.gtag) {
      window.gtag('event', name, params);
    } else {
      // fallback to console for local dev
      console.debug('[event]', name, params);
    }
  } catch (e) {}
}

// Event delegation for [data-event]
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-event]');
  if (!a) return;
  const name = a.getAttribute('data-event');
  if (name) trackEvent(name);
});

// A/B assignment stored in localStorage
function getVariant(key) {
  const storageKey = `ab:${key}`;
  let v = localStorage.getItem(storageKey);
  if (!v) {
    v = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem(storageKey, v);
  }
  return v;
}

function applyExperiments() {
  document.querySelectorAll('[data-exp-key]').forEach(el => {
    const key = el.getAttribute('data-exp-key');
    const variant = getVariant(key);
    const text = el.getAttribute(`data-variant-${variant.toLowerCase()}`);
    if (text) el.textContent = text;
  });
}

// Page specific boot
function boot() {
  applyExperiments();
  // Mobile nav
  (function initMobileNav(){
    const btn = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!btn || !nav) return;
    const close = () => { document.body.classList.remove('nav-open'); btn.setAttribute('aria-expanded', 'false'); };
    const toggle = () => {
      const isOpen = document.body.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', String(isOpen));
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('click', (e) => {
      if (!document.body.classList.contains('nav-open')) return;
      if (e.target.closest('.site-nav') || e.target.closest('.nav-toggle')) return;
      close();
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 640) close(); });
  })();

  // Prefer external note membership for explicit CTAs only (keep header tab internal)
  const noteMemberUrl = CONFIG.socialLinks.noteMembership || '';
  if (noteMemberUrl) {
    document.querySelectorAll('.js-external-membership').forEach(a => {
      a.href = noteMemberUrl; a.target = '_blank'; a.rel = 'noopener';
    });
  }

  // Home: latest note link
  const latestNote = document.getElementById('cta-latest-note');
  if (latestNote) latestNote.href = CONFIG.socialLinks.latestNote || CONFIG.socialLinks.note;

  // Links page
  const set = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
  set('link-note', CONFIG.socialLinks.note);
  set('link-membership', CONFIG.socialLinks.noteMembership);
  set('link-x', CONFIG.socialLinks.x);
  set('link-qiita', CONFIG.socialLinks.qiita);
  set('link-github', CONFIG.socialLinks.github);
  set('link-standfm', CONFIG.socialLinks.standfm);
  set('link-marshmallow', CONFIG.socialLinks.marshmallow);

  // Membership page
  if (document.body.dataset.page === 'membership') {
    trackEvent('view_membership');
    const m = CONFIG.socialLinks.noteMembership || '#';
    ['join-primary','join-supporter','join-core','join-lab','join-footer','join-final'].forEach(id=>{
      const el = document.getElementById(id); if (el) el.href = m;
    });
    // Unify bottom strip text copy with site-wide phrasing
    const bottomP = document.querySelector('.strip-cta .strip-inner p');
    if (bottomP) bottomP.textContent = '日々の活動内容や、活動を通じて感じたこと・考えたことをメンバーシップ限定で共有';
    // Scroll depth (simple bottom reached)
    let fired = false;
    window.addEventListener('scroll', () => {
      if (fired) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
        fired = true; trackEvent('scroll_complete_membership');
      }
    });
  }

  // Contact: mailto fallback
  if (document.body.dataset.page === 'contact') {
    const form = document.getElementById('contact-form');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const mail = CONFIG.socialLinks.email || '';
      const sub = encodeURIComponent(`[サイト問合せ] ${fd.get('name')}`);
      const body = encodeURIComponent(`お名前: ${fd.get('name')}
メール: ${fd.get('email')}

${fd.get('message')}`);
      window.location.href = `mailto:${mail}?subject=${sub}&body=${body}`;
    });
  }

  // History: fit date column width to longest
  document.querySelectorAll('.timeline-list').forEach(list => {
    const dates = list.querySelectorAll('.date');
    let max = 0;
    dates.forEach(el => {
      const width = el.getBoundingClientRect().width;
      if (width > max) max = width;
    });
    if (max > 0) {
      // add a little padding so it doesn't feel cramped
      list.style.setProperty('--tl-date-width', Math.ceil(max + 8) + 'px');
    }
  });

  // Competitions: search + sort
  const table = document.getElementById('results-table');
  const search = document.getElementById('results-search');
  if (table) {
    // sort
    table.querySelectorAll('th[data-sort]').forEach((th, idx) => {
      let asc = true;
      th.addEventListener('click', () => {
        const rows = Array.from(table.tBodies[0].rows);
        rows.sort((a,b)=>{
          const A = a.cells[idx].textContent.trim();
          const B = b.cells[idx].textContent.trim();
          return asc ? A.localeCompare(B, 'ja') : B.localeCompare(A, 'ja');
        }).forEach(r=>table.tBodies[0].appendChild(r));
        asc = !asc;
      });
    });
    // search
    if (search) search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      Array.from(table.tBodies[0].rows).forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', boot);
