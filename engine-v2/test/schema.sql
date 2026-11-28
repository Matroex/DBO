BEGIN;
DO $$
DECLARE a uuid; c uuid; rejected boolean;
BEGIN
 INSERT INTO accounts(login,password_hash) VALUES ('schema_test','test-only') RETURNING id INTO a;
 INSERT INTO characters(account_id,name,race_id,slot) VALUES(a,'schema_test','saiyan',0) RETURNING id INTO c;
 INSERT INTO wallets(character_id,currency_id,balance) VALUES(c,'gold',100);
 rejected := false;
 BEGIN
 UPDATE wallets SET balance=-1 WHERE character_id=c;
 EXCEPTION WHEN check_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Negative balance accepted'; END IF;
 rejected:=false;
 BEGIN
 INSERT INTO characters(account_id,name,race_id,slot) VALUES(a,'other','saiyan',0);
 EXCEPTION WHEN unique_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Duplicate slot accepted'; END IF;
 INSERT INTO training_jobs(character_id,kind,starts_at,ends_at,status) VALUES(c,'strength',now(),now(),'active');
 rejected:=false;
 BEGIN
 INSERT INTO training_jobs(character_id,kind,starts_at,ends_at,status) VALUES(c,'spirit',now(),now(),'active');
 EXCEPTION WHEN unique_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Concurrent training accepted'; END IF;
END $$;
ROLLBACK;
