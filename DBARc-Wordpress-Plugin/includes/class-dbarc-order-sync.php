<?php
if (!defined('ABSPATH')) {
    exit;
}

class DBARc_Order_Sync {
    public function __construct() {
        // Automatic sync hook
        add_action('woocommerce_order_status_changed', [$this, 'handle_order_status_change'], 10, 3);

        // Order meta box in admin
        add_action('add_meta_boxes', [$this, 'add_order_meta_box']);

        // Manual booking admin action
        add_action('admin_post_dbarc_manual_book', [$this, 'handle_manual_booking']);

        // Thermal Label Print Route
        add_action('admin_init', [$this, 'handle_thermal_label_print']);

        // Display tracking info on customer email & view order page
        add_action('woocommerce_email_after_order_table', [$this, 'add_tracking_to_email'], 10, 4);
        add_action('woocommerce_order_details_after_order_table', [$this, 'add_tracking_to_view_order']);
    }

    /**
     * Hook into status change for automatic parcel booking
     */
    public function handle_order_status_change($order_id, $old_status, $new_status) {
        $trigger_status = get_option('dbarc_auto_sync_status', 'processing');
        if ($trigger_status === 'disabled') {
            return;
        }

        if ($new_status === $trigger_status) {
            $this->book_order_to_dbarc($order_id);
        }
    }

    /**
     * Manual Booking Handler from Admin Meta Box
     */
    public function handle_manual_booking() {
        if (!current_user_can('edit_shop_orders') || !check_admin_referer('dbarc_manual_book_action', 'dbarc_manual_book_nonce')) {
            wp_die('Unauthorized action.');
        }

        $order_id = intval($_POST['order_id'] ?? 0);
        if ($order_id > 0) {
            $result = $this->book_order_to_dbarc($order_id);
            if ($result['success']) {
                wp_redirect(admin_url('post.php?post=' . $order_id . '&action=edit&dbarc_booked=1'));
            } else {
                wp_redirect(admin_url('post.php?post=' . $order_id . '&action=edit&dbarc_error=' . urlencode($result['message'])));
            }
            exit;
        }
    }

    /**
     * Core Booking Logic: Extracts WooCommerce Order and posts to DBARc /api/parcels
     */
    public function book_order_to_dbarc($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) {
            return ['success' => false, 'message' => 'Invalid order.'];
        }

        // Check if already booked
        $existing_tracking = $order->get_meta('_dbarc_tracking_number');
        if (!empty($existing_tracking)) {
            return ['success' => true, 'tracking_number' => $existing_tracking, 'message' => 'Order already booked.'];
        }

        // Extract Customer and Address Details
        $name = trim($order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name());
        if (empty($name)) {
            $name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
        }

        $phone = $order->get_billing_phone();
        $address = $order->get_shipping_address_1() . ' ' . $order->get_shipping_address_2();
        if (empty(trim($address))) {
            $address = $order->get_billing_address_1() . ' ' . $order->get_billing_address_2();
        }

        $city = $order->get_shipping_city();
        if (empty($city)) {
            $city = $order->get_billing_city();
        }

        // Calculate COD amount: If payment is COD, total order amount; otherwise 0 (Prepaid)
        $payment_method = $order->get_payment_method();
        $is_cod = in_array($payment_method, ['cod', 'cash_on_delivery']);
        $cod_amount = $is_cod ? floatval($order->get_total()) : 0.0;

