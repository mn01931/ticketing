<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('GET');
require_admin();

$tickets = db()
    ->query('SELECT * FROM tickets ORDER BY created_at DESC')
    ->fetchAll();

json_response(['tickets' => array_map('normalize_ticket', $tickets)]);
