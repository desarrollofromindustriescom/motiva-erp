package loans

import "testing"

func debts(count int, each int64) []int64 {
	result := make([]int64, count)

	for i := range result {
		result[i] = each
	}

	return result
}

// 5 payments of 250 & a payment of 800: the current one is paid on time, the last two as
// capital & the third stays with 50
func TestPlanLoanPaymentExample(t *testing.T) {
	plan := planLoanPayment(80_000, debts(5, 25_000), false)

	expected := []allocation{
		{0, 25_000, "regular"},
		{4, 25_000, "capital"},
		{3, 25_000, "capital"},
		{2, 5_000, "capital"},
	}

	if len(plan) != len(expected) {
		t.Fatalf("got %+v", plan)
	}

	for i, want := range expected {
		if plan[i] != want {
			t.Errorf("allocation %d: got %+v, want %+v", i, plan[i], want)
		}
	}
}

func TestPlanLoanPaymentLateCurrent(t *testing.T) {
	plan := planLoanPayment(10_000, debts(5, 25_000), true)

	if len(plan) != 1 || plan[0].kind != "late" || plan[0].amount != 10_000 {
		t.Errorf("got %+v", plan)
	}
}

func TestPlanLoanPaymentEverything(t *testing.T) {
	plan := planLoanPayment(125_000, debts(5, 25_000), false)

	var total int64

	positions := map[int]bool{}

	for _, item := range plan {
		total += item.amount
		positions[item.position] = true
	}

	if total != 125_000 || len(positions) != 5 {
		t.Errorf("got %+v", plan)
	}
}

func TestPlanLoanPaymentSinglePayment(t *testing.T) {
	plan := planLoanPayment(9_000, []int64{9_000}, false)

	if len(plan) != 1 || plan[0].position != 0 || plan[0].kind != "regular" {
		t.Errorf("got %+v", plan)
	}
}

func TestPlanLoanPaymentTwoPayments(t *testing.T) {
	// the current one is paid in full & the rest goes to the last one as capital
	plan := planLoanPayment(30_000, []int64{20_000, 20_000}, false)

	if len(plan) != 2 || plan[0].amount != 20_000 || plan[1].position != 1 || plan[1].amount != 10_000 || plan[1].kind != "capital" {
		t.Errorf("got %+v", plan)
	}
}

func TestPlanLoanPaymentWithPartialDebts(t *testing.T) {
	// debts that aren't equal: the amounts follow what each payment owes
	plan := planLoanPayment(70_000, []int64{10_000, 25_000, 15_000, 30_000}, false)

	expected := []allocation{{0, 10_000, "regular"}, {3, 30_000, "capital"}, {2, 15_000, "capital"}, {1, 15_000, "capital"}}

	if len(plan) != len(expected) {
		t.Fatalf("got %+v", plan)
	}

	for i, want := range expected {
		if plan[i] != want {
			t.Errorf("allocation %d: got %+v, want %+v", i, plan[i], want)
		}
	}
}
