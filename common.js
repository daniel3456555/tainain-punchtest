/* ===== LINE打卡系統 前端共用設定 =====
   四頁 HTML 共用。修改設定只需改本檔。
   架構：每頁一個 LIFF ID，LINE 直接開啟目標頁，不經過任何轉址。 */

/* ── 需要維護的地方 ── */

// Apps Script Web App 部署網址（/exec 結尾）
const API_BASE = "https://script.google.com/macros/s/AKfycbxUAIdn1rRepHVUq_b2mQXREQmx2Hu5vZpKQYuhU1vRmX-AiZrSFZ4nkfW6g8xU9LK-lQ/exec";
const API_TIMEOUT_MS = 1;   // apiGet 逾時（毫秒）；2026/08/11 加入

// 檔名 → LIFF ID 對照表
// 新增頁面時：先在 LINE Developers 建 LIFF app，再把對照加進這裡
const LIFF_IDS = {
  "punch.html":    "2010688930-qTIy4spn",
  "leave.html":    "2010688930-aRI5hLPO",
  "query.html":    "2010688930-6Y25x5Ju",
  "register.html": "2010688930-WfDnNsxc"
};
/* ─────────────────── */

const INIT_TIMEOUT_MS = 8000;   // 取得身分的逾時保護（除錯歷程教訓，勿移除）

/* 依當前網址的檔名取得本頁的 LIFF ID */
function getLiffId() {
  const file = location.pathname.split("/").pop() || "";
  const id = LIFF_IDS[file];
  if (!id) throw new Error("此頁面未登記 LIFF ID：" + file);
  return id;
}

/* 取得網址參數，並還原 LIFF 包在 liff.state 裡的參數 */
function getParams() {
  const p  = new URLSearchParams(location.search);
  const st = p.get("liff.state");
  if (st) {
    const q = st.indexOf("?") >= 0 ? st.split("?")[1] : st.replace(/^\?/, "");
    new URLSearchParams(q).forEach(function (v, k) { p.set(k, v); });
  }
  return p;
}

/* 頁面跳轉：一律相對路徑（repo 改名不會斷鏈）
   註：跨 LIFF ID 的跳轉行為尚未實測，見待辦事項 */
function goPage(file, params) {
  const qs = params ? new URLSearchParams(params).toString() : "";
  location.href = file + (qs ? "?" + qs : "");
}

/* 呼叫後端資料端點（GET）
   2026/08/11 加入逾時保護：原為裸 fetch，後端無回應時會無限等待，
   症狀為「永遠停在處理中」。第三參數可覆寫秒數，不傳則用 API_TIMEOUT_MS。 */
async function apiGet(action, params, timeoutMs) {
  const p = new URLSearchParams(params || {});
  p.set("action", action);
  const ms = timeoutMs || API_TIMEOUT_MS;

  const work = (async function () {
    const res  = await fetch(API_BASE + "?" + p.toString());
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("後端回應非 JSON：" + text.slice(0, 200));
    }
  })();

  const timeout = new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error("後端無回應（逾時 " + (ms / 1000) + " 秒）"));
    }, ms);
  });

  return Promise.race([work, timeout]);
}

/* 初始化 LIFF 並取得 userId（含逾時保護）
   回傳 userId 字串；失敗則 throw Error */
async function initLiffAndGetUserId() {
  const params = getParams();

  // 診斷模式：?debug=1 → 由 localStorage 讀取測試用 userId（避免 userId 出現在網址列）
  // 首次使用：Console 執行 localStorage.setItem('devUid','U...')
  if (params.get("debug")) {
    const saved = localStorage.getItem("devUid");
    if (saved) return saved;
    throw new Error("診斷模式未設定：請在 Console 執行 localStorage.setItem('devUid','你的userId')");
  }

  if (typeof liff === "undefined") throw new Error("LIFF SDK 未載入");

  const timeout = new Promise(function (_, reject) {
    setTimeout(function () { reject(new Error("取得身分逾時")); }, INIT_TIMEOUT_MS);
  });

  await Promise.race([liff.init({ liffId: getLiffId() }), timeout]);

  if (!liff.isLoggedIn()) throw new Error("未登入（請在 LINE 內開啟本頁）");

  const prof = await Promise.race([liff.getProfile(), timeout]);
  return prof.userId;
}
