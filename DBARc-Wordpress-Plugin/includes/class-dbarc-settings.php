<?php
if (!defined('ABSPATH')) {
    exit;
}

class DBARc_Settings {
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_post_dbarc_login', [$this, 'handle_login_submit']);
        add_action('admin_post_dbarc_logout', [$this, 'handle_logout_submit']);
    }

    public function add_admin_menu() {
        add_menu_page(
            'DBARc Courier Settings',
            'DBARc Courier',
            'manage_woocommerce',
            'dbarc-courier-settings',
            [$this, 'render_settings_page'],
            'dashicons-cart',
            56
        );
    }

    public function register_settings() {
        register_setting('dbarc_settings_group', 'dbarc_api_base_url');
        register_setting('dbarc_settings_group', 'dbarc_tenant_id');
        register_setting('dbarc_settings_group', 'dbarc_auto_sync_status');
        register_setting('dbarc_settings_group', 'dbarc_default_service_type');
        register_setting('dbarc_settings_group', 'dbarc_default_weight');
    }

    public function handle_login_submit() {
        if (!current_user_can('manage_woocommerce') || !check_admin_referer('dbarc_login_action', 'dbarc_login_nonce')) {
            wp_die('Unauthorized action.');
        }

        $email = sanitize_text_field($_POST['dbarc_email'] ?? '');
        $password = $_POST['dbarc_password'] ?? '';
        $base_url = esc_url_raw($_POST['dbarc_api_base_url'] ?? 'http://localhost:1337');
        $tenant_id = sanitize_text_field($_POST['dbarc_tenant_id'] ?? '');

        update_option('dbarc_api_base_url', $base_url);
        if (!empty($tenant_id)) {
            update_option('dbarc_tenant_id', $tenant_id);
        }

        $client = new DBARc_API_Client();
        $result = $client->login($email, $password);

        if ($result['success']) {
            wp_redirect(admin_url('admin.php?page=dbarc-courier-settings&dbarc_msg=login_success'));
        } else {
            wp_redirect(admin_url('admin.php?page=dbarc-courier-settings&dbarc_error=' . urlencode($result['message'])));
        }
        exit;
    }

    public function handle_logout_submit() {
        if (!current_user_can('manage_woocommerce') || !check_admin_referer('dbarc_logout_action', 'dbarc_logout_nonce')) {
            wp_die('Unauthorized action.');
        }

        delete_option('dbarc_jwt_token');
        delete_option('dbarc_user_id');
        delete_option('dbarc_user_email');

        wp_redirect(admin_url('admin.php?page=dbarc-courier-settings&dbarc_msg=logout_success'));
        exit;
    }

    public function render_settings_page() {
        $jwt = get_option('dbarc_jwt_token', '');
        $user_email = get_option('dbarc_user_email', '');
        $is_connected = !empty($jwt);
        $base_url = get_option('dbarc_api_base_url', 'http://localhost:1337');
        $tenant_id = get_option('dbarc_tenant_id', '');
        $auto_sync_status = get_option('dbarc_auto_sync_status', 'processing');
        $default_service = get_option('dbarc_default_service_type', 'Overnight');
        $default_weight = get_option('dbarc_default_weight', '0.5');
        ?>
        <div class="wrap" style="max-width: 900px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #ccd0d4; padding-bottom: 15px;">
                <div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">DBARc Courier & Logistics</h1>
                    <p style="margin: 5px 0 0 0; color: #64748b;">Automated order fulfillment, airway bills, and live tracking synchronization.</p>
                </div>
                <div>
                    <?php if ($is_connected) : ?>
                        <span style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">
                            <span style="height: 8px; width: 8px; background: #10b981; border-radius: 50%;"></span>
                            Connected to Courier
                        </span>
                    <?php else : ?>
                        <span style="background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 12px;">
                            Not Connected
                        </span>
                    <?php endif; ?>
                </div>
            </div>

            <?php if (isset($_GET['dbarc_msg']) && $_GET['dbarc_msg'] === 'login_success') : ?>
                <div class="notice notice-success is-dismissible"><p><strong>Success!</strong> Successfully logged into DBARc Courier backend.</p></div>
            <?php elseif (isset($_GET['dbarc_msg']) && $_GET['dbarc_msg'] === 'logout_success') : ?>
                <div class="notice notice-info is-dismissible"><p>Logged out from DBARc Courier.</p></div>
            <?php elseif (isset($_GET['dbarc_error'])) : ?>
                <div class="notice notice-error is-dismissible"><p><strong>Error:</strong> <?php echo esc_html($_GET['dbarc_error']); ?></p></div>
            <?php endif; ?>

            <!-- Card 1: Connection & Authentication -->
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">1. Courier Account Authentication</h2>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 20px;">Enter your DBARc Courier credentials to authenticate your store.</p>

                <?php if ($is_connected) : ?>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="margin: 0; font-weight: 600; color: #334155;">Logged in as: <span style="color: #0284c7;"><?php echo esc_html($user_email); ?></span></p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">API Base URL: <code><?php echo esc_html($base_url); ?></code> | Tenant ID: <code><?php echo esc_html($tenant_id ?: 'Default'); ?></code></p>
                        </div>
                        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                            <?php wp_nonce_field('dbarc_logout_action', 'dbarc_logout_nonce'); ?>
                            <input type="hidden" name="action" value="dbarc_logout">
                            <button type="submit" class="button" style="color: #dc2626; border-color: #fca5a5;">Disconnect</button>
                        </form>
                    </div>
                <?php else : ?>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <?php wp_nonce_field('dbarc_login_action', 'dbarc_login_nonce'); ?>
                        <input type="hidden" name="action" value="dbarc_login">

                        <table class="form-table" style="margin-top: 0;">
                            <tr>
                                <th scope="row"><label for="dbarc_api_base_url">Courier API URL</label></th>
                                <td>
                                    <input type="url" name="dbarc_api_base_url" id="dbarc_api_base_url" value="<?php echo esc_attr($base_url); ?>" class="regular-text" required placeholder="http://localhost:1337 or https://api.dbarc.com">
                                    <p class="description">The URL of your DBARc Strapi backend server.</p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="dbarc_tenant_id">Tenant ID (Optional)</label></th>
                                <td>
                                    <input type="text" name="dbarc_tenant_id" id="dbarc_tenant_id" value="<?php echo esc_attr($tenant_id); ?>" class="regular-text" placeholder="e.g. 1">
                                    <p class="description">Leave blank if single tenant or embedded in user email.</p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="dbarc_email">Shipper Email / Username</label></th>
                                <td>
                                    <input type="text" name="dbarc_email" id="dbarc_email" class="regular-text" required placeholder="merchant@mystore.com">
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="dbarc_password">Shipper Password</label></th>
                                <td>
                                    <input type="password" name="dbarc_password" id="dbarc_password" class="regular-text" required>
                                </td>
                            </tr>
                        </table>

                        <p class="submit" style="margin-top: 15px; margin-bottom: 0;">
                            <button type="submit" class="button button-primary" style="background: #0284c7; border-color: #0284c7; font-weight: 600; padding: 4px 18px;">
                                Connect Store to Courier
                            </button>
                        </p>
                    </form>
                <?php endif; ?>
            </div>

            <!-- Card 2: Automatic Sync & Logistics Rules -->
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">2. Automation & Shipping Defaults</h2>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 20px;">Configure how WooCommerce orders are booked into DBARc.</p>

                <form method="post" action="options.php">
                    <?php settings_fields('dbarc_settings_group'); ?>

                    <table class="form-table" style="margin-top: 0;">
                        <tr>
                            <th scope="row"><label for="dbarc_auto_sync_status">Auto-Book on Order Status</label></th>
                            <td>
                                <select name="dbarc_auto_sync_status" id="dbarc_auto_sync_status" class="regular-text">
                                    <option value="disabled" <?php selected($auto_sync_status, 'disabled'); ?>>Disabled (Manual Booking Only)</option>
                                    <option value="processing" <?php selected($auto_sync_status, 'processing'); ?>>When Order becomes "Processing" (Recommended)</option>
                                    <option value="completed" <?php selected($auto_sync_status, 'completed'); ?>>When Order becomes "Completed"</option>
                                </select>
                                <p class="description">Automatically books with DBARc Courier and generates tracking number upon status transition.</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="dbarc_default_service_type">Default Service Type</label></th>
                            <td>
                                <select name="dbarc_default_service_type" id="dbarc_default_service_type" class="regular-text">
                                    <option value="Overnight" <?php selected($default_service, 'Overnight'); ?>>Overnight Delivery</option>
                                    <option value="Second Day" <?php selected($default_service, 'Second Day'); ?>>Second Day Delivery</option>
                                    <option value="Rush" <?php selected($default_service, 'Rush'); ?>>Rush (Same Day)</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="dbarc_default_weight">Default Weight (KG)</label></th>
                            <td>
                                <input type="number" step="0.1" name="dbarc_default_weight" id="dbarc_default_weight" value="<?php echo esc_attr($default_weight); ?>" class="small-text">
                                <p class="description">Fallback weight if product weight is not defined in WooCommerce.</p>
                            </td>
                        </tr>
                    </table>

                    <?php submit_button('Save Logistics Settings'); ?>
                </form>
            </div>
        </div>
        <?php
    }
}
