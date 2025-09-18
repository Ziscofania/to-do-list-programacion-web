// ===== Tipos =====
type Filter = "all" | "active" | "done";

interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  /** medianoche local (ms) o null si no tiene fecha */
  dueAt?: number | null;
}

interface AppState {
  tasks: Task[];
  filter: Filter;
  /** medianoche local (ms) del día seleccionado en el calendario (o null) */
  dayFilter: number | null;
}

// ===== Estado =====
const state: AppState = { tasks: [], filter: "all", dayFilter: null };
const uid = (): string => Math.random().toString(36).slice(2, 10);

// ===== Persistencia con localStorage =====
const STORAGE_KEY = "todo-app-tasks";

function saveTasks(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch {
    // Ignorar errores de cuota/permiso
  }
}

function loadTasks(): Task[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const raw: Task[] = data ? (JSON.parse(data) as Task[]) : [];
    // migración suave: asegurar dueAt
    return raw.map(t => ({ ...t, dueAt: t.dueAt ?? null }));
  } catch {
    return [];
  }
}

function clearAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

// ===== Utilidades de fecha =====
function atMidnightLocal(d: Date): number {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return x.getTime();
}
function parseDateInputValue(val: string | null | undefined): number | null {
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return null;
  return atMidnightLocal(new Date(y, m - 1, d));
}
function formatDateShort(ms: number | null | undefined): string {
  if (!ms && ms !== 0) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}
function isSameDay(a: number, b: number): boolean {
  return a === b;
}

// ===== DOM =====
const $input = document.getElementById("task-input") as HTMLInputElement;
const $dueInput = document.getElementById("due-input") as HTMLInputElement;
const $addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const $list = document.getElementById("list") as HTMLElement; // grid (row)
const $counter = document.getElementById("counter") as HTMLSpanElement;
const $empty = document.getElementById("empty") as HTMLDivElement;
const $clearDone = document.getElementById("clear-done") as HTMLButtonElement;
const $filterButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('button[data-filter]')
);

// Stats (opcionales)
const $statActive = document.getElementById("stat-active") as HTMLElement | null;
const $statDone = document.getElementById("stat-done") as HTMLElement | null;
const $statTotal = document.getElementById("stat-total") as HTMLElement | null;

// Calendario DOM
const $calTitle = document.getElementById("cal-title") as HTMLElement;
const $calBody  = document.getElementById("calendar-body") as HTMLElement;
const $calPrev  = document.getElementById("cal-prev") as HTMLButtonElement;
const $calNext  = document.getElementById("cal-next") as HTMLButtonElement;
const $calToday = document.getElementById("cal-today") as HTMLButtonElement;
const $clearDateFilter = document.getElementById("clear-date-filter") as HTMLButtonElement;

// ===== CRUD =====
function addTask(title: string): void {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return;
  const dueAt = parseDateInputValue($dueInput?.value);
  state.tasks.unshift({ id: uid(), title: trimmed, done: false, createdAt: Date.now(), dueAt });
  render();
  $input.value = "";
  // mantenemos la fecha (útil cuando ingresas varias para el mismo día)
  $input.focus();
}

function toggleTask(id: string): void {
  state.tasks = state.tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t));
  render();
}

function removeTask(id: string): void {
  state.tasks = state.tasks.filter(t => t.id !== id);
  render();
}

function clearDone(): void {
  state.tasks = state.tasks.filter(t => !t.done);
  render();
}

function setFilter(f: Filter): void {
  state.filter = f;
  render();
}

function setTaskDueDate(id: string): void {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return alert("No se encontró la tarea.");
  const cur = t.dueAt ? new Date(t.dueAt) : null;
  const s = prompt("Nueva fecha (YYYY-MM-DD) o vacío para quitar:", cur ? [
    cur.getFullYear(),
    String(cur.getMonth()+1).padStart(2,"0"),
    String(cur.getDate()).padStart(2,"0")
  ].join("-") : "");
  if (s === null) return; // cancelado
  const dueAt = parseDateInputValue((s ?? "").trim());
  state.tasks = state.tasks.map(x => x.id === id ? { ...x, dueAt: (s?.trim() ? dueAt : null) } : x);
  render();
}

function viewTask(id: string): void {
  const t = state.tasks.find(x => x.id === id);
  if (!t) {
    alert("No se encontró la tarea.");
    return;
  }
  const created = new Date(t.createdAt).toLocaleString();
  alert(
    `📄 Detalle de la tarea\n\n` +
    `ID: ${t.id}\n` +
    `Título: ${t.title}\n` +
    `Estado: ${t.done ? "Completada" : "Activa"}\n` +
    `Creada: ${created}\n` +
    `Vence: ${t.dueAt ? new Date(t.dueAt).toLocaleDateString() : "—"}`
  );
}

