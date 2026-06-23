// EDUCATIONAL USE ONLY — For learning and reference purposes.
// Strictly prohibited: copying or sharing this script to hack, crack,
// or bypass paid features of apps you do not own or are not authorized to test.
//
// VSCO wrapper — uses scripts/revenuecat.js.
// Enable revenuecat.js on the same URL, or use this file alone (standalone fallback).

globalThis.__RC_FORCE_APP_ID__ = "vsco";

globalThis.__RC_APP_OVERRIDES__ = globalThis.__RC_APP_OVERRIDES__ || {};
globalThis.__RC_APP_OVERRIDES__.vsco = {
  // Add VSCO-specific patches here if needed:
  // patch: function (subscriber, helpers) {
  //   helpers.setEntitlement(subscriber, "membership", "VSCOANNUAL");
  // },
};

async function onRequest(context, request) {
  if (globalThis.__RevenueCat) {
    return globalThis.__RevenueCat.onRequest(context, request);
  }

  delete request.headers["x-revenuecat-etag"];
  delete request.headers["X-RevenueCat-ETag"];
  delete request.headers["if-none-match"];
  delete request.headers["If-None-Match"];
  delete request.headers["if-modified-since"];
  delete request.headers["If-Modified-Since"];
  return request;
}

async function onResponse(context, request, response) {
  if (globalThis.__RevenueCat) {
    return globalThis.__RevenueCat.onResponse(context, request, response);
  }

  let obj;
  try {
    obj = JSON.parse(response.body);
  } catch (e) {
    return response;
  }

  const ua = request.headers["user-agent"] || request.headers["User-Agent"] || "";
  if (!/vsco/i.test(ua) && !/vsco|VSCO|VSCOCAM|FILMX/i.test(JSON.stringify(obj))) {
    return response;
  }

  obj.subscriber = obj.subscriber || {};
  obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
  obj.subscriber.entitlements = obj.subscriber.entitlements || {};

  const ACTIVE = {
    ownership_type: "PURCHASED",
    store: "app_store",
    is_sandbox: false,
    expires_date: "9999-01-09T07:52:54Z",
    original_purchase_date: "2005-01-09T07:52:55Z",
    purchase_date: "2005-01-09T07:52:54Z",
  };

  function setEntitlement(key, productId) {
    obj.subscriber.subscriptions[productId] = Object.assign(
      {},
      obj.subscriber.subscriptions[productId],
      ACTIVE
    );
    obj.subscriber.entitlements[key] = Object.assign(
      {},
      obj.subscriber.entitlements[key],
      ACTIVE,
      { product_identifier: productId }
    );
  }

  setEntitlement("membership", "VSCOANNUAL");
  setEntitlement("pro", "vscopro_global_5999_annual_7D_free");
  setEntitlement("premium", "lant1");
  setEntitlement("pack_VSCOCAM02BUALL", "VSCOCAM02BUALL");

  response.statusCode = 200;
  response.headers = response.headers || {};
  response.headers["content-type"] = "application/json";
  response.headers["Content-Type"] = "application/json";
  response.body = JSON.stringify(obj);
  console.log("[vsco] patched RevenueCat subscriber (standalone)");
  return response;
}
