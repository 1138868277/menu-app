/**
 * 本地测试脚本 — 验证腾讯云 API 能否成功获取预览 Token
 * 用法: TENCENT_SECRET_ID=xxx TENCENT_SECRET_KEY=xxx node scripts/test-api.mjs
 */
import crypto from 'crypto';
import https from 'https';

const secretId  = process.env.TENCENT_SECRET_ID;
const secretKey = process.env.TENCENT_SECRET_KEY;

if (!secretId || !secretKey) {
  console.error('请传入 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY');
  process.exit(1);
}

const CONFIG = {
  secretId,
  secretKey,
  zoneId:  process.env.ZONE_ID || 'zone-3roxyn3x48r6',
  text:    process.env.DOMAIN_TEXT || 'menu-app-wnzrr6ot.edgeone.cool',
  service: 'teo',
  version: '2022-09-01',
  region:  'ap-guangzhou',
  action:  'DescribePagesResources',
};

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
    'POST', '/', '',
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
        'Content-Type':   'application/json',
        'Host':           host,
        'X-TC-Action':    CONFIG.action,
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Version':   CONFIG.version,
        'X-TC-Region':    CONFIG.region,
        'Authorization':  authorization,
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('解析失败: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔍 测试 Tencent Cloud API...\n');
  console.log('  参数:', JSON.stringify({ ZoneId: CONFIG.zoneId, Text: CONFIG.text }, null, 2));
  console.log();

  try {
    const resp = await callTencentApi({
      Interface: 'pages:DescribePagesEncipherToken',
      ZoneId:    CONFIG.zoneId,
      Payload:   JSON.stringify({ Text: CONFIG.text }),
    });

    console.log('📦 响应:', JSON.stringify(resp, null, 2));

    const resultStr = resp?.Response?.Result;
    if (resultStr) {
      const result = JSON.parse(resultStr);
      const previewUrl = `https://${CONFIG.text}?eo_token=${result.Token}&eo_time=${result.Timestamp}`;
      console.log('\n✅ API 调用成功！');
      console.log('   Token:', result.Token);
      console.log('   预览地址:', previewUrl);
    } else {
      console.log('\n❌ API 返回异常:', JSON.stringify(resp));
    }
  } catch (err) {
    console.error('\n❌ 请求失败:', err.message);
  }
}

main();
