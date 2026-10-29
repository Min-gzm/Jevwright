const WEEKLY_DONE = [
  { week: "Sep 29", count: 4 },
  { week: "Oct 6", count: 7 },
  { week: "Oct 13", count: 5 },
  { week: "Oct 20", count: 9 },
  { week: "Oct 27", count: 6 },
];

document.querySelectorAll('[role="switch"]').forEach((toggle) => {
  toggle.addEventListener("click", () => {
    toggle.setAttribute("aria-checked", String(toggle.getAttribute("aria-checked") !== "true"));
  });
});

document.getElementById("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  document.getElementById("saved-banner").hidden = false;
});

// Drawn on a canvas on purpose: the bars have no DOM nodes, so only Visual Locate can see them.
function drawChart() {
  const canvas = document.getElementById("activity-chart");
  const ctx = canvas.getContext("2d");
  const max = Math.max(...WEEKLY_DONE.map((d) => d.count));
  const barWidth = 48;
  const gap = (canvas.width - barWidth * WEEKLY_DONE.length) / (WEEKLY_DONE.length + 1);
  const chartHeight = canvas.height - 30;

  ctx.font = "12px 'DejaVu Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  WEEKLY_DONE.forEach((d, i) => {
    const x = gap + i * (barWidth + gap);
    const height = (d.count / max) * (chartHeight - 16);
    const y = chartHeight - height;
    ctx.fillStyle = d.count === max ? "#2f6fed" : "#a9c1f5";
    ctx.fillRect(x, y, barWidth, height);
    ctx.fillStyle = "#1d2330";
    ctx.fillText(String(d.count), x + barWidth / 2, y - 4);
    ctx.fillStyle = "#6a7285";
    ctx.fillText(d.week, x + barWidth / 2, canvas.height - 10);
  });
}

drawChart();
