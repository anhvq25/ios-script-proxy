// youtube.js
// ───────────────────────────────────────────────────────────────────────────
// YouTube API response interceptor — Moni Proxy standard format.
//
// URL pattern (moniconfig — do NOT use v1/* wildcard):
//   player | get_watch | browse | next | search | reel/reel_watch_sequence
//   account/get_setting | get_setting
//
// Excluded: att/*, guide, log_event, … (attestation / integrity)
// ───────────────────────────────────────────────────────────────────────────

(function () {
const ALLOWED = new Set([
  "player",
  "get_watch",
  "browse",
  "next",
  "search",
  "reel/reel_watch_sequence",
  "account/get_setting",
  "get_setting",
]);

const PAGEAD = [112, 97, 103, 101, 97, 100]; // "pagead"
const PLAYER_AD_FIELDS = new Set([7, 68]);
const MIN_AD_CHUNK = 1000;

const F = {
  playabilityStatus: 2,
  playbackTracking: 9,
  miniPlayer: 21,
  backgroundPlayer: 11,
  miniPlayerRender: 151635310,
  backgroundPlayerRender: 64657230,
  active: 1,
  pageadViewthrough: 18,
  settingItems: 6,
  collectionItems: 7,
  bgPlaybackRenderer: 88478200,
  settingCategoryCollection: 66930374,
  settingBooleanRenderer: 61331416,
  setClientSettingEndpoint: 81212182,
  categoryId: 4,
  subSettings: 3,
  clientSettingItem: 151,
  watchContents: 1,
  watchPlayer: 2,
  watchNext: 3,
};

function rawToBytes(rawBody) {
  if (!rawBody || !rawBody.length) return null;
  return Uint8Array.from(rawBody);
}

function bytesToRaw(bytes) {
  return Array.from(bytes);
}

function readVarint(bytes, pos) {
  let value = 0;
  let shift = 0;
  while (pos < bytes.length) {
    const b = bytes[pos++];
    value |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return [value, pos];
    shift += 7;
    if (shift > 35) throw new Error("varint overflow");
  }
  throw new Error("truncated varint");
}

function writeVarint(value) {
  const out = [];
  let v = value >>> 0;
  while (v > 0x7f) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
  return out;
}

function readTag(bytes, pos) {
  const [tag, next] = readVarint(bytes, pos);
  return [tag >>> 3, tag & 7, next];
}

function skipField(bytes, pos, wireType) {
  switch (wireType) {
    case 0:
      return readVarint(bytes, pos)[1];
    case 1:
      return pos + 8;
    case 2: {
      const [len, next] = readVarint(bytes, pos);
      return next + len;
    }
    case 5:
      return pos + 4;
    default:
      throw new Error("unsupported wire type " + wireType);
  }
}

function encodeTag(fieldNum, wireType) {
  return writeVarint((fieldNum << 3) | wireType);
}

function encodeLengthDelimited(fieldNum, payload) {
  const body = payload instanceof Uint8Array ? payload : Uint8Array.from(payload);
  return [...encodeTag(fieldNum, 2), ...writeVarint(body.length), ...body];
}

function encodeInt32(fieldNum, value) {
  return [...encodeTag(fieldNum, 0), ...writeVarint(value >>> 0)];
}

function encodeBool(fieldNum, value) {
  return encodeInt32(fieldNum, value ? 1 : 0);
}

function encodeBool(fieldNum, value) {
  return encodeInt32(fieldNum, value ? 1 : 0);
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function containsPagead(bytes) {
  for (let i = 0; i <= bytes.length - PAGEAD.length; i++) {
    if (PAGEAD.every((b, j) => bytes[i + j] === b)) return true;
  }
  return false;
}

function mapMessage(bytes, handlers) {
  const out = [];
  let changed = false;
  const present = new Set();
  let i = 0;

  while (i < bytes.length) {
    const fieldStart = i;
    const [fieldNum, wireType, next] = readTag(bytes, i);
    const fieldEnd = skipField(bytes, next, wireType);
    present.add(fieldNum);

    if (handlers.remove?.has(fieldNum)) {
      changed = true;
      i = fieldEnd;
      continue;
    }

    if (wireType === 2 && handlers.transform?.[fieldNum]) {
      const [len, msgStart] = readVarint(bytes, next);
      const msgEnd = msgStart + len;
      const inner = bytes.subarray(msgStart, msgEnd);
      const patched = handlers.transform[fieldNum](inner);
      if (patched.changed || !bytesEqual(patched.bytes, inner)) {
        changed = true;
        out.push(...encodeLengthDelimited(fieldNum, patched.bytes));
      } else {
        out.push(...bytes.subarray(fieldStart, fieldEnd));
      }
    } else {
      out.push(...bytes.subarray(fieldStart, fieldEnd));
    }
    i = fieldEnd;
  }

  if (handlers.append) {
    for (const [key, builder] of Object.entries(handlers.append)) {
      const fieldNum = Number(key);
      if (!present.has(fieldNum)) {
        out.push(...encodeLengthDelimited(fieldNum, builder()));
        changed = true;
      }
    }
  }

  return { bytes: Uint8Array.from(out), changed };
}

function setBoolField(bytes, fieldNum, value) {
  const out = [];
  let changed = false;
  let found = false;
  let i = 0;

  while (i < bytes.length) {
    const fieldStart = i;
    const [num, wireType, next] = readTag(bytes, i);
    const fieldEnd = skipField(bytes, next, wireType);

    if (num === fieldNum && wireType === 0) {
      found = true;
      const [current] = readVarint(bytes, next);
      if ((current !== 0) !== value) {
        changed = true;
        out.push(...encodeBool(fieldNum, value));
      } else {
        out.push(...bytes.subarray(fieldStart, fieldEnd));
      }
    } else {
      out.push(...bytes.subarray(fieldStart, fieldEnd));
    }
    i = fieldEnd;
  }

  if (!found) {
    out.push(...encodeBool(fieldNum, value));
    changed = true;
  }

  return { bytes: Uint8Array.from(out), changed };
}

function buildActiveRender() {
  return Uint8Array.from(encodeBool(F.active, true));
}

function buildMiniPlayerActive() {
  return Uint8Array.from(
    encodeLengthDelimited(F.miniPlayerRender, buildActiveRender())
  );
}

function buildBackgroundPlayerActive() {
  return Uint8Array.from(
    encodeLengthDelimited(F.backgroundPlayerRender, buildActiveRender())
  );
}

function buildPlayabilityStatusForBackground() {
  return Uint8Array.from(
    encodeLengthDelimited(F.backgroundPlayer, buildBackgroundPlayerActive())
  );
}

function replaceBackgroundPlayer() {
  return { bytes: buildBackgroundPlayerActive(), changed: true };
}

function patchMiniPlayer(bytes) {
  return mapMessage(bytes, {
    transform: {
      [F.miniPlayerRender]: (inner) => setBoolField(inner, F.active, true),
    },
    append: {
      [F.miniPlayerRender]: () => buildActiveRender(),
    },
  });
}

function patchPlayabilityStatus(bytes) {
  return mapMessage(bytes, {
    transform: {
      [F.miniPlayer]: patchMiniPlayer,
      [F.backgroundPlayer]: replaceBackgroundPlayer,
    },
    append: {
      [F.backgroundPlayer]: () => buildBackgroundPlayerActive(),
    },
  });
}

function patchPlaybackTracking(bytes) {
  return mapMessage(bytes, {
    remove: new Set([F.pageadViewthrough]),
  });
}

function patchPlayerMessage(bytes) {
  return mapMessage(bytes, {
    remove: PLAYER_AD_FIELDS,
    transform: {
      [F.playabilityStatus]: patchPlayabilityStatus,
      [F.playbackTracking]: patchPlaybackTracking,
    },
    append: {
      [F.playabilityStatus]: () => buildPlayabilityStatusForBackground(),
    },
  });
}

function removeLargePageadChunks(bytes) {
  const out = [];
  let changed = false;
  let i = 0;

  while (i < bytes.length) {
    const fieldStart = i;
    const [fieldNum, wireType, next] = readTag(bytes, i);
    const fieldEnd = skipField(bytes, next, wireType);
    let drop = false;

    if (wireType === 2) {
      const [len, msgStart] = readVarint(bytes, next);
      const inner = bytes.subarray(msgStart, msgStart + len);
      if (len >= MIN_AD_CHUNK && containsPagead(inner)) {
        drop = true;
      } else {
        const nested = removeLargePageadChunks(inner);
        if (nested.changed) {
          changed = true;
          out.push(...encodeTag(fieldNum, 2));
          out.push(...writeVarint(nested.bytes.length));
          out.push(...nested.bytes);
          i = fieldEnd;
          continue;
        }
      }
    }

    if (drop) {
      changed = true;
    } else {
      out.push(...bytes.subarray(fieldStart, fieldEnd));
    }
    i = fieldEnd;
  }

  return { bytes: Uint8Array.from(out), changed };
}

function patchFeedMessage(bytes) {
  return removeLargePageadChunks(bytes);
}

function buildBackgroundSettingItem() {
  const renderer = Uint8Array.from([
    ...encodeBool(2, true),
    ...encodeBool(3, true),
    ...encodeBool(9, true),
    ...encodeBool(10, true),
    ...encodeLengthDelimited(14, Uint8Array.from([...encodeTag(1, 0), ...writeVarint(1093)])),
  ]);
  return Uint8Array.from(encodeLengthDelimited(F.bgPlaybackRenderer, renderer));
}

function containsField(bytes, fieldNum) {
  let i = 0;
  while (i < bytes.length) {
    const [num, wireType, next] = readTag(bytes, i);
    if (num === fieldNum) return true;
    i = skipField(bytes, next, wireType);
  }
  return false;
}

function patchBackgroundSettingRenderer(bytes) {
  let result = setBoolField(bytes, 2, true);
  const d = setBoolField(result.bytes, 3, true);
  const q = setBoolField(d.bytes, 9, true);
  return setBoolField(q.bytes, 10, true);
}

function buildClientSettingData(boolValue) {
  const enumMsg = Uint8Array.from(encodeInt32(1, F.clientSettingItem));
  return Uint8Array.from([
    ...encodeLengthDelimited(1, enumMsg),
    ...encodeBool(3, boolValue),
  ]);
}

function buildServiceEndpoint(boolValue) {
  const endpoint = Uint8Array.from(
    encodeLengthDelimited(1, buildClientSettingData(boolValue))
  );
  return Uint8Array.from(encodeLengthDelimited(F.setClientSettingEndpoint, endpoint));
}

function buildBackgroundToggleSubSetting() {
  const renderer = Uint8Array.from([
    ...encodeLengthDelimited(5, buildServiceEndpoint(true)),
    ...encodeLengthDelimited(6, buildServiceEndpoint(false)),
  ]);
  return Uint8Array.from(encodeLengthDelimited(F.settingBooleanRenderer, renderer));
}

function getCategoryId(bytes) {
  let i = 0;
  while (i < bytes.length) {
    const [num, wireType, next] = readTag(bytes, i);
    if (num === F.categoryId && wireType === 0) {
      return readVarint(bytes, next)[0];
    }
    i = skipField(bytes, next, wireType);
  }
  return 0;
}

function patchSettingCategoryCollection(bytes) {
  if (getCategoryId(bytes) !== 10135) {
    return { bytes, changed: false };
  }
  if (containsField(bytes, F.settingBooleanRenderer)) {
    return { bytes, changed: false };
  }
  return mapMessage(bytes, {
    append: {
      [F.subSettings]: () => buildBackgroundToggleSubSetting(),
    },
  });
}

function patchSettingItem(bytes) {
  let result = { bytes, changed: false };

  if (containsField(bytes, F.settingCategoryCollection)) {
    result = mapMessage(bytes, {
      transform: {
        [F.settingCategoryCollection]: patchSettingCategoryCollection,
      },
    });
  }

  if (containsField(bytes, F.bgPlaybackRenderer)) {
    const patched = mapMessage(bytes, {
      transform: {
        [F.bgPlaybackRenderer]: patchBackgroundSettingRenderer,
      },
    });
    if (patched.changed) result = patched;
  }

  return result;
}

function patchSettingMessage(bytes) {
  const out = [];
  let changed = false;
  let hasBgRenderer = false;
  let i = 0;

  while (i < bytes.length) {
    const fieldStart = i;
    const [fieldNum, wireType, next] = readTag(bytes, i);
    const fieldEnd = skipField(bytes, next, wireType);

    if (wireType === 2 && (fieldNum === F.settingItems || fieldNum === F.collectionItems)) {
      const [len, msgStart] = readVarint(bytes, next);
      const inner = bytes.subarray(msgStart, msgStart + len);
      const patched = patchSettingItem(inner);

      if (containsField(inner, F.bgPlaybackRenderer)) {
        hasBgRenderer = true;
      }

      if (patched.changed) {
        changed = true;
        out.push(...encodeLengthDelimited(fieldNum, patched.bytes));
      } else {
        out.push(...bytes.subarray(fieldStart, fieldEnd));
      }
    } else {
      out.push(...bytes.subarray(fieldStart, fieldEnd));
    }
    i = fieldEnd;
  }

  if (!hasBgRenderer) {
    out.push(...encodeLengthDelimited(F.settingItems, buildBackgroundSettingItem()));
    changed = true;
  }

  return { bytes: Uint8Array.from(out), changed };
}

function patchWatchMessage(bytes) {
  return mapMessage(bytes, {
    transform: {
      [F.watchContents]: (inner) =>
        mapMessage(inner, {
          transform: {
            [F.watchPlayer]: patchPlayerMessage,
            [F.watchNext]: patchFeedMessage,
          },
        }),
    },
  });
}

function getEndpoint(url) {
  try {
    const path = new URL(url).pathname;
    const prefix = "/youtubei/v1/";
    if (!path.startsWith(prefix)) return null;
    const endpoint = path.slice(prefix.length).toLowerCase();
    if (endpoint.startsWith("att/")) return null;
    return ALLOWED.has(endpoint) ? endpoint : null;
  } catch (e) {
    return null;
  }
}

function patchYouTubeBody(bytes, endpoint) {
  let result;

  switch (endpoint) {
    case "player":
      result = patchPlayerMessage(bytes);
      break;
    case "get_watch":
      result = patchWatchMessage(bytes);
      break;
    case "account/get_setting":
    case "get_setting":
      result = patchSettingMessage(bytes);
      break;
    case "browse":
    case "next":
    case "search":
    case "reel/reel_watch_sequence":
      result = patchFeedMessage(bytes);
      break;
    default:
      return { bytes, changed: false };
  }

  if (result.changed) {
    console.log("[youtube] patched " + endpoint);
  }

  return result;
}

globalThis.onRequest = async function onRequest(context, request) {
  return request;
};

globalThis.onResponse = async function onResponse(context, request, response) {
  const endpoint = getEndpoint(request.url);
  if (!endpoint) return response;

  const raw = response.rawBody;
  if (!raw || !raw.length) return response;

  try {
    const input = rawToBytes(raw);
    const result = patchYouTubeBody(input, endpoint);
    if (!result.changed) return response;

    response.rawBody = bytesToRaw(result.bytes);
    return response;
  } catch (e) {
    console.log("[youtube] patch failed for " + endpoint + ": " + e);
    return response;
  }
};
})();
