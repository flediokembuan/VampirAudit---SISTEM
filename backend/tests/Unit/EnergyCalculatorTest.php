<?php

namespace Tests\Unit;

use App\Services\EnergyCalculator;
use Tests\TestCase;

class EnergyCalculatorTest extends TestCase
{
    private EnergyCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new EnergyCalculator();
    }

    public function test_calculate_wasted_energy_returns_correct_kwh(): void
    {
        // 500W standby, 1 unit, 160 hours/month => (500 * 1 * 160) / 1000 = 80 kWh
        $result = $this->calculator->calculateWastedEnergy(500.0, 1, 160.0);
        $this->assertEqualsWithDelta(80.0, $result, 0.001);
    }

    public function test_calculate_financial_loss_uses_tariff(): void
    {
        $result = $this->calculator->calculateFinancialLoss(10.0);
        $this->assertIsFloat($result);
        $this->assertGreaterThan(0, $result);
    }

    public function test_calculate_load_percentage_returns_correct_percent(): void
    {
        $result = $this->calculator->calculateLoadPercentage(1100.0, 2200.0);
        $this->assertEqualsWithDelta(50.0, $result, 0.01);
    }

    public function test_calculate_load_percentage_returns_zero_for_zero_limit(): void
    {
        $result = $this->calculator->calculateLoadPercentage(500.0, 0.0);
        $this->assertEquals(0.0, $result);
    }

    public function test_calculate_carbon_emission_returns_non_negative(): void
    {
        $result = $this->calculator->calculateCarbonEmission(100.0);
        $this->assertIsFloat($result);
        $this->assertGreaterThan(0, $result);
    }

    public function test_calculate_wasted_energy_zero_standby_watt(): void
    {
        $result = $this->calculator->calculateWastedEnergy(0.0, 10, 160.0);
        $this->assertEquals(0.0, $result);
    }
}
