/* ==========================================================================
   view.js - TRANG XEM THƯ "TRI ÂN THẦY CÔ 20/11"
   Nhánh: feature/view

   Cấu trúc file:
     [0] Cấu hình Firebase + dữ liệu mẫu
     [1] Tiện ích + Yêu thích / độ nổi bật
     [2] NightSky     - ánh sáng lấp lánh (canvas)
     [3] LanternField - phong thư xếp thành HÀNG, trôi chậm trái -> phải, không đè nhau
     [4] Đọc thư      - phong thư mở + lá thư PHÂN TRANG + Yêu thích + Toàn cảnh
     [5] Dữ liệu Firebase
     [6] Khởi động
   ========================================================================== */

/* ==========================================================================
   [0] CẤU HÌNH
   ========================================================================== */
const FIREBASE_SDK_VERSION = "10.8.0";
const WISHES_NODE = "wishes";
// Lượt Yêu thích lưu ở node RIÊNG "lights/{id} = số" (node "wishes" vẫn giữ đúng 6 trường theo rule).
// Giữ nguyên tên node "lights" để không mất dữ liệu cũ + không phải sửa Firebase Rules.
// Nếu muốn đổi tên thành "likes" thì sửa giá trị bên dưới (và sửa Rules tương ứng).
const LIKES_NODE = "lights";
const LIKED_KEY = "dtdt-liked-v1";      // localStorage: các thư máy này đã yêu thích (mỗi máy 1 lượt / thư)
const TOP_N = 3;                         // số thư "Top" có quầng sáng rất nhẹ

const DEMO_WISHES = [
  { id: "demo-1", sender: "Lớp 12A1", isAnonymous: false, imageUrl: "", timestamp: 1763100000000,
    message: "Chúng em kính chúc Thầy Cô luôn mạnh khỏe, hạnh phúc và tràn đầy niềm vui.\nCảm ơn Thầy Cô đã kiên nhẫn dìu dắt chúng em suốt những năm tháng qua. Mỗi bài giảng của Thầy Cô là một hành trang quý giá.\n\nCó những buổi chiều Thầy Cô ở lại thật muộn để giảng lại cho chúng em từng bài khó, có những lần Thầy Cô lặng lẽ động viên khi chúng em chán nản. Những điều nhỏ bé ấy, chúng em chưa bao giờ quên.\n\nNăm tháng rồi sẽ trôi qua, chúng em sẽ lớn lên và đi xa, nhưng hình ảnh Thầy Cô bên bục giảng sẽ mãi nằm trong trái tim mỗi người. Chúng em biết ơn Thầy Cô rất nhiều, và hứa sẽ cố gắng trở thành những người có ích để không phụ công ơn dạy dỗ.\n\nChúc quý Thầy Cô ngày 20/11 thật ý nghĩa, luôn tràn đầy sức khỏe và niềm vui trong nghề cao quý này!" },
  { id: "demo-2", sender: "", isAnonymous: true, imageUrl: "", timestamp: 1763100100000,
    message: "Em cảm ơn cô đã không bỏ rơi em những lúc em chán nản nhất. Chúc cô 20/11 thật nhiều hoa và nụ cười ạ!" },
  { id: "demo-3", sender: "Nguyễn Minh Anh", isAnonymous: false, imageUrl: "", timestamp: 1763100200000,
    message: "Tri ân thầy - người đã thắp lên trong em ngọn lửa đam mê với môn Toán." },
  { id: "demo-4", sender: "Tập thể lớp 11B3", isAnonymous: false, imageUrl: "", timestamp: 1763100300000,
    message: "Một nhành hoa, một lời chúc, một tấm lòng. Chúc quý Thầy Cô ngày Nhà giáo Việt Nam thật ý nghĩa và ấm áp!" },
  { id: "demo-5", sender: "Trần Bảo Ngọc", isAnonymous: false, imageUrl: "", timestamp: 1763100400000,
    message: "Cô ơi, em nhớ giờ Văn của cô lắm. Chúc cô luôn trẻ trung và yêu nghề mãi mãi." },
  { id: "demo-6", sender: "", isAnonymous: true, imageUrl: "", timestamp: 1763100500000,
    message: "Cảm ơn thầy vì bài học làm người mà không có trong sách giáo khoa." },
  { id: "demo-7", sender: "CLB Robotics", isAnonymous: false, imageUrl: "", timestamp: 1763100600000,
    message: "Chúc các Thầy Cô một mùa 20/11 tràn ngập yêu thương. Cảm ơn Thầy Cô đã luôn đồng hành cùng CLB chúng em!" },
  { id: "demo-8", sender: "Lê Hoàng Nam", isAnonymous: false, imageUrl: "", timestamp: 1763100700000,
    message: "Con đò đưa khách sang sông, thầy cô là người lái đò thầm lặng. Em biết ơn thầy cô rất nhiều." }
];

/* ==========================================================================
   [1] TIỆN ÍCH
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const hasGSAP = typeof window.gsap !== "undefined";
const reducedMotion = window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
  : false;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const rand = (min, max) => min + Math.random() * (max - min);
const isMobile = () => window.innerWidth < 640;

function lerpAngle(a, b, t) {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}

function displayName(w) {
  if (w.isAnonymous) return "Ẩn danh";
  const s = (w.sender || "").trim();
  return s || "Ẩn danh";
}

let toastTimer = 0;
function showToast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2800);
}

function setStatus(text) { $("#status").textContent = text || ""; }

/* ---------- Lượt Yêu thích + độ nổi bật ---------- */
const likeCounts = new Map();            // id -> tổng lượt yêu thích
let pushLike = null;                     // hàm ghi +1 lên Firebase (gán khi đã kết nối)

