BEGIN;
DO $$
DECLARE a uuid; b uuid; rejected boolean:=false;
BEGIN
 INSERT INTO accounts(login,password_hash) VALUES('compat_a','test-only') RETURNING id INTO a;
 INSERT INTO accounts(login,password_hash) VALUES('compat_b','test-only') RETURNING id INTO b;
 IF (SELECT character_limit FROM accounts WHERE id=a)<>5 THEN RAISE EXCEPTION 'Wrong starting limit'; END IF;
 INSERT INTO characters(account_id,name,race_id,slot) VALUES(a,'Shared','saiyan',0),(b,'shared','saiyan',0);
 BEGIN
 INSERT INTO characters(account_id,name,race_id,slot) VALUES(a,'SHARED','saiyan',1);
 EXCEPTION WHEN unique_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Duplicate account character name accepted'; END IF;
END $$;
ROLLBACK;
