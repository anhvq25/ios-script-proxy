// EDUCATIONAL USE ONLY — For learning and reference purposes.
// Strictly prohibited: copying or sharing this script to hack, crack,
// or bypass paid features of apps you do not own or are not authorized to test.

(function (globalThis) {
  const ACTIVE = {
    ownership_type: "PURCHASED",
    store: "app_store",
    is_sandbox: false,
    expires_date: "9999-01-09T07:52:54Z",
    original_purchase_date: "2005-01-09T07:52:55Z",
    purchase_date: "2005-01-09T07:52:54Z",
  };

  const apps = {};

  function trafficText(obj, request) {
    return (
      JSON.stringify(obj) +
      (request.url || "") +
      (request.headers["user-agent"] || request.headers["User-Agent"] || "")
    );
  }

  function activateSubscription(subscriptions, productId) {
    subscriptions[productId] = Object.assign({}, subscriptions[productId], ACTIVE);
  }

  function activateEntitlement(entitlements, key, productId) {
    entitlements[key] = Object.assign({}, entitlements[key], ACTIVE, {
      product_identifier: productId,
    });
  }

  function ensureSubscriber(obj) {
    obj.subscriber = obj.subscriber || {};
    obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
    obj.subscriber.entitlements = obj.subscriber.entitlements || {};
    return obj.subscriber;
  }

  function setEntitlement(subscriber, entitlementKey, productId) {
    activateSubscription(subscriber.subscriptions, productId);
    activateEntitlement(subscriber.entitlements, entitlementKey, productId);
  }

  function refreshPurchases(subscriber, productPattern) {
    const subscriptions = subscriber.subscriptions;
    const entitlements = subscriber.entitlements;
    const pattern = productPattern || /.*/;

    for (const productId of Object.keys(subscriptions)) {
      activateSubscription(subscriptions, productId);

      if (pattern.test(productId)) {
        const packKey = productId.startsWith("pack_") ? productId : "pack_" + productId;
        activateEntitlement(entitlements, packKey, productId);
      }
    }

    for (const key of Object.keys(entitlements)) {
      const productId =
        entitlements[key].product_identifier || key.replace(/^pack_/, "");
      activateEntitlement(entitlements, key, productId);
      activateSubscription(subscriptions, productId);
    }
  }

  const helpers = {
    ACTIVE,
    activateSubscription,
    activateEntitlement,
    setEntitlement,
    refreshPurchases,
  };

  function registerApp(id, config) {
    apps[id] = Object.assign({ id }, config);
  }

  function mergeOverrides() {
    const overrides = globalThis.__RC_APP_OVERRIDES__ || {};
    for (const id of Object.keys(overrides)) {
      const base = apps[id] || { id };
      apps[id] = Object.assign({}, base, overrides[id], {
        patch: function (subscriber, h) {
          if (typeof base.patch === "function") {
            base.patch(subscriber, h);
          }
          if (typeof overrides[id].patch === "function") {
            overrides[id].patch(subscriber, h);
          }
        },
        match: overrides[id].match || base.match,
      });
    }
  }

  registerApp("locket", {
    match: function (obj, request) {
      return /locket/i.test(trafficText(obj, request));
    },
    patch: function (subscriber, h) {
      h.setEntitlement(subscriber, "Gold", "locket_2400_1y");
    },
  });

  registerApp("vsco", {
    match: function (obj, request) {
      if (/locket/i.test(trafficText(obj, request))) {
        return false;
      }
      const ua = request.headers["user-agent"] || request.headers["User-Agent"] || "";
      if (/vsco/i.test(ua)) {
        return true;
      }
      return /vsco|VSCO|VSCOCAM|FILMX/i.test(JSON.stringify(obj));
    },
    patch: function (subscriber, h) {
      h.setEntitlement(subscriber, "membership", "VSCOANNUAL");
      h.setEntitlement(subscriber, "pro", "vscopro_global_5999_annual_7D_free");
      h.setEntitlement(subscriber, "premium", "lant1");
      h.setEntitlement(subscriber, "pack_VSCOCAM02BUALL", "VSCOCAM02BUALL");
      h.refreshPurchases(subscriber, /^VSCOCAM|^FILMX|^VSCO|^vsco/i);
    },
  });

  mergeOverrides();

  function resolveApp(obj, request) {
    const forcedId = globalThis.__RC_FORCE_APP_ID__;
    if (forcedId) {
      return apps[forcedId] || null;
    }

    for (const id of Object.keys(apps)) {
      const app = apps[id];
      if (typeof app.match === "function" && app.match(obj, request)) {
        return app;
      }
    }
    return null;
  }

  async function onRequest(context, request) {
    delete request.headers["x-revenuecat-etag"];
    delete request.headers["X-RevenueCat-ETag"];
    delete request.headers["if-none-match"];
    delete request.headers["If-None-Match"];
    delete request.headers["if-modified-since"];
    delete request.headers["If-Modified-Since"];
    return request;
  }

  async function onResponse(context, request, response) {
    let obj;
    try {
      obj = JSON.parse(response.body);
    } catch (e) {
      return response;
    }

    mergeOverrides();
    const app = resolveApp(obj, request);
    if (!app) {
      return response;
    }

    const subscriber = ensureSubscriber(obj);
    if (typeof app.patch === "function") {
      app.patch(subscriber, helpers);
    }

    response.statusCode = 200;
    response.headers = response.headers || {};
    response.headers["content-type"] = "application/json";
    response.headers["Content-Type"] = "application/json";
    response.body = JSON.stringify(obj);
    console.log("[revenuecat] patched " + app.id);
    return response;
  }

  globalThis.__RevenueCat = {
    helpers,
    registerApp,
    onRequest,
    onResponse,
  };
})(globalThis);

async function onRequest(context, request) {
  return globalThis.__RevenueCat.onRequest(context, request);
}

async function onResponse(context, request, response) {
  return globalThis.__RevenueCat.onResponse(context, request, response);
}
