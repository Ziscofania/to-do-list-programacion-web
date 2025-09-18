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

const state: AppState = { tasks: [], filter: "all" };
const uid = (): string => Math.random().toString(36).slice(2, 10);

// Persistencia
const STORAGE_KEY = "todo-app-tasks";
function saveTasks(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}
function loadTasks(): Task[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? (JSON.parse(data) as Task[]) : [];
}
function clearAllStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// DOM
const $input = document.getElementById("task-input") as HTMLInputElement;
const $addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const $list = document.getElementById("list") as HTMLElement;
const $counter = document.getElementById("counter") as HTMLSpanElement;
const $empty = document.getElementById("empty") as HTMLDivElement;
const $clearDone = document.getElementById("clear-done") as HTMLButtonElement;
const $resetAll = document.getElementById("reset-all") as HTMLButtonElement;
const $filterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-filter]'));
const $statActive = document.getElementById("stat-active");
const $statDone = document.getElementById("stat-done");
const $statTotal = document.getElementById("stat-total");

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

function resetAll(): void {
  if (!confirm("¿Seguro que quieres borrar TODAS las tareas?")) return;
  state.tasks = [];
  clearAllStorage();
  render();
}

function setFilter(f: Filter): void {
  state.filter = f;
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
    header.className = "card-header d-flex align-items-center gap-2";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input";
    checkbox.checked = t.done;
    checkbox.addEventListener("change", () => toggleTask(t.id));

    const title = document.createElement("span");
    title.className = "fw-semibold";
    title.textContent = t.title;
    if (t.done) title.classList.add("text-decoration-line-through");

    header.append(checkbox, title);

    const footer = document.createElement("div");
    footer.className = "card-footer bg-transparent text-end";

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-sm btn-outline-danger";
    delBtn.innerHTML = '<i class="bi bi-trash3"></i> Eliminar';
    delBtn.addEventListener("click", () => removeTask(t.id));

    footer.appendChild(delBtn);

    card.append(header, footer);
    col.appendChild(card);
    $list.appendChild(col);
  }

  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const active = total - done;

  $counter.textContent = `${total} tareas • ${done} completadas`;
  if ($statActive) $statActive.textContent = String(active);
  if ($statDone) $statDone.textContent = String(done);
  if ($statTotal) $statTotal.textContent = String(total);

  for (const b of $filterButtons) {
    b.classList.toggle("active", b.dataset.filter === state.filter);
  }

  saveTasks();
}

// Eventos
$addBtn.addEventListener("click", () => addTask($input.value));
$input.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter") addTask($input.value);
});
$clearDone.addEventListener("click", clearDone);
$resetAll.addEventListener("click", resetAll);

for (const b of $filterButtons) {
  b.addEventListener("click", () => setFilter((b.dataset.filter as Filter) ?? "all"));
}

// Inicialización
state.tasks = loadTasks();
render();
