const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Storage operations will fail."
  );
}

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "", {
  auth: { persistSession: false },
});

module.exports = supabase;
