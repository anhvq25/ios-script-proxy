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
  let obj;
  try {
    obj = JSON.parse(response.body);
  } catch (e) {
    return response;
  }

  const url = request.url;

  if (url.indexOf("/api/order/purchase") !== -1) {
    obj.data = {
      originalTransactionId: "490001464780901",
      errorCode: 0,
      purchaseTime: 1105228800,
      isTrialPeriod: 1,
      expireTime: 4071600000,
      sandbox: 0,
    };
  } else if (url.indexOf("/api/iap/check-receipt") !== -1) {
    obj.data = {
      sandbox: 0,
      purchaseTime: 1105228800,
      isTrialPeriod: 1,
      originalTransactionId: "490001464780901",
      appleExpireTime: 4071600000,
      productId: "vip_yearly_3daysfree",
      appleVip: 1,
      expireTime: 4071600000,
      giftVip: 1,
      operationVip: 1,
      errorCode: 0,
    };
  } else if (url.indexOf("/operational-positions") !== -1) {
    obj.Boot = [];
  }

  response.statusCode = 200;
  response.headers = response.headers || {};
  response.headers["content-type"] = "application/json";
  response.headers["Content-Type"] = "application/json";
  response.body = JSON.stringify(obj);
  console.log("[camera360] patched " + request.url);
  return response;
}
