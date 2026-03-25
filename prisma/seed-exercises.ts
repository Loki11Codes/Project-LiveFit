export {};
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const masterExercises = [
  // Chest
  { name: 'Bench Press (Barbell)', category: 'Chest', equipment: 'Barbell' },
  { name: 'Bench Press (Dumbbell)', category: 'Chest', equipment: 'Dumbbell' },
  { name: 'Incline Bench Press (Barbell)', category: 'Chest', equipment: 'Barbell' },
  { name: 'Incline Bench Press (Dumbbell)', category: 'Chest', equipment: 'Dumbbell' },
  { name: 'Decline Bench Press (Barbell)', category: 'Chest', equipment: 'Barbell' },
  { name: 'Chest Fly (Dumbbell)', category: 'Chest', equipment: 'Dumbbell' },
  { name: 'Chest Fly (Machine)', category: 'Chest', equipment: 'Machine' },
  { name: 'Cable Crossover', category: 'Chest', equipment: 'Cable' },
  { name: 'Push Up', category: 'Chest', equipment: 'Bodyweight' },
  
  // Back
  { name: 'Deadlift (Barbell)', category: 'Back', equipment: 'Barbell' },
  { name: 'Pull Up', category: 'Back', equipment: 'Bodyweight' },
  { name: 'Lat Pulldown (Cable)', category: 'Back', equipment: 'Cable' },
  { name: 'Bent Over Row (Barbell)', category: 'Back', equipment: 'Barbell' },
  { name: 'Bent Over Row (Dumbbell)', category: 'Back', equipment: 'Dumbbell' },
  { name: 'Seated Cable Row', category: 'Back', equipment: 'Cable' },
  { name: 'T-Bar Row', category: 'Back', equipment: 'Machine' },
  { name: 'Face Pull', category: 'Back', equipment: 'Cable' },

  // Legs
  { name: 'Squat (Barbell)', category: 'Legs', equipment: 'Barbell' },
  { name: 'Leg Press', category: 'Legs', equipment: 'Machine' },
  { name: 'Lunges (Dumbbell)', category: 'Legs', equipment: 'Dumbbell' },
  { name: 'Romanian Deadlift (Barbell)', category: 'Legs', equipment: 'Barbell' },
  { name: 'Leg Extension (Machine)', category: 'Legs', equipment: 'Machine' },
  { name: 'Leg Curl (Machine)', category: 'Legs', equipment: 'Machine' },
  { name: 'Calf Raise (Standing)', category: 'Legs', equipment: 'Machine' },
  { name: 'Calf Raise (Seated)', category: 'Legs', equipment: 'Machine' },
  
  // Shoulders
  { name: 'Overhead Press (Barbell)', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Overhead Press (Dumbbell)', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral Raise (Dumbbell)', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral Raise (Cable)', category: 'Shoulders', equipment: 'Cable' },
  { name: 'Front Raise (Dumbbell)', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Reverse Pec Deck', category: 'Shoulders', equipment: 'Machine' },
  { name: 'Arnold Press', category: 'Shoulders', equipment: 'Dumbbell' },

  // Arms
  { name: 'Bicep Curl (Dumbbell)', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Bicep Curl (Barbell)', category: 'Arms', equipment: 'Barbell' },
  { name: 'Bicep Curl (Cable)', category: 'Arms', equipment: 'Cable' },
  { name: 'Hammer Curl (Dumbbell)', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Preacher Curl (Machine)', category: 'Arms', equipment: 'Machine' },
  { name: 'Triceps Rope Pushdown', category: 'Arms', equipment: 'Cable' },
  { name: 'Triceps Extension (Dumbbell)', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Skullcrusher (EZ Bar)', category: 'Arms', equipment: 'Barbell' },
  { name: 'Tricep Dip', category: 'Arms', equipment: 'Bodyweight' },

  // Core
  { name: 'Crunch', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Plank', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Leg Raise', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Cable Crunch', category: 'Core', equipment: 'Cable' },
  { name: 'Russian Twist', category: 'Core', equipment: 'Bodyweight' },

  // Cardio
  { name: 'Treadmill', category: 'Cardio', equipment: 'Machine' },
  { name: 'Cycling', category: 'Cardio', equipment: 'Machine' },
  { name: 'Rowing Machine', category: 'Cardio', equipment: 'Machine' },
  { name: 'Elliptical', category: 'Cardio', equipment: 'Machine' },
  { name: 'Stair Stepper', category: 'Cardio', equipment: 'Machine' },
  { name: 'Running (Outdoor)', category: 'Cardio', equipment: 'None' },
];

async function main() {
  console.log('Seeding Master Exercises...');
  
  // Clear existing if necessary (optional depending on if it's safe to clear in dev)
  try {
    await prisma.exercise.deleteMany();
    console.log('Cleared existing exercises.');
  } catch (error) {
    console.log('Error clearing database, might be first run:', error);
  }

  const result = await prisma.exercise.createMany({
    data: masterExercises,
    skipDuplicates: true, // Prevents errors if rerun
  });

  console.log(`Seeded ${result.count} core exercises successfully!`);
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  });
