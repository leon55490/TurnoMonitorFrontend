He consolidado el documento en formato Markdown:

# TurnoMonitores — Documento de Arquitectura · US-01

## 1. Diagrama de arquitectura en texto

```text
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENTE                                                            │
│                                                                     │
│  ┌──────────────────────────────────────────┐                       │
│  │  Next.js + Vite                           │                      │
│  │                                          │                       │
│  │  /formulario-turno                       │                       │
│  │  ┌──────────────────────────────────┐    │                       │
│  │  │ FormularioTurno                  │    │                       │
│  │  │  - Monitor (select)              │    │                       │
│  │  │  - Sede (select)                 │    │                       │
│  │  │  - Salón (select filtrado)       │    │                       │
│  │  │  - Fecha                         │    │                       │
│  │  │  - Hora inicio / fin             │    │                       │
│  │  │  - Botón Guardar                 │    │                       │
│  │  └──────────┬───────────────────────┘    │                       │
│  └─────────────┼────────────────────────────┘                       │
│                │                                                    │
│                │ POST /turns                                        │
│                ▼                                                    │
└────────────────┼────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ API (NestJS · Arquitectura Hexagonal)                               │
│                                                                     │
│  TurnsController → POST /turns                                      │
│                                                                     │
│  CreateTurnUseCase                                                  │
│   1. Validar monitor existe                                         │
│   2. Validar horario dentro de sede                                 │
│   3. Validar solapamiento de monitor                                │
│   4. Validar capacidad del salón                                    │
│   5. Persistir turno                                                │
│   6. Disparar webhook (fire & forget)                               │
│                                                                     │
│  Dominio                                                            │
│   Turn | Monitor | Room | Sede                                      │
│                                                                     │
│  Persistencia                                                       │
│   InMemoryTurnRepository                                             │
│   InMemoryMonitorRepository                                          │
│   InMemoryRoomRepository                                             │
│   InMemorySedeRepository                                             │
│                                                                     │
│   HttpWebhookAdapter ───────────────────────────────┐               │
└────────────────────────────────────────────────────┼───────────────┘
                                                     │
                                                     │ POST webhook
                                                     │ fire & forget
                                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ n8n                                                                 │
│                                                                     │
│  Webhook → Send Email                                                │
│                                                                     │
│  POST /webhook/turno-creado                                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PostgreSQL                                                          │
│                                                                     │
│ Producción: Base de datos real                                      │
│ Taller: Mocks en memoria                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Decisiones técnicas del equipo

### Conflicto de horario

La creación de un turno debe validar que el monitor no tenga otro turno asignado en el mismo rango horario para la misma fecha.

Si existe solapamiento:

```http
409 Conflict
"El monitor ya tiene un turno asignado en ese horario"
```

### Identificación de monitor o coordinador sin autenticación completa

Existen manejo de roles en la autenticación simplificada del taller.

### Autenticación

Se adopta la Opción B para el taller.

El frontend envía:

```http
X-User-Role: coordinador
```

El backend valida el header sin firma.

En producción este mecanismo será reemplazado por un Guard JWT en el `TurnsController`.

Esto permite mantener visible la regla de negocio sin bloquear el tiempo disponible del taller.

### Persistencia

```text
Capa de Infraestructura (persistencia)

InMemoryTurnRepository
InMemoryMonitorRepository
InMemoryRoomRepository
InMemorySedeRepository

HttpWebhookAdapter
```

Toda la persistencia del taller se realiza mediante mocks en memoria.

### Webhook

La creación exitosa de un turno:

```http
POST /turns
```

retorna:

```http
201 Created
```

y posteriormente dispara el webhook.

El backend llama al webhook de n8n después de persistir el turno exitosamente.

La llamada es:

```text
fire & forget
```

Si n8n falla:

* El turno NO se revierte.
* El error se registra únicamente en logs.

---

## 3. Schema SQL completo (Producción)

> Este esquema corresponde a producción.
>
> Durante el taller NO se utilizará PostgreSQL.
>
> Se utilizarán repositorios InMemory que replican esta estructura.

```sql
CREATE TABLE sedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    has_mac BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_sede UNIQUE (sede_id, nombre)
);

CREATE TYPE user_role AS ENUM (
    'administrador',
    'coordinador',
    'monitor',
    'estudiante'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_turn_times CHECK (end_time > start_time)
);

CREATE INDEX idx_turns_monitor_fecha
ON turns (monitor_id, fecha);

CREATE INDEX idx_turns_room_fecha
ON turns (room_id, fecha);
```

---

## 4. Endpoints del taller — solo los imprescindibles para US-01

| Orden | Método | Ruta                  | Rol           | Desbloquea            |
| ----- | ------ | --------------------- | ------------- | --------------------- |
| 1     | POST   | /turns                | Backend       | Frontend y n8n        |
| 2     | GET    | /monitors             | Backend       | Selector de monitores |
| 3     | GET    | /sedes                | Backend       | Selector de sedes     |
| 4     | GET    | /sedes/:sedeId/rooms  | Backend       | Selector de salones   |
| 5     | POST   | /webhook/turno-creado | Automatizador | Envío de correo       |

---

## 5. Endpoints completos del sistema

| Método | Ruta                 | Body entrada                                     | Respuesta exitosa    | Error         |
| ------ | -------------------- | ------------------------------------------------ | -------------------- | ------------- |
| GET    | /monitors            | -                                                | Lista de monitores   | -             |
| GET    | /sedes               | -                                                | Lista de sedes       | -             |
| GET    | /sedes/:sedeId/rooms | -                                                | Lista de salones     | 404           |
| POST   | /turns               | monitor_id, room_id, fecha, start_time, end_time | 201 Turno creado     | 404, 409, 422 |
| POST   | /auth/login          | email, password                                  | userId, role, nombre | 401           |

### Body POST /turns

```json
{
  "monitor_id": "uuid",
  "room_id": "uuid",
  "fecha": "2025-06-10",
  "start_time": "09:00",
  "end_time": "11:00"
}
```

### Errores POST /turns

| Código | Mensaje                                                |
| ------ | ------------------------------------------------------ |
| 404    | El monitor no está registrado en el sistema            |
| 404    | El salón no está registrado en el sistema              |
| 409    | El monitor ya tiene un turno asignado en ese horario   |
| 409    | El salón ha alcanzado su capacidad máxima de monitores |
| 422    | El horario del turno excede el cierre de la sede       |
| 422    | La fecha del turno no puede ser pasada                 |

---

## 6. Contrato del webhook para n8n

### Definición

| Atributo      | Valor                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| Método        | POST                                                                                     |
| URL Local     | [http://localhost:5678/webhook/turno-creado](http://localhost:5678/webhook/turno-creado) |
| Content-Type  | application/json                                                                         |
| Autenticación | Ninguna                                                                                  |
| Timeout       | 3 segundos                                                                               |

### Payload JSON exacto

```json
{
  "monitor_email": "juan.perez@ucaldas.edu.co",
  "monitor_name": "Juan Pérez",
  "sede": "Sede Lans",
  "room": "Sala 3",
  "fecha": "2025-06-10",
  "start_time": "09:00",
  "end_time": "11:00"
}
```

---

## 7. Punto de coordinación crítico entre roles

```text
El Automatizador necesita la URL del webhook de n8n antes del minuto 20.

El Backend necesita esa URL para configurar el .env antes de probar POST /turns.
```
