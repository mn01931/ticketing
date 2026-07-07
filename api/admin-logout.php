<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('POST');
start_app_session();
$_SESSION = [];
session_destroy();

json_response(['ok' => true]);
