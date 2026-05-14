import { useEffect, useMemo, useRef, useState } from "react";
import { defaultPlayableSpec } from "../specs/defaultPlayableSpec";
import { normalizePlayableSpec } from "../specs/normalizePlayableSpec";
import type { HeroPlayableSpec } from "../specs/playableSpecTypes";
import { normalizeRuntimeVfxAssetSpec } from "../vfx-assets/normalizeRuntimeVfxAssetSpec";
import type { RuntimeVfxAssetSpec } from "../vfx-assets/runtimeVfxTypes";
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
  runtimeVfxAssetSpec?: RuntimeVfxAssetSpec | null;
};

function PlaytestView({
  playableSpec,
  playableSpecSource = playableSpec ? "current_project" : "default",
  runtimeVfxAssetSpec,
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
  const resolvedRuntimeVfx = useMemo(() => {
    if (!runtimeVfxAssetSpec) {
      return {
        spec: null as RuntimeVfxAssetSpec | null,
        error: null as string | null,
      };
    }

    try {
      return {
        spec: normalizeRuntimeVfxAssetSpec(runtimeVfxAssetSpec),
        error: null as string | null,
      };
    } catch (error) {
      return {
        spec: null,
        error:
          error instanceof Error
            ? `运行时贴图资产配置无效，已回退到默认几何体效果。${error.message}`
            : "运行时贴图资产配置无效，已回退到默认几何体效果。",
      };
    }
  }, [runtimeVfxAssetSpec]);
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
  const [noCooldownEnabled, setNoCooldownEnabled] = useState(false);
  const [showVfxRangeDebug, setShowVfxRangeDebug] = useState(false);

  useEffect(() => {
    setSnapshot(initialSnapshot);
    setRuntimeError(resolvedSpec.error ?? resolvedRuntimeVfx.error);
  }, [initialSnapshot, resolvedSpec.error, resolvedRuntimeVfx.error]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    try {
      const runtime = new PlaytestRuntime(container, {
        spec: resolvedSpec.spec,
        runtimeVfxAssetSpec: resolvedRuntimeVfx.spec,
        noCooldownEnabled,
        showVfxRangeDebug,
      });
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
  }, [resolvedSpec.spec, resolvedRuntimeVfx.spec]);

  const handleReset = () => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      setSnapshot(initialSnapshot);
      return;
    }
    runtime.reset();
    setSnapshot(runtime.getStateSnapshot());
  };

  const handleToggleNoCooldown = () => {
    const nextValue = !noCooldownEnabled;
    setNoCooldownEnabled(nextValue);
    runtimeRef.current?.setNoCooldownEnabled(nextValue);
    const snapshot = runtimeRef.current?.getStateSnapshot();
    if (snapshot) {
      setSnapshot(snapshot);
    }
  };

  const handleToggleVfxRangeDebug = () => {
    const nextValue = !showVfxRangeDebug;
    setShowVfxRangeDebug(nextValue);
    runtimeRef.current?.setShowVfxRangeDebug(nextValue);
    const snapshot = runtimeRef.current?.getStateSnapshot();
    if (snapshot) {
      setSnapshot(snapshot);
    }
  };

  const enemyStatuses = snapshot.enemy_statuses ?? [];

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
        <button
          className={`ue-button ${noCooldownEnabled ? "ue-button-primary" : ""}`}
          onClick={handleToggleNoCooldown}
          type="button"
        >
          {noCooldownEnabled ? "无 CD：开" : "无 CD：关"}
        </button>
        <button
          className={`ue-button ${showVfxRangeDebug ? "ue-button-primary" : ""}`}
          onClick={handleToggleVfxRangeDebug}
          type="button"
        >
          {showVfxRangeDebug ? "范围调试：开" : "范围调试：关"}
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
            <h3>Enemy Status</h3>
            {enemyStatuses.length > 0 ? (
              <div className="playtest-help-list">
                {enemyStatuses.map((enemy) => (
                  <span key={enemy.enemy_id}>
                    {enemy.enemy_name}:{" "}
                    {enemy.statuses
                      .map(
                        (status) =>
                          `${status.label} ${Math.max(0, status.remaining).toFixed(1)}s`,
                      )
                      .join(" / ")}
                  </span>
                ))}
              </div>
            ) : (
              <div className="playtest-help-list">
                <span>暂无敌人状态效果</span>
              </div>
            )}
          </section>

          <section className="playtest-status-block">
            <h3>Controls</h3>
            <div className="playtest-help-list">
              <span>Right Click: move hero</span>
              <span>Move mouse / Left Click: aim skill target</span>
              <span>Q / W / E / R: cast toward mouse position</span>
              <span>No CD: temporarily set skill cooldowns to 0</span>
              <span>范围调试：显示真实技能范围、敌人碰撞和 projectile 范围</span>
              <span>Reset: reset current arena spec</span>
            </div>
          </section>

          <section className="playtest-status-block">
            <h3>Runtime VFX</h3>
            <div className="playtest-help-list">
              {resolvedRuntimeVfx.spec ? (
                <span>Runtime VFX: texture + procedural enabled</span>
              ) : (
                <span>Runtime VFX: fallback geometry active</span>
              )}
              <span>Procedural instances: {snapshot.runtime_vfx_instance_count}</span>
              <span>Range debug: {snapshot.show_vfx_range_debug ? "on" : "off"}</span>
              {resolvedRuntimeVfx.error ? (
                <span>{resolvedRuntimeVfx.error}</span>
              ) : null}
              {snapshot.runtime_vfx_warnings.map((warning) => (
                <span key={warning}>贴图 fallback：{warning}</span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default PlaytestView;
