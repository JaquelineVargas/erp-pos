<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';

// Test Request::capture()
$request = \Illuminate\Http\Request::capture();

echo "Request content type: " . $request->header('Content-Type') . PHP_EOL;
echo "Request method: " . $request->getMethod() . PHP_EOL;
echo "Request content: " . $request->getContent() . PHP_EOL;
echo "Request all: " . json_encode($request->all()) . PHP_EOL;
echo "Request input email: " . $request->input('email') . PHP_EOL;
echo "Request input password: " . $request->input('password') . PHP_EOL;
echo "Request server CONTENT_TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'NOT SET') . PHP_EOL;
echo "Request server CONTENT_LENGTH: " . ($_SERVER['CONTENT_LENGTH'] ?? 'NOT SET') . PHP_EOL;
echo "php://input: " . file_get_contents('php://input') . PHP_EOL;