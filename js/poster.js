/* ============================================================
   结果海报生成（原生 Canvas 2D 绘制，零第三方依赖）
   - 不依赖任何外部图片，Canvas 不会被跨域污染
   - 导出的 PNG 可直接下载
   ============================================================ */
(function (global) {
  'use strict';

  var W = 1080;
  var H = 1620;
  var FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Hiragino Sans GB", sans-serif';

  var COLORS = {
    yellow: '#FFE84A',
    green: '#B8F36B',
    pink: '#FF53A5',
    blue: '#4676FF',
    purple: '#A68AFF',
    ink: '#101010',
    paper: '#FFFDF3'
  };

  /* ---------- 基础绘制工具 ---------- */

  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  function panel(ctx, x, y, w, h, r, fill, stroke, lw, shadowOffset) {
    if (shadowOffset) {
      ctx.save();
      roundRectPath(ctx, x + shadowOffset, y + shadowOffset, w, h, r);
      ctx.fillStyle = COLORS.ink;
      ctx.fill();
      ctx.restore();
    }
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = lw || 6;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  /* 按字符宽度折行，中文友好；避免行首出现标点 */
  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    var line = '';
    var noStart = '，。！？、；：）」』】》!?,.;:)';
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (ch === '\n') {
        lines.push(line);
        line = '';
        continue;
      }
      var next = line + ch;
      if (ctx.measureText(next).width > maxWidth && line !== '') {
        if (noStart.indexOf(ch) !== -1) {
          var last = line[line.length - 1];
          lines.push(line.slice(0, -1));
          line = last + ch;
        } else {
          lines.push(line);
          line = ch;
        }
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawLines(ctx, lines, x, startY, lineHeight, align) {
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
  }

  /* 斜条纹背景（多巴胺风几何元素，不使用渐变） */
  function stripes(ctx, x, y, w, h, color, gap) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, 30);
    ctx.clip();
    ctx.fillStyle = color;
    var step = gap || 38;
    for (var i = -h; i < w + h; i += step) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + step / 2, y + h);
      ctx.lineTo(x + i + step / 2 + h, y);
      ctx.lineTo(x + i + h, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function dotPattern(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(16, 16, 16, .10)';
    for (var y = 16; y < H; y += 26) {
      for (var x = 16; x < W; x += 26) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function chip(ctx, x, y, text, fontSize, fill, color, border) {
    ctx.font = '800 ' + fontSize + 'px ' + FONT;
    var padX = fontSize * 0.75;
    var w = ctx.measureText(text).width + padX * 2;
    var h = fontSize * 2.1;
    panel(ctx, x, y, w, h, h / 2, fill, border || null, 0, 0);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX, y + h / 2 + 1);
    return w;
  }

  /* ---------- 主渲染 ---------- */

  /**
   * @param {Object} data
   *   nickname      昵称
   *   persona       PERSONAS 中的一项
   *   result        SCORER.analyze() 的返回值
   *   order         维度顺序（默认 PERSONA_ORDER）
   *   typeNames     维度名称表
   *   dateText      日期字符串
   *   eggUnlocked   是否解锁 1024 彩蛋
   *   shareText     底部分享文案
   */
  function render(data) {
    var order = data.order;
    var persona = data.persona;
    var result = data.result;
    var typeNames = data.typeNames;

    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    /* 背景 */
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(0, 0, W, H);
    dotPattern(ctx);

    /* 背景几何装饰 */
    ctx.save();
    ctx.translate(880, 120);
    ctx.rotate(0.22);
    panel(ctx, -70, -70, 200, 200, 46, COLORS.green, COLORS.ink, 6, 8);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(70, 1520, 110, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.pink;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = COLORS.ink;
    ctx.stroke();

    ctx.save();
    ctx.translate(1010, 1500);
    ctx.rotate(-0.2);
    panel(ctx, -90, -60, 180, 120, 26, COLORS.purple, COLORS.ink, 6, 8);
    ctx.restore();

    /* 顶部标题 */
    ctx.fillStyle = COLORS.ink;
    ctx.font = '900 46px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('工资去哪儿了？', 60, 118);
    ctx.font = '700 26px ' + FONT;
    ctx.fillStyle = 'rgba(16, 16, 16, .68)';
    ctx.fillText('打工人钱包人格测试 · 结果海报', 62, 162);

    var rightEdge = W - 60;
    if (data.eggUnlocked) {
      ctx.font = '800 24px ' + FONT;
      var w2 = ctx.measureText('1024 彩蛋已解锁').width + 36;
      chip(ctx, rightEdge - w2, 132, '1024 彩蛋已解锁', 24, COLORS.blue, '#FFFFFF', null);
    }
    ctx.font = '800 24px ' + FONT;
    var w1 = ctx.measureText('TRAE 1024 代码盲盒挑战').width + 36;
    chip(ctx, rightEdge - w1, 62, 'TRAE 1024 代码盲盒挑战', 24, COLORS.ink, COLORS.yellow, null);

    /* 主卡片 */
    panel(ctx, 60, 200, 960, 1270, 44, COLORS.paper, COLORS.ink, 6, 10);

    /* 头部信息 */
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(16, 16, 16, .62)';
    ctx.font = '700 28px ' + FONT;
    ctx.fillText('你的钱包人格是', 104, 292);

    /* 人格名条 */
    panel(ctx, 104, 316, 832, 118, 30, persona.color, COLORS.ink, 6, 8);
    ctx.fillStyle = COLORS.ink;
    ctx.font = '900 76px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(persona.name, 520, 316 + 62);

    /* 昵称与日期 */
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = '800 30px ' + FONT;
    ctx.fillStyle = COLORS.ink;
    var nick = '昵称：' + (data.nickname || '匿名打工人');
    ctx.fillText(nick, 104, 486);
    ctx.font = '700 26px ' + FONT;
    ctx.fillStyle = 'rgba(16, 16, 16, .6)';
    ctx.textAlign = 'right';
    ctx.fillText(data.dateText || '', 936, 486);

    /* 雷达图 */
    var values = order.map(function (k) { return result.ratios[k]; });
    global.RADAR.draw(ctx, {
      cx: 540,
      cy: 716,
      r: 146,
      values: values,
      percent: order.map(function (k) { return result.ratios[k] * 100; }),
      labels: order.map(function (k) { return typeNames[k].slice(0, 2); }),
      color: persona.color,
      progress: 1,
      highlightIndex: order.indexOf(result.typeId),
      showValues: true,
      labelFontSize: 32,
      valueFontSize: 24,
      gridColor: 'rgba(16, 16, 16, .18)',
      axisColor: 'rgba(16, 16, 16, .34)',
      labelColor: COLORS.ink
    });

    /* 四维得分条 */
    var trackX = 392;
    var trackW = 440;
    order.forEach(function (key, i) {
      var rowCenter = 1000 + i * 56;
      var score = result.scores[key];
      var ratio = result.ratios[key];
      var isTop = key === result.typeId;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = (isTop ? '900 ' : '700 ') + '26px ' + FONT;
      ctx.fillStyle = COLORS.ink;
      ctx.fillText(typeNames[key], 104, rowCenter);

      roundRectPath(ctx, trackX, rowCenter - 13, trackW, 26, 13);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = COLORS.ink;
      ctx.stroke();

      var fillW = Math.max(10, trackW * ratio);
      ctx.save();
      roundRectPath(ctx, trackX, rowCenter - 13, trackW, 26, 13);
      ctx.clip();
      ctx.fillStyle = global.PERSONAS[key].color;
      ctx.fillRect(trackX, rowCenter - 13, fillW, 26);
      ctx.restore();

      ctx.textAlign = 'right';
      ctx.font = '800 26px ' + FONT;
      ctx.fillText(score + ' 分', 976, rowCenter);
    });

    /* 特质标签 */
    var chipX = 104;
    var chipColors = [
      { fill: COLORS.pink, color: '#FFFFFF' },
      { fill: COLORS.green, color: COLORS.ink },
      { fill: COLORS.blue, color: '#FFFFFF' }
    ];
    persona.traits.forEach(function (t, i) {
      var c = chipColors[i % chipColors.length];
      var w = chip(ctx, chipX, 1196, t, 26, c.fill, c.color, COLORS.ink);
      chipX += w + 16;
    });

    /* 金句 */
    panel(ctx, 104, 1300, 832, 112, 26, persona.accent === '#101010' ? COLORS.ink : COLORS.green, COLORS.ink, 6, 6);
    ctx.font = '800 30px ' + FONT;
    ctx.fillStyle = persona.accent === '#101010' ? COLORS.yellow : COLORS.ink;
    var quoteLines = wrapText(ctx, '「' + persona.quote + '」', 740);
    if (quoteLines.length > 2) quoteLines = quoteLines.slice(0, 2);
    var quoteStartY = 1300 + (quoteLines.length === 1 ? 68 : 48);
    drawLines(ctx, quoteLines, 140, quoteStartY, 44, 'left');

    /* 免责声明 */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 24px ' + FONT;
    ctx.fillStyle = 'rgba(16, 16, 16, .72)';
    ctx.fillText('本测试为娱乐性内容，不构成任何理财、职业或经济状况建议', W / 2, 1532);
    ctx.font = '800 24px ' + FONT;
    ctx.fillStyle = COLORS.ink;
    ctx.fillText('工资去哪儿了？· TRAE 1024 代码盲盒挑战', W / 2, 1572);

    /* 底部装饰条纹 */
    stripes(ctx, 900, 1590, 150, 20, COLORS.ink, 22);

    return canvas;
  }

  function filename(nickname, personaName) {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var date = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var safe = String(nickname || '匿名打工人').replace(/[\\/:*?"<>|\s]/g, '');
    if (!safe) safe = '匿名打工人';
    return '工资人格_' + personaName + '_' + safe + '_' + date + '.png';
  }

  global.POSTER = { render: render, filename: filename, WIDTH: W, HEIGHT: H };
})(window);
