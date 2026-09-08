const { Client } = require('pg');
const crypto = require('crypto');

function generateDocumentId() {
  return crypto.randomBytes(12).toString('hex');
}

// Canonical list of major Pakistan districts & cities
const DEFAULT_PAKISTAN_CITIES = [
  // Punjab
  { name: 'Lahore', province: 'Punjab', district: 'Lahore', isMajor: true },
  { name: 'Raiwind', province: 'Punjab', district: 'Lahore' },
  { name: 'Shahdara', province: 'Punjab', district: 'Lahore' },
  { name: 'Faisalabad', province: 'Punjab', district: 'Faisalabad', isMajor: true },
  { name: 'Jaranwala', province: 'Punjab', district: 'Faisalabad' },
  { name: 'Samundri', province: 'Punjab', district: 'Faisalabad' },
  { name: 'Dijkot', province: 'Punjab', district: 'Faisalabad' },
  { name: 'Rawalpindi', province: 'Punjab', district: 'Rawalpindi', isMajor: true },
  { name: 'Murree', province: 'Punjab', district: 'Rawalpindi' },
  { name: 'Gujar Khan', province: 'Punjab', district: 'Rawalpindi' },
  { name: 'Taxila', province: 'Punjab', district: 'Rawalpindi' },
  { name: 'Multan', province: 'Punjab', district: 'Multan', isMajor: true },
  { name: 'Shujabad', province: 'Punjab', district: 'Multan' },
  { name: 'Jalalpur Pirwala', province: 'Punjab', district: 'Multan' },
  { name: 'Gujranwala', province: 'Punjab', district: 'Gujranwala', isMajor: true },
  { name: 'Kamoke', province: 'Punjab', district: 'Gujranwala' },
  { name: 'Wazirabad', province: 'Punjab', district: 'Gujranwala' },
  { name: 'Sialkot', province: 'Punjab', district: 'Sialkot', isMajor: true },
  { name: 'Daska', province: 'Punjab', district: 'Sialkot' },
  { name: 'Sambrial', province: 'Punjab', district: 'Sialkot' },
  { name: 'Pasrur', province: 'Punjab', district: 'Sialkot' },
  { name: 'Sargodha', province: 'Punjab', district: 'Sargodha', isMajor: true },
  { name: 'Bhalwal', province: 'Punjab', district: 'Sargodha' },
  { name: 'Kot Momin', province: 'Punjab', district: 'Sargodha' },
  { name: 'Bahawalpur', province: 'Punjab', district: 'Bahawalpur', isMajor: true },
  { name: 'Hasilpur', province: 'Punjab', district: 'Bahawalpur' },
  { name: 'Ahmadpur East', province: 'Punjab', district: 'Bahawalpur' },
  { name: 'Rahim Yar Khan', province: 'Punjab', district: 'Rahim Yar Khan', isMajor: true },
  { name: 'Sadiqabad', province: 'Punjab', district: 'Rahim Yar Khan' },
  { name: 'Khanpur', province: 'Punjab', district: 'Rahim Yar Khan' },
  { name: 'Sheikhupura', province: 'Punjab', district: 'Sheikhupura', isMajor: true },
  { name: 'Muridke', province: 'Punjab', district: 'Sheikhupura' },
  { name: 'Kasur', province: 'Punjab', district: 'Kasur' },
  { name: 'Pattoki', province: 'Punjab', district: 'Kasur' },
  { name: 'Chunian', province: 'Punjab', district: 'Kasur' },
  { name: 'Okara', province: 'Punjab', district: 'Okara' },
  { name: 'Depalpur', province: 'Punjab', district: 'Okara' },
  { name: 'Renala Khurd', province: 'Punjab', district: 'Okara' },
  { name: 'Sahiwal', province: 'Punjab', district: 'Sahiwal', isMajor: true },
  { name: 'Chichawatni', province: 'Punjab', district: 'Sahiwal' },
  { name: 'Gujrat', province: 'Punjab', district: 'Gujrat', isMajor: true },
  { name: 'Kharian', province: 'Punjab', district: 'Gujrat' },
  { name: 'Lalamusa', province: 'Punjab', district: 'Gujrat' },
  { name: 'Jhelum', province: 'Punjab', district: 'Jhelum' },
  { name: 'Dina', province: 'Punjab', district: 'Jhelum' },
  { name: 'Chiniot', province: 'Punjab', district: 'Chiniot' },
  { name: 'Lalian', province: 'Punjab', district: 'Chiniot' },
  { name: 'Mianwali', province: 'Punjab', district: 'Mianwali' },
  { name: 'Chakwal', province: 'Punjab', district: 'Chakwal' },
  { name: 'Talagang', province: 'Punjab', district: 'Chakwal' },
  { name: 'Pakpattan', province: 'Punjab', district: 'Pakpattan' },
  { name: 'Arifwala', province: 'Punjab', district: 'Pakpattan' },
  { name: 'Vehari', province: 'Punjab', district: 'Vehari' },
  { name: 'Burewala', province: 'Punjab', district: 'Vehari' },
  { name: 'Mailsi', province: 'Punjab', district: 'Vehari' },
  { name: 'Lodhran', province: 'Punjab', district: 'Lodhran' },
  { name: 'Bhakkar', province: 'Punjab', district: 'Bhakkar' },
  { name: 'Layyah', province: 'Punjab', district: 'Layyah' },
  { name: 'Khanewal', province: 'Punjab', district: 'Khanewal' },
  { name: 'Mian Channu', province: 'Punjab', district: 'Khanewal' },
  { name: 'Muzaffargarh', province: 'Punjab', district: 'Muzaffargarh' },
  { name: 'Kot Addu', province: 'Punjab', district: 'Muzaffargarh' },
  { name: 'Dera Ghazi Khan', province: 'Punjab', district: 'Dera Ghazi Khan', isMajor: true },
  { name: 'Taunsa Sharif', province: 'Punjab', district: 'Dera Ghazi Khan' },
  { name: 'Bahawalnagar', province: 'Punjab', district: 'Bahawalnagar' },
  { name: 'Chishtian', province: 'Punjab', district: 'Bahawalnagar' },
  { name: 'Nankana Sahib', province: 'Punjab', district: 'Nankana Sahib' },
  { name: 'Hafizabad', province: 'Punjab', district: 'Hafizabad' },
  { name: 'Narowal', province: 'Punjab', district: 'Narowal' },
  { name: 'Attock', province: 'Punjab', district: 'Attock' },
  { name: 'Hasan Abdal', province: 'Punjab', district: 'Attock' },
  { name: 'Toba Tek Singh', province: 'Punjab', district: 'Toba Tek Singh' },
  { name: 'Gojra', province: 'Punjab', district: 'Toba Tek Singh' },
  { name: 'Kamalia', province: 'Punjab', district: 'Toba Tek Singh' },
  { name: 'Jhang', province: 'Punjab', district: 'Jhang' },
  { name: 'Shorkot', province: 'Punjab', district: 'Jhang' },
  { name: 'Khushab', province: 'Punjab', district: 'Khushab' },
  { name: 'Mandi Bahauddin', province: 'Punjab', district: 'Mandi Bahauddin' },
  { name: 'Rajanpur', province: 'Punjab', district: 'Rajanpur' },

  // Sindh
  { name: 'Karachi', province: 'Sindh', district: 'Karachi Central', isMajor: true },
  { name: 'Clifton', province: 'Sindh', district: 'Karachi South' },
  { name: 'Defence (DHA Karachi)', province: 'Sindh', district: 'Karachi South' },
  { name: 'Gulshan-e-Iqbal', province: 'Sindh', district: 'Karachi East' },
  { name: 'Gulistan-e-Jauhar', province: 'Sindh', district: 'Karachi East' },
  { name: 'Korangi', province: 'Sindh', district: 'Korangi' },
  { name: 'Landhi', province: 'Sindh', district: 'Korangi' },
  { name: 'Malir', province: 'Sindh', district: 'Malir' },
  { name: 'Nazimabad', province: 'Sindh', district: 'Karachi Central' },
  { name: 'Hyderabad', province: 'Sindh', district: 'Hyderabad', isMajor: true },
  { name: 'Qasimabad', province: 'Sindh', district: 'Hyderabad' },
  { name: 'Latifabad', province: 'Sindh', district: 'Hyderabad' },
  { name: 'Sukkur', province: 'Sindh', district: 'Sukkur', isMajor: true },
  { name: 'Rohri', province: 'Sindh', district: 'Sukkur' },
  { name: 'Larkana', province: 'Sindh', district: 'Larkana', isMajor: true },
  { name: 'Mirpurkhas', province: 'Sindh', district: 'Mirpurkhas', isMajor: true },
  { name: 'Nawabshah (Shaheed Benazirabad)', province: 'Sindh', district: 'Nawabshah', isMajor: true },
  { name: 'Badin', province: 'Sindh', district: 'Badin' },
  { name: 'Thatta', province: 'Sindh', district: 'Thatta' },
  { name: 'Sujawal', province: 'Sindh', district: 'Sujawal' },
  { name: 'Khairpur', province: 'Sindh', district: 'Khairpur' },
  { name: 'Gambat', province: 'Sindh', district: 'Khairpur' },
  { name: 'Jacobabad', province: 'Sindh', district: 'Jacobabad' },
  { name: 'Shikarpur', province: 'Sindh', district: 'Shikarpur' },
  { name: 'Tando Allahyar', province: 'Sindh', district: 'Tando Allahyar' },
  { name: 'Tando Muhammad Khan', province: 'Sindh', district: 'Tando Muhammad Khan' },
  { name: 'Umerkot', province: 'Sindh', district: 'Umerkot' },
  { name: 'Dadu', province: 'Sindh', district: 'Dadu' },
  { name: 'Matiari', province: 'Sindh', district: 'Matiari' },
  { name: 'Hala', province: 'Sindh', district: 'Matiari' },
  { name: 'Sanghar', province: 'Sindh', district: 'Sanghar' },
  { name: 'Shahdadpur', province: 'Sindh', district: 'Sanghar' },
  { name: 'Tando Adam', province: 'Sindh', district: 'Sanghar' },
  { name: 'Ghotki', province: 'Sindh', district: 'Ghotki' },
  { name: 'Daharki', province: 'Sindh', district: 'Ghotki' },
  { name: 'Kashmore', province: 'Sindh', district: 'Kashmore' },
  { name: 'Naushahro Feroze', province: 'Sindh', district: 'Naushahro Feroze' },
  { name: 'Jamshoro', province: 'Sindh', district: 'Jamshoro' },
  { name: 'Kotri', province: 'Sindh', district: 'Jamshoro' },
  { name: 'Tharparkar', province: 'Sindh', district: 'Tharparkar' },
  { name: 'Mithi', province: 'Sindh', district: 'Tharparkar' },
  { name: 'Shahdadkot', province: 'Sindh', district: 'Kambar Shahdadkot' },

  // Khyber Pakhtunkhwa
  { name: 'Peshawar', province: 'Khyber Pakhtunkhwa', district: 'Peshawar', isMajor: true },
  { name: 'Hayatabad', province: 'Khyber Pakhtunkhwa', district: 'Peshawar' },
  { name: 'Mardan', province: 'Khyber Pakhtunkhwa', district: 'Mardan', isMajor: true },
  { name: 'Takht Bhai', province: 'Khyber Pakhtunkhwa', district: 'Mardan' },
  { name: 'Mingora (Swat)', province: 'Khyber Pakhtunkhwa', district: 'Swat', isMajor: true },
  { name: 'Abbottabad', province: 'Khyber Pakhtunkhwa', district: 'Abbottabad', isMajor: true },
  { name: 'Havelian', province: 'Khyber Pakhtunkhwa', district: 'Abbottabad' },
  { name: 'Mansehra', province: 'Khyber Pakhtunkhwa', district: 'Mansehra' },
  { name: 'Haripur', province: 'Khyber Pakhtunkhwa', district: 'Haripur' },
  { name: 'Charsadda', province: 'Khyber Pakhtunkhwa', district: 'Charsadda' },
  { name: 'Nowshera', province: 'Khyber Pakhtunkhwa', district: 'Nowshera' },
  { name: 'Swabi', province: 'Khyber Pakhtunkhwa', district: 'Swabi' },
  { name: 'Kohat', province: 'Khyber Pakhtunkhwa', district: 'Kohat' },
  { name: 'Bannu', province: 'Khyber Pakhtunkhwa', district: 'Bannu' },
  { name: 'Dera Ismail Khan', province: 'Khyber Pakhtunkhwa', district: 'Dera Ismail Khan' },
  { name: 'Lakki Marwat', province: 'Khyber Pakhtunkhwa', district: 'Lakki Marwat' },
  { name: 'Tank', province: 'Khyber Pakhtunkhwa', district: 'Tank' },
  { name: 'Karak', province: 'Khyber Pakhtunkhwa', district: 'Karak' },
  { name: 'Upper Dir', province: 'Khyber Pakhtunkhwa', district: 'Upper Dir' },
  { name: 'Lower Dir', province: 'Khyber Pakhtunkhwa', district: 'Lower Dir' },
  { name: 'Timergara', province: 'Khyber Pakhtunkhwa', district: 'Lower Dir' },
  { name: 'Malakand', province: 'Khyber Pakhtunkhwa', district: 'Malakand' },
  { name: 'Batkhela', province: 'Khyber Pakhtunkhwa', district: 'Malakand' },
  { name: 'Buner', province: 'Khyber Pakhtunkhwa', district: 'Buner' },
  { name: 'Hangu', province: 'Khyber Pakhtunkhwa', district: 'Hangu' },
  { name: 'Parachinar', province: 'Khyber Pakhtunkhwa', district: 'Kurram' },

  // Balochistan
  { name: 'Quetta', province: 'Balochistan', district: 'Quetta', isMajor: true },
  { name: 'Gwadar', province: 'Balochistan', district: 'Gwadar' },
  { name: 'Turbat', province: 'Balochistan', district: 'Kech (Turbat)' },
  { name: 'Khuzdar', province: 'Balochistan', district: 'Khuzdar' },
  { name: 'Chaman', province: 'Balochistan', district: 'Chaman' },
  { name: 'Hub', province: 'Balochistan', district: 'Hub' },
  { name: 'Sibi', province: 'Balochistan', district: 'Sibi' },
  { name: 'Zhob', province: 'Balochistan', district: 'Zhob' },
  { name: 'Loralai', province: 'Balochistan', district: 'Loralai' },
  { name: 'Kalat', province: 'Balochistan', district: 'Kalat' },
  { name: 'Dera Allah Yar', province: 'Balochistan', district: 'Jaffarabad' },
  { name: 'Pishin', province: 'Balochistan', district: 'Pishin' },
  { name: 'Mastung', province: 'Balochistan', district: 'Mastung' },
  { name: 'Ziarat', province: 'Balochistan', district: 'Ziarat' },

  // Islamabad
  { name: 'Islamabad', province: 'Islamabad Capital Territory', district: 'Islamabad', isMajor: true },
  { name: 'Bhara Kahu', province: 'Islamabad Capital Territory', district: 'Islamabad' },
  { name: 'Tarnol', province: 'Islamabad Capital Territory', district: 'Islamabad' },
  { name: 'Rawat', province: 'Islamabad Capital Territory', district: 'Islamabad' },
  { name: 'Sihala', province: 'Islamabad Capital Territory', district: 'Islamabad' },

  // AJK & GB
  { name: 'Muzaffarabad', province: 'Azad Jammu & Kashmir', district: 'Muzaffarabad' },
  { name: 'Mirpur (AJK)', province: 'Azad Jammu & Kashmir', district: 'Mirpur' },
  { name: 'Kotli', province: 'Azad Jammu & Kashmir', district: 'Kotli' },
  { name: 'Rawalakot', province: 'Azad Jammu & Kashmir', district: 'Rawalakot (Poonch)' },
  { name: 'Bhimber', province: 'Azad Jammu & Kashmir', district: 'Bhimber' },
  { name: 'Gilgit', province: 'Gilgit-Baltistan', district: 'Gilgit' },
  { name: 'Skardu', province: 'Gilgit-Baltistan', district: 'Skardu' },
  { name: 'Hunza', province: 'Gilgit-Baltistan', district: 'Hunza' },
  { name: 'Chilas', province: 'Gilgit-Baltistan', district: 'Diamer' },
];

