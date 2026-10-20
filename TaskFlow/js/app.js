
const STORAGE_KEY = "taskflow_tasks";

let tasks = loadTasks();
let currentView = "all";

const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");
const toast = document.getElementById("toast");

const statusNames = {
    pending: "Pendiente",
    progress: "En proceso",
    completed: "Completada"
};

const priorityNames = {
    high: "Alta",
    medium: "Media",
    low: "Baja"
};

const viewNames = {
    all: "Todas las tareas",
    today: "Para hoy",
    pending: "Pendientes",
    progress: "En proceso",
    completed: "Completadas"
};

// Cargar las tareas guardadas.
function loadTasks() {
    const savedTasks = localStorage.getItem(STORAGE_KEY);

    if (savedTasks === null) {
        return [];
    }

    try {
        const data = JSON.parse(savedTasks);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

// Guardar las tareas en el navegador.
function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch {
        showToast("No se pudieron guardar los datos.");
        return false;
    }
}

// Generar un identificador para cada tarea.
function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

// Evitar que el texto de una tarea se interprete como HTML.
function escapeHTML(text = "") {
    return String(text).replace(/[&<>"']/g, character => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[character];
    });
}

// Obtener la fecha local en formato AAAA-MM-DD.
function getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Mostrar las fechas de manera legible.
function formatDate(dateString) {
    if (!dateString) {
        return "Sin fecha límite";
    }

    const parts = dateString.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return date.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Mostrar mensajes al usuario.
let toastTimeout;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// Abrir el formulario para crear o editar.
function openModal(task = null) {
    taskForm.reset();

    document.getElementById("taskId").value =
        task ? task.id : "";

    document.getElementById("taskTitle").value =
        task ? task.title : "";

    document.getElementById("taskDescription").value =
        task ? task.description || "" : "";

    document.getElementById("taskDate").value =
        task ? task.date || "" : "";

    document.getElementById("taskCategory").value =
        task ? task.category : "Estudio";

    document.getElementById("taskPriority").value =
        task ? task.priority : "medium";

    document.getElementById("taskStatus").value =
        task ? task.status : "pending";

    document.getElementById("modalTitle").textContent =
        task ? "Editar tarea" : "Crear nueva tarea";

    taskModal.hidden = false;
    document.body.style.overflow = "hidden";

    document.getElementById("taskTitle").focus();
}

// Cerrar el formulario.
function closeModal() {
    taskModal.hidden = true;
    document.body.style.overflow = "";
}

// Guardar una tarea nueva o actualizar una existente.
taskForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const id = document.getElementById("taskId").value;
    const title = document.getElementById("taskTitle").value.trim();

    if (title === "") {
        showToast("Escribe el título de la tarea.");
        return;
    }

    const taskData = {
        id: id || createId(),
        title: title,
        description: document.getElementById("taskDescription").value.trim(),
        date: document.getElementById("taskDate").value,
        category: document.getElementById("taskCategory").value,
        priority: document.getElementById("taskPriority").value,
        status: document.getElementById("taskStatus").value
    };

    if (id) {
        tasks = tasks.map(function(task) {
            if (task.id === id) {
                return { ...task, ...taskData };
            }

            return task;
        });

        if (!saveTasks()) return;
        showToast("Tarea actualizada correctamente.");
    } else {
        tasks.unshift(taskData);

        if (!saveTasks()) {
            tasks = tasks.filter(task => task.id !== taskData.id);
            return;
        }

        showToast("Tarea creada correctamente.");
    }

    closeModal();
    renderTasks();
});

