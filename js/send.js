/* ==========================================================
   send.js – Trang gửi thư (Cặp 2) · 3 bước
   1) Viết thư  : tên + lớp ở dòng 1, lời chúc từ dòng 2, hết giấy tự sang tờ mới
   2) Ảnh       : chọn ảnh, bấm Hoàn tất → ảnh lần lượt bay vào thiệp
   3) Đóng dấu  : bao bì mở ra → thư chui vào → nắp đóng lại
                  → GIỮ 1,5 giây để đóng dấu (1 con dấu duy nhất)
   Toàn bộ chuyển động dùng GSAP; CSS chỉ định hình.
   ========================================================== */

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig, cloudinaryConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const MAX_IMAGE_MB = 5;
const MAX_PHOTOS = 6;
const MAX_TEXT_SHEETS = 3;
const HOLD_SECONDS = 1.5;
const LAST_STEP = 2;

const PROMPTS = [
  "Nhập lời chúc mà bạn muốn gửi đến thầy cô giáo",
  "Thêm những tấm ảnh kỷ niệm",
  "Niêm phong lá thư bằng con dấu"
];

/* Kích thước thiết kế của lá thư + bao bì (đơn vị px thiết kế, được co lại cho vừa màn hình) */
const DESIGNS = {
  wide:   { cardW: 720, cardH: 410, envW: 520, envH: 250, envX: 100, envY: 150, rowsFirst: 9, rowsCont: 10 },
  narrow: { cardW: 420, cardH: 400, envW: 340, envH: 210, envX: 40,  envY: 180, rowsFirst: 9, rowsCont: 10 }
};
const mqNarrow = window.matchMedia("(max-width: 640px)"); // khớp với @media trong css/send.css

/* ---------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const stage       = $("#stage");
const stepsEl     = $("#steps");
const stepsFill   = $("#stepsFill");
const promptEl    = $("#prompt");
const sceneSlot   = $("#sceneSlot");
const sceneFit    = $("#sceneFit");
const sceneScale  = $("#sceneScale");
const scene       = $("#scene");
const stack       = $("#sheetstack");
const envBack     = $("#envBack");
const pocket      = $("#pocket");
const flap        = $("#flap");
const seal        = $("#seal");
const sealImg     = $("#sealImg");
const sealRipple  = $("#sealRipple");
const panels      = $$(".panel");
const panelsWrap  = $("#panels");
const actionsEl   = $("#actions");
const errorEl     = $("#formError");
const backBtn     = $("#backBtn");
const nextBtn     = $("#nextBtn");
const firstSheet  = $("#sheetFirst");
const firstTa     = $("#messageFirst");
const nameInput   = $("#senderName");
const classInput  = $("#senderClass");
const anonToggle  = $("#anonToggle");
const anonText    = $(".anon-text");
const pagerPrev   = $("#pagerPrev");
const pagerNext   = $("#pagerNext");
const pagerLabel  = $("#pagerLabel");
const imageInput  = $("#imageInput");
const dropBox     = $("#dropBox");
const thumbs      = $("#thumbs");
const photoCount  = $("#photoCount");
const holdBtn     = $("#holdBtn");
const holdFill    = $("#holdFill");
const holdTitle   = $("#holdTitle");
const holdHint    = $("#holdHint");
const modal       = $("#successModal");
const modalCard   = $(".success-card");
const lantern     = $(".success-lantern");
const writeAgain  = $("#writeAgain");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const T = (s) => (reduceMotion ? 0.01 : s);

/* Chờ timeline GSAP xong (không await trực tiếp vì timeline là "thenable") */
const play = (tl) =>
  tl.duration() === 0
    ? Promise.resolve()
    : new Promise((resolve) => tl.eventCallback("onComplete", resolve));
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const renderIcons = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };

/* ----------------------------------------------------------
   TRẠNG THÁI
   ---------------------------------------------------------- */
let D = mqNarrow.matches ? DESIGNS.narrow : DESIGNS.wide;
let k = 1;                               // hệ số co của cả khung thư
let step = 0;
let busy = false;
let sealed = false;
let sceneName = "letter";                // "letter" (chưa có bao bì) | "closed" (thư đã nằm trong bao bì)
let lanternTween = null;
let errTimer = null;

const photos = [];                       // { file, url, li }
const sheets = [];                       // { kind: 'text' | 'photos', el, ta? }
let cur = 0;                             // chỉ số tờ đang nằm trên cùng
let lastFull = "";                       // lời chúc hợp lệ gần nhất
let lastCaret = 0;
const ROT = [-3, 2.5, -1.5, 3, -2.5, 1.5];

/* ==========================================================
   CO KHUNG THƯ CHO VỪA 1 MÀN HÌNH
   ========================================================== */
