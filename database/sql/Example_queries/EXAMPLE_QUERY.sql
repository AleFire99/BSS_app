SELECT 
    c.card_id AS card_id,
    c.name AS card_name,
    c.image AS card_image,
    c.cost AS card_cost,
    c.set_name AS card_set,
    c.reduction AS card_reduction,
    c.symbols AS card_symbols,
    c.type AS card_type,
    c.rarity AS card_rarity,
    e.id AS effect_id,
    e.condition AS effect_condition,
    e.details AS effect_details,
    l.id AS level_id,
    l.level AS level_level,
    l.battle_points AS level_battle_points,
    l.cores AS level_cores,
    st.subtype AS card_subtype
FROM 
    cards c
LEFT JOIN 
    effects e ON c.card_id = e.card_id
LEFT JOIN 
    levels l ON c.card_id = l.card_id
LEFT JOIN 
    subtypes st ON c.card_id = st.card_id
WHERE 
    c.card_id = 'ST07-013';
