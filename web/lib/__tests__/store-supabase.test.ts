import { describe, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStore } from '../store-supabase';
import { runStoreContract } from './store-contract';

const url = process.env['SUPABASE_TEST_URL'];
const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

// Run only when real Supabase credentials are present. Otherwise skip (normal CI runs the InMemory contract only).
const maybe = url && key ? describe : describe.skip;

maybe('SupabaseStore (Store contract)', () => {
  // Even with describe.skip, this callback body runs during the suite-collection phase.
  // createClient throws without credentials, so defer client creation to actual run time (makeStore).
  const sb = createClient(url ?? 'http://localhost', key ?? 'service-role-key', {
    auth: { persistSession: false },
  });
  const store = new SupabaseStore(sb);

  beforeEach(async () => {
    // Silently swallowing a failure would let tests run on stale data and get contaminated — abort immediately.
    const { error } = await sb.rpc('truncate_all_test_tables');
    if (error) throw new Error(`truncate_all_test_tables failed: ${error.message}`);
  });

  runStoreContract(() => store);
});
