/* ============================================================
   题库：8 道职场情景题
   weight 键：moon=月光冲锋员  saver=存钱守护者
              negotiator=涨薪谈判王  planner=财富规划师

   计分规则：每个选项 4 分 = 主权重 3 分 + 副权重 1 分。
   为保持四种人格机会均等，每道题的 4 个「副权重」会覆盖全部四个维度
   （即每题每个维度只拿到 1 分副权重），因此四种人格的理论满分相同。
   未写出的维度记 0 分（算法内部按 0 处理）。
   ============================================================ */
(function (global) {
  'use strict';

  global.QUIZ_QUESTIONS = [
    {
      id: 1,
      scene: '工资到账',
      text: '15 号下午 3 点，手机「叮」一声——工资到账。你的第一反应是？',
      options: [
        {
          text: '购物车清空，先犒劳一下辛苦了一整个月的自己',
          weight: { moon: 3, saver: 1 }
        },
        {
          text: '立刻转走一大半进零钱通/定期，眼不见心不烦',
          weight: { saver: 3, negotiator: 1 }
        },
        {
          text: '顺手打开招聘软件，看看自己现在值多少钱',
          weight: { negotiator: 3, planner: 1 }
        },
        {
          text: '打开记账表，把这个月每一笔额度重新分配一遍',
          weight: { planner: 3, moon: 1 }
        }
      ]
    },
    {
      id: 2,
      scene: '深夜消费',
      text: '晚上 11 点，你刷到一件很想要但有点贵的东西。你会？',
      options: [
        {
          text: '直接下单，快乐不打折，早买早享受',
          weight: { moon: 3, saver: 1 }
        },
        {
          text: '先丢进购物车，放三天还想要再说',
          weight: { saver: 3, negotiator: 1 }
        },
        {
          text: '先去比价、找券、看有没有企业折扣再决定',
          weight: { negotiator: 3, planner: 1 }
        },
        {
          text: '算一下它占我本月可支配收入的比例，再决定',
          weight: { planner: 3, moon: 1 }
        }
      ]
    },
    {
      id: 3,
      scene: '余额盘点',
      text: '发完工资第 10 天，你打开余额，发现……',
      options: [
        {
          text: '只剩 37 块。正常，还有 20 天，撑住就行',
          weight: { moon: 3, saver: 1 }
        },
        {
          text: '和刚发工资那会儿差不多，稳',
          weight: { saver: 3, negotiator: 1 }
        },
        {
          text: '还剩不少，因为我在攒「随时能辞职」的底气基金',
          weight: { negotiator: 3, planner: 1 }
        },
        {
          text: '按计划花掉了该花的，剩下的已经自动去理财了',
          weight: { planner: 3, moon: 1 }
        }
      ]
    },
    {
      id: 4,
      scene: '涨薪谈判',
      text: '绩效面谈，老板微笑着说「辛苦了，明年继续」。你的下一个动作是？',
      options: [
        {
          text: '心里翻白眼，嘴上说好的，回家下单一个新键盘安慰自己',
          weight: { moon: 3, saver: 1 }
        },
        {
          text: '笑笑不说话，回去继续把手上的活干稳',
          weight: { saver: 3, negotiator: 1 }
        },
        {
          text: '当场列出今年的产出清单，直接问涨薪的空间在哪',
          weight: { negotiator: 3, planner: 1 }
        },
        {
          text: '先别急，回去整理数据对齐市场薪资，再约一次正式沟通',
          weight: { planner: 3, moon: 1 }
        }
      ]
    },
    {
      id: 5,
      scene: '周五加班',
      text: '周五晚上 8 点，群里 @ 你，有个需求今晚必须改完。你会？',
      options: [
        {
          text: '骂骂咧咧打开电脑，改完点一份宵夜犒劳自己',
          weight: { moon: 3, saver: 1 }
        },
        {
          text: '改，但先把加班时长记进工时表，等着换调休',
          weight: { saver: 3, negotiator: 1 }
        },
        {
          text: '先问清楚优先级和截止时间，顺便谈一下加班补偿',
          weight: { negotiator: 3, planner: 1 }
        },
        {
          text: '评估影响范围再动手，改完顺手把这套流程写成文档，下次不用再加班',
          weight: { planner: 3, moon: 1 }
        }
      ]
    },
    {
      id: 6,
      scene: '年终奖',
      text: '年终奖到账，比预期少了 20%。你的第一反应是？',
      options: [
        {
          text: '吃点好的，钱可以少，心情不能亏',
          weight: { moon: 3, saver: 1 }
        },
        {
          text: '叹口气，然后一分不动全部存起来，先增加安全感',
          weight: { saver: 3, negotiator: 1 }
        },
        {
          text: '截图存好，连邮件一起归档，下次谈判的时候用得上',
          weight: { negotiator: 3, planner: 1 }
        },
        {
          text: '复盘是绩效口径问题还是薪资结构问题，顺手改掉明年的目标表',
          weight: { planner: 3, moon: 1 }
        }
      ]
    },
    {
      id: 7,
      scene: '职业选择',
      text: '公司让你选：熟悉但涨得慢的老项目，还是难但曝光高的新项目？',
      options: [
        {
          text: '哪边干得开心选哪边，先爽了再说',
          weight: { moon: 3, saver: 1 }
        },
        {
          text: '留在老项目，稳定、话少、不用背锅',
          weight: { saver: 3, negotiator: 1 }
        },
        {
          text: '选新项目，这是我明年涨薪和跳槽的筹码',
          weight: { negotiator: 3, planner: 1 }
        },
        {
          text: '先算清楚两条路对我未来两年薪资曲线和简历的影响',
          weight: { planner: 3, moon: 1 }
        }
      ]
    },
    {
      id: 8,
      scene: '存钱目标',
      text: '朋友问你：你存钱到底是为了什么？你的答案是？',
      options: [
        {
          text: '存钱？我存的是快乐，钱花出去才是我的',
          weight: { moon: 3, saver: 1 }
        },
        {
          text: '存够 6 个月生活费，先把安全感焊死在账户里',
          weight: { saver: 3, negotiator: 1 }
        },
        {
          text: '存够跳槽空窗期的底气，然后去谈一个更高的价',
          weight: { negotiator: 3, planner: 1 }
        },
        {
          text: '存够覆盖未来三年每个节点的钱：进修、房租、旅行、应急',
          weight: { planner: 3, moon: 1 }
        }
      ]
    }
  ];

  /* 1024 彩蛋专用题（输入 1024 解锁后追加到测试末尾） */
  global.QUIZ_EGG_QUESTION = {
    id: 1024,
    scene: '隐藏关卡',
    text: '【1024 隐藏题】凌晨三点，线上告警响了，你打开电脑的第一句话是？',
    options: [
      {
        text: '「不就是 1024 个请求超时吗，我先看看日志」——你是真的爱这行',
        weight: { planner: 3, negotiator: 1 }
      },
      {
        text: '「这活儿算加班吗？」——先把账算清楚再修',
        weight: { negotiator: 3, planner: 1 }
      },
      {
        text: '「修完就跑，谁也别拦我下班」——效率至上',
        weight: { moon: 3, saver: 1 }
      },
      {
        text: '「先扩容，再复盘，别让它有下一次」——事故也是一种资产',
        weight: { saver: 3, moon: 1 }
      }
    ]
  };
})(window);
