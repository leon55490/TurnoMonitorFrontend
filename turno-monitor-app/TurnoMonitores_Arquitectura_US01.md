# TurnoMonitores — Documento de Arquitectura · US-01
**Universidad de Caldas** · Arquitecto de sistema · v1.0

---

## 1. Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENTE                                                            │
│                                                                     │
│  ┌──────────────────────────────────────────┐                       │
│  │  Next.js + Vite  (localhost:3000)        │                       │
│  │                                          │                       │
│  │  /formulario-turno                       │                       │
│  │  ┌──────────────────────────────────┐    │                       │
│  │  │ FormularioTurno (React component)│    │                       │
│  │  │  - Monitor (select)              │    │                       │
│  │  │  - Sede (select)                 │    │                       │
│  │  │  - Salón (select filtrado)       │    │                       │
│  │  │  - Fecha (date picker)           │    │                       │
│  │  │  - Hora inicio / fin (time)      │    │                       │
│  │  │  - Botón Guardar (deshabilitar   │    │                       │
│  │  │    mientras petición en curso)   │    │                       │
│  │  └──────────┬───────────────────────┘    │                       │
│  └─────────────┼────────────────────────────┘                       │
│                │  POST /turns  (JSON)                               │
│                │  HTTP 201 → mensaje de éxito                       │
│                │  HTTP 409/422/404 → mensaje de error               │
└────────────────┼────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API  (NestJS · Arquitectura Hexagonal · localhost:3000/api)        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Capa de Infraestructura (HTTP)                             │    │
│  │  TurnsController  →  POST /turns                            │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  Capa de Aplicación                                         │    │
│  │  CreateTurnUseCase                                          │    │
│  │   1. Validar monitor existe          (MonitorRepository)    │    │
│  │   2. Validar horario dentro de sede  (SedeRepository)       │    │
│  │   3. Validar solapamiento de monitor (TurnRepository)       │    │
│  │   4. Validar capacidad del salón     (TurnRepository)       │    │
│  │   5. Persistir turno                 (TurnRepository)       │    │
│  │   6. Disparar webhook (fire & forget)(WebhookPort)          │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  Capa de Dominio                                            │    │
│  │  Turn  |  Monitor  |  Room  |  Sede                        │    │
│  │  (entidades + reglas de negocio puras)                      │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  Capa de Infraestructura (persistencia)                     │    │
│  │  InMemoryTurnRepository   InMemoryMonitorRepository         │    │
│  │  InMemoryRoomRepository   InMemorySedeRepository            │    │
│  │  HttpWebhookAdapter  ──────────────────────────────────┐    │    │
│  └────────────────────────────────────────────────────────┼───┘    │
│                                                           │         │
└───────────────────────────────────────────────────────────┼─────────┘
                                                            │ POST webhook
                                                            │ (fire & forget)
                                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  COMPONENTE EXTERNO                                                 │
│                                                                     │
│  n8n  (localhost:5678)                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Nodo Webhook  →  Nodo Send Email (SMTP @ucaldas.edu.co)    │   │
│  │  Trigger: POST /webhook/turno-creado                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  BASE DE DATOS                                                      │
│                                                                     │
│  PostgreSQL  (diseño de esquema definitivo)                         │
│  Taller: reemplazado por mocks en memoria (arreglos en proceso)     │
└─────────────────────────────────────────────────────────────────────┘
```

> **Nota de despliegue:** En producción, el frontend se despliega en Vercel, el backend en Fly.io y PostgreSQL como servicio gestionado (Fly Postgres o Supabase). n8n corre en Fly.io o en Railway con plan gratuito.

---

## 2. Schema SQL — PostgreSQL

> Las tablas mínimas para que US-01 funcione. El taller usa mocks en memoria que replican exactamente esta estructura de datos.

```sql
-- ─────────────────────────────────────────────────────────────────
-- SEDES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE sedes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       VARCHAR(100) NOT NULL UNIQUE,
    -- Horario de operación almacenado como TIME
    open_time    TIME        NOT NULL,
    close_time   TIME        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed inicial del taller
