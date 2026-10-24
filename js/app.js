/* ============================================================
   主逻辑：页面切换 / 答题流程 / 结果渲染 / 海报 / 彩纸 / 1024 彩蛋 / 本地存储
   ============================================================ */
(function () {
  'use strict';

  var QUESTIONS = window.QUIZ_QUESTIONS;
  var EGG_QUESTION = window.QUIZ_EGG_QUESTION;
  var PERSONAS = window.PERSONAS;
  var EGG_PERSONA = window.EGG_PERSONA;
  var ORDER = window.PERSONA_ORDER;
  var SCORER = window.SCORER;
  var RADAR = window.RADAR;
  var POSTER = window.POSTER;

  var LS_RESULT = 'gzmoney.result.v1';
  var LS_NICK = 'gzmoney.nickname.v1';
  var LS_EGG = 'gzmoney.egg1024.v1';

  var REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var state = {
    index: 0,
    answers: [],
    questions: [],
    result: null,
    finished: false,
    posterCanvas: null,
    lastFocus: null
  };

  var els = {};

  /* ---------------- 工具函数 ---------------- */

  function $(id) { return document.getElementById(id); }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function todayText() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function safeRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* 忽略隐私模式下的异常 */ }
  }

  var toastTimer = null;
  function toast(text, duration) {
    els.toast.textContent = text;
    els.toast.hidden = false;
    window.requestAnimationFrame(function () { els.toast.classList.add('is-show'); });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove('is-show');
      window.setTimeout(function () { els.toast.hidden = true; }, 300);
    }, duration || 2200);
  }

  function replayPop(node) {
    node.classList.remove('is-pop');
    void node.offsetWidth;
    node.classList.add('is-pop');
  }

  function restartShake(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  /* ---------------- 页面切换 ---------------- */

  function showPage(id) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i += 1) {
      pages[i].classList.remove('is-active', 'page--in');
    }
    var target = $(id);
    target.classList.add('is-active');
    void target.offsetWidth;
    target.classList.add('page--in');
    window.scrollTo({ top: 0, behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
  }

  /* ---------------- 题目集合（包含已解锁的隐藏题） ---------------- */

  function eggUnlocked() {
    return safeGet(LS_EGG) === '1';
  }

  function buildQuestionSet() {
    return eggUnlocked() ? QUESTIONS.concat([EGG_QUESTION]) : QUESTIONS.slice();
  }

  function applyEggQuestion() {
    if (state.finished) return false;
    if (state.questions.length > QUESTIONS.length) return false;
    state.questions = QUESTIONS.concat([EGG_QUESTION]);
    state.answers.push(null);
    return true;
  }

  /* ---------------- 答题流程 ---------------- */

  function resetQuiz() {
    state.questions = buildQuestionSet();
    state.answers = new Array(state.questions.length).fill(null);
    state.index = 0;
    state.result = null;
    state.finished = false;
    state.posterCanvas = null;
  }

  function updateProgress() {
    var total = state.questions.length;
    var answered = state.answers.filter(function (a) { return a !== null; }).length;
    var base = state.index / total;
    var here = state.answers[state.index] !== null ? 1 / total : 0;
    var pct = Math.round((base + here) * 100);
    els.progressFill.style.width = pct + '%';
    els.progressNum.textContent = (state.index + 1) + ' / ' + total;
    els.progress.setAttribute('aria-valuemax', String(total));
    els.progress.setAttribute('aria-valuenow', String(answered));
    els.progress.setAttribute('aria-label', '答题进度：已答 ' + answered + ' 题，共 ' + total + ' 题');
  }

  function renderQuestion(direction) {
    var q = state.questions[state.index];
    var selected = state.answers[state.index];
    var total = state.questions.length;

    els.qNum.textContent = q.id === 1024 ? '1024' : (state.index + 1);
    els.qText.textContent = q.text;
    els.scene.textContent = q.scene;
    els.qNote.textContent = q.id === 1024
      ? '这是 1024 隐藏题，答完就去看结果。'
      : '凭直觉选，别想太久 —— 想太久说明你已经输了。';

    els.options.innerHTML = '';
    q.options.forEach(function (opt, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option' + (selected === i ? ' is-selected' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', selected === i ? 'true' : 'false');

      var key = document.createElement('span');
      key.className = 'option__key';
      key.textContent = 'ABCD'[i];

      var text = document.createElement('span');
      text.className = 'option__text';
      text.textContent = opt.text;

      var mark = document.createElement('span');
      mark.className = 'option__mark';
      mark.textContent = '✓';

      btn.appendChild(key);
      btn.appendChild(text);
      btn.appendChild(mark);
      btn.addEventListener('click', function () { selectOption(i); });
      els.options.appendChild(btn);
    });

    els.prev.disabled = state.index === 0;
    els.next.textContent = state.index === total - 1 ? '查看结果 →' : '下一题 →';

    restartShake(els.card, direction === 'back' ? 'is-in-back' : 'is-in');
    updateProgress();
  }

  function selectOption(index) {
    state.answers[state.index] = index;
    var buttons = els.options.querySelectorAll('.option');
    for (var i = 0; i < buttons.length; i += 1) {
      var on = i === index;
      buttons[i].classList.toggle('is-selected', on);
      buttons[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }
    if (!REDUCE_MOTION) replayPop(buttons[index]);
    updateProgress();
    replayPop(els.next);
  }

  function goNext() {
    if (state.answers[state.index] === null) {
      restartShake(els.card, 'is-shake');
      toast('先选一个答案，再进入下一题～');
      return;
    }
    if (state.index === state.questions.length - 1) {
      finishQuiz();
      return;
    }
    state.index += 1;
    renderQuestion('next');
  }

  function goPrev() {
    if (state.index === 0) return;
    state.index -= 1;
    renderQuestion('back');
  }

  /* ---------------- 结果 ---------------- */

  function finishQuiz() {
    var result = SCORER.analyze(state.answers, state.questions);
    state.result = result;
    state.finished = true;
    saveResult(result);
    renderResult(result);
    showPage('page-result');
    if (!REDUCE_MOTION) confetti.burst(3200);
    animateRadar(result);
  }

  function dynamicLine(result) {
    var top = PERSONAS[result.typeId];
    var runnerUp = PERSONAS[result.ranking[1]];
    var hits = result.hits[result.typeId];
    var total = result.answeredCount;
    var text = '【数据视角】在 ' + total + ' 道题里，你有 ' + hits + ' 次直接把票投给了「' + top.name + '」，拿下 ' +
      result.scores[result.typeId] + ' 分（满分 ' + result.maxScores[result.typeId] + ' 分）。';
    if (result.gap > 0) {
      text += '第二名是「' + runnerUp.name + '」，你只比它多了 ' + result.gap + ' 分——说明你身上其实住着两种打工人。';
    } else {
      text += '「' + runnerUp.name + '」和它同分并列，最后是靠「谁更懂工资到账那一刻的你」才分出胜负的。';
    }
    return text;
  }

  function tieText(result) {
    var names = result.tied.map(function (k) { return PERSONAS[k].name; });
    var winner = PERSONAS[result.typeId].name;
    var head = '你出现了平局：' + names.join(' / ') + ' 同为 ' + result.maxScore + ' 分。判定规则不是随机——';
    if (result.tieRule === 'first-question') {
      return head + '由于第 1 题（工资到账那一刻）最能代表钱包人格，你的选择指向「' + winner + '」，因此判为「' + winner + '」。';
    }
    if (result.tieRule === 'hit-count') {
      return head + '在并列的人格中，你「首选」' + winner + ' 的次数最多（' + result.tieDetail.hits + ' 次），因此判为「' + winner + '」。';
    }
    return head + '按固定优先级（规划 > 谈判 > 存钱 > 月光）判定为「' + winner + '」，同一份答案永远得到同一个结果。';
  }

  function renderResult(result) {
    var persona = PERSONAS[result.typeId];

    els.resultName.textContent = persona.name;
    els.resultTagline.textContent = persona.tagline;
    els.resultSticker.textContent = persona.sticker;
    els.resultSticker.style.background = persona.color;

    /* 得分条 */
    els.scoreList.innerHTML = '';
    ORDER.forEach(function (key) {
      var row = document.createElement('li');
      row.className = 'score-row' + (key === result.typeId ? ' is-top' : '');
      row.innerHTML =
        '<span class="score-row__name">' + PERSONAS[key].name + '</span>' +
        '<span class="score-row__track"><span class="score-row__fill"></span></span>' +
        '<span class="score-row__num">' + result.scores[key] + '</span>';
      row.querySelector('.score-row__fill').style.background = PERSONAS[key].color;
      els.scoreList.appendChild(row);
      var fill = row.querySelector('.score-row__fill');
      window.setTimeout(function () {
        fill.style.width = Math.round(result.ratios[key] * 100) + '%';
      }, REDUCE_MOTION ? 0 : 120);
    });

    /* 平局说明 */
    if (result.isTie) {
      els.tieNote.hidden = false;
      els.tieNote.textContent = tieText(result);
    } else {
      els.tieNote.hidden = true;
      els.tieNote.textContent = '';
    }

    /* 分析 */
    els.analysisText.textContent = persona.analysis + ' ' + dynamicLine(result);

    els.traitChips.innerHTML = '';
    persona.traits.forEach(function (t) {
      var span = document.createElement('span');
      span.className = 'chip';
      span.textContent = t;
      span.style.background = persona.color;
      span.style.color = persona.id === 'saver' ? '#101010' : '#FFFFFF';
      els.traitChips.appendChild(span);
    });

    /* 建议 */
    els.tips.innerHTML = '';
    persona.tips.forEach(function (t, i) {
      var li = document.createElement('li');
      li.className = 'tip';
      li.innerHTML = '<span class="tip__num">' + pad2(i + 1) + '</span><p></p>';
      li.querySelector('p').textContent = t;
      els.tips.appendChild(li);
    });

    els.quoteText.textContent = persona.quote;

    /* 昵称回填 */
    var savedNick = safeGet(LS_NICK);
    if (savedNick) els.nickname.value = savedNick;

    drawRadarFrame(result, REDUCE_MOTION ? 1 : 0);
  }

  function radarOptions(result, progress) {
    return {
      cx: 360,
      cy: 360,
      r: 214,
      values: ORDER.map(function (k) { return result.ratios[k]; }),
      percent: ORDER.map(function (k) { return result.ratios[k] * 100; }),
      labels: ORDER.map(function (k) { return PERSONAS[k].name.slice(0, 2); }),
      color: PERSONAS[result.typeId].color,
      progress: progress,
      highlightIndex: ORDER.indexOf(result.typeId),
      showValues: true,
      labelFontSize: 44,
      valueFontSize: 30
    };
  }

  function drawRadarFrame(result, progress) {
    var ctx = els.radar.getContext('2d');
    ctx.clearRect(0, 0, els.radar.width, els.radar.height);
    RADAR.draw(ctx, radarOptions(result, progress));
  }

  function animateRadar(result) {
    if (REDUCE_MOTION) { drawRadarFrame(result, 1); return; }
    var start = null;
    var duration = 820;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      drawRadarFrame(result, eased);
      if (t < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  /* ---------------- 本地存储 ---------------- */

  function saveResult(result) {
    var payload = {
      result: result,
      nickname: els.nickname.value.trim(),
      date: todayText(),
      questionCount: state.questions.length,
      egg: eggUnlocked(),
      time: Date.now()
    };
    if (!safeSet(LS_RESULT, JSON.stringify(payload))) {
      toast('本地存储不可用（可能是隐私模式），本次结果不会被记录');
    }
    renderLastResultCard(payload);
  }

  function loadStoredResult() {
    var raw = safeGet(LS_RESULT);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      if (!data || !data.result || !PERSONAS[data.result.typeId]) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function renderLastResultCard(data) {
    if (!data) {
      els.lastResult.hidden = true;
      els.btnLast.hidden = true;
      return;
    }
    var persona = PERSONAS[data.result.typeId];
    els.lastResultText.textContent = persona.name + ' · ' + (data.date || '') + ' · ' + data.result.scores[data.result.typeId] + ' 分';
    els.lastResult.hidden = false;
    els.btnLast.hidden = false;
  }

  function restoreLastResult() {
    var data = loadStoredResult();
    renderLastResultCard(data);
    return data;
  }

  /* ---------------- 海报 ---------------- */

  function currentNickname() {
    var n = els.nickname.value.trim();
    return n || '匿名打工人';
  }

  function buildPoster() {
    var result = state.result;
    if (!result) return null;
    var persona = PERSONAS[result.typeId];
    var canvas = POSTER.render({
      nickname: currentNickname(),
      persona: persona,
      result: result,
      order: ORDER,
      typeNames: SCORER.TYPE_NAMES,
      dateText: todayText(),
      eggUnlocked: eggUnlocked()
    });
    state.posterCanvas = canvas;
    return canvas;
  }

  function handleGeneratePoster() {
    var canvas = buildPoster();
    if (!canvas) { toast('请先完成测试'); return; }
    safeSet(LS_NICK, currentNickname());
    els.posterPreview.src = canvas.toDataURL('image/png');
    openModal('poster');
    if (!REDUCE_MOTION) confetti.burst(1600);
  }

  function handleDownload() {
    var canvas = state.posterCanvas || buildPoster();
    if (!canvas) { toast('海报还没生成好，请再试一次'); return; }
    var persona = PERSONAS[state.result.typeId];
    var name = POSTER.filename(currentNickname(), persona.name);
    var url = canvas.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('海报已开始下载：' + name, 2600);
  }

  function shareText() {
    if (!state.result) return '';
    var persona = PERSONAS[state.result.typeId];
    return '我的钱包人格是「' + persona.name + '」——' + persona.tagline + '。\n' +
      '「' + persona.quote + '」\n' +
      '工资去哪儿了？8 道职场情景题，测出你的钱包人格（月光冲锋员 / 存钱守护者 / 涨薪谈判王 / 财富规划师）。';
  }

  function handleCopyShare() {
    if (!state.result) { toast('请先完成测试'); return; }
    var text = shareText();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? '分享文案已复制，去粘贴给朋友吧～' : '复制失败，请手动选择文本复制');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('分享文案已复制，去粘贴给朋友吧～');
      })['catch'](fallback);
    } else {
      fallback();
    }
  }

  /* ---------------- 弹窗 ---------------- */

  function openModal(name) {
    var modal = $(name + '-modal');
    state.lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var focusable = modal.querySelector('.btn');
    if (focusable) focusable.focus();
  }

  function closeModal(name) {
    var modal = $(name + '-modal');
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }

  function closeAllModals() {
    ['poster', 'egg'].forEach(closeModal);
  }

  /* ---------------- 1024 彩蛋 ---------------- */

  function refreshEggUI() {
    var on = eggUnlocked();
    els.eggBadge.hidden = !on;
    els.chipCount.textContent = on ? '9 道题（含 1 道隐藏题）' : '8 道情景题';
  }

  function renderEggPersona() {
    if (!EGG_PERSONA) return;
    els.eggPersonaBadge.textContent = EGG_PERSONA.badge;
    els.eggPersonaName.textContent = EGG_PERSONA.name;
    els.eggPersonaDesc.textContent = EGG_PERSONA.desc;
    els.eggQuote.textContent = '「' + EGG_PERSONA.quote + '」';
  }

  function triggerEgg() {
    var first = !eggUnlocked();
    if (first) {
      safeSet(LS_EGG, '1');
      var added = applyEggQuestion();
      refreshEggUI();
      els.eggFoot.textContent = added
        ? '隐藏题已加入本次测试（它会出现在最后一题）。'
        : (state.finished ? '你已完成测试，隐藏题会在下一次测试中出现。' : '隐藏题会在下一次测试中出现。');
      toast('1024！你解锁了隐藏关卡', 2600);
      if (!REDUCE_MOTION) confetti.burst(2400);
    } else {
      els.eggFoot.textContent = '彩蛋已在本地记录，结果页和海报上都会有 1024 徽章。';
      toast('这个彩蛋你已经拿过啦～', 1800);
    }
    if (state.questions.length) renderQuestion('next');
    openModal('egg');
  }

  /* ---------------- 彩纸 ---------------- */

  var confetti = (function () {
    var canvas = null;
    var ctx = null;
    var particles = [];
    var rafId = null;
    var endAt = 0;
    var lastTime = 0;
    var palette = ['#FF53A5', '#B8F36B', '#4676FF', '#A68AFF', '#FFE84A', '#FF7A3D'];

    function resize() {
      if (!canvas) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(count) {
      var w = window.innerWidth;
      for (var i = 0; i < count; i += 1) {
        particles.push({
          x: w * (0.15 + Math.random() * 0.7),
          y: -20 - Math.random() * window.innerHeight * 0.5,
          vx: (Math.random() - 0.5) * 3.4,
          vy: 2.4 + Math.random() * 4.2,
          size: 8 + Math.random() * 12,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.22,
          color: palette[(Math.random() * palette.length) | 0],
          round: Math.random() > 0.62
        });
      }
    }

    function frame(ts) {
      var dt = lastTime ? Math.min(32, ts - lastTime) : 16;
      lastTime = ts;
      var w = window.innerWidth;
      var h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      var fading = ts > endAt - 900;
      ctx.globalAlpha = fading ? Math.max(0, (endAt - ts) / 900) : 1;

      for (var i = particles.length - 1; i >= 0; i -= 1) {
        var p = particles[i];
        p.vy += 0.0045 * dt;
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.rot += p.vr * (dt / 16);
        if (p.y > h + 40) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (ts < endAt && particles.length) {
        rafId = window.requestAnimationFrame(frame);
      } else {
        particles.length = 0;
        ctx.clearRect(0, 0, w, h);
        rafId = null;
      }
    }

    function burst(duration) {
      if (REDUCE_MOTION || !canvas) return;
      endAt = window.performance.now() + (duration || 2600);
      lastTime = 0;
      spawn(window.innerWidth < 680 ? 60 : 110);
      if (rafId === null) rafId = window.requestAnimationFrame(frame);
    }

    function init() {
      canvas = $('fx-canvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
    }

    return { init: init, burst: burst };
  })();

  /* ---------------- 事件绑定 ---------------- */

  function bindEvents() {
    els.btnStart.addEventListener('click', function () {
      resetQuiz();
      els.card.classList.remove('is-in', 'is-in-back', 'is-shake');
      showPage('page-quiz');
      renderQuestion('next');
    });

    els.btnLast.addEventListener('click', function () {
      var data = loadStoredResult();
      if (!data) { toast('没有找到本地记录'); restoreLastResult(); return; }
      state.result = data.result;
      state.finished = true;
      renderResult(data.result);
      showPage('page-result');
      if (!REDUCE_MOTION) confetti.burst(2200);
      animateRadar(data.result);
    });

    els.btnClearLast.addEventListener('click', function () {
      safeRemove(LS_RESULT);
      restoreLastResult();
      toast('本地记录已清除');
    });

    els.next.addEventListener('click', goNext);
    els.prev.addEventListener('click', goPrev);
    els.btnRestart.addEventListener('click', function () {
      resetQuiz();
      showPage('page-quiz');
      renderQuestion('next');
      toast('重新开始，这次要说实话哦');
    });
    els.btnHome.addEventListener('click', function () {
      restoreLastResult();
      showPage('page-home');
    });

    els.btnPoster.addEventListener('click', handleGeneratePoster);
    els.posterDownload.addEventListener('click', handleDownload);
    els.btnCopyShare.addEventListener('click', handleCopyShare);

    els.nickname.addEventListener('change', function () {
      safeSet(LS_NICK, els.nickname.value.trim());
    });
    els.nickname.addEventListener('input', function () {
      state.posterCanvas = null;
    });

    /* 弹窗关闭 */
    var closers = document.querySelectorAll('[data-close]');
    for (var i = 0; i < closers.length; i += 1) {
      closers[i].addEventListener('click', function () {
        closeModal(this.getAttribute('data-close'));
      });
    }

    /* 键盘：Esc 关闭弹窗；输入 1024 触发彩蛋 */
    var buffer = '';
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeAllModals(); return; }
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') { buffer = ''; return; }
      if (/^[0-9]$/.test(e.key)) {
        buffer = (buffer + e.key).slice(-8);
        if (buffer.indexOf('1024') !== -1) {
          buffer = '';
          triggerEgg();
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        buffer = '';
      }
    });
  }

  /* ---------------- 初始化 ---------------- */

  function cacheEls() {
    els = {
      toast: $('toast'),
      progress: $('progress'),
      progressFill: $('progress-fill'),
      progressNum: $('progress-num'),
      scene: $('quiz-scene'),
      card: $('quiz-card'),
      qNum: $('q-num'),
      qText: $('q-text'),
      qNote: $('q-note'),
      options: $('options'),
      prev: $('btn-prev'),
      next: $('btn-next'),
      btnStart: $('btn-start'),
      btnLast: $('btn-last'),
      lastResult: $('last-result'),
      lastResultText: $('last-result-text'),
      btnClearLast: $('btn-clear-last'),
      resultName: $('result-name'),
      resultTagline: $('result-tagline'),
      resultSticker: $('result-sticker'),
      radar: $('radar-canvas'),
      scoreList: $('score-list'),
      tieNote: $('tie-note'),
      analysisText: $('analysis-text'),
      traitChips: $('trait-chips'),
      tips: $('tips'),
      quoteText: $('quote-text'),
      nickname: $('nickname-input'),
      btnPoster: $('btn-poster'),
      posterDownload: $('poster-download'),
      posterPreview: $('poster-preview'),
      eggBadge: $('egg-badge'),
      eggPersonaBadge: $('egg-persona-badge'),
      eggPersonaName: $('egg-persona-name'),
      eggPersonaDesc: $('egg-persona-desc'),
      eggQuote: $('egg-quote'),
      eggFoot: document.querySelector('.egg-foot'),
      chipCount: $('chip-count'),
      btnRestart: $('btn-restart'),
      btnHome: $('btn-home'),
      btnCopyShare: $('btn-copy-share')
    };
  }

  function init() {
    cacheEls();
    confetti.init();
    renderEggPersona();
    refreshEggUI();
    resetQuiz();
    renderQuestion('next');
    bindEvents();
    restoreLastResult();
    showPage('page-home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
