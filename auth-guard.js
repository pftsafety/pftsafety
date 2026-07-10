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
