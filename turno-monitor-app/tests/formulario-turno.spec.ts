import { test, expect, type Page } from "@playwright/test";

// ── Datos de mock ────────────────────────────────────────────────────────────
const MONITORES = [
  { id: "mon-1", nombre: "Stiven Osorio", email: "s.osorio@ucaldas.edu.co" },
  { id: "mon-2", nombre: "Jackeline Rivera", email: "j.rivera@ucaldas.edu.co" },
];

const SEDES = [
  { id: "sede-1", nombre: "Sede Lans", open_time: "07:00", close_time: "15:00" },
  { id: "sede-2", nombre: "Sede Orlando Sierra", open_time: "07:00", close_time: "18:00" },
];

const ROOMS_SEDE_1 = [
  { id: "room-1", nombre: "Cisco", has_mac: false },
  { id: "room-2", nombre: "Sala J", has_mac: false },
];

const ROOMS_SEDE_2 = [
  { id: "room-3", nombre: "Sala 3", has_mac: true },
];

const URL = "/formulario-turno";
const API = "http://localhost:3000/api";

// ── Helper: mocks de API ──────────────────────────────────────────────────────
async function mockApiOk(page: Page) {
  await page.route(`${API}/monitors`, (route) => route.fulfill({ json: MONITORES }));
  await page.route(`${API}/sedes`, (route) => route.fulfill({ json: SEDES }));
  await page.route(`${API}/sedes/sede-1/rooms`, (route) => route.fulfill({ json: ROOMS_SEDE_1 }));
  await page.route(`${API}/sedes/sede-2/rooms`, (route) => route.fulfill({ json: ROOMS_SEDE_2 }));
}

// ── Helper: esperar salones (options en select son "attached", no "visible") ──
async function esperarSalones(page: Page, roomId: string) {
  await page.locator(`#room_id option[value="${roomId}"]`).waitFor({ state: "attached" });
  await expect(page.locator("#room_id")).toBeEnabled();
}

// ── Helper: alerta de la API (excluye __next-route-announcer__ de Next.js) ────
function alertaApi(page: Page) {
  return page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
}

// ── Helper: llenar formulario completo ───────────────────────────────────────
async function llenarFormulario(page: Page) {
  await page.selectOption("#monitor_id", { value: "mon-1" });
  await page.selectOption("#sede_id", { value: "sede-1" });
  await esperarSalones(page, "room-1");
  await page.selectOption("#room_id", { value: "room-1" });
  await page.fill("#fecha", "2099-12-31");
  await page.fill("#hora_inicio", "09:00");
  await page.fill("#hora_fin", "11:00");
}

// ════════════════════════════════════════════════════════════════════════════
// CA-01 / CA-02  Carga de monitores y sedes
// ════════════════════════════════════════════════════════════════════════════
test("CA-01 CA-02 — carga monitores y sedes desde la API", async ({ page }) => {
  await mockApiOk(page);
  await page.goto(URL);

  // Las options del select son "attached" pero no abiertas → verificar presencia en DOM
  await expect(page.locator("#monitor_id option[value='mon-1']")).toHaveCount(1);
  await expect(page.locator("#monitor_id option[value='mon-2']")).toHaveCount(1);
  await expect(page.locator("#sede_id option[value='sede-1']")).toHaveCount(1);
  await expect(page.locator("#sede_id option[value='sede-2']")).toHaveCount(1);
});

// ════════════════════════════════════════════════════════════════════════════
// CA-03  Salones se filtran por sede
// ════════════════════════════════════════════════════════════════════════════
test("CA-03 — salones se cargan al seleccionar sede", async ({ page }) => {
  await mockApiOk(page);
  await page.goto(URL);

  await page.selectOption("#sede_id", { value: "sede-1" });
  await esperarSalones(page, "room-1");

  await expect(page.locator("#room_id option[value='room-1']")).toHaveCount(1);
  await expect(page.locator("#room_id option[value='room-2']")).toHaveCount(1);
});