        // Weight Calculation
        $total_weight = 0.0;
        $total_pieces = 0;
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            $qty = $item->get_quantity();
            $total_pieces += $qty;
            if ($product && $product->has_weight()) {
                $total_weight += (floatval($product->get_weight()) * $qty);
            }
        }

        $fallback_weight = floatval(get_option('dbarc_default_weight', '0.5'));
        if ($total_weight <= 0) {
            $total_weight = $fallback_weight;
        }

        $default_service = get_option('dbarc_default_service_type', 'Overnight');
        $reference_number = 'WC-#' . $order->get_order_number();

        // Generate tracking ID
        $tracking_number = 'DBA-' . strtoupper(wp_generate_password(8, false));

        // Prepare Strapi parcel payload
        $parcel_data = [
            'tracking_number'    => $tracking_number,
            'recipient_name'     => $name ?: 'Customer',
            'recipient_phone'    => $phone ?: '0000000000',
            'recipient_address'  => $address ?: 'Address not provided',
            'cod_amount'         => $cod_amount,
            'weight'             => $total_weight,
            'pieces'             => $total_pieces ?: 1,
            'delivery_charges'   => 250.0,
            'service_type'       => $default_service,
            'reference_number'   => $reference_number,
            'status'             => 'Total Booking',
            'comments'           => 'Auto-booked from WooCommerce Order #' . $order->get_order_number(),
        ];

        // Call API
        $client = new DBARc_API_Client();
        $response = $client->book_shipment($parcel_data);

        if ($response['success']) {
            $assigned_tracking = $response['tracking_number'] ?: $tracking_number;

            // Save to Order Meta
            $order->update_meta_data('_dbarc_tracking_number', $assigned_tracking);
            $order->update_meta_data('_dbarc_parcel_id', $response['parcel_id'] ?? 0);
            $order->update_meta_data('_dbarc_booked_date', current_time('mysql'));
            $order->save();

            // Add Order Note
            $order->add_order_note(sprintf(
                __('Shipment automatically booked with DBARc Courier. Tracking Number: %s', 'dbarc-courier'),
                $assigned_tracking
            ));

            return [
                'success'         => true,
                'tracking_number' => $assigned_tracking,
                'parcel_id'       => $response['parcel_id'] ?? 0,
            ];
        }

        $order->add_order_note(sprintf(
            __('DBARc Courier Booking Failed: %s', 'dbarc-courier'),
            $response['message']
        ));

        return $response;
    }

    /**
     * Add DBARc Meta Box on WooCommerce Order Edit Page
     */
    public function add_order_meta_box() {
        add_meta_box(
            'dbarc_order_meta_box',
            'DBARc Courier Fulfillment',
            [$this, 'render_order_meta_box'],
            'shop_order',
            'side',
            'high'
        );

        // Support for HPOS (High-Performance Order Storage)
        if (class_exists('\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController') &&
            wc_get_container()->get(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class)->custom_orders_table_usage_is_enabled()) {
            add_meta_box(
                'dbarc_order_meta_box',
                'DBARc Courier Fulfillment',
                [$this, 'render_order_meta_box'],
                'woocommerce_page_wc-orders',
                'side',
                'high'
            );
        }
    }

    public function render_order_meta_box($post_or_order) {
        $order = ($post_or_order instanceof WC_Order) ? $post_or_order : wc_get_order($post_or_order->ID);
        if (!$order) return;

        $tracking_number = $order->get_meta('_dbarc_tracking_number');
        $booked_date = $order->get_meta('_dbarc_booked_date');
        $order_id = $order->get_id();
        ?>
        <div style="font-size: 13px; color: #334155;">
            <?php if (!empty($tracking_number)) : ?>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">Booked with DBARc</p>
                    <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a;"><?php echo esc_html($tracking_number); ?></p>
                    <?php if (!empty($booked_date)) : ?>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Booked: <?php echo esc_html($booked_date); ?></p>
                    <?php endif; ?>
                </div>

                <a href="<?php echo esc_url(admin_url('admin-post.php?action=dbarc_print_label&order_id=' . $order_id)); ?>" target="_blank" class="button button-primary" style="width: 100%; text-align: center; background: #0284c7; border-color: #0284c7; font-weight: 600; margin-bottom: 8px;">
                    🖨️ Print Thermal Airway Bill
                </a>
            <?php else : ?>
                <p style="color: #64748b; margin-top: 0; margin-bottom: 12px;">This order is not yet booked with DBARc Courier.</p>

                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <?php wp_nonce_field('dbarc_manual_book_action', 'dbarc_manual_book_nonce'); ?>
                    <input type="hidden" name="action" value="dbarc_manual_book">
                    <input type="hidden" name="order_id" value="<?php echo esc_attr($order_id); ?>">

                    <button type="submit" class="button button-primary" style="width: 100%; text-align: center; background: #0284c7; border-color: #0284c7; font-weight: 600;">
                        🚚 Book with DBARc Courier
                    </button>
                </form>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Thermal Shipping Label Generator (4x6 / A4 printable receipt)
     */
    public function handle_thermal_label_print() {
        if (isset($_GET['action']) && $_GET['action'] === 'dbarc_print_label' && isset($_GET['order_id'])) {
            if (!current_user_can('edit_shop_orders')) {
                wp_die('Unauthorized.');
            }

            $order_id = intval($_GET['order_id']);
            $order = wc_get_order($order_id);
            if (!$order) {
                wp_die('Order not found.');
            }

            $tracking = $order->get_meta('_dbarc_tracking_number') ?: 'N/A';
            $name = $order->get_formatted_shipping_full_name() ?: $order->get_formatted_billing_full_name();
            $phone = $order->get_billing_phone();
            $address = $order->get_shipping_address_1() . ', ' . $order->get_shipping_city();
            $cod = in_array($order->get_payment_method(), ['cod', 'cash_on_delivery']) ? $order->get_total() : '0.00 (Prepaid)';
            ?>
            <!DOCTYPE html>
            <html>
            <head>
                <title>DBARc Shipping Label - <?php echo esc_html($tracking); ?></title>
                <style>
                    body { font-family: monospace, sans-serif; padding: 20px; background: #f1f5f9; display: flex; justify-content: center; }
                    .label-box { width: 380px; background: #fff; border: 2px solid #000; padding: 15px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { border-bottom: 2px solid #000; padding-bottom: 10px; text-align: center; }
                    .barcode { font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 15px 0; padding: 8px; border: 1px dashed #000; }
                    .section { margin: 10px 0; font-size: 12px; line-height: 1.4; }
                    .cod-box { font-size: 16px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 0; text-align: center; margin-top: 10px; }
                    @media print { body { background: #fff; padding: 0; } .label-box { width: 100%; border: none; box-shadow: none; } }
                </style>
            </head>
            <body onload="window.print();">
                <div class="label-box">
                    <div class="header">
                        <h2 style="margin: 0; font-size: 18px;">DBARc COURIER AIRWAY BILL</h2>
                        <small>Official Delivery Manifest</small>
                    </div>

                    <div class="barcode">
                        *<?php echo esc_html($tracking); ?>*
                    </div>

                    <div class="section">
                        <strong>Order Ref:</strong> #<?php echo esc_html($order->get_order_number()); ?><br>
                        <strong>Date:</strong> <?php echo esc_html($order->get_date_created()->date('Y-m-d H:i')); ?><br>
                    </div>

                    <div class="section" style="border-top: 1px solid #000; padding-top: 8px;">
                        <strong>CONSIGNEE DETAILS:</strong><br>
                        <strong>Name:</strong> <?php echo esc_html($name); ?><br>
                        <strong>Phone:</strong> <?php echo esc_html($phone); ?><br>
                        <strong>Address:</strong> <?php echo esc_html($address); ?><br>
                    </div>

                    <div class="cod-box">
                        COLLECT COD: PKR <?php echo esc_html($cod); ?>
                    </div>

                    <div style="font-size: 10px; text-align: center; margin-top: 15px; color: #555;">
                        Generated via DBARc Courier WooCommerce Plugin
                    </div>
                </div>
            </body>
            </html>
            <?php
            exit;
        }
    }

    public function add_tracking_to_email($order, $sent_to_admin, $plain_text, $email) {
        $tracking = $order->get_meta('_dbarc_tracking_number');
        if (!empty($tracking)) {
            echo '<div style="margin: 16px 0; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;">';
            echo '<strong>Courier Tracking Number:</strong> ' . esc_html($tracking) . '<br>';
            echo '<small>Your package has been dispatched via DBARc Courier.</small>';
            echo '</div>';
        }
    }

    public function add_tracking_to_view_order($order) {
        $tracking = $order->get_meta('_dbarc_tracking_number');
        if (!empty($tracking)) {
            echo '<div class="woocommerce-info" style="margin-top: 20px;">';
            echo '<strong>Courier Tracking Number:</strong> ' . esc_html($tracking);
            echo '</div>';
        }
    }
}
