import type { ReactNode } from "react";
import type { ActivityView } from "./ActivityBar";

type AppHeaderProps = {
  activeView?: ActivityView;
  currentProjectLabel?: string | null;
  onMenuSelect?: (view: ActivityView) => void;
  children?: ReactNode;
};

function AppHeader({
  activeView,
  currentProjectLabel = null,
  onMenuSelect,
  children,
}: AppHeaderProps) {
  const menuItems: Array<{
    label: string;
    view?: ActivityView;
    fallback?: ActivityView;
  }> = [
    { label: "File", fallback: "generate" },
    { label: "Project", view: "projects" },
    { label: "Generate", view: "generate" },
    { label: "Assets", view: "assets" },
    { label: "Export", view: "export" },
    { label: "Help" },
  ];

  return (
    <header className="shrink-0">
      <nav className="editor-menu-bar" aria-label="Editor menu">
        <span className="editor-menu-brand">AI Hero Design Editor</span>
        {menuItems.map((item) => {
          const targetView = item.view ?? item.fallback;
          const isActive = item.view === activeView;

          return (
            <button
              className={`editor-menu-item ${isActive ? "editor-menu-item-active" : ""}`}
              key={item.label}
              onClick={() => {
                if (targetView) {
                  onMenuSelect?.(targetView);
                }
              }}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="editor-toolbar">
        <div className="editor-tool-group">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-[#343842] bg-[#262a31] text-[11px] font-bold text-[#4b9fff]">
            AI
          </div>
          <div className="min-w-0">
            <h1 className="editor-toolbar-title">AI 游戏英雄设计助手</h1>
            <p className="editor-toolbar-subtitle">
              英雄方案生成 · 技能特效拆解 · 特效设计板输出
            </p>
          </div>
          {currentProjectLabel ? (
            <span className="ml-2 hidden max-w-[260px] truncate rounded border border-[#343842] bg-[#15171b] px-2 py-1 text-[12px] text-[#aeb4bf] xl:inline-flex">
              {currentProjectLabel}
            </span>
          ) : null}
        </div>

        <div className="editor-tool-group justify-end">{children}</div>
      </div>
    </header>
  );
}

export default AppHeader;
