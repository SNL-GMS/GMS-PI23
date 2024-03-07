\connect gms;

-- Add pg cron extension
create extension pg_cron;

grant usage on schema cron to gms_admin;
grant usage on schema cron to gms_soh_ttl_application;
grant select on all tables in schema cron to gms_soh_ttl_application;
grant delete on cron.job_run_details to gms_soh_ttl_application;

set search_path to cron;

create table if not exists ttl_config(
	job_name text not null,
    ttl_days int not null,
    command text not null
);

alter table ttl_config add constraint unique_job_name unique(job_name);

create or replace function create_ttl_cron()
returns trigger
language plpgsql as
$$
    begin
        perform cron.schedule(new.job_name, '0 0 * * *', new.command);
        return new;
    end
$$;

create trigger new_ttl_config_trigger after insert on ttl_config for each row execute procedure create_ttl_cron();

create or replace function delete_ttl_cron() 
returns trigger 
language plpgsql as
$$
    declare
        job_id_query text;
        job_id bigint;
    begin
        job_id_query := 'select jobid from cron.job where jobname = $1';
        execute job_id_query using new.job_name into job_id;
        perform cron.unschedule(job_id);
        return old;
    end
$$;

create trigger delete_ttl_config_trigger after update on ttl_config for each row execute procedure delete_ttl_cron();

create or replace procedure create_day_partition(table_name text) 
language plpgsql as
$$
	declare 
		tomorrow_start timestamp;
		tomorrow_end timestamp;
		partition_name text;
		create_partition_query text;
	begin
		tomorrow_start := date_trunc('day', now() + '1 day'::interval);
		tomorrow_end := date_trunc('day', now() + '2 days'::interval);
		partition_name := table_name || to_char(tomorrow_start, '_YYYY_MM_DD');
		create_partition_query := 'create table if not exists gms_soh.' || partition_name || ' partition of gms_soh.' || table_name || ' for values from (''' || tomorrow_start::text || ''') to (''' || tomorrow_end::text || ''')';
		execute create_partition_query;

		execute 'grant select, insert, update on gms_soh.' || partition_name || ' to gms_soh_application';
		execute 'alter table gms_soh.' || partition_name || ' owner to gms_admin';
	end
$$;

create or replace procedure create_capability_rollup_day_partitions()
language plpgsql as
$$
	begin
		call cron.create_day_partition('capability_soh_rollup'::text);
		call cron.create_day_partition('capability_station_soh_uuids'::text);
		call cron.create_day_partition('capability_station_soh_status_map'::text);
	end;
$$;

create or replace procedure create_station_soh_day_partitions()
language plpgsql as
$$
	begin
		call cron.create_day_partition('station_soh'::text);
		call cron.create_day_partition('channel_soh'::text);
		call cron.create_day_partition('station_aggregate'::text);
		call cron.create_day_partition('station_soh_monitor_value_status'::text);
	end
$$;

create or replace procedure create_channel_smvs_day_partition() 
language plpgsql as 
$$
	begin
		call cron.create_day_partition('channel_soh_monitor_value_status'::text);
	end
$$;

create or replace procedure create_acei_analog_day_partitions() 
language plpgsql as 
$$
	begin
		call cron.create_day_partition('channel_env_issue_analog'::text);
	end
$$;

create or replace procedure create_acei_boolean_day_partitions() 
language plpgsql as
$$
	begin
		call cron.create_day_partition('channel_env_issue_boolean'::text);
	end
$$;

create or replace procedure create_system_message_partitions() 
language plpgsql as
$$
	begin
		call cron.create_day_partition('system_message'::text);
	end
$$;

create or replace procedure create_raw_station_data_frame_partitions() 
language plpgsql as
$$
	begin
		call cron.create_day_partition('raw_station_data_frame'::text);
		call cron.create_day_partition('raw_station_data_frame_channel_names'::text);
		call cron.create_day_partition('waveform_summary'::text);
	end
$$;

create or replace procedure delete_stale_partitions(parent_tables text[], ttl_days int)
language plpgsql as
$$
	declare 
		parent_table text;		
		max_date text;
		max_partition_name text;
		tables_to_delete_query text;
		tables_to_delete text[];
		drop_tables_query text;
	begin
		max_date := to_char(now() - (ttl_days || ' days')::interval, '_YYYY_MM_DD');
		foreach parent_table in array parent_tables loop
			max_partition_name := parent_table || max_date;
			tables_to_delete_query := 'select array_agg(distinct(''gms_soh.'' || child.relname)) from pg_inherits join pg_class parent on pg_inherits.inhparent = parent.oid join pg_class child on pg_inherits.inhrelid = child.oid where parent.relname = $1 and child.relname not like ''%default'' and child.relname < $2';
			execute tables_to_delete_query using parent_table, max_partition_name into tables_to_delete;
			if cardinality(tables_to_delete)> 0 then 
				raise notice 'Deleting % tables', cardinality(tables_to_delete);
				drop_tables_query := 'drop table ' || array_to_string(tables_to_delete, ', ');
				drop_tables_query := drop_tables_query || ' cascade';
				execute drop_tables_query;
			else
				raise notice 'No partitions outside of ttl time';
			end if;
		end loop;
	end
$$;

create or replace procedure delete_stale_acei_analog_partitions() 
language plpgsql as
$$
	declare
		ttl_days_query text;
		ttl_days int;
		parent_tables text[] := ARRAY['channel_env_issue_analog'];
	begin
		ttl_days_query := 'select ttl_days from cron.ttl_config where job_name = ''acei_analog_ttl''';
		execute ttl_days_query into ttl_days;
		raise notice 'Deleting ACEI Analogs partitions older than % days', ttl_days;
		call cron.delete_stale_partitions(parent_tables::text[], ttl_days);
	end
