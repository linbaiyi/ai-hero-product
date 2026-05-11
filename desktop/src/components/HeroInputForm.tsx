import { FormEvent, useState } from "react";
import type { HeroGenerateRequest } from "../types/project";

type HeroInputFormProps = {
  onSubmit: (data: HeroGenerateRequest) => void;
  isSubmitting?: boolean;
};

const gameTypes = ["MOBA", "ARPG", "卡牌", "回合制", "动作冒险"];
const heroRoles = ["法师", "战士", "刺客", "射手", "辅助", "坦克", "召唤师"];
const elementThemes = [
  "火焰",
  "冰霜",
  "雷电",
  "暗影",
  "圣光",
  "自然",
  "机械",
  "星辰",
];
const artStyles = [
  "暗黑奇幻",
  "东方玄幻",
  "二次元",
  "科幻机械",
  "国风水墨",
  "欧美魔幻",
];

type FormErrors = Partial<Record<keyof HeroGenerateRequest, string>>;

const initialFormData: HeroGenerateRequest = {
  game_type: "",
  hero_role: "",
  element_theme: "",
  art_style: "",
  core_gameplay: "",
  skill_count: 5,
  generate_images: true,
  generate_board: true,
};

function validateForm(data: HeroGenerateRequest) {
  const errors: FormErrors = {};

  if (!data.game_type) errors.game_type = "请选择游戏类型";
  if (!data.hero_role) errors.hero_role = "请选择英雄定位";
  if (!data.element_theme) errors.element_theme = "请选择元素主题";
  if (!data.art_style) errors.art_style = "请选择美术风格";
  if (!data.core_gameplay.trim()) errors.core_gameplay = "请填写核心玩法";
  if (data.skill_count < 3 || data.skill_count > 6) {
    errors.skill_count = "技能数量必须在 3 到 6 之间";
  }

  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm text-rose-300">{message}</p>;
}

function HeroInputForm({ onSubmit, isSubmitting = false }: HeroInputFormProps) {
  const [formData, setFormData] =
    useState<HeroGenerateRequest>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = <K extends keyof HeroGenerateRequest>(
    key: K,
    value: HeroGenerateRequest[K],
  ) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      ...formData,
      core_gameplay: formData.core_gameplay.trim(),
    });
  };

  return (
    <form
      className="rounded-2xl border border-slate-400/15 bg-slate-900/75 p-5 shadow-lg shadow-black/20 backdrop-blur-xl"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="mb-6">
        <div className="mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
        <h2 className="text-xl font-semibold text-slate-50">英雄需求输入区</h2>
      </div>

      <div className="space-y-5">
        <SelectField
          error={errors.game_type}
          label="游戏类型"
          onChange={(value) => updateField("game_type", value)}
          options={gameTypes}
          value={formData.game_type}
        />
        <SelectField
          error={errors.hero_role}
          label="英雄定位"
          onChange={(value) => updateField("hero_role", value)}
          options={heroRoles}
          value={formData.hero_role}
        />
        <SelectField
          error={errors.element_theme}
          label="元素主题"
          onChange={(value) => updateField("element_theme", value)}
          options={elementThemes}
          value={formData.element_theme}
        />
        <SelectField
          error={errors.art_style}
          label="美术风格"
          onChange={(value) => updateField("art_style", value)}
          options={artStyles}
          value={formData.art_style}
        />

        <label className="block">
          <span className="text-sm font-medium text-slate-300">核心玩法</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-500/25 bg-slate-950/45 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/15"
            onChange={(event) =>
              updateField("core_gameplay", event.target.value)
            }
            placeholder="范围爆发、持续灼烧、召唤火元素、适合团战压制"
            value={formData.core_gameplay}
          />
          <FieldError message={errors.core_gameplay} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">技能数量</span>
          <input
            className="mt-2 w-full rounded-xl border border-slate-500/25 bg-slate-950/45 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/15"
            max={6}
            min={3}
            onChange={(event) =>
              updateField("skill_count", Number(event.target.value))
            }
            type="number"
            value={formData.skill_count}
          />
          <FieldError message={errors.skill_count} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField
            checked={formData.generate_images}
            label="生成特效图"
            onChange={(checked) => updateField("generate_images", checked)}
          />
          <CheckboxField
            checked={formData.generate_board}
            label="生成设计板"
            onChange={(checked) => updateField("generate_board", checked)}
          />
        </div>
      </div>

      <button
        className="mt-7 w-full rounded-xl border border-sky-300/20 bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-950/25 transition hover:from-violet-400 hover:to-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "生成中..." : "生成英雄方案"}
      </button>
    </form>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  error?: string;
  onChange: (value: string) => void;
};

function SelectField({
  label,
  value,
  options,
  error,
  onChange,
}: SelectFieldProps) {
  const fieldId = `hero-input-${label}`;

  return (
    <div className="block">
      <label className="text-sm font-medium text-slate-300" htmlFor={fieldId}>
        {label}
      </label>
      <select
        className="mt-2 w-full rounded-xl border border-slate-500/25 bg-slate-950/45 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/15"
        id={fieldId}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">请选择</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-500/25 bg-slate-950/35 px-3 py-3 text-sm text-slate-200 transition hover:bg-slate-800/60">
      <input
        checked={checked}
        className="h-4 w-4 accent-violet-500"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

export default HeroInputForm;
