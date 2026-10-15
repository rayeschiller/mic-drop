from pathlib import Path
import concurrent.futures, json, os, shutil, subprocess, tempfile
BIN=Path(shutil.which('postgres') or '/Applications/Postgres.app/Contents/Versions/latest/bin/postgres').parent
root=Path(tempfile.mkdtemp(prefix='micdrop-auth-sql-',dir='/private/tmp'))
data=root/'data';sock=root/'socket';sock.mkdir(mode=0o700)
def run(args,**kw):
 try: return subprocess.run([str(a) for a in args],text=True,capture_output=True,check=True,**kw)
 except subprocess.CalledProcessError as error:
  print(error.stderr); raise
def sql(query):
 return run([BIN/'psql','-X','-h',sock,'-p','55439','-U','micdrop_test','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',query]).stdout.strip()
checks={};started=False
try:
 run([BIN/'initdb','-D',data,'-U','micdrop_test','--auth=trust','--no-locale','--encoding=UTF8'])
 run([BIN/'pg_ctl','-D',data,'-l',root/'postgres.log','-o',f"-h '' -k {sock} -p 55439",'-w','start']);started=True
 sql("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table public.mics(id uuid primary key, slug text, owner_user_id_placeholder text, host_pin_hash text, series_slug text); alter table public.mics enable row level security;")
 migration=Path('scripts/014_add_mic_accounts.sql').read_text()
 sql(migration);sql(migration)
 checks['migration_is_repeatable']=True
 u1='11111111-1111-4111-8111-111111111111';u2='22222222-2222-4222-8222-222222222222'
 sql(f"insert into auth.users values('{u1}'),('{u2}');")
 values=sql(f"select public.consume_mic_claim_attempt('{u1}') from generate_series(1,6);").splitlines()
 assert values==['t']*5+['f'],values
 checks['five_attempts_allowed_sixth_denied']=True
 assert sql(f"select public.consume_mic_claim_attempt('{u2}');")=='t'
 checks['limits_are_per_account']=True
 sql(f"update public.mic_claim_attempts set window_started_at=now()-interval '61 minutes' where user_id='{u1}';")
 assert sql(f"select public.consume_mic_claim_attempt('{u1}');")=='t'
 assert sql(f"select attempts from public.mic_claim_attempts where user_id='{u1}';")=='1'
 checks['expired_window_resets_counter']=True
 sql('truncate public.mic_claim_attempts;')
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
  results=list(pool.map(lambda _: sql(f"select public.consume_mic_claim_attempt('{u1}');"),range(10)))
 assert results.count('t')==5 and results.count('f')==5,results
 checks['concurrent_attempts_cannot_exceed_limit']=True
 flags=sql("select has_function_privilege('anon','public.consume_mic_claim_attempt(uuid)','EXECUTE'), has_function_privilege('authenticated','public.consume_mic_claim_attempt(uuid)','EXECUTE'), has_function_privilege('service_role','public.consume_mic_claim_attempt(uuid)','EXECUTE'), has_table_privilege('anon','public.mic_claim_attempts','SELECT'), has_table_privilege('authenticated','public.mic_claim_attempts','SELECT');")
 assert flags=='f|f|t|f|f',flags
 checks['claim_limiter_server_only']=True
 mic='33333333-3333-4333-8333-333333333333'
 sql(f"insert into public.mics(id,slug) values('{mic}','fixture');")
 def claim(user): return sql(f"update public.mics set owner_user_id='{user}' where id='{mic}' and owner_user_id is null returning owner_user_id;")
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(claim,[u1,u2]))
 assert sum('UPDATE 1' in result for result in results)==1,results
 assert sum('UPDATE 0' in result for result in results)==1,results
 checks['simultaneous_claims_have_exactly_one_winner']=True
 owner=sql(f"select owner_user_id from public.mics where id='{mic}';")
 other=u2 if owner==u1 else u1
 assert 'UPDATE 0' in claim(other)
 assert sql(f"select owner_user_id from public.mics where id='{mic}';")==owner
 checks['claimed_mic_cannot_be_taken_over']=True
 sql(f"delete from auth.users where id='{owner}';")
 assert sql(f"select owner_user_id is null from public.mics where id='{mic}';")=='t'
 checks['account_deletion_preserves_the_mic']=True
 assert sql("select relrowsecurity from pg_class where oid='public.mic_claim_attempts'::regclass;")=='t'
 checks['claim_attempt_table_has_rls']=True
 sql(Path('scripts/015_claim_recurring_series.sql').read_text())
 sql(Path('scripts/015_claim_recurring_series.sql').read_text())
 checks['series_migration_is_repeatable']=True
 # Restore fixture accounts deleted by the previous test.
 sql(f"insert into auth.users(id) values('{u1}'),('{u2}') on conflict do nothing;")
 ids=[f'44444444-4444-4444-8444-{i:012d}' for i in range(1,7)]
 pin_hash='a'*64;other_hash='b'*64
 for index,id in enumerate(ids):
  owner=f"'{u2}'" if index==4 else 'null'
  digest=other_hash if index==5 else pin_hash
  sql(f"insert into public.mics(id,slug,series_slug,host_pin_hash,owner_user_id) values('{id}','series-{index}','weekly','{digest}',{owner});")
 assert sql(f"select * from public.claim_mic_series('{ids[0]}','{u1}','{pin_hash}');")=='4|0|1'
 checks['one_date_enrolls_all_matching_recurring_dates']=True
 assert sql(f"select count(*) from public.mics where id in ('{ids[0]}','{ids[1]}','{ids[2]}','{ids[3]}') and owner_user_id='{u1}';")=='4'
 assert sql(f"select owner_user_id from public.mics where id='{ids[4]}';")==u2
 checks['series_enrollment_preserves_other_account_ownership']=True
 assert sql(f"select owner_user_id is null from public.mics where id='{ids[5]}';")=='t'
 checks['same_series_with_different_pin_is_not_claimed']=True
 assert sql(f"select * from public.claim_mic_series('{ids[0]}','{u1}','{pin_hash}');")=='0|4|1'
 checks['series_enrollment_is_idempotent']=True
 # Dates added after initial enrollment can be saved through the original date.
 extra='55555555-5555-4555-8555-555555555555'
 sql(f"insert into public.mics(id,slug,series_slug,host_pin_hash) values('{extra}','late-date','weekly','{pin_hash}');")
 assert sql(f"select * from public.claim_mic_series('{ids[0]}','{u1}','{pin_hash}');")=='1|4|1'
 checks['repeating_main_date_enrolls_new_series_dates']=True
 lone='66666666-6666-4666-8666-666666666666'
 sql(f"insert into public.mics(id,slug,host_pin_hash) values('{lone}','standalone','{pin_hash}');")
 assert sql(f"select * from public.claim_mic_series('{lone}','{u1}','{pin_hash}');")=='1|0|0'
 checks['standalone_mic_does_not_claim_other_series_with_same_pin']=True
 assert sql("select has_function_privilege('anon','public.claim_mic_series(uuid,uuid,text)','EXECUTE'),has_function_privilege('authenticated','public.claim_mic_series(uuid,uuid,text)','EXECUTE'),has_function_privilege('service_role','public.claim_mic_series(uuid,uuid,text)','EXECUTE');")=='f|f|t'
 checks['series_claim_function_is_server_only']=True
 # Concurrent requests from different dates must not split the series.
 race_ids=['77777777-7777-4777-8777-777777777771','77777777-7777-4777-8777-777777777772']
 race_hash='c'*64
 for index,id in enumerate(race_ids):
  sql(f"insert into public.mics(id,slug,series_slug,host_pin_hash) values('{id}','race-{index}','race','{race_hash}');")
 def series_claim(args):
  anchor,user=args
  try: return ('ok',sql(f"select * from public.claim_mic_series('{anchor}','{user}','{race_hash}');"))
  except subprocess.CalledProcessError: return ('conflict',None)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  outcomes=list(pool.map(series_claim,[(race_ids[0],u1),(race_ids[1],u2)]))
 assert sorted(item[0] for item in outcomes)==['conflict','ok'],outcomes
 assert sql("select count(distinct owner_user_id) from public.mics where series_slug='race';")=='1'
 checks['concurrent_series_claims_cannot_split_ownership']=True

 print(json.dumps({'status':'passed','checks':checks},indent=2))
 if os.environ.get('MICDROP_SQL_REPORT'):
  Path(os.environ['MICDROP_SQL_REPORT']).write_text(json.dumps({'status':'passed','checks':checks},indent=2)+'\n')
finally:
 if started: run([BIN/'pg_ctl','-D',data,'-m','fast','-w','stop'])
 shutil.rmtree(root)
