import type { Monitor, Sede, Room, CreateTurnBody } from "@/types";

const API_BASE = "/api";

const headers: HeadersInit = {
  "Content-Type": "application/json",
  "X-User-Role": "coordinador",
};

export async function getMonitors(): Promise<Monitor[]> {
  const res = await fetch(`${API_BASE}/monitors`, { headers });
  if (!res.ok) throw new Error(`Error al cargar monitores (${res.status})`);
  return res.json();
}

export async function getSedes(): Promise<Sede[]> {
  const res = await fetch(`${API_BASE}/sedes`, { headers });
  if (!res.ok) throw new Error(`Error al cargar sedes (${res.status})`);
  return res.json();
}

export async function getRooms(sedeId: string): Promise<Room[]> {
  const res = await fetch(`${API_BASE}/sedes/${sedeId}/rooms`, { headers });
  if (!res.ok) throw new Error(`Error al cargar salones (${res.status})`);
  return res.json();
}

export async function createTurn(body: CreateTurnBody): Promise<void> {
  const res = await fetch(`${API_BASE}/turns`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 201) return;

  // Intentar leer el cuerpo del error
  const data: { message?: string; detalle?: string; error?: string } =
    await res.json().catch(() => ({}));

  const msg =
    data.detalle ?? data.message ?? data.error ?? "Error desconocido";

  if (res.status === 409) {
    throw Object.assign(new Error(msg), { tipo: "conflicto" });
  }
  if (res.status === 422) {
    throw Object.assign(new Error(msg), { tipo: "validacion" });
  }
  if (res.status === 404) {
    throw Object.assign(new Error(msg), { tipo: "notFound" });
  }

  throw Object.assign(new Error(`Error inesperado (${res.status})`), {
    tipo: "general",
  });
}
