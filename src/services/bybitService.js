/**
 * Bybit V5 Unified Trading API Integration Service
 * Generates HMAC-SHA256 signatures in-browser using Web Crypto API.
 */

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
 * Probes Bybit Demo Trading (api-demo.bybit.com), Bybit Testnet, and Mainnet
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

  // Helper to test a specific prefix
  async function testEndpoint(prefix, label, envType) {
    try {
      const signature = await hmacSha256(cleanSecret, message);
      const res = await fetch(`${prefix}/v5/user/query-api`, {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': cleanKey,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow,
          'X-BAPI-SIGN': signature
        }
      });
      const data = await res.json();
      return { ok: data.retCode === 0, data, envType, label };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 1. Probe Bybit Demo Trading (api-demo.bybit.com) - Used by bybit.com Demo Trading mode!
  const demoResult = await testEndpoint('/bybit-demo', 'Bybit Demo Trading (api-demo.bybit.com)', 'demo');
  if (demoResult.ok) {
    const isReadOnly = demoResult.data?.result?.readOnly === 1;
    const note = demoResult.data?.result?.note || 'trade lens';
    const uid = demoResult.data?.result?.userID;
    return {
      success: true,
      envType: 'demo',
      endpoint: '/bybit-demo',
      userID: uid,
      readOnly: isReadOnly,
      note,
      message: isReadOnly
        ? `🟢 Connected to Bybit Demo Trading! (UID: ${uid} - '${note}'). ⚠️ Notice: Key is currently Read-Only. (Bybit එකේ ඇත්තටම order එකක් වැටෙන්න නම් Read-Write permission සහිත Key එකක් සාදන්න).`
        : `🟢 Connected to Bybit Demo Trading! (UID: ${uid} - '${note}'). Read-Write Active.`
    };
  }

  // 2. Probe Bybit Testnet (testnet.bybit.com)
  const testnetResult = await testEndpoint('/bybit-testnet', 'Bybit Testnet (testnet.bybit.com)', 'testnet');
  if (testnetResult.ok) {
    const isReadOnly = testnetResult.data?.result?.readOnly === 1;
    return {
      success: true,
      envType: 'testnet',
      endpoint: '/bybit-testnet',
      userID: testnetResult.data?.result?.userID,
      readOnly: isReadOnly,
      message: `🟢 Connected to Bybit Testnet! User ID: ${testnetResult.data?.result?.userID || 'Verified'}`
    };
  }

  // 3. Probe Mainnet (bybit.com)
  const mainnetResult = await testEndpoint('/bybit-main', 'Bybit Mainnet (bybit.com)', 'mainnet');
  if (mainnetResult.ok) {
    const isReadOnly = mainnetResult.data?.result?.readOnly === 1;
    return {
      success: true,
      envType: 'mainnet',
      endpoint: '/bybit-main',
      userID: mainnetResult.data?.result?.userID,
      readOnly: isReadOnly,
      message: `🟢 Connected to Bybit Mainnet! User ID: ${mainnetResult.data?.result?.userID || 'Verified'}`
    };
  }

  // If all failed, return descriptive error
  const errMsg = demoResult.data?.retMsg || testnetResult.data?.retMsg || mainnetResult.data?.retMsg || 'API Key is invalid.';
  return {
    success: false,
    message: `${errMsg}`
  };
}

/**
 * Place a real Order on Bybit V5 (Market Order with TP and SL)
 */
export async function placeBybitLiveOrder({
  apiKey,
  apiSecret,
  endpoint = '/bybit-demo',
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
  const prefix = endpoint || '/bybit-demo';

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
export async function fetchBybitPositions({ apiKey, apiSecret, endpoint = '/bybit-demo' }) {
  if (!apiKey || !apiSecret) return { success: false, positions: [] };

  const cleanKey = apiKey.trim();
  const cleanSecret = apiSecret.trim();
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const prefix = endpoint || '/bybit-demo';
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
export async function closeBybitPosition({ apiKey, apiSecret, endpoint = '/bybit-demo', symbol, side, qty }) {
  if (!apiKey || !apiSecret || !symbol || !qty) return { success: false, message: 'Missing parameters' };

  const cleanKey = apiKey.trim();
  const cleanSecret = apiSecret.trim();
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const prefix = endpoint || '/bybit-demo';

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
export async function closeAllBybitPositions({ apiKey, apiSecret, endpoint = '/bybit-demo' }) {
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


