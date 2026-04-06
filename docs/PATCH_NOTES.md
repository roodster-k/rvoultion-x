# PostOp Tracker — Patch Notes (7 Fixes)

## How to Apply
Copy each file to the corresponding path in your project, replacing the existing file.
Then run the SQL migration in your Supabase Dashboard.

---

## Fix 1: Login Impossible (CRITICAL)
**File:** `src/pages/LandingPage.jsx`  
**Problem:** The "Connexion" link in the navbar pointed to `/signup` instead of `/login`.
Users clicking "Connexion" were sent to the signup page, and from there the "Se connecter" 
link pointed back to `/` (landing), creating an infinite loop with no way to reach `/login`.

**Change:** Line ~42: `<Link to="/signup">` → `<Link to="/login">`

---

## Fix 2: Signup "Se connecter" Loop (CRITICAL)
**File:** `src/pages/SignupClinic.jsx`  
**Problem:** The "Déjà un compte ? Se connecter" link pointed to `/` instead of `/login`.
Also, on mobile the left branding panel is hidden, so there was NO login link visible at all.

**Changes:**
- Left panel: `<Link to="/">` → `<Link to="/login">`
- Added a mobile-visible "Déjà un compte?" link below step 1 form
- Step 3 success: "Continuer" button now links to `/dashboard` instead of `/login`

---

## Fix 3: Auth Loading Reliability (HIGH)
**File:** `src/context/AuthContext.jsx`  
**Problem:** Session restoration relied solely on `onAuthStateChange` with a 5-second 
safety timeout. If `INITIAL_SESSION` event was delayed, users saw infinite loading.

**Changes:**
- Added explicit `supabase.auth.getSession()` call on mount (Supabase recommended pattern)
- `getSession()` reads from localStorage — no network delay
- Removed the arbitrary 5-second timeout
- Added `hasInitialized` ref to prevent double profile fetches
- `INITIAL_SESSION` event is now skipped if getSession already handled it

---

## Fix 4: Mobile Sidebar Broken (MEDIUM)
**File:** `src/components/Sidebar.jsx`  
**Problem:** The Sidebar component never received the `sidebarOpen` prop, so the 
CSS class for mobile visibility was never applied. The burger menu opened the overlay 
backdrop but the sidebar itself stayed hidden at `translateX(-100%)`.

**Change:** Added `sidebarOpen` prop and applies `sidebar-open` class dynamically.

---

## Fix 5: NurseDashboard Missing Prop (MEDIUM)
**File:** `src/pages/NurseDashboard.jsx`  
**Problem:** The `sidebarOpen` state existed but was never passed to `<Sidebar>`.

**Change:** Added `sidebarOpen={sidebarOpen}` prop to the Sidebar component call.

---

## Fix 6: Mobile Sidebar CSS (MEDIUM)
**File:** `src/styles/global.css`  
**Problem:** The CSS only had `transform: translateX(-100%)` for mobile but no 
`.sidebar-open` class to bring it back into view.

**Change:** Added `.sidebar.sidebar-open` rule with `translateX(0)` and a box-shadow 
for the slide-in drawer effect. Uses `cubic-bezier` for smooth animation.

---

## Fix 7: PatientPortal Crash (HIGH)
**File:** `src/pages/PatientPortal.jsx`  
**Problem:** `useEffect` was used in the component but never imported from React.
This would cause a runtime crash (`ReferenceError: useEffect is not defined`) when 
any patient accessed the legacy token portal.

**Change:** Added `useEffect` to the import: `import { useState, useEffect } from 'react'`

---

## Fix 8: RLS Security Consolidation (HIGH)
**File:** `supabase/migrations/007_rls_consolidation.sql`  
**Problem:** 6 overlapping migrations (002→006) created conflicting RLS policies.
Migration 005 added `anon USING(true)` on nearly ALL tables, weakening security.
Some policies caused infinite recursion on the `users` table.

**Changes:**
- Drops ALL existing policies across all 9 tables
- Recreates a single, coherent set with `v7_` prefix for easy identification
- Staff policies properly filtered by `clinic_id`
- Patient policies properly filtered by `auth_user_id` / `get_my_patient_id()`
- Anon policies preserved ONLY for legacy token portal (clearly marked for future removal)
- Self-referencing `users` table uses `auth_user_id = auth.uid()` to avoid recursion
- Ensures `pain_scores_patient_day_key` UNIQUE constraint for upsert support

### To apply:
1. Open Supabase Dashboard → SQL Editor
2. Paste the contents of `007_rls_consolidation.sql`
3. Click "Run"
4. Verify the output table shows all `v7_*` policies
