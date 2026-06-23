// EDUCATIONAL USE ONLY — For learning and reference purposes.
// Strictly prohibited: copying or sharing this script to hack, crack,
// or bypass paid features of apps you do not own or are not authorized to test.

const ACTIVE = {
  ownership_type: "PURCHASED",
  store: "app_store",
  is_sandbox: false,
  expires_date: "9999-01-09T07:52:54Z",
  original_purchase_date: "2005-01-09T07:52:55Z",
  purchase_date: "2005-01-09T07:52:54Z",
};

const CORE_PRODUCTS = {
  membership: "VSCOANNUAL",
  pro: "vscopro_global_5999_annual_7D_free",
  premium: "lant1",
  allPacks: "VSCOCAM02BUALL",
};

function isLocketTraffic(obj, request) {
  const haystack =
    JSON.stringify(obj) +
    (request.url || "") +
    (request.headers["user-agent"] || request.headers["User-Agent"] || "");
  return /locket/i.test(haystack);
}

function isVscoTraffic(obj, request) {
  if (isLocketTraffic(obj, request)) {
    return false;
  }

  const ua = request.headers["user-agent"] || request.headers["User-Agent"] || "";
  if (/vsco/i.test(ua)) {
    return true;
  }

  return /vsco|VSCO|VSCOCAM|FILMX/i.test(JSON.stringify(obj));
}

function activateSubscription(subscriptions, productId) {
  subscriptions[productId] = Object.assign({}, subscriptions[productId], ACTIVE);
}

function activateEntitlement(entitlements, key, productId) {
  entitlements[key] = Object.assign({}, entitlements[key], ACTIVE, {
    product_identifier: productId,
  });
}

function activateKnownProducts(subscriber) {
  const subscriptions = subscriber.subscriptions;
  const entitlements = subscriber.entitlements;

  activateSubscription(subscriptions, CORE_PRODUCTS.membership);
  activateEntitlement(entitlements, "membership", CORE_PRODUCTS.membership);

  activateSubscription(subscriptions, CORE_PRODUCTS.pro);
  activateEntitlement(entitlements, "pro", CORE_PRODUCTS.pro);

  activateSubscription(subscriptions, CORE_PRODUCTS.premium);
  activateEntitlement(entitlements, "premium", CORE_PRODUCTS.premium);

  activateSubscription(subscriptions, CORE_PRODUCTS.allPacks);
  activateEntitlement(entitlements, "pack_" + CORE_PRODUCTS.allPacks, CORE_PRODUCTS.allPacks);
}

function activateExistingPurchases(subscriber) {
  const subscriptions = subscriber.subscriptions;
  const entitlements = subscriber.entitlements;

  for (const productId of Object.keys(subscriptions)) {
    activateSubscription(subscriptions, productId);

    const packKey = productId.startsWith("pack_") ? productId : "pack_" + productId;
    if (/^VSCOCAM|^FILMX|^VSCO|^vsco/i.test(productId)) {
      activateEntitlement(entitlements, packKey, productId);
    }
  }

  for (const key of Object.keys(entitlements)) {
    const productId = entitlements[key].product_identifier || key.replace(/^pack_/, "");
    activateEntitlement(entitlements, key, productId);
    activateSubscription(subscriptions, productId);
  }
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

  if (!isVscoTraffic(obj, request)) {
    return response;
  }

  obj.subscriber = obj.subscriber || {};
  obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
  obj.subscriber.entitlements = obj.subscriber.entitlements || {};

  activateKnownProducts(obj.subscriber);
  activateExistingPurchases(obj.subscriber);

  response.statusCode = 200;
  response.headers = response.headers || {};
  response.headers["content-type"] = "application/json";
  response.headers["Content-Type"] = "application/json";
  response.body = JSON.stringify(obj);
  console.log("[vsco] patched RevenueCat subscriber");
  return response;
}
