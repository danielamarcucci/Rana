"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FieldShell, RadioGroupField } from "@/components/form/fields";
import { MEDIO_MANUAL } from "@/lib/catalogos";

export default function NuevoCasoPage() {
  const router = useRouter();
  const [medioManual, setMedioManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear() {
    if (!medioManual) {
      setError("Indique por qué medio se recibió la información.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medioManual, draft: true, data: {} }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No se pudo crear el caso.");
        return;
      }
      router.push(`/admin/casos/${encodeURIComponent(json.radicado)}`);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link href="/admin" className="text-sm text-hoja-700 hover:underline">← Volver a la matriz</Link>
      <div className="card space-y-4">
        <h1 className="text-xl font-extrabold text-hoja-800">Registrar un caso manualmente</h1>
        <p className="text-sm text-tierra-600">
          Use esta opción cuando la información fue recibida por un medio distinto al
          formulario público (llamada, mensaje, correo electrónico o conversación
          presencial). Se creará el caso con un número de radicado único y podrá
          diligenciar todas las casillas del formulario, incluyendo las que normalmente
          completa la persona afectada.
        </p>
        {error && <p className="field-error">{error}</p>}
        <FieldShell label="¿Por qué medio se recibió la información?" required>
          <RadioGroupField name="medioManual" value={medioManual} onChange={setMedioManual} options={MEDIO_MANUAL} />
        </FieldShell>
        <button onClick={crear} disabled={cargando} className="btn-primary w-full">
          {cargando ? "Creando…" : "Crear caso y continuar"}
        </button>
      </div>
    </div>
  );
}