// ════════════════════════════════════════════════════════════════════════════
// CA-11  Reset de salones al cambiar sede
// ════════════════════════════════════════════════════════════════════════════
test("CA-11 — cambiar sede reinicia la selección de salón", async ({ page }) => {
  await mockApiOk(page);
  await page.goto(URL);

  // Seleccionar sede 1 y un salón
  await page.selectOption("#sede_id", { value: "sede-1" });
  await esperarSalones(page, "room-1");
  await page.selectOption("#room_id", { value: "room-1" });
  await expect(page.locator("#room_id")).toHaveValue("room-1");

  // Cambiar a sede 2 → room_id debe resetearse
  await page.selectOption("#sede_id", { value: "sede-2" });
  await expect(page.locator("#room_id")).toHaveValue("");

  // Salones de sede-2 deben aparecer
  await esperarSalones(page, "room-3");
  await expect(page.locator("#room_id option[value='room-3']")).toHaveCount(1);
});

// ════════════════════════════════════════════════════════════════════════════
// CA-06  Flujo feliz → 201 éxito
// ════════════════════════════════════════════════════════════════════════════
test("CA-06 — flujo feliz: 201 muestra mensaje de éxito y limpia el formulario", async ({ page }) => {
  await mockApiOk(page);
  await page.route(`${API}/turns`, (route) =>
    route.fulfill({ status: 201, body: "" })
  );

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  // Mensaje de éxito
  const msgExito = page.getByRole("status");
  await expect(msgExito).toBeVisible();
  await expect(msgExito).toContainText("Turno asignado correctamente");
  await expect(msgExito).toContainText("Stiven Osorio");
  await expect(msgExito).toContainText("Cisco");

  // Formulario limpio
  await expect(page.locator("#monitor_id")).toHaveValue("");
  await expect(page.locator("#sede_id")).toHaveValue("");
  await expect(page.locator("#fecha")).toHaveValue("");
});

// ════════════════════════════════════════════════════════════════════════════
// CA-05  Header X-User-Role enviado
// ════════════════════════════════════════════════════════════════════════════
test("CA-05 — se envía header X-User-Role: coordinador", async ({ page }) => {
  await mockApiOk(page);
  let capturedHeaders: Record<string, string> = {};

  await page.route(`${API}/turns`, async (route) => {
    capturedHeaders = route.request().headers();
    await route.fulfill({ status: 201, body: "" });
  });

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  await expect(page.getByRole("status")).toBeVisible();
  expect(capturedHeaders["x-user-role"]).toBe("coordinador");
});

// ════════════════════════════════════════════════════════════════════════════
// CA-04  Body POST /turns
// ════════════════════════════════════════════════════════════════════════════
test("CA-04 — body POST /turns contiene los campos correctos (sin materia)", async ({ page }) => {
  await mockApiOk(page);
  let capturedBody: Record<string, string> = {};

  await page.route(`${API}/turns`, async (route) => {
    capturedBody = JSON.parse(route.request().postData() ?? "{}");
    await route.fulfill({ status: 201, body: "" });
  });

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  await expect(page.getByRole("status")).toBeVisible();

  expect(capturedBody).toMatchObject({
    monitor_id: "mon-1",
    room_id: "room-1",
    fecha: "2099-12-31",
    start_time: "09:00",
    end_time: "11:00",
  });
  expect(capturedBody).not.toHaveProperty("materia");
});

// ════════════════════════════════════════════════════════════════════════════
// CA-07  Error 409
// ════════════════════════════════════════════════════════════════════════════
test("CA-07 — error 409: conflicto de horario del monitor", async ({ page }) => {
  await mockApiOk(page);
  await page.route(`${API}/turns`, (route) =>
    route.fulfill({
      status: 409,
      json: { message: "El monitor ya tiene un turno asignado en ese horario" },
    })
  );

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  const alerta = alertaApi(page);
  await expect(alerta).toBeVisible();
  await expect(alerta).toContainText("El monitor ya tiene un turno asignado en ese horario");
});

