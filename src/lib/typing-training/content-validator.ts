/**
 * Content Validator - 内容验证器
 *
 * 负责验证单词完整性和内容质量
 *
 * Requirements: 3.4, 3.5, 6.2, 6.3, 6.5, 6.6, 7.2, 7.3, 7.4
 */

import type {
  ValidationResult,
  ValidationError,
  ValidationErrorType,
} from "@/types/typing-training";

// ============================================================================
// 禁用符号列表 (Requirement 6.2)
// ============================================================================

/** 禁用的模糊符号 */
export const OBSCURE_SYMBOLS = [
  "†",
  "‡",
  "§",
  "¶",
  "©",
  "®",
  "™",
  "℃",
  "℉",
  "№",
  "℗",
  "℠",
  "∞",
  "∑",
  "∏",
  "√",
  "∫",
  "≈",
  "≠",
  "≤",
  "≥",
  "±",
  "÷",
  "×",
  "µ",
  "π",
  "Ω",
  "α",
  "β",
  "γ",
  "δ",
  "ε",
  "θ",
  "λ",
  "σ",
  "φ",
  "ψ",
  "ω",
  "←",
  "→",
  "↑",
  "↓",
  "↔",
  "⇒",
  "⇔",
  "∀",
  "∃",
  "∈",
  "∉",
  "⊂",
  "⊃",
  "∪",
  "∩",
  "∧",
  "∨",
  "¬",
  "⊕",
  "⊗",
  "★",
  "☆",
  "♠",
  "♣",
  "♥",
  "♦",
  "♪",
  "♫",
  "☀",
  "☁",
  "☂",
  "☃",
  "☎",
  "☑",
  "☒",
  "✓",
  "✗",
  "✔",
  "✘",
  "❤",
  "❥",
  "❦",
  "❧",
];

// ============================================================================
// 时间敏感词汇列表 (Requirement 6.5)
// ============================================================================

/** 时间敏感词汇（英文） */
export const TIME_SENSITIVE_WORDS_EN = [
  "today",
  "yesterday",
  "tomorrow",
  "now",
  "currently",
  "this week",
  "last week",
  "next week",
  "this month",
  "last month",
  "next month",
  "this year",
  "last year",
  "next year",
  "recently",
  "lately",
  "soon",
  "just now",
  "right now",
  "at the moment",
  "these days",
  "nowadays",
];

/** 时间敏感词汇（中文） */
export const TIME_SENSITIVE_WORDS_ZH = [
  "今天",
  "昨天",
  "明天",
  "现在",
  "目前",
  "本周",
  "上周",
  "下周",
  "本月",
  "上月",
  "下月",
  "今年",
  "去年",
  "明年",
  "最近",
  "近来",
  "即将",
  "刚才",
  "此刻",
  "当前",
  "这几天",
  "如今",
];

/** 所有时间敏感词汇 */
export const TIME_SENSITIVE_WORDS = [
  ...TIME_SENSITIVE_WORDS_EN,
  ...TIME_SENSITIVE_WORDS_ZH,
];

// ============================================================================
// 对话式表达列表 (Requirement 6.6, 7.4)
// ============================================================================

/** 对话式表达（英文） */
export const CONVERSATIONAL_PHRASES_EN = [
  "please",
  "let's",
  "let us",
  "you should",
  "you must",
  "you need to",
  "you have to",
  "don't forget",
  "remember to",
  "make sure",
  "be sure to",
  "try to",
  "feel free",
  "go ahead",
  "by the way",
  "anyway",
  "actually",
  "basically",
  "honestly",
  "frankly",
  "well,",
  "so,",
  "okay",
  "ok,",
  "alright",
  "hey",
  "hi",
  "hello",
  "dear",
  "thanks",
  "thank you",
  "sorry",
  "excuse me",
];

