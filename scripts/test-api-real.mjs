import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://eggmywzelppuswbtgdjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZ215d3plbHBwdXN3YnRnZGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5MDcwNCwiZXhwIjoyMDk3MTY2NzA0fQ.hZ7yoOD0JFfoKCIs8gYLixWCkLgwgIB5OCb4PpCqn7E',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function testWithRealData() {
  console.log('🧪 Testing with Real Game Data\n')

  try {
    // Get first game
    const { data: games } = await supabase
      .from('activities')
      .select('id')
      .eq('subject', 'Math')
      .eq('grade', 'pre-k')
      .limit(1)

    if (!games || games.length === 0) {
      console.log('❌ No Pre-K Math games found in database')
      return false
    }

    const gameId = games[0].id
    console.log(`✅ Found game ID: ${gameId}\n`)

    // Test POST - Save score
    console.log('📝 TEST 1: POST /api/leaderboard - Save Score')
    const postResponse = await fetch('http://localhost:3000/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: gameId,
        player_name: 'TestPlayer_' + Date.now(),
        score: 9500,
        correct_answers: 9,
        time_taken: 45,
      }),
    })

    const postData = await postResponse.json()
    console.log(`Status: ${postResponse.status}`)
    if (postResponse.ok) {
      console.log('✅ Score saved successfully!')
      console.log(`Data: ${JSON.stringify(postData.data[0], null, 2)}\n`)
    } else {
      console.log(`❌ Error: ${postData.error}\n`)
      return false
    }

    // Test GET - Fetch leaderboard
    console.log('📊 TEST 2: GET /api/leaderboard?activity_id=xxx - Fetch Top 10')
    const getResponse = await fetch(
      `http://localhost:3000/api/leaderboard?activity_id=${gameId}`
    )
    const getData = await getResponse.json()
    console.log(`Status: ${getResponse.status}`)
    if (getResponse.ok) {
      console.log(`✅ Leaderboard fetched! (${getData.data.length} scores)\n`)
      console.log('Top 3 Scores:')
      getData.data.slice(0, 3).forEach((entry, i) => {
        console.log(
          `  #${i + 1}. ${entry.player_name}: ${entry.score} pts (${entry.correct_answers}/10 correct, ${entry.time_taken}s)`
        )
      })
      console.log()
    } else {
      console.log(`❌ Error: ${getData.error}\n`)
      return false
    }

    console.log('=' .repeat(50))
    console.log('\n✅ ALL API TESTS PASSED!')
    console.log('\n🎉 Leaderboard System is WORKING CORRECTLY!\n')
    return true
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

testWithRealData()
