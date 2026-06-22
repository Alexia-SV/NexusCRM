-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'lider', 'operativo', 'contador');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F', 'otro');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('soltero', 'casado', 'union_libre', 'divorciado', 'viudo', 'otro');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('base', 'temporal', 'honorarios');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_access_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "paternal_last_name" VARCHAR(80) NOT NULL,
    "maternal_last_name" VARCHAR(80),
    "curp" CHAR(18) NOT NULL,
    "rfc" VARCHAR(13),
    "nss" VARCHAR(11),
    "birth_date" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "marital_status" "MaritalStatus" NOT NULL,
    "phone" VARCHAR(20),
    "personal_email" VARCHAR(254),
    "institutional_email" VARCHAR(254),
    "address" TEXT,
    "position" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "hire_date" DATE NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "daily_salary" DECIMAL(12,2) NOT NULL,
    "integrated_imss_salary" DECIMAL(12,2),
    "bank_name" VARCHAR(100),
    "clabe" CHAR(18),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "employees_curp_format_check" CHECK ("curp" ~ '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$'),
    CONSTRAINT "employees_rfc_format_check" CHECK ("rfc" IS NULL OR "rfc" ~ '^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
    CONSTRAINT "employees_nss_format_check" CHECK ("nss" IS NULL OR "nss" ~ '^[0-9]{11}$'),
    CONSTRAINT "employees_clabe_format_check" CHECK ("clabe" IS NULL OR "clabe" ~ '^[0-9]{18}$'),
    CONSTRAINT "employees_daily_salary_check" CHECK ("daily_salary" > 0),
    CONSTRAINT "employees_integrated_imss_salary_check" CHECK ("integrated_imss_salary" IS NULL OR "integrated_imss_salary" >= 0)
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "employees_curp_key" ON "employees"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "employees_rfc_key" ON "employees"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "employees_nss_key" ON "employees"("nss");

-- CreateIndex
CREATE UNIQUE INDEX "employees_personal_email_key" ON "employees"("personal_email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_institutional_email_key" ON "employees"("institutional_email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_clabe_key" ON "employees"("clabe");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_active_idx" ON "employees"("active");

-- CreateIndex
CREATE INDEX "employees_department_idx" ON "employees"("department");

-- CreateIndex
CREATE INDEX "employees_position_idx" ON "employees"("position");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_used_at_idx" ON "password_reset_tokens"("user_id", "used_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
