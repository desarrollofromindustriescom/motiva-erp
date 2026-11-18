package loans

// part of a payment to the loan that goes to one of its payments
type allocation struct {
	// position in the list of the payments that aren't paid in full
	position int
	amount   int64
	// regular, late or capital
	kind string
}

/**
 * Decides where a payment to the whole loan goes. `debts` are what the payments that aren't paid
 * in full still owe, in order of date, so the first one is the current payment:
 * - the current payment is paid first, as much as possible (late when its day has passed)
 * - what is left goes to the last payments, from the last one backwards, as capital: the ones
 *   that get paid in full are the ones that no longer have to be paid & the last one reached
 *   can stay partially paid
 * The amount can't be more than everything owed.
 */
func planLoanPayment(amount int64, debts []int64, currentOverdue bool) []allocation {
	plan := []allocation{}
	remaining := amount

	for position := 0; position < len(debts) && remaining > 0; {
		take := min(remaining, debts[position])

		if take > 0 {
			kind := "capital"

			if position == 0 {
				kind = "regular"

				if currentOverdue {
					kind = "late"
				}
			}

			plan = append(plan, allocation{position: position, amount: take, kind: kind})
			remaining -= take
		}

		// after the current payment the last one comes, then the one before it & so on
		if position == 0 {
			position = len(debts) - 1

			if position == 0 {
				break
			}

			continue
		}

		position--

		// never goes back to the current payment, it was already paid
		if position == 0 {
			break
		}
	}

	return plan
}
