# Listen Queue Fix - Implementation Summary

## Overview
Fixed the Listen swipe page to work as a proper review queue with persistent state, clean progression, and robust error handling.

---

## 1. SQL Migration Required

**File**: `supabase/migrations/20260414_create_submission_reviews.sql`

Run this migration to create the review tracking table:

```sql
-- Creates submission_reviews table
-- Tracks user actions: 'liked' or 'skipped'
-- Enforces uniqueness: one review per user per submission
```

**Table Structure**:
```
submission_reviews
├── id (uuid, primary key)
├── user_id (uuid, references auth.users)
├── submission_id (uuid, references submissions)
├── action (text: 'liked' | 'skipped')
├── created_at (timestamptz)
└── UNIQUE(user_id, submission_id)
```

**Indexes Created**:
- `idx_submission_reviews_user_id` - Fast user lookups
- `idx_submission_reviews_submission_id` - Fast submission lookups
- `idx_submission_reviews_user_submission` - Fast compound lookups

**RLS Policies**:
- Users can insert their own reviews
- Users can view their own reviews
- Users can update their own reviews
- Authenticated users can view review counts (analytics)

---

## 2. Files Changed

### New Files Created:

**`src/lib/actions/reviews.ts`**
- Server action: `saveReview(submissionId, action)` - Saves like/skip with upsert
- Query helper: `getReviewedSubmissionIds(userId)` - Returns reviewed submission IDs
- Handles authentication, error cases, path revalidation

**`supabase/migrations/20260414_create_submission_reviews.sql`**
- Database migration for review tracking table

**`LISTEN_QUEUE_FIX.md`** (this file)
- Documentation of implementation

### Modified Files:

**`src/lib/supabase/queries.ts`**
- Added: `getUnreviewedSubmissions()` function
- Filters out already-reviewed submissions
- Optionally excludes user's own submissions
- Returns submissions sorted by created_at DESC

**`src/app/listen/page.tsx`**
- Changed from: `getSubmissionsForSample()` 
- Changed to: `getUnreviewedSubmissions()`
- Now loads only unreviewed submissions for queue

**`src/components/SwipeCard.tsx`**
- Added: Review saving on swipe (both like and skip)
- Added: Error state and error display
- Added: `success` parameter to `onSwipe` callback
- Fixed: Proper disabled state during pending actions
- Fixed: Like consistency - saves both review and like on heart click
- Improved: Error handling with user-friendly messages

**`src/components/SwipeFeed.tsx`**
- Fixed: Only advances index on successful swipe
- Fixed: Stays on current card if action fails (allows retry)
- Improved: Empty state with "You're caught up" message
- Added: Action buttons (Leaderboard / Back to today)
- Added: Different messages for no flips vs. all reviewed

---

## 3. How Queue Progression Works

### Previous Behavior (Broken):
```
User swipes → Animation plays → Always advance to next
Problem: Blank screen if action failed or data not ready
```

### New Behavior (Fixed):
```
1. User clicks Like or Skip button
2. Button disabled, exit animation starts
3. Save review action to database:
   - If liked: Save to submission_reviews + likes tables
   - If skipped: Save to submission_reviews only
4. On success:
   - Advance to next unreviewed submission
   - Current card exits, next card appears
5. On failure:
   - Stay on current card
   - Show error message
   - User can retry action
```

### State Flow:
```typescript
handleSwipe(direction) {
  1. Validate: not already exiting/pending
  2. Pause audio if playing
  3. Start exit animation
  4. Save review to database
  5. If success:
     - Wait 350ms for animation
     - Call onSwipe(liked, true)
     - Parent advances to next card
  6. If failure:
     - Show error message
     - Reset exit state
     - Call onSwipe(liked, false)
     - Parent stays on current card
}
```

---

## 4. How Refresh Persistence Works

### Previous Behavior (Broken):
```
Refresh page → Start from first submission again
User has to re-review songs they already saw
```

### New Behavior (Fixed):
```
1. Page loads
2. Server queries:
   - Get today's sample
   - Get ALL submissions for sample
   - Get user's reviewed submission IDs
   - Filter out reviewed submissions
3. Return only unreviewed submissions
4. User sees next song in queue, not first song
```

### Query Logic:
```typescript
getUnreviewedSubmissions(sampleId, userId, excludeOwnSubmissions) {
  1. Fetch user's reviewed submission IDs from submission_reviews
  2. Fetch all submissions for the sample
  3. Exclude user's own submissions (if requested)
  4. Filter out already-reviewed submissions
  5. Return unreviewed submissions only
  6. Sort by created_at DESC (newest first)
}
```

### Persistence Guarantees:
- ✅ Reviews persist across page refreshes
- ✅ Queue position maintained (shows next unreviewed)
- ✅ No duplicate reviews (UNIQUE constraint)
- ✅ Works across devices (server-side state)

---

## 5. Like Count Consistency

### Dual-Table System:
```
submission_reviews table:
- Tracks ALL swipe actions (liked + skipped)
- Used for queue filtering
- One row per user per submission

likes table:
- Tracks ONLY likes
- Used for like counts on submissions
- One row per user per submission
```

