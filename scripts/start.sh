#!/bin/sh
# ============================================================
# Movia Backend — Script de démarrage production
# Exécuté par Render au démarrage du service
# ============================================================

set -e

echo "🚀 [start.sh] Démarrage Movia Backend..."
echo "📦 Node: $(node --version)"
echo "🌐 NODE_ENV: ${NODE_ENV:-non défini}"

# ── 1. Appliquer les migrations Prisma ──────────────────────
echo "🔄 Applying Prisma migrations..."
npx prisma migrate deploy
echo "✅ Migrations applied"

# ── 2. Seeder la DB si elle est vide (companies, cities, trips) ──
echo "🌱 Running database seed (idempotent — safe to run multiple times)..."
npx ts-node -r tsconfig-paths/register prisma/seed.ts || node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.company.count()
  .then(count => {
    if (count === 0) {
      console.error('DB vide mais seed a échoué — vérifiez les logs');
      process.exit(1);
    }
    console.log('Seed déjà appliqué ou non nécessaire (' + count + ' companies)');
    return prisma.\$disconnect();
  })
  .catch(err => { console.error(err); process.exit(1); });
"
echo "✅ Seed complete"

# ── 3. Démarrer le serveur ───────────────────────────────────
echo "🔥 Starting NestJS server..."
exec node dist/src/main
