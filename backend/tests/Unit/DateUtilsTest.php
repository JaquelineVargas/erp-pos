<?php

namespace Tests\Unit;

use App\Services\DateUtils;
use Carbon\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DateUtilsTest extends TestCase
{
    #[Test]
    public function now_returns_utc(): void
    {
        $now = DateUtils::nowUTC();
        $this->assertEquals('UTC', $now->tzName);
    }

    #[Test]
    public function format_locale_converts_timezone(): void
    {
        $utc = Carbon::parse('2026-05-28 12:00:00', 'UTC');
        $formatted = DateUtils::formatLocale($utc, 'Y-m-d H:i', 'America/Mexico_City');
        $this->assertEquals('2026-05-28 06:00', $formatted);
    }

    #[Test]
    public function date_range_today(): void
    {
        [$start, $end] = DateUtils::dateRange('today');
        $this->assertTrue($start->isSameDay($end));
    }
}
