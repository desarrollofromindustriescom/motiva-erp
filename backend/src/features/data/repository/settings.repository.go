package repository

const (
	StgUnitPercentage string = "percentage"
	StgUnitMonetary   string = "monetary"
	StgUnitWeeks      string = "weeks"

	StgQryGetActiveSettings string = `--sql
		SELECT
			settings.slug,
			settings.value,
			settings.unit
		FROM settings
		INNER JOIN status ON settings.status_id = status.id
		WHERE
			status.slug = 'active'
		ORDER BY settings.slug ASC
	`

	StgQryLock string = `--sql
		SELECT pg_advisory_xact_lock(hashtext('settings'))
	`
	StgQryDeprecate string = `--sql
		UPDATE settings
		SET status_id = (SELECT id FROM status WHERE slug = 'deprecated')
		WHERE
			slug = ANY($1) AND
			status_id = (SELECT id FROM status WHERE slug = 'active')
	`
	StgQryInsert string = `--sql
		INSERT INTO settings (slug, value, unit)
		SELECT slug, value, unit::settings_unit
		FROM unnest($1::text[], $2::integer[], $3::text[]) AS item(slug, value, unit)
	`

	StgPrefixMonthly string = "monthly_loan"
	StgPrefixWeekly  string = "weekly_loan"
)
