<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('POST');
start_app_session();

$data = read_json_body();
$email = strtolower(trim((string) ($data['email'] ?? '')));
$password = (string) ($data['password'] ?? '');

if ($email === '' || $password === '') {
    json_response(['error' => 'Email and password are required.'], 422);
}

// 1. Check the database for the user
$statement = db()->prepare('SELECT * FROM admin_users WHERE LOWER(email) = :email LIMIT 1');
$statement->execute([':email' => $email]);
$admin = $statement->fetch();

// 2. Verify the hashed password
$isValidAdmin = $admin && password_verify($password, (string) $admin['password_hash']);

// 3. Reject if invalid
if (!$isValidAdmin) {
    json_response(['error' => 'Invalid admin credentials.'], 401);
}

// 4. Login successful, set session
$_SESSION['is_admin'] = true;
$_SESSION['admin_email'] = $email;

json_response(['ok' => true]);