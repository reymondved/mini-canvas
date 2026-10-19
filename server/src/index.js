// Starts the server. (The app itself is built in app.js.)
import { app } from './app.js';

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
