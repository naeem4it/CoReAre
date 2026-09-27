const { Client } = require('ssh2');

const config = {
  host: '95.217.152.187',
  port: 22,
  username: 'mashrueadmin',
  password: 'Password123!',
  readyTimeout: 30000,
};

function runCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: true }, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      stream.on('data', (d) => {
        const s = d.toString();
        stdout += s;
        if (s.includes('[sudo]') || s.includes('Password:')) {
          stream.write('Password123!\n');
        }
      });
      stream.stderr.on('data', (d) => stderr += d.toString());
    });
  });
}

const nginxConf = `# ==============================================================================
# DBARc Suite - Nginx Configuration for Subdomains
# dbarc.mashrue.com       -> Next.js Tenant Portal (Port 3000)
# shipzo.mashrue.com      -> Next.js Courier Portal (Port 3001)
# api.dbarc.mashrue.com   -> Strapi Central API    (Port 1337)
# ==============================================================================

# 1. DBARc Tenant Portal
server {
    listen 80;
    listen [::]:80;
    server_name dbarc.mashrue.com;

    client_max_body_size 50M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# 2. Shipzo Courier Portal
server {
    listen 80;
    listen [::]:80;
    server_name shipzo.mashrue.com;

    client_max_body_size 50M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# 3. DBARc Backend API & Strapi Admin
server {
    listen 80;
    listen [::]:80;
    server_name api.dbarc.mashrue.com;

    client_max_body_size 100M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_buffering off;
    }
}
`;

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(config);
  });

  console.log('Connected to SSH.');

  // Create certbot acme dir
  await runCommand(conn, 'sudo -S mkdir -p /var/www/certbot');

  console.log('Uploading dbarc.conf to /tmp/dbarc.conf...');
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const w = sftp.createWriteStream('/tmp/dbarc.conf');
      w.on('close', resolve);
      w.on('error', reject);
      w.end(nginxConf);
    });
  });

  console.log('Moving /tmp/dbarc.conf to /etc/nginx/sites-available/dbarc.conf...');
  await runCommand(conn, 'sudo -S cp /tmp/dbarc.conf /etc/nginx/sites-available/dbarc.conf');

  console.log('Enabling dbarc site...');
  await runCommand(conn, 'sudo -S ln -sf /etc/nginx/sites-available/dbarc.conf /etc/nginx/sites-enabled/dbarc.conf');

  console.log('Testing Nginx configuration syntax...');
  const testRes = await runCommand(conn, 'sudo -S nginx -t');
  console.log(testRes.stdout);

  if (testRes.stdout.includes('syntax is ok') && testRes.stdout.includes('test is successful')) {
    console.log('Nginx config is VALID. Reloading Nginx...');
    const reloadRes = await runCommand(conn, 'sudo -S systemctl reload nginx');
    console.log(reloadRes.stdout);
    console.log('Nginx reloaded successfully!');
  } else {
    console.error('Nginx test failed! NOT reloading to protect mashrue.com!');
  }

  // Also verify mashrue.com is still healthy
  const mashrueHealth = await runCommand(conn, 'curl -k -I https://mashrue.com');
  console.log('mashrue.com health check:\n', mashrueHealth.stdout);

  // Test local Host headers for the 3 subdomains
  const hostTests = await runCommand(conn, `
    curl -s -o /dev/null -w "dbarc.mashrue.com: %{http_code}\\n" -H "Host: dbarc.mashrue.com" http://127.0.0.1/
    curl -s -o /dev/null -w "shipzo.mashrue.com: %{http_code}\\n" -H "Host: shipzo.mashrue.com" http://127.0.0.1/
    curl -s -o /dev/null -w "api.dbarc.mashrue.com: %{http_code}\\n" -H "Host: api.dbarc.mashrue.com" http://127.0.0.1/
  `);
  console.log('Subdomain Nginx proxy tests via localhost:\n', hostTests.stdout);

  conn.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