function applyDesign() {
  D = mqNarrow.matches ? DESIGNS.narrow : DESIGNS.wide;
  const s = scene.style;
  s.setProperty("--card-w", D.cardW + "px");
  s.setProperty("--card-h", D.cardH + "px");
  s.setProperty("--env-x", D.envX + "px");
  s.setProperty("--env-y", D.envY + "px");
  s.setProperty("--env-w", D.envW + "px");
  s.setProperty("--env-h", D.envH + "px");
  s.setProperty("--rows-first", String(D.rowsFirst));
  s.setProperty("--rows-cont", String(D.rowsCont));
  sceneScale.style.width = D.cardW + "px";
  sceneScale.style.height = D.cardH + "px";
  fitScene();
}

function fitScene() {
  const w = sceneSlot.clientWidth;
  const h = sceneSlot.clientHeight - 16;   // trừ phần chừa phía trên (khớp .scene-fit trong CSS)
  k = Math.max(0.35, Math.min(1, w / D.cardW, (h - 4) / D.cardH));
  sceneFit.style.width = D.cardW * k + "px";
  sceneFit.style.height = D.cardH * k + "px";
  sceneScale.style.transform = `scale(${k})`;
}

/* ==========================================================
   HIỆU ỨNG NỀN
   ========================================================== */
