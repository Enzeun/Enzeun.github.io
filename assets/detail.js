// 상세 페이지의 섹션 제목(h2, h3)으로 플로팅 목차를 만들고, 현재 읽는 위치를 표시합니다.
(function () {
  var main = document.querySelector('main');
  if (!main) return;

  var headings = Array.prototype.slice.call(main.querySelectorAll('section h2, section h3'));
  if (headings.length < 3) return;

  var aside = document.createElement('aside');
  aside.className = 'toc';
  aside.setAttribute('aria-label', '이 페이지의 목차');

  var box = document.createElement('nav');
  var title = document.createElement('p');
  title.className = 'toc-title';
  title.textContent = '목차';
  box.appendChild(title);

  var list = document.createElement('ol');
  var links = [];

  headings.forEach(function (h, i) {
    if (!h.id) h.id = 'sec-' + (i + 1);
    var li = document.createElement('li');
    li.className = h.tagName === 'H3' ? 'sub' : 'top';
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    list.appendChild(li);
    links.push({ heading: h, link: a });
  });

  box.appendChild(list);
  aside.appendChild(box);
  main.appendChild(aside);
  document.body.classList.add('has-toc');

  // 화면 위쪽을 지난 마지막 제목을 현재 위치로 표시합니다.
  var ticking = false;
  function update() {
    ticking = false;
    var current = links[0];
    for (var i = 0; i < links.length; i++) {
      if (links[i].heading.getBoundingClientRect().top <= 120) current = links[i];
      else break;
    }
    links.forEach(function (x) {
      if (x === current) x.link.setAttribute('aria-current', 'true');
      else x.link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    // 스크롤 이벤트가 연속으로 와도 50ms 에 한 번만 계산합니다.
    if (!ticking) { ticking = true; window.setTimeout(update, 50); }
  }, { passive: true });
  update();
})();
