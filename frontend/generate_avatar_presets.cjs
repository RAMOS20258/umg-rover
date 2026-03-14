const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const base = path.join(__dirname, "src/assets/avatar-presets");
const maleDir = path.join(base, "male");
const femaleDir = path.join(base, "female");

fs.mkdirSync(maleDir, { recursive: true });
fs.mkdirSync(femaleDir, { recursive: true });

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const skins = [
  "#ffe0bd",
  "#f1c27d",
  "#e0ac69",
  "#c68642",
  "#8d5524"
];

const hairs = [
  "#1a1a1a",
  "#5b3a29",
  "#c9b037",
  "#aaaaaa"
];

const clothes = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#f59e0b"
];

function drawAvatar(file, gender) {

  const canvas = createCanvas(512,512);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,512,512);

  const skin = random(skins);
  const hair = random(hairs);
  const cloth = random(clothes);

  // head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(256,150,90,0,Math.PI*2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(220,140,8,0,Math.PI*2);
  ctx.arc(292,140,8,0,Math.PI*2);
  ctx.fill();

  // smile
  ctx.beginPath();
  ctx.arc(256,165,30,0,Math.PI);
  ctx.stroke();

  // hair
  ctx.fillStyle = hair;

  if(gender==="male"){
    ctx.fillRect(166,60,180,70);
  }else{
    ctx.fillRect(140,60,230,70);
    ctx.fillRect(140,60,50,170);
    ctx.fillRect(320,60,50,170);
  }

  // body
  ctx.fillStyle = cloth;
  ctx.fillRect(180,240,150,200);

  fs.writeFileSync(file, canvas.toBuffer("image/png"));
}

for(let i=1;i<=12;i++){
  drawAvatar(path.join(maleDir,`male${i}.png`),"male");
  drawAvatar(path.join(femaleDir,`female${i}.png`),"female");
}

console.log("Avatares creados en src/assets/avatar-presets");