/** 对话式表达（中文） */
export const CONVERSATIONAL_PHRASES_ZH = [
  "请",
  "让我们",
  "你应该",
  "你必须",
  "你需要",
  "别忘了",
  "记得",
  "确保",
  "一定要",
  "试着",
  "随便",
  "顺便说一下",
  "反正",
  "其实",
  "基本上",
  "老实说",
  "坦白说",
  "好吧",
  "那么",
  "嗯",
  "哦",
  "嘿",
  "喂",
  "你好",
  "亲爱的",
  "谢谢",
  "抱歉",
  "不好意思",
];

/** 所有对话式表达 */
export const CONVERSATIONAL_PHRASES = [
  ...CONVERSATIONAL_PHRASES_EN,
  ...CONVERSATIONAL_PHRASES_ZH,
];

// ============================================================================
// 模糊缩写列表 (Requirement 7.2)
// ============================================================================

/** 模糊缩写 */
export const AMBIGUOUS_ABBREVIATIONS = [
  "etc.",
  "e.g.",
  "i.e.",
  "vs.",
  "vs",
  "w/",
  "w/o",
  "b/c",
  "b4",
  "u",
  "ur",
  "r",
  "n",
  "2",
  "4",
  "thru",
  "tho",
  "govt",
  "dept",
  "approx",
  "misc",
  "info",
  "asap",
  "fyi",
  "btw",
  "imo",
  "imho",
  "tbh",
  "idk",
  "lol",
  "omg",
  "brb",
  "ttyl",
];

// ============================================================================
// 列表标记和代码块模式 (Requirement 6.3)
// ============================================================================

/** 列表标记正则表达式 */
export const LIST_MARKER_PATTERNS = [
  /^[\s]*[-*+]\s+/m, // 无序列表: - item, * item, + item
  /^[\s]*\d+\.\s+/m, // 有序列表: 1. item
  /^[\s]*[a-zA-Z]\)\s+/m, // 字母列表: a) item
  /^[\s]*\([a-zA-Z0-9]+\)\s+/m, // 括号列表: (1) item, (a) item
];