// Obtener las tareas que cumplen los filtros.
function getFilteredTasks() {
    const search = document.getElementById("searchInput")
        .value.trim().toLowerCase();

    const status = document.getElementById("statusFilter").value;
    const priority = document.getElementById("priorityFilter").value;
    const dateFilter = document.getElementById("dateFilter").value;

    const today = getToday();
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);

    const year = nextWeekDate.getFullYear();
    const month = String(nextWeekDate.getMonth() + 1).padStart(2, "0");
    const day = String(nextWeekDate.getDate()).padStart(2, "0");
    const nextWeek = `${year}-${month}-${day}`;

    return tasks.filter(function(task) {
        let matchesView = true;

        if (currentView === "today") {
            matchesView = task.date === today &&
                task.status !== "completed";
        } else if (currentView === "pending") {
            matchesView = task.status === "pending";
        } else if (currentView === "progress") {
            matchesView = task.status === "progress";
        } else if (currentView === "completed") {
            matchesView = task.status === "completed";
        }

        const text = (
            task.title + " " +
            task.description + " " +
            task.category
        ).toLowerCase();

        const matchesSearch = text.includes(search);
        const matchesStatus = status === "all" ||
            task.status === status;
        const matchesPriority = priority === "all" ||
            task.priority === priority;

        let matchesDate = true;

        if (dateFilter === "today") {
            matchesDate = task.date === today;
        } else if (dateFilter === "week") {
            matchesDate = Boolean(
                task.date &&
                task.date >= today &&
                task.date <= nextWeek
            );
        } else if (dateFilter === "overdue") {
            matchesDate = Boolean(
                task.date &&
                task.date < today &&
                task.status !== "completed"
            );
        } else if (dateFilter === "no-date") {
            matchesDate = !task.date;
        }

        return matchesView &&
            matchesSearch &&
            matchesStatus &&
            matchesPriority &&
            matchesDate;
    }).sort(function(a, b) {
        if (a.status === "completed" && b.status !== "completed") {
            return 1;
        }

        if (b.status === "completed" && a.status !== "completed") {
            return -1;
        }

        if (!a.date) return 1;
        if (!b.date) return -1;

        return a.date.localeCompare(b.date);
    });
}

// Mostrar las tareas en pantalla.
function renderTasks() {
    const visibleTasks = getFilteredTasks();
    const today = getToday();

    taskList.innerHTML = visibleTasks.map(function(task) {
        const overdue = task.date &&
            task.date < today &&
            task.status !== "completed";

        return `
            <article class="task-card ${
                task.status === "completed" ? "is-completed" : ""
            }">

                <input
                    class="task-check"
                    type="checkbox"
                    data-action="complete"
                    data-id="${escapeHTML(task.id)}"
                    aria-label="Marcar tarea como completada"
                    ${task.status === "completed" ? "checked" : ""}
                >

                <div>
                    <div class="task-title-row">
                        <h3 class="task-title">
                            ${escapeHTML(task.title)}
                        </h3>

                        <span class="pill priority-${escapeHTML(task.priority)}">
                            Prioridad ${
                                escapeHTML(priorityNames[task.priority])
                            }
                        </span>
                    </div>

                    ${
                        task.description
                            ? `<p class="task-description">${
                                escapeHTML(task.description)
                            }</p>`
                            : ""
                    }

                    <div class="task-meta">
                        <span class="pill">
                            ${escapeHTML(task.category)}
                        </span>

                        <span class="pill status-${escapeHTML(task.status)}">
                            ${escapeHTML(statusNames[task.status])}
                        </span>

                        <span class="task-date ${overdue ? "overdue" : ""}">
                            ${overdue ? "Vencida · " : ""}
                            ${escapeHTML(formatDate(task.date))}
                        </span>
                    </div>
                </div>

                <div class="task-actions">
                    <button
                        class="icon-button"
                        data-action="edit"
                        data-id="${escapeHTML(task.id)}"
                        aria-label="Editar tarea"
                        title="Editar"
                    >✎</button>

                    <button
                        class="icon-button delete"
                        data-action="delete"
                        data-id="${escapeHTML(task.id)}"
                        aria-label="Eliminar tarea"
                        title="Eliminar"
                    >⌫</button>
                </div>
            </article>
        `;
    }).join("");

    emptyState.classList.toggle("show", visibleTasks.length === 0);
    taskList.style.display = visibleTasks.length === 0 ? "none" : "grid";

    updateStats();
}

