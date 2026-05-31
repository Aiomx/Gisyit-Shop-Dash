"use client";

import { cn } from "@/lib/utils";
import type { CharacterStatus } from "@/types/typing-training";

// ============================================================================
// Types
// ============================================================================

export interface CharacterCellProps {
  /** 要显示的字符 */
  char: string;
  /** 字符状态 */
  status: CharacterStatus;
  /** 用户实际输入的字符（用于显示错误时的对比） */
  typedChar?: string;
  /** 是否显示错误字符 */
  showTypedChar?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// Style Constants
// ============================================================================

/**
 * 字符状态对应的样式映射
 * Requirements: 8.2 - 视觉区分正确、错误、待输入和当前字符
 */
const STATUS_STYLES: Record<CharacterStatus, string> = {
  pending: "text-muted-foreground bg-transparent",
  current: "text-foreground bg-primary/20 ring-2 ring-primary ring-offset-1",
  correct: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
  incorrect: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
};

// ============================================================================
// Component
// ============================================================================

/**
 * 字符单元格组件
 *
 * 用于显示训练内容中的单个字符，根据输入状态显示不同的视觉样式
 *
 * Requirements: 8.2 - 视觉指示正确字符、错误字符和剩余字符
 */
export function CharacterCell({
  char,
  status,
  typedChar,
  showTypedChar = false,
  className,
}: CharacterCellProps) {
  // 处理空格字符的显示
  const displayChar = char === " " ? "\u00A0" : char;
  const isSpace = char === " ";

  return (
    <span
      className={cn(
        // 基础样式
        "inline-flex items-center justify-center",
        "min-w-[1.5ch] px-0.5 py-0.5",
        "font-mono text-lg leading-relaxed",
        "rounded transition-all duration-150",
        // 空格字符特殊处理
        isSpace && status === "current" && "border-b-2 border-primary",
        // 状态样式
        STATUS_STYLES[status],
        className
      )}
      data-status={status}
      data-char={char}
    >
      {/* 显示字符 */}
      <span className="relative">
        {displayChar}
        {/* 错误时显示用户输入的字符 */}
        {status === "incorrect" && showTypedChar && typedChar && (
          <span
            className={cn(
              "absolute -top-4 left-1/2 -translate-x-1/2",
              "text-xs text-red-500 dark:text-red-400",
              "bg-red-100 dark:bg-red-900/50",
              "px-1 rounded"
            )}
          >
            {typedChar === " " ? "␣" : typedChar}
          </span>
        )}
      </span>
    </span>
  );
}

// ============================================================================
// Variants
// ============================================================================

/**
 * 紧凑版字符单元格
 * 用于显示更多字符的场景
 */
export function CharacterCellCompact({
  char,
  status,
  className,
}: Omit<CharacterCellProps, "typedChar" | "showTypedChar">) {
  const displayChar = char === " " ? "\u00A0" : char;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-[1ch] px-px",
        "font-mono text-base leading-normal",
        "rounded-sm transition-colors duration-100",
        STATUS_STYLES[status],
        className
      )}
      data-status={status}
    >
      {displayChar}
    </span>
  );
}
