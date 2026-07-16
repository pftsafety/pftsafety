/**
 * Shared session guard — include on every page of every sub-app, AFTER
 * config.js:
 *
 *   <script src="https://pftsafety.github.io/pftsafety/config.js"></script>
 *   <script src="https://pftsafety.github.io/pftsafety/auth-guard.js"></script>
 *
 * Because every repo is served from the same origin (pftsafety.github.io),
 * the localStorage session set by the Portal on login is already readable
 * here. This script just verifies it's present and still valid, then
 * exposes the logged-in user as window.PFT_USER and fires a
 * 'pft-auth-ready' event once confirmed.
 *
 * Daily unlock gate: session tokens are long-lived now (~lifetime with
 * "remember me"), so token validity alone isn't enough to keep a lost or
 * shared device secure. The Portal requires a fresh PIN/fingerprint check
 * once per "day" (day boundary at 6pm, see index.html). This guard enforces
 * the same rule here — otherwise someone could skip that check entirely by
 * opening a sub-app URL directly instead of going through the Portal.
 *
 * Mobile note: on a slow or dropped factory-floor connection, the
 * validateSession call may time out. Rather than bounce the user to login
 * on every network blip, a timeout falls back to trusting the locally
 * stored session as long as its own expiresAt hasn't passed. A real
 * expired/invalid session (confirmed by the server) still always redirects.
 */
(function () {
  const CFG = window.PFT_CONFIG || {};
  const API_URL = CFG.API_URL;
  const PORTAL_URL = CFG.PORTAL_URL || '/';
  const SESSION_KEY = CFG.SESSION_KEY || 'pft_session';
  const LAST_UNLOCK_KEY = 'pft_last_unlock';
  const VALIDATE_TIMEOUT_MS = 6000;

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function redirectToLogin() {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = PORTAL_URL + '?redirect=' + returnUrl;
  }

  // Same 6pm-boundary rule as index.html — duplicated here since this
  // script runs standalone on each sub-app's own page.
  function needsDailyUnlock() {
    const raw = localStorage.getItem(LAST_UNLOCK_KEY);
    if (!raw) return true;
    const lastUnlock = new Date(Number(raw));
    if (isNaN(lastUnlock.getTime())) return true;
    const now = new Date();
    const boundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
    if (now < boundary) boundary.setDate(boundary.getDate() - 1);
    return lastUnlock < boundary;
  }

  function allowOffline(session) {
    window.PFT_USER = { username: session.username, role: session.role, offline: true };
    document.dispatchEvent(new CustomEvent('pft-auth-ready', { detail: window.PFT_USER }));
  }

  const session = getSession();
  if (!session || !session.token) {
    redirectToLogin();
    return;
  }

  const locallyExpired = session.expiresAt && new Date(session.expiresAt) < new Date();
  if (locallyExpired) {
    clearSession();
    redirectToLogin();
    return;
  }

  // Token is otherwise valid, but the daily PIN/fingerprint check hasn't
  // happened yet today — send them to the Portal to satisfy it, then
  // they'll be bounced straight back here via ?redirect=.
  if (needsDailyUnlock()) {
    redirectToLogin();
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on Apps Script
    body: JSON.stringify({ action: 'validateSession', token: session.token }),
    signal: controller.signal
  })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      clearTimeout(timeout);
      if (!res.ok) {
        // Server explicitly rejected the session — always honor that.
        clearSession();
        redirectToLogin();
        return;
      }
      window.PFT_USER = { username: res.username, role: res.role };
      document.dispatchEvent(new CustomEvent('pft-auth-ready', { detail: window.PFT_USER }));
    })
    .catch(function () {
      clearTimeout(timeout);
      // Network failure or timeout, not a server rejection — trust the
      // locally cached session until its own expiry, since a hard redirect
      // on every dropped connection would make the app unusable on the
      // factory floor.
      allowOffline(session);
    });
})();
