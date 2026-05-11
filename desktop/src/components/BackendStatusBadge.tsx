import type { BackendConnectionStatus } from "../types/backend";

type BackendStatusBadgeProps = {
  status: BackendConnectionStatus;
  version?: string;
  errorMessage?: string;
  onRetry?: () => void;
};

const statusStyles: Record<BackendConnectionStatus, string> = {
  idle: "border-[#343842] bg-[#15171b] text-[#aeb4bf]",
  checking: "border-[#4b9fff]/40 bg-[#15171b] text-[#93c5fd]",
  connected: "border-emerald-500/35 bg-[#15171b] text-emerald-400",
  failed: "border-red-500/40 bg-[#15171b] text-red-300",
};

function BackendStatusBadge({
  status,
  version,
  errorMessage,
  onRetry,
}: BackendStatusBadgeProps) {
  const label = getStatusLabel(status, version);

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded border px-2.5 py-1 text-xs shadow-none ${statusStyles[status]}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
      <div className="min-w-0">
        <p className="font-medium leading-5">{label}</p>
        {status === "failed" && errorMessage ? (
          <p className="mt-1 max-w-md truncate text-xs opacity-85">
            {errorMessage}
          </p>
        ) : null}
      </div>
      {status === "failed" && onRetry ? (
        <button
          className="shrink-0 rounded border border-red-500/40 px-2 py-0.5 text-xs font-medium text-red-200 transition hover:bg-red-500/10"
          type="button"
          onClick={onRetry}
        >
          重试连接
        </button>
      ) : null}
    </div>
  );
}

function getStatusLabel(status: BackendConnectionStatus, version?: string) {
  if (status === "idle") {
    return "后端未检测";
  }

  if (status === "checking") {
    return "正在检测后端...";
  }

  if (status === "connected") {
    return version ? `后端已连接 v${version}` : "后端已连接";
  }

  return "后端连接失败";
}

export default BackendStatusBadge;
