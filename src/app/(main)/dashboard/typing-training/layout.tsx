import type { ReactNode } from "react";

/**
 * 键盘输入训练引擎布局
 *
 * 为训练引擎页面提供统一的布局容器
 * Requirements: 2.1
 */
export default function TypingTrainingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {children}
    </div>
  );
}
