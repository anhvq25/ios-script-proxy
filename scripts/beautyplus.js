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
    vip_expires_date: 4071600000,
    message: "success",
    data: {
      points: 999999999,
      next_claim: 1,
      gid: "2641810920",
      balance: 999999999,
      created_at: 1707331696,
    },
  };

  response.statusCode = 200;
  response.headers = response.headers || {};
  response.headers["content-type"] = "application/json";
  response.headers["Content-Type"] = "application/json";
  response.body = JSON.stringify(body);
  console.log("[beautyplus] mocked vip for " + request.url);
  return response;
}
