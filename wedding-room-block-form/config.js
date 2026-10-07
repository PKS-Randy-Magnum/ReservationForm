/* Public frontend config — edit after Power Automate is set up.
   Do NOT put the real shared form password here for production.
   MOCK_PASSWORD is only used when MOCK_MODE is true (local preview). */
window.FORM_CONFIG = {
  /* Set true to try the form UI locally without Microsoft / GitHub Pages.
     Unlock with MOCK_PASSWORD. Saves stay in this browser only.
     Set false before you go live. */
  MOCK_MODE: false,
  MOCK_PASSWORD: "preview",
  /* Mock-only staff unlock (never used when MOCK_MODE is false).
     Live staff code lives ONLY in Power Automate StaffPassword Compose — not here. */
  MOCK_STAFF_PASSWORD: "staff",

  /* After Power Automate deploy: paste the HTTP POST URL from
     "When an HTTP request is received".
     Looks like: https://prod-XX.westus.logic.azure.com:443/workflows/.../triggers/manual/paths/invoke?... */
  API_URL: "https://default70973ca2a1b7409287ca9b1f7bb614.bd.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/13/workflows/b0cdb1aad8cd4db0bc4c6642111327dd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=J6892GMOwhS5ciIi-VEKToW3goj004PYHB8-7D_lvLA",

  TITLE: "Wedding Guest Room Block Details",

  INTRO_BEFORE: "Please complete by",
  INTRO_AFTER:
    ". We’ll use this for your room block and weekend logistics.",

  /* Future: preset lists (menus, vendors, etc.) — unused in v1 */
  PRESETS: {
    vendors: [],
    brunchMenus: [],
  },
};
