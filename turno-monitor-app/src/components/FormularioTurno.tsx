"use client";

import { useState, useEffect } from "react";
import type { Monitor, Sede, Room, ApiError } from "@/types";
import { getMonitors, getSedes, getRooms, createTurn } from "@/lib/api";
import styles from "./FormularioTurno.module.css";

interface CamposForm {
  monitor_id: string;
  sede_id: string;
  room_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

const estadoInicial: CamposForm = {
  monitor_id: "",
  sede_id: "",
  room_id: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
};

interface ExitoState {
  monitor: string;
  sala: string;
  sede: string;
  fecha: string;
  inicio: string;
  fin: string;
}

export default function FormularioTurno() {
  // ── Datos de la API ──────────────────────────────────────────────
  const [monitores, setMonitores] = useState<Monitor[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [salones, setSalones] = useState<Room[]>([]);

  // ── Estado de carga inicial ──────────────────────────────────────
  const [cargandoInit, setCargandoInit] = useState(true); // inicia en true para evitar setState síncrono en effect
  const [cargandoSalones, setCargandoSalones] = useState(false);
  const [errorInit, setErrorInit] = useState<string | null>(null);

  // ── Estado del formulario ────────────────────────────────────────
  const [campos, setCampos] = useState<CamposForm>(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<ExitoState | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // ── Carga inicial: monitores + sedes ─────────────────────────────
  useEffect(() => {
    let cancelado = false;
    // cargandoInit ya arranca en true; sólo necesitamos resetear errorInit de forma asíncrona
    Promise.resolve()
      .then(() => {
        if (!cancelado) setErrorInit(null);
        return Promise.all([getMonitors(), getSedes()]);
      })
      .then(([mons, sds]) => {
        if (cancelado) return;
        setMonitores(mons);
        setSedes(sds);
      })
      .catch((err: Error) => {
        if (cancelado) return;
        setErrorInit(err.message ?? "Error al cargar datos iniciales");
      })
      .finally(() => {
        if (!cancelado) setCargandoInit(false);
      });

    return () => {
      cancelado = true;
    };
  }, [])

  // ── Carga dinámica de salones al cambiar sede ─────────────────────
  useEffect(() => {
    let cancelado = false;

    // Si no hay sede, limpiamos salones de forma asíncrona para cumplir el linter
    const fetchRooms = async () => {
      if (!campos.sede_id) {
        if (!cancelado) setSalones([]);
        return;
      }
      if (!cancelado) setCargandoSalones(true);
      try {
        const rooms = await getRooms(campos.sede_id);
        if (!cancelado) setSalones(rooms);
      } catch {
        if (!cancelado) setSalones([]);
      } finally {
        if (!cancelado) setCargandoSalones(false);
      }
    };

    void fetchRooms();

    return () => {
      cancelado = true;
    };
  }, [campos.sede_id]);

  // ── Manejador de cambios ──────────────────────────────────────────
  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCampos((prev) => {
      // Al cambiar sede, reiniciar salón seleccionado
      if (name === "sede_id") {
        return { ...prev, sede_id: value, room_id: "" };
      }
      return { ...prev, [name]: value };
    });
    setExito(null);
    setError(null);
  };

  // ── Envío del formulario ─────────────────────────────────────────
  const manejarEnvio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    setExito(null);
    setError(null);

    const monitorSeleccionado = monitores.find((m) => m.id === campos.monitor_id);
    const salaSeleccionada = salones.find((r) => r.id === campos.room_id);
    const sedeSeleccionada = sedes.find((s) => s.id === campos.sede_id);

    try {
      await createTurn({
        monitor_id: campos.monitor_id,
        room_id: campos.room_id,
        fecha: campos.fecha,
        start_time: campos.hora_inicio,
        end_time: campos.hora_fin,
      });

      setExito({
        monitor: monitorSeleccionado?.nombre ?? campos.monitor_id,
        sala: salaSeleccionada?.nombre ?? campos.room_id,
        sede: sedeSeleccionada?.nombre ?? campos.sede_id,
        fecha: campos.fecha,
        inicio: campos.hora_inicio,
        fin: campos.hora_fin,
      });
      setCampos(estadoInicial);
    } catch (err) {
      const e = err as Error & { tipo?: string };
      const tipo = e.tipo ?? "general";
      setError({
        tipo: tipo as ApiError["tipo"],
        mensaje: e.message ?? "Error inesperado",
      });
    } finally {
      setEnviando(false);
    }
  };

  // ── Render: error de carga inicial ───────────────────────────────
  if (errorInit) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.errorInit} role="alert">
          <strong>No se pudo conectar con el servidor.</strong>
          <span>{errorInit}</span>
        </div>
      </div>
    );
  }

  // ── Render: loading inicial ───────────────────────────────────────
  if (cargandoInit) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.loading} aria-busy="true" aria-label="Cargando datos">
          <span className={styles.spinner} />
          <span>Cargando datos…</span>
        </div>
      </div>
    );
  }

  // ── Render: formulario ───────────────────────────────────────────
  return (
    <div className={styles.contenedor}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>Universidad de Caldas · TurnoMonitores</p>
          <h1 className={styles.titulo}>Asignar turno</h1>
        </div>

        <form onSubmit={manejarEnvio} className={styles.formulario} noValidate={false}>
          {/* Monitor */}
          <div className={styles.campo}>
            <label htmlFor="monitor_id" className={styles.etiqueta}>Monitor</label>
            <select
              id="monitor_id"
              name="monitor_id"
              value={campos.monitor_id}
              onChange={manejarCambio}
              required
              className={styles.input}
            >
              <option value="">Selecciona un monitor</option>
              {monitores.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Sede */}
          <div className={styles.campo}>
            <label htmlFor="sede_id" className={styles.etiqueta}>Sede</label>
            <select
              id="sede_id"
              name="sede_id"
              value={campos.sede_id}
              onChange={manejarCambio}
              required
              className={styles.input}
            >
              <option value="">Selecciona una sede</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Salón — filtrado por sede */}
          <div className={styles.campo}>
            <label htmlFor="room_id" className={styles.etiqueta}>Salón</label>
            <select
              id="room_id"
              name="room_id"
              value={campos.room_id}
              onChange={manejarCambio}
              required
              disabled={!campos.sede_id || cargandoSalones}
              className={styles.input}
            >
              <option value="">
                {cargandoSalones
                  ? "Cargando salones…"
                  : !campos.sede_id
                  ? "Selecciona primero una sede"
                  : "Selecciona un salón"}
              </option>
              {salones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div className={styles.campo}>
            <label htmlFor="fecha" className={styles.etiqueta}>Fecha</label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={campos.fecha}
              onChange={manejarCambio}
              required
              className={styles.input}
            />
          </div>

          {/* Hora inicio / fin */}
          <div className={styles.fila}>
            <div className={styles.campo}>
              <label htmlFor="hora_inicio" className={styles.etiqueta}>Hora inicio</label>
              <input
                type="time"
                id="hora_inicio"
                name="hora_inicio"
                value={campos.hora_inicio}
                onChange={manejarCambio}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.campo}>
              <label htmlFor="hora_fin" className={styles.etiqueta}>Hora fin</label>
              <input
                type="time"
                id="hora_fin"
                name="hora_fin"
                value={campos.hora_fin}
                onChange={manejarCambio}
                required
                className={styles.input}
              />
            </div>
          </div>

          {/* Mensaje éxito */}
          {exito && (
            <div className={styles.exito} role="status" aria-live="polite">
              <strong>Turno asignado correctamente.</strong>
              <span>
                {exito.monitor} · {exito.sede} · {exito.sala} · {exito.fecha} ·{" "}
                {exito.inicio}–{exito.fin}
              </span>
            </div>
          )}

          {/* Mensaje error */}
          {error && (
            <div className={styles.error} role="alert" aria-live="assertive">
              {error.mensaje}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={enviando}
            className={`${styles.boton} ${enviando ? styles.botonDeshabilitado : ""}`}
          >
            {enviando ? "Asignando…" : "Asignar turno"}
          </button>
        </form>
      </div>
    </div>
  );
}
