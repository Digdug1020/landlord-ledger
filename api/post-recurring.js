import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { business_id } = req.body || {};
  if (!business_id) return res.status(400).json({ error: "business_id required" });

  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('business_id', business_id)
    .eq('active', true)
    .lte('next_due_date', today);

  if (error) return res.status(500).json({ error: error.message });
  if (!due || due.length === 0) return res.status(200).json({ posted: 0 });

  let posted = 0;

  for (const r of due) {
    let dueDate = new Date(r.next_due_date);

    while (dueDate <= new Date(today)) {
      const dateStr = dueDate.toISOString().slice(0, 10);

      if (r.end_date && dateStr > r.end_date) break;

      // Check for duplicates - handle null property_id separately
      let existingQuery;
      if (r.property_id) {
        const { data } = await supabase
          .from('transactions')
          .select('id')
          .eq('business_id', business_id)
          .eq('property_id', r.property_id)
          .eq('transaction_date', dateStr)
          .eq('description', r.description)
          .eq('source', 'recurring');
        existingQuery = data;
      } else {
        const { data } = await supabase
          .from('transactions')
          .select('id')
          .eq('business_id', business_id)
          .is('property_id', null)
          .eq('transaction_date', dateStr)
          .eq('description', r.description)
          .eq('source', 'recurring');
        existingQuery = data;
      }

      if (!existingQuery || existingQuery.length === 0) {
        await supabase.from('transactions').insert([{
          business_id: business_id,
          property_id: r.property_id || null,
          transaction_date: dateStr,
          description: r.description,
          category: r.category || null,
          amount: r.amount,
          type: r.type,
          source: 'recurring',
        }]);
        posted++;
      }

      // Advance to next occurrence
      const next = new Date(dueDate);
      if (r.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
      else if (r.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (r.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
      dueDate = next;
    }

    // Update next_due_date to next future date
    await supabase.from('recurring_transactions')
      .update({ next_due_date: dueDate.toISOString().slice(0, 10) })
      .eq('id', r.id);
  }

  return res.status(200).json({ posted });
}