function floatBlobs() {
  if (reduceMotion) return;
  $$(".blob").forEach((b) => {
    gsap.to(b, {
      x: gsap.utils.random(-40, 40),
      y: gsap.utils.random(-30, 30),
      duration: gsap.utils.random(6, 10),
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
  });
}

/* ==========================================================
   CẢNH: THƯ  ⇄  THƯ TRONG BAO BÌ
   - Mới vào: chỉ có lá thư, CHƯA có bao bì.
   - Sang bước đóng dấu: bao bì hiện ra (nắp mở) → thư thu nhỏ rồi chui vào
     → nắp đóng lại → hiện chỗ đóng dấu.
   Thư luôn nằm SAU mặt trước bao bì nên không bao giờ "lòi" ra ngoài.
   ========================================================== */
const letterScale = () => Math.min((D.envW - 40) / D.cardW, (D.envH - 26) / D.cardH);
const letterInsideY = () => D.envY + 14;
// sau khi đóng nắp, nâng cả bao bì lên giữa khung cho cân đối (chỉ dịch cả khối, không đụng tới thư)
const closedShiftY = () => -(D.envY + D.envH / 2 - D.cardH / 2) * k;

function syncFlapZ() {
  // nắp mở (ra sau) thì nằm dưới thư; nắp đóng thì nằm đè lên thư
  flap.style.zIndex = gsap.getProperty(flap, "rotationX") < 90 ? 8 : 2;
}

function setScene(name, instant = false) {
  const prev = sceneName;
  sceneName = name;
  const body = [envBack, pocket];

  if (instant) {
    if (name === "closed") {
      gsap.set(stack, { scale: letterScale(), y: letterInsideY(), autoAlpha: 0 }); // thư đã kín trong bao bì: ẩn hẳn để không ló viền/bóng ra ngoài
      gsap.set(body, { autoAlpha: 1, y: 0 });
      gsap.set(flap, { autoAlpha: 1, rotationX: 0, y: 0 });
      gsap.set(seal, { autoAlpha: 1 });
      gsap.set(sceneFit, { y: closedShiftY() });
    } else {
      gsap.set(sceneFit, { y: 0 });
      gsap.set(stack, { scale: 1, y: 0, autoAlpha: 1 });
      gsap.set([...body, flap, seal], { autoAlpha: 0 });
      gsap.set(flap, { rotationX: 180 });
    }
    syncFlapZ();
    return Promise.resolve();
  }

  if (name === prev) return Promise.resolve();

  const tl = gsap.timeline();

  if (name === "closed") {
    gsap.set(flap, { rotationX: 180, y: 0 });
    syncFlapZ();
    // gom các tờ lại cho gọn trước khi bỏ vào bao bì
    sheets.forEach((s, j) => {
      if (j !== cur) tl.to(s.el, { x: 0, y: 0, rotation: 0, scale: 1, duration: T(0.4), ease: "power2.out" }, 0);
    });
    tl.fromTo([envBack, pocket, flap], { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: T(0.55), ease: "power2.out" }, T(0.1))                       // 1) bao bì hiện ra, nắp đang mở
      .to(stack, { scale: letterScale(), duration: T(0.65), ease: "power3.inOut" }, 0)              // 2) thư thu nhỏ
      .to(stack, { y: letterInsideY(), duration: T(0.85), ease: "power2.inOut" }, T(0.75))          // 3) thư chui vào bao bì
      .to(flap, { rotationX: 0, duration: T(0.7), ease: "power2.inOut", onUpdate: syncFlapZ }, T(1.7)) // 4) nắp đóng lại
      .set(stack, { autoAlpha: 0 }, T(2.4))                                                          //    thư đã nằm kín bên trong → ẩn hẳn (không còn gì ló ra ngoài)
      .to(sceneFit, { y: closedShiftY(), duration: T(0.6), ease: "power2.inOut" }, T(2.4))           // 5) nâng bao bì lên giữa khung
      .to(seal, { autoAlpha: 1, duration: T(0.4) }, T(2.6));                                         // 6) hiện chỗ đóng dấu
  } else {
    tl.to(seal, { autoAlpha: 0, duration: T(0.25) }, 0)
      .to(sceneFit, { y: 0, duration: T(0.5), ease: "power2.inOut" }, 0)
      .set(stack, { autoAlpha: 1 }, T(0.5))                                                          // thư hiện lại ngay khi nắp bắt đầu mở
      .to(flap, { rotationX: 180, duration: T(0.6), ease: "power2.inOut", onUpdate: syncFlapZ }, T(0.5))
      .to(stack, { y: 0, duration: T(0.8), ease: "power2.inOut" }, T(1.1))
      .to(stack, { scale: 1, duration: T(0.6), ease: "power3.inOut" }, T(1.8))
      .to([envBack, pocket, flap], { autoAlpha: 0, y: 40, duration: T(0.5), ease: "power2.in" }, T(1.8));
  }
  return play(tl);
}

/* ==========================================================
   CÁC TỜ THIỆP
   ========================================================== */
const AHEAD = { x: 0, y: 90, rotation: 4, scale: 0.96, opacity: 0, zIndex: 0 };

function stateFor(j, i) {
  if (j === i) return { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 20 };
  if (j < i) {
    const d = i - j; // tờ cũ "đút" ra phía sau, nhô nhẹ lên trên-trái (không đè xuống khu điều khiển)
    return { x: -d * 12, y: -d * 6, rotation: -d * 1.4, scale: 1 - d * 0.012, opacity: 1, zIndex: 20 - d };
  }
  return AHEAD;
}

/* Đưa tờ i lên trên cùng: tờ cũ đút ra sau, tờ mới nhảy vào */
function showSheet(i, instant = false) {
  cur = i;
  const tl = gsap.timeline();
  sheets.forEach((item, j) => {
    item.el.inert = j !== i;
    const st = stateFor(j, i);
    if (instant) {
      gsap.set(item.el, st);
    } else {
      const entering = j === i;
      tl.to(item.el, {
        ...st,
        duration: T(entering ? 0.8 : 0.55),
        ease: entering ? "back.out(1.4)" : "power3.inOut"
      }, 0);
    }
  });
  refreshPager();
  return instant ? Promise.resolve() : play(tl);
}

const textSheets = () => sheets.filter((s) => s.kind === "text");

function refreshPager() {
  const total = textSheets().length;
  pagerLabel.textContent = `Tờ ${Math.min(cur + 1, total)}/${total}`;
  pagerPrev.disabled = cur <= 0;
  pagerNext.disabled = cur >= total - 1;
  sheets.forEach((item, idx) => {
    const no = $(".sheet-no", item.el);
    if (no) no.textContent = sheets.length > 1 ? `${idx + 1} / ${sheets.length}` : "";
  });
}

function makeTextSheet() {
  const el = document.createElement("article");
  el.className = "sheet sheet-cont";
  el.innerHTML =
    '<textarea class="ta" spellcheck="false" aria-label="Lời chúc (tờ tiếp theo)"></textarea>' +
    '<span class="sheet-no"></span>';
  stack.appendChild(el);
  gsap.set(el, AHEAD);
  el.inert = true;
  const item = { kind: "text", el, ta: $(".ta", el) };
  item.ta.readOnly = step !== 0;
  sheets.splice(textSheets().length, 0, item);
  bindTextarea(item);
  return item;
}

function ensureTextSheet(i) {
  while (textSheets().length <= i) makeTextSheet();
  return textSheets()[i];
}

function trimTextSheets(count) {
  const extra = textSheets().slice(count);
  extra.forEach((item) => {
    sheets.splice(sheets.indexOf(item), 1);
    gsap.to(item.el, { opacity: 0, y: 60, duration: T(0.3), onComplete: () => item.el.remove() });
  });
  if (extra.length) {
    cur = Math.min(cur, sheets.length - 1);
    refreshPager();
  }
}

/* ----- Chia lời chúc thành các tờ khi hết dòng ----- */
const fits = (ta) => ta.scrollHeight <= ta.clientHeight + 1;

function cutIndex(ta, text) {
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    ta.value = text.slice(0, mid);
    if (fits(ta)) lo = mid; else hi = mid - 1;
  }
  let cut = Math.max(lo, 1);
  if (cut < text.length && !/\s/.test(text[cut - 1]) && !/\s/.test(text[cut])) {
    const start = text.slice(0, cut).search(/\S+$/); // đầu của từ đang bị cắt đôi
    if (start > 0) cut = start;
  } else {
    while (cut < text.length && text[cut] === " ") cut++;
  }
  return cut;
}

/* Trả về false nếu vượt quá số tờ cho phép */
function layoutText(full) {
  let rest = full;
  let i = 0;
  for (;;) {
    if (i >= MAX_TEXT_SHEETS) return false;
    const { ta } = ensureTextSheet(i);
    if (ta.value !== rest) ta.value = rest;
    if (fits(ta)) break;
    const cut = cutIndex(ta, rest);
    ta.value = rest.slice(0, cut);
    rest = rest.slice(cut);
    i++;
  }
  trimTextSheets(i + 1);
  return true;
}

const getFull = () => textSheets().map((s) => s.ta.value).join("");

function offsetOf(i, pos) {
  let acc = 0;
  textSheets().slice(0, i).forEach((s) => (acc += s.ta.value.length));
  return acc + pos;
}

function applyCaret(g) {
  const list = textSheets();
  let acc = 0;
  for (let j = 0; j < list.length; j++) {
    const len = list[j].ta.value.length;
    if (g < acc + len || j === list.length - 1) {
      focusAt(j, Math.max(0, Math.min(g - acc, len)));
      return;
    }
    acc += len;
  }
}

function focusAt(j, pos) {
  if (j !== cur) showSheet(j);
  const ta = textSheets()[j].ta;
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(pos, pos);
}

function commitText(full, caret) {
  if (!layoutText(full)) {
    layoutText(lastFull);
    applyCaret(lastCaret);
    showError("Đã hết giấy rồi, bạn hãy rút gọn lời chúc một chút nhé.");
    return;
  }
  lastFull = full;
  lastCaret = caret;
  applyCaret(caret);
  refreshPager();
}

function bindTextarea(item) {
  const { ta } = item;

  const onType = () => {
    const i = sheets.indexOf(item);
    commitText(getFull(), offsetOf(i, ta.selectionStart));
  };

  ta.addEventListener("input", (e) => { if (!e.isComposing) onType(); });
  ta.addEventListener("compositionend", onType); // gõ Telex/VNI bằng bộ gõ của trình duyệt

  ta.addEventListener("keydown", (e) => {
    if (e.key !== "Backspace" || ta.selectionStart !== 0 || ta.selectionEnd !== 0) return;
    const i = sheets.indexOf(item);
    if (i <= 0) return;
    e.preventDefault();
    const g = offsetOf(i, 0);
    const full = getFull();
    commitText(full.slice(0, g - 1) + full.slice(g), g - 1);
  });
}

/* ==========================================================
   ĐỔI TRANG (câu dẫn, thanh tiến độ, khu điều khiển)
   ========================================================== */
function setPrompt(text, dir, instant = false) {
  if (instant) { promptEl.textContent = text; return; }
  gsap.to(promptEl, {
    y: -14 * dir, opacity: 0, duration: T(0.2), ease: "power2.in",
    onComplete: () => {
      promptEl.textContent = text;
      gsap.fromTo(promptEl, { y: 16 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: T(0.4), ease: "power3.out" });
    }
  });
}

function updateStepsUI(i, instant = false) {
  const items = $$("li", stepsEl);
  items.forEach((li, idx) => {
    li.classList.toggle("is-active", idx === i);
    li.classList.toggle("is-done", idx < i);
  });
  const progress = i / LAST_STEP;
  if (instant) {
    gsap.set(stepsFill, { scaleX: progress });
  } else {
    gsap.to(stepsFill, { scaleX: progress, duration: T(0.6), ease: "power2.inOut" });
    gsap.fromTo($(".dot", items[i]), { scale: 0.7 }, { scale: 1, duration: T(0.5), ease: "back.out(2.5)" });
  }
}

function showPanel(i, dir, instant = false) {
  panels.forEach((p, idx) => {
    p.inert = idx !== i;
    if (instant) {
      gsap.set(p, { autoAlpha: idx === i ? 1 : 0, x: 0 });
    } else if (idx === i) {
      gsap.fromTo(p, { autoAlpha: 0, x: 36 * dir }, { autoAlpha: 1, x: 0, duration: T(0.5), delay: T(0.15), ease: "power3.out" });
    } else if (gsap.getProperty(p, "autoAlpha") > 0) {
      gsap.to(p, { autoAlpha: 0, x: -36 * dir, duration: T(0.3), ease: "power2.in" });
    }
  });
}

function syncEditable() {
  const editable = step === 0;
  [nameInput, classInput].forEach((el) => {
    el.readOnly = !editable;
    el.tabIndex = editable ? 0 : -1;
  });
  textSheets().forEach(({ ta }) => {
    ta.readOnly = !editable;
    ta.tabIndex = editable ? 0 : -1;
  });
}

function refreshButtons() {
  backBtn.hidden = step === 0;
  nextBtn.hidden = step === LAST_STEP;
  $("span", nextBtn).textContent = step === 1 ? (photos.length ? "Hoàn tất" : "Bỏ qua") : "Tiếp tục";
  photoCount.textContent = `${photos.length}/${MAX_PHOTOS}`;
}

function focusEnd() {
  const item = sheets[cur];
  if (!item || item.kind !== "text") return;
  item.ta.focus({ preventScroll: true });
  const n = item.ta.value.length;
  item.ta.setSelectionRange(n, n);
}

function validate(from) {
  if (from === 0) {
    if (!anonToggle.checked && !nameInput.value.trim() && !classInput.value.trim()) {
      if (cur !== 0) showSheet(0);
      showError("Hãy nhập tên hoặc lớp của bạn (hoặc bật gửi ẩn danh).", nameInput);
      return false;
    }
    if (!getFull().trim()) {
      showError("Hãy viết vài dòng lời chúc trước khi sang bước tiếp theo nhé.", sheets[cur].ta);
      return false;
    }
  }
  return true;
}

async function go(to) {
  if (busy || to === step || to < 0 || to > LAST_STEP) return;
  if (to > step && !validate(step)) return;

  busy = true;
  hideError();
  const from = step;
  const dir = to > from ? 1 : -1;

  try {
    step = to;
    stage.dataset.step = String(to);
    syncEditable();
    updateStepsUI(to);
    refreshButtons();
    setPrompt(PROMPTS[to], dir);
    showPanel(to, dir);

    if (from === 2) { removePhotoSheet(); showSheet(cur); } // rời bước đóng dấu: tờ ảnh sẽ được đặt lại khi bấm Hoàn tất

    await setScene(to === 2 ? "closed" : "letter");
  } finally {
    busy = false;
  }

  if (to === 0 && from > 0) focusEnd();
}

/* ==========================================================
   THÔNG BÁO LỖI (nổi lên, tự tắt)
   ========================================================== */
function showError(message, focusEl) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  gsap.fromTo(errorEl, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: T(0.3), clearProps: "all" });
  gsap.fromTo(scene, { x: -8 }, { x: 0, duration: T(0.5), ease: "elastic.out(1, 0.3)", clearProps: "x" });
  if (focusEl) focusEl.focus({ preventScroll: true });
  clearTimeout(errTimer);
  errTimer = setTimeout(hideError, 4500);
}

