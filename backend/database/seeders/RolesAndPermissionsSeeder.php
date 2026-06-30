<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['key' => 'products.create', 'name' => 'Crear productos', 'group' => 'Productos'],
            ['key' => 'products.edit', 'name' => 'Editar productos', 'group' => 'Productos'],
            ['key' => 'products.view', 'name' => 'Ver productos', 'group' => 'Productos'],
            ['key' => 'products.delete', 'name' => 'Eliminar productos', 'group' => 'Productos'],
            ['key' => 'categories.create', 'name' => 'Crear categorías', 'group' => 'Categorías'],
            ['key' => 'categories.edit', 'name' => 'Editar categorías', 'group' => 'Categorías'],
            ['key' => 'categories.view', 'name' => 'Ver categorías', 'group' => 'Categorías'],
            ['key' => 'categories.delete', 'name' => 'Eliminar categorías', 'group' => 'Categorías'],
            ['key' => 'users.create', 'name' => 'Crear usuarios', 'group' => 'Usuarios'],
            ['key' => 'users.edit', 'name' => 'Editar usuarios', 'group' => 'Usuarios'],
            ['key' => 'users.view', 'name' => 'Ver usuarios', 'group' => 'Usuarios'],
            ['key' => 'users.delete', 'name' => 'Eliminar usuarios', 'group' => 'Usuarios'],
            ['key' => 'sales.create', 'name' => 'Realizar ventas', 'group' => 'Ventas'],
            ['key' => 'sales.view', 'name' => 'Ver ventas', 'group' => 'Ventas'],
            ['key' => 'sales.void', 'name' => 'Anular ventas', 'group' => 'Ventas'],
            ['key' => 'reports.view', 'name' => 'Ver reportes', 'group' => 'Reportes'],
            ['key' => 'reports.export', 'name' => 'Exportar reportes', 'group' => 'Reportes'],
            ['key' => 'cash-register.open', 'name' => 'Abrir arqueo', 'group' => 'Arqueo'],
            ['key' => 'cash-register.close', 'name' => 'Cerrar arqueo', 'group' => 'Arqueo'],
            ['key' => 'cash-register.view', 'name' => 'Ver arqueo', 'group' => 'Arqueo'],
            ['key' => 'config.view', 'name' => 'Configuración del sistema', 'group' => 'Configuración'],
            ['key' => 'backups.create', 'name' => 'Crear backups', 'group' => 'Backups'],
            ['key' => 'backups.restore', 'name' => 'Restaurar backups', 'group' => 'Backups'],
            ['key' => 'inventory.view', 'name' => 'Ver movimientos inventario', 'group' => 'Inventario'],
            ['key' => 'inventory.adjust', 'name' => 'Ajustar inventario', 'group' => 'Inventario'],
            ['key' => 'inventory.restock', 'name' => 'Reabastecer inventario', 'group' => 'Inventario'],
            ['key' => 'customers.create', 'name' => 'Crear clientes', 'group' => 'Clientes'],
            ['key' => 'customers.edit', 'name' => 'Editar clientes', 'group' => 'Clientes'],
            ['key' => 'customers.view', 'name' => 'Ver clientes', 'group' => 'Clientes'],
            ['key' => 'customers.delete', 'name' => 'Eliminar clientes', 'group' => 'Clientes'],
            ['key' => 'dashboard.view', 'name' => 'Ver dashboard', 'group' => 'Dashboard'],
        ];

        $idByKey = [];
        foreach ($permissions as $p) {
            $perm = Permission::firstOrCreate(
                ['key' => $p['key']],
                ['name' => $p['name'], 'group' => $p['group']]
            );
            $idByKey[$p['key']] = $perm->id;
        }

        // Admin: todos los permisos excepto restore (solo superadmin manual)
        DB::table('role_permissions')->where('role', 'admin')->delete();
        foreach ($idByKey as $key => $id) {
            if (!in_array($key, ['backups.restore'])) {
                DB::table('role_permissions')->insert([
                    'role' => 'admin',
                    'permission_id' => $id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Supervisor: productos, categorías, ventas, reportes, arqueo, inventario, clientes, dashboard
        $supervisorPerms = [
            'products.view', 'categories.view', 'users.view',
            'sales.view', 'sales.create', 'sales.void',
            'reports.view', 'reports.export',
            'cash-register.open', 'cash-register.close', 'cash-register.view',
            'config.view',
            'inventory.view', 'inventory.adjust', 'inventory.restock',
            'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
            'dashboard.view',
        ];
        DB::table('role_permissions')->where('role', 'supervisor')->delete();
        foreach ($supervisorPerms as $key) {
            if (isset($idByKey[$key])) {
                DB::table('role_permissions')->insert([
                    'role' => 'supervisor',
                    'permission_id' => $idByKey[$key],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Cashier: solo ventas + ver productos/categorías + clientes + dashboard
        $cashierPerms = [
            'products.view', 'categories.view',
            'sales.create', 'sales.view',
            'cash-register.open', 'cash-register.close', 'cash-register.view',
            'customers.view',
            'dashboard.view',
        ];
        DB::table('role_permissions')->where('role', 'cashier')->delete();
        foreach ($cashierPerms as $key) {
            if (isset($idByKey[$key])) {
                DB::table('role_permissions')->insert([
                    'role' => 'cashier',
                    'permission_id' => $idByKey[$key],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
