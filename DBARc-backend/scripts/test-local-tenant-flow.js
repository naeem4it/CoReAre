const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function main() {
  console.log('Testing against running Strapi at http://127.0.0.1:1337...');

  try {
    // 1. Login as Admin
    console.log('\n[Test 1] Logging in as Admin (naeem4it@gmail.com)...');
    const loginRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 1337,
      path: '/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: 'naeem4it@gmail.com',
      password: '#0321Blouch'
    });

    console.log('Admin login status:', loginRes.status);
    const token = loginRes.data?.data?.token;
    if (!token) {
      throw new Error(`Failed to obtain admin token: ${JSON.stringify(loginRes.data)}`);
    }
    console.log('Admin token obtained successfully!');

    // 2. Test Content API with Admin Token (/api/tenant/list)
    console.log('\n[Test 2] Calling GET /api/tenant/list with Admin Bearer token...');
    const listRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 1337,
      path: '/api/tenant/list',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('GET /api/tenant/list status:', listRes.status);
    if (listRes.status === 401) {
      console.error('ERROR: Still returned 401!', listRes.data);
    } else {
      console.log('SUCCESS: Content API authorized with admin token!');
    }

    // 3. Test Content API /api/users
    console.log('\n[Test 3] Calling GET /api/users?populate=* with Admin Bearer token...');
    const usersRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 1337,
      path: '/api/users?populate=*',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('GET /api/users status:', usersRes.status);
    if (usersRes.status === 401) {
      console.error('ERROR: /api/users returned 401!', usersRes.data);
    } else {
      console.log('SUCCESS: /api/users authorized! Total users returned:', Array.isArray(usersRes.data) ? usersRes.data.length : 'ok');
    }

    // 4. Test Tenant Provisioning
    console.log('\n[Test 4] Testing POST /api/tenant/provision...');
    const testTenantPayload = {
      name: 'Test Logistics Local ' + Date.now().toString().slice(-4),
      domain: 'test' + Date.now().toString().slice(-4) + '.dbarc.com',
      address: 'Main Boulevard, Lahore',
      plan: 'Basic',
      commissionPct: 2.0,
      status: 'active',
      features: {
        tplAggregation: true,
        liveRiderTracking: true,
        smsNotifications: true,
        doorstepDigitalPay: false,
        pakistanTaxEngine: true
      },
      adminUsername: 'testadmin_' + Date.now().toString().slice(-4),
      adminFullName: 'Test Tenant Admin',
      adminEmail: 'testtenant_' + Date.now().toString().slice(-4) + '@test.com',
      adminPassword: 'Password123!',
      confirmationType: 'no_confirmation'
    };

    const provRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 1337,
      path: '/api/tenant/provision',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, testTenantPayload);

    console.log('Provisioning HTTP status:', provRes.status);
    console.log('Provisioning response:', JSON.stringify(provRes.data));

    if (provRes.status === 200 || provRes.status === 201) {
      console.log('\n>>> ALL LOCAL TESTS PASSED SUCCESSFULLY! <<<');
    } else {
      console.error('\n>>> PROVISIONING TEST FAILED! <<<');
    }

  } catch (err) {
    console.error('Test execution error:', err);
  }
}

main().catch(console.error);
