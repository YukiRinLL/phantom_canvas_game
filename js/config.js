(function (root) {
  "use strict";

  var query = new URLSearchParams(root.location.search);
  var supabaseUrl = query.get("supabaseUrl") || "https://dshmbsawwrbuycnivcjs.supabase.co";
  var apiBase = query.get("apiBase") || "https://phantoms-backend.onrender.com";
  root.APP_CONFIG = {
    SUPABASE_URL: supabaseUrl,
    ANON_KEY: "",
    API_BASE: apiBase,
    API_ENDPOINTS: {
      onebotLatestText: "/onebot/latest/text"
    },
    GAME: {
      canvas: { width: 512, height: 480 },
      pollIntervalMs: 5000,
      requestTimeoutMs: 8000,
      heroUserId: "3146672611",
      maxBubbleCount: 3,
      bubbleLifetimeMs: 30000
    }
  };

  root.getApiUrl = function (endpointKey) {
    return root.APP_CONFIG.API_BASE + root.APP_CONFIG.API_ENDPOINTS[endpointKey];
  };

  root.getSupabaseConfig = function () {
    var accessToken = root.sessionStorage.getItem("supabase_access_token");
    var key = root.APP_CONFIG.ANON_KEY;
    return {
      url: root.APP_CONFIG.SUPABASE_URL,
      headers: {
        apikey: key,
        Authorization: "Bearer " + (accessToken || key),
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      }
    };
  };

  root.buildSupabaseQueryUrl = function (table, select, filters) {
    var url = root.APP_CONFIG.SUPABASE_URL + "/rest/v1/" + table + "?select=" + encodeURIComponent(select || "*");
    Object.keys(filters || {}).forEach(function (key) {
      url += "&" + key + "=eq." + encodeURIComponent(filters[key]);
    });
    return url;
  };
}(window));