function hideError() {
  clearTimeout(errTimer);
  errorEl.hidden = true;
  errorEl.textContent = "";
}

/* ==========================================================
   BƯỚC 1: TÊN, LỚP, ẨN DANH
   ========================================================== */
anonToggle.addEventListener("change", () => {
  firstSheet.classList.toggle("is-anon", anonToggle.checked);
  if (anonToggle.checked) {
    gsap.fromTo(anonText, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: T(0.35), ease: "power2.out" });
  } else {
    gsap.fromTo($(".line1", firstSheet), { opacity: 0.2 }, { opacity: 1, duration: T(0.35) });
  }
});

nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); classInput.focus(); } });
classInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); firstTa.focus({ preventScroll: true }); } });

pagerPrev.addEventListener("click", () => { showSheet(cur - 1); focusEnd(); });
pagerNext.addEventListener("click", () => { showSheet(cur + 1); focusEnd(); });

/* ==========================================================
   BƯỚC 2: ẢNH
   ========================================================== */
function addThumb(p) {
  const li = document.createElement("li");
  li.className = "thumb";
  const img = document.createElement("img");
  img.src = p.url;
  img.alt = "Ảnh đã chọn";
  const x = document.createElement("button");
  x.type = "button";
  x.className = "thumb-x";
  x.setAttribute("aria-label", "Xoá ảnh");
  x.innerHTML = '<i data-lucide="x">×</i>';
  li.append(img, x);
  thumbs.appendChild(li);
  renderIcons();
  p.li = li;
  gsap.from(li, { scale: 0.6, opacity: 0, duration: T(0.35), ease: "back.out(2)" });

  x.addEventListener("click", () => {
    const idx = photos.indexOf(p);
    if (idx < 0) return;
    photos.splice(idx, 1);
    URL.revokeObjectURL(p.url);
    gsap.to(li, { scale: 0.6, opacity: 0, duration: T(0.2), onComplete: () => li.remove() });
    refreshButtons();
  });
}

