import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const app = initializeApp({
  databaseURL: "https://gen-lang-client-0473620930-default-rtdb.firebaseio.com",
});
const db = getDatabase(app);

async function run() {
  const [subSnap, chapSnap] = await Promise.all([
    get(ref(db, "subjects")),
    get(ref(db, "chapters"))
  ]);
  
  console.log("Subjects:");
  console.dir(subSnap.val(), {depth: null});
  process.exit(0);
}
run();
