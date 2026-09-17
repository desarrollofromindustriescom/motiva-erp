package session

const saveSession string = `--sql
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