const baseUrl = process.env.FLOW_BASE_URL || 'http://localhost:4178';

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return { status: response.status, text };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const health = await request('/api/health');
assert(health.status === 200, `Health check falhou: ${health.status}`);

const trpcHealth = await request('/api/trpc/health');
assert(trpcHealth.status === 200, `tRPC health falhou: ${trpcHealth.status}`);

const protectedChecks = [
  ['/api/finance/overview', { method: 'GET' }],
  ['/api/admin/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
  ['/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
  ['/api/events/test/enroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
  ['/api/event-enrollments/test/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
  ['/api/event-enrollments/test/check-in-preview', { method: 'GET' }],
  ['/api/school/enrollments/test/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
  ['/api/school/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
  ['/api/school/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }],
];

for (const [path, init] of protectedChecks) {
  const result = await request(path, init);
  assert(result.status === 401, `${path} deveria exigir autenticacao, recebeu ${result.status}`);
}

const webhook = await request('/api/webhooks/mercadopago', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
assert(webhook.status === 202, `Webhook vazio deveria ser aceito/ignorado, recebeu ${webhook.status}`);

console.log(`flow-smoke-tests-ok ${baseUrl}`);
