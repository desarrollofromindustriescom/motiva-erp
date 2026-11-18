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
	// half from the general: 600 stay, the investor gets 80% of its 600 & 120 are commission
	result := splitPayment(payment, loanAmount, loanTotal, []lender{general(100_000), investment(100_000, 2)})

	if result.general != 60_000 || result.commission != 12_000 || sumInvestments(result) != 48_000 {
		t.Errorf("got %+v", result)
	}
}

func TestSplitOnlyInvestor(t *testing.T) {
	result := splitPayment(payment, loanAmount, loanTotal, []lender{investment(200_000, 2)})

	if result.general != 0 || result.commission != 24_000 || sumInvestments(result) != 96_000 {
		t.Errorf("got %+v", result)
	}
}

func TestSplitInvestmentsWithDifferentTerms(t *testing.T) {
	long, short := investment(50_000, 2), investment(50_000, 1)
	result := splitPayment(payment, loanAmount, loanTotal, []lender{general(100_000), long, short})

	if result.general != 60_000 || result.commission != 12_000 || sumInvestments(result) != 48_000 {
		t.Fatalf("got %+v", result)
	}

	// 480: 400 are capital (half & half) & 80 are gain (2 units for the long term, 1 for the short one)
	first, second := result.investments[0], result.investments[1]

	if first.reward != 5_333 || second.reward != 2_667 {
		t.Errorf("rewards %d %d", first.reward, second.reward)
	}

	if first.amount != 20_000+5_333 || second.amount != 20_000+2_667 {
		t.Errorf("amounts %d %d", first.amount, second.amount)
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
