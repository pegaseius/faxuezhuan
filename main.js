/*
 * 南京大学法学院论文引用格式转换器
 * GB/T 7714→ 《法学引注手册》格式
 *
 * 本文件同时支持浏览器与 Node.js：
 *   浏览器中自动挂载界面事件；Node 中可通过 require('./main.js') 调用转换函数做测试。
 */
(function (root) {
  'use strict';

  /* ============================ 一、常量 ============================ */

  const MONTH_ABBR = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June',
    'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

  // 《法学引注手册》对英文标题的要求：实词首字母大写，冠词、介词、连词等虚词小写。
  // 这里按“语法词类”处理，而不是按单词长度处理，以贴合手册原文。
  const STOP_WORDS = new Set([
    // 冠词
    'a', 'an', 'the',
    // 并列连词
    'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
    // 常见介词（含短语介词）
    'as', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'via', 'per', 'vs', 'v', 'versus',
    'with', 'from', 'into', 'onto', 'over', 'under', 'about', 'above', 'across', 'after',
    'against', 'along', 'amid', 'among', 'around', 'before', 'behind', 'below', 'beneath',
    'beside', 'besides', 'between', 'beyond', 'concerning', 'despite', 'down', 'during',
    'except', 'inside', 'near', 'off', 'out', 'outside', 'past', 'regarding',
    'since', 'than', 'through', 'throughout', 'till', 'toward', 'towards', 'underneath',
    'until', 'upon', 'within', 'without'
  ]);

  // 姓氏中的小品词（van Dijk、de la Cruz 等）
  const PARTICLES = new Set([
    'van', 'von', 'de', 'der', 'den', 'la', 'le', 'di', 'da', 'del', 'della',
    'dos', 'das', 'do', 'du', 'des', 'ten', 'ter', 'af', 'zu', 'zur', 'st.'
  ]);

  // 常见汉语拼音姓氏。只在“姓 名”且名为完整单词时启用，避免把普通英文名倒置。
  const CHINESE_SURNAMES = new Set([
    'zhang', 'wang', 'li', 'zhao', 'liu', 'chen', 'yang', 'huang', 'wu', 'zhou',
    'xu', 'sun', 'ma', 'zhu', 'hu', 'guo', 'he', 'gao', 'lin', 'luo', 'zheng',
    'liang', 'xie', 'song', 'tang', 'han', 'feng', 'deng', 'cao', 'peng', 'zeng',
    'xiao', 'tian', 'dong', 'pan', 'yuan', 'cai', 'jiang', 'yu', 'du', 'ye',
    'cheng', 'wei', 'su', 'lu', 'ding', 'ren', 'shen', 'yao', 'cui', 'zhong',
    'tan', 'fan', 'fu', 'liao', 'qiu', 'qin', 'jia', 'xia', 'fang', 'zou',
    'xiong', 'jin', 'hao', 'kong', 'bai', 'shao', 'shi', 'mao', 'yan', 'zhan',
    'dai', 'mo', 'xiang', 'chang', 'wan', 'gu', 'lai', 'qu', 'zhai', 'yin',
    'lan', 'min', 'bao', 'hua', 'ji', 'miao', 'niu', 'qi', 'qian', 'shan',
    'sui', 'weng', 'wen', 'xin', 'xue', 'zhuang', 'zu', 'ou', 'ruan', 'gong'
  ]);

  // 机构作者识别词。遇到这些词时保留原有语序，不做“名在前、姓在后”的倒置。
  const CORPORATE_WORDS = new Set([
    'united', 'states', 'nations', 'republic', 'kingdom', 'union', 'commission',
    'committee', 'council', 'court', 'bank', 'fund', 'organization', 'organisation',
    'association', 'institute', 'university', 'college', 'school', 'department',
    'ministry', 'agency', 'office', 'bureau', 'center', 'centre', 'foundation',
    'society', 'federation', 'government', 'parliament', 'congress', 'assembly',
    'secretariat', 'program', 'programme', 'board', 'group', 'press', 'books',
    'publishing', 'inc', 'ltd', 'llc', 'corp', 'co', 'plc', 'region', 'authority',
    'administration', 'academy', 'tribunal', 'panel', 'working', 'party'
  ]);

  // 常见英文法学期刊缩写的全称。手册要求刊名使用全称、不缩写。
  const JOURNAL_ABBREVIATIONS = new Map([
    ['harv l rev', 'Harvard Law Review'],
    ['yale lj', 'Yale Law Journal'],
    ['colum l rev', 'Columbia Law Review'],
    ['stan l rev', 'Stanford Law Review'],
    ['u chi l rev', 'University of Chicago Law Review'],
    ['mich l rev', 'Michigan Law Review'],
    ['cal l rev', 'California Law Review'],
    ['nyu l rev', 'New York University Law Review'],
    ['cornell l rev', 'Cornell Law Review'],
    ['duke lj', 'Duke Law Journal'],
    ['geo lj', 'Georgetown Law Journal'],
    ['bu l rev', 'Boston University Law Review'],
    ['va l rev', 'Virginia Law Review'],
    ['tex l rev', 'Texas Law Review'],
    ['ucla l rev', 'UCLA Law Review'],
    ['fordham l rev', 'Fordham Law Review'],
    ['notre dame l rev', 'Notre Dame Law Review'],
    ['vand l rev', 'Vanderbilt Law Review'],
    ['wash u lq', 'Washington University Law Quarterly'],
    ['wis l rev', 'Wisconsin Law Review'],
    ['iowa l rev', 'Iowa Law Review'],
    ['minn l rev', 'Minnesota Law Review'],
    ['s cal l rev', 'Southern California Law Review'],
    ['hastings lj', 'Hastings Law Journal'],
    ['am j intl l', 'American Journal of International Law'],
    ['am j comp l', 'American Journal of Comparative Law'],
    ['eur j intl l', 'European Journal of International Law'],
    ['intl and comp lq', 'International & Comparative Law Quarterly'],
    ['mod l rev', 'Modern Law Review'],
    ['oxford j legal stud', 'Oxford Journal of Legal Studies'],
    ['cambridge lj', 'Cambridge Law Journal'],
    ['lq rev', 'Law Quarterly Review'],
    ['pnas', 'Proceedings of the National Academy of Sciences of the United States of America'],
    ['proc natl acad sci usa', 'Proceedings of the National Academy of Sciences of the United States of America'],
    ['j legal stud', 'Journal of Legal Studies'],
    ['j l and econ', 'Journal of Law and Economics'],
    ['jl and econ', 'Journal of Law and Economics'],
    ['j law and econ', 'Journal of Law and Economics'],
    ['harv intl lj', 'Harvard International Law Journal'],
    ['berkeley j intl l', 'Berkeley Journal of International Law'],
    ['geo j intl l', 'Georgetown Journal of International Law'],
    ['va j intl l', 'Virginia Journal of International Law'],
    ['colum j transnatl l', 'Columbia Journal of Transnational Law'],
    ['yale j intl l', 'Yale Journal of International Law'],
    ['stan j intl l', 'Stanford Journal of International Law'],
    ['am u l rev', 'American University Law Review'],
    ['geo wash l rev', 'George Washington Law Review'],
    ['wash and lee l rev', 'Washington and Lee Law Review'],
    ['bc l rev', 'Boston College Law Review'],
    ['cardozo l rev', 'Cardozo Law Review'],
    ['emory lj', 'Emory Law Journal'],
    ['ind lj', 'Indiana Law Journal'],
    ['nw u l rev', 'Northwestern University Law Review'],
    ['ohio st lj', 'Ohio State Law Journal'],
    ['u pa l rev', 'University of Pennsylvania Law Review'],
    ['wm and mary l rev', 'William & Mary Law Review']
  ]);

  const TAG_RE = /\[(J|M|C|D|N|R|S|P|Z|A|EB\/OL|DB\/OL|CP\/D)(?:\/OL)?\]/i;

  const DEFAULT_OPTIONS = {
    journalStyle: 'A',      // A: 卷 刊名 首页 (年)；B: 刊名, Vol.卷:期, p.起-止 (年)
    listAllAuthors: true    // 四人以上默认全部列出；取消勾选则用 et al.
  };

  /* ============================ 二、通用工具 ============================ */

  function decodeEntities(s) {
    return String(s)
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeSpace(s) {
    return String(s).replace(/\s+/g, ' ').trim();
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripNamePunct(s) {
    return String(s).replace(/^[^A-Za-z\u4e00-\u9fff]+|[^A-Za-z\u4e00-\u9fff]+$/g, '');
  }

  function stripTrailingTitlePeriod(s) {
    if (/(?:[A-Z]\.){2,}$/.test(s)) return s; // U.S.
    if (/\b(?:No|vs|etc|al|Jr|Sr|St|Inc|Ltd|Co|Corp)\.$/i.test(s)) return s;
    return String(s).replace(/\.\s*$/, '');
  }

  /**
   * 输入行预处理：去 HTML 标签、去序号、统一空白、统一文献类型标识。
   * 注意：这里不改变中文全角标点，中文转换沿用原工具的半角标点要求。
   */
  function normalizeLine(raw) {
    let s = String(raw == null ? '' : raw);
    s = s.replace(/\u00a0/g, ' ').replace(/\u3000/g, ' ');
    s = decodeEntities(s);
    s = s.replace(/<\/?(?:i|b|em|strong|span|sub|sup|small|font)[^>]*>/gi, '');
    s = s.replace(/［/g, '[').replace(/］/g, ']');
    s = s.trim();
    if (!s) return '';

    // 去掉行首序号：[1]、（1）、1.、1、
    s = s.replace(/^\s*[\[【(（]\s*\d+\s*[\]】)）]\s*/, '');
    s = s.replace(/^\s*\d+\s*[.、]\s+/, '');

    // 去掉标点前的空格（GB 导出常见 “Rachev T S .”）
    s = s.replace(/\s+([,.;:!?])/g, '$1');
    s = s.replace(/\[\s*(J|M|C|D|N|R|S|P|Z|A|EB\/OL|DB\/OL|CP\/D)(\/OL)?\s*\]/gi,
      function (m, t, ol) { return '[' + t.toUpperCase() + (ol ? '/OL' : '') + ']'; });
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  /**
   * 提取 DOI（GB 导出可能在句末以 “DOI:10.xxx.” 或 doi.org 链接出现）。
   * 返回移除 DOI 后的文本和 DOI 本身。
   */
  function extractDoi(input) {
    let s = String(input);
    let doi = null;
    const patterns = [
      /\bDOI\s*[:：]\s*(?:https?:\/\/(?:dx\.)?doi\.org\/|doi\.org\/)?(10\.[^\s]+)/i,
      /https?:\/\/(?:dx\.)?doi\.org\/(10\.[^\s]+)/i,
      /\bdoi\.org\/(10\.[^\s]+)/i
    ];
    for (let i = 0; i < patterns.length; i++) {
      const m = s.match(patterns[i]);
      if (m) {
        doi = m[1].replace(/[.,;]+$/, '');
        s = s.slice(0, m.index) + s.slice(m.index + m[0].length);
        break;
      }
    }
    s = s.replace(/\s*[:：]\s*\.\s*$/, '.'); // 清理 “Publisher: .” 之类的残余
    s = s.replace(/[,\s]*\bDOI\s*[:：]\s*\.?\s*$/i, '.');
    return { text: s, doi: doi };
  }

  function pushUnique(arr, value) {
    if (value && arr.indexOf(value) === -1) arr.push(value);
  }

  /* ============================ 三、标题大小写 ============================ */

  function isAbbrevToken(t) {
    return /^(?:[A-Z]\.)+$/.test(t) ||
      /^(?:No|vs|v|etc|al|Jr|Sr|St|Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|Corp)\.$/i.test(t);
  }

  function processTitleWord(word, isFirst, forceCap) {
    if (!word) return word;
    if (word === '&') return word;
    if (/^(?:https?:\/\/|www\.)\S+$/i.test(word)) return word;
    if (/^[0-9]+(?:[.,:/-][0-9]+)*$/.test(word)) return word; // 纯数字
    if (/^[IVXLC]+$/.test(word) && word.length > 1) return word; // 罗马数字
    if (word === 'I') return 'I';

    // 连字符复合词：首段总是大写（by-product → By-Product），后续段按虚词规则。
    if (word.indexOf('-') > -1 && !/^-?\d/.test(word)) {
      return word.split('-').map(function (part, i) {
        return processTitleWord(part, i === 0 ? true : false, i === 0 ? true : false);
      }).join('-');
    }

    // 斜线复合词：按普通词处理，首段沿用当前上下文。
    if (word.indexOf('/') > -1) {
      return word.split('/').map(function (part, i) {
        return processTitleWord(part, i === 0 ? isFirst : false, i === 0 ? forceCap : false);
      }).join('/');
    }

    // 词中间已有大写（McDonald、iPhone、O'Brien、UNIDROIT）——视为作者有意的大小写，保留。
    if (/[A-Z]/.test(word.slice(1))) return word;
    // 全大写（AI、WTO、NGO）——按缩写保留。
    if (/^[A-Z]+$/.test(word)) return word;

    const key = word.toLowerCase().replace(/\.$/, '');
    if (STOP_WORDS.has(key) && !isFirst && !forceCap) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  function processTitleToken(token, ctx) {
    let lead = '';
    let trail = '';
    const lm = token.match(/^[\(\[\{“"'‘]+/);
    if (lm) {
      lead = lm[0];
      token = token.slice(lead.length);
    }

    const tm = token.match(/[\)\]\}”".,;:?!]+$/);
    if (tm) {
      // 保留 U.S.、No.、vs. 等缩写末尾的句点。
      if (token.charAt(token.length - 1) === '.' && isAbbrevToken(token)) {
        const other = token.match(/[\)\]\}”",;:?!]+$/);
        if (other) {
          trail = other[0];
          token = token.slice(0, -trail.length);
        }
      } else {
        trail = tm[0];
        token = token.slice(0, -trail.length);
      }
    }

    if (!token) {
      return { text: lead + trail, forceNext: false };
    }

    const core = processTitleWord(token, ctx.isFirst, ctx.forceCap);
    const forceNext = /[:?!]$/.test(trail) ||
      trail === '—' || trail === '–' ||
      token === '-' || token === '—' || token === '–';

    return { text: lead + core + trail, forceNext: forceNext };
  }

  function titleCase(text) {
    if (!text) return '';
    let s = String(text).trim().replace(/\s+/g, ' ');

    // 去掉标题外层引号
    s = s.replace(/^["“](.*)["”]$/s, '$1').trim();

    // 去掉标题末尾的句点，但保留缩写（U.S.、No.）的句点
    s = stripTrailingTitlePeriod(s);

    // 冒号、分号、问号、叹号后的空格；避免破坏 10:30 这类数字
    s = s.replace(/([A-Za-z\)\]])\s*:\s*(?=[A-Za-z0-9(“"'])/g, '$1: ');
    s = s.replace(/([A-Za-z\)\]])\s*;\s*(?=[A-Za-z0-9(“"'])/g, '$1; ');
    s = s.replace(/([?!])\s*(?=[A-Za-z(“"'])/g, '$1 ');
    s = s.replace(/\s*&\s*/g, ' & ');
    s = s.replace(/([A-Za-z])\((?=[A-Z0-9])/g, '$1 (');
    s = s.replace(/,\s*(?=[A-Za-z(“"'])/g, ', ');
    s = s.replace(/\s+([,.;:!?])/g, '$1');
    s = s.replace(/\s+\)/g, ')');

    const tokens = s.split(/\s+/).filter(Boolean);
    const out = [];
    let forceCap = true;

    for (let i = 0; i < tokens.length; i++) {
      const r = processTitleToken(tokens[i], { forceCap: forceCap, isFirst: i === 0 });
      out.push(r.text);
      forceCap = r.forceNext;
    }

    return out.join(' ').replace(/\s+([,.;:!?])/g, '$1');
  }

  /* ============================ 四、作者姓名 ============================ */

  function isInitialToken(tok) {
    if (!tok) return false;
    const t = tok.replace(/\./g, '');
    if (!/^[A-Z]+$/.test(t)) return false;
    if (t.length === 1) return true;
    if (t.length <= 3 && /^[A-Z]\.?([A-Z]\.?)+$/.test(tok)) return true;
    return false;
  }

  function isParticle(word) {
    if (!word) return false;
    return PARTICLES.has(word.toLowerCase());
  }

  function formatInitials(tokens) {
    const letters = [];
    tokens.forEach(function (tok) {
      const clean = tok.replace(/[^A-Za-z]/g, '');
      for (let i = 0; i < clean.length; i++) {
        const ch = clean.charAt(i);
        if (/[A-Z]/.test(ch)) letters.push(ch.toUpperCase());
      }
    });
    return letters.map(function (l) { return l + '.'; }).join(' ');
  }

  function formatChineseGiven(s) {
    const clean = String(s).trim();
    if (!clean) return '';
    if (/\s/.test(clean)) {
      const joined = clean.split(/\s+/).join('');
      return joined.charAt(0).toUpperCase() + joined.slice(1).toLowerCase();
    }
    if (/^[A-Z]+$/.test(clean) && clean.length > 1) {
      return clean.charAt(0) + clean.slice(1).toLowerCase();
    }
    return clean;
  }

  function normalizeSuffix(s) {
    if (/^Jr/i.test(s)) return 'Jr.';
    if (/^Sr/i.test(s)) return 'Sr.';
    return String(s).toUpperCase().replace(/\.$/, '');
  }

  function isCorporateAuthor(s) {
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return /^[A-Z][A-Z&.'’\-]{1,}$/.test(s) && s === s.toUpperCase();
    }
    const lower = ' ' + s.toLowerCase().replace(/[.,]/g, '') + ' ';
    const list = Array.from(CORPORATE_WORDS);
    for (let i = 0; i < list.length; i++) {
      if (lower.indexOf(' ' + list[i] + ' ') > -1) return true;
    }
    return false;
  }

  function formatSingleAuthor(raw) {
    let s = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    if (/[\u4e00-\u9fff]/.test(s)) return s;

    let suffix = '';
    const suf = s.match(/\s+(Jr\.?|Sr\.?|II|III|IV)$/);
    if (suf) {
      suffix = ' ' + normalizeSuffix(suf[1]);
      s = s.slice(0, suf.index).trim();
    }

    // 机构作者：保留语序
    if (isCorporateAuthor(s)) return s + suffix;

    // 已经是“名 中间名缩写 姓”的写法（William P. Alford）
    const gf = s.match(/^([A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+)*)\s+((?:[A-Z]\.\s*)+)([A-Z][A-Za-z'’\-]+)$/);
    if (gf) {
      return gf[1] + ' ' + gf[2].trim() + ' ' + gf[3] + suffix;
    }

    // 全大写姓氏，姓在前（ZHANG Li、HE Haibo、LIU-XIONG Qingtian）
    const cc = s.match(/^([A-Z]{2,}(?:-[A-Z]+)*)\s+(.+)$/);
    if (cc) {
      const restCompact = cc[2].replace(/[.\s]/g, '');
      const restTokens = cc[2].split(/\s+/);
      const allSingleInitials = restTokens.length > 1 && restTokens.every(function (t) {
        return /^[A-Z]\.?$/.test(t);
      });
      if (!allSingleInitials && restCompact.length > 1) {
        return cc[1] + ' ' + formatChineseGiven(cc[2]) + suffix;
      }
    }

    // 首字母大写的汉语拼音姓名，姓在前（Zhang Li、Zhang Xiao Ming）
    const t0 = s.split(/\s+/);
    if (t0.length >= 2 && CHINESE_SURNAMES.has(stripNamePunct(t0[0]).toLowerCase())) {
      const givenTokens = t0.slice(1);
      const allGiven = givenTokens.every(function (t) {
        return /^[A-Z][A-Za-z'’\-]*$/.test(t) && !isInitialToken(t);
      });
      if (allGiven) {
        return stripNamePunct(t0[0]).toUpperCase() + ' ' +
          formatChineseGiven(givenTokens.join(' ')) + suffix;
      }
    }

    // GB 常见形式：姓 + 名缩写（Rachev T S、Li P）
    const tokens = s.split(/\s+/);
    const initials = [];
    while (tokens.length > 1 && isInitialToken(tokens[tokens.length - 1])) {
      initials.unshift(tokens.pop());
    }

    if (initials.length) {
      const ini = formatInitials(initials);
      let surnameTokens = [];
      let givenTokens = [];

      if (isParticle(tokens[0])) {
        let i = 0;
        while (i < tokens.length && isParticle(tokens[i])) {
          surnameTokens.push(tokens[i]);
          i++;
        }
        if (i < tokens.length) {
          surnameTokens.push(tokens[i]);
          i++;
        }
        givenTokens = tokens.slice(i);
      } else {
        surnameTokens = [tokens[0]];
        givenTokens = tokens.slice(1);
      }

      const surname = surnameTokens.join(' ');
      const allCapsSurname = /^[A-Z]{2,}(?:[\s-][A-Z]+)*$/.test(surname);

      if (allCapsSurname && !isParticle(surnameTokens[0])) {
        return surname + ' ' + ini + suffix;
      }
      if (givenTokens.length) {
        return givenTokens.join(' ') + ' ' + ini + ' ' + surname + suffix;
      }
      return ini + ' ' + surname + suffix;
    }

    // 没有缩写：GB 仍按“姓 名”排列
    let first = 0;
    const surnameTokens2 = [];
    while (first < tokens.length && isParticle(tokens[first])) {
      surnameTokens2.push(tokens[first]);
      first++;
    }
    if (surnameTokens2.length) {
      if (first < tokens.length) {
        surnameTokens2.push(tokens[first]);
        first++;
      }
      const given = tokens.slice(first).join(' ');
      if (given) return given + ' ' + surnameTokens2.join(' ') + suffix;
      return surnameTokens2.join(' ') + suffix;
    }
    if (tokens.length === 1) return tokens[0] + suffix;
    return tokens.slice(1).join(' ') + ' ' + tokens[0] + suffix;
  }

  function maybeMergeReferenceStyleNames(parts) {
    if (parts.length < 2 || parts.length % 2 !== 0) return null;
    const merged = [];
    for (let i = 0; i < parts.length; i += 2) {
      const surname = parts[i].trim();
      const given = parts[i + 1].trim();
      if (!/^[A-Za-z][A-Za-z'’\-]*(?:\s+[A-Za-z][A-Za-z'’\-]*)*$/.test(surname)) return null;
      if (/\s[A-Z]$/.test(surname)) return null; // 排除 “Rachev T S” 这类缩写串
      if (!/^[A-Z][A-Za-z.'’\-]*(?:\s+[A-Z][A-Za-z.'’\-]*)*$/.test(given)) return null;
      // 只有“名”为单词或含缩写时，才按“姓, 名”参考著录格式合并；
      // 避免把 GB 的 “Smith John, Doe Jane” 误合并成一个人。
      let givenBase = given;
      let nameSuffix = '';
      const sm = given.match(/\s+(Jr\.?|Sr\.?|II|III|IV)$/);
      if (sm) {
        nameSuffix = ' ' + normalizeSuffix(sm[1]);
        givenBase = given.slice(0, sm.index).trim();
      }
      const givenWords = givenBase.split(/\s+/);
      const hasInitial = givenWords.some(function (w) {
        return /^[A-Z]\.?$/.test(w) || /^[A-Z]\./.test(w);
      });
      if (givenWords.length > 1 && !hasInitial && !nameSuffix) return null;
      if (CHINESE_SURNAMES.has(surname.toLowerCase())) {
        merged.push(surname.toUpperCase() + ' ' + formatChineseGiven(givenBase) + nameSuffix);
      } else {
        merged.push(givenBase + ' ' + surname + nameSuffix);
      }
    }
    return merged;
  }

  /**
   * 输出作者串。
   * 返回：{ text, editor, count, chinese }
   */
  function formatAuthorList(raw, opts) {
    const options = opts || DEFAULT_OPTIONS;
    let s = String(raw || '').trim().replace(/\s+/g, ' ');
    let editor = false;
    const chinese = /[\u4e00-\u9fff]/.test(s);

    // 编者标记：ed./eds./editor(s)/主编/编。避免把作者名 “Ed” 误判为编者。
    const edMatch = s.match(/[,\s]+(ed\.|eds\.|editor|editors|Editor|Editors|主编|编)$/) ||
      s.match(/[,\s]+(ed|eds)$/);
    let editorPlural = false;
    if (edMatch) {
      editor = true;
      const marker = edMatch[1];
      editorPlural = /^(?:eds\.|editors|Editors|eds)$/.test(marker);
      s = s.slice(0, edMatch.index).trim();
    }

    // 输入已经写了 et al.：保留“第一作者 + et al.”，不再展开。
    let etal = false;
    const etalMatch = s.match(/[,\s]+et\s+al\.?\s*$/i);
    if (etalMatch) {
      etal = true;
      s = s.slice(0, etalMatch.index).trim();
    }

    if (!s) return { text: '', editor: editor, count: 0, chinese: chinese };
    if (chinese) {
      return {
        text: s + (editor ? (editorPlural ? ' eds.' : ' ed.') : ''),
        editor: editor,
        count: 1,
        chinese: true
      };
    }

    // 机构作者可能含逗号（University of California, Berkeley），整体保留。
    if (isCorporateAuthor(s)) {
      return {
        text: s + (etal ? ' et al.' : '') +
          (editor ? (editorPlural ? ' eds.' : ' ed.') : ''),
        editor: editor,
        count: 1,
        chinese: false
      };
    }

    let parts;
    if (/[;、]/.test(s)) {
      parts = s.split(/\s*[;、]\s*/);
    } else {
      parts = s.split(/\s*,\s*/);
    }

    // “A & B”这种用 & 连接的作者；机构名整体保留，不拆。
    if (!isCorporateAuthor(s)) {
      const expanded = [];
      parts.forEach(function (p) {
        p.split(/\s*&\s*|\s+and\s+/i).forEach(function (q) {
          if (q.trim()) expanded.push(q.trim());
        });
      });
      parts = expanded;
    }

    const mergedNames = maybeMergeReferenceStyleNames(parts);
    const names = (mergedNames || parts.map(formatSingleAuthor)).filter(Boolean);
    const count = names.length;
    if (!count) return { text: '', editor: editor, count: 0, chinese: chinese };

    let text;
    if (etal) {
      text = names[0] + ' et al.';
    } else if (count === 1) {
      text = names[0];
    } else if (count === 2) {
      text = names[0] + ' & ' + names[1];
    } else if (count === 3) {
      text = names[0] + ', ' + names[1] + ' & ' + names[2];
    } else if (!options.listAllAuthors) {
      text = names[0] + ' et al.';
    } else {
      text = names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
    }

    const effectiveCount = etal ? Math.max(count, 2) : count;
    if (editor) text += (editorPlural || effectiveCount > 1) ? ' eds.' : ' ed.';
    return { text: text, editor: editor, count: effectiveCount, chinese: chinese };
  }

  /* ============================ 五、字段解析 ============================ */

  function looksLikePageRange(input) {
    let s = String(input || '').trim();
    s = s.replace(/^p{1,2}\.\s*/i, '');
    if (!s || s.length > 40) return false;
    const unit = '(?:[A-Za-z]{0,4}\\d+[A-Za-z]?\\+?|[ivxlcdm]+\\+?)';
    const re = new RegExp('^' + unit + '(?:\\s*[-–—]\\s*' + unit + ')?' +
      '(?:\\s*,\\s*' + unit + ')*$', 'i');
    return re.test(s);
  }

  function cleanPages(input) {
    return String(input || '')
      .replace(/^p{1,2}\.\s*/i, '')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function firstPage(pages) {
    if (!pages) return '';
    return pages.split(',')[0].split(/[-–—]/)[0].trim();
  }

  function isPlausibleYear(v) {
    const n = parseInt(v, 10);
    return n >= 1500 && n <= 2199;
  }

  function hasYearAtEnd(s) {
    return /(?:^|[,;(\s:])(?:1[5-9]\d{2}|20\d{2}|21\d{2})\s*$/.test(s);
  }

  function parseVolumeIssue(v) {
    const s = String(v || '').trim();
    let m = s.match(/^(\d+)\s*\(([^)]+)\)$/);
    if (m) return { volume: m[1], issue: m[2] };
    m = s.match(/^(\d+)$/);
    if (m) return { volume: m[1], issue: null };
    m = s.match(/^\(([^)]+)\)$/);
    if (m) return { volume: null, issue: m[1] };
    m = s.match(/^([A-Za-z][A-Za-z. ]*\d*)$/);
    if (m) return { volume: s, issue: null };
    return { volume: null, issue: s };
  }

  function journalKey(s) {
    return String(s).toLowerCase()
      .replace(/[.'’]/g, '')
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function looksAbbreviatedJournal(s) {
    const a = s.match(/\b(?:[A-Z][A-Za-z]{0,3}\.)/g) || [];
    const b = s.match(/\b[A-Z]\.(?:[A-Z]\.)+/g) || [];
    return a.length >= 2 || b.length >= 1;
  }

  function formatJournal(name, warnings) {
    let raw = String(name || '').trim().replace(/^[.\s]+/, '');
    raw = raw.replace(/^《|》$/g, '');
    if (!raw) return '';

    const wasAbbrev = looksAbbreviatedJournal(raw);
    const key = journalKey(raw);
    const expanded = JOURNAL_ABBREVIATIONS.get(key);

    let result = titleCase(expanded || raw);

    if (!expanded && wasAbbrev) {
      pushUnique(warnings, '刊名疑为缩写，已按原文输出；手册要求使用刊物全称，请核对。');
      // 未知缩写的末尾句点是缩写的一部分，不应被 titleCase 去掉。
      if (/\.$/.test(raw) && !/\.$/.test(result)) result += '.';
    }
    return result;
  }

  /**
   * 解析 [J] 之后的字段：Journal,Year,Volume(Issue):Pages
   */
  function parseJournalRest(rest, warnings) {
    let s = String(rest || '').trim().replace(/^[.\s]+/, '').replace(/[.\s]+$/, '');
    let pages = null;

    const pageMatch = s.match(/:([^:]+)$/);
    if (pageMatch && looksLikePageRange(pageMatch[1])) {
      pages = cleanPages(pageMatch[1]);
      s = s.slice(0, pageMatch.index).trim();
    }

    let year = null;
    let volume = null;
    let issue = null;
    let journal = '';
    let m;

    m = s.match(/^(.*),\s*(\d{4}[a-z]?)\s*,\s*([^,]+)$/);
    if (m) {
      journal = m[1];
      year = m[2];
      const vi = parseVolumeIssue(m[3]);
      volume = vi.volume;
      issue = vi.issue;
    } else {
      m = s.match(/^(.*),\s*(\d{4}[a-z]?)\s*\(([^)]+)\)$/);
      if (m) {
        journal = m[1];
        year = m[2];
        issue = m[3];
      } else {
        m = s.match(/^(.*),\s*(\d{4}[a-z]?)$/);
        if (m) {
          journal = m[1];
          year = m[2];
        } else {
          m = s.match(/^(.*?)\s+(\d{4}[a-z]?)\s*\(([^)]+)\)$/);
          if (m) {
            journal = m[1];
            year = m[2];
            issue = m[3];
          } else {
            m = s.match(/^(.*?)\s+(\d{4}[a-z]?)$/);
            if (m) {
              journal = m[1];
              year = m[2];
            }
          }
        }
      }
    }

    if (!journal) {
      journal = s;
      warnings.push('未按“刊名,年份,卷(期):页码”解析出刊物名，请核对。');
    }
    journal = formatJournal(journal, warnings);

    if (!year) warnings.push('未识别出版年份。');
    if (!pages) warnings.push('未识别页码；格式一将不显示首页。');

    return { journal: journal, year: year, volume: volume, issue: issue, pages: pages };
  }

  /**
   * 解析 [M] 之后的字段：Place:Publisher,Year:Pages
   * 手册要求：出版社 + 年份，不写出版地；页码用 p.
   */
  function parseBookRest(rest, warnings) {
    let s = String(rest || '').trim().replace(/^[.\s]+/, '').replace(/[.,\s]+$/, '');
    let pages = null;
    let edition = null;
    let translator = null;

    // 页码：最后一个冒号后的内容。
    // 注意：“Publisher: 2027” 这样的写法中，2027 是出版年而不是页码；
    // 只有当冒号前没有年份、且冒号后是单独的四位年份时，才把它留给年份解析。
    const colon = s.lastIndexOf(':');
    if (colon > -1) {
      const tail = s.slice(colon + 1).trim();
      const before = s.slice(0, colon);
      if (looksLikePageRange(tail)) {
        const loneYear = /^\d{4}$/.test(tail) &&
          isPlausibleYear(tail) &&
          !hasYearAtEnd(before);
        if (!loneYear) {
          pages = cleanPages(tail);
          s = before.trim();
        }
      }
    }

    // 页码：逗号 + p.98
    if (!pages) {
      const pm = s.match(/,\s*p{1,2}\.\s*([A-Za-z]?\d[\w.\-–—, ]*)\s*$/i);
      if (pm && looksLikePageRange(pm[1])) {
        pages = cleanPages(pm[1]);
        s = s.slice(0, pm.index).trim();
      }
    }

    // 译者：translated by X
    const tr = s.match(/(?:^|[,\s]+)(?:translated|trans\.)\s+by\s+([A-Z][A-Za-z'’\-]*(?:\s+[A-Z][A-Za-z'’\-]*)*(?:\s*(?:and|&)\s*[A-Z][A-Za-z'’\-]*(?:\s+[A-Z][A-Za-z'’\-]*)*)*)/i);
    if (tr) {
      translator = tr[1].trim();
      s = (s.slice(0, tr.index) + s.slice(tr.index + tr[0].length)).trim();
      s = s.replace(/^[.\s]+/, '').replace(/,\s*,/g, ',').replace(/[,\s]+$/, '');
    }

    // 版次：2nd ed.
    const em = s.match(/\b(\d+(?:st|nd|rd|th))\s+ed\.?\b/i);
    if (em) {
      edition = em[1] + ' ed.';
      s = (s.slice(0, em.index) + s.slice(em.index + em[0].length)).trim();
      s = s.replace(/,\s*,/g, ',').replace(/[,\s]+$/, '');
    } else {
      const em2 = s.match(/\brev(?:ised)?\.?\s+ed\.?\b/i);
      if (em2) {
        edition = 'rev. ed.';
        s = (s.slice(0, em2.index) + s.slice(em2.index + em2[0].length)).trim();
        s = s.replace(/,\s*,/g, ',').replace(/[,\s]+$/, '');
      }
    }

    // 年份
    let year = null;
    const ym = s.match(/(?:^|[,(\s:])(\d{4})(?:[)\s]*)$/);
    if (ym) {
      year = ym[1];
      s = s.slice(0, ym.index).replace(/[,\s]+$/, '');
    }

    // 出版社；去掉出版地
    let publisher = s.trim().replace(/^[,:\s]+/, '').replace(/[,:\s]+$/, '');
    const pc = publisher.indexOf(':');
    if (pc > -1) {
      const right = publisher.slice(pc + 1).trim();
      if (right) publisher = right;
    }
    publisher = publisher.replace(/^[,:\s]+/, '').replace(/[,:\s]+$/, '');

    if (!publisher) warnings.push('未识别出版社。');
    if (!year) warnings.push('未识别出版年份。');

    return {
      publisher: publisher,
      year: year,
      pages: pages,
      edition: edition,
      translator: translator
    };
  }

  function parseDateParts(s) {
    let m = String(s).match(/(\d{4})\s*[-年./]\s*(\d{1,2})\s*[-月./]\s*(\d{1,2})\s*日?/);
    if (m) {
      return { year: parseInt(m[1], 10), month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
    }
    m = String(s).match(/(\d{4})\s*[-年./]\s*(\d{1,2})\s*月?/);
    if (m) {
      return { year: parseInt(m[1], 10), month: parseInt(m[2], 10), day: null };
    }
    m = String(s).match(/(\d{4})/);
    if (m) {
      return { year: parseInt(m[1], 10), month: null, day: null };
    }
    return null;
  }

  function formatDate(parts) {
    if (!parts) return '';
    const validMonth = parts.month >= 1 && parts.month <= 12;
    const month = validMonth ? MONTH_ABBR[parts.month - 1] : '';
    if (month && parts.day) return month + ' ' + parts.day + ', ' + parts.year;
    if (month) return month + ' ' + parts.year;
    return String(parts.year);
  }

  /* ============================ 六、作者/标题切分 ============================ */

  function looksLikeAuthorList(s) {
    if (!s || s.length > 180) return false;
    if (/\b(?:19|20)\d{2}\b/.test(s)) return false;
    const parts = s.split(/\s*[,;、]\s*/).filter(Boolean);
    if (parts.length > 15) return false;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const words = p.split(/\s+/).filter(Boolean);
      if (!words.length || words.length > 7) return false;
      if (!/[A-Z\u4e00-\u9fff]/.test(p)) return false;
      const lowerWords = words.filter(function (w) { return /^[a-z]{2,}$/.test(w); });
      if (lowerWords.length > 2) return false;
    }
    return true;
  }

  /**
   * 把 “[作者].[题名]” 切开。GB 导出常见三种写法：
   *   Rachev T S . Title
   *   Rachev T S. Title
   *   Truby J.Title
   */
  function splitAuthorTitle(beforeTag) {
    let s = String(beforeTag || '').trim().replace(/\s+/g, ' ');
    s = stripTrailingTitlePeriod(s);
    if (!s) return { author: '', title: '' };

    // 1) “作者 . 题名”
    let m = s.match(/^(.+?)\s+\.\s+(.+)$/);
    if (m && looksLikeAuthorList(m[1])) {
      return { author: m[1].trim(), title: m[2].trim() };
    }

    // 2) “作者. 题名”
    const re = /\.\s+/g;
    let mm;
    while ((mm = re.exec(s))) {
      const a = s.slice(0, mm.index).trim();
      const t = s.slice(mm.index + mm[0].length).trim();
      if (a && t && looksLikeAuthorList(a)) {
        // “William P. Alford. Title” 中的 P. 是中间名缩写，不是作者/题名分界。
        const at = a.split(/\s+/);
        if (at.length === 2 && isInitialToken(at[1]) && !isInitialToken(at[0]) &&
            /^[A-Z][a-z]/.test(t)) {
          continue;
        }
        return { author: a, title: t };
      }
    }

    // 3) “作者.题名”（句点后无空格）
    const re2 = /\.(?=[A-Z])/g;
    while ((mm = re2.exec(s))) {
      const a = s.slice(0, mm.index).trim();
      const t = s.slice(mm.index + 1).trim();
      if (!a || !t) continue;
      if (/^[A-Z]\./.test(t)) continue; // 不切在 T.S. 这样的缩写链中间
      if (looksLikeAuthorList(a)) {
        return { author: a, title: t };
      }
    }

    // 4) 兜底：第一个句点
    const idx = s.indexOf('.');
    if (idx > 0) {
      return { author: s.slice(0, idx).trim(), title: s.slice(idx + 1).trim() };
    }
    return { author: '', title: s };
  }

  function cleanTitleText(raw) {
    let s = String(raw || '').trim().replace(/\s+/g, ' ');
    s = s.replace(/^["“](.*)["”]$/s, '$1').trim();
    s = stripTrailingTitlePeriod(s);
    return titleCase(s);
  }

  function extractEditionFromTitle(title) {
    const s = String(title || '');
    const m = s.match(/(?:[,\s]+|\(\s*)(\d+(?:st|nd|rd|th))\s+ed\.?\s*\)?\s*$/i);
    if (m) {
      return { title: s.slice(0, m.index).trim(), edition: m[1] + ' ed.' };
    }
    return { title: s, edition: null };
  }

  /* ============================ 七、输出拼装 ============================ */

  function field(text, italic, prefix) {
    return { text: text || '', italic: !!italic, prefix: prefix || '' };
  }

  function renderFields(fields, sep) {
    const present = fields.filter(function (f) { return f && f.text; });
    let plain = '';
    let html = '';
    for (let i = 0; i < present.length; i++) {
      if (i) {
        plain += sep;
        html += sep;
      }
      const f = present[i];
      plain += (f.prefix || '') + f.text;
      html += escapeHtml(f.prefix || '') +
        (f.italic ? '<i>' + escapeHtml(f.text) + '</i>' : escapeHtml(f.text));
    }
    return { plain: plain, html: html };
  }

  function finish(rendered, warnings, url) {
    let plain = rendered.plain;
    let html = rendered.html;
    if (!/[.?!]$/.test(plain)) {
      plain += '.';
      html += '.';
    }
    if (url) {
      plain += ' ' + url + '.';
      html += ' ' + escapeHtml(url) + '.';
    }
    return {
      plain: plain,
      html: html,
      warnings: warnings || [],
      error: false,
      kind: 'west'
    };
  }

  function errorResult(message, detail) {
    return {
      plain: message,
      html: escapeHtml(message),
      warnings: detail ? [detail] : [],
      error: true,
      kind: 'error'
    };
  }

  /* ============================ 八、西文各类型 ============================ */

  function convertWestern(line, opts, url) {
    const warnings = [];
    // 少数 GB 导出会混入全角标点，统一成半角后再解析。
    line = String(line)
      .replace(/：/g, ': ')
      .replace(/，/g, ', ')
      .replace(/；/g, '; ')
      .replace(/．/g, '.')
      .replace(/（/g, '(')
      .replace(/）/g, ')');
    const tagMatch = line.match(TAG_RE);
    if (!tagMatch) {
      return errorResult('无法识别的西文引用格式', '未找到 [J]/[M]/[C]/[D]/[N]/[EB/OL] 等文献类型标识。');
    }

    const type = tagMatch[1].toUpperCase();
    const beforeTag = line.slice(0, tagMatch.index).trim();
    let afterTag = line.slice(tagMatch.index + tagMatch[0].length).trim();

    // 去掉 GB 网络文献的访问日期 [2020-01-01]，避免干扰页码解析。
    afterTag = afterTag.replace(/\[\s*\d{4}[-年./]\d{1,2}[-月./]\d{1,2}\s*\]/g, '').trim();
    if (url) {
      warnings.push('已识别网址，附于句末；请核对目标刊物是否要求保留网址及访问日期。');
    }

    const split = splitAuthorTitle(beforeTag);
    let authorRaw = split.author;
    let titleRaw = split.title;

    if (!titleRaw) {
      return errorResult('无法识别的西文引用格式', '未识别出题名，请检查作者与题名之间的句点。');
    }
    if (!authorRaw) {
      warnings.push('未识别出作者；已按“题名 + 出版信息”输出，请核对。');
    }
    if (/[\u4e00-\u9fff]/.test(authorRaw)) {
      warnings.push('作者含中文，未转写为拼音；请按作者在原文中的署名核对。');
    }

    const titleInfo = extractEditionFromTitle(titleRaw);
    const title = cleanTitleText(titleInfo.title);
    const author = formatAuthorList(authorRaw, opts);
    const authorText = author.text;

    // ---------- 期刊 [J] ----------
    if (type === 'J') {
      const j = parseJournalRest(afterTag, warnings);
      if (!j.journal) {
        return errorResult('无法识别的西文引用格式', '未识别出刊物名。');
      }

      // 格式一：卷 刊名 首页 (年)
      if (opts.journalStyle === 'A' && j.volume) {
        const vjp = [j.volume, j.journal, firstPage(j.pages)].filter(Boolean).join(' ');
        const fields = [
          field(authorText),
          field(title, true),
          field(j.year ? vjp + ' (' + j.year + ')' : vjp)
        ];
        return finish(renderFields(fields, ', '), warnings, url);
      }

      // 格式二：刊名, Vol.卷:期, p.起-止 (年)
      let tail = '';
      if (j.volume) {
        tail = 'Vol.' + j.volume + (j.issue ? ':' + j.issue : '');
      } else if (j.issue) {
        tail = 'No.' + j.issue;
      }
      if (j.pages) {
        tail = tail ? tail + ', p.' + j.pages : 'p.' + j.pages;
      }
      if (j.year) {
        if (tail) tail += ' (' + j.year + ')';
        else tail = '(' + j.year + ')';
      }

      const fields = [
        field(authorText),
        field(title, true),
        field(j.journal),
        field(tail)
      ];
      return finish(renderFields(fields, ', '), warnings, url);
    }

    // ---------- 析出文献 [C]//、[M]//、[A]// ----------
    if (/^\/\//.test(afterTag)) {
      return convertChapter(type, authorText, title, afterTag, opts, warnings, url);
    }

    // ---------- 专著 [M]、会议录 [C]、报告 [R] ----------
    if (type === 'M' || type === 'C' || type === 'R' || type === 'CP/D') {
      const b = parseBookRest(afterTag, warnings);
      if (!b.pages) warnings.push('未标注页码；如引用特定内容，请补 p. 页码。');
      const edition = titleInfo.edition || b.edition;
      const fields = [
        field(authorText),
        field(title, true),
        field(edition),
        field(b.translator ? 'translated by ' + b.translator : ''),
        field(b.publisher),
        field(b.year),
        field(b.pages ? 'p.' + b.pages : '')
      ];
      return finish(renderFields(fields, ', '), warnings, url);
    }

    // ---------- 学位论文 [D] ----------
    if (type === 'D') {
      let s = afterTag.trim().replace(/^[.\s]+/, '').replace(/[.\s]+$/, '');
      let pages = null;
      const colon = s.lastIndexOf(':');
      if (colon > -1) {
        const tail = s.slice(colon + 1).trim();
        const before = s.slice(0, colon);
        if (looksLikePageRange(tail)) {
          const loneYear = /^\d{4}$/.test(tail) &&
            isPlausibleYear(tail) &&
            !hasYearAtEnd(before);
          if (!loneYear) {
            pages = cleanPages(tail);
            s = before.trim();
          }
        }
      }

      let year = null;
      const ym = s.match(/(?:^|[,(\s:])(\d{4})(?:[)\s]*)$/);
      if (ym) {
        year = ym[1];
        s = s.slice(0, ym.index).replace(/[,\s]+$/, '');
      }

      let university = s.trim();
      const c2 = university.lastIndexOf(':');
      if (c2 > -1) university = university.slice(c2 + 1).trim();
      university = university.replace(/^[,:\s]+/, '').replace(/[,:\s]+$/, '');

      const src = afterTag + ' ' + titleRaw;
      const isMaster = /master|硕士|M\.A\.|LL\.M\./i.test(src);
      if (!isMaster && !/ph\.?d|doctor|博士/i.test(src)) {
        warnings.push('未标明学位类型，已按 PhD dissertation 输出；如为硕士论文请改为 MA thesis。');
      }
      const degree = isMaster ? 'MA thesis' : 'PhD dissertation';
      if (!university) warnings.push('未识别授予学位的学校。');
      if (!year) warnings.push('未识别学位论文年份。');
      if (!pages) warnings.push('未标注页码；如引用特定内容，请补 p. 页码。');

      const fields = [
        field(authorText),
        field(title, true),
        field(degree),
        field(university),
        field(year),
        field(pages ? 'p.' + pages : '')
      ];
      return finish(renderFields(fields, ', '), warnings, url);
    }

    // ---------- 报纸 [N] ----------
    if (type === 'N') {
      let s = afterTag.trim().replace(/^[.\s]+/, '').replace(/[.\s]+$/, '');
      let pages = null;

      const pm = s.match(/\(([^)]+)\)\s*$/);
      if (pm && looksLikePageRange(pm[1])) {
        pages = cleanPages(pm[1]);
        s = s.slice(0, pm.index).trim();
      } else {
        const cm = s.match(/:([A-Za-z]?\d[\w\-–—]*)\s*$/);
        if (cm && looksLikePageRange(cm[1])) {
          pages = cleanPages(cm[1]);
          s = s.slice(0, cm.index).trim();
        }
      }

      const date = parseDateParts(s);
      let newspaper = s;
      if (date) {
        newspaper = s.replace(/(\d{4})\s*[-年./]\s*(\d{1,2})(?:\s*[-月./]\s*(\d{1,2})\s*日?)?/, '')
          .replace(/[,\s]+$/, '').trim();
      }
      newspaper = newspaper.replace(/^[,\s]+|[,\s]+$/g, '');

      if (!newspaper) warnings.push('未识别报纸/刊物名称。');
      if (!date) warnings.push('未识别出版日期。');

      const fields = [
        field(authorText),
        field(title, true),
        field(newspaper),
        field(formatDate(date)),
        field(pages ? 'p.' + pages : '')
      ];
      return finish(renderFields(fields, ', '), warnings, url);
    }

    // ---------- 网络文献 [EB/OL]、[DB/OL] ----------
    if (type === 'EB/OL' || type === 'DB/OL') {
      let s = afterTag.trim().replace(/^[.\s]+/, '');
      let siteUrl = null;

      const um = s.match(/https?:\/\/[^\s]+|www\.[^\s]+/i);
      if (um) {
        siteUrl = um[0].replace(/[.,;]+$/, '');
        s = s.replace(um[0], ' ');
      }

      // 访问日期 [2020-01-01]
      s = s.replace(/\[[^\]]*\]/g, ' ');

      let date = null;
      const dm = s.match(/\((\d{4}[-年./]\d{1,2}(?:[-月./]\d{1,2})?日?)\)/);
      if (dm) {
        date = parseDateParts(dm[1]);
        s = s.replace(dm[0], ' ');
      }

      let site = s.replace(/[()\[\].\s]+/g, ' ').trim();
      site = site.replace(/^[,;:]+|[,;:]+$/g, '').trim();
      if (site && /^\d{4}/.test(site)) site = '';

      if (!siteUrl) warnings.push('未识别网址。');
      if (!site) warnings.push('未识别网站名称，请按手册补充。');

      const fields = [
        field(authorText),
        field(title, true),
        field(site),
        field(formatDate(date)),
        field(siteUrl)
      ];
      return finish(renderFields(fields, ', '), warnings, null);
    }

    // ---------- 其他类型 ----------
    return errorResult(
      '暂不支持该西文文献类型',
      '文献类型 [' + type + '] 尚未实现自动转换，请按《法学引注手册》手工处理。'
    );
  }

  function convertChapter(type, authorText, chapterTitle, afterTag, opts, warnings, url) {
    let s = afterTag.trim().replace(/^\/\/\s*/, '').replace(/[.\s]+$/, '');

    // 从右往左找最后一个 “,YYYY”，其前面的最后一个句点视为出版信息起点。
    let yearIdx = -1;
    const yre = /,\s*(\d{4})(?=[:\s]|$)/g;
    let ym;
    while ((ym = yre.exec(s))) {
      yearIdx = ym.index;
    }

    let pubStart = 0;
    if (yearIdx > -1) {
      const p = s.lastIndexOf('.', yearIdx);
      pubStart = p > -1 ? p + 1 : 0;
    }

    let pubText = s.slice(pubStart).trim();
    let head = s.slice(0, pubStart).trim().replace(/\.$/, '');

    if (!pubText) {
      return errorResult('无法识别的析出文献', '未识别出出版信息。');
    }

    const pub = parseBookRest(pubText, warnings);

    let editorRaw = '';
    let bookTitleRaw = head;
    if (head && head.indexOf('.') > -1) {
      const hs = splitAuthorTitle(head);
      if (hs.author && hs.title) {
        editorRaw = hs.author;
        bookTitleRaw = hs.title;
      }
    }

    let editorText = '';
    if (editorRaw) {
      const ed = formatAuthorList(editorRaw, opts);
      editorText = ed.text;
      if (editorText && !/\beds?\.$/.test(editorText)) {
        editorText += ed.count > 1 ? ' eds.' : ' ed.';
      }
    }

    const bookTitle = cleanTitleText(bookTitleRaw);

    if (!bookTitle) warnings.push('未识别所析出书籍/论文集的名称。');
    if (!editorText) warnings.push('未识别编者；如为论文集，请按手册补 “in 编者 eds.”。');
    if (!pub.pages) warnings.push('未标注页码；如引用特定内容，请补 p. 页码。');
    warnings.push('析出文献按“出版信息前最后一个句点”拆分，请核对编者与书名。');

    const fields = [
      field(authorText),
      field(chapterTitle, true)
    ];
    if (editorText) {
      fields.push(field('in ' + editorText));
      fields.push(field(bookTitle, true));
    } else {
      fields.push(field(bookTitle, true, 'in '));
    }
    fields.push(field(pub.edition));
    fields.push(field(pub.publisher));
    fields.push(field(pub.year));
    fields.push(field(pub.pages ? 'p.' + pub.pages : ''));

    return finish(renderFields(fields, ', '), warnings, url);
  }

  /* ============================ 九、中文转换（沿用原工具） ============================ */

  function convertChinese(inputCitation) {
    const s0 = inputCitation.replace(/;/g, '、').trim();
    const trim = function (x) { return String(x == null ? '' : x).trim(); };

    function pagesText(a, b) {
      const p = String(a) + (b ? '-' + String(b) : '');
      return p.replace(/\+/g, '、');
    }

    function journalOut(author, title, journal, year, volume, issue, pages) {
      let out = trim(author) + '：《' + trim(title) + '》，载《' + trim(journal) + '》' + trim(year) + '年';
      if (volume) out += '第' + parseInt(volume, 10) + '卷';
      if (issue) out += '第' + parseInt(issue, 10) + '期';
      if (pages) out += '，第' + pages + '页';
      return out + '。';
    }

    function bookTitle(title) {
      let t = trim(title);

      // 已带“（第X版）”/“(第X版)”：移到书名号外，符合手册“《书名》（第X版）”
      let m = t.match(/^(.*?)[（(]\s*第\s*([一二三四五六七八九十百0-9]+)\s*版\s*[）)]$/);
      if (m && m[1].trim()) {
        return '《' + m[1].trim() + '》（第' + m[2] + '版）';
      }

      // “书名: 第6版”“书名 第6版”“书名第6版”
      m = t.match(/^(.*?)(?:\s*[:：]\s*|\s*)第\s*([一二三四五六七八九十百0-9]+)\s*版\s*$/);
      if (m && m[1].trim()) {
        return '《' + m[1].trim() + '》（第' + m[2] + '版）';
      }

      return '《' + t + '》';
    }

    function bookOut(author, title, translator, publisher, year, pages) {
      let out = trim(author) + '：' + bookTitle(title);
      if (translator) {
        const tr = trim(translator).replace(/译$/, '').trim();
        if (tr) out += '，' + tr + '译';
      }
      out += '，' + trim(publisher) + trim(year) + '年版';
      if (pages) out += '，第' + pages + '页';
      return out + '。';
    }

    function thesisOut(author, title, university, year, pages) {
      let out = trim(author) + '：《' + trim(title) + '》，' + trim(university) + trim(year) + '年博士论文';
      if (pages) out += '，第' + pages + '页';
      return out + '。';
    }

    function newspaperOut(author, title, newspaper, year, month, day, edition) {
      let out = author ? trim(author) + '：' : '';
      out += '《' + trim(title) + '》，载《' + trim(newspaper) + '》' +
        parseInt(year, 10) + '年' + parseInt(month, 10) + '月' + parseInt(day, 10) + '日';
      if (edition) {
        let e = trim(edition).replace(/^第/, '').replace(/版$/, '');
        if (/^\d+$/.test(e)) e = String(parseInt(e, 10));
        out += '，第' + e + '版';
      }
      return out + '。';
    }

    const rules = [
      // ==================== 报纸：有作者 ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[N\]\.\s*(.+?),\s*(\d{4})\s*[-./年]\s*(\d{1,2})\s*[-./月]\s*(\d{1,2})\s*日?\s*\(([^)]+)\)\.?$/,
        fn: function (m) { return newspaperOut(m[1], m[2], m[3], m[4], m[5], m[6], m[7]); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[N\]\.\s*(.+?),\s*(\d{4})\s*[-./年]\s*(\d{1,2})\s*[-./月]\s*(\d{1,2})\s*日?\.?$/,
        fn: function (m) { return newspaperOut(m[1], m[2], m[3], m[4], m[5], m[6], null); }
      },

      // ==================== 报纸：无作者（题名在前） ====================
      {
        re: /^(.+?)\s*\[N\]\.\s*(.+?),\s*(\d{4})\s*[-./年]\s*(\d{1,2})\s*[-./月]\s*(\d{1,2})\s*日?\s*\(([^)]+)\)\.?$/,
        fn: function (m) { return newspaperOut('', m[1], m[2], m[3], m[4], m[5], m[6]); }
      },
      {
        re: /^(.+?)\s*\[N\]\.\s*(.+?),\s*(\d{4})\s*[-./年]\s*(\d{1,2})\s*[-./月]\s*(\d{1,2})\s*日?\.?$/,
        fn: function (m) { return newspaperOut('', m[1], m[2], m[3], m[4], m[5], null); }
      },

      // ==================== 期刊：年,卷(期):起-止 ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4}),\s*(\d{1,2})\s*\((\d{1,2})\):\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], m[6], m[7], pagesText(m[8], m[9])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4}),\s*(\d{1,2})\s*\((\d{1,2})\):\s*(\d+)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], m[6], m[7], pagesText(m[8], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4}),\s*(\d{1,2})\s*\((\d{1,2})\)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], m[6], m[7], ''); }
      },

      // ==================== 期刊：年(期):起-止 ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4})\s*\((\d{1,2})\):\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], null, m[6], pagesText(m[7], m[8])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4})\s*\((\d{1,2})\):\s*(\d+)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], null, m[6], pagesText(m[7], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4})\s*\((\d{1,2})\)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], null, m[6], ''); }
      },

      // ==================== 期刊：年,(期):起-止（CNKI 常见多逗号写法） ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4}),\s*\((\d{1,2})\):\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], null, m[6], pagesText(m[7], m[8])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4}),\s*\((\d{1,2})\):\s*(\d+)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], null, m[6], pagesText(m[7], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[(.+?)\]\.\s*(.+?),\s*(\d{4}),\s*\((\d{1,2})\)\.$/,
        fn: function (m) { return journalOut(m[1], m[2], m[4], m[5], null, m[6], ''); }
      },

      // ==================== 知网“文献节”：题名在前，作者在后 ====================
      {
        re: /^(.*?)\[(.*?)\]\.\s*(.*?)\.\s*(.*?),\s*(\d{4})\s*\((\d{1,2})\)\.?$/,
        fn: function (m) { return journalOut(m[3], m[1], m[4], m[5], null, m[6], ''); }
      },

      // ==================== 专著：译者 + 出版社: 年: 起-止 ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*译\.\s*(.+?)\s*:\s*(\d{4})\s*:\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return bookOut(m[1], m[2], m[3], m[4], m[5], pagesText(m[6], m[7])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*译\.\s*(.+?)\s*:\s*(\d{4})\s*:\s*(\d+)\.$/,
        fn: function (m) { return bookOut(m[1], m[2], m[3], m[4], m[5], pagesText(m[6], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*译\.\s*(.+?)\s*:\s*(\d{4})\.$/,
        fn: function (m) { return bookOut(m[1], m[2], m[3], m[4], m[5], ''); }
      },

      // ==================== 专著：出版社: 年: 起-止（无地点） ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*:\s*(\d{4})\s*:\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return bookOut(m[1], m[2], null, m[3], m[4], pagesText(m[5], m[6])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*:\s*(\d{4})\s*:\s*(\d+)\.$/,
        fn: function (m) { return bookOut(m[1], m[2], null, m[3], m[4], pagesText(m[5], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*:\s*(\d{4})\.$/,
        fn: function (m) { return bookOut(m[1], m[2], null, m[3], m[4], ''); }
      },

      // ==================== 专著：译者 + 地点:出版社,年:起-止 ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*译\.\s*([^:]+):\s*([^,]+),\s*(\d{4})\s*:\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return bookOut(m[1], m[2], m[3], m[5], m[6], pagesText(m[7], m[8])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*译\.\s*([^:]+):\s*([^,]+),\s*(\d{4})\s*:\s*(\d+)\.$/,
        fn: function (m) { return bookOut(m[1], m[2], m[3], m[5], m[6], pagesText(m[7], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*(.+?)\s*译\.\s*([^:]+):\s*([^,]+),\s*(\d{4})\.$/,
        fn: function (m) { return bookOut(m[1], m[2], m[3], m[5], m[6], ''); }
      },

      // ==================== 专著：地点:出版社,年:起-止 ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*([^:,]+):\s*([^,]+),\s*(\d{4})\s*:\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return bookOut(m[1], m[2], null, m[4], m[5], pagesText(m[6], m[7])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*([^:,]+):\s*([^,]+),\s*(\d{4})\s*:\s*(\d+)\.$/,
        fn: function (m) { return bookOut(m[1], m[2], null, m[4], m[5], pagesText(m[6], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[M\]\.\s*([^:,]+):\s*([^,]+),\s*(\d{4})\.$/,
        fn: function (m) { return bookOut(m[1], m[2], null, m[4], m[5], ''); }
      },

      // ==================== 知网“文献节”：专著 ====================
      {
        re: /^(.*?)\[(.*?)\]\.\s*(.*?)(著)\.\s*(.*?)\.\s*(.*)$/,
        fn: function (m) { return bookOut(m[3], m[1], null, m[5], m[6], ''); }
      },
      {
        re: /^(.*?)\[(.*?)\]\.\s*(.*?)(主编)\.\s*(.*?)\.\s*(.*)$/,
        fn: function (m) { return bookOut(m[3], m[1], null, m[5], m[6], ''); }
      },
      {
        re: /^(.*?)\[(.*?)\]\.\s*(.*?)\.\s*(.*?)\.\s*(.*)$/,
        fn: function (m) { return bookOut(m[3], m[1], null, m[4], m[5], ''); }
      },

      // ==================== 学位论文：地点:学校,年:起-止 ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[D\]\.\s*([^:]+):\s*([^,]+),\s*(\d{4})\s*:\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return thesisOut(m[1], m[2], m[4], m[5], pagesText(m[6], m[7])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[D\]\.\s*([^:]+):\s*([^,]+),\s*(\d{4})\s*:\s*(\d+)\.$/,
        fn: function (m) { return thesisOut(m[1], m[2], m[4], m[5], pagesText(m[6], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[D\]\.\s*([^:]+):\s*([^,]+),\s*(\d{4})\.$/,
        fn: function (m) { return thesisOut(m[1], m[2], m[4], m[5], ''); }
      },

      // ==================== 学位论文：学校,年:起-止（无地点） ====================
      {
        re: /^(.+?)\.\s*(.+?)\s*\[D\]\.\s*([^,]+),\s*(\d{4})\s*:\s*(\d+)-(\d+(?:\+\d+)?)\.$/,
        fn: function (m) { return thesisOut(m[1], m[2], m[3], m[4], pagesText(m[5], m[6])); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[D\]\.\s*([^,]+),\s*(\d{4})\s*:\s*(\d+)\.$/,
        fn: function (m) { return thesisOut(m[1], m[2], m[3], m[4], pagesText(m[5], null)); }
      },
      {
        re: /^(.+?)\.\s*(.+?)\s*\[D\]\.\s*([^,]+),\s*(\d{4})\.$/,
        fn: function (m) { return thesisOut(m[1], m[2], m[3], m[4], ''); }
      },

      // ==================== 知网“文献节”：学位论文 ====================
      {
        re: /^(.*?)\[(\w)\]\.\s*(.*?)\.\s*(.*?),\s*(\d{4})\s*\.?$/,
        fn: function (m) { return thesisOut(m[3], m[1], m[4], m[5], ''); }
      }
    ];

    for (let i = 0; i < rules.length; i++) {
      const m = s0.match(rules[i].re);
      if (m) {
        return rules[i].fn(m)
          .replace(/《\s+/g, '《')
          .replace(/\s+》/g, '》')
          .replace(/，\s+/g, '，')
          .replace(/。\s+/g, '。')
          .replace(/([\u4e00-\u9fff])\s*,\s*(?=[\u4e00-\u9fff])/g, '$1、')
          .replace(/([^\x00-\xff]),([^\x00-\xff])/g, '$1、$2')
          .replace(/\s{2,}/g, ' ')
          .trim();
      }
    }

    return '无法识别的引用格式';
  }

  /* ============================ 十、总入口 ============================ */

  function isWesternRecord(s) {
    const m = s.match(TAG_RE);
    if (!m) return false;

    const before = s.slice(0, m.index);
    const after = s.slice(m.index + m[0].length);
    const dot = before.indexOf('.');
    const titleZone = dot >= 0 ? before.slice(dot + 1) : before;

    if (!/[A-Za-z]/.test(titleZone)) return false;
    if (/[\u4e00-\u9fff]/.test(titleZone)) return false;

    const afterHead = after.split(/[,.]/)[0] || '';
    if (/[\u4e00-\u9fff]/.test(afterHead)) return false;

    return true;
  }

  function convertCitation(raw, options) {
    const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    const normalized = normalizeLine(raw);
    if (!normalized) {
      return { plain: '', html: '', warnings: [], error: false, kind: 'empty' };
    }

    const doiInfo = extractDoi(normalized);
    let line = doiInfo.text.trim();

    // 非 [EB/OL]/[DB/OL] 的网络首发文献（如 [J/OL]）可能带网址；
    // 先取出网址，避免它干扰卷期、页码解析。
    let url = null;
    const tagForUrl = line.match(TAG_RE);
    if (tagForUrl) {
      const t = tagForUrl[1].toUpperCase();
      if (t !== 'EB/OL' && t !== 'DB/OL') {
        const start = tagForUrl.index + tagForUrl[0].length;
        const afterPart = line.slice(start);
        const um = afterPart.match(/https?:\/\/[^\s]+|www\.[^\s]+/i);
        if (um) {
          url = um[0].replace(/[.,;]+$/, '');
          const abs = start + um.index;
          line = (line.slice(0, abs) + line.slice(abs + um[0].length)).trim();
        }
      }
    }

    try {
      if (isWesternRecord(line)) {
        return convertWestern(line, opts, url);
      }

      const cn = convertChinese(line);
      if (cn === '无法识别的引用格式') {
        return {
          plain: cn,
          html: escapeHtml(cn),
          warnings: ['无法识别该文献格式，请检查标点、文献类型标识与句末句点。'],
          error: true,
          kind: 'zh'
        };
      }
      return {
        plain: cn,
        html: escapeHtml(cn),
        warnings: [],
        error: false,
        kind: 'zh'
      };
    } catch (e) {
      return {
        plain: '无法识别的引用格式',
        html: escapeHtml('无法识别的引用格式'),
        warnings: ['转换出错：' + (e && e.message ? e.message : '未知错误')],
        error: true,
        kind: 'error'
      };
    }
  }

  const api = {
    convertCitation: convertCitation,
    convertChinese: convertChinese,
    titleCase: titleCase,
    formatAuthorList: formatAuthorList,
    normalizeLine: normalizeLine,
    extractDoi: extractDoi,
    DEFAULT_OPTIONS: DEFAULT_OPTIONS
  };

  root.Faxuezhuan = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  /* ============================ 十一、浏览器界面 ============================ */

  if (typeof document === 'undefined') return;

  const state = {
    lines: [],
    summary: '',
    diagnostics: [],
    lastInput: ''
  };

  let helpButtonClickCount = 0;

  function toggleHelp() {
    const helpContent = document.getElementById('helpContent');
    if (!helpContent) return;
    helpButtonClickCount++;
    if (helpButtonClickCount >= 10) {
      helpButtonClickCount = 0;
      alert("王家骥：南京大学法律硕士  中国政法大学法学学士  日语翻译  摄影师  资深学术混子  程序员学徒  德语初心者  黄金圆脸  抽象法学创始人  小红书新晋网红  明日香爱好者  动森岛主  法学电子书仓鼠  ");
    } else {
      helpContent.classList.toggle('show');
    }
  }

  function openReferenceTool() {
    window.open('https://pegaseius.github.io/lawschoolreferencetest/', '_blank');
  }

  function openNormalizationTool() {
    window.open('https://pegaseius.github.io/quxuhao/', '_blank');
  }

  function openEndNoteTool() {
    window.open('https://pegaseius.github.io/gb/', '_blank');
  }

  function getOptions() {
    const styleSelect = document.getElementById('westernJournalStyle');
    const allAuthorsCheck = document.getElementById('listAllAuthors');
    return {
      journalStyle: styleSelect ? styleSelect.value : 'A',
      listAllAuthors: allAuthorsCheck ? !!allAuthorsCheck.checked : false
    };
  }

  function renderDiagnostics() {
    const box = document.getElementById('diagnostics');
    if (!box) return;

    if (!state.diagnostics.length && !state.summary) {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }

    const parts = ['<div class="diagnostics-inner">'];
    if (state.summary) {
      parts.push('<p class="diag-summary">' + escapeHtml(state.summary) + '</p>');
    }
    if (state.diagnostics.length) {
      parts.push('<ul>');
      state.diagnostics.forEach(function (d) {
        parts.push('<li>' + escapeHtml(d) + '</li>');
      });
      parts.push('</ul>');
    }
    parts.push('</div>');
    box.innerHTML = parts.join('');
    box.style.display = 'block';
  }

  function convertAndDisplay() {
    const inputEl = document.getElementById('inputCitations');
    const outputEl = document.getElementById('outputCitations');
    if (!inputEl || !outputEl) return;

    const raw = inputEl.value;
    const lines = raw.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    state.lines = [];
    state.diagnostics = [];
    state.lastInput = raw;

    if (!lines.length) {
      outputEl.innerHTML = '<p class="placeholder">请在上方输入需要转换的引注，每条一行。</p>';
      state.summary = '';
      renderDiagnostics();
      return;
    }

    const opts = getOptions();
    let ok = 0;
    let western = 0;

    lines.forEach(function (line, idx) {
      const res = convertCitation(line, opts);
      state.lines.push(res);

      if (!res.error && !res.empty) {
        ok++;
        if (res.kind !== 'zh') western++;
      }

      if (res.warnings && res.warnings.length) {
        res.warnings.forEach(function (w) {
          state.diagnostics.push('第 ' + (idx + 1) + ' 行：' + w);
        });
      }
      if (res.error) {
        state.diagnostics.push('第 ' + (idx + 1) + ' 行原文：' + line);
      }
    });

    const successful = state.lines.filter(function (l) { return !l.error && !l.empty; });
    if (successful.length) {
      outputEl.innerHTML = successful.map(function (l) {
        return '<p class="citation">' + l.html + '</p>';
      }).join('');
    } else {
      outputEl.innerHTML = '<p class="placeholder">没有成功转换的条目，请查看下方提示。</p>';
    }

    state.summary = '共 ' + lines.length + ' 条：成功 ' + ok + ' 条' +
      (ok ? '（中文 ' + (ok - western) + ' 条，西文 ' + western + ' 条）' : '') + '。';

    renderDiagnostics();
  }

  function copyPlainText(text) {
    if (!text) return Promise.reject(new Error('empty'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) {
        document.body.removeChild(ta);
        reject(e);
      }
    });
  }

  function copyRichText(plain, html) {
    if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({
        'text/plain': new Blob([plain], { type: 'text/plain;charset=utf-8' }),
        'text/html': new Blob([html], { type: 'text/html;charset=utf-8' })
      });
      return navigator.clipboard.write([item]);
    }

    // 回退：用 contenteditable + execCommand 复制富文本
    return new Promise(function (resolve, reject) {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.innerHTML = html;
      div.style.position = 'fixed';
      div.style.left = '-9999px';
      div.style.top = '0';
      document.body.appendChild(div);

      const range = document.createRange();
      range.selectNodeContents(div);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      try {
        const ok = document.execCommand('copy');
        sel.removeAllRanges();
        document.body.removeChild(div);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) {
        sel.removeAllRanges();
        document.body.removeChild(div);
        reject(e);
      }
    });
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
      Promise.resolve(promise).then(function (v) {
        clearTimeout(timer);
        resolve(v);
      }, function (e) {
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  function setCopyStatus(message) {
    const el = document.getElementById('copyStatus');
    if (!el) return;
    el.textContent = message;
    if (el._timer) clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.textContent = ''; }, 2600);
  }

  function getSuccessfulLines() {
    return state.lines.filter(function (l) { return !l.error && !l.empty && l.plain; });
  }

  function copyToClipboard() {
    const lines = getSuccessfulLines();
    if (!lines.length) {
      setCopyStatus('没有可复制的内容');
      return;
    }
    const plain = lines.map(function (l) { return l.plain; }).join('\n');
    const html = '<div>' + lines.map(function (l) {
      return '<p>' + l.html + '</p>';
    }).join('') + '</div>';

    const done = function () { setCopyStatus('已复制（含标题斜体）'); };
    const fail = function () {
      withTimeout(copyPlainText(plain), 1500).then(function () {
        setCopyStatus('已复制纯文本（浏览器不支持富文本）');
      }).catch(function () {
        setCopyStatus('复制失败，请手动选择输出内容');
      });
    };

    setCopyStatus('正在复制…');
    try {
      const p = copyRichText(plain, html);
      if (p && p.then) {
        withTimeout(p, 2000).then(done).catch(fail);
      } else {
        done();
      }
    } catch (e) {
      fail();
    }
  }

  function copyPlain() {
    const lines = getSuccessfulLines();
    if (!lines.length) {
      setCopyStatus('没有可复制的内容');
      return;
    }
    setCopyStatus('正在复制…');
    withTimeout(copyPlainText(lines.map(function (l) { return l.plain; }).join('\n')), 1500)
      .then(function () { setCopyStatus('已复制纯文本'); })
      .catch(function () { setCopyStatus('复制失败，请手动选择输出内容'); });
  }

  function updateStyleHint() {
    const sel = document.getElementById('westernJournalStyle');
    const hint = document.getElementById('styleHint');
    if (!sel || !hint) return;
    hint.textContent = sel.value === 'B'
      ? '格式二保留卷、期与起止页码，适合需要精确标注期号的文献。'
      : '格式一按手册基本式只保留卷号、刊名与首页，省略期号和起止页码；需保留请选格式二。';
  }

  function init() {
    const convertBtn = document.getElementById('convertButton');
    const copyBtn = document.getElementById('copyButton');
    const copyPlainBtn = document.getElementById('copyPlainButton');
    const helpBtn = document.getElementById('helpButton');
    const refBtn = document.getElementById('referenceToolButton');
    const normBtn = document.getElementById('normalizationToolButton');
    const endBtn = document.getElementById('endNoteToolButton');
    const styleSel = document.getElementById('westernJournalStyle');
    const authorsCheck = document.getElementById('listAllAuthors');
    const outputEl = document.getElementById('outputCitations');

    if (outputEl) {
      outputEl.innerHTML = '<p class="placeholder">输入引注后点击“转换”。</p>';
    }

    if (convertBtn) convertBtn.addEventListener('click', convertAndDisplay);
    if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
    if (copyPlainBtn) copyPlainBtn.addEventListener('click', copyPlain);
    if (helpBtn) helpBtn.addEventListener('click', toggleHelp);
    if (refBtn) refBtn.addEventListener('click', openReferenceTool);
    if (normBtn) normBtn.addEventListener('click', openNormalizationTool);
    if (endBtn) endBtn.addEventListener('click', openEndNoteTool);

    if (styleSel) {
      styleSel.addEventListener('change', function () {
        updateStyleHint();
        if (state.lastInput) convertAndDisplay();
      });
    }
    if (authorsCheck) {
      authorsCheck.addEventListener('change', function () {
        if (state.lastInput) convertAndDisplay();
      });
    }

    updateStyleHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : globalThis);