function editTaskTitle(id: string): void {
  const t = state.tasks.find(x => x.id === id);
  if (!t) {
    alert("No se encontró la tarea.");
    return;
  }
  const nuevo = prompt("Nuevo título para la tarea:", t.title);
  if (nuevo === null) return; // cancelado
  const trimmed = nuevo.trim();
  if (!trimmed) {
    alert("El título no puede estar vacío.");
    return;
  }
  state.tasks = state.tasks.map(x => (x.id === id ? { ...x, title: trimmed } : x));
  render();
}

// ===== Reset total =====
function resetAll(): void {
  const ok = confirm("¿Seguro que quieres borrar TODAS las tareas? Esta acción no se puede deshacer.");
  if (!ok) return;
  state.tasks = [];
  clearAllStorage();
  render();
}

// ===== Helpers =====
function visibleTasks(): Task[] {
  let list: Task[];
  switch (state.filter) {
    case "active": list = state.tasks.filter(t => !t.done); break;
    case "done":   list = state.tasks.filter(t =>  t.done); break;
    default:       list = state.tasks;
  }
  if (state.dayFilter !== null) {
    list = list.filter(t => t.dueAt !== null && isSameDay(t.dueAt!, state.dayFilter!));
  }
  return list;
}

// Crea e inserta el botón "Resetear lista" junto a "Eliminar completadas"
function ensureResetButton(): void {
  const existing = document.getElementById("reset-all") as HTMLButtonElement | null;
  if (existing) return;
  const container = $clearDone?.parentElement ?? document.body;
  const btn = document.createElement("button");
  btn.id = "reset-all";
  btn.type = "button";
  btn.className = "btn btn-outline-warning btn-sm";
  btn.innerHTML = '<i class="bi bi-x-circle me-1"></i> Resetear lista';
  btn.addEventListener("click", resetAll);
  const spacer = document.createElement("span");
  spacer.className = "d-inline-block";
  spacer.style.width = "6px";
  container.append(spacer, btn);
}

// ===== Calendario =====
let calCursor = new Date(); // mes visible

function renderCalendar(): void {
  if (!$calBody || !$calTitle) return;

  const year = calCursor.getFullYear();
  const month = calCursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekDay = (first.getDay() + 6) % 7; // L=0..D=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  $calTitle.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Mapa de días con tareas
  const markers = new Map<number, number>(); // dayMidnight -> count
  for (const t of state.tasks) {
    if (t.dueAt == null) continue;
    const d = new Date(t.dueAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = atMidnightLocal(d);
      markers.set(key, (markers.get(key) ?? 0) + 1);
    }
  }

  const todayMs = atMidnightLocal(new Date());
  const selected = state.dayFilter;

  // Construir celdas
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Pintar filas
  $calBody.innerHTML = "";
  for (let i = 0; i < cells.length; i += 7) {
    const tr = document.createElement("tr");
    for (let j = 0; j < 7; j++) {
      const val = cells[i + j];
      const td = document.createElement("td");
      td.className = "text-center p-1";
      if (val === null) {
        td.innerHTML = "&nbsp;";
      } else {
        const ms = atMidnightLocal(new Date(year, month, val));
        const btn = document.createElement("button");
        btn.className = "btn btn-sm w-100";
        btn.textContent = String(val);
        btn.title = new Date(ms).toLocaleDateString();

        // estilos
        btn.classList.add("btn-outline-light", "border");
        if (ms === todayMs) btn.classList.add("border-primary");
        if (selected !== null && ms === selected) btn.classList.add("btn-primary", "text-white");
        // marcador si hay tareas
        if (markers.has(ms)) {
          const dot = document.createElement("span");
          dot.className = "ms-1 align-middle";
          dot.innerHTML = '<i class="bi bi-dot text-primary"></i>';
          btn.appendChild(dot);
          btn.setAttribute("data-count", String(markers.get(ms)));
        }

        btn.addEventListener("click", () => {
          state.dayFilter = (selected === ms) ? null : ms; // toggle
          render();
        });
        td.appendChild(btn);
      }
      tr.appendChild(td);
    }
    $calBody.appendChild(tr);
  }
}

