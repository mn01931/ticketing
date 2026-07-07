<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('GET');
start_app_session();

json_response(['is_admin' => !empty($_SESSION['is_admin'])]);
