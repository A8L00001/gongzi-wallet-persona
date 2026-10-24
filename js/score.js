/* ============================================================
   人格计分算法（纯逻辑，不依赖 DOM，可在 Node 中直接测试）
   ------------------------------------------------------------
   计分：每个选项给 4 个维度加权（主权重 3 分 + 可能的副权重 1 分）
   判定：取总分最高者；若并列，按下面 3 条确定性规则依次裁决，
        绝不会出现「纯随机」结果。
   ============================================================ */
(function (global) {
  'use strict';

  var TYPE_KEYS = ['moon', 'saver', 'negotiator', 'planner'];

  var TYPE_NAMES = {
    moon: '月光冲锋员',
    saver: '存钱守护者',
    negotiator: '涨薪谈判王',
    planner: '财富规划师'
  };

  /* 平局时的最终兜底优先级（最讲规划 → 最讲享受） */
  var TIE_PRIORITY = ['planner', 'negotiator', 'saver', 'moon'];

  function emptyScores() {
    var m = {};
    TYPE_KEYS.forEach(function (k) { m[k] = 0; });
    return m;
  }

  /* 某个选项的主权重类型（可能是并列多个） */
  function optionTopTypes(option) {
    var max = -Infinity;
    TYPE_KEYS.forEach(function (k) {
      var w = Number(option.weight && option.weight[k]) || 0;
      if (w > max) max = w;
    });
    return TYPE_KEYS.filter(function (k) {
      return (Number(option.weight && option.weight[k]) || 0) === max && max > 0;
    });
  }

  /* 每个维度在整套题里理论上能拿到的最高分（用于雷达图归一化） */
  function maxScores(questions) {
    var res = emptyScores();
    questions.forEach(function (q) {
      TYPE_KEYS.forEach(function (k) {
        var best = 0;
        q.options.forEach(function (o) {
          var w = Number(o.weight && o.weight[k]) || 0;
          if (w > best) best = w;
        });
        res[k] += best;
      });
    });
    return res;
  }

  /* 累加得分 + 记录「主类型命中次数」 */
  function compute(answers, questions) {
    var scores = emptyScores();
    var hits = emptyScores();
    var answeredCount = 0;

    questions.forEach(function (q, qi) {
      var pickIndex = answers[qi];
      if (pickIndex === null || pickIndex === undefined) return;
      var option = q.options[pickIndex];
      if (!option) return;
      answeredCount += 1;

      TYPE_KEYS.forEach(function (k) {
        scores[k] += Number(option.weight && option.weight[k]) || 0;
      });
      optionTopTypes(option).forEach(function (k) {
        hits[k] += 1;
      });
    });

    var max = maxScores(questions);
    var ratios = emptyScores();
    TYPE_KEYS.forEach(function (k) {
      ratios[k] = max[k] > 0 ? scores[k] / max[k] : 0;
    });

    return {
      scores: scores,
      hits: hits,
      maxScores: max,
      ratios: ratios,
      answeredCount: answeredCount
    };
  }

  /* 并列裁决 —— 全部是确定性规则，不引入任何随机数 */
  function decide(stat, answers, questions) {
    var scores = stat.scores;
    var top = Math.max.apply(null, TYPE_KEYS.map(function (k) { return scores[k]; }));
    var tied = TYPE_KEYS.filter(function (k) { return scores[k] === top; });

    if (tied.length === 1) {
      return { typeId: tied[0], maxScore: top, tied: tied, rule: 'unique', detail: {} };
    }

    /* 规则 1：第一题「工资到账」最能代表钱包人格，它的主类型优先 */
    var firstAnswer = answers[0];
    var firstQuestion = questions[0];
    var firstType = null;
    if (firstAnswer !== null && firstAnswer !== undefined && firstQuestion && firstQuestion.options[firstAnswer]) {
      var firstTypes = optionTopTypes(firstQuestion.options[firstAnswer]);
      for (var i = 0; i < firstTypes.length; i += 1) {
        if (tied.indexOf(firstTypes[i]) !== -1) { firstType = firstTypes[i]; break; }
      }
    }
    if (firstType) {
      return {
        typeId: firstType,
        maxScore: top,
        tied: tied,
        rule: 'first-question',
        detail: { firstType: firstType }
      };
    }

    /* 规则 2：主类型命中次数更多的胜出 */
    var hitBest = -1;
    var hitWinner = null;
    tied.forEach(function (k) {
      if (stat.hits[k] > hitBest) { hitBest = stat.hits[k]; hitWinner = k; }
    });
    var hitTied = tied.filter(function (k) { return stat.hits[k] === hitBest; });
    if (hitTied.length === 1) {
      return {
        typeId: hitTied[0],
        maxScore: top,
        tied: tied,
        rule: 'hit-count',
        detail: { hits: hitBest }
      };
    }

    /* 规则 3：固定优先级兜底（可复现、可解释） */
    var byPriority = TIE_PRIORITY.filter(function (k) { return hitTied.indexOf(k) !== -1; });
    return {
      typeId: byPriority[0],
      maxScore: top,
      tied: tied,
      rule: 'priority',
      detail: { order: byPriority }
    };
  }

  /* 完整结果：得分 + 判定 + 归一化数值 */
  function analyze(answers, questions) {
    var stat = compute(answers, questions);
    var verdict = decide(stat, answers, questions);
    var sorted = TYPE_KEYS.slice().sort(function (a, b) {
      if (stat.scores[b] !== stat.scores[a]) return stat.scores[b] - stat.scores[a];
      return TIE_PRIORITY.indexOf(a) - TIE_PRIORITY.indexOf(b);
    });

    return {
      typeId: verdict.typeId,
      scores: stat.scores,
      hits: stat.hits,
      ratios: stat.ratios,
      maxScores: stat.maxScores,
      answeredCount: stat.answeredCount,
      isTie: verdict.tied.length > 1,
      tied: verdict.tied,
      tieRule: verdict.rule,
      tieDetail: verdict.detail,
      maxScore: verdict.maxScore,
      ranking: sorted,
      /* 第一名与第二名之间的分差，用于生成「趣味分析」里的数据句 */
      gap: sorted.length > 1 ? stat.scores[sorted[0]] - stat.scores[sorted[1]] : 0
    };
  }

  global.SCORER = {
    TYPE_KEYS: TYPE_KEYS,
    TYPE_NAMES: TYPE_NAMES,
    TIE_PRIORITY: TIE_PRIORITY,
    emptyScores: emptyScores,
    optionTopTypes: optionTopTypes,
    maxScores: maxScores,
    compute: compute,
    decide: decide,
    analyze: analyze
  };
})(window);
