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

$statement = db()->prepare(
    'UPDATE tickets
     SET status = :status,
         assigned_to = :assigned_to,
         remarks = :remarks
     WHERE id = :id'
);

$statement->execute([
    ':id' => $id,
    ':status' => trim((string) ($data['status'] ?? 'Pending')),
    ':assigned_to' => trim((string) ($data['assigned_to'] ?? '')),
    ':remarks' => (string) ($data['remarks'] ?? ''),
]);

$select = db()->prepare('SELECT * FROM tickets WHERE id = :id LIMIT 1');
$select->execute([':id' => $id]);
$ticket = $select->fetch();

json_response(['ticket' => $ticket ? normalize_ticket($ticket) : null]);
