'use strict';

const crypto = require('crypto');
const https = require('https');

/* ============ 配置 ============ */
// 这些通过 SCF 环境变量传入
const CONFIG = {
  secretId:     process.env.TENCENT_SECRET_ID,
  secretKey:    process.env.TENCENT_SECRET_KEY,
  zoneId:       process.env.ZONE_ID       || 'zone-3roxyn3x48r6',
  text:         process.env.DOMAIN_TEXT   || 'menu-app-wnzrr6ot.edgeone.cool',
  service:      'teo',
  version:      '2022-09-01',
  region:       'ap-guangzhou',
  action:       'DescribePagesResources',

  vercelToken:  process.env.VERCEL_TOKEN,
  edgeConfigId: process.env.EDGE_CONFIG_ID,
  vercelTeamId: process.env.VERCEL_TEAM_ID || '',
};

/* ============ 腾讯云 Signature v3 ============ */
function sha256Hex(msg) {
  return crypto.createHash('sha256').update(msg).digest('hex');
}

function hmacSha256(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

async function callTencentApi(payload) {
  const host = `${CONFIG.service}.tencentcloudapi.com`;
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  const canonicalRequest = [
    'POST',
    '/',
    '',
    'content-type:application/json\nhost:' + host + '\n',
    'content-type;host',
    sha256Hex(JSON.stringify(payload)),
  ].join('\n');

  const credentialScope = `${date}/${CONFIG.service}/tc3_request`;
  const stringToSign = [
    'TC3-HMAC-SHA256',
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const secretDate    = hmacSha256('TC3' + CONFIG.secretKey, date);
  const secretService = hmacSha256(secretDate, CONFIG.service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature     = crypto.createHmac('sha256', secretSigning)
                              .update(stringToSign)
                              .digest('hex');

  const authorization = [
    `TC3-HMAC-SHA256 Credential=${CONFIG.secretId}/${credentialScope}`,
    'SignedHeaders=content-type;host',
    `Signature=${signature}`,
  ].join(', ');

  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: host,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Host':          host,
        'X-TC-Action':   CONFIG.action,
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Version':  CONFIG.version,
        'X-TC-Region':   CONFIG.region,
        'Authorization': authorization,
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('解析响应失败: ' + data.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ============ 更新 Vercel Edge Config ============ */
async function updateEdgeConfig(url) {
  const items = JSON.stringify({
    items: [{ operation: 'upsert', key: 'previewUrl', value: url }],
  });

  let path = `/v1/edge-config/${CONFIG.edgeConfigId}/items`;
  if (CONFIG.vercelTeamId) path += `?teamId=${CONFIG.vercelTeamId}`;

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.vercel.com',
      path,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CONFIG.vercelToken}`,
        'Content-Type':  'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(items);
    req.end();
  });
}

/* ============ SCF 入口 ============ */
exports.main_handler = async (event, context) => {
  console.log('[开始] 更新预览地址');

  // 校验必需配置
  const required = ['secretId', 'secretKey', 'vercelToken', 'edgeConfigId'];
  for (const key of required) {
    if (!CONFIG[key]) {
      const msg = `缺少环境变量: ${key}`;
      console.error('[失败]', msg);
      return { code: -1, message: msg };
    }
  }

  try {
    // 1. 调用腾讯云 API 获取 Token
    // DescribePagesResources 是调度接口，通过 Interface 参数分发到具体子服务
    console.log('[请求] pages:DescribePagesEncipherToken');
    const apiResp = await callTencentApi({
      Interface: 'pages:DescribePagesEncipherToken',
      ZoneId:    CONFIG.zoneId,
      Payload:   JSON.stringify({ Text: CONFIG.text }),
    });
    console.log('[响应]', JSON.stringify(apiResp));

    const resultStr = apiResp?.Response?.Result;
    if (!resultStr) {
      throw new Error('API 返回异常（接口可能不支持公开调用）: ' + JSON.stringify(apiResp));
    }

    const result = JSON.parse(resultStr);
    const { Token: token, Timestamp: timestamp } = result;
    if (!token || !timestamp) {
      throw new Error('Token 为空: ' + resultStr);
    }

    // 2. 拼接预览地址
    const previewUrl = `https://${CONFIG.text}?eo_token=${token}&eo_time=${timestamp}`;
    console.log('[预览地址]', previewUrl);

    // 3. 更新 Vercel Edge Config
    const vercelResp = await updateEdgeConfig(previewUrl);
    console.log('[Vercel]', vercelResp.status, vercelResp.body);

    if (vercelResp.status === 200) {
      console.log('[完成] 预览地址已更新');
      return { code: 0, message: 'ok', previewUrl };
    }

    throw new Error(`Vercel 返回 ${vercelResp.status}: ${vercelResp.body}`);
  } catch (err) {
    console.error('[错误]', err.message);
    return { code: -2, message: err.message };
  }
};
