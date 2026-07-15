-- CreateEnum
CREATE TYPE "ProviderPersonType" AS ENUM ('fisica', 'moral');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('evaluacion', 'activo', 'inactivo', 'bloqueado');

-- CreateEnum
CREATE TYPE "ProviderCategory" AS ENUM ('materiales', 'servicios', 'equipo', 'otro');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MXN', 'USD');

-- CreateEnum
CREATE TYPE "SupplyCategory" AS ENUM ('material', 'herramienta', 'consumible', 'equipo');

-- CreateEnum
CREATE TYPE "SupplyStatus" AS ENUM ('disponible', 'stock_bajo', 'agotado', 'inactivo');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('entrada', 'salida', 'ajuste');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planeacion', 'activo', 'pausado', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('alta', 'media', 'baja');

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL,
    "business_name" VARCHAR(180) NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "person_type" "ProviderPersonType" NOT NULL,
    "tax_regime" VARCHAR(160) NOT NULL,
    "curp" CHAR(18),
    "category" "ProviderCategory" NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'evaluacion',
    "contact_name" VARCHAR(150) NOT NULL,
    "contact_position" VARCHAR(120),
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "website" VARCHAR(300),
    "address" TEXT,
    "postal_code" VARCHAR(10),
    "city_state" VARCHAR(160),
    "bank_name" VARCHAR(120),
    "clabe" CHAR(18),
    "account_number" VARCHAR(40),
    "currency" "Currency" NOT NULL DEFAULT 'MXN',
    "payment_terms" VARCHAR(120),
    "authorized_credit" DECIMAL(12,2),
    "registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_purchase_at" TIMESTAMPTZ(3),
    "total_historical_purchases" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "internal_notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "category" "SupplyCategory" NOT NULL,
    "unit" VARCHAR(40) NOT NULL,
    "reference_unit_price" DECIMAL(12,2),
    "current_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minimum_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "maximum_stock" DECIMAL(12,3),
    "status" "SupplyStatus" NOT NULL DEFAULT 'disponible',
    "preferred_provider_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "objective" TEXT NOT NULL,
    "client_name" VARCHAR(180),
    "leader_id" UUID,
    "planned_start_date" DATE NOT NULL,
    "planned_end_date" DATE NOT NULL,
    "real_start_date" DATE,
    "real_end_date" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'planeacion',
    "estimated_budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "real_accumulated_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "progress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "priority" "ProjectPriority" NOT NULL DEFAULT 'media',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "supply_id" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "real_unit_price" DECIMAL(12,2),
    "total_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" VARCHAR(180),
    "project_id" UUID,
    "registered_by_id" UUID,
    "resulting_stock" DECIMAL(12,3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "assigned_daily_salary" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "providers_rfc_key" ON "providers"("rfc");
CREATE UNIQUE INDEX "providers_email_key" ON "providers"("email");
CREATE UNIQUE INDEX "providers_clabe_key" ON "providers"("clabe");
CREATE INDEX "providers_status_idx" ON "providers"("status");
CREATE INDEX "providers_category_idx" ON "providers"("category");
CREATE UNIQUE INDEX "supplies_sku_key" ON "supplies"("sku");
CREATE INDEX "supplies_status_idx" ON "supplies"("status");
CREATE INDEX "supplies_category_idx" ON "supplies"("category");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_priority_idx" ON "projects"("priority");
CREATE INDEX "inventory_movements_supply_id_idx" ON "inventory_movements"("supply_id");
CREATE INDEX "inventory_movements_project_id_idx" ON "inventory_movements"("project_id");
CREATE INDEX "inventory_movements_occurred_at_idx" ON "inventory_movements"("occurred_at");
CREATE UNIQUE INDEX "project_members_project_id_employee_id_key" ON "project_members"("project_id", "employee_id");

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_preferred_provider_id_fkey" FOREIGN KEY ("preferred_provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
