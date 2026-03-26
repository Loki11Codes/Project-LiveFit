export {};
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const masterExercises = [
  // CHEST
  { name: 'Bench Press (Barbell)', category: 'Chest', equipment: 'Barbell' },
  { name: 'Bench Press (Dumbbell)', category: 'Chest', equipment: 'Dumbbell' },
  { name: 'Incline Bench Press (Barbell)', category: 'Chest', equipment: 'Barbell' },
  { name: 'Incline Bench Press (Dumbbell)', category: 'Chest', equipment: 'Dumbbell' },
  { name: 'Decline Bench Press (Barbell)', category: 'Chest', equipment: 'Barbell' },
  { name: 'Decline Bench Press (Dumbbell)', category: 'Chest', equipment: 'Dumbbell' },
  { name: 'Chest Fly (Dumbbell)', category: 'Chest', equipment: 'Dumbbell' },
  { name: 'Chest Fly (Machine)', category: 'Chest', equipment: 'Machine' },
  { name: 'Cable Crossover (High to Low)', category: 'Chest', equipment: 'Cable' },
  { name: 'Cable Crossover (Low to High)', category: 'Chest', equipment: 'Cable' },
  { name: 'Push Up', category: 'Chest', equipment: 'Bodyweight' },
  { name: 'Dips (Chest Focus)', category: 'Chest', equipment: 'Bodyweight' },
  { name: 'Pec Deck Machine', category: 'Chest', equipment: 'Machine' },
  { name: 'Landmine Press', category: 'Chest', equipment: 'Barbell' },
  { name: 'Svend Press', category: 'Chest', equipment: 'Plate' },
  { name: 'Floor Press (Barbell)', category: 'Chest', equipment: 'Barbell' },
  { name: 'Weighted Push Up', category: 'Chest', equipment: 'Bodyweight' },
  { name: 'Close Grip Bench Press', category: 'Chest', equipment: 'Barbell' },
  { name: 'Smith Machine Bench Press', category: 'Chest', equipment: 'Machine' },
  { name: 'Diamond Push Ups', category: 'Chest', equipment: 'Bodyweight' },
  { name: 'Archer Push Ups', category: 'Chest', equipment: 'Bodyweight' },

  // BACK
  { name: 'Deadlift (Conventional)', category: 'Back', equipment: 'Barbell' },
  { name: 'Deadlift (Sumo)', category: 'Back', equipment: 'Barbell' },
  { name: 'Pull Up', category: 'Back', equipment: 'Bodyweight' },
  { name: 'Chin Up', category: 'Back', equipment: 'Bodyweight' },
  { name: 'Lat Pulldown (Wide Grip)', category: 'Back', equipment: 'Cable' },
  { name: 'Lat Pulldown (Close Grip)', category: 'Back', equipment: 'Cable' },
  { name: 'Bent Over Row (Barbell)', category: 'Back', equipment: 'Barbell' },
  { name: 'Bent Over Row (Dumbbell)', category: 'Back', equipment: 'Dumbbell' },
  { name: 'One Arm Row (Dumbbell)', category: 'Back', equipment: 'Dumbbell' },
  { name: 'Seated Cable Row', category: 'Back', equipment: 'Cable' },
  { name: 'T-Bar Row', category: 'Back', equipment: 'Barbell' },
  { name: 'Face Pull', category: 'Back', equipment: 'Cable' },
  { name: 'Back Extension', category: 'Back', equipment: 'Machine' },
  { name: 'Good Morning', category: 'Back', equipment: 'Barbell' },
  { name: 'Rack Pull', category: 'Back', equipment: 'Barbell' },
  { name: 'Pendlay Row', category: 'Back', equipment: 'Barbell' },
  { name: 'Straight Arm Pulldown', category: 'Back', equipment: 'Cable' },
  { name: 'Pull Over (Dumbbell)', category: 'Back', equipment: 'Dumbbell' },
  { name: 'Shrugs (Dumbbell)', category: 'Back', equipment: 'Dumbbell' },
  { name: 'Shrugs (Barbell)', category: 'Back', equipment: 'Barbell' },
  { name: 'Lat Pulldown (V-Bar)', category: 'Back', equipment: 'Cable' },
  { name: 'Chest Supported Row', category: 'Back', equipment: 'Machine' },
  { name: 'Renegade Row', category: 'Back', equipment: 'Dumbbell' },
  { name: 'Yates Row', category: 'Back', equipment: 'Barbell' },
  { name: 'Meadows Row', category: 'Back', equipment: 'Barbell' },

  // LEGS
  { name: 'Back Squat (High Bar)', category: 'Legs', equipment: 'Barbell' },
  { name: 'Back Squat (Low Bar)', category: 'Legs', equipment: 'Barbell' },
  { name: 'Front Squat', category: 'Legs', equipment: 'Barbell' },
  { name: 'Goblet Squat', category: 'Legs', equipment: 'Dumbbell' },
  { name: 'Leg Press', category: 'Legs', equipment: 'Machine' },
  { name: 'Hack Squat', category: 'Legs', equipment: 'Machine' },
  { name: 'Lunges (Walking)', category: 'Legs', equipment: 'Dumbbell' },
  { name: 'Reverse Lunges', category: 'Legs', equipment: 'Dumbbell' },
  { name: 'Bulgarian Split Squat', category: 'Legs', equipment: 'Dumbbell' },
  { name: 'Romanian Deadlift (Barbell)', category: 'Legs', equipment: 'Barbell' },
  { name: 'Romanian Deadlift (Dumbbell)', category: 'Legs', equipment: 'Dumbbell' },
  { name: 'Stiff Leg Deadlift', category: 'Legs', equipment: 'Barbell' },
  { name: 'Leg Extension', category: 'Legs', equipment: 'Machine' },
  { name: 'Leg Curl (Lying)', category: 'Legs', equipment: 'Machine' },
  { name: 'Leg Curl (Seated)', category: 'Legs', equipment: 'Machine' },
  { name: 'Calf Raise (Standing)', category: 'Legs', equipment: 'Machine' },
  { name: 'Calf Raise (Seated)', category: 'Legs', equipment: 'Machine' },
  { name: 'Calf Raise (Leg Press)', category: 'Legs', equipment: 'Machine' },
  { name: 'Hip Thrust (Barbell)', category: 'Legs', equipment: 'Barbell' },
  { name: 'Glute Bridge', category: 'Legs', equipment: 'Bodyweight' },
  { name: 'Step Up', category: 'Legs', equipment: 'Dumbbell' },
  { name: 'Sumo Squat', category: 'Legs', equipment: 'Kettlebell' },
  { name: 'Pistol Squat', category: 'Legs', equipment: 'Bodyweight' },
  { name: 'Adductor Machine', category: 'Legs', equipment: 'Machine' },
  { name: 'Abductor Machine', category: 'Legs', equipment: 'Machine' },
  { name: 'Jefferson Squat', category: 'Legs', equipment: 'Barbell' },
  { name: 'Box Squat', category: 'Legs', equipment: 'Barbell' },
  { name: 'Sissy Squat', category: 'Legs', equipment: 'Bodyweight' },
  { name: 'Glute Ham Raise', category: 'Legs', equipment: 'Machine' },

  // SHOULDERS
  { name: 'Overhead Press (Barbell)', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Overhead Press (Dumbbell)', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Seated Shoulder Press (Barbell)', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Seated Shoulder Press (Dumbbell)', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral Raise (Dumbbell)', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Lateral Raise (Cable)', category: 'Shoulders', equipment: 'Cable' },
  { name: 'Front Raise (Dumbbell)', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Front Raise (Barbell)', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Reverse Fly (Dumbbell)', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Reverse Fly (Machine)', category: 'Shoulders', equipment: 'Machine' },
  { name: 'Upright Row (Barbell)', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Upright Row (Cable)', category: 'Shoulders', equipment: 'Cable' },
  { name: 'Arnold Press', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Push Press', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Military Press', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Rear Delt Row', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Face Pulls', category: 'Shoulders', equipment: 'Cable' },
  { name: 'Kllov Press', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Bradford Press', category: 'Shoulders', equipment: 'Barbell' },

  // ARMS (BICEPS)
  { name: 'Bicep Curl (Dumbbell)', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Bicep Curl (Barbell)', category: 'Arms', equipment: 'Barbell' },
  { name: 'Bicep Curl (EZ Bar)', category: 'Arms', equipment: 'Barbell' },
  { name: 'Hammer Curl (Dumbbell)', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Preacher Curl (Barbell)', category: 'Arms', equipment: 'Barbell' },
  { name: 'Preacher Curl (Dumbbell)', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Concentration Curl', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Spider Curl', category: 'Arms', equipment: 'Barbell' },
  { name: 'Cable Curl (Straight Bar)', category: 'Arms', equipment: 'Cable' },
  { name: 'Cable Curl (Rope)', category: 'Arms', equipment: 'Cable' },
  { name: 'Incline Bench Curl', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Reverse Curl (Barbell)', category: 'Arms', equipment: 'Barbell' },
  { name: 'Zottman Curl', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Drag Curl', category: 'Arms', equipment: 'Barbell' },
  { name: 'Cable Curl (One Arm)', category: 'Arms', equipment: 'Cable' },

  // ARMS (TRICEPS)
  { name: 'Triceps Pushdown (Rope)', category: 'Arms', equipment: 'Cable' },
  { name: 'Triceps Pushdown (Straight Bar)', category: 'Arms', equipment: 'Cable' },
  { name: 'Triceps Extension (Overhead Dumbbell)', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Triceps Extension (Overhead Cable)', category: 'Arms', equipment: 'Cable' },
  { name: 'Skullcrushers (EZ Bar)', category: 'Arms', equipment: 'Barbell' },
  { name: 'Dips (Triceps Focus)', category: 'Arms', equipment: 'Bodyweight' },
  { name: 'Close Grip Bench Press', category: 'Arms', equipment: 'Barbell' },
  { name: 'Triceps Kickback (Dumbbell)', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Triceps Kickback (Cable)', category: 'Arms', equipment: 'Cable' },
  { name: 'Bench Dips', category: 'Arms', equipment: 'Bodyweight' },
  { name: 'Diamond Push Up', category: 'Arms', equipment: 'Bodyweight' },
  { name: 'JM Press', category: 'Arms', equipment: 'Barbell' },
  { name: 'Tate Press', category: 'Arms', equipment: 'Dumbbell' },

  // CORE
  { name: 'Crunch', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Sit Up', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Leg Raise (Hanging)', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Leg Raise (Lying)', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Plank (Standard)', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Side Plank', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Russian Twist', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Cable Crunch', category: 'Core', equipment: 'Cable' },
  { name: 'V-Up', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Bicycle Crunch', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Mountain Climbers', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Woodchopper (Cable)', category: 'Core', equipment: 'Cable' },
  { name: 'Dead Bug', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Bird Dog', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Flutter Kicks', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Hollow Body Hold', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Toes to Bar', category: 'Core', equipment: 'Bodyweight' },
  { name: 'L-Sit', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Ab Wheel Rollout', category: 'Core', equipment: 'None' },
  { name: 'Windshield Wipers', category: 'Core', equipment: 'Bodyweight' },

  // CARDIO
  { name: 'Treadmill (Running)', category: 'Cardio', equipment: 'Machine' },
  { name: 'Treadmill (Walking)', category: 'Cardio', equipment: 'Machine' },
  { name: 'Cycling (Stationary)', category: 'Cardio', equipment: 'Machine' },
  { name: 'Rowing Machine', category: 'Cardio', equipment: 'Machine' },
  { name: 'Elliptical', category: 'Cardio', equipment: 'Machine' },
  { name: 'Stair Stepper', category: 'Cardio', equipment: 'Machine' },
  { name: 'Jump Rope', category: 'Cardio', equipment: 'None' },
  { name: 'Running (Outdoor)', category: 'Cardio', equipment: 'None' },
  { name: 'Swimming', category: 'Cardio', equipment: 'None' },
  { name: 'Boxing (Heavy Bag)', category: 'Cardio', equipment: 'None' },
  { name: 'HIIT Circuit', category: 'Cardio', equipment: 'None' },
  { name: 'Burpees', category: 'Cardio', equipment: 'Bodyweight' },
  { name: 'Jumping Jacks', category: 'Cardio', equipment: 'Bodyweight' },
  { name: 'Box Jumps', category: 'Cardio', equipment: 'Other' },
  { name: 'Battle Ropes', category: 'Cardio', equipment: 'Other' },
  { name: 'Sled Push', category: 'Cardio', equipment: 'Other' },
  { name: 'Assault Bike', category: 'Cardio', equipment: 'Machine' },

  // KETTLEBELL (SPECIFIC)
  { name: 'Kettlebell Swing', category: 'Legs', equipment: 'Kettlebell' },
  { name: 'Kettlebell Snatch', category: 'Shoulders', equipment: 'Kettlebell' },
  { name: 'Kettlebell Clean & Press', category: 'Full Body', equipment: 'Kettlebell' },
  { name: 'Turkish Get Up', category: 'Full Body', equipment: 'Kettlebell' },
  { name: 'Kettlebell Windmill', category: 'Core', equipment: 'Kettlebell' },

  // MEDICINE BALL
  { name: 'Med Ball Slam', category: 'Full Body', equipment: 'Other' },
  { name: 'Med Ball Wall Ball', category: 'Full Body', equipment: 'Other' },
  { name: 'Med Ball Russian Twist', category: 'Core', equipment: 'Other' },

  // FLEXIBILITY / RECOVERY
  { name: 'Foam Rolling (Quads)', category: 'Mobility', equipment: 'Other' },
  { name: 'Foam Rolling (Back)', category: 'Mobility', equipment: 'Other' },
  { name: 'Dynamic Warmup', category: 'Mobility', equipment: 'None' },
  { name: 'Cat-Cow Stretch', category: 'Mobility', equipment: 'None' },
  { name: 'Childs Pose', category: 'Mobility', equipment: 'None' },
  { name: 'Pigeon Stretch', category: 'Mobility', equipment: 'None' },
];

async function main() {
  console.log('Seeding Comprehensive Exercises...');
  
  let seededCount = 0;
  for (const exercise of masterExercises) {
    try {
      await prisma.exercise.upsert({
        where: { name: exercise.name },
        update: {},
        create: exercise,
      });
      seededCount++;
    } catch (err) {
      console.error(`Failed to seed ${exercise.name}:`, err);
    }
  }

  console.log(`Successfully populated ${seededCount} exercises.`);
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
