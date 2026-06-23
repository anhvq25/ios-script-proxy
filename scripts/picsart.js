// EDUCATIONAL USE ONLY — For learning and reference purposes.
// Strictly prohibited: copying or sharing this script to hack, crack,
// or bypass paid features of apps you do not own or are not authorized to test.

async function onRequest(context, request) {
  delete request.headers["if-none-match"];
  delete request.headers["If-None-Match"];
  delete request.headers["if-modified-since"];
  delete request.headers["If-Modified-Since"];
  return request;
}

async function onResponse(context, request, response) {
  const body = {
    status: "success",
    response: [
      {
        status: "SUBSCRIPTION_RENEWED",
        is_trial: false,
        order_id: "2000001108782321",
        expire_date: 32662137600000,
        purchase_date: 1704758400000,
        subscription_id: "com.picsart.studio.subscription_pro_3_yearly",
        original_order_id: "2000000756285050",
        plan_meta: {
          permissions: ["premium_tools_standard", "premium_tools_ai"],
          auto_renew_product_id:
            "com.picsart.studio.subscription_mac_tier1_pro_yearly",
          level: 2000,
          storage_limit_in_mb: 102400,
          id: "com.picsart.studio.subscription_pro_3_yearly",
          frequency: "yearly",
          type: "renewable",
          scope_id: "full",
          product_id: "com.picsart.studio.subscription_pro_3_yearly",
          tier_id: "pro",
        },
        limitation: {
          max_count: 10,
          limits_exceeded: false,
        },
        is_eligible_for_introductory: false,
        reason: "ok",
      },
    ],
  };

  response.statusCode = 200;
  response.headers = response.headers || {};
  response.headers["content-type"] = "application/json";
  response.headers["Content-Type"] = "application/json";
  response.body = JSON.stringify(body);
  console.log("[picsart] mocked subscription for " + request.url);
  return response;
}
