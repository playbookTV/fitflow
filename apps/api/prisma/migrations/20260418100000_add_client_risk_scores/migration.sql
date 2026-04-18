-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "client_risk_scores" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "summary" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "suggestion" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_risk_scores_client_id_key" ON "client_risk_scores"("client_id");

-- CreateIndex
CREATE INDEX "client_risk_scores_coach_id_idx" ON "client_risk_scores"("coach_id");

-- CreateIndex
CREATE INDEX "client_risk_scores_score_idx" ON "client_risk_scores"("score");

-- AddForeignKey
ALTER TABLE "client_risk_scores" ADD CONSTRAINT "client_risk_scores_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
