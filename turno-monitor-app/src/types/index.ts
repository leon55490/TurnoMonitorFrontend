// Entidades del dominio TurnoMonitores

export interface Monitor {
  id: string;
  nombre: string;
  email: string;
}

export interface Sede {
  id: string;
  nombre: string;
  open_time: string;
  close_time: string;
}

export interface Room {
  id: string;
  nombre: string;
  has_mac: boolean;
}

export interface CreateTurnBody {
  monitor_id: string;
  room_id: string;
  fecha: string;
  start_time: string;
  end_time: string;
}

export interface TurnCreatedSuccess {
  monitor: string;
  sala: string;
  sede: string;
  fecha: string;
  inicio: string;
  fin: string;
}

export type ApiError =
  | { tipo: "conflicto"; mensaje: string }
  | { tipo: "validacion"; mensaje: string }
  | { tipo: "notFound"; mensaje: string }
  | { tipo: "red"; mensaje: string }
  | { tipo: "general"; mensaje: string };
