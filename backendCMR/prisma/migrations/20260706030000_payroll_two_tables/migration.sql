-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('semanal', 'quincenal', 'mensual');

-- DropIndex
DROP INDEX "payroll_receipts_folio_key";
DROP INDEX "payroll_receipts_payment_date_idx";
DROP INDEX "payroll_receipts_status_idx";

-- AlterTable: reestructura payroll_receipts (tabla vacia en desarrollo)
ALTER TABLE "payroll_receipts" DROP COLUMN "bonuses",
DROP COLUMN "folio",
DROP COLUMN "generated_by_name",
DROP COLUMN "gross_salary",
DROP COLUMN "imss_deduction",
DROP COLUMN "isr_deduction",
DROP COLUMN "notes",
DROP COLUMN "payment_date",
DROP COLUMN "period_end",
DROP COLUMN "period_start",
DROP COLUMN "status",
ADD COLUMN     "absent_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "afore" VARCHAR(100),
ADD COLUMN     "aguinaldo_proportional" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "base_salary" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "clabe" CHAR(18),
ADD COLUMN     "extra_perceptions" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "imss_ces_vejez" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "imss_enf_mat" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "imss_inv_vida" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "imss_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "infonavit" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "isr_table" "PeriodType" NOT NULL,
ADD COLUMN     "isr_withholding" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payroll_id" UUID NOT NULL,
ADD COLUMN     "pdf_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "savings_fund" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sbc" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "vacation_bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vacation_proportional" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Recreate PayrollStatus con los nuevos valores (ya no lo referencia ninguna columna)
DROP TYPE "PayrollStatus";
CREATE TYPE "PayrollStatus" AS ENUM ('borrador', 'en_proceso', 'pagada', 'cancelada');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "afore" VARCHAR(100);

-- CreateTable
CREATE TABLE "payroll_config" (
    "id" UUID NOT NULL,
    "uma_daily" DECIMAL(10,2) NOT NULL,
    "imss_enf_mat_rate" DECIMAL(6,4) NOT NULL,
    "imss_inv_vida_rate" DECIMAL(6,4) NOT NULL,
    "imss_ces_vejez_rate" DECIMAL(6,4) NOT NULL,
    "infonavit_employer_rate" DECIMAL(6,4) NOT NULL,
    "aguinaldo_days" INTEGER NOT NULL,
    "vacation_days" INTEGER NOT NULL,
    "prima_vacacional_rate" DECIMAL(6,4) NOT NULL,
    "fondo_ahorro_rate" DECIMAL(6,4) NOT NULL,
    "integration_factor" DECIMAL(8,6) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payroll_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isr_brackets" (
    "id" UUID NOT NULL,
    "period" "PeriodType" NOT NULL,
    "lower_limit" DECIMAL(12,2) NOT NULL,
    "fixed_fee" DECIMAL(12,2) NOT NULL,
    "rate" DECIMAL(6,2) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "isr_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" UUID NOT NULL,
    "folio" VARCHAR(30) NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "payment_date" DATE NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'borrador',
    "apply_savings_fund" BOOLEAN NOT NULL DEFAULT false,
    "total_gross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_by_name" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "isr_brackets_period_sort_order_idx" ON "isr_brackets"("period", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_folio_key" ON "payrolls"("folio");

-- CreateIndex
CREATE INDEX "payrolls_status_idx" ON "payrolls"("status");

-- CreateIndex
CREATE INDEX "payrolls_payment_date_idx" ON "payrolls"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_receipts_payroll_id_employee_id_key" ON "payroll_receipts"("payroll_id", "employee_id");

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_receipts" ADD CONSTRAINT "payroll_receipts_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
