import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

const app = initializeApp({
  databaseURL: "https://gen-lang-client-0473620930-default-rtdb.firebaseio.com",
});
const db = getDatabase(app);

async function run() {
  const [subSnap] = await Promise.all([
    get(ref(db, "subjects"))
  ]);
  
  const subjects = subSnap.val() || {};
  let updates = {};
  
  for (const [id, subject] of Object.entries(subjects)) {
    let newSection = subject.section;
    let newName = subject.name;
    
    if (["Chemistry", "Biology", "Physics"].includes(subject.name)) {
      newSection = "Science";
    } else if (["History", "Geography", "Economics", "Political Science"].includes(subject.name)) {
      newSection = "Social Science (SST)";
      if (newName === 'Political Science') newName = 'Civics';
    }
    
    updates[`subjects/${id}/section`] = newSection;
    updates[`subjects/${id}/name`] = newName;
  }
  
  await update(ref(db), updates);
  console.log("Remigrated!");
  process.exit(0);
}
run();
