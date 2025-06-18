-- Add new columns to users table
ALTER TABLE public.users
ADD COLUMN password TEXT NOT NULL,
ADD COLUMN name TEXT NOT NULL,
ADD COLUMN reset_token TEXT,
ADD COLUMN reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Update existing users with default values
UPDATE public.users
SET 
  password = 'changeme123', -- This is temporary, users will need to reset their password
  name = 'User ' || id::text
WHERE password IS NULL; 