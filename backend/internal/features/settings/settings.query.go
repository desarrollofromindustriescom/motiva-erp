package settings

const (
	getActiveSettingsQuery string = `--sql
		SELECT
			si.id,
			si.slug,
			si.value,
			si.unit,
			st.id,
			st.slug,
			st.title
		FROM Settings AS si
		INNER JOIN Status AS st
		ON si.status_id = st.id
		WHERE
			st.slug = 'active'
	`
	disableExtraValuesQuery string = `--sql
		UPDATE Settings
		SET status_id = (SELECT id FROM Status WHERE slug = 'deprecated')
		WHERE
			slug = 'mora' OR
			slug = 'visit'
	`
	disableAgreementValuesQuery string = `--sql
		UPDATE Settings
		SET status_id = (SELECT id FROM Status WHERE slug = 'deprecated')
		WHERE slug LIKE 'agreement_%'
	`
	disableMonthlyValuesQuery string = `--sql
		UPDATE Settings
		SET status_id = (SELECT id FROM Status WHERE slug = 'deprecated')
		WHERE slug LIKE 'monthly_loan_%'
	`
	disableWeeklyValuesQuery string = `--sql
		UPDATE Settings
		SET status_id = (SELECT id FROM Status WHERE slug = 'deprecated')
		WHERE slug LIKE 'weekly_loan_%'
	`
)
