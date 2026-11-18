package kpis

import (
	"testing"
	"time"
)

func TestFillWeeks(t *testing.T) {
	// Monday 2026-11-16: the last 4 weeks are 26 Oct, 2 Nov, 9 Nov & 16 Nov
	current := time.Date(2026, time.November, 16, 0, 0, 0, 0, time.UTC)
	stored := map[string]storedWeek{
		"2026-11-09": {loans: 3, amount: 125_050},
		"2026-11-16": {loans: 1, amount: 40_000},
		"2025-01-06": {loans: 9, amount: 1},
	}

	weeks := fillWeeks(stored, current, 4)

	if len(weeks) != 4 {
		t.Fatalf("got %d weeks", len(weeks))
	}

	expected := []struct {
		start  string
		loans  int
		amount float64
	}{
		{"2026-10-26", 0, 0},
		{"2026-11-02", 0, 0},
		{"2026-11-09", 3, 1250.5},
		{"2026-11-16", 1, 400},
	}

	for i, want := range expected {
		if weeks[i].WeekStart != want.start || weeks[i].Loans != want.loans || weeks[i].Amount != want.amount {
			t.Errorf("week %d: got %+v, want %+v", i, weeks[i], want)
		}
	}
}

func TestFillWeeksAcrossYears(t *testing.T) {
	current := time.Date(2027, time.January, 11, 0, 0, 0, 0, time.UTC)

	weeks := fillWeeks(map[string]storedWeek{"2026-12-28": {loans: 2, amount: 100}}, current, 3)

	if weeks[0].WeekStart != "2026-12-28" || weeks[0].Loans != 2 || weeks[2].WeekStart != "2027-01-11" {
		t.Errorf("got %+v %+v", weeks[0], weeks[2])
	}
}
