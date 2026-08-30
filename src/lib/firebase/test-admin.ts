import { getFirebaseAdminAuth } from "./admin";

async function test() {
  try {
    const auth = getFirebaseAdminAuth();

    const users = await auth.listUsers(1);

    console.log(
      "Firebase Admin connection: OK"
    );

    console.log(
      "Firebase users found:",
      users.users.length
    );
  } catch (error) {
    console.error(
      "Firebase Admin connection failed:",
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode = 1;
  }
}

test();