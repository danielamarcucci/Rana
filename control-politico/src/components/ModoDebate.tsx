"use client";

import { useEffect, useState } from "react";

type Seccion = { id: number; titulo: string; contenido: string; minutos: number };
type Repregunta = { id: number; texto: string; para: string; evaluacion: string };
type Prueba = { id: number; titulo: string; hallazgo: string; verificada: boolean };

function mmss(seg: number) {
  const s = Math.abs(seg);
  return `${seg < 0 ? "-" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Vista para usar en el recinto: cronómetro por sección, texto del guion en
// letra grande y, al lado, repreguntas y pruebas para tener a mano.
export default function ModoDebate({ secciones, repreguntas, pruebas }: { secciones: Seccion[]; repreguntas: Repregunta[]; pruebas: Prueba[] }) {
  const [actual, setActual] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [usados, setUsados] = useState<number[]>(() => secciones.map(() => 0));
  const [hechas, setHechas] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => setUsados((u) => u.map((v, i) => (i === actual ? v + 1 : v))), 1000);
    return () => clearInterval(t);
  }, [corriendo, actual]);

  if (secciones.length === 0) {
    return <p className="tarjeta text-sm text-neutral-500">Agregue secciones en la pestaña Guion para usar el modo debate.</p>;
  }

  const s = secciones[actual];
  const restante = s.minutos * 60 - usados[actual];
  const totalPrevisto = secciones.reduce((a, x) => a + x.minutos * 60, 0);
  const totalUsado = usados.reduce((a, x) => a + x, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="tarjeta">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className={`font-mono text-5xl font-bold tabular-nums ${restante < 0 ? "text-red-600" : restante <= 30 ? "text-amber-600" : "text-neutral-900"}`}>
              {mmss(restante)}
            </span>
            <span className="text-sm text-neutral-500">
              Total {mmss(totalUsado)} / {mmss(totalPrevisto)}
            </span>
          </div>
          <div className="flex gap-2">
            <button className="btn-primario min-w-24" onClick={() => setCorriendo((c) => !c)}>
              {corriendo ? "Pausar" : "Iniciar"}
            </button>
            <button className="btn-secundario" onClick={() => setUsados((u) => u.map((v, i) => (i === actual ? 0 : v)))}>
              Reiniciar sección
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {secciones.map((x, i) => (
            <button
              key={x.id}
              onClick={() => setActual(i)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                i === actual ? "bg-marca-700 text-white" : usados[i] > 0 ? "bg-marca-100 text-marca-800" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {i + 1}. {x.titulo}
            </button>
          ))}
        </div>

        <h2 className="text-2xl font-bold">{s.titulo}</h2>
        <p className="mb-6 text-sm text-neutral-500">{s.minutos} min previstos</p>
        <div className="whitespace-pre-line text-xl leading-relaxed text-neutral-900">{s.contenido || "—"}</div>

        <div className="mt-8 flex justify-between">
          <button className="btn-secundario" disabled={actual === 0} onClick={() => setActual((a) => a - 1)}>
            ‹ Anterior
          </button>
          <button className="btn-primario" disabled={actual === secciones.length - 1} onClick={() => setActual((a) => a + 1)}>
            Siguiente ›
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="tarjeta">
          <h3 className="mb-2 font-semibold">Repreguntas</h3>
          {repreguntas.length === 0 && <p className="text-sm text-neutral-500">Prepárelas en la pestaña Respuestas.</p>}
          <ul className="space-y-2">
            {repreguntas.map((r) => (
              <li key={r.id}>
                <label className={`flex cursor-pointer gap-2 text-sm ${hechas.has(r.id) ? "text-neutral-400 line-through" : ""}`}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={hechas.has(r.id)}
                    onChange={() =>
                      setHechas((h) => {
                        const n = new Set(h);
                        if (n.has(r.id)) n.delete(r.id);
                        else n.add(r.id);
                        return n;
                      })
                    }
                  />
                  <span>
                    {r.para && <b className="block text-xs uppercase text-neutral-500">{r.para}</b>}
                    {r.texto}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section className="tarjeta">
          <h3 className="mb-2 font-semibold">Pruebas a citar</h3>
          {pruebas.length === 0 && <p className="text-sm text-neutral-500">Registre hallazgos en la pestaña Pruebas.</p>}
          <ul className="space-y-2 text-sm">
            {pruebas.map((p) => (
              <li key={p.id}>
                <b>{p.titulo}</b>
                {!p.verificada && <span className="ml-1 text-xs text-amber-700">(por verificar)</span>}
                <p className="text-neutral-600">{p.hallazgo}</p>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
