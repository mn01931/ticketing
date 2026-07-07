<?php
declare(strict_types=1);

const DB_HOST = 'localhost';
const DB_NAME = 'u627398042_ticketing';
const DB_USER = 'u627398042_ticketadmin';
const DB_PASS = 'Lsei2024';
const DB_TIMEZONE = '+08:00';
const APP_TIMEZONE = 'Asia/Manila';

const MAIL_FROM_EMAIL = 'itojt@lakeshore.edu.ph';
const MAIL_FROM_NAME = 'Lakeshore Ticketing Portal';
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 465;
const SMTP_USERNAME = 'itojt@lakeshore.edu.ph';
const SMTP_PASSWORD = 'tpdiklyxovcsonbc';
const ADMIN_NOTIFICATION_EMAILS = [
    'mbautista@lakeshore.edu.ph',
    'mgamboa@lakeshore.edu.ph',
];

ini_set('display_errors', '0');
error_reporting(E_ALL);
date_default_timezone_set(APP_TIMEZONE);

function allow_cors_for_local_development(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedOrigins = [
        'https://ticketing.lakeshore.education',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];

    if (in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Max-Age: 86400');
        header('Vary: Origin');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

allow_cors_for_local_development();

set_exception_handler(function (Throwable $exception): void {
    json_response([
        'error' => 'Server error: ' . $exception->getMessage(),
    ], 500);
});

function start_app_session(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

        session_start([
            'cookie_httponly' => true,
            'cookie_secure' => $isHttps,
            'cookie_samesite' => $isHttps ? 'None' : 'Lax',
        ]);
    }
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec("SET time_zone = '" . DB_TIMEZONE . "'");

    return $pdo;
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);

    if (!is_array($data)) {
        json_response(['error' => 'Invalid JSON body.'], 400);
    }

    return $data;
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        json_response(['error' => 'Method not allowed.'], 405);
    }
}

function require_admin(): void
{
    start_app_session();

    if (empty($_SESSION['is_admin'])) {
        json_response(['error' => 'Unauthorized.'], 401);
    }
}

function normalize_supporting_documents($documents): ?array
{
    if ($documents === null || $documents === '') {
        return null;
    }

    if (is_string($documents)) {
        $decodedDocuments = json_decode($documents, true);

        if (json_last_error() === JSON_ERROR_NONE) {
            return normalize_supporting_documents($decodedDocuments);
        }

        return [
            [
                'name' => basename($documents) ?: 'Supporting document',
                'type' => '',
                'data_url' => $documents,
            ],
        ];
    }

    if (!is_array($documents)) {
        return null;
    }

    if (isset($documents['data_url'])) {
        $documents = [$documents];
    }

    $normalizedDocuments = [];

    foreach ($documents as $document) {
        if (!is_array($document) || empty($document['data_url'])) {
            continue;
        }

        $dataUrl = (string) $document['data_url'];
        $normalizedDocuments[] = [
            'name' => (string) ($document['name'] ?? basename($dataUrl) ?: 'Supporting document'),
            'type' => (string) ($document['type'] ?? ''),
            'data_url' => $dataUrl,
        ];
    }

    return count($normalizedDocuments) > 0 ? $normalizedDocuments : null;
}

function normalize_ticket(array $ticket): array
{
    $ticket['id'] = (string) $ticket['id'];
    $ticket['supporting_document'] = normalize_supporting_documents($ticket['supporting_document'] ?? null);

    return $ticket;
}

function current_app_timestamp(): string
{
    return date('Y-m-d H:i:s');
}

function app_base_url(): string
{
    $host = $_SERVER['HTTP_HOST'] ?? 'ticketing.lakeshore.education';
    $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $isHttps ? 'https' : 'http';

    return $scheme . '://' . $host;
}

// CHANGED: This now returns the root URL without the ?admin=1 parameter
function admin_dashboard_url(): string
{
    return app_base_url() . '/';
}