/** 代码块正则表达式 */
export const CODE_BLOCK_PATTERNS = [
  /```[\s\S]*?```/, // Markdown 代码块
  /`[^`]+`/, // 行内代码
  /<code>[\s\S]*?<\/code>/i, // HTML 代码标签
  /<pre>[\s\S]*?<\/pre>/i, // HTML pre 标签
];

/** Markdown 格式化正则表达式 */
export const MARKDOWN_FORMATTING_PATTERNS = [
  /\*\*[^*]+\*\*/, // 粗体 **text**
  /\*[^*]+\*/, // 斜体 *text*
  /__[^_]+__/, // 粗体 __text__
  /_[^_]+_/, // 斜体 _text_
  /~~[^~]+~~/, // 删除线 ~~text~~
  /\[([^\]]+)\]\([^)]+\)/, // 链接 [text](url)
  /!\[([^\]]*)\]\([^)]+\)/, // 图片 ![alt](url)
  /^#{1,6}\s+/m, // 标题 # heading
];

// ============================================================================
// 可选连字符模式 (Requirement 7.3)
// ============================================================================

/** 可选连字符模式 */
export const OPTIONAL_HYPHEN_PATTERNS = [
  /\b(e-?mail)\b/i,
  /\b(on-?line)\b/i,
  /\b(web-?site)\b/i,
  /\b(data-?base)\b/i,
  /\b(co-?operate)\b/i,
  /\b(re-?use)\b/i,
  /\b(pre-?set)\b/i,
  /\b(anti-?virus)\b/i,
  /\b(multi-?task)\b/i,
  /\b(non-?profit)\b/i,
];

// ============================================================================
// 验证函数
// ============================================================================

/**
 * 验证单词完整性
 *
 * 检查单词是否与原始单词完全匹配，无修改、无前后空格、无额外标点
 *
 * @param word - 要验证的单词
 * @param original - 原始单词
 * @returns 是否完整匹配
 *
 * Requirements: 3.4, 3.5
 */
export function validateWordIntegrity(word: string, original: string): boolean {
  // 检查是否完全相等
  if (word !== original) {
    return false;
  }

  // 检查是否有前后空格
  if (word !== word.trim()) {
    return false;
  }

  // 检查原始单词是否有前后空格（不应该有）
  if (original !== original.trim()) {
    return false;
  }

  return true;
}

/**
 * 验证内容质量
 *
 * 检查内容是否符合训练材料的质量要求
 *
 * @param content - 要验证的内容
 * @returns 验证结果
 *
 * Requirements: 6.2, 6.3, 6.5, 6.6, 7.2, 7.3, 7.4
 */
export function validateContentQuality(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  // 检查模糊符号 (Requirement 6.2)
  for (const symbol of OBSCURE_SYMBOLS) {
    const position = content.indexOf(symbol);
    if (position !== -1) {
      errors.push({
        type: "obscure_symbol",
        message: `Content contains obscure symbol: "${symbol}"`,
        position,
      });
    }
  }

  // 检查列表标记 (Requirement 6.3)
  for (const pattern of LIST_MARKER_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      errors.push({
        type: "list_marker",
        message: `Content contains list marker: "${match[0].trim()}"`,
        position: match.index,
      });
    }
  }

  // 检查代码块 (Requirement 6.3)
  for (const pattern of CODE_BLOCK_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      errors.push({
        type: "code_block",
        message: "Content contains code block",
        position: match.index,
      });
    }
  }

  // 检查 Markdown 格式化 (Requirement 6.3)
  for (const pattern of MARKDOWN_FORMATTING_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      errors.push({
        type: "markdown_formatting",
        message: `Content contains markdown formatting: "${match[0]}"`,
        position: match.index,
      });
    }
  }

  // 检查时间敏感词汇 (Requirement 6.5)
  const lowerContent = content.toLowerCase();
  for (const word of TIME_SENSITIVE_WORDS) {
    const position = lowerContent.indexOf(word.toLowerCase());
    if (position !== -1) {
      errors.push({
        type: "time_sensitive",
        message: `Content contains time-sensitive word: "${word}"`,
        position,
      });
    }
  }

  // 检查对话式表达 (Requirement 6.6, 7.4)
  for (const phrase of CONVERSATIONAL_PHRASES) {
    const position = lowerContent.indexOf(phrase.toLowerCase());
    if (position !== -1) {
      errors.push({
        type: "conversational",
        message: `Content contains conversational phrase: "${phrase}"`,
        position,
      });
    }
  }

  // 检查模糊缩写 (Requirement 7.2)
  for (const abbr of AMBIGUOUS_ABBREVIATIONS) {
    const pattern = new RegExp(`\\b${escapeRegExp(abbr)}\\b`, "i");
    const match = content.match(pattern);
    if (match) {
      errors.push({
        type: "ambiguous_abbreviation",
        message: `Content contains ambiguous abbreviation: "${abbr}"`,
        position: match.index,
      });
    }
  }

  // 检查可选连字符 (Requirement 7.3)
  for (const pattern of OPTIONAL_HYPHEN_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      errors.push({
        type: "optional_hyphen",
        message: `Content contains word with optional hyphen: "${match[0]}"`,
        position: match.index,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 检查内容是否包含特定类型的错误
 *
 * @param content - 要检查的内容
 * @param errorType - 错误类型
 * @returns 是否包含该类型错误
 */
export function hasValidationError(
  content: string,
  errorType: ValidationErrorType
): boolean {
  const result = validateContentQuality(content);
  return result.errors.some((error) => error.type === errorType);
}

/**
 * 获取特定类型的验证错误
 *
 * @param content - 要检查的内容
 * @param errorType - 错误类型
 * @returns 该类型的所有错误
 */
export function getValidationErrors(
  content: string,
  errorType: ValidationErrorType
): ValidationError[] {
  const result = validateContentQuality(content);
  return result.errors.filter((error) => error.type === errorType);
}
