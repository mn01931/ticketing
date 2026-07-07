/*
  # Ticketing System Database Schema

  1. New Tables
    - `tickets`
      - `id` (uuid, primary key) - Unique identifier for each ticket
      - `ticket_number` (text, unique) - Human-readable ticket number (e.g., "TICK-0001")
      - `email` (text) - Submitter's email address
      - `name` (text) - Submitter's name
      - `problem_category` (text) - Category of the problem (Hardware Problem, Software Problem, Internet Problem, Others)
      - `description_location` (text) - Detailed description and location of the issue
      - `status` (text) - Current status of the ticket (Open, In Progress, Resolved, Closed)
      - `assigned_to` (text) - Admin user assigned to handle the ticket
      - `remarks` (text) - Internal notes and remarks
      - `created_at` (timestamptz) - When the ticket was created
      - `updated_at` (timestamptz) - When the ticket was last updated

    - `admin_users`
      - `id` (uuid, primary key) - Links to auth.users
      - `email` (text, unique) - Admin email
      - `full_name` (text) - Admin's full name
      - `created_at` (timestamptz) - When the admin account was created

  2. Security
    - Enable RLS on all tables
    - Public can insert tickets (no auth required for submission)
    - Public can read their own ticket by ticket_number
    - Only authenticated admins can read all tickets and update them
*/

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  problem_category text NOT NULL,
  description_location text NOT NULL,
  status text DEFAULT 'Open' NOT NULL,
  assigned_to text DEFAULT '',
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Tickets policies: Anyone can insert (public form)
CREATE POLICY "Anyone can submit tickets"
  ON tickets FOR INSERT
  TO anon
  WITH CHECK (true);

-- Tickets policies: Anyone can read ticket by ticket_number (for confirmation)
CREATE POLICY "Anyone can read tickets"
  ON tickets FOR SELECT
  TO anon
  USING (true);

-- Tickets policies: Authenticated admins can read all tickets
CREATE POLICY "Admins can read all tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Tickets policies: Authenticated admins can update tickets
CREATE POLICY "Admins can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin users policies: Only admins can read admin_users
CREATE POLICY "Admins can read admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create function to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  new_ticket_num TEXT;
BEGIN
  -- Get the highest ticket number and increment
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(ticket_number FROM 6) AS INTEGER)), 0
  ) + 1 INTO next_num
  FROM tickets
  WHERE ticket_number LIKE 'TICK-%';
  
  -- Format as TICK-0001, TICK-0002, etc.
  new_ticket_num := 'TICK-' || LPAD(next_num::TEXT, 4, '0');
  
  NEW.ticket_number := new_ticket_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ticket numbers
DROP TRIGGER IF EXISTS set_ticket_number ON tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION generate_ticket_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();