function html_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function ticket_plain_text(array $ticket, bool $includeAdminLink = false): string
{
    $lines = [
        'Ticket ID: ' . (string) ($ticket['ticket_number'] ?? ''),
        'Name: ' . (string) ($ticket['name'] ?? ''),
        'Email: ' . (string) ($ticket['email'] ?? ''),
        'Category: ' . (string) ($ticket['problem_category'] ?? ''),
        'Status: ' . (string) ($ticket['status'] ?? 'Open'),
        'Description and Location:',
        (string) ($ticket['description_location'] ?? ''),
    ];

    $documents = normalize_supporting_documents($ticket['supporting_document'] ?? null);

    if ($documents) {
        $lines[] = '';
        $lines[] = 'Supporting Documents:';

        foreach ($documents as $document) {
            $url = (string) ($document['data_url'] ?? '');
            $absoluteUrl = strpos($url, 'http') === 0 ? $url : app_base_url() . $url;
            $lines[] = '- ' . (string) ($document['name'] ?? 'Supporting document') . ': ' . $absoluteUrl;
        }
    }

    if ($includeAdminLink) {
        $lines[] = '';
        $lines[] = 'Admin Dashboard: ' . admin_dashboard_url();
    }

    return implode("\n", $lines);
}

function ticket_html_table(array $ticket, bool $includeAdminLink = false): string
{
    $rows = [
        'Ticket ID' => html_escape((string) ($ticket['ticket_number'] ?? '')),
        'Name' => html_escape((string) ($ticket['name'] ?? '')),
        'Email' => html_escape((string) ($ticket['email'] ?? '')),
        'Category' => html_escape((string) ($ticket['problem_category'] ?? '')),
        'Status' => html_escape((string) ($ticket['status'] ?? 'Open')),
        'Description and Location' => nl2br(html_escape((string) ($ticket['description_location'] ?? ''))),
    ];

    $html = '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:16px;">';

    foreach ($rows as $label => $value) {
        $html .= '<tr>';
        $html .= '<th align="left" style="width:180px;padding:10px;border:1px solid #d8e6cf;background:#f4f9ee;color:#245d1d;font-family:Arial,sans-serif;font-size:14px;">' . html_escape($label) . '</th>';
        $html .= '<td style="padding:10px;border:1px solid #d8e6cf;color:#1f2937;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">' . $value . '</td>';
        $html .= '</tr>';
    }

    $documents = normalize_supporting_documents($ticket['supporting_document'] ?? null);

    if ($documents) {
        $links = [];

        foreach ($documents as $document) {
            $url = (string) ($document['data_url'] ?? '');
            $absoluteUrl = strpos($url, 'http') === 0 ? $url : app_base_url() . $url;
            $links[] = '<a href="' . html_escape($absoluteUrl) . '" style="color:#245d1d;">' . html_escape((string) ($document['name'] ?? 'Supporting document')) . '</a>';
        }

        $html .= '<tr>';
        $html .= '<th align="left" style="width:180px;padding:10px;border:1px solid #d8e6cf;background:#f4f9ee;color:#245d1d;font-family:Arial,sans-serif;font-size:14px;">Supporting Documents</th>';
        $html .= '<td style="padding:10px;border:1px solid #d8e6cf;color:#1f2937;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">' . implode('<br>', $links) . '</td>';
        $html .= '</tr>';
    }

    if ($includeAdminLink) {
        $html .= '<tr>';
        $html .= '<th align="left" style="width:180px;padding:10px;border:1px solid #d8e6cf;background:#f4f9ee;color:#245d1d;font-family:Arial,sans-serif;font-size:14px;">Admin Dashboard</th>';
        $html .= '<td style="padding:10px;border:1px solid #d8e6cf;color:#1f2937;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;"><a href="' . html_escape(admin_dashboard_url()) . '" style="color:#245d1d;">Manage this ticket</a></td>';
        $html .= '</tr>';
    }

    $html .= '</table>';

    return $html;
}

