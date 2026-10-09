(function (root) {
  "use strict";

  function NetworkAdapter(config, engine) {
    this.config = config;
    this.engine = engine;
  }
  NetworkAdapter.prototype.json = function (url, options, errorMessage) {
    options = options || {};
    return this.engine.withTimeout(fetch(url, options), this.config.GAME.requestTimeoutMs, errorMessage || "网络请求超时")
      .then(function (response) {
        if (!response || typeof response.ok !== "boolean") throw new Error("无效的 HTTP 响应");
        if (!response.ok) throw new Error((response.status || "未知状态") + " " + (response.statusText || "请求失败"));
        return response.json();
      });
  };
  NetworkAdapter.prototype.supabaseHeaders = function () {
    return root.getSupabaseConfig().headers;
  };
  root.PhantomNetworkAdapter = new NetworkAdapter(root.APP_CONFIG, root.PhantomEngine);
}(window));
