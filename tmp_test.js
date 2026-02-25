const fetch = global.fetch || require('node-fetch');
(async () => {
  const args = process.argv.slice(2);
  const browserType = args[0] || 'local';
  const body = { modelName: 'gpt-4o', browser: { type: browserType } };
  if (browserType === 'local') {
    body.browser.cdpUrl = 'https://www.example.com/';
  }
  const res = await fetch('http://localhost:3000/v1/sessions/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log('browserType', browserType, 'status', res.status);
  console.log(await res.text());
})();
