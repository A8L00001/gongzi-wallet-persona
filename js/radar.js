/* ============================================================
   雷达图绘制工具（Canvas 2D，页面与海报共用）
   ============================================================ */
(function (global) {
  'use strict';

  function vertex(cx, cy, radius, angle) {
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  }

  function polygon(ctx, cx, cy, radius, count, progress) {
    ctx.beginPath();
    for (var i = 0; i < count; i += 1) {
      var angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      var p = vertex(cx, cy, radius * progress, angle);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  /**
   * 绘制四维雷达图
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} opt
   *   cx, cy, r        圆心与半径
   *   values           [0~1, 0~1, 0~1, 0~1] 四维数值
   *   labels           ['月光','存钱','涨薪','规划']
   *   color            主色（填充与描边）
   *   progress         0~1 动画进度
   *   highlightIndex   需要强调的轴（冠军维度）
   */
  function draw(ctx, opt) {
    var o = opt || {};
    var cx = o.cx;
    var cy = o.cy;
    var r = o.r;
    var values = o.values || [];
    var labels = o.labels || [];
    var color = o.color || '#FF53A5';
    var progress = typeof o.progress === 'number' ? o.progress : 1;
    var highlightIndex = typeof o.highlightIndex === 'number' ? o.highlightIndex : -1;

    var gridColor = o.gridColor || 'rgba(16, 16, 16, .16)';
    var axisColor = o.axisColor || 'rgba(16, 16, 16, .38)';
    var labelColor = o.labelColor || '#101010';
    var labelFontSize = o.labelFontSize || 26;
    var valueFontSize = o.valueFontSize || 22;
    var fontFamily = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

    var count = values.length;
    var i;
    var angle;
    var p;

    /* 1. 网格环 */
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = gridColor;
    for (i = 1; i <= 4; i += 1) {
      polygon(ctx, cx, cy, r, count, i / 4);
      ctx.stroke();
    }

    /* 2. 轴线 */
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = axisColor;
    for (i = 0; i < count; i += 1) {
      angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      p = vertex(cx, cy, r, angle);
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();

    /* 3. 数据多边形（带进度动画） */
    ctx.save();
    ctx.beginPath();
    for (i = 0; i < count; i += 1) {
      angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      var value = Math.max(0.04, values[i] * progress);
      p = vertex(cx, cy, r * value, angle);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.42);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();

    /* 4. 数据点 */
    for (i = 0; i < count; i += 1) {
      angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      var v = Math.max(0.04, values[i] * progress);
      p = vertex(cx, cy, r * v, angle);
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === highlightIndex ? 13 : 10, 0, Math.PI * 2);
      ctx.fillStyle = i === highlightIndex ? color : '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#101010';
      ctx.stroke();
    }
    ctx.restore();

    /* 5. 标签与数值 */
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < count; i += 1) {
      angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      var lx = cx + Math.cos(angle) * (r + labelFontSize * 1.35);
      var ly = cy + Math.sin(angle) * (r + labelFontSize * 1.05);
      ctx.font = '800 ' + labelFontSize + 'px ' + fontFamily;
      ctx.fillStyle = i === highlightIndex ? color : labelColor;
      ctx.fillText(labels[i] || '', lx, ly);
      if (o.showValues) {
        ctx.font = '700 ' + valueFontSize + 'px ' + fontFamily;
        ctx.fillStyle = 'rgba(16, 16, 16, .62)';
        ctx.fillText(Math.round((o.percent || [])[i] || 0) + '%', lx, ly + labelFontSize * 1.05);
      }
    }
    ctx.restore();
  }

  /* #RRGGBB -> rgba() */
  function hexToRgba(hex, alpha) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var num = parseInt(h, 16);
    var rr = (num >> 16) & 255;
    var gg = (num >> 8) & 255;
    var bb = num & 255;
    return 'rgba(' + rr + ', ' + gg + ', ' + bb + ', ' + alpha + ')';
  }

  global.RADAR = { draw: draw, hexToRgba: hexToRgba };
})(window);
