set search_path to cron; 

insert into cron.ttl_config(job_name, ttl_days, command) 
    values ('system_message_ttl', SYSTEM_MESSAGES_TTL, $$CALL cron.delete_stale_system_message_partitions()$$)
    on conflict on constraint unique_job_name
    do update set ttl_days = excluded.ttl_days, command = excluded.command;
insert into cron.ttl_config(job_name, ttl_days, command) 
    values ('capability_soh_rollup_ttl', CAPABILITY_SOH_ROLLUP_TTL, $$CALL cron.delete_stale_capability_rollup_partitions()$$)
    on conflict on constraint unique_job_name 
    do update set ttl_days = excluded.ttl_days, command = excluded.command;
insert into cron.ttl_config(job_name, ttl_days, command) 
    values ('station_soh_ttl', SSOH_TTL, $$CALL cron.delete_stale_station_soh_partitions()$$)
    on conflict on constraint unique_job_name 
    do update set ttl_days = excluded.ttl_days, command = excluded.command;
insert into cron.ttl_config(job_name, ttl_days, command) 
    values ('channel_smvs_ttl', CSMVS_TTL, $$CALL cron.delete_stale_channel_smvs_partitions()$$)
    on conflict on constraint unique_job_name 
    do update set ttl_days = excluded.ttl_days, command = excluded.command;
insert into cron.ttl_config(job_name, ttl_days, command) 
    values ('acei_boolean_ttl', ACEI_TTL, $$CALL cron.delete_stale_acei_boolean_partitions()$$)
    on conflict on constraint unique_job_name 
    do update set ttl_days = excluded.ttl_days, command = excluded.command;
insert into cron.ttl_config(job_name, ttl_days, command) 
    values ('acei_analog_ttl', ACEI_TTL, $$CALL cron.delete_stale_acei_analog_partitions()$$)
    on conflict on constraint unique_job_name 
    do update set ttl_days = excluded.ttl_days, command = excluded.command;
insert into cron.ttl_config(job_name, ttl_days, command)
    values ('rsdf_ttl', RSDF_TTL, $$CALL cron.delete_stale_raw_station_data_frame_partitions()$$)
    on conflict on constraint unique_job_name 
    do update set ttl_days = excluded.ttl_days, command = excluded.command;
insert into cron.ttl_config(job_name, ttl_days, command) 
    values ('job_detail_history_ttl', JOB_RUN_DETAIL_TTL, $$CALL cron.delete_stale_job_run_details()$$)
    on conflict on constraint unique_job_name 
    do update set ttl_days = excluded.ttl_days, command = excluded.command;