const DEFAULT_GLOBAL_ZONES_CONFIG = [
  {
    name: 'Within City',
    type: 'local',
    cities: [] // Applies to origin city / local deliveries
  },
  {
    name: 'Zone A (Major Metros)',
    type: 'metro',
    cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi']
  },
  {
    name: 'Zone B (Regional Hubs)',
    type: 'regional',
    cities: ['Faisalabad', 'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Gujrat', 'Sahiwal', 'Sheikhupura', 'Jhelum']
  },
  {
    name: 'Zone C (Secondary Cities)',
    type: 'secondary',
    cities: ['Quetta', 'Sukkur', 'Bahawalpur', 'Sargodha', 'Abbottabad', 'Mardan', 'Larkana', 'Okara', 'Rahim Yar Khan', 'Muzaffargarh', 'Dera Ghazi Khan', 'Nawabshah (Shaheed Benazirabad)', 'Chiniot']
  },
  {
    name: 'Zone D (Remote & Extended)',
    type: 'remote',
    cities: [
      'Gwadar', 'Gilgit', 'Skardu', 'Turbat', 'Khuzdar', 'Chaman', 'Bannu',
      'Dera Ismail Khan', 'Mirpur (AJK)', 'Muzaffarabad', 'Kotli', 'Rawalakot',
      'Haripur', 'Swabi', 'Nowshera', 'Mansehra', 'Mingora (Swat)', 'Attock',
      'Chakwal', 'Jacobabad', 'Shikarpur', 'Jhang', 'Vehari', 'Bahawalnagar',
      'Mandi Bahauddin', 'Pakpattan', 'Toba Tek Singh', 'Charsadda', 'Hub',
      'Ghotki', 'Khairpur', 'Dadu', 'Badin', 'Thatta', 'Tando Adam',
      'Tando Allahyar', 'Wazirabad', 'Muridke', 'Gojra', 'Layyah', 'Kot Addu',
      'Lodhran', 'Mianwali', 'Bhakkar', 'Khushab', 'Kamoke', 'Hafizabad',
      'Sadiqabad', 'Mirpurkhas', 'Burewala', 'Kohat', 'Khanewal', 'Kasur'
    ]
  }
];

