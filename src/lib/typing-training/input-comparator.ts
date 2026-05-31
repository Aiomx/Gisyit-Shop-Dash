/**
 * Input Comparator - 输入比对器
 *
 * 负责字符比对、状态更新和进度计算
 *
 * Requirements: 8.1, 8.2, 8.4
 */

import type { CharacterCell, CharacterStatus } from "@/types/typing-training";

/**
 * 比较单个字符是否匹配
 *
 * @param expected - 期望的字符
 * @param actual - 实际输入的字符
 * @returns 是否匹配
 *
 * Requirements: 8.1
 */
export function compareCharacter(expected: string, actual: string): boolean {
  return expected === actual;
}

/**
 * 更新字符状态数组
 *
 * 根据用户输入更新指定位置的字符状态，并设置下一个字符为 current
 *
 * @param characters - 当前字符单元数组
 * @param index - 当前输入位置
 * @param typedChar - 用户输入的字符
 * @returns 更新后的字符单元数组（新数组，不修改原数组）
 *
 * Requirements: 8.1, 8.2
 */
export function updateCharacterStatus(
  characters: CharacterCell[],
  index: number,
  typedChar: string
): CharacterCell[] {
  // 边界检查
  if (index < 0 || index >= characters.length) {
    return characters;
  }

  // 创建新数组以保持不可变性
  const newCharacters = characters.map((cell, i) => {
    if (i === index) {
      // 更新当前位置的状态
      const isCorrect = compareCharacter(cell.char, typedChar);
      const newStatus: CharacterStatus = isCorrect ? "correct" : "incorrect";
      return {
        ...cell,
        status: newStatus,
        typedChar,
      };
    } else if (i === index + 1 && cell.status === "pending") {
      // 设置下一个字符为 current（如果存在且为 pending）
      return {
        ...cell,
        status: "current" as CharacterStatus,
      };
    }
    return cell;
  });

  return newCharacters;
}

/**
 * 计算当前进度百分比
 *
 * @param currentIndex - 当前已完成的字符索引
 * @param totalCharacters - 总字符数
 * @returns 进度百分比 (0-100)
 *
 * Requirements: 8.4
 */
export function calculateProgress(
  currentIndex: number,
  totalCharacters: number
): number {
  if (totalCharacters <= 0) {
    return 0;
  }

  if (currentIndex < 0) {
    return 0;
  }

  if (currentIndex >= totalCharacters) {
    return 100;
  }

  return (currentIndex / totalCharacters) * 100;
}

/**
 * 将字符串转换为 CharacterCell 数组
 *
 * @param content - 训练内容字符串
 * @returns CharacterCell 数组，第一个字符状态为 current，其余为 pending
 */
export function initializeCharacterCells(content: string): CharacterCell[] {
  return content.split("").map((char, index) => ({
    char,
    status: index === 0 ? "current" : "pending",
    typedChar: undefined,
  }));
}

/**
 * 检查训练是否完成
 *
 * @param currentIndex - 当前索引
 * @param totalCharacters - 总字符数
 * @returns 是否完成
 *
 * Requirements: 8.3
 */
export function isTrainingComplete(
  currentIndex: number,
  totalCharacters: number
): boolean {
  return currentIndex >= totalCharacters;
}
