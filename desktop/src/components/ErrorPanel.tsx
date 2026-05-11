type ErrorPanelProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
};

function ErrorPanel({
  message,
  onRetry,
  retryLabel = "重新生成",
  title = "生成失败",
}: ErrorPanelProps) {
  return (
    <section className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <div className="mb-4 h-1 w-10 rounded-full bg-rose-400" />
      <h2 className="text-xl font-semibold text-rose-100">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-rose-100/85">
        {message}
      </p>
      {onRetry ? (
        <button
          className="mt-5 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/10"
          type="button"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      ) : null}
    </section>
  );
}

export default ErrorPanel;