async function run() {
  const client = new Client({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'dbarc_db',
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'root',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // 0. Ensure columns exist on cities table
    console.log('Verifying table columns...');
    await client.query(`
      ALTER TABLE cities ADD COLUMN IF NOT EXISTS province VARCHAR(255);
      ALTER TABLE cities ADD COLUMN IF NOT EXISTS district VARCHAR(255);
      ALTER TABLE cities ADD COLUMN IF NOT EXISTS tehsil VARCHAR(255);
    `).catch(err => console.warn('Column alteration note:', err.message));

    // 1. Ensure cities exist and have valid names, province, district
    console.log('Seeding / updating Pakistan cities...');
    const cityMap = new Map(); // cityNameLower -> id

    // Fetch existing cities
    const existingCitiesRes = await client.query('SELECT id, city_name FROM cities;');
    for (const row of existingCitiesRes.rows) {
      if (row.city_name) {
        cityMap.set(row.city_name.trim().toLowerCase(), row.id);
      }
    }

    // Insert or update cities
    let updatedOrInsertedCount = 0;
    for (let i = 0; i < DEFAULT_PAKISTAN_CITIES.length; i++) {
      const cityObj = DEFAULT_PAKISTAN_CITIES[i];
      const cityName = cityObj.name;
      const cityLower = cityName.toLowerCase();

      if (cityMap.has(cityLower)) {
        // Update province / district
        const existingId = cityMap.get(cityLower);
        await client.query(
          'UPDATE cities SET province = COALESCE(province, $1), district = COALESCE(district, $2) WHERE id = $3;',
          [cityObj.province, cityObj.district, existingId]
        ).catch(() => null);
        continue;
      }

      // Check if there is an empty/null city row we can update
      const nullCityRes = await client.query('SELECT id FROM cities WHERE city_name IS NULL LIMIT 1;');
      if (nullCityRes.rows.length > 0) {
        const targetId = nullCityRes.rows[0].id;
        await client.query(
          'UPDATE cities SET city_name = $1, province = $2, district = $3, active = true, updated_at = NOW() WHERE id = $4;',
          [cityName, cityObj.province, cityObj.district, targetId]
        );
        cityMap.set(cityLower, targetId);
        updatedOrInsertedCount++;
      } else {
        // Insert new city
        const docId = generateDocumentId();
        const insertRes = await client.query(
          `INSERT INTO cities (document_id, city_name, province, district, active, created_at, updated_at, published_at)
           VALUES ($1, $2, $3, $4, true, NOW(), NOW(), NOW()) RETURNING id;`,
          [docId, cityName, cityObj.province, cityObj.district]
        );
        cityMap.set(cityLower, insertRes.rows[0].id);
        updatedOrInsertedCount++;
      }
    }
    console.log(`Cities synchronized. Available in map: ${cityMap.size}`);

    // 2. Setup GLOBAL DEFAULT ZONES (tenant is NULL)
    console.log('\nChecking Global Default Zones (Super Admin baseline)...');
    const globalRegsRes = await client.query(`
      SELECT r.id, r.name FROM regions r
      LEFT JOIN regions_tenant_lnk rtl ON rtl.region_id = r.id
      WHERE rtl.tenant_id IS NULL;
    `);

    if (globalRegsRes.rows.length === 0) {
      console.log('No Global Default Zones found. Creating 5 Super Admin Global Default Zones...');
      for (let zIdx = 0; zIdx < DEFAULT_GLOBAL_ZONES_CONFIG.length; zIdx++) {
        const zoneCfg = DEFAULT_GLOBAL_ZONES_CONFIG[zIdx];
        const docId = generateDocumentId();

        const insertRegionRes = await client.query(
          `INSERT INTO regions (document_id, name, type, active, created_at, updated_at, published_at)
           VALUES ($1, $2, $3, true, NOW(), NOW(), NOW()) RETURNING id;`,
          [docId, zoneCfg.name, zoneCfg.type]
        );
        const regionId = insertRegionRes.rows[0].id;

        // Note: Do NOT insert into regions_tenant_lnk for Global Default regions!

        let citiesLinkedCount = 0;
        for (let cIdx = 0; cIdx < zoneCfg.cities.length; cIdx++) {
          const cName = zoneCfg.cities[cIdx];
          const cityId = cityMap.get(cName.toLowerCase());
          if (cityId) {
            await client.query(
              `INSERT INTO regions_cities_lnk (region_id, city_id, city_ord, region_ord)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING;`,
              [regionId, cityId, cIdx + 1, zIdx + 1]
            );
            citiesLinkedCount++;
          }
        }
        console.log(`  -> Created Global Default Zone: "${zoneCfg.name}" (ID: ${regionId}) with ${citiesLinkedCount} cities.`);
      }
    } else {
      console.log(`Global Default Zones already present (${globalRegsRes.rows.length} zones found).`);
    }

    console.log('\nSeeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await client.end();
  }
}

run();
