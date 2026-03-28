import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4174);

createApp().listen(port, () => {
  console.log(`Web server listening on http://127.0.0.1:${port}`);
});
