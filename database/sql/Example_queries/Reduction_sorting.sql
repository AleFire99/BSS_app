-- SELECT
--     name,
--     card_id,
--     cost, 
--     (
--         LENGTH(reduction) - LENGTH(REPLACE(reduction, ',', ''))
--     ) + 1 AS reduction_count
-- FROM
--     cards
-- ORDER BY
--     reduction_count ASC;
SELECT
    name,
    card_id,
    cost,
    reduction
FROM
    cards
WHERE
    reduction IS '%-%'