// EDUCATIONAL USE ONLY — For learning and reference purposes.
// Strictly prohibited: copying or sharing this script to hack, crack,
// or bypass paid features of apps you do not own or are not authorized to test.

const SUB_PRODUCT_ID = "DR_first_3weeks_discount_7.99_ios_96";
const SUB_EXPIRE_MS = 1893456000000;

function patchVipUser(user) {
  if (!user) {
    return;
  }

  user.isVip = 1;
  user.isExVip = 0;
  user.isSubCoinVip = 0;
  user.servicePeriod = 1;
  user.coins = 99999;
  user.bonus = 99999;

  user.subscribeInfo = user.subscribeInfo || {};
  user.subscribeInfo.isVip = 1;
  user.subscribeInfo.isCancelSub = 0;

  if (user.membershipInfo) {
    user.membershipInfo.membershipStatus = 2;
    if (user.membershipInfo.membershipCardInfo) {
      user.membershipInfo.membershipCardInfo.membershipTitle = "Membership Active";
      user.membershipInfo.membershipCardInfo.membershipStatus = 2;
    }
  }
}

function unlockChapterList(list) {
  if (!Array.isArray(list)) {
    return;
  }
  for (const chapter of list) {
    chapter.isCharge = 0;
    chapter.isPay = 0;
  }
}

function unlockBatchChapters(chapterList) {
  if (!Array.isArray(chapterList)) {
    return;
  }
  for (const chapter of chapterList) {
    chapter.isCharge = 0;
    chapter.chargeChapter = false;
  }
}

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
  const data = obj.data;

  if (url.indexOf("/ap001/bootstrap") !== -1 && data && data.user) {
    patchVipUser(data.user);
  }

  if (url.indexOf("/pe001/user/info") !== -1 && data) {
    patchVipUser(data);
  }

  if (url.indexOf("/membership/membershipHomePage") !== -1 && data) {
    data.membershipStatus = 2;
    if (data.membershipCardInfo) {
      data.membershipCardInfo.membershipTitle = "Membership Active";
      data.membershipCardInfo.membershipStatus = 2;
    }
  }

  if (url.indexOf("/py001/getUserSubList") !== -1) {
    obj.data = obj.data || {};
    obj.data.subList = [
      {
        productId: SUB_PRODUCT_ID,
        subUnit: "week",
        expireTime: SUB_EXPIRE_MS,
        isAutoRenew: 1,
        subType: 1,
        originalTransactionId: "490001464780901",
      },
    ];
  }

  if (url.indexOf("/pe001/subscribe/dailyReceive") !== -1 && data) {
    data.status = 1;
    data.award = 80;
  }

  if (url.indexOf("/ap001/infoLoad") !== -1 && data && data.memberAdvertisingSpaceResponse) {
    data.memberAdvertisingSpaceResponse.showSpace = 0;
    data.memberAdvertisingSpaceResponse.hasDiscount = 0;
  }

  if (url.indexOf("/chapterv2/unlock") !== -1 && data) {
    data.status = 0;
    data.jumpType = 0;
    data.isVipTheater = 1;
    data.unlockTips = "";
    data.memberRechargeBtn = 0;
    data.unLockType = 0;
    data.coins = 99999;
    data.bonus = 99999;
    data.price = 0;
  }

  if (url.indexOf("/chapterv2/list") !== -1 && data) {
    unlockChapterList(data.list);
  }

  if (url.indexOf("/chapterv2/detail") !== -1 && data) {
    unlockChapterList(data.list);
  }

  if (url.indexOf("/chapterv2/batch/load") !== -1 && data) {
    unlockBatchChapters(data.chapterList);
  }

  if (url.indexOf("/operation/activity") !== -1 && data) {
    data.activityList = [];
    data.unlockTips = "";
  }

  response.statusCode = 200;
  response.headers = response.headers || {};
  response.headers["content-type"] = "application/json";
  response.headers["Content-Type"] = "application/json";
  response.body = JSON.stringify(obj);
  console.log("[dramabox] patched " + url.split("?")[0]);
  return response;
}
