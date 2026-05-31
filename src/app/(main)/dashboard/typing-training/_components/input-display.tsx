"use client";

import { useEffect, useRef, useCallback } from "react";

import { cn } from "@/lib/utils";
import type { CharacterCell as CharacterCellType } from "@/types/typing-training";

import { CharacterCell } from "./character-cell";

// ============================================================================
// Types
// ============================================================================

export interface InputDisplayProps {
  /** 字符单元数组 */
  characters: CharacterCellType[];
  /** 当前输入位置索引 */
  currentIndex: number;
  /** 是否处于活动状态（接受输入） */
  isActive: boolean;
  /** 按键处理回调 */
  onKeyPress: (key: string) => void;
  /** 是否显示错误字符 */
  showTypedChars?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** 需要忽略的功能键 */
const IGNORED_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Tab",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Insert",
  "Delete",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
]);

// ============================================================================
// Component
// ============================================================================

/**
 * 输入显示组件
 *
 * 渲染训练内容的字符单元格，并处理键盘事件
 *
 * Requirements: 8.1 - 实时逐字比对
 * Requirements: 8.2 - 视觉指示正确/错误/剩余字符
 */
export function InputDisplay({
  characters,
  currentIndex,
  isActive,
  onKeyPress,
  showTypedChars = true,
  className,
}: InputDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 处理键盘事件
   * Requirements: 8.1 - 实时逐字比对
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 不活动时忽略输入
      if (!isActive) {
        return;
      }

      // 忽略功能键
      if (IGNORED_KEYS.has(event.key)) {
        return;
      }

      // 阻止默认行为（如退格键的页面后退）
      event.preventDefault();

      // 处理退格键 - 当前实现不支持退格修正
      if (event.key === "Backspace") {
        return;
      }

      // 处理回车键 - 转换为换行符
      if (event.key === "Enter") {
        onKeyPress("\n");
        return;
      }

      // 处理普通字符输入
      if (event.key.length === 1) {
        onKeyPress(event.key);
      }
    },
    [isActive, onKeyPress]
  );

  /**
   * 设置键盘事件监听
   */
  useEffect(() => {
    if (!isActive) {
      return;
    }

    // 添加全局键盘监听
    window.addEventListener("keydown", handleKeyDown);

    // 聚焦容器以确保能接收键盘事件
    containerRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, handleKeyDown]);

  /**
   * 自动滚动到当前字符位置
   */
  useEffect(() => {
    if (!containerRef.current || currentIndex < 0) {
      return;
    }

    const currentCharElement = containerRef.current.querySelector(
      `[data-status="current"]`
    );

    if (currentCharElement) {
      currentCharElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [currentIndex]);

  // 空内容处理
  if (characters.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          "min-h-[200px] rounded-lg border border-dashed",
          "text-muted-foreground",
          className
        )}
      >
        <p>暂无训练内容</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        // 容器样式
        "relative p-4 md:p-6",
        "rounded-lg border bg-card",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        // 文本换行
        "break-words",
        // 活动状态指示
        isActive && "cursor-text",
        !isActive && "opacity-75",
        className
      )}
      role="textbox"
      aria-label="训练输入区域"
      aria-readonly="true"
    >
      {/* 字符渲染区域 */}
      <div className="flex flex-wrap leading-loose">
        {characters.map((cell, index) => (
          <CharacterCell
            key={`${index}-${cell.char}`}
            char={cell.char}
            status={cell.status}
            typedChar={cell.typedChar}
            showTypedChar={showTypedChars}
          />
        ))}
      </div>

      {/* 活动状态提示 */}
      {isActive && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          按任意键开始输入
        </div>
      )}
    </div>
  );
}
