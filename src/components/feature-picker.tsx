"use client";

import { useState } from "react";
import { featurePresets, sellableFeatures, type FeatureKey } from "@/lib/features";

type FeaturePickerProps = {
  // Módulos já marcados ao abrir (plano atual da empresa, ou o padrão de um token novo).
  defaultSelected: FeatureKey[];
  // "card" mostra a descrição de cada módulo (formulário de token);
  // "compact" só o nome, para caber na edição de uma empresa.
  variant?: "card" | "compact";
};

export function FeaturePicker({ defaultSelected, variant = "card" }: FeaturePickerProps) {
  const [selected, setSelected] = useState<FeatureKey[]>(defaultSelected);

  const toggle = (key: FeatureKey) => {
    setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  };

  const sameAsPreset = (features: FeatureKey[]) =>
    features.length === selected.length && features.every((key) => selected.includes(key));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {featurePresets.map((preset) => {
          const active = sameAsPreset(preset.features);
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => setSelected([...preset.features])}
              title={preset.who}
              aria-pressed={active}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-surface text-body hover:border-line-strong hover:bg-canvas"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSelected([])}
          className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-soft transition hover:border-line-strong hover:text-body"
        >
          Limpar
        </button>
      </div>

      <div className={variant === "compact" ? "grid gap-1.5 sm:grid-cols-2" : "grid gap-1.5"}>
        {sellableFeatures.map((feature) => {
          const checked = selected.includes(feature.key);
          return (
            <label
              key={feature.key}
              className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2 transition ${
                variant === "compact" ? "items-center text-sm" : "items-start"
              } ${checked ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-line-strong"}`}
            >
              <input
                type="checkbox"
                name="features"
                value={feature.key}
                checked={checked}
                onChange={() => toggle(feature.key)}
                className={`size-4 accent-primary ${variant === "card" ? "mt-0.5" : ""}`}
              />
              {variant === "compact" ? (
                feature.label
              ) : (
                <span>
                  <span className="block text-sm font-medium text-fg">{feature.label}</span>
                  <span className="block text-xs text-muted">{feature.description}</span>
                </span>
              )}
            </label>
          );
        })}
      </div>

      <p className="text-xs text-soft">
        {selected.length === 0
          ? "Nenhum módulo pago: o cliente fica só com o núcleo (pedidos, clientes, produtos, configurações)."
          : `${selected.length} de ${sellableFeatures.length} módulos pagos.`}
      </p>
    </div>
  );
}