const likedSet = (() => {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")); }
  catch (e) { return new Set(); }
})();
let persistLiked = true;                 // demo: không lưu localStorage
function saveLiked() {
  if (!persistLiked) return;
  try { localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(likedSet))); } catch (e) { /* bỏ qua */ }
}

// heat: 0..1 theo thang log. Nhân thêm "độ tin cậy" để khi cả hội mới có 1-2 lượt thì chưa nổi bật hẳn lên.
const popularity = {
  max: 0,
  top: new Map(),
  recompute(wishes) {
    const ranked = wishes
      .map((w) => ({ id: w.id, c: likeCounts.get(w.id) || 0 }))
      .filter((x) => x.c > 0)
      .sort((a, b) => b.c - a.c);
    this.max = ranked.length ? ranked[0].c : 0;
    this.top = new Map();
    ranked.slice(0, TOP_N).forEach((x, i) => this.top.set(x.id, i + 1));
  },
  count(id) { return likeCounts.get(id) || 0; },
  heat(id) {
    const c = this.count(id);
    if (!c || !this.max) return 0;
    const confidence = Math.min(1, this.max / 6);
    return (Math.log1p(c) / Math.log1p(this.max)) * confidence;
  },
  rank(id) { return this.top.get(id) || 0; }
};

/* ==========================================================================
   [2] NightSky - ánh sáng lấp lánh (canvas 2D thuần)
   API: sky.update(dt) | sky.draw() | sky.resize() | sky.burst(x, y, n)
   ========================================================================== */
class NightSky {
  constructor(canvas, reduced) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reduced = reduced;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.time = 0;

    this.stars = [];
    this.flies = [];
    this.shooting = null;
    this.nextShoot = rand(4, 9);

