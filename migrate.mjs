import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update, remove, set } from "firebase/database";

const app = initializeApp({
  databaseURL: "https://gen-lang-client-0473620930-default-rtdb.firebaseio.com",
});
const db = getDatabase(app);

async function run() {
  const [subSnap, chapSnap] = await Promise.all([
    get(ref(db, "subjects")),
    get(ref(db, "chapters"))
  ]);
  
  const subjects = subSnap.val() || {};
  const chapters = chapSnap.val() || {};
  
  let updates = {};
  
  for (const [id, subject] of Object.entries(subjects)) {
    let newSection = 'Other';
    let newName = subject.name;
    
    if (subject.name.includes("Math")) {
      newSection = 'Mathematics';
      newName = 'Mathematics';
    } else if (subject.name.includes("Science -")) {
      newSection = 'Science';
      newName = subject.name.replace("Science - ", "");
    } else if (subject.name === "Hindi") {
      newSection = 'Hindi';
      newName = 'Literature';
    } else if (subject.name.includes("Social Science -")) {
      newSection = 'Social Science (SST)';
      newName = subject.name.replace("Social Science - ", "");
      if (newName === 'Political Science') newName = 'Civics';
    } else if (subject.name === "English") {
      newSection = 'English';
      newName = 'Literature';
    } else if (subject.name === "IT") {
      newSection = 'Information Technology (IT)';
      newName = 'Information Technology';
    }
    
    updates[`subjects/${id}/section`] = newSection;
    updates[`subjects/${id}/name`] = newName;
  }
  
  // Actually apply updates
  await update(ref(db), updates);
  console.log("Migration complete!");
  process.exit(0);
}
run();
