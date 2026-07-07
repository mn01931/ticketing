<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('POST');
$data = read_json_body();

$requiredFields = ['email', 'name', 'problem_category', 'description_location'];
foreach ($requiredFields as $field) {
    if (empty(trim((string) ($data[$field] ?? '')))) {
        json_response(['error' => ucfirst(str_replace('_', ' ', $field)) . ' is required.'], 422);
    }
}

$email = trim((string) $data['email']);

if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    json_response(['error' => 'Please enter a valid email address.'], 422);
}

$supportingDocuments = $data['supporting_documents']
    ?? $data['supporting_document']
    ?? $data['supportingDocuments']
    ?? $data['supportingDocument']
    ?? [];
$savedSupportingDocuments = [];

if (
    is_array($supportingDocuments) &&
    (
        isset($supportingDocuments['data_url']) ||
        isset($supportingDocuments['dataUrl']) ||
        isset($supportingDocuments['url'])
    )
) {
    $supportingDocuments = [$supportingDocuments];
}

if (!is_array($supportingDocuments)) {
    json_response(['error' => 'Invalid supporting document upload. Please choose the image again.'], 422);
}

$supportingDocuments = array_values(array_filter($supportingDocuments, static function ($supportingDocument): bool {
    if (!is_array($supportingDocument)) {
        return false;
    }

    $dataUrl = $supportingDocument['data_url'] ?? $supportingDocument['dataUrl'] ?? $supportingDocument['url'] ?? '';

    return trim((string) $dataUrl) !== '';
}));

if (count($supportingDocuments) > 10) {
    json_response(['error' => 'You can attach up to 10 files only.'], 422);
}

foreach ($supportingDocuments as $supportingDocument) {
    if (!is_array($supportingDocument)) {
        continue;
    }

    $dataUrl = (string) ($supportingDocument['data_url'] ?? $supportingDocument['dataUrl'] ?? $supportingDocument['url'] ?? '');

    if (!preg_match('/^data:([^;]+);base64,(.+)$/', $dataUrl, $matches)) {
        json_response(['error' => 'Invalid supporting document format.'], 422);
    }

    $originalName = basename((string) ($supportingDocument['name'] ?? 'supporting-document'));
    $uploadedMimeType = strtolower((string) ($supportingDocument['type'] ?? $matches[1]));
    $extensionFromName = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $mimeType = strtolower($matches[1]);
    $rawFile = base64_decode($matches[2], true);

    if ($rawFile === false) {
        json_response(['error' => 'Invalid supporting document data.'], 422);
    }

    $allowedExtensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'video/mp4' => 'mp4',
        'application/pdf' => 'pdf',
        'application/x-pdf' => 'pdf',
        'application/acrobat' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.ms-word' => 'doc',
        'application/x-msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    ];

    $allowedExtensionsByName = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'mp4' => 'video/mp4',
        'pdf' => 'application/pdf',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'docs' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (
        (!isset($allowedExtensions[$mimeType]) || $mimeType === 'application/octet-stream') &&
        isset($allowedExtensionsByName[$extensionFromName])
    ) {
        $mimeType = $allowedExtensionsByName[$extensionFromName];
    }

    if (!isset($allowedExtensions[$mimeType])) {
        json_response(['error' => 'Unsupported supporting document type. Please upload JPG, PNG, GIF, WEBP, MP4, PDF, DOC, DOCS, or DOCX only.'], 422);
    }

    $uploadDirectory = __DIR__ . '/../uploads/supporting-documents';

    if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true)) {
        json_response(['error' => 'Could not create upload directory.'], 500);
    }

    $extension = $allowedExtensions[$mimeType];
    $filename = sprintf('%s.%s', bin2hex(random_bytes(16)), $extension);
    $targetPath = $uploadDirectory . '/' . $filename;

    if (file_put_contents($targetPath, $rawFile) === false) {
        json_response(['error' => 'Could not save supporting document.'], 500);
    }

    $savedSupportingDocuments[] = [
        'name' => $originalName,
        'type' => $uploadedMimeType !== '' && $uploadedMimeType !== 'application/octet-stream' ? $uploadedMimeType : $mimeType,
        'data_url' => '/uploads/supporting-documents/' . $filename,
    ];
}

if (count($supportingDocuments) > 0 && count($savedSupportingDocuments) === 0) {
    json_response(['error' => 'Could not save the supporting document. Please choose the image again.'], 422);
}

$supportingDocumentJson = count($savedSupportingDocuments) > 0 ? json_encode($savedSupportingDocuments) : null;

$pdo = db();
$statement = $pdo->prepare(
    'INSERT INTO tickets (
        ticket_number,
        email,
        name,
        problem_category,
        description_location,
        supporting_document,
        status,
        assigned_to,
        remarks
    ) VALUES (
        "",
        :email,
        :name,
        :problem_category,
        :description_location,
        :supporting_document,
        "Open",
        "",
        ""
    )'
);

$statement->execute([
    ':email' => $email,
    ':name' => trim((string) $data['name']),
    ':problem_category' => trim((string) $data['problem_category']),
    ':description_location' => trim((string) $data['description_location']),
    ':supporting_document' => $supportingDocumentJson,
]);

$ticketId = $pdo->lastInsertId();
$ticket = $pdo
    ->query('SELECT * FROM tickets WHERE id = ' . (int) $ticketId)
    ->fetch();

$ticket = normalize_ticket($ticket);

if (count($savedSupportingDocuments) > 0 && empty($ticket['supporting_document'])) {
    $ticket['supporting_document'] = $savedSupportingDocuments;
}

$emailNotifications = send_ticket_notifications($ticket);

json_response([
    'ticket' => $ticket,
    'email_notifications' => $emailNotifications,
], 201);
