package loans

import (
	"testing"
	"time"
)

func day(year int, month time.Month, d int) time.Time {
	return time.Date(year, month, d, 0, 0, 0, 0, time.UTC)
}

func TestPaymentDateMonthly(t *testing.T) {
	// 31 of January: shorter months use their last day, the rest keep the 31
	from := time.Date(2026, time.January, 31, 15, 30, 0, 0, time.UTC)
	expected := []time.Time{day(2026, 2, 28), day(2026, 3, 31), day(2026, 4, 30)}

	for i, want := range expected {
		if got := paymentDate(from, "monthly", i+1); !got.Equal(want) {
			t.Errorf("payment %d: got %v, want %v", i+1, got, want)
		}
	}

	// the year changes & leap years
	if got := paymentDate(day(2027, 11, 30), "monthly", 3); !got.Equal(day(2028, 2, 29)) {
		t.Errorf("leap year: got %v", got)
	}
}

func TestPaymentDateWeekly(t *testing.T) {
	// 2026-11-17 is a Tuesday: every payment is a Tuesday, a week apart
	from := time.Date(2026, time.November, 17, 9, 0, 0, 0, time.UTC)

	for i := 1; i <= 13; i++ {
		got := paymentDate(from, "weekly", i)

		if got.Weekday() != time.Tuesday || !got.Equal(day(2026, 11, 17+7*i)) {
			t.Errorf("payment %d: got %v", i, got)
		}
	}
}

func TestEndDateIsAfterLastPaymentDay(t *testing.T) {
	from := time.Date(2026, time.November, 17, 9, 0, 0, 0, time.UTC)

	if got := endDate(from, "weekly", 2); !got.Equal(day(2026, 12, 2)) {
		t.Errorf("got %v", got)
	}
}

func TestQuoteSplit(t *testing.T) {
	// 3500 at 56%: total 5460, 8 payments of 682.50
	total, payment := quote(350000, 56000, 8)

	if total != 546000 || payment != 68250 {
		t.Errorf("got total %d payment %d", total, payment)
	}

	// what doesn't split evenly: the last payment takes the difference
	total, payment = quote(10000, 10000, 3)
	last := total - payment*2

	if total != 11000 || payment != 3667 || last != 3666 {
		t.Errorf("got total %d payment %d last %d", total, payment, last)
	}
}
