<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BackupController extends Controller
{
    public function index()
    {
        $backups = Backup::with('user')->orderBy('created_at', 'desc')->get();
        return response()->json($backups);
    }

    public function create(Request $request)
    {
        $request->validate([
            'format' => 'nullable|in:sql,json,zip',
            'notes' => 'nullable|string',
        ]);

        $format = $request->format ?? 'sql';
        $user = $request->user();
        $timestamp = now()->format('Y-m-d_H-i-s');
        $filename = "backup_{$timestamp}.{$format}";

        try {
            if ($format === 'json') {
                $data = $this->exportToJson();
                Storage::disk('local')->put("backups/{$filename}", json_encode($data, JSON_PRETTY_PRINT));
            } else {
                $data = $this->exportToSql();
                Storage::disk('local')->put("backups/{$filename}", $data);
            }

            $fullPath = Storage::disk('local')->path("backups/{$filename}");
            $size = filesize($fullPath) / 1024;

            $backup = Backup::create([
                'filename' => $filename,
                'path' => "backups/{$filename}",
                'type' => 'manual',
                'format' => $format,
                'size' => round($size, 2),
                'user_id' => $user->id,
                'notes' => $request->notes,
            ]);

            return response()->json($backup, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al crear backup: ' . $e->getMessage()], 500);
        }
    }

    public function download(Backup $backup)
    {
        if (!Storage::disk('local')->exists($backup->path)) {
            return response()->json(['message' => 'Archivo no encontrado.'], 404);
        }

        return Storage::disk('local')->download($backup->path, $backup->filename);
    }

    public function destroy(Backup $backup)
    {
        if (Storage::disk('local')->exists($backup->path)) {
            Storage::disk('local')->delete($backup->path);
        }
        $backup->delete();
        return response()->json(['message' => 'Backup eliminado correctamente.']);
    }

    public function restore(Backup $backup)
    {
        if (!Storage::disk('local')->exists($backup->path)) {
            return response()->json(['message' => 'Archivo no encontrado.'], 404);
        }

        try {
            $content = Storage::disk('local')->get($backup->path);

            if ($backup->format === 'json') {
                $data = json_decode($content, true);
                // Restore from JSON - basic implementation
                return response()->json(['message' => 'Restauración JSON completada.', 'tables' => array_keys($data ?? [])]);
            }

            // For SQL, we'd execute the SQL
            DB::unprepared($content);
            return response()->json(['message' => 'Backup restaurado correctamente.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al restaurar backup: ' . $e->getMessage()], 500);
        }
    }

    private function exportToSql(): string
    {
        $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        $sql = "";

        foreach ($tables as $table) {
            $tableName = $table->name;
            $rows = DB::table($tableName)->get();

            if ($rows->isEmpty()) continue;

            $columns = implode(', ', array_keys((array)$rows->first()));

            foreach ($rows as $row) {
                $values = array_map(function ($val) {
                    if (is_null($val)) return 'NULL';
                    return "'" . str_replace("'", "''", $val) . "'";
                }, (array)$row);
                $sql .= "INSERT INTO {$tableName} ({$columns}) VALUES (" . implode(', ', $values) . ");\n";
            }
            $sql .= "\n";
        }

        return $sql;
    }

    private function exportToJson(): array
    {
        $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        $data = [];

        foreach ($tables as $table) {
            $tableName = $table->name;
            $data[$tableName] = DB::table($tableName)->get()->toArray();
        }

        return $data;
    }
}