function addFiles(list) {
  hideError();
  for (const f of list) {
    if (photos.length >= MAX_PHOTOS) { showError(`Chỉ thêm được tối đa ${MAX_PHOTOS} ảnh.`); break; }
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { showError("Ảnh phải là định dạng JPG, PNG hoặc WebP."); continue; }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) { showError(`Ảnh "${f.name}" quá lớn (tối đa ${MAX_IMAGE_MB}MB).`); continue; }
    const p = { file: f, url: URL.createObjectURL(f) };
    photos.push(p);
    addThumb(p);
  }
  imageInput.value = "";
  refreshButtons();
}

imageInput.addEventListener("change", () => addFiles([...imageInput.files]));

["dragenter", "dragover"].forEach((ev) =>
  dropBox.addEventListener(ev, (e) => { e.preventDefault(); dropBox.classList.add("is-over"); }));
["dragleave", "drop"].forEach((ev) =>
  dropBox.addEventListener(ev, (e) => { e.preventDefault(); dropBox.classList.remove("is-over"); }));
dropBox.addEventListener("drop", (e) => addFiles([...e.dataTransfer.files]));

/* Tính cỡ ảnh polaroid sao cho TẤT CẢ ảnh nằm gọn trong tờ giấy (không tràn ra ngoài) */
function layoutPolaroids(wrap, n) {
  const GAP = 12;
  const PAD_X = 10;   // viền trắng trái + phải của polaroid
  const PAD_Y = 23;   // viền trắng trên + dưới
  const W = wrap.clientWidth;
  const H = wrap.clientHeight - 26; // trừ phần đệm dưới (chỗ số trang)
  let best = 60;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const w = (W - (cols - 1) * GAP) / cols;
    const h = (w - PAD_X) * 0.75 + PAD_Y;
    if (rows * h + (rows - 1) * GAP <= H) best = Math.max(best, w);
  }
  best = Math.floor(Math.min(best, 300));
  $$(".polaroid", wrap).forEach((f) => { f.style.width = best + "px"; });
}