    this.glow = this.makeGlowSprite();
    this.resize();
  }

  makeGlowSprite() {
    const s = 64;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, "rgba(253,230,138,1)");
    gr.addColorStop(0.25, "rgba(253,230,138,0.55)");
    gr.addColorStop(0.6, "rgba(245,158,11,0.14)");
    gr.addColorStop(1, "rgba(245,158,11,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    return c;
  }

  get ambientTarget() {
    if (this.reduced) return 12;
    return isMobile() ? 18 : 34;
  }
  get maxFlies() { return isMobile() ? 90 : 160; }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const want = clamp(Math.round((this.w * this.h) / 4500), 60, 520);
    while (this.stars.length < want) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.88,
        r: Math.random() < 0.12 ? rand(1.6, 2.2) : rand(0.6, 1.3),
        a: rand(0.35, 0.95),
        sp: rand(0.6, 2.2),
        ph: Math.random() * Math.PI * 2
      });
    }
    this.stars.length = want;

    let ambient = this.flies.filter((f) => !f.extra);
    while (ambient.length < this.ambientTarget) {
      const f = this.spawnFly(rand(0, this.w), rand(this.h * 0.3, this.h * 0.95), false, null);
      this.flies.push(f);
      ambient.push(f);
    }
    if (ambient.length > this.ambientTarget) {
      let remove = ambient.length - this.ambientTarget;
      this.flies = this.flies.filter((f) => f.extra || remove-- <= 0);
    }
  }

  spawnFly(x, y, extra, home) {
    return {
      x, y,
      a: Math.random() * Math.PI * 2,
      turn: rand(-0.6, 0.6),
      sp: rand(8, 22),
      size: rand(10, 24),
      ph: Math.random() * Math.PI * 2,
      pf: rand(0.8, 2.2),
      extra,
      home,
      born: this.time,
      ttl: extra ? 60 : Infinity
    };
  }

  burst(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = rand(24, 70);
      const f = this.spawnFly(x + Math.cos(ang) * r, y + Math.sin(ang) * r, true, { x, y });
      f.size = rand(14, 26);
      f.pf *= 1.25;
      this.flies.push(f);
    }
    while (this.flies.length > this.maxFlies) {
      const idx = this.flies.findIndex((f) => f.extra);
      if (idx < 0) break;
      this.flies.splice(idx, 1);
    }
  }

  update(dt) {
    this.time += dt;
    const k = this.reduced ? 0.35 : 1;

    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i];
      const age = this.time - f.born;
      if (age > f.ttl) { this.flies.splice(i, 1); continue; }

      f.turn = clamp(f.turn + (Math.random() - 0.5) * dt * 3, -1.2, 1.2);
      f.a += f.turn * dt;

      if (f.home && age < 14) {
        const dx = f.home.x - f.x, dy = f.home.y - f.y;
        if (Math.hypot(dx, dy) > 70) {
          f.a = lerpAngle(f.a, Math.atan2(dy, dx), Math.min(1, dt * 1.5));
        }
      }

      f.x += Math.cos(f.a) * f.sp * k * dt;
      f.y += Math.sin(f.a) * f.sp * k * dt;

      if (f.x < -30) f.x = this.w + 30;
      else if (f.x > this.w + 30) f.x = -30;
      const top = this.h * 0.22, bottom = this.h * 0.97;
      if (f.y < top) f.y += (top - f.y) * Math.min(1, dt * 2);
      else if (f.y > bottom) f.y -= (f.y - bottom) * Math.min(1, dt * 2);
    }

    if (!this.reduced) {
      this.nextShoot -= dt;
      if (this.nextShoot <= 0 && !this.shooting) {
        const fromLeft = Math.random() < 0.5;
        const speed = rand(520, 760);
        const ang = rand(0.35, 0.6);
        this.shooting = {
          x: fromLeft ? rand(0, this.w * 0.5) : rand(this.w * 0.5, this.w),
          y: rand(0, this.h * 0.3),
          vx: (fromLeft ? 1 : -1) * Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 0,
          max: rand(0.7, 1.1)
        };
        this.nextShoot = rand(7, 15);
      }
      if (this.shooting) {
        const s = this.shooting;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life += dt;
        if (s.life > s.max) this.shooting = null;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = "#F8FAFC";
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const tw = this.reduced ? 1 : 0.6 + 0.4 * Math.sin(this.time * s.sp + s.ph);
      ctx.globalAlpha = s.a * tw;
      ctx.fillRect(s.x * this.w, s.y * this.h, s.r, s.r);
    }

    if (this.shooting) {
      const s = this.shooting;
      const fade = 1 - s.life / s.max;
      const len = 90;
      const nx = s.vx / Math.hypot(s.vx, s.vy);
      const ny = s.vy / Math.hypot(s.vx, s.vy);
      const g = ctx.createLinearGradient(s.x, s.y, s.x - nx * len, s.y - ny * len);
      g.addColorStop(0, "rgba(248,250,252," + (0.9 * fade).toFixed(3) + ")");
      g.addColorStop(1, "rgba(248,250,252,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - nx * len, s.y - ny * len);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.flies.length; i++) {
      const f = this.flies[i];
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * f.pf + f.ph));
      let alpha = pulse;
      if (f.extra) {
        const left = f.ttl - (this.time - f.born);
        if (left < 5) alpha *= clamp(left / 5, 0, 1);
      }
      ctx.globalAlpha = alpha;
      const s = f.size;
      ctx.drawImage(this.glow, f.x - s / 2, f.y - s / 2, s, s);
      ctx.globalAlpha = Math.min(1, alpha + 0.15);
      ctx.fillStyle = "#FDE68A";
      ctx.fillRect(f.x - 0.8, f.y - 0.8, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

/* ==========================================================================
   [3] LanternField - PHONG THƯ XẾP THÀNH HÀNG, TRÔI CHẬM TRÁI -> PHẢI
   - Mỗi hàng (lane) có khoảng cách cố định giữa các thư và cùng 1 tốc độ
     => các thư KHÔNG BAO GIỜ đè lên nhau; các hàng cách nhau theo chiều dọc.
   - Thư trôi ra mép phải sẽ quay lại mép trái và nhận lời chúc mới.
   - Rê chuột vào 1 thư: cả hàng đó chậm lại để dễ bấm.
   - Thư được yêu thích nhiều chỉ to hơn tối đa ~9% và có quầng sáng rất nhẹ.
   ========================================================================== */
class LanternField {
  constructor(container, { reduced, onSelect }) {
    this.container = container;
    this.reduced = reduced;
    this.onSelect = onSelect;
    this.items = [];
    this.lanes = [];
    this.wishes = [];
    this.queue = [];
    this.sm = 1;
    this.grow = 0.09;
    this.paused = false;

    this.container.addEventListener("click", (e) => {
      const el = e.target.closest ? e.target.closest(".lantern") : null;
      if (el && el.__item && el.__item.wish) this.onSelect(el.__item.wish, el.__item);
    });
  }

  setWishes(list) {
    this.wishes = list;
    this.queue = [];
  }

  // Xáo trộn có trọng số: thư nhiều lượt yêu thích xuất hiện thường xuyên hơn một chút
  refillQueue() {
    this.queue = this.wishes
      .map((w) => ({ w, k: Math.pow(Math.random(), 1 / (1 + 2 * popularity.heat(w.id))) }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.w);
  }

  nextWish(self) {
    if (!this.wishes.length) return null;
    const onScreen = new Set();
    for (const it of this.items) if (it !== self && it.wish) onScreen.add(it.wish.id);
    const canAvoid = this.wishes.length > onScreen.size;
    for (let tries = 0; tries <= this.wishes.length; tries++) {
      if (!this.queue.length) this.refillQueue();
      const w = this.queue.pop();
      if (!canAvoid || !onScreen.has(w.id)) return w;
    }
    return this.wishes[0];
  }

  makeEl() {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "lantern";

    const halo = document.createElement("span");
    halo.className = "lantern-halo";
    const body = document.createElement("span");
    body.className = "lantern-body";
    const flame = document.createElement("span");
    flame.className = "lantern-flame";
    body.appendChild(flame);
    const name = document.createElement("span");
    name.className = "lantern-name";
    const likes = document.createElement("span");
    likes.className = "lantern-likes";
    likes.hidden = true;
    el.appendChild(halo);
    el.appendChild(body);
    el.appendChild(name);
    el.appendChild(likes);
    return { el, nameEl: name, likesEl: likes };
  }

  rebuild(panorama) {
    this.container.textContent = "";
    this.items = [];
    this.lanes = [];
    if (!this.wishes.length) { this.queue = []; return; }

    const w = window.innerWidth, h = window.innerHeight;
    const sm = panorama ? 0.62 : 1;
    this.sm = sm;
    this.grow = w < 640 ? 0.07 : 0.09;

    // --- Vùng chứa các hàng: dưới tiêu đề, trên 2 họa tiết góc dưới ---
    const miniW = clamp(w * 0.12, 104, 184);
    const bodyH = miniW * 2 / 3;
    const hero = $(".hero");
    const safeTop = 70;
    const top = panorama || !hero ? safeTop : Math.max(safeTop, hero.offsetTop + hero.offsetHeight + 10);
    const bottom = h - 56;
    const areaH = Math.max(120, bottom - top);

    const itemH = (bodyH + 54) * sm;                 // thân phong thư + tên + số tim
    const pitch = itemH * 1.18 + 10;
    const laneCount = clamp(Math.floor(areaH / pitch), 1, 7);
    const spacing = areaH / laneCount;

    // --- Khoảng cách ngang giữa các thư trong 1 hàng ---
    const minSlot = Math.max(miniW * 1.32, 136) * sm * 1.12;
    const perLaneCap = Math.max(3, Math.ceil((w + 2 * minSlot) / minSlot));
    const perLane = clamp(Math.ceil(this.wishes.length / laneCount), 3, perLaneCap);
    const L = w + 2 * minSlot;                        // chu vi vòng lặp của 1 hàng
    const slot = L / perLane;

    // Thư được yêu thích nhiều nhất luôn được thả sớm để chắc chắn có mặt
    this.refillQueue();
    const tops = Array.from(popularity.top.keys())
      .map((id) => this.wishes.find((x) => x.id === id))
      .filter(Boolean);
    this.queue = this.queue.filter((x) => !popularity.top.has(x.id)).concat(tops.reverse());

    for (let li = 0; li < laneCount; li++) {
      const lane = {
        y: top + li * spacing + Math.max(0, (spacing - itemH) / 2),
        speed: (this.reduced ? rand(12, 20) : rand(40, 65)),   // px / giây, trái -> phải
        k: 1,
        hover: false,
        L,
        right: w + minSlot,
        items: []
      };
      const off = (li % 2) * slot * 0.5 + rand(0, slot * 0.25);  // so le giữa các hàng như ảnh mẫu

      for (let j = 0; j < perLane; j++) {
        const parts = this.makeEl();
        const item = {
          el: parts.el, nameEl: parts.nameEl, likesEl: parts.likesEl,
          wish: null, lane,
          x: -minSlot + off + j * slot,
          s0: rand(0.96, 1.04),
          bobAmp: rand(2, 5),
          bobFreq: rand(0.3, 0.6),
          ph: Math.random() * Math.PI * 2,
          t: Math.random() * 100,
          heat: 0,
          hs: 0
        };
        parts.el.__item = item;
        parts.el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") lane.hover = true; });
        parts.el.addEventListener("pointerleave", () => { lane.hover = false; });

        this.assign(item);
        item.hs = item.heat;
        this.container.appendChild(parts.el);
        this.items.push(item);
        lane.items.push(item);
      }
      this.lanes.push(lane);
    }
    this.update(0, true);
  }

  assign(item) {
    const wish = this.nextWish(item);
    item.wish = wish;
    if (!wish) return;
    item.nameEl.textContent = displayName(wish);
    this.applyPopularity(item);
  }

  applyPopularity(item) {
    if (!item.wish) return;
    const id = item.wish.id;
    const n = popularity.count(id);
    const heat = popularity.heat(id);
    const rank = popularity.rank(id);
    item.heat = heat;

    item.el.style.setProperty("--glow", (heat * 6).toFixed(2));
    item.el.style.zIndex = String(5 + Math.round(heat * 10) + (rank ? 5 - rank : 0));
    item.el.classList.toggle("is-top", rank > 0 && heat > 0.25);

    item.likesEl.hidden = n === 0;
    item.likesEl.textContent = "♥ " + n;

    const name = displayName(item.wish);
    item.el.setAttribute("aria-label",
      "Mở lời chúc của " + name + (n ? " - " + n + " lượt yêu thích" : ""));
  }

  refreshPopularity() {
    for (const it of this.items) this.applyPopularity(it);
  }

  update(dt, force) {
    if (this.paused && !force) return;
    const sm = this.sm;

    for (let li = 0; li < this.lanes.length; li++) {
      const lane = this.lanes[li];
      lane.k += ((lane.hover ? 0.08 : 1) - lane.k) * Math.min(1, dt * 5);
      const dx = lane.speed * lane.k * dt;

      for (let i = 0; i < lane.items.length; i++) {
        const it = lane.items[i];
        it.x += dx;
        it.t += dt * lane.k;
        if (it.x > lane.right) {                      // trôi khỏi mép phải -> quay lại mép trái với lời chúc mới
          it.x -= lane.L;
          this.assign(it);
        }
        it.hs += (it.heat - it.hs) * Math.min(1, dt * 2.5);

        const y = lane.y + Math.sin(it.t * it.bobFreq + it.ph) * it.bobAmp;
        const scale = sm * it.s0 * (1 + this.grow * it.hs);
        it.el.style.transform =
          "translate3d(" + (it.x - 48).toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + scale.toFixed(3) + ")";
      }
    }
  }
}

/* ==========================================================================
   [4] ĐỌC THƯ + PHÂN TRANG + YÊU THÍCH + TOÀN CẢNH
   ========================================================================== */
const els = {
  overlay: $("#letter-overlay"),
  backdrop: $("#letter-backdrop"),
  stage: $(".letter-stage"),
  scene: $("#letter-scene"),
  wrap: $("#paper-wrap"),
  paper: $("#letter-paper"),
  viewport: $("#letter-viewport"),
  pages: $("#letter-pages"),
  pager: $("#letter-pager"),
  pagePrev: $("#page-prev"),
  pageNext: $("#page-next"),
  pageInfo: $("#page-info"),
  pagerDots: $("#pager-dots"),
  envBack: $("#env-back"),
  envFront: $("#env-front"),
  flap: $("#env-flap"),
  seal: $("#env-seal"),
  actions: $("#letter-actions"),
  message: $("#letter-message"),
  photo: $("#letter-photo"),
  sign: $("#letter-sign"),
  date: $("#letter-date"),
  btnBack: $("#btn-back"),
  btnLike: $("#btn-like"),
  likeLabel: $("#like-label"),
  likeCount: $("#like-count"),
  btnCopy: $("#btn-copy"),
  panoramaBtn: $("#panorama-btn"),
  panoramaLabel: $("#panorama-label"),
  codeForm: $("#code-form"),
  codeInput: $("#code-input"),
  count: $("#wish-count")
};

const state = {
  wishes: [],
  panorama: false,
  deepLinkHandled: false,
  needRebuild: false,
  letter: "closed",          // closed | opening | open | closing
  current: null,             // { wish, item }
  tl: null,
  lastFocus: null
};

const sky = new NightSky($("#sky-canvas"), reducedMotion);
const field = new LanternField($("#lantern-field"), {
  reduced: reducedMotion,
  onSelect: (wish, item) => openLetter(wish, item)
});

function rebuildField() {
  state.needRebuild = false;
  field.rebuild(state.panorama);
}

function wishLink(id) {
  return location.origin + location.pathname + "?id=" + encodeURIComponent(id);
}
function setUrlId(id) {
  try {
    const url = id ? "?id=" + encodeURIComponent(id) : location.pathname;
    history.replaceState(null, "", url);
  } catch (e) { /* mở bằng file:// có thể bị chặn - bỏ qua */ }
}

function isHttpUrl(u) { return typeof u === "string" && /^https?:\/\//i.test(u); }

/* ---------- Phân trang lá thư ----------
   Nội dung chảy theo các CỘT NGANG cao bằng khung thư (CSS multi-column).
   Mỗi cột là 1 trang; chuyển trang = trượt ngang kèm hiệu ứng mờ (CSS). */
const pager = { page: 0, pages: 1, gap: 40, stride: 0, dotsFor: 0 };

function layoutPages() {
  if (els.overlay.hidden) return;
  const vw = els.viewport.clientWidth;
  const vh = els.viewport.clientHeight;
  if (!vw || !vh) return;

  const inner = els.pages;
  inner.style.width = vw + "px";
  inner.style.height = vh + "px";
  inner.style.columnWidth = vw + "px";
  inner.style.columnGap = pager.gap + "px";

  pager.stride = vw + pager.gap;
  pager.pages = Math.max(1, Math.round((inner.scrollWidth + pager.gap) / pager.stride));
  pager.page = clamp(pager.page, 0, pager.pages - 1);
  applyPage(false);
}

let layoutRaf = 0;
function scheduleLayout() {
  cancelAnimationFrame(layoutRaf);
  layoutRaf = requestAnimationFrame(layoutPages);
}

function applyPage(animate) {
  const inner = els.pages;
  inner.classList.toggle("no-anim", !animate || reducedMotion);
  inner.style.transform = "translate3d(" + (-pager.page * pager.stride) + "px,0,0)";
  if (animate && !reducedMotion) {
    inner.classList.remove("is-turning");
    void inner.offsetWidth;
    inner.classList.add("is-turning");
  }
  updatePager();
}

function updatePager() {
  const multi = pager.pages > 1;
  els.pager.classList.toggle("is-single", !multi);
  els.pageInfo.textContent = (pager.page + 1) + " / " + pager.pages;
  els.pagePrev.disabled = pager.page <= 0;
  els.pageNext.disabled = pager.page >= pager.pages - 1;

  const showDots = multi && pager.pages <= 8;
  if (pager.dotsFor !== (showDots ? pager.pages : 0)) {
    els.pagerDots.textContent = "";
    if (showDots) {
      for (let i = 0; i < pager.pages; i++) {
        const d = document.createElement("span");
        d.className = "pager-dot";
        els.pagerDots.appendChild(d);
      }
    }
    pager.dotsFor = showDots ? pager.pages : 0;
  }
  Array.prototype.forEach.call(els.pagerDots.children, (d, i) => d.classList.toggle("is-active", i === pager.page));
}

function goPage(delta) {
  const n = clamp(pager.page + delta, 0, pager.pages - 1);
  if (n === pager.page) return;
  pager.page = n;
  applyPage(true);
}

if (window.ResizeObserver) new ResizeObserver(scheduleLayout).observe(els.viewport);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleLayout);

let touchX = 0, touchY = 0;
els.viewport.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  touchX = t.clientX; touchY = t.clientY;
}, { passive: true });
els.viewport.addEventListener("touchend", (e) => {
  if (state.letter !== "open") return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchX, dy = t.clientY - touchY;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) goPage(dx < 0 ? 1 : -1);
}, { passive: true });
els.pagePrev.addEventListener("click", () => goPage(-1));
els.pageNext.addEventListener("click", () => goPage(1));

