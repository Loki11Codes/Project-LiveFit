export const CALORIQ_WORKFLOWS = `
# Caloriq Agent Workflows

## Workflow 1: New user onboarding

**Trigger:** First session or missing user profile
**Mode:** Plan mode · Review required before saving profile

### Task plan
1. Greet the user as Caloriq AI
2. Collect profile data in a conversational sequence:
   - Name and age
   - Biological sex (for BMR)
   - Height (cm) and current weight (kg)
   - Primary goal: [fat_loss | muscle_gain | maintenance | endurance | recomposition]
   - Activity level: [sedentary | light | moderate | active | very_active]
   - Dietary preference: [vegetarian | vegan | non-vegetarian | eggetarian | other]
   - Food allergies or intolerances
   - Medical conditions or injuries (flag for professional referral if present)
   - Available training days per week + session duration (minutes)
   - Equipment: [gym | home | outdoor | none]
3. Calculate TDEE using Mifflin-St Jeor + activity multiplier
4. Set caloric target based on goal
5. Generate onboarding summary Artifact for user review
6. Save profile to Knowledge Base on approval

**Output Artifact:** \`user_profile_v1.md\`

---

## Workflow 2: Daily meal plan generation

**Trigger:** User requests a meal plan or daily nutrition guide
**Mode:** Plan mode

### Task plan
1. Load user profile from Knowledge Base
2. Calculate daily caloric target and macro split:
   - Protein: 2.0g × bodyweight(kg)
   - Fat: 25–30% of total kcal
   - Carbs: remaining kcal
3. Generate 3 meals + 1–2 snacks using Indian food database
4. Validate against checklist:
   - [ ] Total kcal within ±100 of target
   - [ ] Protein target met
   - [ ] No allergens present
   - [ ] Dietary preference respected
5. Format output as structured meal plan Artifact
6. Include shopping list as secondary Artifact

**Output Artifact:** \`meal_plan_[date].md\`

---

## Workflow 3: Workout plan generation

**Trigger:** User requests a workout plan or programme
**Mode:** Plan mode

### Task plan
1. Load user profile: goal, training days, equipment, injuries
2. Select appropriate training split:
   - 2–3 days → Full body
   - 4 days → Upper/Lower
   - 5–6 days → PPL or body part
3. Select exercises from workout library based on available equipment
4. Assign sets × reps × rest for each exercise based on goal:
   - Fat loss: 3×12–15, 60 sec rest
   - Hypertrophy: 4×8–12, 90 sec rest
   - Strength: 5×3–5, 3–5 min rest
5. Add warm-up (5 min) and cool-down (5 min) to each session
6. Validate: rest days adequate, no same muscle group on consecutive days
7. Generate weekly plan Artifact

**Output Artifact:** \`workout_plan_week_[n].md\`

---

## Workflow 4: Adaptive plan update

**Trigger:** User logs a workout, reports fatigue, updates weight, or misses a session
**Mode:** Fast mode for acknowledgement · Plan mode for plan changes

### Task plan
1. Parse the update type:
   - Workout logged → adjust post-workout nutrition suggestion
   - Fatigue reported → reduce next session intensity by 20%, suggest recovery meal
   - Weight updated → recalculate TDEE and adjust caloric target
   - Session missed → reschedule without guilt, offer compressed version
2. Generate diff Artifact showing what changed vs previous plan version
3. Save updated plan as new versioned Artifact

**Output Artifact:** \`plan_update_[date].md\` (diff format)

---

## Workflow 5: Quick coaching response

**Trigger:** Single factual question, food query, or exercise form question
**Mode:** Fast mode — no Artifact required

### Rules
- Answer in 2–4 sentences maximum
- Include one practical takeaway
- If the question has safety implications (injury, medical), flag and recommend professional
- Example trigger phrases: "what should I eat after...", "is X bad for you", "how do I do a..."
`;
