package session

const (
	saveSessionQuery string = `--sql
		INSERT INTO Sessions (
			token,
			token_exp,
			device_agent,
			last_login,
			user_id,
			status_id
		) VALUES (
			$1, $2, $3, $4, $5, $6
		);
	`
	getActiveSessionQuery string = `--sql
		SELECT
			ss.id,
			ss.token_exp,
			ss.last_login,
			ss.created_at
		FROM Sessions AS ss
		INNER JOIN Status AS st
		ON ss.status_id = st.id
		WHERE
			ss.token = $1 AND
			ss.device_agent = $2 AND
			st.slug = 'active'
	`
	expireSessionQuery string = `--sql
		UPDATE Sessions
		SET status_id = (SELECT id FROM Status WHERE slug = 'expired')
		WHERE id = $1
	`
	updateSessionQuery string = `--sql
		UPDATE Sessions
		SET
			token_exp = $1,
			last_login = $2
		WHERE id = $1
	`
)