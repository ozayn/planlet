-- Automatic is the default. Manual mode applies only after an explicit Settings choice.
UPDATE "User" SET "timezoneMode" = 'AUTOMATIC' WHERE "timezoneMode" = 'MANUAL';
