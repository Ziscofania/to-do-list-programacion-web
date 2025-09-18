interface Task {
  id: number;
  title: string;
  done: boolean;
  category: string;
}

let tasks: Task[] = [];
let categories = new Set<string>();

const taskInput = document.getElementById("task-input") as HTMLInputElement;
const addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const categoryFilter = document.getElementById("category-filter") as HTMLSelectElement;

// Modal refs
const newCategoryModalEl = document.getElementById("newCategoryModal") as HTMLElement;
const newCategoryInput = document.getElementById("new-category-input") as HTMLInputElement;
const saveCategoryBtn = document.getElementById("save-category-btn") as HTMLButtonElement;
const newCategoryModal = new bootstrap.Modal(newCategoryModalEl);

function addTask() {
  const title = taskInput.value.trim();
  const category = categoryFilter.value !== "all" && categoryFilter.value !== "__new__"
    ? categoryFilter.value
    : "General";

  if (!title) return;

  const task: Task = {
    id: Date.now(),
    title,
    done: false,
    category,
  };
  tasks.push(task);
  categories.add(category);
  updateCategoryFilter();
  renderTasks();
  taskInput.value = "";
}

function updateCategoryFilter() {
  const current = categoryFilter.value;

  categoryFilter.innerHTML = `
    <option value="all">Todas las categorías</option>
  `;

  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "➕ Nueva categoría…";
  categoryFilter.appendChild(newOpt);

  if ([...categories, "all", "__new__"].includes(current)) {
    categoryFilter.value = current;
  } else {
    categoryFilter.value = "all";
  }
}

function renderTasks() {
  const list = document.getElementById("list")!;
  const filter = (document.querySelector(".btn-group .active") as HTMLElement)?.dataset.filter || "all";
  const catFilter = categoryFilter.value;

  list.innerHTML = "";

  tasks
    .filter(task => {
      if (filter === "active" && task.done) return false;
      if (filter === "done" && !task.done) return false;
      if (catFilter !== "all" && catFilter !== "__new__" && task.category !== catFilter) return false;
      return true;
    })
    .forEach(task => {
      const col = document.createElement("div");
      col.className = "col";
      col.innerHTML = `
        <div class="card ${task.done ? "border-success opacity-75" : ""}">
          <div class="card-body d-flex justify-content-between align-items-start">
            <div>
              <h5 class="task-title">${task.title}</h5>
              <small class="text-muted">Categoría: ${task.category}</small>
            </div>
            <div class="form-check">
              <input type="checkbox" class="form-check-input" ${task.done ? "checked" : ""}>
            </div>
          </div>
        </div>
      `;
      list.appendChild(col);

      const checkbox = col.querySelector("input")!;
      checkbox.addEventListener("change", () => {
        task.done = checkbox.checked;
        renderTasks();
      });
    });
}

function handleCategoryFilterChange() {
  if (categoryFilter.value === "__new__") {
    newCategoryInput.value = "";
    newCategoryModal.show();
  } else {
    renderTasks();
  }
}

saveCategoryBtn.addEventListener("click", () => {
  const newCat = newCategoryInput.value.trim();
  if (newCat) {
    categories.add(newCat);
    updateCategoryFilter();
    categoryFilter.value = newCat;
    renderTasks();
    newCategoryModal.hide();
  }
});

addBtn.addEventListener("click", addTask);
categoryFilter.addEventListener("change", handleCategoryFilterChange);

// Inicialización
updateCategoryFilter();
renderTasks();
