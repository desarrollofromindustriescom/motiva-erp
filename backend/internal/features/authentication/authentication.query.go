package authentication

const getUserDataByUsername string = `--sql
	SELECT
		u.id,
		u.fullname,
		u.username,
		u.password,
		u.profile,
		u.phone_number,
		u.curp,
		u.address,
		u.guarantee_fullname,
		u.guarantee_phone_number,
		u.guarantee_address,
		u.account_clabe,
		u.account_bank,
		u.created_at,
		s.id,
		s.slug,
		s.title
	FROM Users as u
	INNER JOIN Status as s
	ON u.status_id = s.id
	WHERE u.username = $1 AND s.slug = 'active'
`