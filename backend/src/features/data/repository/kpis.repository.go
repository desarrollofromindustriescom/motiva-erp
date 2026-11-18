package repository

import "time"

const (
	// slugs of kpi_metrics
	KpLoansAmount   string = "loans_amount"
	KpPendingAmount string = "pending_amount"
	KpInvestors     string = "investors"
	KpBorrowers     string = "borrowers"

	// weeks the chart of the loans shows (the current one is the last)
	KpWeeks int = 12

	// every how much the kpis are calculated again even if nothing told it to, & how long it waits after
	// an event before doing it (several events together only make one calculation)
	KpRefreshInterval time.Duration = 5 * time.Minute
	KpDebounce        time.Duration = 3 * time.Second
	KpRefreshTimeout  time.Duration = 30 * time.Second

	KpQryLock string = `--sql
		SELECT pg_advisory_xact_lock(hashtext('kpis'))
	`

	// Every value from the tables of the app: the money lent is what the approved loans took (the ones that are
	// still being paid, the finished ones & the cancelled ones that went to an agreement); what is waiting to be
	// paid is what the payments of the active loans & agreements still owe (with their mora & visits).
	KpQryCalculate string = `--sql
		WITH owners AS (
			SELECT loans.id
			FROM loans
			INNER JOIN status ON loans.status_id = status.id
			WHERE status.slug = 'active'

			UNION ALL

			SELECT agreements.id
			FROM agreements
			INNER JOIN status ON agreements.status_id = status.id
			WHERE status.slug = 'active'
		)
		SELECT
			(
				SELECT COALESCE(SUM(loans.amount), 0)
				FROM loans
				INNER JOIN status ON loans.status_id = status.id
				WHERE status.slug IN ('active', 'finished', 'cancelled')
			)::bigint,
			(
				SELECT COALESCE(SUM(owed.debt), 0)
				FROM (
					SELECT payments.amount - COALESCE((SELECT SUM(payment_details.amount) FROM payment_details WHERE payment_details.payment_id = payments.id), 0) AS debt
					FROM payments
					INNER JOIN owners ON COALESCE(payments.loan_id, payments.agreement_id) = owners.id
				) AS owed
				WHERE owed.debt > 0
			)::bigint,
			(
				SELECT COUNT(*)
				FROM users
				INNER JOIN status ON users.status_id = status.id
				WHERE users.profile = 'investor' AND status.slug = 'active'
			)::bigint,
			(
				SELECT COUNT(*)
				FROM users
				INNER JOIN status ON users.status_id = status.id
				WHERE users.profile = 'borrower' AND status.slug = 'active'
			)::bigint
	`

	// loans approved on every week (they start on Monday) with what they lent
	KpQryCalculateWeeks string = `--sql
		SELECT
			date_trunc('week', loans.resolution_date)::date,
			COUNT(*)::int,
			COALESCE(SUM(loans.amount), 0)::bigint
		FROM loans
		INNER JOIN status ON loans.status_id = status.id
		WHERE
			status.slug IN ('active', 'finished', 'cancelled') AND
			loans.resolution_date IS NOT NULL
		GROUP BY 1
		ORDER BY 1
	`

	KpQryStoreMetric string = `--sql
		INSERT INTO kpi_metrics (slug, value, updated_at)
		VALUES ($1, $2, CURRENT_TIMESTAMP)
		ON CONFLICT (slug) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
	`
	KpQryStoreWeeks string = `--sql
		INSERT INTO kpi_loan_weeks (week_start, loans, amount, updated_at)
		SELECT item.week_start, item.loans, item.amount, CURRENT_TIMESTAMP
		FROM unnest($1::date[], $2::integer[], $3::bigint[]) AS item(week_start, loans, amount)
		ON CONFLICT (week_start) DO UPDATE SET loans = EXCLUDED.loans, amount = EXCLUDED.amount, updated_at = EXCLUDED.updated_at
	`
	// the weeks that have no loans anymore (ex: a loan was removed) are removed too
	KpQryRemoveWeeks string = `--sql
		DELETE FROM kpi_loan_weeks WHERE week_start <> ALL($1::date[])
	`

	KpQryGetMetrics string = `--sql
		SELECT slug, value, updated_at FROM kpi_metrics
	`
	// Monday of the current week, with the time zone of the database like the weeks stored
	KpQryCurrentWeek string = `--sql
		SELECT date_trunc('week', now())::date
	`
	KpQryGetWeeks string = `--sql
		SELECT week_start, loans, amount
		FROM kpi_loan_weeks
		WHERE week_start >= $1
		ORDER BY week_start ASC
	`
)
