// Fixed data so every capture renders the same page.
const tasks = [
  { id: "t1", title: "Audit current navigation", assignee: "Dana Miller", due: "Nov 3", priority: "high", status: "progress" },
  { id: "t2", title: "Design new pricing page", assignee: "Leo Park", due: "Nov 6", priority: "medium", status: "todo" },
  { id: "t3", title: "Write release notes", assignee: "Priya Shah", due: "Nov 8", priority: "low", status: "todo" },
  { id: "t4", title: "Migrate blog to new CMS", assignee: "Leo Park", due: "Nov 12", priority: "high", status: "progress" },
  { id: "t5", title: "Collect stakeholder feedback", assignee: "Dana Miller", due: "Oct 28", priority: "medium", status: "done" },
  { id: "t6", title: "Set up analytics events", assignee: "Priya Shah", due: "Oct 30", priority: "low", status: "done" },
];

const STATUS_LABELS = { todo: "To do", progress: "In progress", done: "Done" };
const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

const PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';

let filter = "all";
let query = "";
let pendingDelete = null;

const rows = document.getElementById("task-rows");
const summary = document.getElementById("task-summary");
const emptyState = document.getElementById("empty-state");
const emptyMessage = document.getElementById("empty-message");
const search = document.getElementById("search");
const toast = document.getElementById("toast");
const taskDialog = document.getElementById("task-dialog");
const confirmDialog = document.getElementById("confirm-dialog");

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function visibleTasks() {
  return tasks.filter((task) => {
    if (filter === "active" && task.status === "done") return false;
    if (filter === "done" && task.status !== "done") return false;
    return task.title.toLowerCase().includes(query.toLowerCase());
  });
}

function render() {
  const list = visibleTasks();
  const open = tasks.filter((task) => task.status !== "done").length;
  summary.textContent = `${tasks.length} tasks · ${open} open`;

  rows.innerHTML = list.map((task) => `
    <tr data-task-id="${task.id}" class="${task.status === "done" ? "done" : ""}">
      <td><input type="checkbox" aria-label="Mark as done" ${task.status === "done" ? "checked" : ""}></td>
      <td class="title">${escapeHtml(task.title)}</td>
      <td>${task.assignee}</td>
      <td>${task.due}</td>
      <td><span class="pill pill-${task.priority}">${PRIORITY_LABELS[task.priority]}</span></td>
      <td><span class="pill pill-${task.status}">${STATUS_LABELS[task.status]}</span></td>
      <td class="actions">
        <button class="icon-btn" data-action="edit" aria-label="Edit task">${PENCIL}</button>
        <button class="icon-btn" data-action="delete" aria-label="Delete task">${TRASH}</button>
      </td>
    </tr>`).join("");

  emptyState.hidden = list.length > 0;
  emptyMessage.textContent = query ? `No tasks match "${query}".` : "No tasks here yet.";
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
}

document.querySelectorAll('[role="tab"]').forEach((tab) => {
  tab.addEventListener("click", () => {
    filter = tab.dataset.filter;
    document.querySelectorAll('[role="tab"]').forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    render();
  });
});

search.addEventListener("input", () => {
  query = search.value.trim();
  render();
});

document.getElementById("clear-search").addEventListener("click", () => {
  search.value = "";
  query = "";
  render();
});

rows.addEventListener("change", (event) => {
  const id = event.target.closest("tr").dataset.taskId;
  const task = tasks.find((t) => t.id === id);
  task.status = event.target.checked ? "done" : "todo";
  render();
});

rows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const task = tasks.find((t) => t.id === button.closest("tr").dataset.taskId);
  if (button.dataset.action === "delete") {
    pendingDelete = task;
    document.getElementById("confirm-title").textContent = `Delete "${task.title}"?`;
    confirmDialog.showModal();
  }
});

document.getElementById("confirm-cancel").addEventListener("click", () => confirmDialog.close());
document.getElementById("confirm-delete").addEventListener("click", () => {
  tasks.splice(tasks.indexOf(pendingDelete), 1);
  confirmDialog.close();
  showToast(`Deleted "${pendingDelete.title}"`);
  render();
});

document.getElementById("new-task").addEventListener("click", () => taskDialog.showModal());
document.getElementById("task-cancel").addEventListener("click", () => taskDialog.close());
document.getElementById("task-form").addEventListener("submit", (event) => {
  const title = document.getElementById("task-title").value.trim();
  if (!title) {
    event.preventDefault();
    document.getElementById("task-title").setAttribute("aria-invalid", "true");
    return;
  }
  const priority = document.querySelector('input[name="priority"]:checked').value;
  const assignee = document.getElementById("task-assignee").value || "Unassigned";
  tasks.unshift({ id: `t${Date.now()}`, title, assignee, due: "—", priority, status: "todo" });
  showToast(`Created "${title}"`);
  render();
});

render();
