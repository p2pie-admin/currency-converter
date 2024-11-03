import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig";
import { IDB } from "../types/db";
import { initialDB } from "./initialDB";

const db = new JsonDB(new Config("db", false, true, ".")); // save after each push = false, readable = true
if (!Object.keys(db.getObject<IDB>(".")).length) {
  db.resetData({});
  db.push(".", initialDB); // initialization
  db.save();
}

export default db;
