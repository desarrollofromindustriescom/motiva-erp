package loans

import (
	"testing"

	"github.com/google/uuid"
)

var (
	generalBalance = uuid.New()
	investorA      = uuid.New()
	balanceA       = uuid.New()
)

func general(lent int64) lender {
	return lender{balanceID: generalBalance, lent: lent}
}

func investment(lent int64, weight int64) lender {
	id := uuid.New()

	return lender{balanceID: balanceA, investmentID: &id, userID: &investorA, lent: lent, percentage: 80_000, weight: weight}
}

func sumInvestments(split paymentSplit) int64 {
	var total int64

	for _, item := range split.investments {
		total += item.amount
	}

	return total
}

// loan of 2000 to 2 months with 20%: 2400 to pay, 1200 each payment (cents)
const (
	loanAmount int64 = 200_000
	loanTotal  int64 = 240_000
	payment    int64 = 120_000
)

func TestSplitOnlyGeneral(t *testing.T) {
	result := splitPayment(payment, loanAmount, loanTotal, []lender{general(200_000)})

	if result.general != 120_000 || result.commission != 0 || len(result.investments) != 0 {
		t.Errorf("got %+v", result)
	}
}

func TestSplitGeneralAndInvestor(t *testing.T) {
	// half from the general: 600 stay, the investor's 600 are 500 of capital (all of it) & 100 of gain
	// (80% for the investor, 20 are commission)
	result := splitPayment(payment, loanAmount, loanTotal, []lender{general(100_000), investment(100_000, 2)})

	if result.general != 60_000 || result.commission != 2_000 || sumInvestments(result) != 58_000 {
		t.Errorf("got %+v", result)
	}
}

func TestSplitOnlyInvestor(t *testing.T) {
	result := splitPayment(payment, loanAmount, loanTotal, []lender{investment(200_000, 2)})

	// 1000 of capital & 200 of gain: the investor gets 160 of it
	if result.general != 0 || result.commission != 4_000 || sumInvestments(result) != 116_000 {
		t.Errorf("got %+v", result)
	}
}

func TestSplitInvestmentsWithDifferentTerms(t *testing.T) {
	long, short := investment(50_000, 2), investment(50_000, 1)
	result := splitPayment(payment, loanAmount, loanTotal, []lender{general(100_000), long, short})

	if result.general != 60_000 || result.commission != 2_000 || sumInvestments(result) != 58_000 {
		t.Fatalf("got %+v", result)
	}

	// 580: 500 are capital (half & half) & 80 are gain (2 units for the long term, 1 for the short one)
	first, second := result.investments[0], result.investments[1]

	if first.reward != 5_333 || second.reward != 2_667 {
		t.Errorf("rewards %d %d", first.reward, second.reward)
	}

	if first.amount != 25_000+5_333 || second.amount != 25_000+2_667 {
		t.Errorf("amounts %d %d", first.amount, second.amount)
	}
}

// loan of 1000 to 2 payments with 20% (1200): the payment of 600 is 300 for the general cash balance &
// 300 for the investor, which are 250 of capital & 50 of gain: it gets 80% of the gain (40) & 10 are commission
func TestSplitCapitalFirstThenGain(t *testing.T) {
	result := splitPayment(60_000, 100_000, 120_000, []lender{general(50_000), investment(50_000, 1)})

	if result.general != 30_000 || result.commission != 1_000 || len(result.investments) != 1 {
		t.Fatalf("got %+v", result)
	}

	if item := result.investments[0]; item.amount != 29_000 || item.reward != 4_000 {
		t.Errorf("investment %+v", item)
	}
}

func TestSplitNeverLosesCents(t *testing.T) {
	// odd amounts: every cent of the payment goes to some place
	for _, value := range []int64{1, 7, 333, 10_001, 65_432} {
		result := splitPayment(value, loanAmount, loanTotal, []lender{general(70_000), investment(70_000, 1), investment(60_000, 3)})

		if got := result.general + result.commission + sumInvestments(result); got != value {
			t.Errorf("payment %d: %d distributed", value, got)
		}
	}
}

func TestDistributeKeepsTotal(t *testing.T) {
	got := distribute(100, []int64{1, 1, 1})

	if got[0]+got[1]+got[2] != 100 || got[0] != 34 {
		t.Errorf("got %v", got)
	}

	if got := distribute(100, []int64{0, 0}); got[0] != 0 || got[1] != 0 {
		t.Errorf("got %v", got)
	}
}

func TestCompactFolio(t *testing.T) {
	cases := map[string]string{
		"LN-00000000000000000000000000005": "LN-00005",
		"LN-00000000000000000000000000123": "LN-00123",
		"LN-00000000000000000000000123456": "LN-123456",
		"LN-0000000000000000000000000000":  "LN-00000",
		"SINGUION":                         "SINGUION",
	}

	for folio, want := range cases {
		if got := compactFolio(folio); got != want {
			t.Errorf("%s: got %s, want %s", folio, got, want)
		}
	}
}

// payment of 1200 with a visit of 100: the base amount is paid first, what is over it is the extra
func TestBaseAndExtra(t *testing.T) {
	cases := []struct {
		name                     string
		amount, original, before int64
		base, extra              int64
	}{
		{"first payment, all base", 70_000, 120_000, 0, 70_000, 0},
		{"second payment, completes the base & pays the extra", 60_000, 120_000, 70_000, 50_000, 10_000},
		{"payment of everything at once", 130_000, 120_000, 0, 120_000, 10_000},
		{"base already complete, all extra", 10_000, 120_000, 120_000, 0, 10_000},
		{"more was paid before than the base", 5_000, 120_000, 125_000, 0, 5_000},
		{"no extras", 120_000, 120_000, 0, 120_000, 0},
	}

	for _, item := range cases {
		base, extra := baseAndExtra(item.amount, item.original, item.before)

		if base != item.base || extra != item.extra {
			t.Errorf("%s: got %d %d, want %d %d", item.name, base, extra, item.base, item.extra)
		}

		if base+extra != item.amount {
			t.Errorf("%s: %d + %d doesn't add up to %d", item.name, base, extra, item.amount)
		}
	}
}

// debt of 10,000 in 40 weeks with 1.15%: 250 of the debt + 115 of interest in every payment
func TestAgreementQuote(t *testing.T) {
	payments, extra, total := agreementQuote(1_000_000, 40, 1_150)

	if extra != 11_500 || len(payments) != 40 || total != 1_460_000 {
		t.Fatalf("extra %d, payments %d, total %d", extra, len(payments), total)
	}

	var sum int64

	for _, value := range payments {
		if value != 36_500 {
			t.Errorf("payment %d", value)
		}

		sum += value
	}

	if sum != total {
		t.Errorf("payments add up to %d, total %d", sum, total)
	}
}

func TestAgreementQuoteKeepsCents(t *testing.T) {
	// a debt that doesn't divide between the weeks: the payments still add up to the total
	payments, extra, total := agreementQuote(1_000_007, 25, 1_500)

	var sum int64

	for _, value := range payments {
		sum += value
	}

	if sum != total || total != 1_000_007+25*extra {
		t.Errorf("payments add up to %d, total %d (extra %d)", sum, total, extra)
	}
}