test("CA-07 — error 409: capacidad máxima del salón", async ({ page }) => {
  await mockApiOk(page);
  await page.route(`${API}/turns`, (route) =>
    route.fulfill({
      status: 409,
      json: { message: "El salón ha alcanzado su capacidad máxima de monitores" },
    })
  );

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  await expect(alertaApi(page)).toContainText("El salón ha alcanzado su capacidad máxima de monitores");
});

// ════════════════════════════════════════════════════════════════════════════
// CA-08  Error 422
// ════════════════════════════════════════════════════════════════════════════
test("CA-08 — error 422: horario fuera del cierre de sede", async ({ page }) => {
  await mockApiOk(page);
  await page.route(`${API}/turns`, (route) =>
    route.fulfill({
      status: 422,
      json: { message: "El horario del turno excede el cierre de la sede (15:00)" },
    })
  );

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  await expect(alertaApi(page)).toContainText("El horario del turno excede el cierre de la sede");
});

test("CA-08 — error 422: fecha pasada", async ({ page }) => {
  await mockApiOk(page);
  await page.route(`${API}/turns`, (route) =>
    route.fulfill({
      status: 422,
      json: { message: "La fecha del turno no puede ser pasada" },
    })
  );

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  await expect(alertaApi(page)).toContainText("La fecha del turno no puede ser pasada");
});

// ════════════════════════════════════════════════════════════════════════════
// CA-09  Error 404
// ════════════════════════════════════════════════════════════════════════════
test("CA-09 — error 404: monitor no encontrado", async ({ page }) => {
  await mockApiOk(page);
  await page.route(`${API}/turns`, (route) =>
    route.fulfill({
      status: 404,
      json: { message: "El monitor no está registrado en el sistema" },
    })
  );

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  await expect(alertaApi(page)).toContainText("El monitor no está registrado en el sistema");
});

test("CA-09 — error 404: salón no encontrado", async ({ page }) => {
  await mockApiOk(page);
  await page.route(`${API}/turns`, (route) =>
    route.fulfill({
      status: 404,
      json: { message: "El salón no está registrado en el sistema" },
    })
  );

  await page.goto(URL);
  await llenarFormulario(page);
  await page.click('button[type="submit"]');

  await expect(alertaApi(page)).toContainText("El salón no está registrado en el sistema");
});

// ════════════════════════════════════════════════════════════════════════════
// CA-10  Botón deshabilitado durante envío
// ════════════════════════════════════════════════════════════════════════════
test("CA-10 — botón se deshabilita mientras la petición está en curso", async ({ page }) => {
  await mockApiOk(page);

  // Respuesta lenta para capturar el estado intermedio
  await page.route(`${API}/turns`, async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({ status: 201, body: "" });
  });

  await page.goto(URL);
  await llenarFormulario(page);

  const btn = page.locator('button[type="submit"]');
  await btn.click();

  // Inmediatamente debe estar deshabilitado
  await expect(btn).toBeDisabled();
  await expect(btn).toContainText("Asignando");

  // Tras la respuesta se reactiva
  await expect(btn).toBeEnabled({ timeout: 5000 });
});

// ════════════════════════════════════════════════════════════════════════════
// CA-12  Campos requeridos — no se envía el formulario vacío
// ════════════════════════════════════════════════════════════════════════════
test("CA-12 — formulario no se envía con campos vacíos", async ({ page }) => {
  await mockApiOk(page);
  let turnsCallCount = 0;
  await page.route(`${API}/turns`, (route) => {
    turnsCallCount++;
    return route.fulfill({ status: 201, body: "" });
  });

  await page.goto(URL);

  // Click sin llenar nada
  await page.click('button[type="submit"]');

  // Ninguna llamada a /turns
  await page.waitForTimeout(400);
  expect(turnsCallCount).toBe(0);

  // No debe aparecer alerta de API (solo validación nativa del browser)
  await expect(alertaApi(page)).not.toBeAttached();
});
