// Waffles — airsoft event photography · spec mockup
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---------- year ----------
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // ---------- header ----------
  const head = $('.site-head');
  const onScrollHead = () => head && head.classList.toggle('is-scrolled', window.scrollY > 8);
  onScrollHead();
  window.addEventListener('scroll', onScrollHead, { passive: true });

  // ---------- mobile nav ----------
  const nav = $('#nav');
  const openBtn = $('.nav-toggle');
  const closeBtn = $('.nav__close');
  const setNav = open => {
    if (!nav) return;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    openBtn && openBtn.setAttribute('aria-expanded', String(open));
    if (open) closeBtn && closeBtn.focus(); else openBtn && openBtn.focus();
  };
  openBtn && openBtn.addEventListener('click', () => setNav(true));
  closeBtn && closeBtn.addEventListener('click', () => setNav(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) setNav(false); });

  // ---------- reveals + screen lift ----------
  const targets = $$('.reveal, .screen-in');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const img = el.matches('.screen-in') ? $('img', el) : null;
        const show = () => el.classList.add('is-in');
        if (img && !img.complete) { img.addEventListener('load', show, { once: true }); img.addEventListener('error', show, { once: true }); }
        else show();
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(el => io.observe(el));
  }

  // ---------- hero: halftone resolves to clean on scroll (or hover) ----------
  const hero = $('.hero');
  if (hero) {
    if (reduce) {
      hero.classList.add('is-resolved');
    } else {
      let ticking = false;
      const update = () => {
        ticking = false;
        const h = hero.offsetHeight || 1;
        const p = Math.min(1, Math.max(0, window.scrollY / (h * 0.45)));
        hero.style.setProperty('--screen', (1 - p).toFixed(3));
      };
      window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      update();
      // phones can't hover: let the screen resolve on its own after a beat
      setTimeout(() => hero.classList.add('is-resolved'), 1800);
      if (window.matchMedia('(hover: hover)').matches) {
        const media = $('.hero__media', hero);
        media && media.addEventListener('mouseenter', () => hero.classList.add('is-resolved'));
      }
    }
  }

  // ---------- toast ----------
  let toastEl, toastT;
  const toast = msg => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3600);
  };

  // ---------- mockup forms: never send anything ----------
  $$('form[data-mock]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    toast(f.dataset.mock || 'Mockup — this form is not connected yet.');
  }));

  // ---------- work grid filters ----------
  $$('[data-filter-group]').forEach(group => {
    const grid = $(group.dataset.filterGroup);
    if (!grid) return;
    const items = $$('[data-cat]', grid);
    $$('button', group).forEach(btn => btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      $$('button', group).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      items.forEach(it => {
        const isSlot = it.hasAttribute('data-slot');
        const show = cat === 'all' ? !isSlot : it.dataset.cat.split(' ').includes(cat);
        it.hidden = !show;
        if (show) it.classList.add('is-in');
      });
    }));
  });

  // ---------- viewer (shared by work grid + proofing gallery) ----------
  const viewer = $('#viewer');
  let vList = [], vIdx = 0;
  const vImg = viewer && $('img', viewer);
  const vNum = viewer && $('[data-v-num]', viewer);
  const vCap = viewer && $('[data-v-cap]', viewer);
  const showV = i => {
    if (!vList.length) return;
    vIdx = (i + vList.length) % vList.length;
    const t = vList[vIdx];
    vImg.src = t.dataset.full;
    vImg.alt = t.dataset.alt || '';
    vNum.textContent = t.dataset.num || '';
    vCap.textContent = t.dataset.cap || '';
  };
  if (viewer) {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-view]');
      if (!t) return;
      const scope = t.closest('[data-view-scope]') || document;
      vList = $$('[data-view]', scope).filter(x => !x.closest('[hidden]'));
      showV(vList.indexOf(t));
      viewer.showModal();
    });
    $('[data-v-prev]', viewer).addEventListener('click', () => showV(vIdx - 1));
    $('[data-v-next]', viewer).addEventListener('click', () => showV(vIdx + 1));
    $('[data-v-close]', viewer).addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', e => { if (e.target === viewer || e.target.classList.contains('viewer__stage')) viewer.close(); });
    viewer.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') showV(vIdx + 1);
      if (e.key === 'ArrowLeft') showV(vIdx - 1);
    });
  }

  // ---------- proofing gallery ----------
  // Selection state lives in localStorage only. No checkout: fulfilment is
  // undecided (pre-launch L8) and is not ours to assume.
  const proofRoot = $('[data-proof]');
  if (proofRoot) {
    const key = 'waffles-proof-' + proofRoot.dataset.proof;
    const load = () => { try { return JSON.parse(localStorage.getItem(key)) || { sel: [], hid: [] }; } catch { return { sel: [], hid: [] }; } };
    const save = s => { try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* private mode: state lasts this visit only */ } };
    let state = load();
    let filter = 'all';
    const proofs = $$('.proof', proofRoot);
    const tabs = $$('[data-proof-filter]');
    const countEl = $('[data-sel-count]');
    const reqBtn = $('[data-request]');
    const empty = $('.proof-empty');

    const render = () => {
      proofs.forEach(p => {
        const id = p.dataset.id;
        const sel = state.sel.includes(id), hid = state.hid.includes(id);
        p.classList.toggle('is-selected', sel);
        p.classList.toggle('is-hidden', hid);
        $('.act--sel', p).setAttribute('aria-pressed', String(sel));
        $('.act--hide', p).setAttribute('aria-pressed', String(hid));
        p.hidden = filter === 'all' ? hid : filter === 'selected' ? !sel : !hid;
      });
      const vis = proofs.filter(p => !p.hidden).length;
      if (empty) empty.hidden = vis > 0;
      tabs.forEach(t => {
        const f = t.dataset.proofFilter;
        t.setAttribute('aria-pressed', String(f === filter));
        const n = f === 'all' ? proofs.length - state.hid.length : f === 'selected' ? state.sel.length : state.hid.length;
        $('.count', t).textContent = n;
      });
      countEl.textContent = state.sel.length;
      reqBtn.disabled = state.sel.length === 0;
    };

    proofRoot.addEventListener('click', e => {
      const btn = e.target.closest('.act');
      if (!btn) return;
      const id = btn.closest('.proof').dataset.id;
      const drop = (arr, v) => arr.filter(x => x !== v);
      if (btn.classList.contains('act--sel')) {
        state.sel = state.sel.includes(id) ? drop(state.sel, id) : [...state.sel, id];
        state.hid = drop(state.hid, id);
      } else if (btn.classList.contains('act--hide')) {
        state.hid = state.hid.includes(id) ? drop(state.hid, id) : [...state.hid, id];
        state.sel = drop(state.sel, id);
      } else if (btn.classList.contains('act--dl')) {
        toast('[DOWNLOAD — DELIVERY METHOD TO CONFIRM] Not wired in the mockup.');
        return;
      }
      save(state); render();
    });
    tabs.forEach(t => t.addEventListener('click', () => { filter = t.dataset.proofFilter; render(); }));

    const modal = $('#request');
    reqBtn.addEventListener('click', () => {
      const nums = proofs.filter(p => state.sel.includes(p.dataset.id)).map(p => p.dataset.num);
      $('.modal__list', modal).textContent = nums.join('   ');
      modal.showModal();
    });
    $('[data-modal-close]', modal).addEventListener('click', () => modal.close());
    $('form', modal).addEventListener('submit', () => modal.close());

    const clear = $('[data-clear]');
    clear && clear.addEventListener('click', () => { state = { sel: [], hid: [] }; save(state); render(); });

    render();
  }
})();
