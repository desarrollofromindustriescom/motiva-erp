-- Investment terms: reward_cycle is the term in months and weight is the
-- value used for future loan operations. Each term is inserted only once
INSERT INTO
   cash_balance_cycles (reward_cycle, weight)
SELECT
   cycles.reward_cycle,
   cycles.weight
FROM
   (
      VALUES
         (6, 1),
         (12, 2),
         (24, 3)
   ) AS cycles (reward_cycle, weight)
WHERE
   NOT EXISTS (
      SELECT
         1
      FROM
         cash_balance_cycles
      WHERE
         cash_balance_cycles.reward_cycle = cycles.reward_cycle
   );
