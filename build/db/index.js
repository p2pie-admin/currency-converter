"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_json_db_1 = require("node-json-db");
const JsonDBConfig_1 = require("node-json-db/dist/lib/JsonDBConfig");
const initialDB_1 = require("./initialDB");
const db = new node_json_db_1.JsonDB(new JsonDBConfig_1.Config("db", false, true, ".")); // save after each push = false, readable = true
if (!Object.keys(db.getObject(".")).length) {
    db.resetData({});
    db.push(".", initialDB_1.initialDB); // initialization
    db.save();
}
exports.default = db;
