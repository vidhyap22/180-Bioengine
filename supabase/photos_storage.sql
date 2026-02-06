-- Run in Supabase SQL Editor
insert into storage.buckets (id, name, public) 
values ('patient-photos', 'patient-photos', true);

-- Create policy to allow authenticated uploads
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (bucket_id = 'patient-photos');

-- Create policy to allow public reads
create policy "Allow public reads"
on storage.objects for select
to public
using (bucket_id = 'patient-photos');