function makePhotoSheet() {
  const el = document.createElement("article");
  el.className = "sheet sheet-photos";
  el.innerHTML =
    '<h3 class="photos-title">Kỷ niệm của chúng ta</h3>' +
    '<div class="polaroids"></div>' +
    '<span class="sheet-no"></span>';
  const wrap = $(".polaroids", el);
  photos.forEach((p, i) => {
    const fig = document.createElement("figure");
    fig.className = "polaroid";
    const img = document.createElement("img");
    img.src = p.url;
    img.alt = "";
    fig.appendChild(img);
    wrap.appendChild(fig);
    gsap.set(fig, { rotation: ROT[i % ROT.length], opacity: 0, scale: 1.1 });
  });
  stack.appendChild(el);
  layoutPolaroids(wrap, photos.length);
  gsap.set(el, AHEAD);
  el.inert = true;
  return { kind: "photos", el };
}

function removePhotoSheet() {
  const idx = sheets.findIndex((s) => s.kind === "photos");
  if (idx < 0) return;
  const [item] = sheets.splice(idx, 1);
  gsap.to(item.el, { opacity: 0, y: 60, duration: T(0.3), onComplete: () => item.el.remove() });
  cur = Math.min(cur, sheets.length - 1);
}

/* Bấm Hoàn tất: tờ ảnh nhảy vào, từng ảnh lần lượt bay từ khung chọn vào thiệp */
async function placePhotos() {
  removePhotoSheet();
  if (!photos.length) return;

  const item = makePhotoSheet();
  sheets.push(item);
  await showSheet(sheets.length - 1);

  const thumbEls = $$(".thumb", thumbs);
  const slots = $$(".polaroid", item.el);
  const GAP = T(0.45);
  const FLY = T(0.75);
  const tl = gsap.timeline();

  slots.forEach((slot, i) => {
    const src = thumbEls[i] && $("img", thumbEls[i]);
    const dst = $("img", slot);
    if (!src || !dst) { gsap.set(slot, { opacity: 1, scale: 1 }); return; }

    const a = src.getBoundingClientRect();
    const b = dst.getBoundingClientRect();
    const w = dst.offsetWidth * k;   // k = hệ số co của khung thư
    const h = dst.offsetHeight * k;

    const clone = document.createElement("img");
    clone.src = photos[i].url;
    clone.alt = "";
    clone.className = "fly";
    document.body.appendChild(clone);
    gsap.set(clone, { position: "fixed", left: 0, top: 0, margin: 0, zIndex: 50, x: a.left, y: a.top, width: a.width, height: a.height, rotation: 0 });

    tl.to(thumbEls[i], { opacity: 0.25, duration: T(0.2) }, i * GAP)
      .to(clone, {
        x: b.left + b.width / 2 - w / 2,
        y: b.top + b.height / 2 - h / 2,
        width: w,
        height: h,
        rotation: ROT[i % ROT.length],
        duration: FLY,
        ease: "power3.inOut"
      }, i * GAP)
      .add(() => {
        gsap.set(slot, { opacity: 1 });
        gsap.to(slot, { scale: 1, duration: T(0.3), ease: "back.out(2.2)" });
        clone.remove();
      }, i * GAP + FLY);
  });

  await play(tl);
  thumbEls.forEach((el) => gsap.set(el, { opacity: 1 }));
  await wait(T(0.5));
}