// ===== Render =====
function render(): void {
  const tasks = visibleTasks();

  // Vacío
  $empty.classList.toggle("d-none", tasks.length !== 0);

  // Limpiar grid
  $list.innerHTML = "";

  // Pintar cada task como Card
  for (const t of tasks) {
    const col = document.createElement("div");
    col.className = "col";

    const card = document.createElement("div");
    card.className = "card h-100 shadow-sm";
    if (t.done) card.classList.add("border-success", "opacity-75");

    // Header (checkbox + título)
    const header = document.createElement("div");
    header.className = "card-header bg-transparent d-flex align-items-center gap-2";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input";
    checkbox.checked = t.done;
    checkbox.title = "Marcar como completada / activa";
    checkbox.addEventListener("change", () => toggleTask(t.id));

    const title = document.createElement("div");
    title.className = "ms-1 fw-semibold task-title";
    title.textContent = t.title;
    if (t.done) title.classList.add("text-decoration-line-through");

    header.append(checkbox, title);

    // Body (meta)
    const body = document.createElement("div");
    body.className = "card-body py-2";
    const meta = document.createElement("div");
    meta.className = "text-secondary small";
    meta.textContent = "Creada: " + new Date(t.createdAt).toLocaleString();
    body.appendChild(meta);

    // Due date
    const due = document.createElement("div");
    due.className = "small mt-1";
    due.innerHTML = `<i class="bi bi-calendar2-event me-1"></i> Vence: <strong>${formatDateShort(t.dueAt ?? null)}</strong>`;
    body.appendChild(due);

    // Footer (acciones)
    const footer = document.createElement("div");
    footer.className = "card-footer bg-transparent d-flex justify-content-end gap-2";

    const viewBtn = document.createElement("button");
    viewBtn.className = "btn btn-sm btn-outline-secondary";
    viewBtn.innerHTML = '<i class="bi bi-eye me-1"></i>Ver';
    viewBtn.addEventListener("click", () => viewTask(t.id));

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-sm btn-outline-primary";
    editBtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i>Editar título';
    editBtn.addEventListener("click", () => editTaskTitle(t.id));

    const dateBtn = document.createElement("button");
    dateBtn.className = "btn btn-sm btn-outline-info";
    dateBtn.innerHTML = '<i class="bi bi-calendar-week me-1"></i>Fecha';
    dateBtn.addEventListener("click", () => setTaskDueDate(t.id));

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-sm btn-outline-danger";
    removeBtn.innerHTML = '<i class="bi bi-trash3 me-1"></i>Eliminar';
    removeBtn.addEventListener("click", () => removeTask(t.id));

    footer.append(viewBtn, editBtn, dateBtn, removeBtn);

    card.append(header, body, footer);
    col.appendChild(card);
    $list.appendChild(col);
  }

  // Contador y stats
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const active = total - done;

  $counter.textContent = `${total} tareas • ${done} completadas`;
  if ($statActive) $statActive.textContent = String(active);
  if ($statDone)   $statDone.textContent = String(done);
  if ($statTotal)  $statTotal.textContent = String(total);

  // Filtro activo
  for (const b of $filterButtons) {
    b.classList.toggle("active", b.dataset.filter === state.filter);
  }

  // Asegurar botón Reset en la UI
  ensureResetButton();

  // Guardar después de actualizar la vista/estado
  saveTasks();

  // Render calendario al final
  renderCalendar();
}

// ===== Eventos =====
$addBtn.addEventListener("click", () => addTask($input.value));
$input.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter") addTask($input.value);
});
$clearDone.addEventListener("click", clearDone);
for (const b of $filterButtons) {
  b.addEventListener("click", () => setFilter((b.dataset.filter as Filter) ?? "all"));
}

// Atajo de teclado opcional: Ctrl+Shift+R para resetear
document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === "r")) {
    e.preventDefault();
    resetAll();
  }
});

// Calendario: navegación
$calPrev?.addEventListener("click", () => { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1); renderCalendar(); });
$calNext?.addEventListener("click", () => { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1); renderCalendar(); });
$calToday?.addEventListener("click", () => { calCursor = new Date(); state.dayFilter = atMidnightLocal(new Date()); render(); });
$clearDateFilter?.addEventListener("click", () => { state.dayFilter = null; render(); });

// ===== Inicialización =====
state.tasks = loadTasks();
if (state.tasks.length === 0) {
  // Semillas de demo si está vacío
  const today = atMidnightLocal(new Date());
  state.tasks = [
    { id: uid(), title: "Revisar TypeScript",          done: true,  createdAt: Date.now() - 60000, dueAt: today },
    { id: uid(), title: "Agregar validación de tipos", done: false, createdAt: Date.now() - 40000, dueAt: today },
    { id: uid(), title: "Probar filtros y cards",      done: false, createdAt: Date.now() - 20000, dueAt: today + 86400000 },
  ];
}

render();


