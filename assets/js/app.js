/* СуперВеб — поведение страницы.
   Весь контент работает и без этого файла: аккордеоны на <details>,
   таблица отрисована в разметке. Скрипт только добавляет удобства. */

(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- Дата старта. Меняется здесь и больше нигде. ----------------------
     Пока известен только месяц (ноябрь 2026), точной даты нет — поэтому
     null, и отсчёт скрыт. Когда день назначат, впишите его:
       var START = new Date('2026-10-15T00:00:00+03:00');
     и обновите текст «Новый интенсив в ноябре 2026 года» в index.html. */
  var START = null;

  /* --- 1. Шапка: тень и рамка после прокрутки --------------------------- */
  var header = $('#header');
  var sticky = $('#stickyCta');
  var hero   = $('.hero');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-stuck', y > 8);
    if (sticky && hero) {
      sticky.classList.toggle('is-on', y > hero.offsetHeight * 0.7);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- 2. Мобильное меню ------------------------------------------------ */
  var burger = $('#burger');
  var drawer = $('#drawer');

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      if (open) {
        closeDrawer();
      } else {
        drawer.hidden = false;
        drawer.classList.add('is-open');
        burger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      }
    });

    $$('a', drawer).forEach(function (a) { a.addEventListener('click', closeDrawer); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  /* --- 3. Обратный отсчёт ----------------------------------------------- */
  var blocks = $$('[data-count]');
  var timer = null;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function tick() {
    var left = START ? START - new Date() : 0;

    // Даты нет или она прошла — прячем блок целиком. Нули на странице
    // выглядят как сломанный виджет и работают против доверия к сайту.
    if (left <= 0) {
      blocks.forEach(function (b) { b.hidden = true; });
      if (timer) clearInterval(timer);
      return;
    }

    var d = Math.floor(left / 86400000);
    var h = Math.floor(left / 3600000) % 24;
    var m = Math.floor(left / 60000) % 60;
    var s = Math.floor(left / 1000) % 60;

    blocks.forEach(function (b) {
      b.hidden = false;
      var set = function (k, v) {
        var el = b.querySelector('[data-cd="' + k + '"]');
        if (el && el.textContent !== v) el.textContent = v;
      };
      set('d', String(d));
      set('h', pad(h));
      set('m', pad(m));
      set('s', pad(s));
    });
  }

  if (blocks.length) { tick(); timer = setInterval(tick, 1000); }

  /* --- 4. Таблица: только отличия --------------------------------------- */
  var onlyDiff = $('#onlyDiff');
  var cmp = $('#cmp');

  if (onlyDiff && cmp) {
    onlyDiff.addEventListener('change', function () {
      cmp.classList.toggle('only-diff', onlyDiff.checked);
    });
  }

  /* --- 5. Таблица: выбор колонки на узком экране ------------------------- */
  var picker = $('#tierPick');

  function applyColumn(n) {
    if (!cmp) return;
    $$('[data-col]', cmp).forEach(function (cell) {
      cell.classList.toggle('is-shown', cell.getAttribute('data-col') === n);
    });
  }

  function syncColumns() {
    if (!cmp) return;
    if (window.matchMedia('(max-width: 720px)').matches) {
      applyColumn(picker ? picker.value : '2');
    } else {
      $$('[data-col]', cmp).forEach(function (cell) { cell.classList.add('is-shown'); });
    }
  }

  if (picker) picker.addEventListener('change', syncColumns);
  window.addEventListener('resize', syncColumns);
  syncColumns();

  /* --- 6. Выбранный тариф подставляется в сообщение Марии ---------------- */
  var askLink = $('#askLink');

  function setAskTier(tier) {
    if (!askLink) return;
    var base = askLink.getAttribute('data-base');
    askLink.href = tier
      ? base + encodeURIComponent('. Интересует тариф «' + tier + '»')
      : base;
  }

  $$('[data-tier]').forEach(function (a) {
    a.addEventListener('click', function () {
      var tier = a.getAttribute('data-tier');
      try { sessionStorage.setItem('sw_tier', tier); } catch (e) {}
      setAskTier(tier);
    });
  });

  // Если тариф выбирали раньше в этой вкладке — подставляем сразу
  try { setAskTier(sessionStorage.getItem('sw_tier')); } catch (e) {}

  /* --- 6a. Ленты с прокруткой: стрелки и перетаскивание мышью ----------- */
  /* Лент может быть несколько (фото об Антоне, конференции) - у каждой свои кнопки */
  $$('.strip-wrap').forEach(function (wrap) {
    var strip = $('.strip', wrap);
    if (!strip) return;
    var btns = $$('[data-strip]', wrap);

    // Бесконечная лента (.strip--loop): дублируем карточки, и когда прокрутка
    // доходит до копий, незаметно возвращаем её к оригиналам. Край не виден.
    var loop = strip.classList.contains('strip--loop');
    var setW = 0;         // ширина одного набора карточек вместе с зазором
    var measureSet = null;

    if (loop) {
      var originals = Array.prototype.slice.call(strip.children);
      originals.forEach(function (node) {
        var copy = node.cloneNode(true);
        copy.setAttribute('data-clone', '1');
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('tabindex', '-1');
        strip.appendChild(copy);
      });
      // Меряем ширину набора каждый раз заново: картинки грузятся лениво,
      // и разметка меняется уже после первой прокрутки.
      var firstCopy = strip.children[originals.length];
      var firstItem = originals[0];
      measureSet = function () { setW = firstCopy.offsetLeft - firstItem.offsetLeft; return setW; };
    }

    function sync() {
      if (loop) { btns.forEach(function (b) { b.disabled = false; }); return; }
      var max = strip.scrollWidth - strip.clientWidth - 1;
      btns.forEach(function (b) {
        var dir = Number(b.getAttribute('data-strip'));
        b.disabled = dir < 0 ? strip.scrollLeft <= 0 : strip.scrollLeft >= max;
      });
    }

    // Перескок делаем только когда прокрутка остановилась: иначе она оборвёт
    // плавную анимацию стрелок на полпути.
    var settle = null;
    function wrapWhenIdle() {
      if (!loop) return;
      clearTimeout(settle);
      settle = setTimeout(function () {
        var w = measureSet();
        if (w < strip.clientWidth) return;   // набор уже поместился целиком: листать нечего
        if (strip.scrollLeft >= w) strip.scrollLeft -= w;
        else if (strip.scrollLeft <= 0) strip.scrollLeft += w;
      }, 120);
    }

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = Number(b.getAttribute('data-strip'));
        // В бесконечной ленте перед шагом возвращаемся к оригиналам, если ушли
        // на копии: позиция визуально та же, но впереди снова целый набор.
        if (loop && measureSet) {
          var w = measureSet();
          if (w >= strip.clientWidth) {
            if (dir > 0 && strip.scrollLeft >= w) strip.scrollLeft -= w;
            else if (dir < 0 && strip.scrollLeft <= 0) strip.scrollLeft += w;
          }
        }
        strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: 'smooth' });
      });
    });

    strip.addEventListener('scroll', function () { sync(); wrapWhenIdle(); }, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    // Перетаскивание мышью на десктопе; на тач-экранах работает нативный свайп
    var drag = null;
    strip.addEventListener('mousedown', function (e) {
      if (e.target.closest('video, a, button')) return;
      drag = { x: e.pageX, left: strip.scrollLeft };
      strip.style.scrollSnapType = 'none';
    });
    window.addEventListener('mousemove', function (e) {
      if (!drag) return;
      strip.scrollLeft = drag.left - (e.pageX - drag.x);
    });
    window.addEventListener('mouseup', function () {
      if (!drag) return;
      drag = null;
      strip.style.scrollSnapType = '';
    });
  });
  /* --- 6b. Фильтр по потокам: кейсы и выпускные --------------------------- */
  /* Кнопки .ftab внутри .ftabs, элементы с data-stream - в том же .wrap */
  $$('.ftabs').forEach(function (tabs) {
    var wrap = tabs.closest('.wrap') || tabs.parentElement;
    var btns = $$('.ftab', tabs);
    var items = $$('[data-stream]', wrap);
    var empty = $('.cases-empty', wrap);
    var isCases = !!$('#casesGrid', wrap);

    function applyFilter(val) {
      var shown = 0;
      items.forEach(function (c) {
        var on = val === 'all' || c.getAttribute('data-stream') === val;
        c.classList.toggle('is-hidden', !on);
        if (on) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      btns.forEach(function (b) {
        var active = b.getAttribute('data-filter') === val;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      if (isCases) {
        try { history.replaceState(null, '', val === 'all' ? location.pathname : '#stream-' + val); } catch (e) {}
      }
    }

    btns.forEach(function (b) {
      b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter')); });
    });

    // Прямая ссылка на поток: cases.html#stream-14
    var mHash = isCases && /^#stream-(\d+)$/.exec(location.hash);
    if (mHash) applyFilter(mHash[1]);
    else { var act = $('.ftab.is-active', tabs); if (act) applyFilter(act.getAttribute('data-filter')); }
  });
  /* --- 6c. Лайтбокс для кейсов ------------------------------------------- */
  var lb = $('#lightbox');

  if (lb) {
    var lbImg = $('#lightboxImg');
    var lbCount = $('#lightboxCount');
    var lbItems = $$('[data-lightbox]');
    var lbIndex = -1;
    var lbLast = null;
    var lbGroup = '';   // значение data-lightbox: листаем только внутри своей галереи

    function lbVisible() {
      return lbItems.filter(function (a) {
        return !a.classList.contains('is-hidden') && !a.hasAttribute('data-clone') &&
               (a.getAttribute('data-lightbox') || '') === lbGroup;
      });
    }

    function lbShow(i) {
      var list = lbVisible();
      if (!list.length) return;
      lbIndex = (i + list.length) % list.length;
      var a = list[lbIndex];
      var full = a.getAttribute('href');
      lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';   // перезапуск появления
      lbImg.src = (full && full !== '#lb') ? full : a.querySelector('img').src;
      lbImg.alt = a.querySelector('img') ? a.querySelector('img').alt : '';
      if (lbCount) lbCount.textContent = (lbIndex + 1) + ' / ' + list.length;
      // Подгружаем соседей заранее
      [1, -1].forEach(function (d) {
        var n = list[(lbIndex + d + list.length) % list.length];
        if (n && n.getAttribute('href') !== '#lb') { var im = new Image(); im.src = n.getAttribute('href'); }
      });
    }

    function lbOpen(a) {
      // Клик по копии из бесконечной ленты открываем как клик по оригиналу
      if (a.hasAttribute('data-clone')) {
        var href = a.getAttribute('href');
        var orig = lbItems.filter(function (x) {
          return !x.hasAttribute('data-clone') && x.getAttribute('href') === href;
        })[0];
        if (orig) a = orig;
      }
      lbLast = a;
      lbGroup = a.getAttribute('data-lightbox') || '';
      lb.hidden = false;
      document.body.classList.add('lb-open');
      lbShow(lbVisible().indexOf(a));
      $('[data-lb-close]', lb).focus();
    }

    function lbClose() {
      lb.hidden = true;
      document.body.classList.remove('lb-open');
      if (lbLast) lbLast.focus();
    }

    lbItems.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); lbOpen(a); });
    });
    $('[data-lb-close]', lb).addEventListener('click', lbClose);
    $$('[data-lb]', lb).forEach(function (b) {
      b.addEventListener('click', function () { lbShow(lbIndex + Number(b.getAttribute('data-lb'))); });
    });
    lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
      if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
    });

    // Свайп на телефоне
    var tx = null;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    });
  }

  /* --- 7. Появление блоков при прокрутке -------------------------------- */
  var reveals = $$('.reveal');

  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    reveals.forEach(function (el) { io.observe(el); });
  } else {
    // Нет IntersectionObserver — показываем всё сразу.
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --- 8. Подсветка активного пункта меню ------------------------------- */
  var links = $$('.nav a[href^="#"]');
  var targets = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && targets.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    targets.forEach(function (t) { spy.observe(t); });
  }

  /* --- 9. Год в подвале -------------------------------------------------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
  /* ---------- Видео-карточки: по клику вместо обложки - плеер YouTube ---------- */
  document.querySelectorAll('.vcard__link[data-yt]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + a.dataset.yt + '?autoplay=1&rel=0&modestbranding=1';
      f.title = a.getAttribute('aria-label') || 'Видео';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.setAttribute('allowfullscreen', '');
      a.replaceWith(f);
    });
  });
  /* ---------- Клипы VK: по клику вместо обложки - плеер ---------- */
  document.querySelectorAll('.vkposter[data-vk]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var p = a.dataset.vk.split(',');
      var f = document.createElement('iframe');
      f.src = 'https://vk.com/video_ext.php?oid=' + p[0] + '&id=' + p[1] + '&hd=2&autoplay=1';
      f.title = a.getAttribute('aria-label') || 'Видео';
      f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock';
      f.setAttribute('allowfullscreen', '');
      a.replaceWith(f);
    });
  });
  /* ---------- Проверка сертификата: поиск по номеру или нику в Telegram ---------- */
  /* Данные отдаёт тот же сервис, что и на старом сайте (доступ разрешён с superweb.ru) */
  var lkForm = document.getElementById('lookupForm');
  if (lkForm) {
    var lkQ = document.getElementById('lookupQ'), lkBtn = document.getElementById('lookupBtn');
    var lkTable = document.getElementById('lookupTable'), lkBody = lkTable.querySelector('tbody'), lkHint = document.getElementById('lookupHint');
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function hint(t) { lkHint.textContent = t; lkHint.hidden = !t; }
    lkForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = lkQ.value.trim();
      if (!q) { hint('Введите номер сертификата или ник в Telegram.'); return; }
      var params = new URLSearchParams();
      if (/^\d+$/.test(q)) params.append('diploma_number', q); else params.append('tg_username', q.replace(/^@/, ''));
      lkBtn.disabled = true; hint('Ищем…'); lkTable.hidden = true; lkBody.innerHTML = '';
      fetch('https://salebot-help.ru/sw/php/soderzhitselect.php', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString()
      })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!rows || !rows.length) { hint('Ничего не найдено. Проверьте номер или ник и попробуйте снова.'); return; }
        rows.forEach(function (z) {
          var tg = (z.tg_username || '').replace(/^@/, '');
          lkBody.insertAdjacentHTML('beforeend', '<tr>' +
            '<td>' + esc(z.studentname) + '</td>' +
            '<td class="num">' + esc(z.flow) + '</td>' +
            '<td>' + (tg ? '<a href="https://t.me/' + esc(tg) + '" target="_blank" rel="noopener">@' + esc(tg) + '</a>' : '') + '</td>' +
            '<td class="num">' + esc(z.score) + '</td>' +
            '<td>' + (z.diploma ? '<a href="https://course.superweb.ru/pl/' + esc(z.diploma) + '" target="_blank" rel="noopener">Открыть сертификат</a>' : '') + '</td>' +
            '<td class="num">' + esc(z.diploma_number) + '</td></tr>');
        });
        hint(''); lkTable.hidden = false;
      })
      .catch(function () { hint('Не удалось загрузить данные. Попробуйте ещё раз чуть позже.'); })
      .then(function () { lkBtn.disabled = false; });
    });
  }
})();
