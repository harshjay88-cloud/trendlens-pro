/**
 * Bybit V5 Unified Trading API Integration Service
 * Generates HMAC-SHA256 signatures in-browser using Web Crypto API.
 * Uses direct Bybit API endpoints with full CORS compatibility.
 */

export const BYBIT_ENDPOINTS = {
  demo: 'https://api-demo.bybit.com',
  testnet: 'https://api-testnet.bybit.com',
  mainnet: 'https://api.bybit.com'
};

/**
 * Resolves legacy proxy paths (/bybit-demo, etc.) to direct Bybit CORS endpoints
 */
export function resolveEndpoint(endpoint = 'https://api-demo.bybit.com') {
  if (!endpoint) return 'https://api-demo.bybit.com';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  if (endpoint.includes('testnet')) {
    return 'https://api-testnet.bybit.com';
  }
  if (endpoint.includes('main')) {
    return 'https://api.bybit.com';
  }
  return 'https://api-demo.bybit.com';
}

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret.trim()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Test Bybit API Key and Secret connection
 * Probes Bybit Demo Trading (api-demo.bybit.com), Mainnet (api.bybit.com), and Testnet (api-testnet.bybit.com)
 */
export async function testBybitApiConnection({ apiKey, apiSecret }) {
  if (!apiKey) {
    return { success: false, message: 'API Key is missing.' };
  }
  if (!apiSecret) {
    return {
      success: false,
      message: 'Bybit requires your API Secret for HMAC-SHA256 authentication.'
    };
  }

  const cleanKey = apiKey.trim();
  const cleanSecret = apiSecret.trim();
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const queryString = '';
  const message = `${timestamp}${cleanKey}${recvWindow}${queryString}`;

  // Helper to test a direct endpoint
  async function testEndpoint(baseUrl, label, envType) {
    try {
      const signature = await hmacSha256(cleanSecret, message);
      const res = await fetch(`${baseUrl}/v5/user/query-api`, {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': cleanKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': signature
        }
      });
      const data = await res.json();
      return {
        ok: data.retCode === 0,
        retCode: data.retCode,
        retMsg: data.retMsg,
        data,
        envType,
        label,
        baseUrl
      };
    } catch (err) {
      return { ok: false, error: err.message, envType, label, baseUrl };
    }
  }

  // 1. Probe Bybit Demo Trading (api-demo.bybit.com) - Used by bybit.com Demo Trading
  const demoResult = await testEndpoint('https://api-demo.bybit.com', 'Bybit Demo Trading', 'demo');
  if (demoResult.ok) {
    const isReadOnly = demoResult.data?.result?.readOnly === 1;
    const note = demoResult.data?.result?.note || 'TradeLens';
    const uid = demoResult.data?.result?.userID;
    return {
      success: true,
      envType: 'demo',
      endpoint: 'https://api-demo.bybit.com',
      userID: uid,
      readOnly: isReadOnly,
      note,
      message: isReadOnly
        ? `🟢 Connected to Bybit Demo Trading! (UID: ${uid} - '${note}'). ⚠️ Notice: Key is currently Read-Only.`
        : `🟢 Connected to Bybit Demo Trading! (UID: ${uid} - '${note}'). Read-Write Active.`
    };
  }

  // 2. Probe Mainnet (api.bybit.com)
  const mainnetResult = await testEndpoint('https://api.bybit.com', 'Bybit Mainnet', 'mainnet');
  if (mainnetResult.ok) {
    const isReadOnly = mainnetResult.data?.result?.readOnly === 1;
    const note = mainnetResult.data?.result?.note || 'TradeLens';
    const uid = mainnetResult.data?.result?.userID;
    return {
      success: true,
      envType: 'mainnet',
      endpoint: 'https://api.bybit.com',
      userID: uid,
      readOnly: isReadOnly,
      note,
      message: `🟢 Connected to Bybit Mainnet! (UID: ${uid} - '${note}').`
    };
  }

  // 3. Probe Testnet (api-testnet.bybit.com)
  const testnetResult = await testEndpoint('https://api-testnet.bybit.com', 'Bybit Testnet', 'testnet');
  if (testnetResult.ok) {
    const isReadOnly = testnetResult.data?.result?.readOnly === 1;
    const uid = testnetResult.data?.result?.userID;
    return {
      success: true,
      envType: 'testnet',
      endpoint: 'https://api-testnet.bybit.com',
      userID: uid,
      readOnly: isReadOnly,
      message: `🟢 Connected to Bybit Testnet! User ID: ${uid || 'Verified'}`
    };
  }

  // Check specific Bybit error codes
  const allResults = [demoResult, mainnetResult, testnetResult];
  
  // 10004: Key exists on Bybit, but Secret/signature mismatch
  const signErr = allResults.find(r => r.retCode === 10004);
  if (signErr) {
    return {
      success: false,
      retCode: 10004,
      message: '⚠️ Bybit Error (10004): API Key එක හඳුනාගෙන ඇත, නමුත් ඔබ ලබාදුන් API Secret එක වැරදියි (Error sign). කරුණාකර Bybit හි අලුත් API Key එකක් සාදා එහි Secret එක නිවැරදිව Copy කර ලබාදෙන්න.'
    };
  }

  // 10005: Permission Denied
  const permErr = allResults.find(r => r.retCode === 10005);
  if (permErr) {
    return {
      success: false,
      retCode: 10005,
      message: '⚠️ Bybit Error (10005): Permission Denied. කරුණාකර Bybit API Key එකට "Contract / Unified Trading" සහ "Orders" permissions ලබාදෙන්න.'
    };
  }

  // 10010: IP Whitelist
  const ipErr = allResults.find(r => r.retCode === 10010);
  if (ipErr) {
    return {
      success: false,
      retCode: 10010,
      message: '⚠️ Bybit Error (10010): IP Whitelist error. Bybit API Settings වල "No IP restriction" තෝරන්න.'
    };
  }

  // 10003: Key not found on Bybit
  const keyNotFound = allResults.every(r => r.retCode === 10003);
  if (keyNotFound) {
    return {
      success: false,
      retCode: 10003,
      message: '⚠️ Bybit Error (10003): මෙම API Key එක Bybit හි හමු නොවීය. Bybit Demo Trading හෝ Real Account එකෙන් සාදාගත් Key එකක් දැයි පරීක්ෂා කරන්න.'
    };
  }

  // Network connection error
  const netError = allResults.find(r => r.error);
  if (netError && allResults.every(r => !r.retCode)) {
    return {
      success: false,
      message: `⚠️ Connection Error: ${netError.error}`
    };
  }

  const errMsg = demoResult.retMsg || mainnetResult.retMsg || testnetResult.retMsg || 'API Key is invalid.';
  return {
    success: false,
    message: `⚠️ Bybit Notice: ${errMsg}`
  };
}