/* ==========================================================
   BƯỚC 3: GIỮ 1,5 GIÂY ĐỂ ĐÓNG DẤU
   ========================================================== */
const holdState = { p: 0 };
let holdTween = null;

function renderHold() {
  const p = holdState.p;
  gsap.set(holdFill, { scaleX: p });
  gsap.set(sealImg, { autoAlpha: 0.2 + 0.5 * p, scale: 0.88 + 0.12 * p, rotation: 0 }); // con dấu hiện dần theo thời gian giữ
}

function startHold() {
  if (sealed || busy || step !== LAST_STEP || holdTween) return;
  holdTween = gsap.to(holdState, {
    p: 1,
    duration: HOLD_SECONDS,
    ease: "none",
    onUpdate: renderHold,
    onComplete: () => { holdTween = null; completeSeal(); }
  });
}

function cancelHold() {
  if (!holdTween) return;
  holdTween.kill();
  holdTween = null;
  gsap.to(holdState, { p: 0, duration: 0.3, ease: "power2.out", onUpdate: renderHold });
}

holdBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (holdBtn.setPointerCapture) holdBtn.setPointerCapture(e.pointerId);
  startHold();
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => holdBtn.addEventListener(ev, cancelHold));
holdBtn.addEventListener("keydown", (e) => {
  if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startHold(); }
});
holdBtn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") cancelHold(); });
holdBtn.addEventListener("blur", cancelHold);
holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());

/* Ấn con dấu xuống */
function pressTimeline() {
  const tl = gsap.timeline();
  tl.set(sealImg, { autoAlpha: 0, scale: 1.9, rotation: -14 }, 0)
    .to(sealImg, { autoAlpha: 1, scale: 0.9, rotation: 0, duration: T(0.22), ease: "power4.in" }, 0)
    .to(scene, { y: 3, duration: T(0.06), yoyo: true, repeat: 1, ease: "power1.out" }, T(0.22))
    .to(sealImg, { scale: 1.06, duration: T(0.12), ease: "power2.out" }, T(0.22))
    .to(sealImg, { scale: 1, duration: T(0.3), ease: "elastic.out(1, 0.5)" }, T(0.34))
    .fromTo(sealRipple, { autoAlpha: 0.9, scale: 0.8 },
      { autoAlpha: 0, scale: 2.2, duration: T(0.9), ease: "power2.out" }, T(0.22))
    .to({}, { duration: T(0.45) });
  return tl;
}

function unsealTimeline() {
  const tl = gsap.timeline();
  tl.to(sealImg, { autoAlpha: 0.2, scale: 0.88, duration: T(0.3) })
    .add(() => { holdState.p = 0; renderHold(); });
  return tl;
}

function flyTimeline() {
  const tl = gsap.timeline();
  tl.to([$(".prompt-wrap"), $(".steps-wrap"), panelsWrap, actionsEl], { opacity: 0, duration: T(0.4) }, 0)
    .to(scene, { y: 8, scale: 0.97, duration: T(0.25), ease: "power1.out" }, 0)
    .to(scene, {
      y: -window.innerHeight * 1.1,
      scale: 0.45,
      rotation: 8,
      opacity: 0,
      duration: T(1.1),
      ease: "power2.in"
    });
  return tl;
}

function setSealingUI(on) {
  backBtn.disabled = on;
  holdBtn.disabled = on;
  holdTitle.textContent = on ? "Đang gửi lời chúc…" : "Đóng nến sáp";
  holdHint.textContent = on ? "Chờ một chút nhé" : "Nhấn giữ 1,5 giây";
}

async function completeSeal() {
  sealed = true;
  busy = true;
  hideError();
  setSealingUI(true);
  await play(pressTimeline());

  try {
    await saveWish(await buildWish());
  } catch (err) {
    console.error(err);
    await play(unsealTimeline());
    sealed = false;
    busy = false;
    setSealingUI(false);
    showError("Chưa gửi được lời chúc, bạn thử lại nhé.");
    return;
  }

  await play(flyTimeline());
  showSuccess();
}

/* ==========================================================
   GỬI DỮ LIỆU LÊN CLOUDINARY & FIREBASE
   ========================================================== */
function senderString() {
  if (anonToggle.checked) return "Ẩn danh";
  const n = nameInput.value.trim();
  const c = classInput.value.trim();
  if (n && c) return `${n} - ${c}`;
  if (n) return n;
  if (c) return `Tập thể lớp ${c}`;
  return "Học sinh giấu tên";
}

async function uploadImage(file) {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) return "";
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", cloudinaryConfig.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { method: "POST", body });
  if (!res.ok) throw new Error("Upload ảnh thất bại");
  const data = await res.json();
  return data.secure_url || "";
}

