<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('GET');
$ticketNumber = trim((string) ($_GET['ticket_number'] ?? ''));

if ($ticketNumber === '') {
    json_response(['error' => 'Ticket number is required.'], 422);
}

$statement = db()->prepare('SELECT * FROM tickets WHERE ticket_number = :ticket_number LIMIT 1');
$statement->execute([':ticket_number' => $ticketNumber]);
$ticket = $statement->fetch();

json_response(['ticket' => $ticket ? normalize_ticket($ticket) : null]);