function send_ticket_email(array $recipients, string $subject, string $htmlBody): bool
{
    $validRecipients = array_values(array_filter($recipients, static function (string $recipient): bool {
        return filter_var($recipient, FILTER_VALIDATE_EMAIL) !== false;
    }));

    if (count($validRecipients) === 0) {
        error_log('Ticket email skipped: no valid recipients for ' . $subject);
        return false;
    }

    if (
        SMTP_USERNAME === '' ||
        SMTP_PASSWORD === '' ||
        SMTP_PASSWORD === 'replace-with-gmail-app-password'
    ) {
        error_log('Ticket email skipped: Gmail SMTP app password is not configured.');
        return false;
    }

    $socket = stream_socket_client(
        'ssl://' . SMTP_HOST . ':' . SMTP_PORT,
        $errorCode,
        $errorMessage,
        20,
        STREAM_CLIENT_CONNECT
    );

    if (!$socket) {
        error_log('Gmail SMTP connection failed: ' . $errorCode . ' ' . $errorMessage);
        return false;
    }

    stream_set_timeout($socket, 20);

    try {
        smtp_expect($socket, [220]);
        smtp_command($socket, 'EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), [250]);
        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode(SMTP_USERNAME), [334]);
        smtp_command($socket, base64_encode(SMTP_PASSWORD), [235]);
        smtp_command($socket, 'MAIL FROM:<' . SMTP_USERNAME . '>', [250]);

        foreach ($validRecipients as $recipient) {
            smtp_command($socket, 'RCPT TO:<' . $recipient . '>', [250, 251]);
        }

        smtp_command($socket, 'DATA', [354]);

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_EMAIL . '>',
            'Reply-To: ' . MAIL_FROM_EMAIL,
            'To: ' . implode(',', $validRecipients),
            'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        ];
        $payload = implode("\r\n", $headers) . "\r\n\r\n" . $htmlBody;
        $payload = preg_replace('/^\./m', '..', $payload);

        fwrite($socket, $payload . "\r\n.\r\n");
        smtp_expect($socket, [250]);
        smtp_command($socket, 'QUIT', [221]);
        fclose($socket);

        return true;
    } catch (Throwable $exception) {
        error_log('Gmail SMTP send failed: ' . $exception->getMessage());
        fclose($socket);

        return false;
    }
}

function smtp_command($socket, string $command, array $expectedCodes): void
{
    fwrite($socket, $command . "\r\n");
    smtp_expect($socket, $expectedCodes);
}

function smtp_expect($socket, array $expectedCodes): void
{
    $response = '';

    while (($line = fgets($socket, 512)) !== false) {
        $response .= $line;

        if (strlen($line) >= 4 && $line[3] === ' ') {
            break;
        }
    }

    $code = (int) substr($response, 0, 3);

    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('Unexpected SMTP response: ' . trim($response));
    }
}

function send_ticket_notifications(array $ticket): array
{
    $ticketNumber = (string) ($ticket['ticket_number'] ?? '');
    $category = (string) ($ticket['problem_category'] ?? '');
    $userEmail = (string) ($ticket['email'] ?? '');

    $userSubject = '[' . $ticketNumber . "] Confirmation: We've received your concern";
    $userHtml = '<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">'
        . '<p>Hello ' . html_escape((string) ($ticket['name'] ?? '')) . ',</p>'
        . '<p>Thank you for contacting us. We have received your concern and created a support ticket for tracking.</p>'
        . ticket_html_table($ticket)
        . '<p>Please keep your Ticket ID for reference.</p>'
        . '<pre style="display:none;">' . html_escape(ticket_plain_text($ticket)) . '</pre>'
        . '</div>';

    $adminSubject = 'New Support Ticket Created: ' . $ticketNumber . ' - ' . $category;
    $adminHtml = '<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">'
        . '<p>A new support ticket has been submitted.</p>'
        . ticket_html_table($ticket, true)
        . '<pre style="display:none;">' . html_escape(ticket_plain_text($ticket, true)) . '</pre>'
        . '</div>';

    $userSent = send_ticket_email([$userEmail], $userSubject, $userHtml);
    $adminSent = send_ticket_email(ADMIN_NOTIFICATION_EMAILS, $adminSubject, $adminHtml);

    if (!$userSent) {
        error_log('Ticket confirmation email failed for ticket ' . $ticketNumber . '.');
    }

    if (!$adminSent) {
        error_log('Ticket admin alert email failed for ticket ' . $ticketNumber . '.');
    }

    return [
        'user' => $userSent,
        'admin' => $adminSent,
    ];
}