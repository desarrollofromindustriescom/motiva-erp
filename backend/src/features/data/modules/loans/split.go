package loans

import (
	"sort"

	"github.com/google/uuid"
)

// investor percentages are stored multiplied by 1000 (80% -> 80000)
const percentageScale int64 = 100_000

/**
 * Money a loan took from one place: the general cash balance has no user & no investment,
 * an investor has one row for every investment it lent from.
 */
type lender struct {
	balanceID    uuid.UUID
	investmentID *uuid.UUID
	userID       *uuid.UUID
	lent         int64
	// part of its share of every payment the investor receives (stored x1000)
	percentage int64
	// weight of the term of the investment (longer terms weigh more)
	weight int64
}

// money that goes to an investment, reward is the part of it that is gain
type investmentDeposit struct {
	balanceID    uuid.UUID
	investmentID uuid.UUID
	amount       int64
	reward       int64
}

type paymentSplit struct {
	// share of the general cash balance & what the investors don't receive of theirs
	general     int64
	commission  int64
	investments []investmentDeposit
}

// half rounded up, for positive values
func roundDiv(value int64, divisor int64) int64 {
	return (2*value + divisor) / (2 * divisor)
}

/**
 * Splits `total` between the weights without losing cents: everyone gets the whole
 * part & the cents left go to the ones with the biggest remainder
 */
func distribute(total int64, weights []int64) []int64 {
	result := make([]int64, len(weights))

	var sum int64

	for _, weight := range weights {
		sum += weight
	}

	if sum <= 0 || total <= 0 {
		return result
	}

	remainders := make([]int64, len(weights))
	assigned := int64(0)

	for i, weight := range weights {
		result[i] = total * weight / sum
		remainders[i] = total * weight % sum
		assigned += result[i]
	}

	order := make([]int, len(weights))

	for i := range order {
		order[i] = i
	}

	sort.SliceStable(order, func(a, b int) bool { return remainders[order[a]] > remainders[order[b]] })

	for i := int64(0); i < total-assigned; i++ {
		result[order[i]]++
	}

	return result
}

/**
 * Divides one payment (cents) of a loan between the places that lent the money:
 * - every place gets a share proportional to what it lent
 * - the share of the general cash balance stays there
 * - an investor receives its percentage of its share & the rest is commission for the general
 *   cash balance (the interest of the loan was already calculated when it was created)
 * - what the investor receives is divided between its investments: the part that matches the
 *   capital of the loan (amount / total) in proportion to what each investment lent, and the
 *   rest (the gain) in proportion to what it lent multiplied by the weight of its term
 */
func splitPayment(payment int64, amount int64, total int64, lenders []lender) paymentSplit {
	result := paymentSplit{}

	// the groups keep the order they appear: the general first, then every investor
	var (
		groups  []*uuid.UUID
		members = map[string][]lender{}
		lent    []int64
	)

	key := func(user *uuid.UUID) string {
		if user == nil {
			return ""
		}

		return user.String()
	}

	for _, item := range lenders {
		k := key(item.userID)

		if _, exists := members[k]; !exists {
			groups = append(groups, item.userID)
			lent = append(lent, 0)
		}

		members[k] = append(members[k], item)
	}

	for i, user := range groups {
		for _, item := range members[key(user)] {
			lent[i] += item.lent
		}
	}

	shares := distribute(payment, lent)

	for i, user := range groups {
		if user == nil {
			result.general += shares[i]
			continue
		}

		items := members[key(user)]
		received := roundDiv(shares[i]*items[0].percentage, percentageScale)
		capital := roundDiv(received*amount, total)
		gain := received - capital

		result.commission += shares[i] - received

		lents := make([]int64, len(items))
		weighted := make([]int64, len(items))

		for j, item := range items {
			lents[j] = item.lent
			weighted[j] = item.lent * item.weight
		}

		capitals := distribute(capital, lents)
		gains := distribute(gain, weighted)

		for j, item := range items {
			result.investments = append(result.investments, investmentDeposit{
				balanceID:    item.balanceID,
				investmentID: *item.investmentID,
				amount:       capitals[j] + gains[j],
				reward:       gains[j],
			})
		}
	}

	return result
}

/**
 * What part of a payment made to a payment is its base amount & what part are extras (mora &
 * visits). The base amount is paid first, so only what is left over once it is complete is an extra:
 * `original` is what the payment costs without extras & `paidBefore` what had already been paid to it.
 */
func baseAndExtra(amount int64, original int64, paidBefore int64) (base int64, extra int64) {
	base = min(amount, max(original-paidBefore, 0))

	return base, amount - base
}