// Actualizar los contadores y la barra de progreso.
function updateStats() {
    const total = tasks.length;

    const pending = tasks.filter(
        task => task.status === "pending"
    ).length;

    const progress = tasks.filter(
        task => task.status === "progress"
    ).length;

    const completed = tasks.filter(
        task => task.status === "completed"
    ).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    document.getElementById("totalCount").textContent = total;
    document.getElementById("pendingCount").textContent = pending;
    document.getElementById("progressCount").textContent = progress;
    document.getElementById("completedCount").textContent = completed;
    document.getElementById("navTotal").textContent = total;

    document.getElementById("progressPercent").textContent =
        percentage + "%";

    document.getElementById("progressFill").style.width =
        percentage + "%";

    if (total === 0) {
        document.getElementById("progressMessage").textContent =
            "Agrega tu primera tarea para comenzar.";
    } else if (percentage === 100) {
        document.getElementById("progressMessage").textContent =
            "¡Excelente! Has completado todas tus tareas.";
    } else {
        document.getElementById("progressMessage").textContent =
            `${completed} de ${total} tareas completadas. Sigue así.`;
    }
}

// Editar o eliminar una tarea.
taskList.addEventListener("click", function(event) {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    if (button.dataset.action === "edit") {
        openModal(task);
    }

    if (button.dataset.action === "delete") {
        const confirmed = confirm(
            `¿Deseas eliminar la tarea "${task.title}"?`
        );

        if (!confirmed) return;

        const previousTasks = tasks;
        tasks = tasks.filter(item => item.id !== id);

        if (!saveTasks()) {
            tasks = previousTasks;
            return;
        }

        renderTasks();
        showToast("Tarea eliminada correctamente.");
    }
});

// Cambiar el estado de una tarea con la casilla.
taskList.addEventListener("change", function(event) {
    if (event.target.dataset.action !== "complete") return;

    const id = event.target.dataset.id;
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    const previousStatus = task.status;

    task.status = event.target.checked
        ? "completed"
        : "pending";

    if (!saveTasks()) {
        task.status = previousStatus;
        renderTasks();
        return;
    }

    renderTasks();

    showToast(
        task.status === "completed"
            ? "¡Tarea completada!"
            : "Tarea marcada como pendiente."
    );
});

// Navegar entre las diferentes vistas.
document.querySelectorAll(".nav-link").forEach(function(button) {
    button.addEventListener("click", function() {
        currentView = button.dataset.view;

        document.querySelectorAll(".nav-link").forEach(function(link) {
            link.classList.toggle("active", link === button);
        });

        document.getElementById("pageTitle").textContent =
            viewNames[currentView];

        renderTasks();
    });
});

// Buscar y filtrar tareas.
document.getElementById("searchInput")
    .addEventListener("input", renderTasks);

document.getElementById("statusFilter")
    .addEventListener("change", renderTasks);

document.getElementById("priorityFilter")
    .addEventListener("change", renderTasks);

document.getElementById("dateFilter")
    .addEventListener("change", renderTasks);

// Limpiar los filtros.
document.getElementById("clearFilters").addEventListener("click", function() {
    document.getElementById("searchInput").value = "";
    document.getElementById("statusFilter").value = "all";
    document.getElementById("priorityFilter").value = "all";
    document.getElementById("dateFilter").value = "all";

    renderTasks();
});

// Abrir y cerrar el formulario.
document.getElementById("addTaskButton")
    .addEventListener("click", () => openModal());

document.getElementById("emptyAddButton")
    .addEventListener("click", () => openModal());

document.getElementById("closeModal")
    .addEventListener("click", closeModal);

document.getElementById("cancelButton")
    .addEventListener("click", closeModal);

taskModal.addEventListener("click", function(event) {
    if (event.target === taskModal) {
        closeModal();
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && !taskModal.hidden) {
        closeModal();
    }
});

// Mostrar la fecha actual.
document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).toUpperCase();

// Iniciar la aplicación.
renderTasks();