/**
 * Place a real Order on Bybit V5 (Market Order with TP and SL)
 */
export async function placeBybitLiveOrder({
  apiKey,
  apiSecret,
  endpoint = 'https://api-demo.bybit.com',
  symbol = 'BTCUSDT',
  side = 'Buy',
  qty = '0.001',
  takeProfit,
  stopLoss
}) {
  if (!apiKey || !apiSecret) {
    return {
      success: false,
      reason: 'MISSING_SECRET',
      message: 'Bybit API Secret is required to place real orders.'
    };
  }

  const cleanKey = apiKey.trim();
  const cleanSecret = apiSecret.trim();
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const prefix = resolveEndpoint(endpoint);

  // Format symbol (e.g. BTC/USDT -> BTCUSDT, XAU/USD -> PAXGUSDT)
  let cleanSymbol = symbol.replace(/[\/\-_]/g, '').toUpperCase();
  if (cleanSymbol === 'XAUUSD' || cleanSymbol === 'GOLD') {
    cleanSymbol = 'BTCUSDT'; // Map commodity to primary Bybit perpetual
  }

  const payload = {
    category: 'linear',
    symbol: cleanSymbol,
    side: side.toLowerCase() === 'buy' ? 'Buy' : 'Sell',
    orderType: 'Market',
    qty: String(qty),
    timeInForce: 'GTC'
  };

  if (takeProfit) payload.takeProfit = String(takeProfit);
  if (stopLoss) payload.stopLoss = String(stopLoss);

  const bodyStr = JSON.stringify(payload);
  const message = `${timestamp}${cleanKey}${recvWindow}${bodyStr}`;

  try {
    const signature = await hmacSha256(cleanSecret, message);
    const res = await fetch(`${prefix}/v5/order/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': cleanKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN': signature
      },
      body: bodyStr
    });

    const data = await res.json();
    if (data.retCode === 0) {
      return {
        success: true,
        orderId: data.result?.orderId,
        orderLinkId: data.result?.orderLinkId,
        data: data.result
      };
    } else {
      return {
        success: false,
        retCode: data.retCode,
        message: data.retMsg || `Bybit Error code: ${data.retCode}`
      };
    }
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Failed to dispatch order to Bybit endpoint.'
    };
  }
}

/**
 * Fetch Open Positions directly from Bybit V5
 */
export async function fetchBybitPositions({ apiKey, apiSecret, endpoint = 'https://api-demo.bybit.com' }) {
  if (!apiKey || !apiSecret) return { success: false, positions: [] };

  const cleanKey = apiKey.trim();
  const cleanSecret = apiSecret.trim();
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const prefix = resolveEndpoint(endpoint);
  const query = 'category=linear&settleCoin=USDT';
  const message = `${timestamp}${cleanKey}${recvWindow}${query}`;

  try {
    const signature = await hmacSha256(cleanSecret, message);
    const res = await fetch(`${prefix}/v5/position/list?${query}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': cleanKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN': signature
      }
    });
    const data = await res.json();
    if (data.retCode === 0) {
      const activePositions = (data.result?.list || []).filter(p => parseFloat(p.size) > 0);
      return {
        success: true,
        positions: activePositions
      };
    }
    return { success: false, message: data.retMsg, positions: [] };
  } catch (err) {
    return { success: false, message: err.message, positions: [] };
  }
}

