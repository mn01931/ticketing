<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('POST');
require_admin();

$data = read_json_body();
$id = (int) ($data['id'] ?? 0);

if ($id <= 0) {
    json_response(['error' => 'Ticket id is required.'], 422);
}

$statement = db()->prepare('DELETE FROM tickets WHERE id = :id');
$statement->execute([':id' => $id]);

json_response(['ok' => true]);
