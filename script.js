let video = document.getElementById("video")
let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d")

canvas.width = 200
canvas.height = 200

let values = []
let times = []
let beats = []

navigator.mediaDevices.getUserMedia({
video:{facingMode:"environment"}
})
.then(stream=>{
video.srcObject = stream
requestAnimationFrame(processFrame)
})

function processFrame(){

ctx.drawImage(video,0,0,200,200)

let frame = ctx.getImageData(0,0,200,200)

let sum = 0

for(let i=0;i<frame.data.length;i+=4){
sum += frame.data[i]
}

let avg = sum/(frame.data.length/4)

values.push(avg)
times.push(Date.now())

if(values.length>300){
values.shift()
times.shift()
}

detectBeat()

requestAnimationFrame(processFrame)
}

let lastBeat = 0

function detectBeat(){

if(values.length<20)return

let current = values[values.length-1]
let prev = values[values.length-2]

if(current > prev + 1.5){

let now = Date.now()

if(lastBeat !==0){

let interval = now-lastBeat

beats.push(interval)

if(beats.length>20){
beats.shift()
}

let bpm = 60000/interval

document.getElementById("bpm").innerText =
"BPM: "+bpm.toFixed(0)

checkVariability()

}

lastBeat = now
}
}

function checkVariability(){

if(beats.length<10)return

let mean = beats.reduce((a,b)=>a+b)/beats.length

let variance = beats.map(x=>Math.pow(x-mean,2))
.reduce((a,b)=>a+b)/beats.length

let sd = Math.sqrt(variance)

let variability = sd/mean

document.getElementById("rr").innerText =
"Variabilidad: "+variability.toFixed(2)

if(variability > 0.15){

document.getElementById("result").innerText =
"Ritmo irregular posible"

document.getElementById("result").style.color="orange"

}else{

document.getElementById("result").innerText =
"Ritmo regular"

document.getElementById("result").style.color="lightgreen"

}
}
