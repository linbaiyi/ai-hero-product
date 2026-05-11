import { useEffect, useMemo, useRef, useState } from "react";
import { defaultPlayableSpec } from "../specs/defaultPlayableSpec";
import { normalizePlayableSpec } from "../specs/normalizePlayableSpec";
import type { HeroPlayableSpec } from "../specs/playableSpecTypes";
import {
  createPlaytestInitialState,
  createPlaytestSnapshot,
  PlaytestRuntime,
  type PlaytestSnapshot,
} from "./playtestRuntime";

export type PlaytestSpecSource = "current_project" | "default";

export type PlaytestViewProps = {
  playableSpec?: HeroPlayableSpec | null;
  playableSpecSource?: PlaytestSpecSource;
};

function PlaytestView({
  playableSpec,
  playableSpecSource = playableSpec ? "current_project" : "default",
}: PlaytestViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<PlaytestRuntime | null>(null);
  const resolvedSpec = useMemo(() => {
    try {
      return {
        spec: normalizePlayableSpec(playableSpec ?? defaultPlayableSpec),
        error: null as string | null,
      };
    } catch (error) {
      return {
        spec: defaultPlayableSpec,
        error:
          error instanceof Error
            ? `当前试玩配置无效，已回退到默认测试英雄。${error.message}`
            : "当前试玩配置无效，已回退到默认测试英雄。",
      };
    }
  }, [playableSpec]);
  const effectiveSource: PlaytestSpecSource =
    resolvedSpec.error || !playableSpec ? "default" : playableSpecSource;
  const initialSnapshot = useMemo(
    () =>
      createPlaytestSnapshot(
        createPlaytestInitialState(resolvedSpec.spec),
        resolvedSpec.spec,
      ),
    [resolvedSpec.spec],
  );
  const [snapshot, setSnapshot] = useState<PlaytestSnapshot>(initialSnapshot);
  const [runtimeError, setRuntimeError] = useState<string | null>(resolvedSpec.error);

  useEffect(() => {
    setSnapshot(initialSnapshot);
    setRuntimeError(resolvedSpec.error);
  }, [initialSnapshot, resolvedSpec.error]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    try {
      const runtime = new PlaytestRuntime(container, { spec: resolvedSpec.spec });
      runtimeRef.current = runtime;
      setSnapshot(runtime.getStateSnapshot());
      const snapshotTimer = window.setInterval(() => {
        setSnapshot(runtime.getStateSnapshot());
      }, 200);

      return () => {
        window.clearInterval(snapshotTimer);
        runtime.dispose();
        runtimeRef.current = null;
      };
    } catch (error) {
      setRuntimeError(
        error instanceof Error
          ? error.message
          : "Playtest WebGL runtime failed to start.",
      );
      return undefined;
    }
  }, [resolvedSpec.spec]);

  const handleReset = () => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      setSnapshot(initialSnapshot);
      return;
    }
    runtime.reset();
    setSnapshot(runtime.getStateSnapshot());
  };

  return (
    <div className="playtest-view">
      <div className="view-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="view-title">Playtest Arena</h2>
          <p className="view-description">
            {effectiveSource === "current_project"
              ? `当前英雄试玩：${resolvedSpec.spec.hero.name}`
              : `默认测试英雄：${resolvedSpec.spec.hero.name}`}
          </p>
        </div>
        <button className="ue-button" onClick={handleReset} type="button">
          Reset
        </button>
      </div>

      <div className="playtest-layout">
        <section className="playtest-canvas-panel" aria-label="Playtest Canvas">
          <div
            className="playtest-canvas-host"
            ref={containerRef}
            tabIndex={0}
          />
          {runtimeError ? (
            <div className="playtest-error-panel" role="alert">
              <h3>Playtest 初始化提示</h3>
              <p>{runtimeError}</p>
            </div>
          ) : null}
        </section>

        <aside className="playtest-side-panel" aria-label="Playtest Status">
          <section className="playtest-status-block">
            <h3>Hero</h3>
            <div className="playtest-source-badge">
              {effectiveSource === "current_project" ? "当前英雄" : "默认测试英雄"}
            </div>
            <div className="playtest-stat-row">
              <span>Name</span>
              <strong>{snapshot.hero_name}</strong>
            </div>
            <div className="playtest-stat-row">
              <span>HP</span>
              <strong>
                {formatNumber(snapshot.hp)} / {formatNumber(snapshot.max_hp)}
              </strong>
            </div>
            <div className="playtest-stat-row">
              <span>Resource</span>
              <strong>
                {formatNumber(snapshot.resource)} /{" "}
                {formatNumber(snapshot.max_resource)} {snapshot.resource_type}
              </strong>
            </div>
          </section>

          <section className="playtest-status-block">
            <h3>Skills</h3>
            <div className="playtest-skill-list">
              {snapshot.skills.map((skill) => (
                <div className="playtest-skill-row" key={skill.slot}>
                  <span className="playtest-skill-slot">{skill.slot}</span>
                  <span className="playtest-skill-name">{skill.name}</span>
                  <span className="playtest-cooldown">
                    {skill.cooldown_remaining > 0
                      ? `${skill.cooldown_remaining.toFixed(1)}s`
                      : "Ready"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="playtest-status-block">
            <h3>Controls</h3>
            <div className="playtest-help-list">
              <span>WASD / Arrow Keys: move</span>
              <span>1 / 2 / 3 / 4: cast Q / W / E / R</span>
              <span>Reset: reset current arena spec</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default PlaytestView;
