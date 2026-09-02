=== DBARc Courier & Logistics for WooCommerce ===
Contributors: dbarc
Tags: courier, logistics, shipping, woocommerce, tracking, cod, airway bill
Requires at least: 5.8
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Automate order booking, instant tracking assignment, and thermal shipping label printing directly from WooCommerce with DBARc Courier.

== Description ==
The **DBARc Courier & Logistics** plugin allows merchants to seamlessly connect their WooCommerce stores to the DBARc Courier SaaS platform.

### Key Features:
* **1-Click Courier Login:** Connect your store simply by logging in with your DBARc shipper email & password.
* **Automated Order Fulfillment:** Automatically books shipments into DBARc Courier when order status changes to "Processing".
* **Single-Click Manual Booking:** Book individual orders directly from the WooCommerce Order Edit screen.
* **Thermal Airway Bill Printing:** Print official 4x6 / A4 thermal shipping labels with barcodes and COD amounts directly from WP Admin.
* **Customer Email Tracking:** Appends official courier tracking numbers to customer confirmation emails and "My Account" order views.
* **Automatic COD Calculation:** Supports Cash on Delivery (COD) payment amounts and weight calculation.

== Installation ==
1. Compress the `DBARc-Wordpress-Plugin` folder into a `.zip` file (e.g. `dbarc-courier-sync.zip`).
2. In WordPress Admin, navigate to **Plugins > Add New > Upload Plugin**.
3. Choose `dbarc-courier-sync.zip` and click **Install Now**, then **Activate Plugin**.
4. Go to **DBARc Courier** in the WordPress admin sidebar menu.
5. Enter your DBARc Courier Server URL (e.g. `http://localhost:1337` or `https://api.dbarc.com`) and login with your Shipper credentials.
6. Configure auto-booking triggers and shipping defaults.

== Frequently Asked Questions ==
= Where do I get my DBARc Shipper credentials? =
Your credentials are provided by your Courier administrator when your merchant account is created on the DBARc platform.

= Does this plugin support HPOS (High-Performance Order Storage)? =
Yes, the plugin is fully compatible with WooCommerce HPOS custom orders tables.