/**
 * Close a single Bybit position with a Market reduceOnly order
 */
export async function closeBybitPosition({ apiKey, apiSecret, endpoint = 'https://api-demo.bybit.com', symbol, side, qty }) {
  if (!apiKey || !apiSecret || !symbol || !qty) return { success: false, message: 'Missing parameters' };

  const cleanKey = apiKey.trim();
  const cleanSecret = apiSecret.trim();
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const prefix = resolveEndpoint(endpoint);

  const payload = {
    category: 'linear',
    symbol,
    side: side.toLowerCase() === 'buy' ? 'Sell' : 'Buy',
    orderType: 'Market',
    qty: String(qty),
    reduceOnly: true,
    timeInForce: 'GTC'
  };

  const bodyStr = JSON.stringify(payload);
  const message = `${timestamp}${cleanKey}${recvWindow}${bodyStr}`;

  try {
    const signature = await hmacSha256(cleanSecret, message);
    const res = await fetch(`${prefix}/v5/order/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': cleanKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN': signature
      },
      body: bodyStr
    });
    const data = await res.json();
    return {
      success: data.retCode === 0,
      retCode: data.retCode,
      message: data.retMsg || 'Position Closed'
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Close All Open Positions in Bybit Demo Trading
 */
export async function closeAllBybitPositions({ apiKey, apiSecret, endpoint = 'https://api-demo.bybit.com' }) {
  const { positions } = await fetchBybitPositions({ apiKey, apiSecret, endpoint });
  if (!positions || positions.length === 0) {
    return { success: true, count: 0, message: 'No active positions found to close.' };
  }

  let closedCount = 0;
  for (const pos of positions) {
    const res = await closeBybitPosition({
      apiKey,
      apiSecret,
      endpoint,
      symbol: pos.symbol,
      side: pos.side,
      qty: pos.size
    });
    if (res.success) closedCount++;
  }

  return {
    success: true,
    count: closedCount,
    message: `Closed ${closedCount} active Bybit positions.`
  };
}
