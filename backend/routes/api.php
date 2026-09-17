<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductBatchController;
use App\Http\Controllers\Api\ProductConversionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ArqueoController;

// Public routes (with api middleware for JSON parsing)
Route::middleware('api')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/sales/{sale}/ticket', [SaleController::class, 'ticket']);
});

Route::middleware(['api', 'auth:sanctum'])->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Products
    Route::get('/products', [ProductController::class, 'index'])->middleware('permission:products.view');
    Route::get('/products/barcode/{barcode}', [ProductController::class, 'byBarcode'])->middleware('permission:products.view');
    Route::post('/products', [ProductController::class, 'store'])->middleware('permission:products.create');
    Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('permission:products.view');
    Route::put('/products/{product}', [ProductController::class, 'update'])->middleware('permission:products.edit');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('permission:products.delete');

    // Product Batches
    Route::get('/products/{product}/batches', [ProductBatchController::class, 'index'])->middleware('permission:inventory.view');
    Route::get('/products/{product}/movements', [ProductController::class, 'movements'])->middleware('permission:inventory.view');
    Route::post('/products/{product}/adjust-stock', [ProductController::class, 'adjustStock'])->middleware('permission:inventory.adjust');
    Route::post('/products/{product}/restock', [ProductController::class, 'restock'])->middleware('permission:inventory.restock');
    Route::post('/product-batches', [ProductBatchController::class, 'store'])->middleware('permission:inventory.adjust');
    Route::put('/product-batches/{productBatch}', [ProductBatchController::class, 'update'])->middleware('permission:inventory.adjust');
    Route::delete('/product-batches/{productBatch}', [ProductBatchController::class, 'destroy'])->middleware('permission:inventory.adjust');

    // Product Conversions
    Route::get('/products/{product}/conversions', [ProductConversionController::class, 'index'])->middleware('permission:products.view');
    Route::post('/products/{product}/conversions', [ProductConversionController::class, 'store'])->middleware('permission:products.edit');
    Route::put('/conversions/{conversion}', [ProductConversionController::class, 'update'])->middleware('permission:products.edit');
    Route::delete('/conversions/{conversion}', [ProductConversionController::class, 'destroy'])->middleware('permission:products.edit');

    // Categories
    Route::apiResource('categories', CategoryController::class)->middleware('permission:products.view');

    // Customers
    Route::get('/customers', [CustomerController::class, 'index'])->middleware('permission:customers.view');
    Route::post('/customers', [CustomerController::class, 'store'])->middleware('permission:customers.create');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:customers.edit');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->middleware('permission:customers.delete');

    // Sales
    Route::get('/sales', [SaleController::class, 'index'])->middleware('permission:sales.view');
    Route::post('/sales', [SaleController::class, 'store'])->middleware('permission:sales.create');
    Route::get('/sales/{sale}', [SaleController::class, 'show'])->middleware('permission:sales.view');
    // Users (admin only)
    Route::middleware('permission:users.manage')->group(function () {
        Route::apiResource('users', UserController::class);
        // RolePermissionController routes commented out - controller missing
        // Route::get('/roles-permissions', [RolePermissionController::class, 'index']);
        // Route::put('/users/{user}/permissions', [RolePermissionController::class, 'updateUserPermissions']);
        Route::put('/users/{user}/role', [UserController::class, 'updateRole']);
    });

    // Reports (no auth required for these endpoints within authenticated group)
    Route::get('/reports/sales', [ReportController::class, 'sales']);
    Route::get('/reports/products', [ReportController::class, 'products']);
    Route::get('/reports/customers', [ReportController::class, 'customers']);
    Route::get('/reports/purchases', [ReportController::class, 'purchases']);
    Route::get('/reports/expiring-batches', [ReportController::class, 'expiringBatches']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Exports
    Route::get('/exports/sales', [ExportController::class, 'salesExcel']);
    Route::get('/exports/products', [ExportController::class, 'productsExcel']);
    Route::get('/exports/purchases', [ExportController::class, 'purchasesExcel']);
    Route::get('/exports/inventory', [ExportController::class, 'inventoryExcel']);
    Route::get('/exports/arqueos', [ExportController::class, 'arqueoExcel']);
    Route::get('/exports/expiring-batches', [ExportController::class, 'expiringBatchesExcel']);

    // Arqueo
    Route::get('/arqueo/current', [ArqueoController::class, 'current']);
    Route::post('/arqueo/open', [ArqueoController::class, 'open']);
    Route::post('/arqueo/close', [ArqueoController::class, 'close']);
    Route::get('/arqueos', [ArqueoController::class, 'history']);
    Route::get('/arqueos/{arqueo}', [ArqueoController::class, 'show']);
    Route::post('/arqueo/movement', [ArqueoController::class, 'movement']);

    // Backups
    Route::get('/backups', [BackupController::class, 'index']);
    Route::post('/backups', [BackupController::class, 'create']);
    Route::get('/backups/{backup}/download', [BackupController::class, 'download']);
    Route::post('/backups/{backup}/restore', [BackupController::class, 'restore']);
    Route::delete('/backups/{backup}', [BackupController::class, 'destroy']);


});
