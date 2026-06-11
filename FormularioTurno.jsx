import { useState } from "react";

const SALONES = [
  { id: "salon-cisco", nombre: "Cisco" },
  { id: "salon-j", nombre: "Sala J" },
];

const MONITORES = [
  { id: "monitor-1", nombre: "Stiven Osorio" },
  { id: "monitor-2", nombre: "Jackeline Rivera" },
];

const estadoInicial = {
  salon_id: "",
  monitor_id: "",
  materia: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
};

export default function FormularioTurno({ apiBase = "" }) {
  const [campos, setCampos] = useState(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null);
  const [error, setError] = useState(null);

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setCampos((prev) => ({ ...prev, [name]: value }));
    setExito(null);
    setError(null);
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setExito(null);
    setError(null);

    const salon = SALONES.find((s) => s.id === campos.salon_id);
    const monitor = MONITORES.find((m) => m.id === campos.monitor_id);

    const body = {
      monitor_id: campos.monitor_id,
      room_id: campos.salon_id,
      materia: campos.materia,
      fecha: campos.fecha,
      start_time: campos.hora_inicio,
      end_time: campos.hora_fin,
    };

    try {
      const res = await fetch(`${apiBase}/turns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": "coordinador",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        setExito({
          salon: salon?.nombre ?? campos.salon_id,
          monitor: monitor?.nombre ?? campos.monitor_id,
          inicio: campos.hora_inicio,
          fin: campos.hora_fin,
          fecha: campos.fecha,
        });
        setCampos(estadoInicial);
        return;
      }

      if (res.status === 409) {
        setError({ tipo: "conflicto", mensaje: data.detalle ?? data.message ?? "Conflicto de horario." });
        return;
      }

      if (res.status === 400 || res.status === 422) {
        setError({ tipo: "validacion", mensaje: data.error ?? data.message ?? "Datos inválidos." });
        return;
      }

      if (res.status === 404) {
        setError({ tipo: "validacion", mensaje: data.message ?? "Recurso no encontrado." });
        return;
      }

      setError({ tipo: "general", mensaje: `Error inesperado (${res.status}).` });
    } catch {
      setError({ tipo: "general", mensaje: "No se pudo conectar con el servidor." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      <h2 style={estilos.titulo}>Asignar turno</h2>

      <form onSubmit={manejarEnvio} style={estilos.formulario}>
        <label style={estilos.etiqueta}>
          Salón
          <select
            name="salon_id"
            value={campos.salon_id}
            onChange={manejarCambio}
            required
            style={estilos.campo}
          >
            <option value="">Selecciona un salón</option>
            {SALONES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <label style={estilos.etiqueta}>
          Monitor
          <select
            name="monitor_id"
            value={campos.monitor_id}
            onChange={manejarCambio}
            required
            style={estilos.campo}
          >
            <option value="">Selecciona un monitor</option>
            {MONITORES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>

        <label style={estilos.etiqueta}>
          Materia
          <input
            type="text"
            name="materia"
            value={campos.materia}
            onChange={manejarCambio}
            placeholder="Ej: Cálculo diferencial"
            required
            style={estilos.campo}
          />
        </label>

        <label style={estilos.etiqueta}>
          Fecha
          <input
            type="date"
            name="fecha"
            value={campos.fecha}
            onChange={manejarCambio}
            required
            style={estilos.campo}
          />
        </label>

        <div style={estilos.fila}>
          <label style={{ ...estilos.etiqueta, flex: 1 }}>
            Hora inicio
            <input
              type="time"
              name="hora_inicio"
              value={campos.hora_inicio}
              onChange={manejarCambio}
              required
              style={estilos.campo}
            />
          </label>

          <label style={{ ...estilos.etiqueta, flex: 1 }}>
            Hora fin
            <input
              type="time"
              name="hora_fin"
              value={campos.hora_fin}
              onChange={manejarCambio}
              required
              style={estilos.campo}
            />
          </label>
        </div>

        {exito && (
          <div style={estilos.exito}>
            <strong>Turno asignado correctamente.</strong>
            <span>
              {exito.monitor} · {exito.salon} · {exito.fecha} · {exito.inicio}–{exito.fin}
            </span>
          </div>
        )}

        {error && (
          <div style={estilos.error}>
            {error.mensaje}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          style={enviando ? { ...estilos.boton, ...estilos.botonDeshabilitado } : estilos.boton}
        >
          {enviando ? "Asignando…" : "Asignar turno"}
        </button>
      </form>
    </div>
  );
}

const estilos = {
  contenedor: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "2rem",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  titulo: {
    fontSize: "1.25rem",
    fontWeight: 600,
    marginBottom: "1.5rem",
    color: "#111",
  },
  formulario: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  etiqueta: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#374151",
  },
  campo: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.375rem",
    fontSize: "0.95rem",
    color: "#111",
    background: "#fff",
    outline: "none",
  },
  fila: {
    display: "flex",
    gap: "1rem",
  },
  boton: {
    marginTop: "0.5rem",
    padding: "0.625rem 1.25rem",
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: "0.375rem",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  botonDeshabilitado: {
    background: "#93c5fd",
    cursor: "not-allowed",
  },
  exito: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    padding: "0.75rem 1rem",
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "0.375rem",
    color: "#166534",
    fontSize: "0.875rem",
  },
  error: {
    padding: "0.75rem 1rem",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "0.375rem",
    color: "#991b1b",
    fontSize: "0.875rem",
  },
};
