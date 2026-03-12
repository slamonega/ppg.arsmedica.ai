let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d", { willReadFrequently: true });

canvas.width = 200;
canvas.height = 200;

let values = [];
let times = [];
let beats = [];
let lastBeat = 0;

// Configuración de Chart.js
const ctxChart = document.getElementById('ppgChart').getContext('2d');
let chart = new Chart(ctxChart, {
    type: 'line',
    data: {
        labels: Array(100).fill(''),
        datasets: [{
            label: 'PPG',
            data: Array(100).fill(0),
            borderWidth: 2,
            pointRadius: 0,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.4
        }]
    },
    options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { display: false },
            y: { display: false }
        },
        plugins: {
            legend: { display: false }
        }
    }
});

function updateChart(value) {
    chart.data.datasets[0].data.push(value);
    chart.data.datasets[0].data.shift();
    chart.update();
}

// Acceso a la cámara
navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
})
.then(stream => {
    video.srcObject = stream;
    requestAnimationFrame(processFrame);
})
.catch(err => {
    console.error("Error al acceder a la cámara:", err);
    document.getElementById("result").innerText = "Error: Sin acceso a cámara";
});

function processFrame() {
    if (video.paused || video.ended) return;

    ctx.drawImage(video, 0, 0, 200, 200);
    let frame = ctx.getImageData(0, 0, 200, 200);
    let sum = 0;

    // Solo tomamos el canal rojo para PPG
    for (let i = 0; i < frame.data.length; i += 4) {
        sum += frame.data[i];
    }

    let avg = sum / (frame.data.length / 4);
    values.push(avg);
    times.push(Date.now());

    if (values.length > 300) {
        values.shift();
        times.shift();
    }

    detectBeat();
    updateChart(avg);
    updateQuality();

    requestAnimationFrame(processFrame);
}

function detectBeat() {
    if (values.length < 20) return;

    let current = values[values.length - 1];
    let prev = values[values.length - 2];

    // Detector de picos simple (mejorable con filtros digitales)
    if (current > prev + 1.2) {
        let now = Date.now();
        if (lastBeat !== 0) {
            let interval = now - lastBeat;
            
            // Filtro fisiológico básico (30-200 BPM)
            if (interval > 300 && interval < 2000) {
                beats.push(interval);
                if (beats.length > 20) beats.shift();

                let bpm = 60000 / interval;
                document.getElementById("bpm").innerText = bpm.toFixed(0);
                
                heartbeatAnimation();
                checkArrhythmia();
            }
        }
        lastBeat = now;
    }
}

function heartbeatAnimation() {
    let sensor = document.querySelector(".sensor-circle");
    sensor.classList.add("pulse");
    setTimeout(() => {
        sensor.classList.remove("pulse");
    }, 300);
}

function checkArrhythmia() {
    if (beats.length < 10) return;

    // 1. Variabilidad simple (SDNN/Mean)
    let mean = beats.reduce((a, b) => a + b) / beats.length;
    let variance = beats.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / beats.length;
    let sd = Math.sqrt(variance);
    let variability = sd / mean;
    document.getElementById("rr").innerText = variability.toFixed(2);

    // 2. RMSSD (Métrica clínica para irregularidad)
    let rmssd = calculateRMSSD(beats);
    
    // 3. Diagnóstico preliminar
    let resultElement = document.getElementById("result");
    if (rmssd > 80 || variability > 0.18) {
        resultElement.innerText = "Ritmo irregular posible";
        resultElement.style.color = "orange";
    } else {
        resultElement.innerText = "Ritmo regular detectado";
        resultElement.style.color = "lightgreen";
    }
}

function calculateRMSSD(rrIntervals) {
    if (rrIntervals.length < 2) return 0;
    let diffs = [];
    for (let i = 1; i < rrIntervals.length; i++) {
        let diff = rrIntervals[i] - rrIntervals[i - 1];
        diffs.push(diff * diff);
    }
    let mean = diffs.reduce((a, b) => a + b) / diffs.length;
    return Math.sqrt(mean);
}

function updateQuality() {
    if (values.length < 50) {
        document.getElementById("quality").innerText = "Analizando...";
        return;
    }
    
    let mean = values.reduce((a, b) => a + b) / values.length;
    let variance = values.map(x => (x - mean) * (x - mean)).reduce((a, b) => a + b) / values.length;
    let sd = Math.sqrt(variance);

    let qualityLabel = document.getElementById("quality");
    if (sd > 10) {
        qualityLabel.innerText = "Buena";
        qualityLabel.style.color = "lightgreen";
    } else if (sd > 4) {
        qualityLabel.innerText = "Media";
        qualityLabel.style.color = "orange";
    } else {
        qualityLabel.innerText = "Baja / Sin dedo";
        qualityLabel.style.color = "#9ca3af";
    }
}
