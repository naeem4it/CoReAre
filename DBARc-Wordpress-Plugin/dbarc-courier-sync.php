<?php
/**
 * Plugin Name: DBARc Courier & Logistics for WooCommerce
 * Plugin URI: https://dbarc.com
 * Description: Automated Courier Shipping, Instant Tracking, and Thermal Airway Bill Printing for DBARc Logistics SaaS.
 * Version: 1.0.0
 * Author: DBARc Engineering
 * Author URI: https://dbarc.com
 * Text Domain: dbarc-courier
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.5
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

define('DBARC_VERSION', '1.0.0');
define('DBARC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('DBARC_PLUGIN_URL', plugin_dir_url(__FILE__));

// Check if WooCommerce is active
function dbarc_check_woocommerce_active() {
    if (!in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
        add_action('admin_notices', function() {
            echo '<div class="error"><p><strong>DBARc Courier:</strong> WooCommerce is required for this plugin to work. Please install and activate WooCommerce.</p></div>';
        });
        return false;
    }
    return true;
}

// Load Plugin Classes
require_once DBARC_PLUGIN_DIR . 'includes/class-dbarc-api-client.php';
require_once DBARC_PLUGIN_DIR . 'includes/class-dbarc-settings.php';
require_once DBARC_PLUGIN_DIR . 'includes/class-dbarc-order-sync.php';

// Initialize Plugin
function dbarc_init_plugin() {
    if (!dbarc_check_woocommerce_active()) {
        return;
    }

    new DBARc_Settings();
    new DBARc_Order_Sync();
}
add_action('plugins_loaded', 'dbarc_init_plugin');
