<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';

$kernel = $app->make('Illuminate\Contracts\Http\Kernel');

$request = \Illuminate\Http\Request::capture();
echo "Before kernel handle:" . PHP_EOL;
echo "  Request all: " . json_encode($request->all()) . PHP_EOL;
echo "  Request input email: " . $request->input('email') . PHP_EOL;

$response = $kernel->handle($request);

echo "After kernel handle:" . PHP_EOL;
echo "  Status: " . $response->getStatusCode() . PHP_EOL;
echo "  Content: " . $response->getContent() . PHP_EOL;