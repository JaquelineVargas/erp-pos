<?php

namespace App\Services;

use Carbon\Carbon;

class DateUtils
{
    public static function nowUTC(): Carbon
    {
        return Carbon::now('UTC');
    }

    public static function parseUTC(string $date): Carbon
    {
        return Carbon::parse($date, 'UTC');
    }

    public static function formatLocale(Carbon $date, string $format = 'd/m/Y H:i', ?string $timezone = null): string
    {
        $tz = $timezone ?? 'America/Mexico_City';
        return $date->copy()->tz($tz)->format($format);
    }

    public static function formatUTC(Carbon $date, string $format = 'Y-m-d H:i:s'): string
    {
        return $date->copy()->tz('UTC')->format($format);
    }

    public static function dateRange(string $period): array
    {
        $now = self::nowUTC();
        return match($period) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'yesterday' => [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()],
            'week' => [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()],
            'month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear()],
            default => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
        };
    }
}
