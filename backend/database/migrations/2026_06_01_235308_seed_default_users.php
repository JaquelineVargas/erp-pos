<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        $users = [
            ['name' => 'Admin Principal', 'email' => 'admin@erp.com', 'role' => 'admin'],
            ['name' => 'Cajero 1', 'email' => 'cajero@erp.com', 'role' => 'cashier'],
            ['name' => 'Supervisor 1', 'email' => 'supervisor@erp.com', 'role' => 'supervisor'],
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => Hash::make('12345678'),
                    'role' => $user['role'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $categories = [
            ['name' => 'Electrónicos', 'description' => 'Productos electrónicos y gadgets'],
            ['name' => 'Alimentos', 'description' => 'Alimentos y bebidas'],
            ['name' => 'Ropa', 'description' => 'Prendas de vestir y accesorios'],
            ['name' => 'Hogar', 'description' => 'Artículos para el hogar'],
            ['name' => 'Salud', 'description' => 'Productos de salud y belleza'],
        ];

        foreach ($categories as $cat) {
            DB::table('categories')->updateOrInsert(
                ['name' => $cat['name']],
                [
                    'description' => $cat['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $catIds = [];
        foreach ($categories as $cat) {
            $catIds[$cat['name']] = DB::table('categories')->where('name', $cat['name'])->value('id');
        }

        $products = [
            ['name' => 'Laptop HP ProBook', 'barcode' => '7501000111101', 'price' => 15999.99, 'cost' => 12000, 'stock' => 15, 'min_stock' => 3, 'category_id' => $catIds['Electrónicos']],
            ['name' => 'Smartphone Samsung Galaxy', 'barcode' => '7501000111102', 'price' => 8999.99, 'cost' => 6500, 'stock' => 25, 'min_stock' => 5, 'category_id' => $catIds['Electrónicos']],
            ['name' => 'Audífonos Bluetooth', 'barcode' => '7501000111103', 'price' => 599.99, 'cost' => 350, 'stock' => 50, 'min_stock' => 10, 'category_id' => $catIds['Electrónicos']],
            ['name' => 'Coca Cola 600ml', 'barcode' => '7501000111104', 'price' => 18.50, 'cost' => 12, 'stock' => 200, 'min_stock' => 50, 'category_id' => $catIds['Alimentos']],
            ['name' => 'Sabritas 170g', 'barcode' => '7501000111105', 'price' => 25.00, 'cost' => 16, 'stock' => 150, 'min_stock' => 30, 'category_id' => $catIds['Alimentos']],
            ['name' => 'Pan Bimbo Grande', 'barcode' => '7501000111106', 'price' => 45.00, 'cost' => 30, 'stock' => 80, 'min_stock' => 20, 'category_id' => $catIds['Alimentos']],
            ['name' => 'Camisa Polo Azul', 'barcode' => '7501000111107', 'price' => 349.99, 'cost' => 200, 'stock' => 40, 'min_stock' => 10, 'category_id' => $catIds['Ropa']],
            ['name' => 'Jeans Clásico', 'barcode' => '7501000111108', 'price' => 599.99, 'cost' => 380, 'stock' => 30, 'min_stock' => 8, 'category_id' => $catIds['Ropa']],
            ['name' => 'Lámpara LED', 'barcode' => '7501000111109', 'price' => 249.99, 'cost' => 150, 'stock' => 35, 'min_stock' => 10, 'category_id' => $catIds['Hogar']],
            ['name' => 'Shampoo Profesional', 'barcode' => '7501000111110', 'price' => 89.99, 'cost' => 55, 'stock' => 60, 'min_stock' => 15, 'category_id' => $catIds['Salud']],
        ];

        foreach ($products as $prod) {
            DB::table('products')->updateOrInsert(
                ['barcode' => $prod['barcode']],
                $prod + ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $customers = [
            ['name' => 'Juan Pérez', 'email' => 'juan@email.com', 'phone' => '555-0101', 'address' => 'Calle Principal 123'],
            ['name' => 'María García', 'email' => 'maria@email.com', 'phone' => '555-0102', 'address' => 'Av. Central 456'],
            ['name' => 'Carlos López', 'email' => 'carlos@email.com', 'phone' => '555-0103', 'address' => 'Blvd. Norte 789'],
            ['name' => 'Ana Martínez', 'email' => 'ana@email.com', 'phone' => '555-0104', 'address' => 'Calle Sur 321'],
            ['name' => 'Cliente Mostrador', 'email' => null, 'phone' => null, 'address' => null],
        ];

        foreach ($customers as $cust) {
            DB::table('customers')->updateOrInsert(
                ['name' => $cust['name']],
                array_merge($cust, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }

    public function down(): void
    {
        DB::table('users')->whereIn('email', [
            'admin@erp.com',
            'cajero@erp.com',
            'supervisor@erp.com',
        ])->delete();

        DB::table('products')->whereIn('barcode', [
            '7501000111101','7501000111102','7501000111103','7501000111104','7501000111105',
            '7501000111106','7501000111107','7501000111108','7501000111109','7501000111110',
        ])->delete();

        DB::table('categories')->whereIn('name', [
            'Electrónicos','Alimentos','Ropa','Hogar','Salud',
        ])->delete();

        DB::table('customers')->whereIn('name', [
            'Juan Pérez','María García','Carlos López','Ana Martínez','Cliente Mostrador',
        ])->delete();
    }
};
