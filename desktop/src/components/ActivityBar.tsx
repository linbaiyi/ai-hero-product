export type ActivityView =
  | "generate"
  | "blueprint"
  | "assets"
  | "projects"
  | "settings"
  | "export"
  | "playtest";

type ActivityBarProps = {
  activeView: ActivityView;
  onChange: (view: ActivityView) => void;
};

const activityItems: Array<{
  id: ActivityView;
  label: string;
  icon: string;
  title: string;
}> = [
  { id: "generate", label: "生成", icon: "G", title: "Generate" },
  { id: "blueprint", label: "方案", icon: "B", title: "Blueprint" },
  { id: "assets", label: "资产", icon: "A", title: "Assets" },
  { id: "projects", label: "项目", icon: "P", title: "Projects" },
  { id: "settings", label: "API", icon: "K", title: "API Settings" },
  { id: "export", label: "导出", icon: "E", title: "Export" },
  { id: "playtest", label: "Play", icon: "T", title: "Playtest" },
];

function ActivityBar({ activeView, onChange }: ActivityBarProps) {
  return (
    <nav className="activity-bar" aria-label="Activity Bar">
      {activityItems.map((item) => {
        const isActive = item.id === activeView;

        return (
          <button
            aria-label={item.title}
            className={`activity-item ${isActive ? "activity-item-active" : ""}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            title={item.title}
            type="button"
          >
            <span className="activity-icon">{item.icon}</span>
            <span className="activity-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default ActivityBar;