async function buildWish() {
  const urls = await Promise.all(photos.map((p) => uploadImage(p.file)));
  return {
    sender: senderString(),
    isAnonymous: anonToggle.checked,
    message: getFull().trim(),
    imageUrl: urls.filter(Boolean).join(","),
    timestamp: Date.now()
  };
}

async function saveWish(wish) {
  const newRef = push(ref(db, "pending_wishes"));
  await set(newRef, { id: newRef.key, ...wish });
}

/* ==========================================================
   THÔNG BÁO THÀNH CÔNG
   ========================================================== */
function showSuccess() {
  modal.hidden = false;
  gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: T(0.5) });
  gsap.fromTo(modalCard,
    { y: 24, scale: 0.96, opacity: 0 },
    { y: 0, scale: 1, opacity: 1, duration: T(0.6), delay: T(0.1), ease: "power3.out" });
  if (!reduceMotion) {
    lanternTween = gsap.to(lantern, { y: -8, duration: 1.6, ease: "sine.inOut", repeat: -1, yoyo: true });
  }
}

writeAgain.addEventListener("click", () => {
  if (lanternTween) lanternTween.kill();
  photos.forEach((p) => URL.revokeObjectURL(p.url));
  window.location.reload(); // bắt đầu lại một lá thư mới từ bước 1
});

/* ==========================================================
   NÚT ĐIỀU HƯỚNG
   ========================================================== */
backBtn.addEventListener("click", () => go(step - 1));

nextBtn.addEventListener("click", async () => {
  if (busy) return;
  if (step === 1) {
    busy = true;
    nextBtn.disabled = true;
    backBtn.disabled = true;
    try {
      await placePhotos();
    } finally {
      nextBtn.disabled = false;
      backBtn.disabled = false;
      busy = false;
    }
    go(2);
    return;
  }
  go(step + 1);
});

/* ==========================================================
   THAY ĐỔI KÍCH THƯỚC MÀN HÌNH
   ========================================================== */
if ("ResizeObserver" in window) new ResizeObserver(fitScene).observe(sceneSlot);
window.addEventListener("resize", fitScene);

function onDesignChange() {
  applyDesign();
  setScene(sceneName, true);
  const full = getFull();
  if (full && !layoutText(full)) layoutText(lastFull);
  showSheet(Math.min(cur, sheets.length - 1), true);
  refreshPager();
}
if (mqNarrow.addEventListener) mqNarrow.addEventListener("change", onDesignChange);

/* ==========================================================
   KHỞI ĐỘNG
   ========================================================== */
function init() {
  const DEADLINE = new Date("2026-11-21T00:00:00").getTime(); 
  if (Date.now() > DEADLINE) {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;font-family:sans-serif;background:#FFFBF2;color:#1E293B;">
        <h2 style="color:#9E0B0F;margin-bottom:10px;">Cổng gửi thư đã đóng!</h2>
        <p style="margin-bottom:24px;">Cảm ơn bạn đã quan tâm, thời gian nhận lời chúc đã kết thúc.</p>
        <a href="view.html" style="padding:12px 28px;background:#F59E0B;color:#fff;text-decoration:none;border-radius:999px;font-weight:bold;box-shadow:0 4px 12px rgba(245,158,11,0.3);">Đến Sổ Tri Ân</a>
      </div>
    `;
    return;
  }

  applyDesign();

  sheets.push({ kind: "text", el: firstSheet, ta: firstTa });
  bindTextarea(sheets[0]);

  // trạng thái ban đầu: chỉ có lá thư, chưa có bao bì, chưa có con dấu
  gsap.set(stack, { transformOrigin: "50% 0%" });
  gsap.set(flap, { transformPerspective: 1200, transformOrigin: "50% 0%", rotationX: 180, autoAlpha: 0, zIndex: 2 });
  gsap.set([envBack, pocket, seal], { autoAlpha: 0 });
  gsap.set(sealImg, { autoAlpha: 0.2, scale: 0.88 });
  gsap.set(sealRipple, { autoAlpha: 0 });

  setScene("letter", true);
  showSheet(0, true);
  showPanel(0, 1, true);
  updateStepsUI(0, true);
  syncEditable();
  refreshButtons();
  refreshPager();
  setPrompt(PROMPTS[0], 1, true);
  renderIcons();

  floatBlobs();

  // vào trang: các khối hiện lên, lá thư nổi lên (không còn chui xuyên bao bì)
  gsap.from([$(".steps-wrap"), $(".prompt-wrap"), panelsWrap, actionsEl], {
    y: 16, opacity: 0, duration: T(0.6), stagger: T(0.1), ease: "power2.out", clearProps: "opacity,y"
  });
  gsap.from(scene, { y: 40, opacity: 0, duration: T(0.8), delay: T(0.15), ease: "power3.out", clearProps: "opacity" });
}

(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);
