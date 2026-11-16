-- General program cash balance: the only row without user (user_id NULL),
-- amount is stored in cents
INSERT INTO
   cash_balances (amount, last_update)
SELECT
   0,
   CURRENT_TIMESTAMP
WHERE
   NOT EXISTS (
      SELECT
         1
      FROM
         cash_balances
      WHERE
         user_id IS NULL
   );
