// Integration tests run against a dedicated database (never the dev/prod one).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://aljafil:aljafil@localhost:5432/aljafil_test";
if (!/test/.test(process.env.DATABASE_URL)) throw new Error("TEST_DATABASE_URL must point to a *test* database");
