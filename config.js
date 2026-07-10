/**
 * Shared config — hosted in pftsafety/pftsafety repo, referenced by all sub-apps:
 *
 *   <script src="https://pftsafety.github.io/pftsafety/config.js"></script>
 *
 * Update API_URL after each new Apps Script deployment.
 */
window.PFT_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec',
  PORTAL_URL: 'https://pftsafety.github.io/pftsafety/',
  SESSION_KEY: 'pft_session'
};
