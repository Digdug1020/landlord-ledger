// Data migration: old Supabase project → production
// Uses service role keys to bypass RLS — never use anon keys here.
//
// Setup (one time):
//   npm install --save-dev dotenv
//
// Usage:
//   node scripts/migrate.js            — full migration
//   node scripts/migrate.js --dry-run  — preview row counts, no writes

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');

const {
  OLD_SUPABASE_URL,
  OLD_SUPABASE_SERVICE_KEY,
  NEW_SUPABASE_URL,
  NEW_SUPABASE_SERVICE_KEY,
  OLD_OWNER_ID,
  NEW_OWNER_ID,
} = process.env;

// Validate required vars up front
['OLD_SUPABASE_URL', 'OLD_SUPABASE_SERVICE_KEY', 'NEW_SUPABASE_URL', 'NEW_SUPABASE_SERVICE_KEY'].forEach(k => {
  if (!process.env[k]) { console.error(`Missing required env var: ${k}`); process.exit(1); }
});

if ((OLD_OWNER_ID && !NEW_OWNER_ID) || (!OLD_OWNER_ID && NEW_OWNER_ID)) {
  console.error('Set both OLD_OWNER_ID and NEW_OWNER_ID, or neither.');
  process.exit(1);
}

const src = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const dst = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Remap owner_id when the user's auth UUID differs between projects
function remapOwner(rows) {
  if (!OLD_OWNER_ID || !NEW_OWNER_ID) return rows;
  return rows.map(r =>
    r.owner_id === OLD_OWNER_ID ? { ...r, owner_id: NEW_OWNER_ID } : r
  );
}

async function readAll(table) {
  let rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await src
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Read "${table}" (offset ${from}): ${error.message}`);
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function migrateTable(table, transform) {
  const rows = await readAll(table);

  if (rows.length === 0) {
    console.log(`  ${table}: (empty — skipped)`);
    return;
  }

  const transformed = transform ? transform(rows) : rows;

  if (DRY_RUN) {
    console.log(`  ${table}: ${transformed.length} rows (dry run — not written)`);
    return;
  }

  // Upsert in chunks to avoid request size limits
  const chunkSize = 200;
  for (let i = 0; i < transformed.length; i += chunkSize) {
    const chunk = transformed.slice(i, i + chunkSize);
    const { error } = await dst.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`Write "${table}" (chunk ${i}): ${error.message}`);
  }

  console.log(`  ${table}: ${transformed.length} rows migrated`);
}

async function verifyConnections() {
  const { error: srcErr } = await src.from('businesses').select('id').limit(1);
  if (srcErr) throw new Error(`Cannot read from source: ${srcErr.message}`);

  const { error: dstErr } = await dst.from('businesses').select('id').limit(1);
  if (dstErr) throw new Error(`Cannot read from destination: ${dstErr.message}`);
}

async function main() {
  console.log(`\nLandlordLedger — Data Migration${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`  Source : ${OLD_SUPABASE_URL}`);
  console.log(`  Dest   : ${NEW_SUPABASE_URL}`);
  if (OLD_OWNER_ID) console.log(`  Remap  : ${OLD_OWNER_ID} → ${NEW_OWNER_ID}`);
  console.log('');

  await verifyConnections();

  // Order matters — children must come after their parents
  await migrateTable('businesses',            remapOwner);
  await migrateTable('properties');
  await migrateTable('recurring_transactions');
  await migrateTable('transactions');
  await migrateTable('notes');
  await migrateTable('subscriptions');

  console.log(`\nDone${DRY_RUN ? ' (no data was written)' : ''}.`);
}

main().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
