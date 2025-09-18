// ===== Tipos =====
type Filter = "all" | "active" | "done";

interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

interface AppState {
  tasks: Task[];
  filter: Filter;
}

// =======================
// LOGIN SIMULADO
// =======================
const VALID_USER = "admin";
const VALID_PASS = "1234";

const loginCard = document.getElementById("login-card") as HTMLElement;
const appContainer = document.getElementById("app-container") as HTMLElement;
const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const errorMsg = document.getElementById("login-error") as HTMLElement;

loginBtn?.addEventListener("click", () => {
  const user = (document.getElementById("username") as HTMLInputElement).value.trim();
  const pass = (document.getElementById("password") as HTMLInputElement).value.trim();

  if (user === VALID_USER && pass === VALID_PASS) {
    // Oculta login y muestra app
    loginCard.classList.add("d-none");
    appContainer.classList.remove("d-none");
    errorMsg.classList.add("d-none");

    // 👇 Solo aquí inicializamos la app
    initApp();
  } else {
    errorMsg.classList.remove("d-none");
  }
});

// =======================
// LÓGICA DE LA APP TODO
// =======================
const state: AppState = { tasks: [], filter: "all" };
const uid = (): string => Math.random().toString(36).slice(2, 10);

const STORAGE_KEY = "todo-app-tasks";

// Persistencia
function saveTasks(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); } catch {}
}
function loadTasks(): Task[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as Task[]) : [];
  } catch { return []; }
}
function clearAllStorage(): void { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

// ===== Inicialización controlada =====
function initApp(): void {
  // DOM
  const $input = document.getElementById("task-input") as HTMLInputElement;
  const $addBtn = document.getElementById("add-btn") as HTMLButtonElement;
  const $list = document.getElementById("list") as HTMLElement;
  const $counter = document.getElementById("counter") as HTMLSpanElement;
  const $empty = document.getElementById("empty") as HTMLDivElement;
  const $clearDone = document.getElementById("clear-done") as HTMLButtonElement;
  const $filterButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button[data-filter]')
  );

  const $statActive = document.getElementById("stat-active") as HTMLElement | null;
  const $statDone = document.getElementById("stat-done") as HTMLElement | null;
  const $statTotal = document.getElementById("stat-total") as HTMLElement | null;

  // CRUD
  function addTask(title: string): void {
    const trimmed = (title ?? "").trim();
    if (!trimmed) return;
    state.tasks.unshift({ id: uid(), title: trimmed, done: false, createdAt: Date.now() });
    render();
    $input.value = "";
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
  function resetAll(): void {
    const ok = confirm("¿Seguro que quieres borrar TODAS las tareas?");
    if (!ok) return;
    state.tasks = [];
    clearAllStorage();
    render();
  }

  // Helpers
  function visibleTasks(): Task[] {
    switch (state.filter) {
      case "active": return state.tasks.filter(t => !t.done);
      case "done":   return state.tasks.filter(t =>  t.done);
      default:       return state.tasks;
    }
  }
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
    container.append(" ", btn);
  }

  // Render
  function render(): void {
    const tasks = visibleTasks();
    $empty.classList.toggle("d-none", tasks.length !== 0);
    $list.innerHTML = "";

    for (const t of tasks) {
      const col = document.createElement("div");
      col.className = "col";

      const card = document.createElement("div");
      card.className = "card h-100 shadow-sm";
      if (t.done) card.classList.add("border-success", "opacity-75");

      const header = document.createElement("div");
      header.className = "card-header bg-transparent d-flex align-items-center gap-2";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "form-check-input";
      checkbox.checked = t.done;
      checkbox.addEventListener("change", () => toggleTask(t.id));
      const title = document.createElement("div");
      title.className = "ms-1 fw-semibold task-title";
      title.textContent = t.title;
      if (t.done) title.classList.add("text-decoration-line-through");
      header.append(checkbox, title);

      const body = document.createElement("div");
      body.className = "card-body py-2";
      const meta = document.createElement("div");
      meta.className = "text-secondary small";
      meta.textContent = "Creada: " + new Date(t.createdAt).toLocaleString();
      body.appendChild(meta);

      const footer = document.createElement("div");
      footer.className = "card-footer bg-transparent d-flex justify-content-end gap-2";
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-sm btn-outline-danger";
      removeBtn.innerHTML = '<i class="bi bi-trash3 me-1"></i>Eliminar';
      removeBtn.addEventListener("click", () => removeTask(t.id));
      footer.append(removeBtn);

      card.append(header, body, footer);
      col.appendChild(card);
      $list.appendChild(col);
    }

    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.done).length;
    const active = total - done;
    $counter.textContent = `${total} tareas • ${done} completadas`;
    if ($statActive) $statActive.textContent = String(active);
    if ($statDone)   $statDone.textContent = String(done);
    if ($statTotal)  $statTotal.textContent = String(total);
    for (const b of $filterButtons) {
      b.classList.toggle("active", b.dataset.filter === state.filter);
    }
    ensureResetButton();
    saveTasks();
  }

  // Eventos
  $addBtn.addEventListener("click", () => addTask($input.value));
  $input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") addTask($input.value);
  });
  $clearDone.addEventListener("click", clearDone);
  for (const b of $filterButtons) {
    b.addEventListener("click", () => setFilter((b.dataset.filter as Filter) ?? "all"));
  }

  // Inicializar estado
  state.tasks = loadTasks();
  if (state.tasks.length === 0) {
    state.tasks = [
      { id: uid(), title: "Revisar TypeScript", done: true, createdAt: Date.now() - 60000 },
      { id: uid(), title: "Agregar validación de tipos", done: false, createdAt: Date.now() - 40000 },
      { id: uid(), title: "Probar filtros y cards", done: false, createdAt: Date.now() - 20000 },
    ];
  }
  render();
}