INSERT INTO sedes (nombre, open_time, close_time) VALUES
    ('Sede Lans',          '07:00', '15:00'),
    ('Sede Orlando Sierra', '07:00', '18:00');


-- ─────────────────────────────────────────────────────────────────
-- SALONES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE rooms (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sede_id      UUID        NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    nombre       VARCHAR(50) NOT NULL,
    -- Indica si el salón tiene equipos Mac (restricción de acceso)
    has_mac      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Un nombre de salón es único dentro de la misma sede
    CONSTRAINT uq_room_sede UNIQUE (sede_id, nombre)
);


-- ─────────────────────────────────────────────────────────────────
-- USUARIOS  (perfil simplificado — sin JWT en esta fase)
-- ─────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('administrador', 'coordinador', 'monitor', 'estudiante');

CREATE TABLE users (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       VARCHAR(150) NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,   -- dominio @ucaldas.edu.co
    password     VARCHAR(255) NOT NULL,           -- bcrypt hash
    role         user_role   NOT NULL,
    activo       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- MONITORES  (extiende users con datos específicos del rol)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE monitors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    codigo       VARCHAR(20) NOT NULL UNIQUE,   -- código estudiantil
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────
-- TURNOS  (entidad central de US-01)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE turns (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id   UUID        NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    room_id      UUID        NOT NULL REFERENCES rooms(id)    ON DELETE CASCADE,
    fecha        DATE        NOT NULL,
    start_time   TIME        NOT NULL,
    end_time     TIME        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Un mismo monitor no puede tener turnos solapados en la misma fecha.
    -- La validación de solapamiento se hace en el UseCase, no con un constraint
    -- simple, porque el solapamiento depende de rangos horarios.
    CONSTRAINT chk_turn_times CHECK (end_time > start_time)
);

-- Índice para acelerar las consultas de solapamiento en US-01
CREATE INDEX idx_turns_monitor_fecha ON turns (monitor_id, fecha);
-- Índice para la validación de capacidad máxima por salón
CREATE INDEX idx_turns_room_fecha    ON turns (room_id, fecha);
```

### Cardinalidades clave

| Relación | Tipo |
|---|---|
| `sedes` → `rooms` | 1 : N |
| `users` → `monitors` | 1 : 1 |
| `monitors` → `turns` | 1 : N |
| `rooms` → `turns` | 1 : N |
| `rooms` ←→ `turns` (simultáneos) | Máx. 2 monitores — validado en UseCase |

---

## 3. Endpoints necesarios para US-01

| Método | Ruta | Body de entrada | Respuesta exitosa | Errores |
|--------|------|-----------------|-------------------|---------|
| `GET` | `/monitors` | — | `200` Lista de monitores `[{id, nombre, email}]` | — |
| `GET` | `/sedes` | — | `200` Lista de sedes `[{id, nombre, open_time, close_time}]` | — |
| `GET` | `/sedes/:sedeId/rooms` | — | `200` Salones filtrados por sede `[{id, nombre, has_mac}]` | `404` sede no encontrada |
| `POST` | `/turns` | Ver body abajo | `201` Turno creado + dispara webhook | Ver tabla de errores |
| `POST` | `/auth/login` | `{email, password}` | `200` `{userId, role, nombre}` | `401` credenciales inválidas |

### Body `POST /turns`

```json
{
  "monitor_id": "uuid",
  "room_id":    "uuid",
  "fecha":      "2025-06-10",
  "start_time": "09:00",
  "end_time":   "11:00"
}
```

### Tabla de errores `POST /turns`

| Código HTTP | Mensaje | Causa |
|---|---|---|
| `404` | `"El monitor no está registrado en el sistema"` | `monitor_id` no existe |
| `404` | `"El salón no está registrado en el sistema"` | `room_id` no existe |
| `409` | `"El monitor ya tiene un turno asignado en ese horario"` | Solapamiento de horario |
| `409` | `"El salón ha alcanzado su capacidad máxima de monitores"` | ≥ 2 monitores simultáneos |
| `422` | `"El horario del turno excede el cierre de la sede (HH:MM)"` | `start_time` o `end_time` fuera del horario de la sede |
| `422` | `"La fecha del turno no puede ser pasada"` | `fecha` < hoy |

> **Orden de validación en el UseCase** (importante para mensajes de error coherentes):
> 1. Existe monitor → 2. Existe room → 3. Horario dentro de la sede → 4. Solapamiento del monitor → 5. Capacidad del salón → 6. Persistir → 7. Disparar webhook.

---

## 4. Contrato del webhook para n8n

El backend llama al webhook de n8n **después** de persistir el turno exitosamente (respuesta `201` ya preparada). La llamada es **fire & forget**: si n8n no responde, el turno ya fue creado y el fallo se registra solo en el log del servidor.

### Definición

| Atributo | Valor |
|---|---|
| **Método** | `POST` |
| **URL (local)** | `http://localhost:5678/webhook/turno-creado` |
| **URL (producción)** | `https://<instancia-n8n>.fly.dev/webhook/turno-creado` |
| **Content-Type** | `application/json` |
| **Autenticación** | Ninguna en esta fase (la URL es el secreto) |
| **Timeout del backend** | 3 segundos (no bloquea la respuesta HTTP 201) |

### Payload JSON exacto

```json
{
  "monitor_email": "juan.perez@ucaldas.edu.co",
  "monitor_name":  "Juan Pérez",
  "sede":          "Sede Lans",
  "room":          "Sala 3",
  "fecha":         "2025-06-10",
  "start_time":    "09:00",
  "end_time":      "11:00"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `monitor_email` | `string` | Correo institucional del monitor — destino del email en n8n |
| `monitor_name` | `string` | Nombre completo — para el saludo en el cuerpo del correo |
| `sede` | `string` | Nombre de la sede — campo visible en el correo |
| `room` | `string` | Nombre del salón — campo visible en el correo |
| `fecha` | `string` (ISO 8601) | Fecha del turno en formato `YYYY-MM-DD` |
| `start_time` | `string` | Hora de inicio en formato `HH:MM` (24h) |
| `end_time` | `string` | Hora de fin en formato `HH:MM` (24h) |

### Ejemplo de cuerpo de correo que debe armar n8n

```
Asunto: TurnoMonitores · Turno asignado

Hola, Juan Pérez.

Se te ha asignado un nuevo turno de monitoría:

  Sede:    Sede Lans
  Salón:   Sala 3
  Fecha:   10 de junio de 2025
  Horario: 09:00 – 11:00

Por favor confirma tu asistencia presentándote puntualmente.

Sistema TurnoMonitores · Universidad de Caldas
```

---

## 5. La decisión de diseño más crítica

> **¿Cómo identifica el sistema "quién está creando el turno" sin JWT en esta fase?**

El documento del PO establece que **solo el Coordinador de Sede puede crear, modificar o eliminar turnos**, pero también dice que no se implementará autenticación compleja con JWT en esta versión.

El equipo debe decidir **antes de escribir una sola línea de código** cuál de estas tres opciones adopta:

| Opción | Descripción | Ventaja | Riesgo |
|---|---|---|---|
| **A. Sin control de rol** | El endpoint `POST /turns` es público; cualquiera que lo llame puede crear turnos | Cero complejidad extra; entregable del taller en tiempo | Rompe la regla de negocio de restricción de asignación; cualquier estudiante o monitor podría crear turnos |
| **B. Role header manual** | El frontend envía un header `X-User-Role: coordinador` que el backend valida sin firma | Simula el control de roles sin JWT; implementable en 15 minutos | No es seguro (cualquiera puede falsificarlo), pero es suficiente para un taller académico |
| **C. Auth básica in-memory** | `POST /auth/login` retorna `{userId, role}` sin token; el frontend lo guarda en `localStorage` y lo envía en cada petición | Más fiel a la arquitectura real; demuestra separación de roles | Agrega ~30 minutos de implementación; riesgo de no terminar el entregable a tiempo |

**Recomendación del arquitecto:** adoptar la **Opción B** para el taller (header no firmado) y documentar que en producción se reemplaza por un guard JWT en el `TurnsController`. Esto mantiene la regla de negocio visible en el código sin bloquear el tiempo del equipo.

> Responder esta pregunta en equipo y registrar la decisión en el ADR del repositorio antes de arrancar el sprint.
