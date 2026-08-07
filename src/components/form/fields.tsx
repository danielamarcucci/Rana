"use client";

import { type ReactNode } from "react";
import type { Opcion } from "@/lib/catalogos";

export function FieldShell({
  label,
  help,
  error,
  required,
  children,
  rojo,
}: {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  rojo?: boolean;
}) {
  return (
    <div className={rojo ? "rounded-lg border border-alerta-200 bg-alerta-50/40 p-3" : ""}>
      <label className="field-label">
        {label}
        {required && <span className="text-alerta-600"> *</span>}
        {rojo && (
          <span className="badge bg-alerta-100 text-alerta-700 ml-2 align-middle">
            Solo Red
          </span>
        )}
      </label>
      {children}
      {help && <p className="field-help">{help}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
} & Record<string, unknown>) {
  return (
    <input
      className="input"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

export function TextAreaField({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      className="textarea"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder = "Seleccione…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opcion[];
  placeholder?: string;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function RadioGroupField({
  value,
  onChange,
  options,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opcion[];
  name: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label key={o.value} className="checkbox-row">
          <input
            type="radio"
            name={name}
            className="mt-0.5 accent-hoja-600"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span>
            <span className="block text-sm font-medium text-tierra-800">{o.label}</span>
            {o.help && <span className="block text-xs text-tierra-500">{o.help}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

export function CheckboxGroupField({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Opcion[];
}) {
  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label key={o.value} className="checkbox-row">
          <input
            type="checkbox"
            className="mt-0.5 accent-hoja-600"
            checked={value.includes(o.value)}
            onChange={() => toggle(o.value)}
          />
          <span>
            <span className="block text-sm font-medium text-tierra-800">{o.label}</span>
            {o.help && <span className="block text-xs text-tierra-500">{o.help}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
