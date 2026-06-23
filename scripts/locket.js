// EDUCATIONAL USE ONLY — For learning and reference purposes.
// Strictly prohibited: copying or sharing this script to hack, crack,
// or bypass paid features of apps you do not own or are not authorized to test.

async function onRequest(context, request) {
  delete request.headers["x-revenuecat-etag"];
  delete request.headers["X-RevenueCat-ETag"];
  delete request.headers["if-none-match"];
  delete request.headers["If-None-Match"];

  return request;
}

async function onResponse(context, request, response) {
  try {
    const obj = JSON.parse(response.body);

    obj.subscriber.entitlements = obj.subscriber.entitlements || {};
    obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};

    obj.subscriber.subscriptions["locket_2400_1y"] = {
      expires_date: "2099-12-31T23:59:59Z",
      purchase_date: "2026-01-01T00:00:00Z",
      ownership_type: "PURCHASED",
      store: "app_store"
    };

    obj.subscriber.entitlements["Gold"] = {
      product_identifier: "locket_2400_1y",
      purchase_date: "2026-01-01T00:00:00Z",
      expires_date: "2099-12-31T23:59:59Z"
    };

    response.body = JSON.stringify(obj);
    return response;
  } catch (e) {
    console.log(e);
    return response;
  }
}