/* ---------- Nội dung thư ---------- */
function fillLetter(w) {
  els.message.textContent = w.message;                       // textContent: chống chèn HTML/XSS
  els.sign.textContent = displayName(w);
  els.date.textContent = w.timestamp
    ? new Date(w.timestamp).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const urls = (w.imageUrl || "").split(",").map(s => s.trim()).filter(isHttpUrl);
  els.photo.innerHTML = "";

  if (urls.length > 0) {
    els.photo.hidden = false;
    urls.forEach(url => {
      const frame = document.createElement("div");
      frame.className = "photo-frame";
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Ảnh kỷ niệm đính kèm";
      img.decoding = "async";
      img.onerror = () => frame.remove();
      frame.appendChild(img);
      els.photo.appendChild(frame);
    });
  } else {
    els.photo.hidden = true;
  }

  pager.page = 0;
  updateLikeButton();
  layoutPages();
}

function updateLikeButton() {
  const id = state.current ? state.current.wish.id : null;
  const n = id ? popularity.count(id) : 0;
  const liked = id ? likedSet.has(id) : false;
  els.likeCount.textContent = String(n);
  els.likeCount.hidden = n === 0;
  if (els.likeLabel) els.likeLabel.textContent = liked ? "Đã yêu thích" : "Yêu thích";
  els.btnLike.classList.toggle("is-lit", liked);
  els.btnLike.setAttribute("aria-pressed", liked ? "true" : "false");
}

