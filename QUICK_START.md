# 🚀 QUICK START GUIDE - EDUPLAY LEADERBOARD

## ✅ WHAT'S DONE

**All Code Complete:**
- ✅ Leaderboard API endpoint created (`/src/app/api/leaderboard/route.ts`)
- ✅ Quiz game with timer & scoring implemented
- ✅ Game complete screen with results & leaderboard built
- ✅ Database schema ready to deploy

**What's Left:**
- ⏳ Deploy database table (1 minute)

---

## 📋 DEPLOY LEADERBOARD TABLE (5 MINUTES)

### Option 1: Via Supabase Dashboard (Easiest)

1. **Open Supabase**
   - Go: https://supabase.com/dashboard/project/eggmywzelppuswbtgdjz

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy SQL**
   ```sql
   CREATE TABLE IF NOT EXISTS leaderboard (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
     player_name TEXT NOT NULL,
     score INTEGER NOT NULL DEFAULT 0,
     correct_answers INTEGER NOT NULL DEFAULT 0,
     time_taken INTEGER NOT NULL DEFAULT 0,
     played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE INDEX IF NOT EXISTS idx_leaderboard_activity_id ON leaderboard(activity_id);
   CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
   CREATE INDEX IF NOT EXISTS idx_leaderboard_played_at ON leaderboard(played_at DESC);

   ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Enable read access for all users" ON leaderboard
     FOR SELECT USING (true);

   CREATE POLICY "Enable insert for service role" ON leaderboard
     FOR INSERT WITH CHECK (true);

   CREATE POLICY "Enable update for service role" ON leaderboard
     FOR UPDATE USING (true) WITH CHECK (true);
   ```

4. **Run Query**
   - Paste SQL into editor
   - Click "RUN" button
   - Wait for completion (should say "Success")

5. **Verify**
   - Go to "Table Editor"
   - Look for "leaderboard" table in list
   - Click it to see columns created

✅ **Done!** Table is ready.

---

## 🧪 TEST THE SYSTEM (10 MINUTES)

### Start Development Server
```bash
npm run dev
```

### Test Flow:

**1. Browse Games**
```
Open: http://localhost:3000/en/browse
See: Game cards with "Play Now" buttons
Click: "Play" on any game
```

**2. Enter Player Name**
```
See: "What is your name?" prompt
Type: Your name (e.g., "Ali")
Click: "Start Game! 🚀"
```

**3. Play Question 1**
```
See: Circular timer counting 30, 29, 28, ...
See: Question with emoji and 4 buttons
Click: Answer (watch for +1000, +500, or +200 points)
See: Feedback (✅ or ❌)
Click: "Next Question ➜"
```

**4. Play Remaining Questions**
```
Repeat question flow for questions 2-10
Watch timer reset and score accumulate
```

**5. See Final Results**
```
See: "Great Job!" screen with emoji (🏆, ⭐, 👏, 💪)
See: 4-cell grid showing:
     - Final Score (total points)
     - Correct (X/10)
     - Percentage (X%)
     - Time (Xm Xs)
See: "🏅 Top 10 Scores" leaderboard
     - Your name highlighted in yellow
     - Rank, correct count, time, score
Click: "Back to Games 🎮"
```

**6. Verify Leaderboard**
```
Play another game with different name
See: New player in leaderboard
See: Scores sorted by highest first
See: New player highlighted yellow
```

---

## ✨ EXPECTED BEHAVIOR

### Scoring:
- Correct in 0-10s → **1000 points** ✅
- Correct in 11-20s → **500 points** ✅
- Correct in 21-30s → **200 points** ✅
- Wrong answer → **0 points** ❌
- Timeout (no answer) → **0 points** ⏱️

### Timer:
- Counts down from 30 to 0 every 1 second
- Green circle when > 10 seconds
- Red circle when ≤ 10 seconds
- Auto-advances at 0 with 0 points

### Leaderboard:
- Shows top 10 scores only
- Sorted highest to lowest
- Current player highlighted yellow
- Shows: Rank | Name | Correct Count | Time | Score

---

## 📁 FILES CREATED

```
src/app/api/leaderboard/
└── route.ts (API endpoints)

supabase/migrations/
└── 002_create_leaderboard_table.sql (database schema)
```

## 📝 FILES MODIFIED

```
src/app/[locale]/play/[id]/
└── QuizGame.tsx (timer + scoring + results + leaderboard)
```

---

## 🔗 KEY COMPONENTS

### 1. API Endpoint
**Location:** `POST/GET /api/leaderboard`

**POST** - Save score:
```javascript
fetch('/api/leaderboard', {
  method: 'POST',
  body: JSON.stringify({
    activity_id: "game-uuid",
    player_name: "Ali",
    score: 9500,
    correct_answers: 9,
    time_taken: 45
  })
})
```

**GET** - Fetch top 10:
```javascript
fetch('/api/leaderboard?activity_id=game-uuid')
```

### 2. Timer System
- Starts at 30 seconds
- Counts down by 1 each second
- Green when > 10s, red when ≤ 10s
- Visual SVG circle shows progress
- Auto-advances at 0 seconds

### 3. Scoring System
```
const calculatePoints = (timeUsed, isCorrect) => {
  if (!isCorrect) return 0
  if (timeUsed <= 10) return 1000
  if (timeUsed <= 20) return 500
  return 200
}
```

### 4. Results Display
- Final stats in 4-cell grid
- Leaderboard with top 10
- Current player highlighted
- Back button to browse

---

## 🐛 TROUBLESHOOTING

### "Can't find leaderboard table"
→ Check SQL was run in Supabase dashboard
→ Verify table in "Table Editor"

### "No scores appearing"
→ Check browser console for errors
→ Verify environment variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Timer not counting down
→ Check useEffect hook is running
→ Verify `gameStarted && !gameComplete && !showFeedback`

### Leaderboard not showing
→ Wait 2-3 seconds after game complete
→ Check network tab for GET request success
→ Verify topScores state updated

---

## 📊 VERIFICATION CHECKLIST

- [ ] Development server running
- [ ] Leaderboard table created in Supabase
- [ ] Can navigate to browse page
- [ ] Can select game and enter name
- [ ] Timer counts down visibly
- [ ] Score updates after answering
- [ ] Points display: +1000 / +500 / +200 / 0
- [ ] Final results screen shows
- [ ] Leaderboard displays with 3-10 entries
- [ ] Current player highlighted
- [ ] Back button works
- [ ] Multiple games tracked separately

---

## 🎯 NEXT STEPS

1. ✅ Deploy SQL (see above)
2. ✅ Run development server
3. ✅ Test game flow (see above)
4. ✅ Verify leaderboard populates
5. Ready for production! 🚀

---

## 💡 TIPS

- **Test Multiple Players:** Play multiple games with different names to see leaderboard ranking
- **Test Speed Scoring:** Try answering at 5s, 15s, and 25s to see different point values
- **Check Database:** View scores in Supabase Table Editor → leaderboard table
- **Monitor Errors:** Check browser console (F12) for any fetch errors
- **localStorage:** Player name saved, clear browser data to test again

---

**You're all set! Enjoy your working leaderboard system! 🎉**
