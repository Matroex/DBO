DO $$
DECLARE old_id uuid; new_id uuid;
BEGIN
 SELECT id INTO STRICT old_id FROM content_revisions WHERE status='published';
 INSERT INTO content_revisions(schema_version,parent_revision_id) SELECT schema_version,id FROM content_revisions WHERE id=old_id RETURNING id INTO new_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) SELECT new_id,kind,definition_id,data FROM content_definitions WHERE revision_id=old_id;
 INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES(new_id,'combat_rules','sign_bonuses','{"znak-sily":[{"key":"allStats","base":5,"mode":"flat","threshold":0},{"key":"attackRange","base":1,"mode":"flat","threshold":5},{"key":"critChance","base":1,"mode":"percent","threshold":8}],"znak-walki":[{"key":"expBonusPct","base":5,"mode":"percent","threshold":0},{"key":"dropChancePct","base":1,"mode":"percent","threshold":5},{"key":"battleGoldBonusPct","base":1,"mode":"percent","threshold":8}],"znak-bossa":[{"key":"bossDamageReductionPct","base":1,"mode":"percent","threshold":0},{"key":"bossDamageBonusPct","base":1,"mode":"percent","threshold":5},{"key":"doubleBossRewardsChance","base":1,"mode":"percent","threshold":8}],"znak-wojownika":[{"key":"techniqueDamageBonusPct","base":1,"mode":"percent","threshold":0},{"key":"pvpAttack","base":1,"mode":"flat","threshold":5},{"key":"defense","base":5,"mode":"flat","threshold":8}],"znak-mistrza":[{"key":"trainingBaseBonusPercent","base":1,"mode":"percent","threshold":0},{"key":"upgradeChancePct","base":1,"mode":"percent","threshold":5},{"key":"spiritualPointChancePct","base":1,"mode":"percent","threshold":8}]}');
 UPDATE content_revisions SET status='archived' WHERE id=old_id;
 UPDATE content_revisions SET status='published' WHERE id=new_id;
END $$;
