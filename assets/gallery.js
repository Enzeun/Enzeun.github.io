// 미디어 갤러리
// 1) <div class="media"> 안의 <figure>들을 큰 화면 1장 + 썸네일 목록으로 바꿉니다.
//    - 이전/다음 버튼, 썸네일 클릭, 좌우 방향키, 스와이프로 넘기기
//    - 큰 화면을 누르면 전체 화면으로 크게 보기
//    - img 에 data-thumb 가 있으면 썸네일은 그 이미지를 쓰고, 원본(GIF 등)은 선택했을 때만 불러옵니다.
// 2) .media 밖에 있는 <main> 안의 단독 figure 이미지도 누르면 크게 보기로 엽니다.
(function () {
  'use strict';

  var lb = null;          // 크게 보기 오버레이 (페이지에 하나)
  var lbOwner = null;     // 지금 크게 보기를 연 대상 { items, index(), step(d), focusBack }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function navButton(cls, label, symbol) {
    var b = el('button', cls, symbol);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    return b;
  }

  function readItem(figure) {
    var img = figure.querySelector('img');
    var cap = figure.querySelector('figcaption');
    var src = img.getAttribute('src');
    return {
      src: src,
      thumb: img.getAttribute('data-thumb') || src,
      alt: img.getAttribute('alt') || '',
      cap: cap ? cap.textContent : '',
      gif: /\.gif$/i.test(src)
    };
  }

  // ---- 크게 보기 ----
  function ensureLightbox() {
    if (lb) return lb;
    lb = el('div', 'lb');
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '크게 보기');
    lb.append(el('img'), el('p'),
      navButton('x', '닫기', '×'), navButton('lp', '이전', '‹'), navButton('ln', '다음', '›'));
    document.body.appendChild(lb);

    lb.querySelector('.x').addEventListener('click', closeLightbox);
    lb.querySelector('.lp').addEventListener('click', function () { stepLightbox(-1); });
    lb.querySelector('.ln').addEventListener('click', function () { stepLightbox(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
    });
    return lb;
  }

  function renderLightbox() {
    var items = lbOwner.items, i = lbOwner.index(), it = items[i];
    var img = lb.querySelector('img');
    img.src = it.src;
    img.alt = it.alt;
    var many = items.length > 1;
    lb.querySelector('p').textContent = (many ? (i + 1) + ' / ' + items.length + (it.cap ? ' · ' : '') : '') + it.cap;
    lb.querySelector('.lp').hidden = !many;
    lb.querySelector('.ln').hidden = !many;
  }

  function openLightbox(owner) {
    ensureLightbox();
    lbOwner = owner;
    renderLightbox();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lb.querySelector('.x').focus();
  }

  function stepLightbox(d) {
    if (!lbOwner || lbOwner.items.length < 2) return;
    lbOwner.step(d);
    renderLightbox();
  }

  function closeLightbox() {
    if (!lb || !lbOwner) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
    if (lbOwner.focusBack) lbOwner.focusBack.focus();
    lbOwner = null;
  }

  // ---- 갤러리 ----
  function build(root) {
    var figs = Array.prototype.filter.call(root.children, function (c) { return c.tagName === 'FIGURE'; });
    if (figs.length === 0) return;
    var items = figs.map(readItem);

    var stage = el('div', 'stage');
    var main = el('img');
    main.draggable = false;
    stage.appendChild(main);
    var count = el('span', 'count');
    stage.appendChild(count);
    stage.appendChild(el('span', 'zoom', '눌러서 크게 보기'));

    var prev = null, next = null;
    if (items.length > 1) {
      prev = navButton('nav prev', '이전 이미지', '‹');
      next = navButton('nav next', '다음 이미지', '›');
      stage.append(prev, next);
    }

    var cap = el('p', 'cap');
    var strip = el('div', 'strip');
    items.forEach(function (it, i) {
      var b = el('button', 'th' + (it.gif ? ' gif' : ''));
      b.type = 'button';
      b.setAttribute('aria-label', (i + 1) + '번째 보기: ' + (it.cap || it.alt));
      var t = el('img');
      t.src = it.thumb;
      t.alt = '';
      t.loading = 'lazy';
      b.appendChild(t);
      b.addEventListener('click', function () { show(i, true); });
      strip.appendChild(b);
    });

    figs.forEach(function (f) { f.hidden = true; });
    root.append(stage, cap);
    if (items.length > 1) root.appendChild(strip);
    root.classList.add('ready');
    if (!root.hasAttribute('tabindex')) root.tabIndex = 0;

    var cur = 0;
    function show(i, scrollStrip) {
      cur = (i + items.length) % items.length;
      var it = items[cur];
      main.src = it.src;
      main.alt = it.alt;
      cap.textContent = it.cap;
      count.textContent = (cur + 1) + ' / ' + items.length;
      Array.prototype.forEach.call(strip.children, function (b, j) {
        b.classList.toggle('on', j === cur);
        b.setAttribute('aria-current', j === cur ? 'true' : 'false');
      });
      // 썸네일 목록만 가로로 스크롤 (페이지는 움직이지 않음)
      if (scrollStrip && strip.children[cur]) {
        var b = strip.children[cur];
        strip.scrollTo({ left: b.offsetLeft - (strip.clientWidth - b.clientWidth) / 2, behavior: 'smooth' });
      }
    }

    var owner = {
      items: items,
      index: function () { return cur; },
      step: function (d) { show(cur + d, true); },
      focusBack: root
    };

    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); owner.step(-1); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); owner.step(1); });

    root.addEventListener('keydown', function (e) {
      if (e.target !== root) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); owner.step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); owner.step(1); }
      else if (e.key === 'Enter') { openLightbox(owner); }
    });

    // 스와이프로 넘기기. 크게 보기는 click 에서 연다.
    // (pointerup 에서 열면 뒤따르는 click 이 방금 뜬 오버레이 배경에 떨어져 바로 닫힘)
    var sx = null, sy = null, swiped = false;
    stage.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; swiped = false; });
    stage.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && items.length > 1) {
        swiped = true;
        owner.step(dx < 0 ? 1 : -1);
      }
    });
    stage.addEventListener('click', function (e) {
      if (swiped) { swiped = false; return; }
      if (e.target.closest('.nav')) return;
      openLightbox(owner);
    });

    show(0, false);
  }

  // ---- 단독 이미지: 누르면 크게 보기 ----
  function makeZoomable(figure) {
    var img = figure.querySelector('img');
    if (!img || img.closest('a')) return;   // 링크 안의 이미지는 링크 동작을 유지
    var owner = { items: [readItem(figure)], index: function () { return 0; }, step: function () {}, focusBack: img };
    img.classList.add('zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', (img.alt || '이미지') + ' 크게 보기');
    img.addEventListener('click', function () { openLightbox(owner); });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(owner); }
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.media'), build);
    Array.prototype.forEach.call(document.querySelectorAll('main figure'), function (f) {
      if (!f.closest('.media')) makeZoomable(f);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
