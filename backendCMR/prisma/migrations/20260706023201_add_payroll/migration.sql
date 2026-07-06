-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('borrador', 'emitido', 'pagado', 'cancelado');

-- CreateTable
CREATE TABLE "payroll_receipts" (
    "id" UUID NOT NULL,
    "folio" VARCHAR(30) NOT NULL,
    "employee_id" UUID NOT NULL,
    "employee_name" VARCHAR(200) NOT NULL,
    "curp" CHAR(18) NOT NULL,
    "rfc" VARCHAR(13),
    "nss" VARCHAR(11),
    "position" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "payment_date" DATE NOT NULL,
    "worked_days" INTEGER NOT NULL,
    "daily_salary" DECIMAL(12,2) NOT NULL,
    "gross_salary" DECIMAL(12,2) NOT NULL,
    "bonuses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_perceptions" DECIMAL(12,2) NOT NULL,
    "imss_deduction" DECIMAL(12,2) NOT NULL,
    "isr_deduction" DECIMAL(12,2) NOT NULL,
    "other_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'borrador',
    "notes" TEXT,
    "generated_by_name" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payroll_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_receipts_folio_key" ON "payroll_receipts"("folio");

-- CreateIndex
CREATE INDEX "payroll_receipts_employee_id_idx" ON "payroll_receipts"("employee_id");

-- CreateIndex
CREATE INDEX "payroll_receipts_status_idx" ON "payroll_receipts"("status");

-- CreateIndex
CREATE INDEX "payroll_receipts_payment_date_idx" ON "payroll_receipts"("payment_date");

-- AddForeignKey
ALTER TABLE "payroll_receipts" ADD CONSTRAINT "payroll_receipts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
