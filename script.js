// DrowsiGuard — Ocean Bubble Pro
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // Footer year + theme
  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");
  const savedTheme = localStorage.getItem("theme") || "dark";
  root.setAttribute("data-theme", savedTheme);
  themeToggle?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  // Page routers
  const page = document.body.getAttribute("data-page");

  // ===== Home page =====
  if (page === "index") {
    $("#howItWorks")?.addEventListener("click", () => {
      alert("Export Teachable Machine model → TensorFlow.js → copy the model.json URL → paste it on Monitor page.");
    });
  }

  // ===== Monitor page =====
  if (page === "monitor") {
    const statusBadge = $("#statusBadge");
    const modelUrlInput = $("#modelUrlInput");
    const predictionsEl = $("#predictions");
    const alertBox = $("#alert");
    const alertLog = $("#alertLog");
    const metaRes = $("#metaRes");
    const metaFps = $("#metaFps");
    const sessionTimeEl = $("#sessionTime");

    const startBtn = $("#startBtn");
    const stopBtn = $("#stopBtn");
    const pauseBtn = $("#pauseBtn");
    const muteBtn = $("#muteBtn");
    const fsBtn = $("#fsBtn");

    const video = $("#webcam");
    const overlay = $("#overlay");
    const ctx = overlay.getContext("2d");

    let model, maxPredictions = 0;
    let stream = null;
    let running = false;
    let muted = false;
    let paused = false;
    let raf = null;
    let lastFrameTime = performance.now();
    let fps = 0;

    // Stats
    let drowsyScores = [];
    let maxDrowsy = 0;
    let startTime = null;
    let chart, chartTs = 0;

    // Chart
    function initChart() {
      const ctxChart = document.getElementById("drowsyChart").getContext("2d");
      chart = new Chart(ctxChart, {
        type: "line",
        data: { labels: [], datasets: [
          { label: "Drowsy %", data: [], tension: .25 }
        ]},
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } },
          plugins: { legend: { display: false } }
        }
      });
    }

    function addChartPoint(val) {
      const now = Math.floor((Date.now() - startTime)/1000);
      if (!chart) return;
      chart.data.labels.push(now + "s");
      chart.data.datasets[0].data.push(val);
      if (chart.data.labels.length > 60) { // keep last 60s
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }
      chart.update();
    }

    // Storage for model URL
    modelUrlInput.value = localStorage.getItem("TM_MODEL_URL") || "";
    modelUrlInput.addEventListener("change", () => {
      localStorage.setItem("TM_MODEL_URL", modelUrlInput.value.trim());
    });

    // Alerts: voice + tone
    function speakAlert() {
      try {
        const utt = new SpeechSynthesisUtterance("Please awake and pull over immediately.");
        utt.rate = 1; utt.pitch = 1; utt.volume = 1;
        if (!muted) speechSynthesis.speak(utt);
      } catch {}
      if (!muted) beep();
      // Vibrate on mobile if available
      if (navigator.vibrate) navigator.vibrate([150, 100, 150]);
    }

    function beep() {
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = "sine"; o.frequency.value = 880;
        o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.001, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4);
        o.start(); o.stop(ac.currentTime + 0.42);
      } catch {}
    }

    function logAlert(prob) {
      const li = document.createElement("li");
      const t = new Date().toLocaleTimeString();
      li.textContent = `${t} — Drowsy ${Math.round(prob*100)}%`;
      alertLog.prepend(li);
    }

    function setStatus(s) { statusBadge.textContent = s; }
    function resizeCanvas() {
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
    }

    async function start() {
      try {
        const modelURL = (modelUrlInput.value || "").trim();
        if (!/^https?:\/\//i.test(modelURL) || !modelURL.endsWith("model.json")) {
          alertBox.hidden = false;
          alertBox.innerHTML = "<strong>Error:</strong> please paste a valid Teachable Machine <code>model.json</code> URL.";
          return;
        }
        localStorage.setItem("TM_MODEL_URL", modelURL);
        alertBox.hidden = true;

        // Load model
        setStatus("Loading model...");
        const metadataURL = modelURL.replace("model.json","metadata.json");
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Build predictions UI
        predictionsEl.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
          const li = document.createElement("li");
          li.innerHTML = `<span class="name"></span><div class="bar"><span></span></div><code class="pct">0%</code>`;
          predictionsEl.appendChild(li);
        }

        // Camera
        setStatus("Starting camera...");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"user" }, audio:false });
        video.srcObject = stream;
        await video.play();
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Reset stats/session
        drowsyScores = [];
        maxDrowsy = 0;
        startTime = Date.now();
        sessionTimeEl.textContent = "00:00";
        initChart();

        running = true; paused = false;
        startBtn.disabled = true; stopBtn.disabled = false; pauseBtn.disabled = false;
        setStatus("Running");
        loop();
      } catch (e) {
        console.error(e);
        setStatus("Error");
        alertBox.hidden = false;
        alertBox.innerHTML = "<strong>Error:</strong> " + (e.message || "Failed to start. Ensure HTTPS and camera permission.");
      }
    }

    function stop() {
      running = false; paused = false;
      startBtn.disabled = false; stopBtn.disabled = true; pauseBtn.disabled = true;
      cancelAnimationFrame(raf);
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      setStatus("Stopped");
      if (chart) { chart.destroy(); chart = null; }
      predictionsEl.innerHTML = "";
    }

    function pauseToggle() {
      if (!running) return;
      paused = !paused;
      pauseBtn.textContent = paused ? "Resume" : "Pause";
      setStatus(paused ? "Paused" : "Running");
    }

    function muteToggle() {
      muted = !muted;
      muteBtn.textContent = muted ? "Unmute" : "Mute";
    }

    function fullscreen() {
      const el = $(".camera-card");
      if (!document.fullscreenElement) el.requestFullscreen?.();
      else document.exitFullscreen?.();
    }

    function drawOverlay() {
      ctx.clearRect(0,0,overlay.width, overlay.height);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(79,212,255,0.8)";
      ctx.shadowColor = "rgba(0,188,212,0.9)";
      ctx.shadowBlur = 24;
      ctx.strokeRect(8,8,overlay.width-16, overlay.height-16);
    }

    function updateSessionTimer() {
      if (!startTime) return;
      const s = Math.floor((Date.now() - startTime)/1000);
      const m = Math.floor(s/60).toString().padStart(2,"0");
      const sec = (s%60).toString().padStart(2,"0");
      sessionTimeEl.textContent = `${m}:${sec}`;
    }

    async function loop() {
      raf = requestAnimationFrame(loop);
      if (!running || paused || video.readyState < 2) return;

      // FPS
      const now = performance.now();
      const dt = now - lastFrameTime;
      if (dt > 0) fps = 1000/dt;
      lastFrameTime = now;
      metaFps.textContent = Math.round(fps) + " FPS";
      metaRes.textContent = video.videoWidth + "×" + video.videoHeight;

      drawOverlay();
      updateSessionTimer();

      // Predict
      const preds = await model.predict(video);
      // Update UI
      const lis = $$(".predictions li");
      preds.forEach((p, i) => {
        const li = lis[i]; if (!li) return;
        li.querySelector(".name").textContent = p.className;
        const pct = Math.round(p.probability * 100);
        li.querySelector(".pct").textContent = pct + "%";
        li.querySelector(".bar > span").style.width = pct + "%";
      });

      // Simple drowsy class check
      const drows = preds.find(p => /drows/i.test(p.className));
      const drowsPct = drows ? Math.round(drows.probability * 100) : 0;
      drowsyScores.push(drowsPct);
      if (drowsyScores.length > 100) drowsyScores.shift();
      const avg = Math.round(drowsyScores.reduce((a,b)=>a+b,0) / drowsyScores.length);
      $("#avgDrowsyLevel").textContent = avg + "%";
      if (drowsPct > maxDrowsy) { maxDrowsy = drowsPct; $("#maxDrowsyLevel").textContent = maxDrowsy + "%"; }

      // Chart point ~10 times per second cap
      const t = performance.now();
      if (!chartTs || t - chartTs > 900) { addChartPoint(drowsPct); chartTs = t; }

      // Alert
      if (drowsPct >= 80) {
        alertBox.hidden = false;
        speakAlert();
        logAlert(drows?.probability || 0);
      } else {
        alertBox.hidden = true;
      }
    }

    // Bindings
    startBtn.addEventListener("click", start);
    stopBtn.addEventListener("click", stop);
    pauseBtn.addEventListener("click", pauseToggle);
    muteBtn.addEventListener("click", muteToggle);
    fsBtn.addEventListener("click", fullscreen);
  }
})();