$$;

create or replace procedure delete_stale_acei_boolean_partitions() 
language plpgsql as
$$ 
	declare
		ttl_days_query text;
		ttl_days int;
		parent_tables text[] := ARRAY['channel_env_issue_boolean'];
	begin
		ttl_days_query := 'select ttl_days from cron.ttl_config where job_name = ''acei_boolean_ttl''';
		execute ttl_days_query into ttl_days;
		raise notice 'Deleting ACEI Boolean partitions older than % days', ttl_days;
		call cron.delete_stale_partitions(parent_tables, ttl_days);
	end
$$;

create or replace procedure delete_stale_capability_rollup_partitions()
language plpgsql as 
$$
	declare 
		ttl_days_query text;
		ttl_days int;
		parent_tables text[] := ARRAY['capability_station_soh_uuids', 'capability_station_soh_status_map', 'capability_soh_rollup'];
	begin
		ttl_days_query := 'select ttl_days from cron.ttl_config where job_name = ''capability_soh_rollup_ttl''';
		execute ttl_days_query into ttl_days;
		raise notice 'Deleting Capability Soh Rollup partitions older than % days', ttl_days;
		call cron.delete_stale_partitions(parent_tables, ttl_days);		
	end 
$$;

create or replace procedure delete_stale_station_soh_partitions()
language plpgsql as 
$$
	declare 
		ttl_days_query text;
		ttl_days int;
		parent_tables text[] := ARRAY['station_soh_monitor_value_status', 'station_aggregate', 'channel_soh', 'station_soh'];
	begin
		ttl_days_query := 'select ttl_days from cron.ttl_config where job_name = ''station_soh_ttl''';
		execute ttl_days_query into ttl_days;
		raise notice 'Deleting Station Soh partitions older than % days', ttl_days;
		call cron.delete_stale_partitions(parent_tables, ttl_days);
	end
$$;

create or replace procedure delete_stale_channel_smvs_partitions()
language plpgsql as
$$
	declare 
		ttl_days_query text;
		ttl_days int;
		parent_tables text[] = ARRAY['channel_soh_monitor_value_status'];
	begin
		ttl_days_query := 'select ttl_days from cron.ttl_config where job_name = ''channel_smvs_ttl''';
		execute ttl_days_query into ttl_days;
		raise notice 'Deleting Channel SMVS partitions older than % days', ttl_days;
		call cron.delete_stale_partitions(parent_tables, ttl_days);
	end

$$;

create or replace procedure delete_stale_system_message_partitions() 
language plpgsql as
$$
	declare
		ttl_days_query text;
		ttl_days int;
		parent_tables text[] := ARRAY['system_message'];
	begin  
		ttl_days_query := 'select ttl_days from cron.ttl_config where job_name = ''system_message_ttl''';
		execute ttl_days_query into ttl_days;
		raise notice 'Deleting System Message partitions older than % days', ttl_days;
		call cron.delete_stale_partitions(parent_tables, ttl_days);
	end
$$;

create or replace procedure delete_stale_raw_station_data_frame_partitions() 
language plpgsql as 
$$
	declare
		ttl_days_query text;
		ttl_days int;
		parent_tables text[] := ARRAY['waveform_summary', 'raw_station_data_frame_channel_names', 'raw_station_data_frame'];	
	begin
		ttl_days_query := 'select ttl_days from cron.ttl_config where job_name = ''rsdf_ttl''';
		execute ttl_days_query into ttl_days;
		raise notice 'Deleting RSDF partitions older than % days', ttl_days;
		call cron.delete_stale_partitions(parent_tables, ttl_days);
	end
$$;

create or replace function delete_stale_records(deletion_query text, ttl_time timestamp, max_records integer)
returns bigint
language plpgsql AS
$$
	declare
		max_records_query text;
		max_records int;
		chunk_deleted int;
		total_deleted bigint := 0;
	begin
		loop
			execute deletion_query using ttl_time, max_records into chunk_deleted;
			total_deleted := total_deleted + chunk_deleted;
			exit when chunk_deleted = 0;
		end loop;

		return total_deleted;
	end
