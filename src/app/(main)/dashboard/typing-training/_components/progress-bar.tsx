"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

// ============================================================================
// Types
// ============================================================================

export interface TrainingProgressBarProps {
  /** 当前进度百分比 (0-100) */
  progress: number;
  /** 已完成字符数 */
  completedCount: number;
  /** 总字符数 */
  totalCount: number;
  /** 正确字符数 */
  correctCount?: number;
  /** 错误字符数 */
  incorrectCount?: number;
  /** 是否显示详细统计 */
  showStats?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 训练进度条组件
 *
 * 显示当前训练进度和可选的详细统计信息
 *
 * Requirements: 8.4 - 跟踪和显示当前会话进度
 */
export function TrainingProgressBar({
  progress,
  completedCount,
  totalCount,
  correctCount,
  incorrectCount,
  showStats = true,
  className,
}: TrainingProgressBarProps) {
  // 计算准确率
  const accuracy =
    completedCount > 0 && correctCount !== undefined
      ? Math.round((correctCount / completedCount) * 100)
      : null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* 进度条 */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-sm font-medium tabular-nums min-w-[4ch] text-right">
          {Math.round(progress)}%
        </span>
      </div>

      {/* 详细统计 */}
      {showStats && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {/* 进度计数 */}
          <div className="flex items-center gap-1">
            <span className="tabular-nums">{completedCount}</span>
            <span>/</span>
            <span className="tabular-nums">{totalCount}</span>
            <span>字符</span>
          </div>

          {/* 正确/错误统计 */}
          {correctCount !== undefined && incorrectCount !== undefined && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="tabular-nums">{correctCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="tabular-nums">{incorrectCount}</span>
              </div>
              {accuracy !== null && (
                <div className="flex items-center gap-1">
                  <span>准确率:</span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      accuracy >= 90
                        ? "text-green-600 dark:text-green-400"
                        : accuracy >= 70
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {accuracy}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Variants
// ============================================================================

/**
 * 简洁版进度条
 * 只显示进度百分比，不显示详细统计
 */
export function TrainingProgressBarCompact({
  progress,
  className,
}: Pick<TrainingProgressBarProps, "progress" | "className">) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress value={progress} className="flex-1 h-1.5" />
      <span className="text-xs font-medium tabular-nums text-muted-foreground">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
