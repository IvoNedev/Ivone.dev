(() => {
"use strict";
const SAVE_KEY = "bureaucracy_sim_save_v1";
const MAX_TIME = 480;
const MAX_NOTIFICATIONS = 8;
const EEVIDENCE_DATE = "2026-08-18";
const TARGET_GROUP = "Kopeikin";
const TARGET_LOGO = "kopeikin.jpg";
const FIXED_GAG_IP = "192.168.0.2";
const IP_REVEAL_MODE = "random-lan"; // "random-lan" | "fixed"

const SNARKY_LINES = {
  en: [
    "Hmm, not too good at your job.",
    "Playing solitaire instead of working again?",
    "Bold strategy. Wrong button, though.",
    "Paperwork is hard, huh?",
    "That move is giving intern energy."
  ],
  bg: [
    "Хм, работата не върви особено.",
    "Пак пасианс вместо работа?",
    "Смел ход. Грешен бутон.",
    "Документите са трудни, а?",
    "Това мирише на стажантска грешка."
  ]
};

let STRINGS = (window.BUILTIN_STRINGS && typeof window.BUILTIN_STRINGS === "object")
  ? window.BUILTIN_STRINGS
  : { en: {}, bg: {} };

async function loadStrings() {
  try {
    const response = await fetch("lang.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load lang.json (status ${response.status}).`);
    }
    const data = await response.json();
    if (!data || typeof data !== "object" || !data.en || !data.bg) {
      throw new Error("lang.json must include top-level en and bg objects.");
    }
    STRINGS = data;
    return true;
  } catch (error) {
    const hasFallback = STRINGS && STRINGS.en && STRINGS.bg && Object.keys(STRINGS.en).length > 0;
    if (hasFallback) {
      return false;
    }
    throw error;
  }
}

const DOC_LIST = ["case", "comp", "mot", "pros", "court", "serve", "packet", "destroy", "reg"];
const DOC_LABEL_KEY = { case: "docCase", comp: "docComp", mot: "docMot", pros: "docPros", court: "docCourt", serve: "docServe", packet: "docPacket", destroy: "docDestroy", reg: "docReg" };

const JUDGES = ["judgeFormalist", "judgePragmatist", "judgeEuNerd", "judgeLunch"];
const OPERATORS = ["opStrict", "opFast", "opPort"];

const SCENARIOS = [
  { id: "kopeikinMinisterOrder", title: { en: "Minister orders Kopeikin admin IP by lunch", bg: "Министър иска IP на админа на Kopeikin до обяд" }, goal: { en: "Push an ISP mapping request for Kopeikin admin without proper chain.", bg: "Натиск за ISP справка за админа на Kopeikin без правилната верига." }, serviceType: "isp", jurisdiction: "bg", pressure: "high", emergency: false, serious: false, crossBorder: false, eevidence: false, euSensitive: true, defaultMonths: 2 },
  { id: "kopeikinCrossBorder", title: { en: "Kopeikin memes spread via cross-border platform", bg: "Меметата за Kopeikin се разпространяват през трансгранична платформа" }, goal: { en: "Identify Kopeikin admin login IP via a cross-border legal route.", bg: "Идентифицирай IP за вход на админа на Kopeikin чрез трансграничен законов ред." }, serviceType: "platform", jurisdiction: "eu", pressure: "high", emergency: false, serious: true, crossBorder: true, eevidence: false, euSensitive: true, defaultMonths: 2 },
  { id: "kopeikinDomesticPlatform", title: { en: "Domestic platform mirrors Kopeikin posts", bg: "Вътрешна платформа препубликува постове на Kopeikin" }, goal: { en: "Preserve and request local platform logs tied to Kopeikin admin access.", bg: "Запази и изискай локални логове, свързани с достъпа на админа на Kopeikin." }, serviceType: "platform", jurisdiction: "bg", pressure: "medium", emergency: false, serious: true, crossBorder: false, eevidence: false, euSensitive: false, defaultMonths: 3 },
  { id: "kopeikinCgnat", title: { en: "Kopeikin account suspected behind CGNAT hops", bg: "Профилът на Kopeikin е зад CGNAT хопове" }, goal: { en: "Trace Kopeikin admin source with IP + timestamp + port.", bg: "Проследи източника на админа с IP + време + порт." }, serviceType: "isp", jurisdiction: "bg", pressure: "medium", emergency: false, serious: true, crossBorder: false, eevidence: false, euSensitive: true, defaultMonths: 4 },
  { id: "kopeikinOverreach", title: { en: "Agency wants Kopeikin IP for reputation cleanup", bg: "Агенцията иска IP на Kopeikin за репутационен контрол" }, goal: { en: "Test if any legal threshold exists before touching Kopeikin-related data.", bg: "Провери има ли изобщо законов праг преди достъп до данни за Kopeikin." }, serviceType: "isp", jurisdiction: "bg", pressure: "high", emergency: false, serious: false, crossBorder: false, eevidence: false, euSensitive: true, defaultMonths: 2 },
  { id: "kopeikinHybrid", title: { en: "Kopeikin discussion moves to a hybrid chat service", bg: "Дискусията за Kopeikin се мести в хибридна чат услуга" }, goal: { en: "Classify service role correctly before requesting Kopeikin admin IP traces.", bg: "Класифицирай правилно услугата преди искане на IP следи за админа." }, serviceType: "hybrid", jurisdiction: "eu", pressure: "medium", emergency: false, serious: true, crossBorder: true, eevidence: false, euSensitive: true, defaultMonths: 2 },
  { id: "kopeikinFutureEE", title: { en: "Post-2026 drill: Kopeikin admin evidence route", bg: "След 2026: казус за e-Evidence по Kopeikin" }, goal: { en: "Use e-Evidence path to request Kopeikin admin IP-related records.", bg: "Използвай e-Evidence път за IP-свързани записи за админа на Kopeikin." }, serviceType: "platform", jurisdiction: "eu", pressure: "medium", emergency: false, serious: true, crossBorder: true, eevidence: true, euSensitive: false, defaultMonths: 1 },
  { id: "kopeikinOldWindow", title: { en: "Kopeikin request asks for data older than six months", bg: "Искането за Kopeikin е за данни по-стари от 6 месеца" }, goal: { en: "Repair scope before filing Kopeikin IP mapping request.", bg: "Поправи обхвата преди искането за IP съпоставка за Kopeikin." }, serviceType: "isp", jurisdiction: "bg", pressure: "medium", emergency: false, serious: true, crossBorder: false, eevidence: false, euSensitive: true, defaultMonths: 7 }
];

const EVENTS = [
  { id: "judge", key: "evJudge", once: false, when: (s) => !s.flags.hasCourt && s.turn > 1, fx: (s) => { s.meters.timeLeft = Math.max(0, s.meters.timeLeft - 30); } },
  { id: "leak", key: "evLeak", once: false, when: (s) => s.turn > 2, fx: (s) => { s.meters.trust = clamp(s.meters.trust - 20, 0, 100); s.meters.audit = clamp(s.meters.audit + 15, 0, 100); } },
  { id: "oversight", key: "evOversight", once: false, when: (s) => s.turn > 2 && !s.flags.registered, fx: (s) => { s.meters.legality = clamp(s.meters.legality - 10, 0, 100); } },
  { id: "timezone", key: "evTimezone", once: true, when: (s) => s.flags.served && !s.flags.timezoneAsked, fx: (s) => { s.flags.timezoneAsked = true; s.meters.timeLeft = Math.max(0, s.meters.timeLeft - 20); } },
  { id: "eu", key: "evEu", once: true, when: (s) => s.flags.hasCourt && s.case && s.case.euSensitive, fx: (s) => { s.flags.euChallenge = true; } },
  { id: "emergency", key: "evEmergency", once: true, when: (s) => s.flags.classified && !s.flags.emergencyUsed, fx: () => {} },
  { id: "nameDrop", key: "evNameDrop", once: true, when: (s) => !!s.case && s.turn > 0, fx: (s) => { s.meters.trust = clamp(s.meters.trust - 6, 0, 100); s.meters.audit = clamp(s.meters.audit + 8, 0, 100); } },
  { id: "memeStorm", key: "evMemeStorm", once: true, when: (s) => s.turn > 1, fx: (s) => { s.meters.timeLeft = Math.max(0, s.meters.timeLeft - 15); } },
  { id: "supportWave", key: "evSupportWave", once: true, when: (s) => s.turn > 2 && s.meters.trust < 65, fx: (s) => { s.meters.trust = clamp(s.meters.trust + 14, 0, 100); s.meters.audit = clamp(s.meters.audit - 6, 0, 100); } },
  { id: "selectiveTarget", key: "evSelectiveTarget", once: true, when: (s) => !!s.case && s.turn > 3, fx: (s) => { s.meters.legality = clamp(s.meters.legality - 4, 0, 100); s.meters.audit = clamp(s.meters.audit + 10, 0, 100); } }
];

const appEl = document.getElementById("app");
const titleEl = document.getElementById("appTitle");
const taglineEl = document.getElementById("appTagline");
const ipTrackerLabelEl = document.getElementById("ipTrackerLabel");
const ipTrackerValueEl = document.getElementById("ipTrackerValue");
const legendEl = document.getElementById("languageLegend");
const langEnBtn = document.getElementById("langEnBtn");
const langBgBtn = document.getElementById("langBgBtn");
const startOverBtn = document.getElementById("startOverBtn");
const settingsBtn = document.getElementById("quickSettingsBtn");
const notificationTitleEl = document.getElementById("notificationTitle");
const notificationListEl = document.getElementById("notificationList");
const clearNotificationsBtn = document.getElementById("clearNotificationsBtn");
const liveEl = document.getElementById("liveRegion");

let activeActionButton = null;
let state = loadState() || newState();

function newState() {
  return {
    lang: "bg",
    settings: { highContrast: false, reduceMotion: false, fontSize: 100 },
    screen: "menu",
    resume: "menu",
    prev: "menu",
    turn: 0,
    meters: { legality: 50, trust: 50, timeLeft: MAX_TIME, audit: 0 },
    inventory: [],
    case: null,
    months: 2,
    pendingClass: "isp",
    pendingInstrument: "domestic",
    instrument: null,
    usedEvents: [],
    notifications: [],
    ending: null,
    share: "",
    ipTarget: "",
    ipRevealed: 0,
    statusKey: "pending",
    statusText: "",
    flags: {
      classified: false,
      classType: null,
      misclassified: false,
      hasMot: false,
      hasPros: false,
      hasCourt: false,
      served: false,
      hasPacket: false,
      reviewed: false,
      keptAll: false,
      destroyed: false,
      registered: false,
      usedShortcut: false,
      caught: false,
      emergencyUsed: false,
      emergencyValid: false,
      euChallenge: false,
      timezoneAsked: false,
      timezoneDone: false
    }
  };
}
function resetRun() {
  const keep = { lang: state.lang, settings: { ...state.settings } };
  state = { ...newState(), ...keep };
}

function t(key) {
  return (STRINGS[state.lang] && STRINGS[state.lang][key]) || STRINGS.en[key] || key;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTrackedIp() {
  if (IP_REVEAL_MODE === "fixed") return FIXED_GAG_IP;
  return `192.168.${randInt(0, 254)}.${randInt(2, 254)}`;
}

function ipDigitCount(ip) {
  if (!ip) return 0;
  return [...ip].filter((ch) => ch !== ".").length;
}

function maskedIp(ip, revealedDigits) {
  if (!ip) return t("ipUnknown");
  const chars = [...ip];
  let leftToReveal = Math.max(0, revealedDigits);
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (chars[i] === ".") continue;
    if (leftToReveal > 0) {
      leftToReveal -= 1;
      continue;
    }
    chars[i] = "•";
  }
  return chars.join("");
}

function revealIp(step = 1) {
  if (!state.ipTarget) return;
  const maxDigits = ipDigitCount(state.ipTarget);
  state.ipRevealed = clamp(state.ipRevealed + step, 0, maxDigits);
}

function statusToKey(value) {
  if (!value || typeof value !== "string") return null;
  if ((STRINGS.en && STRINGS.en[value]) || (STRINGS[state.lang] && STRINGS[state.lang][value])) return value;
  const current = STRINGS[state.lang] || {};
  for (const [key, label] of Object.entries(current)) {
    if (label === value) return key;
  }
  const english = STRINGS.en || {};
  for (const [key, label] of Object.entries(english)) {
    if (label === value) return key;
  }
  return null;
}

function setStatus(value) {
  const key = statusToKey(value);
  if (key) {
    state.statusKey = key;
    state.statusText = "";
    return;
  }
  if (typeof value === "string" && value.trim()) {
    state.statusText = value;
    state.statusKey = "";
    return;
  }
  state.statusKey = "pending";
  state.statusText = "";
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function rnd(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pickCase() {
  const c = { ...rnd(SCENARIOS) };
  c.judge = rnd(JUDGES);
  c.operator = rnd(OPERATORS);
  return c;
}

function timeFmt(mins) {
  const h = Math.floor(Math.max(0, mins) / 60);
  const m = Math.max(0, mins) % 60;
  return `${h}${t("hoursAbbr")} ${m}${t("minutesAbbr")}`;
}

function setScreen(id) {
  if (id !== "settings" && id !== "menu") state.resume = id;
  state.screen = id;
}

function labelForDoc(id) {
  return t(DOC_LABEL_KEY[id]);
}

function addDoc(id) {
  if (!state.inventory.includes(id)) {
    state.inventory.push(id);
    state.inventory.sort((a, b) => DOC_LIST.indexOf(a) - DOC_LIST.indexOf(b));
  }
}

function adjust(delta) {
  state.meters.legality = clamp(state.meters.legality + (delta.legality || 0), 0, 100);
  state.meters.trust = clamp(state.meters.trust + (delta.trust || 0), 0, 100);
  state.meters.audit = clamp(state.meters.audit + (delta.audit || 0), 0, 100);
  state.meters.timeLeft = Math.max(0, state.meters.timeLeft - (delta.time || 0));
}

function formatNotificationTime() {
  const locale = state.lang === "bg" ? "bg-BG" : "en-US";
  return new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function renderNotifications() {
  if (!notificationTitleEl || !notificationListEl || !clearNotificationsBtn) return;
  notificationTitleEl.textContent = t("notificationsTitle");
  clearNotificationsBtn.textContent = t("notificationsClear");
  if (!state.notifications.length) {
    notificationListEl.innerHTML = `<li class="notification-item empty">${esc(t("notificationsEmpty"))}</li>`;
    return;
  }
  const item = state.notifications[0];
  notificationListEl.innerHTML = `<li class="notification-item ${esc(item.kind)}"><strong>${esc(item.message)}</strong><span class="notification-time">${esc(item.time)}</span></li>`;
}

function pushNotification(message, kind = "system") {
  state.notifications = [{
    message,
    kind,
    time: formatNotificationTime()
  }];
  liveEl.textContent = message;
  renderNotifications();
  persist();
}

function shakeActionButton() {
  if (!(activeActionButton instanceof HTMLElement)) return;
  activeActionButton.classList.remove("shake");
  void activeActionButton.offsetWidth;
  activeActionButton.classList.add("shake");
}

function blockedAction(requiredLabel) {
  const snarkPool = SNARKY_LINES[state.lang] || SNARKY_LINES.en;
  const snark = rnd(snarkPool);
  const message = `${snark} ${t("needsFirst")} ${requiredLabel}`;
  pushNotification(message, "snark");
  shakeActionButton();
}

function maybeEvent() {
  if (Math.random() > 0.36) return;
  const pool = EVENTS.filter((e) => (!e.once || !state.usedEvents.includes(e.id)) && e.when(state));
  if (!pool.length) return;
  const ev = rnd(pool);
  ev.fx(state);
  if (ev.once) state.usedEvents.push(ev.id);
  pushNotification(`${t("event")}: ${t(ev.key)}`, "event");
  setStatus(ev.key);
}

function spend(delta, status) {
  adjust(delta);
  state.turn += 1;
  if (status) setStatus(status);
  maybeEvent();
  revealIp(1);
  if (state.meters.timeLeft <= 0 && !state.ending) {
    revealIp(999);
    state.ending = "face";
    state.share = t("eFaceShare");
    setScreen("ending");
  }
  persist();
  render();
}

function startGame() {
  resetRun();
  state.case = pickCase();
  state.ipTarget = generateTrackedIp();
  state.ipRevealed = 0;
  state.months = state.case.defaultMonths;
  state.pendingClass = state.case.serviceType === "hybrid" ? "isp" : state.case.serviceType;
  state.pendingInstrument = state.case.crossBorder ? (state.case.eevidence ? "eevidence" : "eio") : "domestic";
  setStatus("caseKickoff");
  setScreen("draw");
  pushNotification(t("caseKickoff"), "event");
  persist();
  render();
}

function swapCase() {
  if (!state.case) state.case = pickCase();
  else {
    adjust({ time: 30, trust: -3 });
    state.case = pickCase();
  }
  state.ipTarget = generateTrackedIp();
  state.ipRevealed = 0;
  state.months = state.case.defaultMonths;
  state.pendingClass = state.case.serviceType === "hybrid" ? "isp" : state.case.serviceType;
  state.pendingInstrument = state.case.crossBorder ? (state.case.eevidence ? "eevidence" : "eio") : "domestic";
  setStatus("caseKickoff");
  pushNotification(t("caseKickoff"), "event");
  persist();
  render();
}

function classify() {
  const choice = state.pendingClass;
  state.flags.classified = true;
  state.flags.classType = choice;
  if (choice === "wild") {
    state.flags.usedShortcut = true;
    state.flags.caught = true;
    spend({ legality: -28, trust: -14, audit: 24, time: 10 }, t("scFail"));
    return;
  }
  if (state.case.serviceType !== "hybrid" && choice !== state.case.serviceType) {
    state.flags.misclassified = true;
    spend({ legality: -14, trust: -8, time: 25 }, t("judgeMis"));
  } else {
    state.flags.misclassified = false;
    spend({ legality: 9, trust: 3, time: 20 }, t("wfClassify"));
  }
  if (state.screen === "ending") return;
  if (choice === "platform") setScreen("instrument");
  else setScreen("workbench");
  persist();
  render();
}

function pickInstrument() {
  state.instrument = state.pendingInstrument;
  if (state.instrument === "letter") {
    state.flags.usedShortcut = true;
    state.flags.caught = true;
    spend({ legality: -24, trust: -18, audit: 26, time: 10 }, t("scFail"));
  } else if (state.instrument === "eevidence" && !state.case.eevidence) {
    spend({ legality: -10, trust: -3, time: 18 }, `${t("appliesFrom")}: ${EEVIDENCE_DATE}`);
  } else {
    spend({ legality: 4, trust: 1, time: 12 }, t("wfInstrument"));
  }
  if (state.screen === "ending") return;
  setScreen("workbench");
  persist();
  render();
}

function draft() {
  if (!state.flags.classified) {
    blockedAction(t("wfClassify"));
    return;
  }
  addDoc("case");
  addDoc("comp");
  addDoc("mot");
  addDoc("reg");
  state.flags.hasMot = true;
  state.flags.registered = true;
  spend({ legality: state.flags.misclassified ? -2 : 12, trust: state.flags.misclassified ? -2 : 3, time: 45 }, t("draftAct"));
}

function prosecutor() {
  if (!state.flags.hasMot) {
    blockedAction(t("draftAct"));
    return;
  }
  if (!state.case.serious) {
    spend({ legality: -10, trust: -6, time: 30 }, t("prosRefused"));
    return;
  }
  state.flags.hasPros = true;
  addDoc("pros");
  spend({ legality: 8, trust: 3, time: 35 }, t("prosOk"));
}

function submitJudge() {
  if (!state.flags.hasPros) {
    spend({ legality: -10, trust: -3, time: 20 }, t("judgeNoPros"));
    return;
  }
  if (state.months < 1 || state.months > 6) {
    spend({ legality: -12, trust: -4, time: 20 }, t("judgeWide"));
    return;
  }
  if (state.flags.misclassified) {
    spend({ legality: -8, trust: -3, time: 20 }, t("judgeMis"));
    return;
  }
  if (state.flags.classType === "isp" && !state.case.serious) {
    spend({ legality: -10, trust: -4, time: 20 }, t("judgeNonSerious"));
    return;
  }
  if (state.flags.classType === "platform" && state.instrument === "letter") {
    spend({ legality: -14, trust: -6, time: 20 }, t("judgeBadInstrument"));
    return;
  }
  if (state.flags.classType === "platform" && state.instrument === "eevidence" && !state.case.eevidence) {
    spend({ legality: -8, trust: -2, time: 20 }, `${t("appliesFrom")}: ${EEVIDENCE_DATE}`);
    return;
  }
  state.flags.hasCourt = true;
  addDoc("court");
  setScreen("workbench");
  spend({ legality: 14, trust: 5, time: 60 }, t("judgeOk"));
}

function serve() {
  if (!state.flags.classified) {
    blockedAction(t("wfClassify"));
    return;
  }
  const path = state.flags.classType;
  if (path === "isp") {
    if (!state.flags.hasCourt) {
      blockedAction(t("judgeAct"));
      return;
    }
    state.flags.served = true;
    addDoc("serve");
    spend({ legality: 6, trust: 2, time: 25 }, t("serveAct"));
    return;
  }
  if (path === "platform") {
    if (!state.instrument) {
      blockedAction(t("platformChoose"));
      return;
    }
    if (state.instrument === "letter") {
      state.flags.usedShortcut = true;
      state.flags.caught = true;
      spend({ legality: -30, trust: -20, audit: 30, time: 10 }, t("scFail"));
      return;
    }
    if (state.instrument === "domestic" && !state.flags.hasCourt) {
      blockedAction(t("judgeAct"));
      return;
    }
    if (state.instrument === "eevidence" && !state.case.eevidence) {
      spend({ legality: -10, trust: -3, time: 15 }, `${t("appliesFrom")}: ${EEVIDENCE_DATE}`);
      return;
    }
    state.flags.served = true;
    addDoc("serve");
    const extra = state.instrument === "eio" ? 40 : 15;
    spend({ legality: 5, trust: 2, time: 20 + extra }, t("serveAct"));
    return;
  }
  state.flags.caught = true;
  spend({ legality: -30, trust: -20, audit: 30, time: 10 }, t("scFail"));
}

function waitResponse() {
  if (!state.flags.served) {
    blockedAction(t("serveAct"));
    return;
  }
  if (state.flags.timezoneAsked && !state.flags.timezoneDone) {
    state.flags.timezoneDone = true;
    spend({ legality: -2, time: 20 }, t("evTimezone"));
    return;
  }
  if (!state.flags.hasCourt && state.flags.classType === "isp") {
    state.flags.caught = true;
    spend({ legality: -12, trust: -4, audit: 12, time: 20 }, t("opMissing"));
    return;
  }
  state.flags.hasPacket = true;
  addDoc("packet");
  const cost = state.flags.classType === "platform" && state.instrument === "eio" ? 95 : 60;
  spend({ legality: 10, trust: 4, time: cost }, t("opOk"));
}

function review(keepAll) {
  if (!state.flags.hasPacket) {
    blockedAction(t("docPacket"));
    return;
  }
  state.flags.reviewed = true;
  state.flags.keptAll = keepAll;
  if (keepAll) spend({ legality: -16, trust: -10, audit: 18, time: 20 }, t("reviewAll"));
  else spend({ legality: 12, trust: 6, time: 20 }, t("reviewKeep"));
  if (state.screen === "ending") return;
  setScreen("destroy");
  persist();
  render();
}

function destroy(skip) {
  if (!skip) {
    state.flags.destroyed = true;
    state.flags.keptAll = false;
    addDoc("destroy");
    spend({ legality: 10, trust: 4, time: 15 }, t("destroyDone"));
  } else {
    spend({ legality: -12, trust: -8, audit: 12, time: 8 }, t("destroySkip"));
  }
  finish();
}

function shortcut(type) {
  state.flags.usedShortcut = true;
  if (type === "noOrder") {
    state.flags.caught = true;
    spend({ legality: -28, trust: -14, audit: 24, time: 10 }, t("scFail"));
    return;
  }
  if (type === "fakeUrgent") {
    state.flags.emergencyUsed = true;
    if (state.case.emergency && state.flags.classType === "isp") {
      state.flags.emergencyValid = true;
      state.flags.hasCourt = true;
      addDoc("court");
      spend({ legality: 3, trust: -2, audit: 5, time: 15 }, t("evEmergency"));
      return;
    }
    state.flags.caught = true;
    spend({ legality: -26, trust: -10, audit: 25, time: 10 }, t("scFail"));
    return;
  }
  state.flags.caught = true;
  spend({ legality: -18, trust: -8, audit: 18, time: 8 }, t("scFail"));
}

function docsComplete() {
  return ["case", "comp", "mot", "pros", "court", "serve", "packet", "reg"].every((d) => state.inventory.includes(d));
}

function decideEnding() {
  const legalStack = docsComplete() && state.flags.destroyed && !state.flags.keptAll && !state.flags.misclassified && state.flags.classType !== "wild" && state.instrument !== "letter" && (!state.flags.usedShortcut || state.flags.emergencyValid);
  const shortcutFail = state.flags.caught || state.flags.classType === "wild" || state.instrument === "letter" || (state.flags.usedShortcut && !state.flags.emergencyValid);
  if (shortcutFail || state.meters.audit >= 70) return "scandal";
  if (legalStack && !state.flags.euChallenge && state.case.euSensitive && Math.random() < 0.55) state.flags.euChallenge = true;
  if (state.flags.euChallenge && legalStack && state.meters.legality >= 70) return "eu";
  if (legalStack && state.meters.legality >= 85) return "rule";
  return "face";
}

function finish() {
  revealIp(999);
  state.ending = decideEnding();
  if (state.ending === "rule") state.share = t("eRuleShare");
  if (state.ending === "face") state.share = t("eFaceShare");
  if (state.ending === "scandal") state.share = t("eScandalShare");
  if (state.ending === "eu") state.share = t("eEuShare");
  setScreen("ending");
  persist();
  render();
}
function serviceLabel(v) {
  if (v === "isp") return t("serviceISP");
  if (v === "platform") return t("servicePlatform");
  return t("serviceHybrid");
}

function jurLabel(v) {
  if (v === "bg") return t("jurBG");
  if (v === "eu") return t("jurEU");
  return t("jurThird");
}

function pressureLabel(v) {
  if (v === "low") return t("low");
  if (v === "medium") return t("medium");
  return t("high");
}

function meterClass(v) {
  if (v <= 30) return "bad";
  if (v <= 60) return "warn";
  return "";
}

function meterRow(label, valueText, pct, mood) {
  return `<div class="meter-row"><span class="meter-label">${esc(label)}</span><div class="meter-track"><div class="meter-fill ${mood}" style="width:${clamp(pct,0,100)}%"></div></div><span>${esc(valueText)}</span></div>`;
}

function renderMeters() {
  return `<div class="stats-grid">${
    meterRow(t("legality"), state.meters.legality, state.meters.legality, meterClass(state.meters.legality)) +
    meterRow(t("trust"), state.meters.trust, state.meters.trust, meterClass(state.meters.trust)) +
    meterRow(t("time"), timeFmt(state.meters.timeLeft), Math.round((state.meters.timeLeft / MAX_TIME) * 100), meterClass(Math.round((state.meters.timeLeft / MAX_TIME) * 100))) +
    meterRow(t("audit"), state.meters.audit, state.meters.audit, meterClass(100 - state.meters.audit))
  }</div>`;
}

function wfRows() {
  return [
    { label: t("wfClassify"), done: state.flags.classified, fail: state.flags.misclassified },
    { label: t("wfInstrument"), done: state.flags.classType !== "platform" || !!state.instrument, fail: state.flags.classType === "platform" && state.instrument === "letter" },
    { label: t("wfDraft"), done: state.flags.hasMot, fail: false },
    { label: t("wfPros"), done: state.flags.hasPros, fail: !state.case?.serious && state.turn > 1 },
    { label: t("wfJudge"), done: state.flags.hasCourt, fail: state.turn > 3 && !state.flags.hasCourt },
    { label: t("wfServe"), done: state.flags.served, fail: state.flags.caught && !state.flags.served },
    { label: t("wfWait"), done: state.flags.hasPacket, fail: false },
    { label: t("wfReview"), done: state.flags.reviewed, fail: state.flags.keptAll },
    { label: t("wfDestroy"), done: state.flags.destroyed, fail: state.flags.reviewed && !state.flags.destroyed }
  ];
}

function inventoryHtml() {
  if (!state.inventory.length) return `<li class="doc-chip">${esc(t("empty"))}</li>`;
  return state.inventory.map((id) => `<li class="doc-chip"><span class="stamp">OK</span> ${esc(labelForDoc(id))}</li>`).join("");
}

function radio(name, value, label, selected) {
  return `<label class="choice-card" for="${name}-${value}"><span><input id="${name}-${value}" type="radio" name="${name}" value="${value}" ${selected ? "checked" : ""}> ${esc(label)}</span></label>`;
}

function targetLogoHtml() {
  return `<figure class="target-logo"><img src="${esc(TARGET_LOGO)}" alt="${esc(t("targetLogoAlt"))}" loading="lazy" decoding="async"><figcaption>${esc(t("caseTarget"))}: ${esc(TARGET_GROUP)}</figcaption></figure>`;
}

function caseContextHtml() {
  return `<section class="context-panel"><h3>${esc(t("caseContextTitle"))}</h3><ul class="context-list"><li class="case-item">${esc(t("caseContext1"))}</li><li class="case-item">${esc(t("caseContext2"))}</li><li class="case-item">${esc(t("caseContext3"))}</li><li class="case-item">${esc(t("caseContext4"))}</li><li class="case-item">${esc(t("caseContext5"))}</li></ul></section>`;
}

function screenHtml() {
  if (state.screen === "menu") {
    return `<section class="screen panel"><h2>${esc(t("appTitle"))}</h2><p class="subtitle">${esc(t("appTagline"))}</p><div class="menu-grid stagger"><button class="primary-btn" data-action="start">${esc(t("start"))}</button><button class="secondary-btn" data-action="continue" ${state.case && !state.ending ? "" : "disabled"}>${esc(t("continue"))}</button><button class="ghost-btn" data-action="howto">${esc(t("howto"))}</button><button class="ghost-btn" data-action="settings">${esc(t("settings"))}</button><button class="danger-btn" data-action="reset">${esc(t("reset"))}</button></div><p class="subtitle">${esc(state.case && !state.ending ? "" : t("noSave"))}</p></section>`;
  }
  if (state.screen === "howto") {
    return `<section class="screen panel"><h2>${esc(t("howtoTitle"))}</h2><p>${esc(t("howtoBody"))}</p><div class="menu-grid"><button class="primary-btn" data-action="howto-ok">${esc(t("gotIt"))}</button><button class="ghost-btn" data-action="back-menu">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "settings") {
    return `<section class="screen panel"><h2>${esc(t("settingsTitle"))}</h2><div class="settings-grid"><label class="choice-card" for="highContrast"><input id="highContrast" type="checkbox" data-action="high-contrast" ${state.settings.highContrast ? "checked" : ""}><span>${esc(t("highContrast"))}</span></label><label class="choice-card" for="reduceMotion"><input id="reduceMotion" type="checkbox" data-action="reduce-motion" ${state.settings.reduceMotion ? "checked" : ""}><span>${esc(t("reduceMotion"))}</span></label><label class="choice-card range-wrap" for="fontSize"><span>${esc(t("fontSize"))}: ${state.settings.fontSize}%</span><input id="fontSize" type="range" min="85" max="125" step="5" value="${state.settings.fontSize}" data-action="font-size"></label></div><div class="menu-grid"><button class="ghost-btn" data-action="back-prev">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "draw" && state.case) {
    return `<section class="screen panel"><h2>${esc(t("caseDrawTitle"))}</h2><p class="subtitle">${esc(t("caseDrawSub"))}</p><div class="case-hero">${targetLogoHtml()}<ul class="case-list"><li class="case-item"><strong>${esc(state.case.title[state.lang])}</strong></li><li class="case-item"><strong>${esc(t("caseTarget"))}: ${esc(TARGET_GROUP)}</strong></li><li class="case-item">${esc(t("time"))}: ${esc(timeFmt(state.meters.timeLeft))}</li><li class="case-item">${esc(t("casePressure"))}: ${esc(pressureLabel(state.case.pressure))}</li></ul></div><div class="menu-grid"><button class="primary-btn" data-action="open-file">${esc(t("caseOpen"))}</button><button class="secondary-btn" data-action="swap-case">${esc(t("caseSwap"))}</button><button class="ghost-btn" data-action="back-menu">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "brief" && state.case) {
    return `<section class="screen panel"><h2>${esc(t("caseHeader"))}</h2><div class="case-hero">${targetLogoHtml()}<ul class="case-list"><li class="case-item"><strong>${esc(state.case.title[state.lang])}</strong></li><li class="case-item"><strong>${esc(t("caseTarget"))}: ${esc(TARGET_GROUP)}</strong></li><li class="case-item">${esc(t("caseService"))}: ${esc(serviceLabel(state.case.serviceType))}</li><li class="case-item">${esc(t("caseJur"))}: ${esc(jurLabel(state.case.jurisdiction))}</li><li class="case-item">${esc(t("caseGoal"))}: ${esc(state.case.goal[state.lang])}</li><li class="case-item">${esc(t("casePressure"))}: ${esc(pressureLabel(state.case.pressure))}</li><li class="case-item">${esc(t("caseEmergency"))}: ${esc(t(state.case.emergency ? "yes" : "no"))}</li><li class="case-item">${esc(t("caseSerious"))}: ${esc(t(state.case.serious ? "yes" : "no"))}</li><li class="case-item">${esc(t("caseJudge"))}: ${esc(t(state.case.judge))}</li><li class="case-item">${esc(t("caseOperator"))}: ${esc(t(state.case.operator))}</li></ul></div>${caseContextHtml()}<p class="subtitle">${esc(t("caseHint"))}</p><div class="menu-grid"><button class="primary-btn" data-action="to-workbench">${esc(t("toWorkbench"))}</button><button class="ghost-btn" data-action="back-draw">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "workbench") {
    const wf = wfRows().map((r) => `<li class="${r.fail ? "step-item fail" : r.done ? "step-item done" : "step-item"}">${esc(r.label)} <span class="status-pill ${r.fail ? "bad" : r.done ? "good" : ""}">${esc(r.fail ? t("failed") : r.done ? t("done") : t("pending"))}</span></li>`).join("");
    const canFinish = state.flags.hasPacket || state.flags.caught || state.meters.timeLeft <= 0;
    return `<section class="screen panel-grid stagger"><article class="panel"><h2>${esc(t("wbHeader"))}</h2><p class="subtitle">${esc(state.case ? `${state.case.title[state.lang]} | ${t("caseTarget")}: ${TARGET_GROUP}` : "")}</p><h3>${esc(t("meters"))}</h3>${renderMeters()}<h3>${esc(t("inventory"))}</h3><ul class="inventory-list">${inventoryHtml()}</ul></article><article class="panel"><h3>${esc(t("workflow"))}</h3><ul class="workflow-list">${wf}</ul><h3>${esc(t("actions"))}</h3><div class="action-grid"><button class="secondary-btn" data-action="open-classify">${esc(t("classifyAct"))}</button><button class="ghost-btn" data-action="open-instrument" ${state.flags.classType === "platform" ? "" : "disabled"}>${esc(t("instrumentAct"))}</button><button class="primary-btn" data-action="do-draft">${esc(t("draftAct"))}</button><button class="ghost-btn" data-action="do-pros">${esc(t("prosAct"))}</button><button class="ghost-btn" data-action="open-judge">${esc(t("judgeAct"))}</button><button class="ghost-btn" data-action="do-serve">${esc(t("serveAct"))}</button><button class="ghost-btn" data-action="do-wait">${esc(t("waitAct"))}</button><button class="ghost-btn" data-action="open-review">${esc(t("reviewAct"))}</button><button class="danger-btn" data-action="open-shortcut">${esc(t("shortcutAct"))}</button><button class="secondary-btn" data-action="finalize" ${canFinish ? "" : "disabled"}>${esc(t("finalizeAct"))}</button></div><h3>${esc(t("status"))}</h3><p>${esc(state.statusKey ? t(state.statusKey) : (state.statusText || t("pending")))}</p></article></section>`;
  }
  if (state.screen === "classify") {
    return `<section class="screen panel"><h2>${esc(t("classifyTitle"))}</h2><div class="choice-grid">${radio("classification", "isp", t("classifyISP"), state.pendingClass === "isp")}${radio("classification", "platform", t("classifyPlatform"), state.pendingClass === "platform")}${radio("classification", "wild", t("classifyWild"), state.pendingClass === "wild")}</div><div class="menu-grid"><button class="primary-btn" data-action="confirm-classify">${esc(t("confirm"))}</button><button class="ghost-btn" data-action="back-workbench">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "instrument") {
    const rec = state.case && state.case.crossBorder ? (state.case.eevidence ? "eevidence" : "eio") : "domestic";
    const card = (v, label) => `<label class="choice-card" for="instrument-${v}"><span><input id="instrument-${v}" type="radio" name="instrument" value="${v}" ${state.pendingInstrument === v ? "checked" : ""}> ${esc(label)}</span>${rec === v ? `<span class=\"status-pill good\">${esc(t("recommended"))}</span>` : ""}</label>`;
    return `<section class="screen panel"><h2>${esc(t("platformTitle"))}</h2><p class="subtitle">${esc(t("platformNote"))}</p><p class="subtitle">${esc(t("appliesFrom"))}: ${EEVIDENCE_DATE}</p><div class="choice-grid">${card("domestic", t("platformDomestic"))}${card("eio", t("platformEIO"))}${card("eevidence", t("platformEE"))}${card("letter", t("platformLetter"))}</div><div class="menu-grid"><button class="primary-btn" data-action="confirm-instrument">${esc(t("confirm"))}</button><button class="ghost-btn" data-action="back-workbench">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "judge") {
    return `<section class="screen panel"><h2>${esc(t("judgeTitle"))}</h2><p class="subtitle">${esc(t("judgeMax"))}</p><div class="field-row"><label for="months">${esc(t("judgeMonths"))}</label><input id="months" type="number" min="1" max="12" step="1" value="${state.months}" data-action="months"></div><div class="menu-grid"><button class="primary-btn" data-action="submit-judge">${esc(t("judgeAct"))}</button><button class="ghost-btn" data-action="back-workbench">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "review") {
    return `<section class="screen panel"><h2>${esc(t("reviewTitle"))}</h2><p>${esc(t("reviewBody"))}</p><div class="menu-grid"><button class="primary-btn" data-action="review-keep">${esc(t("reviewKeep"))}</button><button class="danger-btn" data-action="review-all">${esc(t("reviewAll"))}</button><button class="ghost-btn" data-action="back-workbench">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "destroy") {
    return `<section class="screen panel"><h2>${esc(t("destroyTitle"))}</h2><p>${esc(t("destroyBody"))}</p><div class="menu-grid"><button class="primary-btn" data-action="destroy-now">${esc(t("destroyNow"))}</button><button class="danger-btn" data-action="destroy-skip">${esc(t("destroySkip"))}</button><button class="ghost-btn" data-action="back-workbench">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "shortcut") {
    return `<section class="screen panel"><h2>${esc(t("shortcutTitle"))}</h2><div class="menu-grid"><button class="danger-btn" data-action="sc-no-order">${esc(t("scNoOrder"))}</button><button class="danger-btn" data-action="sc-fake-urgent">${esc(t("scFakeUrgent"))}</button><button class="danger-btn" data-action="sc-pressure">${esc(t("scPressure"))}</button><button class="ghost-btn" data-action="back-workbench">${esc(t("back"))}</button></div></section>`;
  }
  if (state.screen === "ending") {
    const map = {
      rule: { title: t("eRuleTitle"), body: t("eRuleBody"), share: t("eRuleShare") },
      face: { title: t("eFaceTitle"), body: t("eFaceBody"), share: t("eFaceShare") },
      scandal: { title: t("eScandalTitle"), body: t("eScandalBody"), share: t("eScandalShare") },
      eu: { title: t("eEuTitle"), body: t("eEuBody"), share: t("eEuShare") }
    };
    const e = map[state.ending || "face"];
    return `<section class="screen panel"><h2>${esc(t("outcome"))}</h2><article class="end-card"><h3>${esc(e.title)}</h3><p>${esc(e.body)}</p><div class="score-grid"><div class="score-row"><span>${esc(t("legality"))}</span><strong>${state.meters.legality}</strong></div><div class="score-row"><span>${esc(t("trust"))}</span><strong>${state.meters.trust}</strong></div><div class="score-row"><span>${esc(t("time"))}</span><strong>${esc(timeFmt(state.meters.timeLeft))}</strong></div><div class="score-row"><span>${esc(t("audit"))}</span><strong>${state.meters.audit}</strong></div></div><p><code>${esc(e.share)}</code></p></article><div class="menu-grid"><button class="primary-btn" data-action="copy-share">${esc(t("copyShare"))}</button><button class="secondary-btn" data-action="play-again">${esc(t("playAgain"))}</button><button class="ghost-btn" data-action="back-menu">${esc(t("menuBack"))}</button></div></section>`;
  }
  return "";
}

function render() {
  document.documentElement.style.setProperty("--font-scale", String(state.settings.fontSize / 100));
  document.body.classList.toggle("high-contrast", state.settings.highContrast);
  document.body.classList.toggle("reduce-motion", state.settings.reduceMotion);
  titleEl.textContent = t("appTitle");
  taglineEl.textContent = t("appTagline");
  if (ipTrackerLabelEl) ipTrackerLabelEl.textContent = t("ipTrackerLabel");
  if (ipTrackerValueEl) ipTrackerValueEl.textContent = maskedIp(state.ipTarget, state.ipRevealed);
  legendEl.textContent = t("language");
  settingsBtn.textContent = t("settings");
  if (startOverBtn) startOverBtn.textContent = t("startOver");
  langEnBtn.setAttribute("aria-pressed", String(state.lang === "en"));
  langBgBtn.setAttribute("aria-pressed", String(state.lang === "bg"));
  renderNotifications();
  appEl.innerHTML = screenHtml();
  appEl.focus({ preventScroll: true });
}

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const base = newState();
    const statusKey = typeof parsed.statusKey === "string" ? parsed.statusKey : "";
    const legacyStatus = typeof parsed.status === "string" ? parsed.status : "";
    const mappedLegacy = statusToKey(legacyStatus) || "";
    const loaded = {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      meters: { ...base.meters, ...(parsed.meters || {}) },
      flags: { ...base.flags, ...(parsed.flags || {}) },
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      notifications: [],
      ipTarget: typeof parsed.ipTarget === "string" ? parsed.ipTarget : base.ipTarget,
      ipRevealed: Number.isFinite(parsed.ipRevealed) ? parsed.ipRevealed : base.ipRevealed,
      statusKey: statusKey || mappedLegacy || base.statusKey,
      statusText: ""
    };
    if (loaded.case && !loaded.ipTarget) loaded.ipTarget = generateTrackedIp();
    loaded.ipRevealed = clamp(loaded.ipRevealed, 0, ipDigitCount(loaded.ipTarget));
    return loaded;
  } catch {
    return null;
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
  resetRun();
  setScreen("menu");
  render();
}

function startOver() {
  const keep = { lang: state.lang, settings: { ...state.settings } };
  state = { ...newState(), ...keep };
  state.notifications = [];
  setScreen("menu");
  persist();
  render();
}

async function copyShare() {
  const text = state.share || t("eFaceShare");
  try {
    await navigator.clipboard.writeText(text);
    pushNotification(t("copied"), "system");
  } catch {
    pushNotification(`${t("copyFail")} ${text}`, "system");
  }
}

function setLang(lang) {
  if (!STRINGS[lang]) return;
  state.lang = lang;
  persist();
  render();
}

function handle(action) {
  switch (action) {
    case "start-over": startOver(); return;
    case "start": startGame(); return;
    case "continue": if (state.case && !state.ending) { setScreen(state.resume || "brief"); persist(); render(); } return;
    case "howto": setScreen("howto"); persist(); render(); return;
    case "settings": state.prev = state.screen; setScreen("settings"); persist(); render(); return;
    case "reset": clearSave(); return;
    case "howto-ok":
    case "back-menu": setScreen("menu"); persist(); render(); return;
    case "back-prev": setScreen(state.prev || "menu"); persist(); render(); return;
    case "open-file": setScreen("brief"); persist(); render(); return;
    case "swap-case": swapCase(); return;
    case "to-workbench": setScreen("workbench"); persist(); render(); return;
    case "back-draw": setScreen("draw"); persist(); render(); return;
    case "open-classify": setScreen("classify"); persist(); render(); return;
    case "confirm-classify": classify(); return;
    case "open-instrument": if (state.flags.classType === "platform") { setScreen("instrument"); persist(); render(); } return;
    case "confirm-instrument": pickInstrument(); return;
    case "do-draft": draft(); return;
    case "do-pros": prosecutor(); return;
    case "open-judge": setScreen("judge"); persist(); render(); return;
    case "submit-judge": submitJudge(); return;
    case "do-serve": serve(); return;
    case "do-wait": waitResponse(); return;
    case "open-review": if (state.flags.hasPacket) { setScreen("review"); persist(); render(); } else blockedAction(t("docPacket")); return;
    case "review-keep": review(false); return;
    case "review-all": review(true); return;
    case "destroy-now": destroy(false); return;
    case "destroy-skip": destroy(true); return;
    case "open-shortcut": setScreen("shortcut"); persist(); render(); return;
    case "sc-no-order": shortcut("noOrder"); return;
    case "sc-fake-urgent": shortcut("fakeUrgent"); return;
    case "sc-pressure": shortcut("pressure"); return;
    case "back-workbench": setScreen("workbench"); persist(); render(); return;
    case "finalize": finish(); return;
    case "play-again": startGame(); return;
    case "copy-share": copyShare(); return;
    default: return;
  }
}

appEl.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const btn = target.closest("[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  if (!action) return;
  activeActionButton = btn;
  try {
    handle(action);
  } finally {
    activeActionButton = null;
  }
});

appEl.addEventListener("change", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (target instanceof HTMLInputElement && target.name === "classification") {
    state.pendingClass = target.value;
    persist();
    return;
  }
  if (target instanceof HTMLInputElement && target.name === "instrument") {
    state.pendingInstrument = target.value;
    persist();
    return;
  }
  if (target instanceof HTMLInputElement && target.getAttribute("data-action") === "months") {
    const n = Number.parseInt(target.value, 10);
    state.months = Number.isFinite(n) ? n : 1;
    persist();
    return;
  }
  if (target instanceof HTMLInputElement && target.getAttribute("data-action") === "high-contrast") {
    state.settings.highContrast = target.checked;
    persist();
    render();
    return;
  }
  if (target instanceof HTMLInputElement && target.getAttribute("data-action") === "reduce-motion") {
    state.settings.reduceMotion = target.checked;
    persist();
    render();
    return;
  }
  if (target instanceof HTMLInputElement && target.getAttribute("data-action") === "font-size") {
    const n = Number.parseInt(target.value, 10);
    state.settings.fontSize = clamp(Number.isFinite(n) ? n : 100, 85, 125);
    persist();
    render();
  }
});

settingsBtn.addEventListener("click", () => {
  state.prev = state.screen;
  setScreen("settings");
  persist();
  render();
});

clearNotificationsBtn.addEventListener("click", () => {
  state.notifications = [];
  persist();
  renderNotifications();
});

langEnBtn.addEventListener("click", () => setLang("en"));
langBgBtn.addEventListener("click", () => setLang("bg"));
if (startOverBtn) {
  startOverBtn.addEventListener("click", () => startOver());
}

async function init() {
  try {
    const loadedFromJson = await loadStrings();
    if (!loadedFromJson) {
      pushNotification(t("locFallback"), "system");
    }
  } catch (error) {
    console.error("Localization load failed:", error);
    pushNotification("Localization load failed. Check lang.json.", "system");
  }
  render();
}

init();
})();
