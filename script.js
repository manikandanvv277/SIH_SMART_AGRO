// ✅ SmartAgro script.js — Final v2 (ESP + Alerts + Weather + Conservation Mode)
console.log("✅ SmartAgro script.js loaded");

// === CONFIG ===
const ESP_IP = "http://192.168.1.107"; // <-- your ESP32 IP (check serial monitor)
const MAX_POINTS = 20;
const sample = { soil: [], temp: [], hum: [], light: [] };

// === Fetch Data from ESP ===
async function readSensorsLive() {
  try {
    const res = await fetch(`${ESP_IP}/data`, { cache: "no-store" });
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    console.log("📡 ESP data:", data);
    return data;
  } catch (err) {
    console.error("❌ Failed to fetch from ESP:", err);
    // fallback to zeros
    return { soil: 0, temp: 0, hum: 0, light: 0, rain: 0, water: 0 };
  }
}

// === Chart setup ===
function createChart(ctx, label, color) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: Array(MAX_POINTS).fill(""),
      datasets: [
        {
          label,
          data: Array(MAX_POINTS).fill(null),
          borderColor: color,
          backgroundColor: color,
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      animation: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false } },
    },
  });
}

let soilChart, tempChart, humChart, lightChart;
function initCharts() {
  soilChart = createChart(document.getElementById("soilChart"), "Soil", "#22c55e");
  tempChart = createChart(document.getElementById("tempChart"), "Temp", "#ff7a59");
  humChart = createChart(document.getElementById("humChart"), "Hum", "#59c2ff");
  lightChart = createChart(document.getElementById("lightChart"), "Light", "#ffd166");
}

// === ALERT TABLE ===
function addAlert(msg, sev = "Warning") {
  const tbody = document.querySelector("#alertsTable tbody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  const t = new Date().toLocaleTimeString();
  const id = Date.now();

  tr.innerHTML = `
    <td>${t}</td>
    <td>${msg}</td>
    <td>${sev}</td>
    <td><button class="resolveBtn" data-id="${id}">Resolve</button></td>
  `;

  tbody.prepend(tr);
  while (tbody.children.length > 10) tbody.removeChild(tbody.lastChild);

  const btn = tr.querySelector(".resolveBtn");
  btn.addEventListener("click", () => {
    tr.style.opacity = "0.5";
    tr.style.textDecoration = "line-through";
    btn.disabled = true;
    btn.innerText = "Resolved";
  });
}

// === Push to chart arrays ===
function pushSeries(series, val) {
  series.push(val);
  if (series.length > MAX_POINTS) series.shift();
}

// === WEATHER SIMULATION (Sikkim style) ===
function updateLocalWeather(sensorData) {
  const { temp, hum, rain } = sensorData;
  let condition = "Clear";

  if (rain) condition = "Rainy";
  else if (hum > 75) condition = "Cloudy";
  else if (hum < 40) condition = "Sunny";
  else condition = "Partly Cloudy";

  const todayTemp = temp;
  const tomorrowTemp = temp + (Math.random() * 4 - 2);
  const tomorrowCondition =
    condition === "Rainy"
      ? "Cloudy"
      : condition === "Sunny"
      ? "Partly Cloudy"
      : "Rainy";

  const html = `
    <p><b>Today:</b> ${condition}, ${todayTemp.toFixed(1)}°C</p>
    <p><b>Tomorrow:</b> ${tomorrowCondition}, ${tomorrowTemp.toFixed(1)}°C</p>
    <p style="margin-top:8px;color:#94a3b8;font-size:0.85rem">
      Sikkim Region · Feels like ${(todayTemp + Math.random() * 0.8).toFixed(1)}°C
    </p>
  `;
  const el = document.getElementById("weatherInfo");
  if (el) el.innerHTML = html;
}

// === CONSERVATION MODE ===
let conservationActive = false;
function toggleConservation() {
  conservationActive = !conservationActive;
  const btn = document.getElementById("conserveBtn");
  const txt = document.getElementById("conserveStatus");

  if (conservationActive) {
    btn.innerText = "✅ Conservation Mode Active";
    btn.style.background = "#22c55e";
    txt.innerText = "System will minimize water usage until tank refills.";
    localStorage.setItem("conserveMode", "on");
  } else {
    btn.innerText = "💧 Enable Conservation Mode";
    btn.style.background = "#38bdf8";
    txt.innerText = "";
    localStorage.setItem("conserveMode", "off");
  }
}

// === MAIN UPDATE LOOP ===
async function updateAll() {
  const d = await readSensorsLive();

  // Update card values
  document.getElementById("soilVal").innerText = `${d.soil}%`;
  document.getElementById("tempVal").innerText = `${d.temp}°C`;
  document.getElementById("humVal").innerText = `${d.hum}%`;
  document.getElementById("lightVal").innerText = `${d.light}`;
  document.getElementById("rainVal").innerText = d.rain ? "Yes" : "No";
  document.getElementById("waterVal").innerText = `${d.water}cm`;
  document.getElementById("lastUpdate").innerText = new Date().toLocaleTimeString();

  // Update charts
  pushSeries(sample.soil, d.soil);
  pushSeries(sample.temp, d.temp);
  pushSeries(sample.hum, d.hum);
  pushSeries(sample.light, d.light);

  const setDataset = (chart, series) => {
    chart.data.datasets[0].data = series.slice(-MAX_POINTS);
    chart.update();
  };
  setDataset(soilChart, sample.soil);
  setDataset(tempChart, sample.temp);
  setDataset(humChart, sample.hum);
  setDataset(lightChart, sample.light);

  // Alerts
  if (d.soil < 30) addAlert(`Soil low (${d.soil}%)`, "High");
  if (d.temp > 35) addAlert(`High temperature ${d.temp}°C`, "High");
  if (d.hum < 40) addAlert(`Low humidity ${d.hum}%`, "Medium");
  if (d.water < 20) addAlert(`Water tank low ${d.water}cm`, "Medium");
  if (d.rain) addAlert("Rain detected — irrigation paused", "Info");

  // Weather
  updateLocalWeather(d);

  // === Conservation Mode trigger logic ===
  const conserveBox = document.getElementById("conserveModeBox");
  if (conserveBox) {
    const thr = { water: 20 };
    const todayLow = d.water < thr.water;
    const rainComing = d.rain;

    if (todayLow && !rainComing) {
      conserveBox.style.display = "block";
      document.getElementById("conserveStatus").innerText =
        conservationActive
          ? "Conservation mode already active 🌿"
          : "Water low! Consider enabling conservation mode to save water 💧";
    } else {
      conserveBox.style.display = "none";
    }
  }
}

// === INIT ===
window.addEventListener("DOMContentLoaded", () => {
  initCharts();

  const btn = document.getElementById("conserveBtn");
  if (btn) btn.addEventListener("click", toggleConservation);

  const saved = localStorage.getItem("conserveMode");
  if (saved === "on") {
    conservationActive = true;
    toggleConservation(); // restore active state visually
  }

  updateAll();
  setInterval(updateAll, 4000);
});
