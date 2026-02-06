-- First, enable RLS on the clinician table
ALTER TABLE clinician ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own data
CREATE POLICY "Enable read access for users to their own data" 
ON clinician 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Create policy to allow users to update their own data
CREATE POLICY "Enable update access for users to their own data" 
ON clinician 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);
