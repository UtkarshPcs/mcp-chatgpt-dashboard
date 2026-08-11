import { initializeApp } from "firebase/app";
import { getDatabase, ref, remove } from "firebase/database";

const app = initializeApp({
  databaseURL: "https://gen-lang-client-0473620930-default-rtdb.firebaseio.com",
});
const db = getDatabase(app);

async function run() {
  await Promise.all([
    remove(ref(db, "subjects")),
    remove(ref(db, "chapters")),
    remove(ref(db, "recommendation"))
  ]);
  console.log("Database wiped successfully!");
  process.exit(0);
}
run();
