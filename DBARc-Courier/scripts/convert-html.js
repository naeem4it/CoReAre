const fs = require('fs');
const path = require('path');

const htmlDir = path.join(__dirname, '../Html');
const appDir = path.join(__dirname, '../src/app');

const map = {
    'pickup_information_redesign': 'pickup-information',
    'book_shipment_redesign': 'shipments/book',
    'shipments_list_redesign_v3': 'shipments/list',
    'load_sheet_redesign': 'load-sheet',
    'customer_report_redesign_v3': 'reports/customer',
    'dispatch_report_redesign_v3': 'reports/dispatch',
    'monthly_invoice_report_redesign_v3': 'reports/monthly-invoice',
    'shipper_advise_redesign_v3': 'shipper-advise',
    'customer_invoice_redesign': 'invoices/customer',
    'change_password_redesign_v3': 'auth/change-password',
    'stitch_unified_interface_redesign (2)': 'stitch-unified',
    'velocity_corporate': 'velocity-corporate',
    'main_dashboard_redesign': 'dashboard-redesign' // mapped to dashboard-redesign so we don't mess up the root
};

function convertHtmlToJsx(htmlStr) {
    let mainContent = htmlStr;
    const mainMatch = htmlStr.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
        mainContent = mainMatch[0];
    } else {
        const bodyMatch = htmlStr.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            mainContent = bodyMatch[0];
        }
    }

    let jsx = mainContent
        .replace(/class=/g, 'className=')
        .replace(/for=/g, 'htmlFor=')
        .replace(/<!--[\s\S]*?-->/g, '') 
        .replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />')
        .replace(/<input([^>]*?)(?<!\/)>/gi, '<input$1 />')
        .replace(/<br([^>]*?)(?<!\/)>/gi, '<br$1 />')
        .replace(/<hr([^>]*?)(?<!\/)>/gi, '<hr$1 />')
        .replace(/<link([^>]*?)(?<!\/)>/gi, '<link$1 />')
        .replace(/<meta([^>]*?)(?<!\/)>/gi, '<meta$1 />')
        .replace(/style="([^"]*)"/g, (match, p1) => {
            const styleObj = p1.split(';').filter(Boolean).map(s => {
                const parts = s.split(':');
                if (parts.length === 2) {
                    const key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
                    return `${key}: '${parts[1].trim()}'`;
                }
                return '';
            }).filter(Boolean).join(', ');
            return `style={{ ${styleObj} }}`;
        })
        .replace(/selected=""/g, 'defaultValue="true"')
        .replace(/selected/g, 'defaultValue="true"')
        // Very basic fix for raw text outside tags if needed, but usually fine
        ;

    return `export default function Page() {
  return (
    <>
      ${jsx}
    </>
  );
}
`;
}

Object.entries(map).forEach(([htmlFolder, route]) => {
    const htmlFolderPath = path.join(htmlDir, htmlFolder);
    let htmlFile = path.join(htmlFolderPath, 'code.html');
    if (!fs.existsSync(htmlFile)) {
        htmlFile = path.join(htmlFolderPath, 'index.html');
    }
    
    if (fs.existsSync(htmlFile)) {
        console.log(`Processing ${htmlFolder} -> ${route}`);
        const htmlStr = fs.readFileSync(htmlFile, 'utf8');
        const jsxStr = convertHtmlToJsx(htmlStr);
        
        const routeDir = path.join(appDir, route);
        fs.mkdirSync(routeDir, { recursive: true });
        
        fs.writeFileSync(path.join(routeDir, 'page.tsx'), jsxStr, 'utf8');
    } else {
        console.log(`Warning: No HTML file found for ${htmlFolder}`);
    }
});
