import fetch from 'node-fetch';

(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/deferrals/debug/force-approved', { method: 'POST' });
    const body = await res.json();
    console.log('status', res.status);
    console.log(JSON.stringify(body, null, 2));
  } catch (e) {
    console.error('ERR', e);
  }
})();