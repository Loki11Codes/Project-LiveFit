import { extractAndCleanLogData } from './src/lib/chat-utils';

const text = `
Great! Your breakfast of 2 boiled eggs and 200ml milk has been logged.
|||DATA
{
  "category": "food",
  "items": [
    { "name": "Boiled Egg", "protein": 14, "kcal": 140, "carbs": 0, "fats": 10, "fiber": 0, "date": "2026-04-03" },
    { "name": "Milk 200ml", "protein": 6.2, "kcal": 116, "carbs": 9.4, "fats": 6.4, "fiber": 0, "date": "2026-04-03" }
  ]
}
|||
`;

const res = extractAndCleanLogData(text);
console.log(JSON.stringify(res, null, 2));
