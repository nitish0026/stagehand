// Test remote session creation (BB_ENV=dev mode)
// Requires Browserbase API key and project ID

(async () => {
  // Test 1: Without credentials (should fail with 400)
  console.log('=== Test 1: Without Browserbase credentials ===');
  try {
    const res = await fetch('http://localhost:3000/v1/sessions/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        modelName: 'gpt-4o',
        browser: { type: 'browserbase' }
      })
    });
    const txt = await res.text();
    console.log('STATUS:', res.status);
    console.log('RESPONSE:', txt);
    console.log('');
  } catch (e) {
    console.error('ERROR:', e.message);
  }

  // Test 2: With mock credentials (will fail at Browserbase API layer)
  console.log('=== Test 2: With mock Browserbase credentials ===');
  try {
    const res = await fetch('http://localhost:3000/v1/sessions/start', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bb-api-key': 'dummy_api_key_123',
        'x-bb-project-id': 'dummy_project_id_456'
      },
      body: JSON.stringify({
        modelName: 'gpt-4o',
        browser: { type: 'browserbase' }
      })
    });
    const txt = await res.text();
    console.log('STATUS:', res.status);
    console.log('RESPONSE:', txt);
    console.log('');
  } catch (e) {
    console.error('ERROR:', e.message);
  }

  console.log('=== Summary ===');
  console.log('Server is running in remote (dev) mode.');
  console.log('To create a real Browserbase session, provide:');
  console.log('  - x-bb-api-key: Your Browserbase API key');
  console.log('  - x-bb-project-id: Your Browserbase project ID');
  console.log('  - browser.type: "browserbase"');
  console.log('');
  console.log('Example curl:');
  console.log('curl -X POST http://localhost:3000/v1/sessions/start \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "x-bb-api-key: YOUR_API_KEY" \\');
  console.log('  -H "x-bb-project-id: YOUR_PROJECT_ID" \\');
  console.log('  -d \'{"modelName":"gpt-4o","browser":{"type":"browserbase"}}\'');
})();
