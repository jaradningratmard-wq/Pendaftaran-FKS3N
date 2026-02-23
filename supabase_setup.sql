-- SQL Script for Supabase Setup
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create the participants table
CREATE TABLE IF NOT EXISTS participants (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nama_sekolah TEXT NOT NULL,
  nama_peserta TEXT NOT NULL,
  tempat_tanggal_lahir TEXT NOT NULL,
  cabang_lomba TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies for Public Access
-- Note: In a production environment, you should use more restrictive policies.
-- These policies allow the app to function with the current simple admin setup.

-- Allow anyone to read participants
CREATE POLICY "Allow public select" ON participants 
FOR SELECT USING (true);

-- Allow anyone to insert participants (for registration)
CREATE POLICY "Allow public insert" ON participants 
FOR INSERT WITH CHECK (true);

-- Allow anyone to update participants (for admin edit)
CREATE POLICY "Allow public update" ON participants 
FOR UPDATE USING (true);

-- Allow anyone to delete participants (for admin delete)
CREATE POLICY "Allow public delete" ON participants 
FOR DELETE USING (true);