function lanternCenter(item) {
  if (item && item.el && item.el.isConnected) {
    const r = item.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.3 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
}

const ANIM_TARGETS = () => [els.backdrop, els.scene, els.wrap, els.paper, els.actions,
  els.envBack, els.envFront, els.flap, els.seal];

/* Hiệu ứng mở thư (≈3,3 giây, bấm vào lá thư để bỏ qua):
   1. Phong thư bay ra từ vị trí vừa bấm, dừng giữa màn hình
   2. Con dấu sáp phồng lên rồi vỡ
   3. Nắp phong thư lật mở
   4. Lá thư được rút lên khỏi phong thư
   5. Phong thư trượt sang trái và mờ dần; lá thư hạ về giữa
   Nội dung hiện dần từng dòng, cuối cùng là các nút */
function openLetter(wish, item) {
  if (state.letter !== "closed") return;
  try {
    openLetterAnimated(wish, item);
  } catch (err) {
    console.error("[view.js] Lỗi hiệu ứng mở thư -> mở thẳng:", err);
    if (state.tl) { state.tl.kill(); state.tl = null; }
    if (hasGSAP) gsap.set(ANIM_TARGETS().filter(Boolean), { clearProps: "all" });
    if (els.scene) els.scene.classList.add("is-read");
    if (els.wrap) els.wrap.classList.remove("is-tucked");
    if (state.current && !els.overlay.hidden) {
      state.letter = "open";
    } else {
      state.letter = "closed"; state.current = null; field.paused = false;
    }
  }
}

function openLetterAnimated(wish, item) {
  state.letter = "opening";
  state.current = { wish, item: item || null };
  state.lastFocus = document.activeElement;
  field.paused = true;

  els.overlay.hidden = false;                  // hiện trước để đo kích thước chia trang
  els.overlay.setAttribute("aria-hidden", "false");
  fillLetter(wish);
  setUrlId(wish.id);

  if (!hasGSAP || reducedMotion) {
    els.scene.classList.add("is-read");
    state.letter = "open";
    els.btnBack.focus({ preventScroll: true });
    return;
  }

  els.scene.classList.remove("is-read");
  els.wrap.classList.add("is-tucked");
  els.flap.classList.remove("is-open");
  gsap.set(ANIM_TARGETS(), { clearProps: "all" });

  const S = els.paper.offsetHeight;
  const E = els.envBack.offsetHeight;
  const W = els.scene.offsetWidth;
  const envTop = els.envBack.offsetTop;

  const tuckY = envTop + E * 0.14;
  const outY = envTop - S * 0.9 - 6;
  const drop = E * 0.9;

  const from = lanternCenter(item);
  const r = els.scene.getBoundingClientRect();
  const dx = from.x - (r.left + W / 2);
  const dy = from.y - (r.top + envTop + E / 2);

  gsap.set(els.flap, { rotateX: 0, transformPerspective: 900, transformOrigin: "50% 0%" });
  gsap.set(els.seal, { opacity: 1, scale: 1, rotation: 0 });
  gsap.set(els.paper, { y: tuckY, scale: 0.9, rotation: 0, transformOrigin: "50% 0%" });
  gsap.set(els.wrap, { zIndex: 2 });
  gsap.set(els.actions, { opacity: 0, y: 14 });
  const lines = Array.prototype.filter.call(els.pages.children, (c) => !c.hidden);
  gsap.set(lines, { opacity: 0, y: 10 });

  const tl = gsap.timeline({
    onComplete: () => {
      els.scene.classList.add("is-read");
      els.wrap.classList.remove("is-tucked");
      els.flap.classList.remove("is-open");
      gsap.set(ANIM_TARGETS().concat(lines), { clearProps: "all" });
      state.letter = "open";
      state.tl = null;
      scheduleLayout();
    }
  });
  state.tl = tl;

  tl.fromTo(els.backdrop, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0)
    .fromTo(els.scene,
      { x: dx, y: dy, scale: 0.16, rotation: -16, opacity: 0 },
      { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.85, ease: "power3.out" }, 0)
    .to(els.seal, { scale: 1.28, duration: 0.14, ease: "power1.out" }, 0.8)
    .to(els.seal, { scale: 0.15, opacity: 0, rotation: 50, duration: 0.28, ease: "back.in(2)" }, 0.94)
    .to(els.flap, { rotateX: 180, duration: 0.55, ease: "power2.inOut" }, 1.0)
    .call(() => els.flap.classList.add("is-open"), null, 1.27)
    .to(els.paper, { y: outY, duration: 0.85, ease: "power2.inOut" }, 1.5)
    .to([els.envBack, els.envFront, els.flap, els.seal, els.wrap], { y: drop, duration: 0.85, ease: "power2.inOut" }, 1.5)
    .call(() => {
      els.wrap.classList.remove("is-tucked");
      gsap.set(els.wrap, { zIndex: 6 });
    }, null, 2.35)
    .to([els.envBack, els.envFront, els.flap], {
      x: -W * 0.9, y: drop + 50, opacity: 0, duration: 0.8, ease: "power2.in"
    }, 2.38)
    .to(els.wrap, { y: 0, duration: 0.85, ease: "power3.inOut" }, 2.38)
    .to(els.paper, { y: 0, scale: 1, duration: 0.85, ease: "power3.inOut" }, 2.38)
    .to(els.paper, { rotation: -2.2, duration: 0.4, ease: "sine.out" }, 2.38)
    .to(els.paper, { rotation: 0, duration: 0.6, ease: "back.out(2.2)" }, 2.78)
    .to(lines, { opacity: 1, y: 0, duration: 0.45, stagger: 0.09, ease: "power1.out" }, 1.85)
    .to(els.actions, { opacity: 1, y: 0, duration: 0.4, ease: "power1.out" }, 3.05)
    .call(() => els.btnBack.focus({ preventScroll: true }), null, 3.1);
}

function finishClose() {
  els.overlay.hidden = true;
  els.overlay.setAttribute("aria-hidden", "true");
  if (hasGSAP) gsap.set(ANIM_TARGETS().filter(Boolean), { clearProps: "all" });
  els.scene.classList.add("is-read");
  els.wrap.classList.remove("is-tucked");

  state.letter = "closed";
  state.current = null;
  state.tl = null;
  field.paused = false;
  setUrlId("");

  if (state.needRebuild) rebuildField();   // dữ liệu / kích thước đã đổi trong lúc đang đọc thư

  const f = state.lastFocus;
  if (f && f.focus && f.isConnected) f.focus({ preventScroll: true });
}

function closeLetter() {
  if (state.letter !== "open" && state.letter !== "opening") return;
  if (state.tl) state.tl.progress(1);
  state.letter = "closing";

  if (!hasGSAP || reducedMotion) { finishClose(); return; }

  const item = state.current && state.current.item;
  const to = lanternCenter(item);
  const r = els.scene.getBoundingClientRect();
  const dx = to.x - (r.left + r.width / 2);
  const dy = to.y - (r.top + r.height / 2);

  const tl = gsap.timeline({
    onComplete: () => {
      if (item && item.el && item.el.isConnected) sky.burst(to.x, to.y, 3);
      finishClose();
    }
  });
  state.tl = tl;
  tl.to(els.actions, { opacity: 0, y: 10, duration: 0.2 }, 0)
    .to(els.paper, { scaleY: 0.3, transformOrigin: "50% 50%", duration: 0.3, ease: "power2.in" }, 0.05)
    .to(els.scene, { x: dx, y: dy, scale: 0.08, rotation: 14, opacity: 0, duration: 0.6, ease: "power2.in" }, 0.3)
    .to(els.backdrop, { opacity: 0, duration: 0.4 }, 0.4);
}

// Trái tim bay lên từ nút Yêu thích
function popHearts(anchor, n) {
  if (reducedMotion || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const colors = ["#C40000", "#FA6322", "#FF6A0B", "#FAB722"];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "heart-pop";
    s.textContent = "♥";
    s.style.left = cx + "px";
    s.style.top = cy + "px";
    s.style.color = colors[Math.floor(Math.random() * colors.length)];
    s.style.animationDelay = rand(0, 0.15).toFixed(2) + "s";
    s.style.setProperty("--dx", rand(-70, 70).toFixed(0) + "px");
    s.style.setProperty("--dy", rand(-130, -55).toFixed(0) + "px");
    s.style.setProperty("--s", rand(14, 26).toFixed(0) + "px");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }
}

// Yêu thích: mỗi máy 1 lượt / thư. Thư càng nhiều lượt càng nổi bật nhẹ trên bầu trời
async function likeWish() {
  if (!state.current) return;
  const { wish } = state.current;
  const already = likedSet.has(wish.id);

  popHearts(els.btnLike, already ? 3 : 9);
  els.btnLike.classList.remove("is-pulse");
  void els.btnLike.offsetWidth;
  els.btnLike.classList.add("is-pulse");

  if (already) { showToast("Bạn đã yêu thích lá thư này rồi ♥"); return; }

  likedSet.add(wish.id);
  saveLiked();
  likeCounts.set(wish.id, popularity.count(wish.id) + 1);
  onLikesChanged();

  if (!pushLike) return;                                      // chế độ demo: chỉ lưu cục bộ
  try {
    await pushLike(wish.id);
  } catch (err) {
    console.error("[view.js] Không ghi được lượt yêu thích:", err);
    likedSet.delete(wish.id);
    saveLiked();
    likeCounts.set(wish.id, Math.max(0, popularity.count(wish.id) - 1));
    onLikesChanged();
    showToast("Chưa yêu thích được, vui lòng thử lại");
  }
}

function onLikesChanged() {
  popularity.recompute(state.wishes);
  field.refreshPopularity();
  updateLikeButton();
}

async function copyLink() {
  if (!state.current) return;
  const link = wishLink(state.current.wish.id);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
    } else {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showToast("Đã sao chép liên kết lá thư");
  } catch (e) {
    showToast("Không sao chép được. Liên kết: " + link);
  }
}

