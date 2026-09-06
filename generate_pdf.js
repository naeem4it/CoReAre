const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function createBizFlowHtml() {
  const svgWidth = 1100;
  const svgHeight = 2340;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DBARC - Digital Business Automation for Routing &amp; Courier - Business Flow</title>
<style>
  @page {
    size: ${svgWidth}px ${svgHeight + 60}px;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    background: #ffffff;
    font-family: 'Calibri', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 25px 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  svg {
    display: block;
    background: #ffffff;
  }
</style>
</head>
<body>

<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Standard Downward Arrow Marker -->
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
    </marker>

    <!-- Blue Arrow for Re-attempts -->
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
    </marker>

    <!-- Drop shadow for elevation -->
    <filter id="box-shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.06"/>
    </filter>
  </defs>

  <!-- ================= PHASE REGION BACKGROUNDS & TITLES ================= -->
  
  <!-- Phase 1: Shipper Onboarding & Booking (Y: 20 -> 985) -->
  <rect x="50" y="20" width="1000" height="965" rx="16" fill="#fcfdfb" stroke="#e2ecd8" stroke-width="1.2" stroke-dasharray="4,4" />
  <rect x="70" y="32" width="250" height="24" rx="6" fill="#f0f7ec" stroke="#cde3c4" stroke-width="1" />
  <text x="82" y="48" font-size="11" font-weight="bold" fill="#386620" letter-spacing="0.6">PHASE 1: BOOKING &amp; LOAD SHEET</text>

  <!-- Phase 2: First-Mile Pickup & Inbound Arrival (Y: 1005 -> 1205) -->
  <rect x="50" y="1005" width="1000" height="200" rx="16" fill="#fcfdfb" stroke="#e2ecd8" stroke-width="1.2" stroke-dasharray="4,4" />
  <rect x="70" y="1017" width="250" height="24" rx="6" fill="#f0f7ec" stroke="#cde3c4" stroke-width="1" />
  <text x="82" y="1033" font-size="11" font-weight="bold" fill="#386620" letter-spacing="0.6">PHASE 2: FIRST-MILE HUB INBOUND</text>

  <!-- Phase 3: Mid-Mile Linehaul & 3PL Forwarding (Y: 1225 -> 1485) -->
  <rect x="50" y="1225" width="1000" height="260" rx="16" fill="#fbfdfa" stroke="#e2ecd8" stroke-width="1.2" stroke-dasharray="4,4" />
  <rect x="70" y="1237" width="250" height="24" rx="6" fill="#f0f7ec" stroke="#cde3c4" stroke-width="1" />
  <text x="82" y="1253" font-size="11" font-weight="bold" fill="#386620" letter-spacing="0.6">PHASE 3: LINEHAUL &amp; 3PL DISPATCH</text>

  <!-- Phase 4: Last-Mile Delivery & Field Rider (Y: 1505 -> 1945) -->
  <rect x="50" y="1505" width="1000" height="440" rx="16" fill="#fcfdfb" stroke="#e2ecd8" stroke-width="1.2" stroke-dasharray="4,4" />
  <rect x="70" y="1517" width="250" height="24" rx="6" fill="#f0f7ec" stroke="#cde3c4" stroke-width="1" />
  <text x="82" y="1533" font-size="11" font-weight="bold" fill="#386620" letter-spacing="0.6">PHASE 4: LAST-MILE &amp; RIDER APP</text>

  <!-- Phase 5: Cash Surrender & COD Settlement (Y: 1965 -> 2320) -->
  <rect x="50" y="1965" width="1000" height="355" rx="16" fill="#fcfdfb" stroke="#e2ecd8" stroke-width="1.2" stroke-dasharray="4,4" />
  <rect x="70" y="1977" width="250" height="24" rx="6" fill="#f0f7ec" stroke="#cde3c4" stroke-width="1" />
  <text x="82" y="1993" font-size="11" font-weight="bold" fill="#386620" letter-spacing="0.6">PHASE 5: COD SETTLEMENT &amp; AUDIT</text>


  <!-- ================= CONNECTING ARROWS ================= -->

  <!-- 1. DBARC -> Courier -->
  <line x1="550" y1="125" x2="550" y2="155" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 2. Courier -> Shipper -->
  <line x1="550" y1="200" x2="550" y2="230" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 3. Shipper -> Create Shipping Orders -->
  <line x1="550" y1="275" x2="550" y2="305" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 4. Create Shipping Orders -> 3 Channels -->
  <line x1="550" y1="360" x2="550" y2="385" stroke="#000000" stroke-width="1.8" />
  <line x1="280" y1="385" x2="820" y2="385" stroke="#000000" stroke-width="1.8" />
  <line x1="280" y1="385" x2="280" y2="410" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="550" y1="385" x2="550" y2="410" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="820" y1="385" x2="820" y2="410" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 5. 3 Channels -> Book Orders -->
  <line x1="280" y1="460" x2="280" y2="485" stroke="#000000" stroke-width="1.8" />
  <line x1="550" y1="460" x2="550" y2="510" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="820" y1="460" x2="820" y2="485" stroke="#000000" stroke-width="1.8" />
  <line x1="280" y1="485" x2="820" y2="485" stroke="#000000" stroke-width="1.8" />

  <!-- 6. Book Orders -> Generate Unique CN -->
  <line x1="550" y1="565" x2="550" y2="595" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 7. Generate Unique CN -> Zones -->
  <line x1="550" y1="650" x2="550" y2="675" stroke="#000000" stroke-width="1.8" />
  <line x1="370" y1="675" x2="730" y2="675" stroke="#000000" stroke-width="1.8" />
  <line x1="370" y1="675" x2="370" y2="695" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="730" y1="675" x2="730" y2="695" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 8. Zones -> Create Load Sheet -->
  <line x1="370" y1="745" x2="370" y2="768" stroke="#000000" stroke-width="1.8" />
  <line x1="730" y1="745" x2="730" y2="768" stroke="#000000" stroke-width="1.8" />
  <line x1="370" y1="768" x2="730" y2="768" stroke="#000000" stroke-width="1.8" />
  <line x1="550" y1="768" x2="550" y2="795" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 9. Create Load Sheet -> Notify Courier to Pickup -->
  <line x1="550" y1="845" x2="550" y2="875" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 10. Notify Courier to Pickup -> Physical Pickup & Shipper Handover -->
  <line x1="550" y1="925" x2="550" y2="1045" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 11. Physical Pickup -> Arrival at Origin Hub -->
  <line x1="550" y1="1095" x2="550" y2="1125" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 12. Arrival at Origin Hub -> Split into Mid-Mile Linehaul & 3PL -->
  <line x1="550" y1="1180" x2="550" y2="1245" stroke="#000000" stroke-width="1.8" />
  <line x1="340" y1="1245" x2="760" y2="1245" stroke="#000000" stroke-width="1.8" />
  <!-- To Bagging -->
  <line x1="340" y1="1245" x2="340" y2="1265" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <!-- To 3PL Handover -->
  <line x1="760" y1="1245" x2="760" y2="1265" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Left Column Inter-box arrows -->
  <line x1="340" y1="1315" x2="340" y2="1335" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="340" y1="1385" x2="340" y2="1405" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Right Column Inter-box arrows -->
  <line x1="760" y1="1315" x2="760" y2="1335" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="760" y1="1385" x2="760" y2="1405" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 13. Mid-Mile Linehaul & 3PL Converge to Delivery Sheet -->
  <line x1="340" y1="1455" x2="340" y2="1515" stroke="#000000" stroke-width="1.8" />
  <line x1="760" y1="1455" x2="760" y2="1515" stroke="#000000" stroke-width="1.8" />
  <line x1="340" y1="1515" x2="760" y2="1515" stroke="#000000" stroke-width="1.8" />
  <line x1="550" y1="1515" x2="550" y2="1540" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 14. Delivery Sheet -> Dispatch to Rider App -->
  <line x1="550" y1="1590" x2="550" y2="1615" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- 15. Rider App -> Delivery Attempt Outcomes -->
  <line x1="550" y1="1670" x2="550" y2="1690" stroke="#000000" stroke-width="1.8" />
  <line x1="340" y1="1690" x2="760" y2="1690" stroke="#000000" stroke-width="1.8" />
  <line x1="340" y1="1690" x2="340" y2="1710" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="760" y1="1690" x2="760" y2="1710" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Failed Attempt -> Customer Service & Shipper Advice -->
  <line x1="760" y1="1775" x2="760" y2="1795" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Shipper Advice -> Re-schedule OR Return to Shipper -->
  <line x1="760" y1="1850" x2="760" y2="1868" stroke="#000000" stroke-width="1.8" />
  <line x1="630" y1="1868" x2="890" y2="1868" stroke="#000000" stroke-width="1.8" />
  <line x1="630" y1="1868" x2="630" y2="1885" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="890" y1="1868" x2="890" y2="1885" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Re-schedule loops back up to Runsheet (Dotted Blue Line) -->
  <path d="M 630 1935 L 630 1945 L 530 1945 L 530 1565 L 545 1565" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4,4" marker-end="url(#arrow-blue)" />
  <text x="535" y="1795" font-size="10" font-weight="bold" fill="#2563eb" transform="rotate(-90 535,1795)">Re-attempt Cycle</text>

  <!-- Delivered -> Rider De-Runsheet -->
  <line x1="340" y1="1775" x2="340" y2="2000" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Rider De-Runsheet -> COD Settlement Engine -->
  <line x1="340" y1="2055" x2="340" y2="2080" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- COD Settlement Engine -> Shipper Wallet Credit -->
  <line x1="340" y1="2135" x2="340" y2="2160" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- COD Settlement & RTO Converge to Invoicing & Audit -->
  <line x1="340" y1="2215" x2="340" y2="2240" stroke="#000000" stroke-width="1.8" />
  <line x1="890" y1="1945" x2="890" y2="2240" stroke="#000000" stroke-width="1.8" />
  <line x1="340" y1="2240" x2="890" y2="2240" stroke="#000000" stroke-width="1.8" />
  <line x1="615" y1="2240" x2="615" y2="2260" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />



  <!-- ================= FLOWCHART BOXES ================= -->

  <!-- 1. ROOT HEADER NODE -->
  <g filter="url(#box-shadow)">
    <rect x="360" y="60" width="380" height="65" rx="14" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="87" text-anchor="middle" font-size="17" font-weight="bold" fill="#000000" letter-spacing="0.5">DBARC</text>
    <text x="550" y="109" text-anchor="middle" font-size="13" font-weight="600" fill="#262626">Digital Business Automation for Routing &amp; Courier</text>
  </g>

  <!-- 2. COURIER -->
  <g filter="url(#box-shadow)">
    <rect x="445" y="155" width="210" height="45" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="183" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Courier</text>
  </g>

  <!-- 3. SHIPPER -->
  <g filter="url(#box-shadow)">
    <rect x="445" y="230" width="210" height="45" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="258" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Shipper</text>
  </g>

  <!-- 4. CREATE SHIPPING ORDERS -->
  <g filter="url(#box-shadow)">
    <rect x="390" y="305" width="320" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="332" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Create Shipping Orders</text>
    <text x="550" y="349" text-anchor="middle" font-size="11" font-weight="normal" fill="#595959">Recipient, Weight, COD &amp; Service Type</text>
  </g>

  <!-- 5. THREE INGESTION CHANNELS -->
  <g filter="url(#box-shadow)">
    <rect x="195" y="410" width="170" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="280" y="434" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">Manual Data</text>
    <text x="280" y="450" text-anchor="middle" font-size="10.5" fill="#595959">Single Booking Form</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="465" y="410" width="170" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="434" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">Integ API</text>
    <text x="550" y="450" text-anchor="middle" font-size="10.5" fill="#595959">Shopify, WooCommerce</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="735" y="410" width="170" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="820" y="434" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">Bulk csv, xls</text>
    <text x="820" y="450" text-anchor="middle" font-size="10.5" fill="#595959">Batch File Import</text>
  </g>

  <!-- 6. BOOK ORDERS -->
  <g filter="url(#box-shadow)">
    <rect x="410" y="510" width="280" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="537" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Book Orders</text>
    <text x="550" y="555" text-anchor="middle" font-size="11" font-weight="bold" fill="#b45309">[Status: Total Booking]</text>
  </g>

  <!-- 7. GENERATE UNIQUE CN -->
  <g filter="url(#box-shadow)">
    <rect x="390" y="595" width="320" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="621" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Generate Unique CN</text>
    <text x="550" y="639" text-anchor="middle" font-size="11" fill="#595959">Airway Bill (AWB) Barcode &amp; Routing Label</text>
  </g>

  <!-- 8. ROUTING ZONES -->
  <g filter="url(#box-shadow)">
    <rect x="250" y="695" width="240" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="370" y="720" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">Self Operating Zones</text>
    <text x="370" y="736" text-anchor="middle" font-size="10.5" fill="#595959">Direct Branch Network</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="610" y="695" width="240" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="730" y="720" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">3PL Zones</text>
    <text x="730" y="736" text-anchor="middle" font-size="10.5" fill="#595959">TCS, Leopards, Trax, PostEx</text>
  </g>

  <!-- 9. CREATE LOAD SHEET -->
  <g filter="url(#box-shadow)">
    <rect x="400" y="795" width="300" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="820" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Create Load Sheet</text>
    <text x="550" y="836" text-anchor="middle" font-size="10.5" fill="#595959">Shipper Dispatch Manifest with Barcode</text>
  </g>

  <!-- 10. NOTIFY COURIER TO PICKUP -->
  <g filter="url(#box-shadow)">
    <rect x="390" y="875" width="320" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="900" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Notify Courier to Pickup</text>
    <text x="550" y="916" text-anchor="middle" font-size="10.5" fill="#595959">Pickup Request Assigned to Fleet Rider</text>
  </g>

  <!-- ================= PHASE 2 BOXES ================= -->

  <!-- 11. PHYSICAL PICKUP & HANDOVER -->
  <g filter="url(#box-shadow)">
    <rect x="380" y="1045" width="340" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="1070" text-anchor="middle" font-size="14.5" font-weight="600" fill="#000000">Physical Pickup &amp; Shipper Handover</text>
    <text x="550" y="1086" text-anchor="middle" font-size="10.5" fill="#595959">Load Sheet Verification &amp; Shipper Signature</text>
  </g>

  <!-- 12. ARRIVAL AT ORIGIN HUB -->
  <g filter="url(#box-shadow)">
    <rect x="350" y="1125" width="400" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="1151" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Arrival at Origin Hub (Scan &amp; Weigh)</text>
    <text x="550" y="1169" text-anchor="middle" font-size="11" font-weight="bold" fill="#15803d">[Operations / Arrivals &bull; Status: Arrived]</text>
  </g>

  <!-- ================= PHASE 3 BOXES ================= -->

  <!-- Left: Bagging & Security Seal -->
  <g filter="url(#box-shadow)">
    <rect x="190" y="1265" width="300" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="340" y="1289" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">Bagging &amp; Security Seal No.</text>
    <text x="340" y="1305" text-anchor="middle" font-size="10.5" fill="#595959">Group Parcels into Tamper-Evident Bag</text>
  </g>

  <!-- Left: Station Manifestation -->
  <g filter="url(#box-shadow)">
    <rect x="190" y="1335" width="300" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="340" y="1359" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">Station Manifestation</text>
    <text x="340" y="1375" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#7c3aed">Linehaul Transit &bull; [Status: In Transit]</text>
  </g>

  <!-- Left: Destination Demanifestation -->
  <g filter="url(#box-shadow)">
    <rect x="190" y="1405" width="300" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="340" y="1428" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">Destination Demanifestation</text>
    <text x="340" y="1444" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#15803d">Seal Audit &bull; [Status: Arrived At Destination]</text>
  </g>

  <!-- Right: 3PL Handover Manifest -->
  <g filter="url(#box-shadow)">
    <rect x="610" y="1265" width="300" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="760" y="1289" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">3PL Handover Manifest</text>
    <text x="760" y="1305" text-anchor="middle" font-size="10.5" fill="#595959">Forwarding to Partner Courier (TCS / Trax)</text>
  </g>

  <!-- Right: 3PL Rate Card & Cost Assignment -->
  <g filter="url(#box-shadow)">
    <rect x="610" y="1335" width="300" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="760" y="1359" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">3PL Rate Card &amp; Cost Mapping</text>
    <text x="760" y="1375" text-anchor="middle" font-size="10.5" fill="#595959">Automated Freight &amp; Surcharge Allocation</text>
  </g>

  <!-- Right: 3PL API Gateway & Status Sync -->
  <g filter="url(#box-shadow)">
    <rect x="610" y="1405" width="300" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="760" y="1428" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">3PL API Gateway &amp; Status Sync</text>
    <text x="760" y="1444" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0284c7">Webhook Sync &bull; [Status: Handed Over to 3PL]</text>
  </g>

  <!-- ================= PHASE 4 BOXES ================= -->

  <!-- 14. CREATE DELIVERY SHEET (RUNSHEET) -->
  <g filter="url(#box-shadow)">
    <rect x="360" y="1540" width="380" height="50" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="1565" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Create Delivery Sheet (Runsheet)</text>
    <text x="550" y="1581" text-anchor="middle" font-size="10.5" fill="#595959">Operations / Delivery-Sheet: Route Sorting &amp; Rider Allocation</text>
  </g>

  <!-- 15. DISPATCH TO RIDER MOBILE APP -->
  <g filter="url(#box-shadow)">
    <rect x="350" y="1615" width="400" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="550" y="1639" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">Dispatch to DBARc-Rider Mobile App</text>
    <text x="550" y="1658" text-anchor="middle" font-size="11" font-weight="bold" fill="#0284c7">Live GPS Beat &bull; [Status: Out For Delivery]</text>
  </g>

  <!-- 16. DELIVERY ATTEMPT OUTCOMES -->
  <!-- Delivered (Success) -->
  <g filter="url(#box-shadow)">
    <rect x="180" y="1710" width="320" height="65" rx="12" fill="#ffffff" stroke="#2e7d32" stroke-width="2.2" />
    <text x="340" y="1736" text-anchor="middle" font-size="15" font-weight="bold" fill="#1b5e20">Delivered to Consignee</text>
    <text x="340" y="1753" text-anchor="middle" font-size="10.5" fill="#374151">e-POD Signature, Photo, OTP &amp; Cash Collection</text>
    <text x="340" y="1768" text-anchor="middle" font-size="11" font-weight="bold" fill="#15803d">[Status: Delivered]</text>
  </g>

  <!-- Failed Attempt (Exception) -->
  <g filter="url(#box-shadow)">
    <rect x="600" y="1710" width="320" height="65" rx="12" fill="#ffffff" stroke="#c00000" stroke-width="2.2" />
    <text x="760" y="1736" text-anchor="middle" font-size="15" font-weight="bold" fill="#c00000">Failed Attempt / Delivery Issue</text>
    <text x="760" y="1753" text-anchor="middle" font-size="10.5" fill="#374151">Customer Unavailable / Wrong Address / Refused</text>
    <text x="760" y="1767" text-anchor="middle" font-size="11" font-weight="bold" fill="#b91c1c">[Status: Failed Attempt]</text>
  </g>

  <!-- Customer Service & Shipper Advice -->
  <g filter="url(#box-shadow)">
    <rect x="600" y="1795" width="320" height="55" rx="12" fill="#ffffff" stroke="#c00000" stroke-width="2" />
    <text x="760" y="1819" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">Customer Service &amp; Shipper Advice</text>
    <text x="760" y="1837" text-anchor="middle" font-size="10.5" fill="#595959">/shipper-advise: Consignee Follow-up &amp; Address Fix</text>
  </g>

  <!-- Re-schedule Runsheet -->
  <g filter="url(#box-shadow)">
    <rect x="540" y="1885" width="180" height="50" rx="10" fill="#ffffff" stroke="#2563eb" stroke-width="1.8" />
    <text x="630" y="1908" text-anchor="middle" font-size="13" font-weight="600" fill="#1d4ed8">Re-schedule Runsheet</text>
    <text x="630" y="1924" text-anchor="middle" font-size="10" fill="#475569">Next Day Re-attempt</text>
  </g>

  <!-- Return to Shipper (RTO Pipeline) -->
  <g filter="url(#box-shadow)">
    <rect x="760" y="1885" width="260" height="60" rx="10" fill="#ffffff" stroke="#c00000" stroke-width="1.8" />
    <text x="890" y="1909" text-anchor="middle" font-size="13.5" font-weight="bold" fill="#991b1b">Return to Shipper (RTO)</text>
    <text x="890" y="1926" text-anchor="middle" font-size="10" fill="#475569">Reverse Linehaul Manifest &amp; Handover</text>
    <text x="890" y="1939" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#b91c1c">[Ready to Return &bull; Dispatched &bull; RTO Delivered]</text>
  </g>

  <!-- ================= PHASE 5 BOXES ================= -->

  <!-- Rider De-Runsheet -->
  <g filter="url(#box-shadow)">
    <rect x="170" y="2000" width="340" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="340" y="2025" text-anchor="middle" font-size="14.5" font-weight="600" fill="#000000">Rider De-Runsheet &amp; Cash Handover</text>
    <text x="340" y="2043" text-anchor="middle" font-size="10.5" fill="#595959">Cashier Reconciles Cash Collected vs Undelivered Parcels</text>
  </g>

  <!-- COD Settlement Engine -->
  <g filter="url(#box-shadow)">
    <rect x="150" y="2080" width="380" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="340" y="2106" text-anchor="middle" font-size="15" font-weight="600" fill="#000000">COD Settlement Engine</text>
    <text x="340" y="2124" text-anchor="middle" font-size="10.5" fill="#595959">Net Settlement = Collected COD - Freight Fee - Fuel - Tax</text>
  </g>

  <!-- Shipper Wallet Credit / Bank Transfer -->
  <g filter="url(#box-shadow)">
    <rect x="160" y="2160" width="360" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="340" y="2185" text-anchor="middle" font-size="14.5" font-weight="bold" fill="#15803d">Shipper Wallet Credit / Bank Transfer</text>
    <text x="340" y="2202" text-anchor="middle" font-size="10.5" fill="#595959">Direct IBAN Disbursement &amp; Digital Payout Slip</text>
  </g>

  <!-- Customer Invoicing & Performance Audit -->
  <g filter="url(#box-shadow)">
    <rect x="425" y="2260" width="380" height="55" rx="12" fill="#ffffff" stroke="#548235" stroke-width="2.2" />
    <text x="615" y="2285" text-anchor="middle" font-size="15" font-weight="bold" fill="#000000">Customer Invoicing &amp; Performance Audit</text>
    <text x="615" y="2303" text-anchor="middle" font-size="10.5" fill="#595959">Monthly GST/Tax Invoices, 3PL Reconciliation &amp; SLA Reports</text>
  </g>

</svg>

</body>
</html>
`;
}

async function run() {
  const targetPdfPath = 'D:\\\\CoReAre\\\\DBARC-BizFlow.pdf';
  const previewImgPath = 'D:\\\\CoReAre\\\\DBARC-BizFlow-preview.png';
  const htmlPath = 'D:\\\\CoReAre\\\\DBARC-BizFlow.html';
  const chromePath = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';

  console.log('Generating complete SVG business flow HTML...');
  const html = createBizFlowHtml();
  fs.writeFileSync(htmlPath, html, 'utf8');

  console.log('Printing to PDF via Chrome headless...');
  try {
    execSync(`"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${targetPdfPath}" "${htmlPath}"`);
    if (fs.existsSync(targetPdfPath)) {
      const stats = fs.statSync(targetPdfPath);
      console.log('SUCCESS: Generated PDF at:', targetPdfPath);
      console.log('File size:', stats.size, 'bytes');
    }
    // Also generate PNG screenshot
    execSync(`"${chromePath}" --headless=new --disable-gpu --window-size=1160,2420 --screenshot="${previewImgPath}" "${htmlPath}"`);
    if (fs.existsSync(previewImgPath)) {
      console.log('Generated visual preview at:', previewImgPath);
    }
  } catch (e) {
    console.error('Execution error:', e.message);
  }
}

run();
