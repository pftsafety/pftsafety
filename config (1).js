/**
 * Shared config — host this ONE file in the Portal repo and reference it
 * from every sub-app via absolute URL:
 *
 *   <script src="https://pftsafety.github.io/Portal/config.js"></script>
 *
 * Update API_URL after each new Apps Script deployment.
 */
window.PFT_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec',
  PORTAL_URL: 'https://pftsafety.github.io/Portal/',
  SESSION_KEY: 'pft_session'
};
