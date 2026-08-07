"use client";

import colombia from "@/data/colombia.json";

type Depto = { departamento: string; municipios: string[] };
const DATA = colombia as Depto[];

export function SelectDepartamento({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Seleccione el departamento…</option>
      {DATA.map((d) => (
        <option key={d.departamento} value={d.departamento}>
          {d.departamento}
        </option>
      ))}
    </select>
  );
}

export function SelectMunicipio({
  departamento,
  value,
  onChange,
}: {
  departamento: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const depto = DATA.find((d) => d.departamento === departamento);
  return (
    <select
      className="select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!depto}
    >
      <option value="">
        {depto ? "Seleccione el municipio…" : "Primero seleccione el departamento"}
      </option>
      {depto?.municipios.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
