"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { ModeSelector } from "./_components/mode-selector";

/**
 * 键盘输入训练引擎主页
 *
 * 展示训练模式选择界面，支持单词、句子、文章三种训练模式
 * Requirements: 2.1
 */
export default function TypingTrainingPage() {
  return (
    <>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/fun-hub">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">键盘训练</h1>
          <p className="text-muted-foreground">
            选择训练模式，开始提升你的打字技能
          </p>
        </div>
      </div>

      <ModeSelector />
    </>
  );
}