function setPanorama(on) {
  state.panorama = on;
  document.body.classList.toggle("is-panorama", on);
  els.panoramaBtn.setAttribute("aria-pressed", on ? "true" : "false");
  els.panoramaLabel.textContent = on ? "Thu nhỏ" : "Toàn cảnh";
  if (state.letter === "closed") rebuildField(); else state.needRebuild = true;
}

function parseCode(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  try { return new URL(s).searchParams.get("id") || ""; } catch (e) { /* không phải URL */ }
  return s;
}
function openByCode(code) {
  const wish = state.wishes.find((w) => w.id === code);
  if (!wish) { showToast("Không tìm thấy thư với Mã Thư này"); return false; }
  if (state.letter === "closed") openLetter(wish, null);
  return true;
}

/* ---------- Sự kiện giao diện ---------- */
els.btnBack.addEventListener("click", closeLetter);
els.backdrop.addEventListener("click", closeLetter);
els.stage.addEventListener("click", () => {
  if (state.letter === "opening" && state.tl) state.tl.progress(1);
});
els.btnLike.addEventListener("click", likeWish);
els.btnCopy.addEventListener("click", copyLink);
els.panoramaBtn.addEventListener("click", () => setPanorama(!state.panorama));
els.codeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = parseCode(els.codeInput.value);
  if (code && openByCode(code)) els.codeInput.value = "";
});

