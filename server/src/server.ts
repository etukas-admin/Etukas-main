import { env } from "./config/env.js";
import { createApp } from "./express-app.js";

const app = createApp();

app.listen(env.SERVER_PORT, () => {
  console.log(`Etukas API listening on http://localhost:${env.SERVER_PORT}`);
});
