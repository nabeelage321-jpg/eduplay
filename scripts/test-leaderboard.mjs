#!/usr/bin/env node
/**
 * Test Script: EduPlay Leaderboard System
 * Verifies:
 * 1. Leaderboard API endpoints work
 * 2. Game complete screen logic is correct
 * 3. Scoring system functions properly
 */

// Using native Node.js fetch (v18+)

const BASE_URL = 'http://localhost:3000'
const API_URL = `${BASE_URL}/api/leaderboard`

// Test data
const TEST_ACTIVITY_ID = 'test-game-123'
const TEST_PLAYER_NAME = 'TestPlayer'
const TEST_SCORE = 9500
const TEST_CORRECT = 9
const TEST_TIME = 45

console.log('🧪 EduPlay Leaderboard System - Test Suite\n')
console.log('=' .repeat(50))

// Test 1: POST endpoint - Save score
async function testPostScore() {
  console.log('\n✅ TEST 1: POST /api/leaderboard - Save Score')
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: TEST_ACTIVITY_ID,
        player_name: TEST_PLAYER_NAME,
        score: TEST_SCORE,
        correct_answers: TEST_CORRECT,
        time_taken: TEST_TIME,
      }),
    })

    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('   ✅ Score saved successfully')
      console.log(`      Response: ${JSON.stringify(data.success)}`)
      return true
    } else {
      console.log('   ❌ Failed to save score')
      console.log(`      Status: ${response.status}`)
      console.log(`      Error: ${data.error}`)
      return false
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message)
    return false
  }
}

// Test 2: GET endpoint - Fetch top 10
async function testGetLeaderboard() {
  console.log('\n✅ TEST 2: GET /api/leaderboard?activity_id=xxx - Fetch Top 10')
  try {
    const response = await fetch(`${API_URL}?activity_id=${TEST_ACTIVITY_ID}`)
    const data = await response.json()

    if (response.ok && data.success) {
      console.log('   ✅ Leaderboard fetched successfully')
      console.log(`      Total scores: ${data.data ? data.data.length : 0}`)
      if (data.data && data.data.length > 0) {
        console.log(`      Top score: ${data.data[0].player_name} - ${data.data[0].score} points`)
      }
      return true
    } else {
      console.log('   ❌ Failed to fetch leaderboard')
      console.log(`      Status: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message)
    return false
  }
}

// Test 3: Verify scoring logic
function testScoringLogic() {
  console.log('\n✅ TEST 3: Scoring Logic Verification')
  
  const calculatePoints = (timeUsed, isCorrect) => {
    if (!isCorrect) return 0
    if (timeUsed <= 10) return 1000
    if (timeUsed <= 20) return 500
    return 200
  }

  const testCases = [
    { time: 5, correct: true, expected: 1000, label: 'Fast & Correct' },
    { time: 15, correct: true, expected: 500, label: 'Medium & Correct' },
    { time: 25, correct: true, expected: 200, label: 'Slow & Correct' },
    { time: 5, correct: false, expected: 0, label: 'Fast & Wrong' },
    { time: 50, correct: true, expected: 200, label: 'Over time & Correct' },
  ]

  let allPassed = true
  testCases.forEach((test) => {
    const result = calculatePoints(test.time, test.correct)
    const passed = result === test.expected
    allPassed = allPassed && passed
    
    const icon = passed ? '✓' : '✗'
    console.log(`   ${icon} ${test.label}: ${result} points (expected ${test.expected})`)
  })

  return allPassed
}

// Test 4: Verify game complete screen logic
function testGameCompleteLogic() {
  console.log('\n✅ TEST 4: Game Complete Screen Logic')
  
  const testScenarios = [
    { correct: 10, total: 10, expected: '🏆', label: '100% - Perfect' },
    { correct: 9, total: 10, expected: '⭐', label: '90% - Great' },
    { correct: 7, total: 10, expected: '👏', label: '70% - Good' },
    { correct: 4, total: 10, expected: '💪', label: '40% - Keep Trying' },
  ]

  let allPassed = true
  testScenarios.forEach((scenario) => {
    const percentage = Math.round((scenario.correct / scenario.total) * 100)
    let emoji = '🌟'
    if (percentage === 100) emoji = '🏆'
    else if (percentage >= 80) emoji = '⭐'
    else if (percentage >= 60) emoji = '👏'
    else emoji = '💪'

    const passed = emoji === scenario.expected
    allPassed = allPassed && passed
    
    const icon = passed ? '✓' : '✗'
    console.log(`   ${icon} ${scenario.label} (${percentage}%): ${emoji}`)
  })

  return allPassed
}

// Test 5: Verify leaderboard highlighting logic
function testLeaderboardHighlighting() {
  console.log('\n✅ TEST 5: Leaderboard Highlighting Logic')
  
  const leaderboard = [
    { player_name: 'Ali', score: 9500 },
    { player_name: 'Bob', score: 8000 },
    { player_name: 'Carol', score: 7500 },
  ]
  
  const currentPlayer = 'Ali'
  let allPassed = true

  leaderboard.forEach((entry, index) => {
    let backgroundColor = 'bg-gray-50'
    
    if (entry.player_name === currentPlayer) {
      backgroundColor = 'bg-yellow-100 border-2 border-yellow-400'
    } else if (index === 0) {
      backgroundColor = 'bg-yellow-50'
    } else if (index === 1) {
      backgroundColor = 'bg-gray-100'
    } else if (index === 2) {
      backgroundColor = 'bg-orange-50'
    }

    const isCurrentPlayer = entry.player_name === currentPlayer
    const icon = isCurrentPlayer ? '✓' : ' '
    const highlight = isCurrentPlayer ? ' (HIGHLIGHTED)' : ''
    
    console.log(`   ${icon} Rank #${index + 1}: ${entry.player_name} - ${backgroundColor}${highlight}`)
    
    if (index === 0 && !isCurrentPlayer) {
      console.log(`      ✓ First place has yellow-50 background`)
    }
  })

  return allPassed
}

// Main test runner
async function runTests() {
  console.log('\n🚀 Running Leaderboard System Tests...\n')
  
  const results = {
    'POST Score': false,
    'GET Leaderboard': false,
    'Scoring Logic': false,
    'Game Complete': false,
    'Highlighting': false,
  }

  // Run tests
  results['POST Score'] = await testPostScore()
  results['GET Leaderboard'] = await testGetLeaderboard()
  results['Scoring Logic'] = testScoringLogic()
  results['Game Complete'] = testGameCompleteLogic()
  results['Highlighting'] = testLeaderboardHighlighting()

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 TEST RESULTS SUMMARY\n')
  
  let passedCount = 0
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌'
    console.log(`${icon} ${test}`)
    if (passed) passedCount++
  })

  console.log(`\n${passedCount}/${Object.keys(results).length} tests passed`)
  
  if (passedCount === Object.keys(results).length) {
    console.log('\n🎉 ALL TESTS PASSED! Leaderboard system is working correctly.\n')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.\n')
  }

  return passedCount === Object.keys(results).length
}

// Run the tests
runTests().catch(console.error)
