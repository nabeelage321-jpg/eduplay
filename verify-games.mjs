import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://eggmywzelppuswbtgdjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZ215d3plbHBwdXN3YnRnZGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5MDcwNCwiZXhwIjoyMDk3MTY2NzA0fQ.hZ7yoOD0JFfoKCIs8gYLixWCkLgwgIB5OCb4PpCqn7E',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const { data } = await supabase.from('activities').select('title, type').order('title')

console.log('\n20 Counting Games Created:\n')
data?.forEach((g, i) => {
  console.log(`${i + 1}. ${g.title} (${g.type})`)
})

console.log('\nGame Type Distribution:')
const typeCounts = {}
data?.forEach((g) => {
  typeCounts[g.type] = (typeCounts[g.type] || 0) + 1
})
Object.entries(typeCounts).forEach(([type, count]) => {
  console.log(`  - ${type}: ${count}`)
})