function focusables() {
  return Array.prototype.filter.call(els.overlay.querySelectorAll("button"), (b) =>
    !b.disabled && b.getClientRects().length > 0 && getComputedStyle(b).visibility !== "hidden");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.letter === "open" || state.letter === "opening") closeLetter();
    else if (state.panorama) setPanorama(false);
    return;
  }
  if (state.letter === "open") {
    if (e.key === "ArrowRight") { goPage(1); return; }
    if (e.key === "ArrowLeft") { goPage(-1); return; }
  }
  if (e.key === "Tab" && state.letter !== "closed") {
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!els.overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }
});

let resizeTimer = 0;
let lastW = window.innerWidth, lastH = window.innerHeight;
window.addEventListener("resize", () => {
  sky.resize();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const w = window.innerWidth, h = window.innerHeight;
    // Thanh địa chỉ trên điện thoại co/giãn chỉ làm đổi chiều cao chút ít -> không dựng lại
    const changed = Math.abs(w - lastW) > 1 || Math.abs(h - lastH) > 80;
    lastW = w; lastH = h;
    if (!changed) return;
    if (state.letter === "closed") rebuildField(); else state.needRebuild = true;
  }, 250);
});

/* ==========================================================================
   [5] DỮ LIỆU - đọc node "wishes" (6 trường: id, sender, isAnonymous, message, imageUrl, timestamp)
   ========================================================================== */
