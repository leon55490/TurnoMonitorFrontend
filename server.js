import express from 'express';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const monitores = [
  { id: 'm-1', nombre: 'Cristian Camilo Osorio', email: 'cristian.1701421857@ucaldas.edu.co' },
  { id: 'm-2', nombre: 'Stiven Osorio',          email: 'johan.1701922249@ucaldas.edu.co'    },
];

const salones = [
  { id: 's-1', nombre: 'Sala E', sede: 'Sede Lans'           },
  { id: 's-2', nombre: 'Sala C', sede: 'Sede Orlando Sierra' },
];

const turnos = [];

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const solapan = (aIni, aFin, bIni, bFin) =>
  toMin(aIni) < toMin(bFin) && toMin(aFin) > toMin(bIni);

const fireWebhook = (payload) => {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    console.warn('[webhook] N8N_WEBHOOK_URL no configurada — notificación omitida');
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: ctrl.signal,
  })
    .then(() => { clearTimeout(timer); console.log(`[webhook] OK → ${payload.monitor_email}`); })
    .catch((e) => { clearTimeout(timer); console.error(`[webhook] ERROR: ${e.message}`); });
};

app.get('/monitores', async (_req, res) => {
  res.json(monitores);
});

app.get('/salones', async (_req, res) => {
  res.json(salones);
});

app.post('/turns', async (req, res) => {
  const { room_id, monitor_id, materia, fecha, start_time, end_time } = req.body;

  if (!room_id || !monitor_id || !materia || !fecha || !start_time || !end_time) {
    return res.status(400).json({
      error: 'Campos requeridos incompletos',
      detalle: 'room_id, monitor_id, materia, fecha, start_time, end_time son obligatorios',
    });
  }

  const salon = salones.find((s) => s.id === room_id);
  if (!salon) {
    return res.status(404).json({ error: 'Salón no encontrado', detalle: room_id });
  }

  const monitor = monitores.find((m) => m.id === monitor_id);
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor no encontrado', detalle: monitor_id });
  }

  const conflictoSalon = turnos.find(
    (t) =>
      t.room_id === room_id &&
      t.fecha === fecha &&
      solapan(start_time, end_time, t.start_time, t.end_time),
  );
  if (conflictoSalon) {
    return res.status(409).json({
      error: 'El salón ya tiene un turno en ese horario',
      detalle: `${salon.nombre} — ${conflictoSalon.start_time} a ${conflictoSalon.end_time}`,
    });
  }

  const conflictoMonitor = turnos.find(
    (t) =>
      t.monitor_id === monitor_id &&
      t.fecha === fecha &&
      solapan(start_time, end_time, t.start_time, t.end_time),
  );
  if (conflictoMonitor) {
    return res.status(409).json({
      error: 'El monitor ya tiene un turno asignado en ese horario',
      detalle: `${monitor.nombre} — ${conflictoMonitor.start_time} a ${conflictoMonitor.end_time}`,
    });
  }

  const turno = {
    id: randomUUID(),
    room_id,
    monitor_id,
    materia,
    fecha,
    start_time,
    end_time,
    created_at: new Date().toISOString(),
  };
  turnos.push(turno);

  fireWebhook({
    monitor_email: monitor.email,
    monitor_name:  monitor.nombre,
    sede:          salon.sede,
    room:          salon.nombre,
    fecha,
    start_time,
    end_time,
  });

  return res.status(201).json(turno);
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`TurnoMonitores corriendo en http://localhost:${PORT}`));