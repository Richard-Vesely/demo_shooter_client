// IMPORTANT:
// Replace this with your Railway backend URL after deployment.
// Example: const SERVER_URL = "https://your-backend-production.up.railway.app";
const SERVER_URL = "demoshooterserver-production.up.railway.app";

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"]
});

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

let myId = null;
let world = { width: 1600, height: 900 };
let state = {
  players: {},
  bullets: []
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  angle: 0
};

const mouse = {
  x: 0,
  y: 0
};

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "w") input.up = true;
  if (key === "s") input.down = true;
  if (key === "a") input.left = true;
  if (key === "d") input.right = true;
});

window.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  if (key === "w") input.up = false;
  if (key === "s") input.down = false;
  if (key === "a") input.left = false;
  if (key === "d") input.right = false;
});

canvas.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", () => {
  socket.emit("shoot", { angle: input.angle });
});

socket.on("connect", () => {
  statusEl.textContent = "Connected";
});

socket.on("disconnect", () => {
  statusEl.textContent = "Disconnected";
});

socket.on("init", (data) => {
  myId = data.id;
  world = data.world;
});

socket.on("state", (serverState) => {
  state = serverState;
});

function sendInput() {
  const me = state.players[myId];
  if (me) {
    const camera = getCamera(me);
    const worldMouseX = mouse.x + camera.x;
    const worldMouseY = mouse.y + camera.y;
    input.angle = Math.atan2(worldMouseY - me.y, worldMouseX - me.x);
  }

  socket.emit("input", input);
}

setInterval(sendInput, 1000 / 30);

function getCamera(me) {
  const x = me.x - canvas.width / 2;
  const y = me.y - canvas.height / 2;
  return { x, y };
}

function drawGrid(camera) {
  const size = 80;
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;

  const startX = -((camera.x % size) + size) % size;
  const startY = -((camera.y % size) + size) % size;

  for (let x = startX; x < canvas.width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = startY; y < canvas.height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawWorldBounds(camera) {
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 4;
  ctx.strokeRect(-camera.x, -camera.y, world.width, world.height);
}

function drawPlayer(player, isMe, camera) {
  const x = player.x - camera.x;
  const y = player.y - camera.y;

  // body
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fillStyle = isMe ? "#4caf50" : "#2196f3";
  ctx.fill();

  // gun
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x + Math.cos(player.angle) * 28,
    y + Math.sin(player.angle) * 28
  );
  ctx.strokeStyle = "#f5f5f5";
  ctx.lineWidth = 5;
  ctx.stroke();

  // hp bar
  const hpWidth = 40;
  const hp = Math.max(0, player.hp) / 100;

  ctx.fillStyle = "#400";
  ctx.fillRect(x - hpWidth / 2, y - 32, hpWidth, 6);

  ctx.fillStyle = "#f44";
  ctx.fillRect(x - hpWidth / 2, y - 32, hpWidth * hp, 6);
}

function drawBullet(bullet, camera) {
  const x = bullet.x - camera.x;
  const y = bullet.y - camera.y;

  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd54f";
  ctx.fill();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const me = state.players[myId];
  const camera = me ? getCamera(me) : { x: 0, y: 0 };

  drawGrid(camera);
  drawWorldBounds(camera);

  for (const bullet of state.bullets) {
    drawBullet(bullet, camera);
  }

  for (const id in state.players) {
    drawPlayer(state.players[id], id === myId, camera);
  }

  requestAnimationFrame(render);
}

render();