$$;

create or replace procedure delete_late_arriving_data(parent_table text)
language plpgsql as 
$$
	declare 
		delete_query text;
	begin
		delete_query := 'delete from gms_soh.' || parent_table || '_default';
		execute delete_query;
	end	
$$;

create or replace procedure delete_late_acei_analogs()
language plpgsql as 
$$
	begin
		call cron.delete_late_arriving_data('channel_env_issue_analog');
	end
$$;

create or replace procedure delete_late_acei_booleans() 
language plpgsql as 
$$
	begin
		call cron.delete_late_arriving_data('channel_env_issue_boolean');
	end
$$;

create or replace procedure delete_late_capability_soh_rollups()
language plpgsql as 
$$
	begin
		call cron.delete_late_arriving_data('capability_soh_rollup');
	end
$$;

create or replace procedure delete_late_station_sohs()
language plpgsql as 
$$
	begin
		call cron.delete_late_arriving_data('station_soh');
	end
$$;

create or replace procedure delete_late_channnel_smvs()
language plpgsql as 
$$
	begin
		call cron.delete_late_arriving_data('channel_soh_monitor_value_status');
	end
$$;

create or replace procedure delete_late_system_messages() 
language plpgsql as 
$$
	begin
		call cron.delete_late_arriving_data('system_message');
	end
$$;

create or replace procedure delete_late_raw_station_data_frames() 
language plpgsql as 
$$
	begin
		call cron.delete_late_arriving_data('raw_station_data_frame');
	end
$$;

create or replace procedure delete_stale_job_run_details() 
language plpgsql as 
$$
    declare 
        ttl_days integer;        
        max_records integer := 1000;
        delete_query text;
        ttl_time timestamp;
        total_deleted bigint;
        deletion_start_time timestamptz;
        deletion_end_time timestamptz;
        deletion_elapsed_time double precision;
    begin
        execute 'select ttl_days from cron.ttl_config where job_name = ''job_detail_history_ttl''' into ttl_days;
        ttl_time = now() - (ttl_days || ' days')::interval ;

        raise notice 'Deleting Job Run Details with end time before %', ttl_time;

        delete_query := 'with deleted as (with to_delete as (select runid from cron.job_run_details where end_time < $1 limit $2) delete from cron.job_run_details where runid in (select * from to_delete) returning *) select count(*) from deleted';
        deletion_start_time := clock_timestamp();

        total_deleted := cron.delete_stale_records(delete_query, ttl_time, max_records);

        deletion_end_time := clock_timestamp();
		deletion_elapsed_time := 1000 * (extract(epoch from deletion_end_time) - extract(epoch from deletion_start_time));

        raise notice 'Deleting % Job Run Details took % ms', total_deleted, deletion_elapsed_time;
    end
$$;

alter table ttl_config owner to gms_admin;

grant select, insert, delete, update on ttl_config to gms_soh_ttl_application;

grant execute on all functions in schema cron to gms_soh_ttl_application;
grant execute on all procedures in schema cron to gms_soh_ttl_application;

select cron.schedule('late_arriving_acei_analog_ttl', '5 * * * *', $$call cron.delete_late_acei_analogs()$$);
select cron.schedule('late_arriving_acei_boolean_ttl', '5 * * * *', $$call cron.delete_late_acei_booleans()$$);
select cron.schedule('late_arriving_capability_rollup_ttl', '5 * * * *', $$call cron.delete_late_capability_soh_rollups()$$);
select cron.schedule('late_arriving_station_ttl', '5 * * * *', $$call cron.delete_late_station_sohs()$$);
select cron.schedule('late_arriving_channel_smvs_ttl', '5 * * * *', $$call cron.delete_late_channnel_smvs()$$);
select cron.schedule('late_arriving_system_message_ttl', '5 * * * *', $$call cron.delete_late_system_messages()$$);
select cron.schedule('late_arriving_rsdf_ttl', '5 * * * *', $$call cron.delete_late_raw_station_data_frames()$$);

select cron.schedule('create_acei_analog_partitions', '0 1 * * *', $$call cron.create_acei_analog_day_partitions()$$);
select cron.schedule('create_acei_boolean_partitions', '0 1 * * *', $$call cron.create_acei_boolean_day_partitions()$$);
select cron.schedule('create_capability_rollup_partitions', '0 1 * * *', $$call cron.create_capability_rollup_day_partitions()$$);
select cron.schedule('create_station_soh_partitions', '0 1 * * *', $$call cron.create_station_soh_day_partitions()$$);
select cron.schedule('create_channel_smvs_partitions', '0 1 * * *', $$call cron.create_channel_smvs_day_partition()$$);
select cron.schedule('create_system_message_partitions', '0 1 * * *', $$call cron.create_system_message_partitions()$$);
select cron.schedule('create_raw_station_data_frame_partitions', '0 1 * * *', $$call cron.create_raw_station_data_frame_partitions()$$);