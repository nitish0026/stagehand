// Use global fetch available in Node 18+ (no node-fetch required)
(async ()=>{
  try{
    const res = await fetch('http://192.168.31.15:3000/v1/sessions/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        modelName: 'gpt-4o',
        browser: { type: 'local', cdpUrl: 'http://example.local:9222' }
      })
    });
    const txt = await res.text();
    console.log('STATUS', res.status);
    console.log(txt);
  }catch(e){
    console.error('ERROR', e);
  }
})();
