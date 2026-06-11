import { Sede } from '../domain/entities/sede.entity';
import { Room } from '../domain/entities/room.entity';

export const SEDES_MOCK: Sede[] = [
  { id: 'sede-lans-001',    nombre: 'Sede Lans',          open_time: '07:00', close_time: '15:00' },
  { id: 'sede-orlando-001', nombre: 'Sede Orlando Sierra', open_time: '07:00', close_time: '18:00' },
];

export const ROOMS_MOCK: Room[] = [
  // ── Sede Lans ─────────────────────────────────────────────────────────────
  { id: 'room-lans-01', sede_id: 'sede-lans-001', nombre: 'Sala 1', has_mac: false },
  { id: 'room-lans-02', sede_id: 'sede-lans-001', nombre: 'Sala 2', has_mac: false },
  { id: 'room-lans-03', sede_id: 'sede-lans-001', nombre: 'Sala 3', has_mac: true  },
  { id: 'room-lans-04', sede_id: 'sede-lans-001', nombre: 'Sala 4', has_mac: false },
  { id: 'room-lans-05', sede_id: 'sede-lans-001', nombre: 'Sala 5', has_mac: false },
  { id: 'room-lans-06', sede_id: 'sede-lans-001', nombre: 'Sala 6', has_mac: true  },
  { id: 'room-lans-07', sede_id: 'sede-lans-001', nombre: 'Sala 7', has_mac: false },
  { id: 'room-lans-08', sede_id: 'sede-lans-001', nombre: 'Sala 8', has_mac: false },
  // ── Sede Orlando Sierra ───────────────────────────────────────────────────
  { id: 'room-orl-01', sede_id: 'sede-orlando-001', nombre: 'Sala A', has_mac: false },
  { id: 'room-orl-02', sede_id: 'sede-orlando-001', nombre: 'Sala B', has_mac: false },
  { id: 'room-orl-03', sede_id: 'sede-orlando-001', nombre: 'Sala C', has_mac: true  },
  { id: 'room-orl-04', sede_id: 'sede-orlando-001', nombre: 'Sala D', has_mac: false },
  { id: 'room-orl-05', sede_id: 'sede-orlando-001', nombre: 'Sala E', has_mac: false },
  { id: 'room-orl-06', sede_id: 'sede-orlando-001', nombre: 'Sala F', has_mac: true  },
  { id: 'room-orl-07', sede_id: 'sede-orlando-001', nombre: 'Sala G', has_mac: false },
  { id: 'room-orl-08', sede_id: 'sede-orlando-001', nombre: 'Sala H', has_mac: false },
];
