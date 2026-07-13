-- CreateEnum
CREATE TYPE "PayrollDisabilityType" AS ENUM ('enfermedad_general', 'riesgo_trabajo', 'maternidad');

-- AlterTable
ALTER TABLE "payroll_config" ADD COLUMN     "disability_general_rate" DECIMAL(6,4) NOT NULL DEFAULT 60,
ADD COLUMN     "disability_maternity_rate" DECIMAL(7,4) NOT NULL DEFAULT 100,
ADD COLUMN     "disability_risk_rate" DECIMAL(7,4) NOT NULL DEFAULT 100,
ADD COLUMN     "disability_waiting_days" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "excedente_uma_threshold" DECIMAL(6,4) NOT NULL DEFAULT 3,
ADD COLUMN     "imss_enf_mat_excedente_patron_rate" DECIMAL(6,4) NOT NULL DEFAULT 1.10,
ADD COLUMN     "imss_enf_mat_fixed_rate" DECIMAL(6,4) NOT NULL DEFAULT 20.40,
ADD COLUMN     "imss_gastos_med_patron_rate" DECIMAL(6,4) NOT NULL DEFAULT 1.05,
ADD COLUMN     "imss_guarderias_patron_rate" DECIMAL(6,4) NOT NULL DEFAULT 1.00,
ADD COLUMN     "imss_inv_vida_patron_rate" DECIMAL(6,4) NOT NULL DEFAULT 1.75,
ADD COLUMN     "imss_prest_dinero_patron_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.70,
ADD COLUMN     "imss_riesgo_trabajo_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.54,
ADD COLUMN     "infonavit_max_discount_rate" DECIMAL(6,4) NOT NULL DEFAULT 20,
ADD COLUMN     "retiro_patron_rate" DECIMAL(6,4) NOT NULL DEFAULT 2.00,
ADD COLUMN     "sbc_cap_uma" DECIMAL(6,4) NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE "payroll_receipts" ADD COLUMN     "disability_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disability_type" "PayrollDisabilityType",
ADD COLUMN     "imss_subsidy" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "patron_cesantia_vejez" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "patron_imss_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "patron_infonavit" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "patron_retiro" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "patron_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "rcv_afore_total" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN     "total_employer_cost" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "cesantia_vejez_patron_brackets" (
    "id" UUID NOT NULL,
    "lower_uma" DECIMAL(8,4) NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "cesantia_vejez_patron_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cesantia_vejez_patron_brackets_sort_order_idx" ON "cesantia_vejez_patron_brackets"("sort_order");

