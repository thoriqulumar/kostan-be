-- Migration: Add Soft Delete to Users
-- Date: 2026-01-08
-- Description: Add deletedAt column to users table and update foreign key constraints to SET NULL on delete

-- ==========================================
-- STEP 1: Add deletedAt column to users table
-- ==========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP DEFAULT NULL;

-- ==========================================
-- STEP 2: Update Foreign Key Constraints
-- ==========================================

-- Payment Receipts - userId
DO $$ 
BEGIN
    -- Drop existing constraint if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_09447ed8b8a95a9b4d45f4d812c'
        AND table_name = 'payment_receipts'
    ) THEN
        ALTER TABLE payment_receipts DROP CONSTRAINT "FK_09447ed8b8a95a9b4d45f4d812c";
    END IF;
    
    -- Add new constraint with ON DELETE SET NULL
    ALTER TABLE payment_receipts
        ADD CONSTRAINT "FK_09447ed8b8a95a9b4d45f4d812c"
        FOREIGN KEY ("userId")
        REFERENCES users(id)
        ON DELETE SET NULL;
END $$;

-- Payment Receipts - confirmedByAdminId
DO $$ 
BEGIN
    -- Find the constraint name dynamically
    DECLARE
        constraint_name_var TEXT;
    BEGIN
        SELECT tc.constraint_name INTO constraint_name_var
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.constraint_schema = kcu.constraint_schema
        WHERE tc.table_name = 'payment_receipts' 
            AND kcu.column_name = 'confirmedByAdminId'
            AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1;
        
        IF constraint_name_var IS NOT NULL THEN
            EXECUTE format('ALTER TABLE payment_receipts DROP CONSTRAINT %I', constraint_name_var);
        END IF;
    END;
    
    -- Add new constraint
    ALTER TABLE payment_receipts
        ADD CONSTRAINT "FK_payment_receipts_confirmedByAdminId"
        FOREIGN KEY ("confirmedByAdminId")
        REFERENCES users(id)
        ON DELETE SET NULL;
END $$;

-- Notifications - userId
DO $$ 
BEGIN
    DECLARE
        constraint_name_var TEXT;
    BEGIN
        SELECT tc.constraint_name INTO constraint_name_var
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.constraint_schema = kcu.constraint_schema
        WHERE tc.table_name = 'notifications' 
            AND kcu.column_name = 'userId'
            AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1;
        
        IF constraint_name_var IS NOT NULL THEN
            EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', constraint_name_var);
        END IF;
    END;
    
    ALTER TABLE notifications
        ADD CONSTRAINT "FK_notifications_userId"
        FOREIGN KEY ("userId")
        REFERENCES users(id)
        ON DELETE SET NULL;
END $$;

-- Incomes - userId
DO $$ 
BEGIN
    DECLARE
        constraint_name_var TEXT;
    BEGINtc.constraint_name INTO constraint_name_var
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.constraint_schema = kcu.constraint_schema
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'incomes' 
            AND kcu.column_name = 'userId'
            AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1;
        
        IF constraint_name_var IS NOT NULL THEN
            EXECUTE format('ALTER TABLE incomes DROP CONSTRAINT %I', constraint_name_var);
        END IF;
    END;
    
    ALTER TABLE incomes
        ADD CONSTRAINT "FK_incomes_userId"
        FOREIGN KEY ("userId")
        REFERENCES users(id)
        ON DELETE SET NULL;
END $$;

-- Incomes - confirmedByAdminId
DO $$ 
BEGIN
    DECLARE
        constratc.constraint_name INTO constraint_name_var
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'incomes' 
            AND kcu.column_name = 'confirmedByAdminId'
            AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1;
        
        IF constraint_name_var IS NOT NULL THEN
            EXECUTE format('ALTER TABLE incomes DROP CONSTRAINT %I', constraint_name_var);
        END IF;
    END;
    
    ALTER TABLE incomes
        ADD CONSTRAINT "FK_incomes_confirmedByAdminId"
        FOREIGN KEY ("confirmedByAdminId")
        REFERENCES users(id)
        ON DELETE SET NULL;
END $$;

-- Expenses - recordedByAdminId
DO $$ 
BEGIN
    DECLARE
        constratc.constraint_name INTO constraint_name_var
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'expenses' 
            AND kcu.column_name = 'recordedByAdminId'
            AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1;
        
        IF constraint_name_var IS NOT NULL THEN
            EXECUTE format('ALTER TABLE expenses DROP CONSTRAINT %I', constraint_name_var);
        END IF;
    END;
    
    ALTER TABLE expenses
        ADD CONSTRAINT "FK_expenses_recordedByAdminId"
        FOREIGN KEY ("recordedByAdminId")
        REFERENCES users(id)
        ON DELETE SET NULL;
END $$;

-- ==========================================
-- Verification Queries
-- ==========================================
-- Run these after migration to verify:

-- Check if deletedAt column was added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'deletedAt';

-- Check foreign key constraints
-- SELECT 
--     tc.table_name, 
--     kcu.column_name,
--     tc.constraint_name,
--     rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu 
--     ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints rc
--     ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--     AND tc.table_name IN ('payment_receipts', 'notifications', 'incomes', 'expenses')
--     AND kcu.column_name IN ('userId', 'confirmedByAdminId', 'recordedByAdminId')
-- ORDER BY tc.table_name, kcu.column_name;
