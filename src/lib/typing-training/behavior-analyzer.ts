/**
 * Behavior Analyzer - 行为分析器
 *
 * 负责会话指标计算、错误频率分析
 *
 * Requirements: 9.1, 9.2
 */

import type {
  InputSession,
  SessionResult,
  Keystroke,
  ErrorStat,
} from "@/types/typing-training";

/**
 * 计算准确率
 *
 * @param correct - 正确字符数
 * @param total - 总字符数
 * @returns 准确率 (0-100)
 *
 * Requirements: 9.1
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  if (correct < 0) {
    return 0;
  }

  if (correct > total) {
    return 100;
  }

  return (correct / total) * 100;
}

/**
 * 计算输入速度（字符/分钟）
 *
 * @param characters - 字符数
 * @param timeInMs - 时间（毫秒）
 * @returns 速度（字符/分钟）
 *
 * Requirements: 9.1
 */
export function calculateSpeed(characters: number, timeInMs: number): number {
  if (timeInMs <= 0) {
    return 0;
  }

  if (characters <= 0) {
    return 0;
  }

  const timeInMinutes = timeInMs / 60000;
  return characters / timeInMinutes;
}

/**
 * 分析错误频率
 *
 * 统计按键记录中的错误，按出现次数降序排列
 *
 * @param keystrokes - 按键记录数组
 * @returns 错误统计数组，按 count 降序排列
 *
 * Requirements: 9.2
 */
export function analyzeErrorFrequency(keystrokes: Keystroke[]): ErrorStat[] {
  // 使用 Map 统计错误
  const errorMap = new Map<string, ErrorStat>();

  for (const keystroke of keystrokes) {
    if (!keystroke.isCorrect) {
      const key = `${keystroke.expected}|${keystroke.actual}`;

      if (errorMap.has(key)) {
        const existing = errorMap.get(key)!;
        existing.count += 1;
      } else {
        errorMap.set(key, {
          expected: keystroke.expected,
          actual: keystroke.actual,
          count: 1,
        });
      }
    }
  }

  // 转换为数组并按 count 降序排列
  const errors = Array.from(errorMap.values());
  errors.sort((a, b) => b.count - a.count);

  return errors;
}

/**
 * 计算会话指标
 *
 * 根据输入会话计算完整的统计结果
 *
 * @param session - 输入会话
 * @returns 会话统计结果
 *
 * Requirements: 9.1, 9.2
 */
export function calculateSessionMetrics(session: InputSession): SessionResult {
  // 计算总时间（秒）
  const endTime = session.endTime ?? new Date();
  const totalTimeMs = endTime.getTime() - session.startTime.getTime();
  const totalTime = Math.max(0, totalTimeMs / 1000);

  // 计算准确率
  const accuracy = calculateAccuracy(
    session.correctCharacters,
    session.totalCharacters
  );

  // 计算速度（字符/分钟）
  const speed = calculateSpeed(session.totalCharacters, totalTimeMs);

  // 分析错误频率
  const frequentErrors = analyzeErrorFrequency(session.keystrokes);

  return {
    id: session.id,
    materialId: session.materialId,
    mode: session.mode,
    accuracy,
    speed,
    totalTime,
    totalCharacters: session.totalCharacters,
    correctCharacters: session.correctCharacters,
    incorrectCharacters: session.incorrectCharacters,
    frequentErrors,
    createdAt: new Date(),
  };
}

/**
 * 计算平均准确率
 *
 * @param results - 会话结果数组
 * @returns 平均准确率
 */
export function calculateAverageAccuracy(results: SessionResult[]): number {
  if (results.length === 0) {
    return 0;
  }

  const sum = results.reduce((acc, result) => acc + result.accuracy, 0);
  return sum / results.length;
}

/**
 * 计算平均速度
 *
 * @param results - 会话结果数组
 * @returns 平均速度
 */
export function calculateAverageSpeed(results: SessionResult[]): number {
  if (results.length === 0) {
    return 0;
  }

  const sum = results.reduce((acc, result) => acc + result.speed, 0);
  return sum / results.length;
}
