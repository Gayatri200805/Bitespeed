import express, { Request, Response } from "express";
import { identifyContact } from "./identify";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "BiteSpeed Identity Reconciliation Service",
    status: "running",
    endpoint: "POST /identify",
  });
});

// Main identify endpoint
app.post("/identify", async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "At least one of email or phoneNumber must be provided",
      });
    }

    const result = await identifyContact({
      email: email || null,
      phoneNumber: phoneNumber ? String(phoneNumber) : null,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in /identify:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
