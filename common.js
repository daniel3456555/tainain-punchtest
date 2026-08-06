/* ===== LINE打卡系統 前端共用設定 =====
   四頁 HTML 共用。修改設定只需改本檔。 */

/* ── 需要維護的兩個值 ── */
const LIFF_ID  = "2010688930-qTIy4spn";
const API_BASE = "https://script.google.com/macros/s/AKfycbxUAIdn1rRepHVUq_b2mQXREQmx2Hu5vZpKQYuhU1vRmX-AiZrSFZ4nkfW6g8xU9LK-lQ/exec";
/* ───────────────────── */

const INIT_TIMEOUT_MS = 8000;   // 取得身分的逾時保護（除錯歷程教訓，勿移除）

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
   用 replace 不用 href，避免返回鍵回到派發器造成無限彈回 */
function goPage(file, params) {
  const qs = params ? new URLSearchParams(params).toString() : "";
  location.replace(file + (qs ? "?" + qs : ""));
}

/* 呼叫後端資料端點（GET） */
async function apiGet(action, params) {
  const p = new URLSearchParams(params || {});
  p.set("action", action);
  const res  = await fetch(API_BASE + "?" + p.toString());
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("後端回應非 JSON：" + text.slice(0, 200));
  }
}

/* 初始化 LIFF 並取得 userId（含逾時保護）
   回傳 userId 字串；失敗則 throw Error */
async function initLiffAndGetUserId() {
  const params = getParams();

  // 診斷模式：網址帶 &debug=<userId> 可在電腦瀏覽器跳過 LIFF
  const dbg = params.get("debug");
  if (dbg) return dbg;

  if (typeof liff === "undefined") throw new Error("LIFF SDK 未載入");

  const timeout = new Promise(function (_, reject) {
    setTimeout(function () { reject(new Error("取得身分逾時")); }, INIT_TIMEOUT_MS);
  });

  await Promise.race([liff.init({ liffId: LIFF_ID }), timeout]);

  if (!liff.isLoggedIn()) throw new Error("未登入（請在 LINE 內開啟本頁）");

  const prof = await Promise.race([liff.getProfile(), timeout]);
  return prof.userId;
}