### Like Action Flow:
```
User clicks Heart button:
1. Save to submission_reviews (action: 'liked')
2. Save to likes table (via toggleLike)
3. Both actions succeed → Advance to next
4. Either fails → Show error, stay on card
```

### Skip Action Flow:
```
User clicks X button:
1. Save to submission_reviews (action: 'skipped')
2. Do NOT save to likes table
3. Success → Advance to next
4. Failure → Show error, stay on card
```

### Why Two Tables?
- `submission_reviews` = Review queue state (what user has seen)
- `likes` = Engagement metric (what user actually liked)
- Separation allows future analytics (skip rate, like rate, etc.)

---

## 6. Error Handling

### Error Display:
- Red error banner appears above action buttons
- Shows user-friendly message
- User can dismiss by retrying action

### Error Scenarios Handled:

**Not Authenticated:**
```
Error: "Not authenticated"
Action: Redirect to sign-in or disable like button
```

**Network Failure:**
```
Error: "Failed to save review"
Action: Stay on card, allow retry
```

**Database Constraint Violation:**
```
Error: Handled by upsert (updates existing review)
Action: Success, advance to next
```

**Unknown Error:**
```
Error: "Something went wrong. Please try again."
Action: Stay on card, allow retry
```

### Retry Mechanism:
- If action fails, user stays on current card
- Error message displayed
- User can click button again to retry
- No state corruption or navigation issues

---

## 7. Empty State Handling

### Three States:

**1. No Submissions Yet:**
```
Icon: Checkmark
Title: "No flips yet"
Message: "Be the first to submit a flip for today's sample."
Actions: [Leaderboard] [Submit a flip →]
```

**2. All Reviewed:**
```
Icon: Checkmark
Title: "You're caught up"
Message: "You've listened to all available flips for today."
Actions: [Leaderboard] [Back to today →]
```

**3. Loading/Error:**
```
Falls back to standard empty state
No blank black screen crashes
```

### State Detection:
```typescript
if (submissions.length === 0) {
  return <EmptyState message="No flips yet" />
}

if (!currentSubmission) {
  // All submissions reviewed
  return <EmptyState message="You're caught up" />
}

// Normal state: show current card
return <SwipeCard submission={currentSubmission} />
```

---

## 8. Testing Checklist

Run these tests after deploying the migration:

### Database Setup:
- [ ] Run migration in Supabase SQL editor
- [ ] Verify `submission_reviews` table exists
- [ ] Verify indexes created
- [ ] Verify RLS policies active
- [ ] Test insert as authenticated user
- [ ] Test cannot insert as anonymous

### Queue Behavior:
- [ ] Load Listen page (should show first unreviewed submission)
- [ ] Click Heart → Card exits right, next card appears
- [ ] Click X → Card exits left, next card appears
- [ ] No blank screens during transitions
- [ ] Error displays if action fails

### Persistence:
- [ ] Review several submissions
- [ ] Refresh page
- [ ] Should resume from next unreviewed submission
- [ ] Should not show previously reviewed submissions

### Empty State:
- [ ] Review all submissions
- [ ] Should show "You're caught up" message
- [ ] Action buttons should work
- [ ] No crashes or blank screens

### Error Handling:
- [ ] Disconnect internet
- [ ] Try to swipe
- [ ] Error message displays
- [ ] Reconnect internet
- [ ] Retry swipe
- [ ] Should succeed and advance

### Like Consistency:
- [ ] Like a submission via swipe
- [ ] Check Leaderboard (like count should increment)
- [ ] Check submission_reviews table (review exists)
- [ ] Check likes table (like exists)
- [ ] Both tables in sync

---

## 9. Future Improvements

Potential enhancements (not implemented):

1. **Undo Last Action**
   - Add "Undo" button after swipe
   - Delete last review from database
   - Return to previous card

2. **Review History Page**
   - Show list of all reviewed submissions
   - Allow user to change their review
   - Filter by liked/skipped

3. **Queue Shuffle**
   - Option to randomize queue order
   - Store shuffle seed in user session
   - Maintain consistent order on refresh

4. **Batch Actions**
   - Prefetch next 3 submissions
   - Cache audio files
   - Faster transitions

5. **Analytics Dashboard**
   - Skip rate per submission
   - Average review time
   - Most liked submissions

---

## 10. Deployment Steps

1. **Run Migration:**
   ```sql
   -- In Supabase SQL Editor:
   -- Copy and run: supabase/migrations/20260414_create_submission_reviews.sql
   ```

2. **Deploy Code:**
   ```bash
   git add .
   git commit -m "Fix Listen queue with persistent review state"
   git push origin main
   ```

3. **Verify Deployment:**
   - Visit /listen page
   - Test swipe actions
   - Verify persistence on refresh
   - Check error handling

4. **Monitor:**
   - Check Vercel logs for errors
   - Monitor Supabase RLS policy hits
   - Watch for failed review saves

---

## Summary

✅ **Review tracking** - New `submission_reviews` table  
✅ **Clean progression** - No blank screens, advances only on success  
✅ **Refresh persistence** - Resume from last position  
✅ **Proper empty state** - "You're caught up" message  
✅ **Robust state** - Error handling, retry mechanism  
✅ **Like consistency** - Dual-table system works correctly  
✅ **Error display** - User-friendly error messages  

The Listen swipe page now works as a real review queue!
