const axios = require('axios');

async function test() {
  try {
    // 1. Login as ginjeeerider#1
    const loginRes = await axios.post('http://localhost:1337/api/auth/local', {
      identifier: 'ginjeeerider#1',
      password: 'Password123!'
    });
    console.log('Login success! User:', loginRes.data.user);
    const token = loginRes.data.jwt;

    // 2. Fetch /api/riders
    const ridersRes = await axios.get('http://localhost:1337/api/riders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Riders API response:', JSON.stringify(ridersRes.data, null, 2));

    // 3. Fetch /api/delivery-sheets with populate
    const dsRes = await axios.get('http://localhost:1337/api/delivery-sheets?populate[0]=parcels&populate[1]=parcels.destination_city&populate[2]=parcels.shipper&populate[3]=rider&sort[0]=id:desc', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Delivery Sheets API response count:', dsRes.data?.data?.length);
    console.log('Delivery Sheets data:', JSON.stringify(dsRes.data, null, 2));
  } catch (err) {
    console.error('Error in test:', err.response?.status, err.response?.data || err.message);
  }
}

test();
