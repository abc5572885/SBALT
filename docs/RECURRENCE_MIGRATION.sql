-- Migration: Add recurrence support to events table
-- This migration adds RRULE support for recurring events

-- Add recurrence-related columns to events table
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS recurrence_count INTEGER,
  ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT FALSE;

-- Add check constraint for recurrence
ALTER TABLE events
  ADD CONSTRAINT check_recurrence_end 
  CHECK (
    (recurrence_rule IS NULL) OR 
    (recurrence_end_date IS NOT NULL) OR 
    (recurrence_count IS NOT NULL)
  );

-- Add index for parent_event_id to improve query performance
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);

-- Add index for recurrence queries
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON events(recurrence_rule) WHERE recurrence_rule IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN events.recurrence_rule IS 'iCal RRULE string defining recurrence pattern (RFC 5545)';
COMMENT ON COLUMN events.recurrence_end_date IS 'End date for recurring events';
COMMENT ON COLUMN events.recurrence_count IS 'Number of occurrences for recurring events';
COMMENT ON COLUMN events.parent_event_id IS 'Reference to parent event for recurring event instances';
COMMENT ON COLUMN events.is_recurring_instance IS 'True if this is an instance of a recurring event';

