
-- Enable RLS on patient table
ALTER TABLE patient ENABLE ROW LEVEL SECURITY;

-- Allow clinicians to insert new patients and assign themselves as the clinician
CREATE POLICY "Clinicians can add new patients"
ON patient
FOR INSERT
TO authenticated
WITH CHECK (
    assigned_clinician = auth.uid()
);

-- Allow clinicians to view their assigned patients
CREATE POLICY "Clinicians can view their patients"
ON patient
FOR SELECT
TO authenticated
USING (
    assigned_clinician = auth.uid()
);

-- Allow clinicians to update their patients' information
CREATE POLICY "Clinicians can update their patients"
ON patient
FOR UPDATE
TO authenticated
USING (
    assigned_clinician = auth.uid()
)
WITH CHECK (
    assigned_clinician = auth.uid()
);

-- Allow clinicians to delete their patients
CREATE POLICY "Clinicians can delete their patients"
ON patient
FOR DELETE
TO authenticated
USING (
    assigned_clinician = auth.uid()
);
