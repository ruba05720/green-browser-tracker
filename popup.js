// Capitalize first letter helper
function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Simple chart drawing without external libs (dual-line for CO2 & Energy)
function drawChart(labels, co2Data, energyData) {
  const canvas = document.getElementById("carbonChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 30;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  const maxVal = Math.max(...co2Data, ...energyData, 0.01);
  const stepX = chartWidth / (labels.length - 1 || 1);
  const scaleY = chartHeight / maxVal;

  // Draw grid lines
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#555";
  ctx.textAlign = "right";

  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    const val = (maxVal - (maxVal / 5) * i).toFixed(3);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
    ctx.fillText(val, padding - 5, y + 3);
  }

  // Draw CO2 line (green)
  ctx.beginPath();
  co2Data.forEach((val, i) => {
    const x = padding + stepX * i;
    const y = padding + chartHeight - val * scaleY;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw Energy line (blue)
  ctx.beginPath();
  energyData.forEach((val, i) => {
    const x = padding + stepX * i;
    const y = padding + chartHeight - val * scaleY;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#3498db";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw points for both lines
  co2Data.forEach((val, i) => {
    const x = padding + stepX * i;
    const y = padding + chartHeight - val * scaleY;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#27ae60";
    ctx.fill();
  });

  energyData.forEach((val, i) => {
    const x = padding + stepX * i;
    const y = padding + chartHeight - val * scaleY;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#2980b9";
    ctx.fill();
  });

  // Draw X-axis labels
  ctx.fillStyle = "#555";
  ctx.textAlign = "center";
  labels.forEach((label, i) => {
    const x = padding + stepX * i;
    ctx.fillText(label, x, canvas.height - padding + 12);
  });
}

// Load and calculate data
function updateDashboard() {
    chrome.storage.local.get("browsingData", (result) => {
        const data = result.browsingData || [];
        const today = new Date().toDateString();
        let todayCarbon = 0;
        let todayEnergy = 0;
        const dailyCO2 = {};
        const dailyEnergy = {};

        data.forEach((entry) => {
            const day = new Date(entry.timestamp).toDateString();
            const carbon = entry.carbonKg || 0;
            const energy = entry.energyKWh || 0;

            dailyCO2[day] = (dailyCO2[day] || 0) + carbon;
            dailyEnergy[day] = (dailyEnergy[day] || 0) + energy;

            if (day === today) {
                todayCarbon += carbon;
                todayEnergy += energy;
            }
        });

        document.getElementById("today-carbon").innerText = todayCarbon.toFixed(4) + " kg CO₂e";
        document.getElementById("today-energy").innerText = todayEnergy.toFixed(4) + " kWh";

        const allDays = Object.keys(dailyCO2).sort((a, b) => new Date(a) - new Date(b));
        const last7Days = allDays.slice(-7).map(d => d.split(" ").slice(1,3).join(" "));
        const co2Values = allDays.slice(-7).map(d => dailyCO2[d]);
        const energyValues = allDays.slice(-7).map(d => dailyEnergy[d]);

        drawChart(last7Days, co2Values, energyValues);

        const avgCO2 = co2Values.reduce((a,b)=>a+b,0)/co2Values.length;
        const forecastCO2 = avgCO2*365;
        document.getElementById("forecast-count").innerText = forecastCO2.toFixed(2) + " kg CO₂e";
        document.getElementById("trees").innerText = `≈ ${(forecastCO2/21).toFixed(1)} trees/year`;
    ;


// ====== Browsing Habits ======
    const siteStats = {};
    let totalTime = 0;
    data.forEach((entry) => {
      const url = entry.url || "";
      if (url.startsWith("chrome://") || url.includes("newtab")) return;
      let domain = url;
      try {
        if (url.includes("//"))
          domain = new URL(url).hostname.replace("www.", "");
      } catch (e) {}

      const time = entry.time || 0;
      const energy = entry.energyKWh || 0;

      if (!siteStats[domain])
        siteStats[domain] = { time: 0, energy: 0, visits: 0 };
      siteStats[domain].time += time;
      siteStats[domain].energy += energy;
      siteStats[domain].visits += 1;
      totalTime += time;
    });

    // Top Most Used Site
    const topUsedSite = Object.entries(siteStats).sort(
      (a, b) => b[1].visits - a[1].visits
    )[0];

    // Most Energy-Consuming Site
    const mostEnergySite = Object.entries(siteStats).sort(
      (a, b) => b[1].energy - a[1].energy
    )[0];

    // Average Screen Time (minutes/day)
    const avgTimeMin = (
    totalTime / (60 * (allDays.length || 1))
    ).toFixed(2);


    // Optimization Tip
    let optimizationTip = "";
    if (avgTimeMin > 60)
      optimizationTip =
        "Try reducing screen time — take short breaks or close unused tabs to cut energy use.";
    else if (mostEnergySite)
      optimizationTip = `Limit time on ${mostEnergySite[0]} — it's your most energy-consuming site.`;
    else
      optimizationTip =
        "Great job! Keep browsing efficiently to reduce CO₂ emissions.";

    // Update dashboard
    document.getElementById("top-used-site").innerText = topUsedSite
  ? `${capitalize(topUsedSite[0])} (${topUsedSite[1].visits} visits)`
  : "–";

document.getElementById("most-energy-site").innerText = mostEnergySite
  ? `${capitalize(mostEnergySite[0])} (${(mostEnergySite[1].energy * 1000).toFixed(2)} Wh)`
  : "–";

    document.getElementById("avg-screen-time").innerText =
      `${avgTimeMin} min/day`;
document.getElementById("optimization-tip").innerText = capitalize(optimizationTip);
      });
}


document.addEventListener("DOMContentLoaded", () => {
    updateDashboard();
    setInterval(updateDashboard, 5000);


    const downloadBtn = document.getElementById("download-csv");
    if(downloadBtn){
        downloadBtn.addEventListener("click", () => {
            chrome.storage.local.get("browsingData", (result) => {
                const data = result.browsingData || [];
                if(data.length === 0){
                    alert("No data to export");
                    return;
                }

                let csv = "URL,TimeSpent_ms,Timestamp,PageSize_bytes,Energy_kWh,Carbon_kg\n";
                data.forEach(entry => {
                    csv += [
                        entry.url || "",
                        entry.time || 0,
                        new Date(entry.timestamp).toISOString(),
                        entry.pageSize || 0,
                        entry.energyKWh?.toFixed(6) || 0,
                        entry.carbonKg?.toFixed(6) || 0
                    ].join(",") + "\n";
                });

                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = url;
                a.download = "browsing_data.csv";
                a.click();
                URL.revokeObjectURL(url);
            });
        });
    }
});


