-- Run once against your DB if the column is not present yet.
-- PostgreSQL / SQLite:
ALTER TABLE orders ADD COLUMN remarks TEXT;
