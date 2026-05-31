"use client";

import { useEffect, useState, useCallback } from "react";
import { Play, RotateCcw, Pause, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrainingMaterial } from "@/types/typing-training";
import {
  createTrainingStore,
  getProgress,
  getCorrectCount,
  getIncorrectCount,
  type TrainingStore,
} from "@/stores/typing-training/training-store";
import {
  createSessionStore,
  type SessionStore,
} from "@/stores/typing-training/session-store";

import { InputDisplay } from "./input-display";
import { TrainingProgressBar } from "./progress-bar";

// ============================================================================
// Types
// ============================================================================

export interface TrainingInterfaceProps {
  /** 训练素材 */
  material: TrainingMaterial;
  /** 训练完成回调 */
  onComplete?: (result: {
    accuracy: number;
    speed: number;
    totalTime: number;
  }) => void;
  /** 重新开始回调 */
  onRestart?: () => void;
  /** 自定义类名 */
  className?: string;
}

interface TrainingStats {
  progress: number;
  correctCount: number;
  incorrectCount: number;
  completedCount: number;
  totalCount: number;
  isActive: boolean;
  isCompleted: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 训练界面容器组件
 *
 * 整合 InputDisplay 和 ProgressBar，处理训练流程控制
 *
 * Requirements: 8.1 - 实时逐字比对
 * Requirements: 8.2 - 视觉指示正确/错误/剩余字符
 * Requirements: 8.3 - 完成后自动前进
 * Requirements: 8.4 - 跟踪和显示当前进度
 */
export function TrainingInterface({
  material,
  onComplete,
  onRestart,
  className,
}: TrainingInterfaceProps) {
  // Store instances
  const [trainingStore, setTrainingStore] = useState<TrainingStore | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);

  // Training state
  const [stats, setStats] = useState<TrainingStats>({
    progress: 0,
    correctCount: 0,
    incorrectCount: 0,
    completedCount: 0,
    totalCount: material.content.length,
    isActive: false,
    isCompleted: false,
  });

  const [characters, setCharacters] = useState<
    ReturnType<TrainingStore["getState"]>["characters"]
  >([]);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  /**
   * 初始化 stores
   */
  useEffect(() => {
    const training = createTrainingStore();
    const session = createSessionStore();

    setTrainingStore(training);
    setSessionStore(session);

    // 加载训练素材
    training.getState().loadMaterial(material);

    // 初始化状态
    const initialState = training.getState();
    setCharacters(initialState.characters);
    setStats({
      progress: getProgress(initialState),
      correctCount: getCorrectCount(initialState),
      incorrectCount: getIncorrectCount(initialState),
      completedCount: initialState.currentIndex,
      totalCount: initialState.characters.length,
      isActive: initialState.isActive,
      isCompleted: initialState.isCompleted,
    });

    // 订阅状态变化
    const unsubscribe = training.subscribe((state) => {
      setCharacters(state.characters);
      setStats({
        progress: getProgress(state),
        correctCount: getCorrectCount(state),
        incorrectCount: getIncorrectCount(state),
        completedCount: state.currentIndex,
        totalCount: state.characters.length,
        isActive: state.isActive,
        isCompleted: state.isCompleted,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [material]);

  /**
   * 计时器
   */
  useEffect(() => {
    if (!stats.isActive || !startTime) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [stats.isActive, startTime]);

  /**
   * 处理训练完成
   */
  useEffect(() => {
    if (stats.isCompleted && startTime && sessionStore) {
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      const accuracy =
        stats.completedCount > 0
          ? (stats.correctCount / stats.completedCount) * 100
          : 0;
      const speed =
        totalTime > 0 ? (stats.completedCount / totalTime) * 60 : 0;

      // 结束会话
      sessionStore.getState().endSession();

      // 回调
      onComplete?.({
        accuracy: Math.round(accuracy * 100) / 100,
        speed: Math.round(speed * 100) / 100,
        totalTime,
      });
    }
  }, [stats.isCompleted, startTime, stats.correctCount, stats.completedCount, sessionStore, onComplete]);

  /**
   * 处理按键
   */
  const handleKeyPress = useCallback(
    (key: string) => {
      if (!trainingStore || !sessionStore) {
        return;
      }

      const state = trainingStore.getState();

      // 首次按键时开始计时和会话
      if (!startTime && state.isActive) {
        setStartTime(Date.now());
        sessionStore.getState().startSession(
          material.mode,
          material.id,
          material.content
        );
      }

      // 记录按键
      const expectedChar = state.characters[state.currentIndex]?.char;
      if (expectedChar) {
        sessionStore.getState().recordKeystroke(expectedChar, key);
      }

      // 处理按键
      state.handleKeyPress(key);
    },
    [trainingStore, sessionStore, startTime, material]
  );

  /**
   * 开始/暂停训练
   */
  const handleToggleActive = useCallback(() => {
    if (!trainingStore) {
      return;
    }

    const state = trainingStore.getState();
    if (state.isCompleted) {
      return;
    }

    // 如果还没开始，加载素材
    if (!state.isActive && state.characters.length === 0) {
      state.loadMaterial(material);
    }
  }, [trainingStore, material]);

  /**
   * 重新开始训练
   */
  const handleRestart = useCallback(() => {
    if (!trainingStore) {
      return;
    }

    // 重置状态
    trainingStore.getState().reset();
    trainingStore.getState().loadMaterial(material);
    setStartTime(null);
    setElapsedTime(0);

    onRestart?.();
  }, [trainingStore, material, onRestart]);

  /**
   * 格式化时间显示
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">训练进行中</CardTitle>
          <div className="flex items-center gap-2">
            {/* 计时器 */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
              <span>⏱</span>
              <span>{formatTime(elapsedTime)}</span>
            </div>

            {/* 控制按钮 */}
            {!stats.isCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                disabled={stats.isActive}
              >
                {stats.isActive ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    进行中
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    开始
                  </>
                )}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-1" />
              重新开始
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 进度条 */}
        <TrainingProgressBar
          progress={stats.progress}
          completedCount={stats.completedCount}
          totalCount={stats.totalCount}
          correctCount={stats.correctCount}
          incorrectCount={stats.incorrectCount}
          showStats={true}
        />

        {/* 输入显示区域 */}
        <InputDisplay
          characters={characters}
          currentIndex={stats.completedCount}
          isActive={stats.isActive}
          onKeyPress={handleKeyPress}
          showTypedChars={true}
        />

        {/* 完成状态 */}
        {stats.isCompleted && (
          <div className="flex items-center justify-center gap-2 py-4 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">训练完成！</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