async function loadFirebaseConfig() {
  try {
    const mod = await import("./config.js");
    const cfg = mod.firebaseConfig;
    if (cfg && cfg.apiKey && !/YOUR_/.test(String(cfg.apiKey))) return cfg;
  } catch (e) {
    console.warn("[view.js] Không đọc được js/config.js:", e);
  }
  return null;
}

function normalize(val) {
  if (!val || typeof val !== "object") return [];
  return Object.entries(val)
    .map(([key, v]) => {
      if (!v || typeof v !== "object") return null;
      const message = typeof v.message === "string" ? v.message.trim() : "";
      if (!message) return null;
      return {
        id: key,
        sender: typeof v.sender === "string" ? v.sender : "",
        isAnonymous: v.isAnonymous === true,
        message,
        imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : "",
        timestamp: Number(v.timestamp) || 0
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function applyWishes(list) {
  state.wishes = list;
  field.setWishes(list);
  popularity.recompute(list);
  if (state.current) updateLikeButton();

  if (!list.length) {
    setStatus("Chưa có lời tri ân nào. Hãy quay lại sau nhé!");
    els.count.textContent = "";
    field.rebuild(state.panorama);
  } else {
    setStatus("");
    els.count.textContent = "Đã có " + list.length + " lá thư được gửi đến";
    if (state.letter === "closed") rebuildField(); else state.needRebuild = true;
  }

  if (!state.deepLinkHandled && list.length) {
    state.deepLinkHandled = true;
    const id = new URLSearchParams(location.search).get("id");
    if (id) openByCode(id);
  }
}

async function connectData() {
  const demo = new URLSearchParams(location.search).get("demo") === "1";
  const FIREBASE_CONFIG = demo ? null : await loadFirebaseConfig();
  if (demo || !FIREBASE_CONFIG) {
    if (!demo) console.warn("[view.js] Chưa có config Firebase hợp lệ -> đang dùng dữ liệu mẫu.");
    persistLiked = false;
    likedSet.clear();
    applyWishes(DEMO_WISHES);
    showToast("Đang hiển thị dữ liệu mẫu");
    return;
  }

  try {
    const base = "https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/";
    const [appMod, dbMod] = await Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-database.js")
    ]);
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    const db = dbMod.getDatabase(app);

    dbMod.onValue(
      dbMod.ref(db, WISHES_NODE),
      (snap) => applyWishes(normalize(snap.val())),
      (err) => {
        console.error("[view.js] Firebase error:", err);
        if (!state.wishes.length) setStatus("Không tải được lời chúc. Vui lòng thử tải lại trang.");
      }
    );

    // Lượt Yêu thích: node riêng = { [id]: số }, cập nhật realtime cho mọi người xem
    dbMod.onValue(
      dbMod.ref(db, LIKES_NODE),
      (snap) => {
        const v = snap.val() || {};
        likeCounts.clear();
        Object.keys(v).forEach((id) => {
          const n = Math.floor(Number(v[id]));
          if (n > 0) likeCounts.set(id, n);
        });
        onLikesChanged();
      },
      (err) => console.warn("[view.js] Không đọc được lượt yêu thích:", err)
    );
    // Cộng 1 bằng transaction để nhiều người bấm cùng lúc không bị mất lượt
    pushLike = (id) => dbMod.runTransaction(
      dbMod.ref(db, LIKES_NODE + "/" + id),
      (cur) => (Number(cur) || 0) + 1
    );
  } catch (err) {
    console.error("[view.js] Không kết nối được Firebase:", err);
    setStatus("Không kết nối được máy chủ. Vui lòng kiểm tra mạng và tải lại trang.");
  }
}

/* ==========================================================================
   [6] KHỞI ĐỘNG
   ========================================================================== */
if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();

if (hasGSAP && !reducedMotion) {
  gsap.from(".hero > *", { opacity: 0, y: 18, duration: 1.2, stagger: 0.25, ease: "power2.out", delay: 0.2 });
}

// Font tải xong có thể làm tiêu đề đổi chiều cao -> xếp lại các hàng cho khỏi chạm tiêu đề
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    if (state.letter === "closed" && state.wishes.length) rebuildField();
  });
}

let lastTime = performance.now();
let rafId = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  sky.update(dt);
  sky.draw();
  field.update(dt);
  rafId = requestAnimationFrame(frame);
}
function startLoop() {
  cancelAnimationFrame(rafId);
  lastTime = performance.now();
  rafId = requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelAnimationFrame(rafId);
  else startLoop();
});

startLoop();
connectData();