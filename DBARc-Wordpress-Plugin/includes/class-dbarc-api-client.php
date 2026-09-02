<?php
if (!defined('ABSPATH')) {
    exit;
}

class DBARc_API_Client {
    private $base_url;
    private $tenant_id;
    private $api_token;

    public function __construct() {
        $this->base_url = rtrim(get_option('dbarc_api_base_url', 'http://localhost:1337'), '/');
        $this->tenant_id = get_option('dbarc_tenant_id', '');
        $this->api_token = get_option('dbarc_jwt_token', '');
    }

    /**
     * Authenticate Shipper into DBARc Courier Backend
     */
    public function login($identifier, $password) {
        $url = $this->base_url . '/api/auth/local';

        $headers = [
            'Content-Type' => 'application/json',
            'Accept'       => 'application/json',
        ];

        if (!empty($this->tenant_id)) {
            $headers['x-tenant-id'] = $this->tenant_id;
        }

        $body = wp_json_encode([
            'identifier' => $identifier,
            'password'   => $password,
        ]);

        $response = wp_remote_post($url, [
            'headers' => $headers,
            'body'    => $body,
            'timeout' => 20,
        ]);

        if (is_wp_error($response)) {
            return [
                'success' => false,
                'message' => $response->get_error_message(),
            ];
        }

        $status = wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);

        if ($status === 200 && isset($data['jwt'])) {
            // Save token and user details
            update_option('dbarc_jwt_token', $data['jwt']);
            update_option('dbarc_user_id', $data['user']['id'] ?? '');
            update_option('dbarc_user_email', $data['user']['email'] ?? '');
            if (isset($data['user']['tenant'])) {
                update_option('dbarc_tenant_id', is_array($data['user']['tenant']) ? $data['user']['tenant']['id'] : $data['user']['tenant']);
            }

            return [
                'success' => true,
                'jwt'     => $data['jwt'],
                'user'    => $data['user'],
            ];
        }

        return [
            'success' => false,
            'message' => $data['error']['message'] ?? 'Login failed. Please check credentials.',
        ];
    }

    /**
     * Fetch Destination Cities List from DBARc
     */
    public function get_cities() {
        $url = $this->base_url . '/api/cities?pagination[pageSize]=500';

        $headers = [
            'Accept' => 'application/json',
        ];
        if (!empty($this->api_token)) {
            $headers['Authorization'] = 'Bearer ' . $this->api_token;
        }
        if (!empty($this->tenant_id)) {
            $headers['x-tenant-id'] = $this->tenant_id;
        }

        $response = wp_remote_get($url, [
            'headers' => $headers,
            'timeout' => 15,
        ]);

        if (is_wp_error($response)) {
            return [];
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return $data['data'] ?? [];
    }

    /**
     * Create Parcel / Book Order in DBARc
     */
    public function book_shipment($parcel_data) {
        $url = $this->base_url . '/api/parcels';

        $headers = [
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
            'Authorization' => 'Bearer ' . $this->api_token,
        ];

        if (!empty($this->tenant_id)) {
            $headers['x-tenant-id'] = $this->tenant_id;
        }

        $response = wp_remote_post($url, [
            'headers' => $headers,
            'body'    => wp_json_encode(['data' => $parcel_data]),
            'timeout' => 20,
        ]);

        if (is_wp_error($response)) {
            return [
                'success' => false,
                'message' => $response->get_error_message(),
            ];
        }

        $status = wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);

        if ($status >= 200 && $status < 300 && isset($data['data'])) {
            return [
                'success'         => true,
                'tracking_number' => $data['data']['tracking_number'] ?? $data['data']['attributes']['tracking_number'] ?? '',
                'parcel_id'       => $data['data']['id'] ?? 0,
                'status'          => $data['data']['status'] ?? 'Total Booking',
            ];
        }

        return [
            'success' => false,
            'message' => $data['error']['message'] ?? 'Failed to book parcel in DBARc.',
        ];
    }
}
