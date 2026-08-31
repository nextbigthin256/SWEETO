<?php
// File: webhook/whatsapp.php
// Official Meta WhatsApp Webhook Handler for sweeto.store

$VERIFY_TOKEN = 'sweeto@256';

// 1. GET Request: Meta Webhook Verification
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // PHP automatically converts dots (.) to underscores (_) in $_GET array keys
    $mode = $_GET['hub_mode'] ?? $_GET['hub.mode'] ?? '';
    $token = $_GET['hub_verify_token'] ?? $_GET['hub.verify_token'] ?? '';
    $challenge = $_GET['hub_challenge'] ?? $_GET['hub.challenge'] ?? '';

    if ($mode === 'subscribe' && $token === $VERIFY_TOKEN) {
        header('Content-Type: text/plain');
        http_response_code(200);
        echo $challenge;
        exit;
    }
    
    header('Content-Type: text/plain');
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

// 2. POST Request: Incoming WhatsApp Event Payload
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    error_log('[WhatsApp Webhook Event Received]: ' . $input);
    
    header('Content-Type: text/plain');
    http_response_code(200);
    echo 'EVENT_RECEIVED';
    exit;
}

http_response_code(405);
echo 'Method Not Allowed';
exit;
?>
