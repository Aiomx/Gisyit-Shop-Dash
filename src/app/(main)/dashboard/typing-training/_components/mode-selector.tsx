"use client";

import { useEffect, useState } from "react";
import { Type, AlignLeft, FileText, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TrainingMode } from "@/types/typing-training";
import {
  createTrainingStore,
  type TrainingStore,
} from "@/stores/typing-training/training-store";

// ============================================================================
// Types
// ============================================================================

interface ModeOption {
  mode: TrainingMode;
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

// ============================================================================
// Constants
// ============================================================================

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: "word",
    title: "单词训练",
    description: "逐个单词练习，提升词汇输入准确率",
    icon: Type,
    features: ["支持多种单词类型筛选", "可调节难度等级", "逐词显示，专注练习"],
  },
  {
    mode: "sentence",
    title: "句子训练",
    description: "完整句子练习，提升连续输入流畅度",
    icon: AlignLeft,
    features: ["结构完整的句子", "可配置核心词汇", "适中长度，持续练习"],
  },
  {
    mode: "article",
    title: "文章训练",
    description: "长文章练习，培养持久输入耐力",
    icon: FileText,
    features: ["多种文章类型", "可调节语气和人称", "贴近真实场景"],
  },
];

// ============================================================================
// Component
// ============================================================================

/**
 * 训练模式选择器组件
 *
 * 展示三种训练模式供用户选择，并记住用户上次的选择
 * Requirements: 2.1, 2.2, 2.3
 */
export function ModeSelector() {
  const [store, setStore] = useState<TrainingStore | null>(null);
  const [selectedMode, setSelectedMode] = useState<TrainingMode | null>(null);

  // Initialize store on client side
  useEffect(() => {
    const trainingStore = createTrainingStore();
    setStore(trainingStore);

    // Get initial mode from store (persisted preference)
    const initialState = trainingStore.getState();
    setSelectedMode(initialState.mode);

    // Subscribe to store changes
    const unsubscribe = trainingStore.subscribe((state) => {
      setSelectedMode(state.mode);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleModeSelect = (mode: TrainingMode) => {
    if (store) {
      store.getState().setMode(mode);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MODE_OPTIONS.map((option) => (
        <ModeCard
          key={option.mode}
          option={option}
          isSelected={selectedMode === option.mode}
          onSelect={() => handleModeSelect(option.mode)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ModeCardProps {
  option: ModeOption;
  isSelected: boolean;
  onSelect: () => void;
}

function ModeCard({ option, isSelected, onSelect }: ModeCardProps) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left w-full"
    >
      <Card
        className={cn(
          "h-full cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected && "ring-2 ring-primary border-primary"
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary"
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            {isSelected && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
          <CardTitle className="mt-4 text-lg">{option.title}</CardTitle>
          <CardDescription>{option.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {option.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </button>
  );
}
