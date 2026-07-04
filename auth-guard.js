/**
 * Shared session guard — include on every page of every sub-app, AFTER
 * config.js:
 *
 *   <script src="https://pftsafety.github.io/Portal/config.js"></script>
 *   <script src="https://pftsafety.github.io/Portal/auth-guard.js"></script>
 *
 * Because every repo is served from the same origin (pftsafety.github.io),
 * the localStorage session set by the Portal on login is already readable
 * here. This script just verifies it's present and still valid, then
 * exposes the logged-in user as window.PFT_USER and fires a
 * 'pft-auth-ready' event once confirmed.
 */
(function () {
  const CFG = window.PFT_CONFIG || {};
  const API_URL = CFG.API_URL;
  const PORTAL_URL = CFG.PORTAL_URL || '/';
  const SESSION_KEY = CFG.SESSION_KEY || 'pft_session';

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

  const session = getSession();
  if (!session || !session.token) {
    redirectToLogin();
    return;
  }

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on Apps Script
    body: JSON.stringify({ action: 'validateSession', token: session.token })
  })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.ok) {
        clearSession();
        redirectToLogin();
        return;
      }
      window.PFT_USER = { username: res.username, role: res.role };
      document.dispatchEvent(new CustomEvent('pft-auth-ready', { detail: window.PFT_USER }));
    })
    .catch(function () {
      // Network/API failure — fail closed rather than letting an
      // unverified session through.
      redirectToLogin();
    });
})();
