import db from "../db";
import callStrapi from "./callStrapi";
import { AuthMutation } from "./queries";

async function auth() {
  db.push(".jwt", undefined);
  console.log("Authorizing ...");
  const data = await callStrapi(AuthMutation);
  const jwt = data?.login?.jwt;
  if (jwt) {
    console.log("📗 \u001b[1;32m Authorized successfully!");
    db.push(".jwt", jwt);
    return;
  }
  console.error("📙 \u001b[1;33m couldn't authtorize, restarting in 10s...");
  await new Promise((resolve) => setTimeout(resolve, 10000));
  await auth();
}

// const initJWT = async (): Promise<string | undefined> => {
//   db.push(".jwt", undefined); //чистим старый токен
//   const data = await callStrapi(AuthMutation);
//   if (!data) {
//     console.log(
//       "📙 \u001b[1;33m  Still waiting for connection, retrying in 25s..."
//     );
//     setTimeout(() => initJWT(), 25000);
//     return;
//   }
//   const jwt = data?.login?.jwt;
//   if (jwt) {
//     console.log("📗 \u001b[1;32m Authorized successfully!");
//     db.push(".jwt", jwt);
//     db.save();
//     return jwt;
//   }
//   console.error("📙 \u001b[1;33m couldn't authtorize");
//   return;
// };

export default auth;
