
import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import seedDefaultCategories from "./src/utils/seedDefaultCategories.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await seedDefaultCategories();

    app.listen(PORT, () => {
      console.log(`HealthyBite server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
