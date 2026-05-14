require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected 🚀"))
  .catch((err) => console.log("MongoDB Error:", err.message));

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("InterviewFlow AI Backend Running 🚀");
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error.message);

    res.status(500).json({
      message: "Registration failed",
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET || "interviewflow_secret",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error.message);

    res.status(500).json({
      message: "Login failed",
    });
  }
});

app.post("/question", async (req, res) => {
  const {
    role = "Developer",
    difficulty = "Medium",
    category = "General",
  } = req.body || {};

  try {
    const prompt = `
Generate ONLY ONE interview question.

Rules:
- Keep it short
- Maximum 1-2 lines
- No explanation
- No bullet points
- No extra text
- No examples
- No markdown
- Just the question

Role: ${role}
Difficulty: ${difficulty}
Category: ${category}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      question: response.text || "Tell me about yourself.",
    });
  } catch (error) {
    console.log("QUESTION ERROR:", error.message || error);

    const fallbackQuestions = [
      `For a ${role} developer, explain the difference between synchronous and asynchronous JavaScript.`,
      "Describe a technical decision where you had to balance performance and readability.",
      "How would you optimize a slow web application?",
      "Explain the difference between stack and heap memory.",
      "What is RAII in C++ and why is it important?",
    ];

    const randomQuestion =
      fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

    res.json({
      question: randomQuestion,
    });
  }
});

app.post("/feedback", async (req, res) => {
  try {
    const { question, answer } = req.body;

    const prompt = `
You are an AI interview evaluator.

Question: ${question}
Candidate Answer: ${answer}

Give response in this exact format:

Score: x/10

Feedback:
2-3 short lines

Improved Answer:
short improved answer

Keep response clean, short, and easy to read.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      feedback: response.text,
    });
  } catch (error) {
    console.log("FEEDBACK ERROR:", error.message || error);

    res.json({
      feedback: `Score: 7/10

Feedback:
Good attempt. Your answer covers the basic idea, but it needs more specific technical details and examples.

Improved Answer:
I would first understand the problem, reproduce it, debug the root cause, and then fix it using proper technical practices. After that, I would test the solution with edge cases to make sure it is stable.`,
    });
  }
});

app.post("/analyze-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({
        analysis: "No resume file uploaded.",
      });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text.slice(0, 6000);

    const prompt = `
Analyze this resume and give:

1. Overall Resume Score out of 10
2. Strengths
3. Weaknesses
4. Missing Skills
5. Best Suitable Job Roles
6. 3 interview questions based on this resume

Keep it short and useful.

Resume:
${resumeText}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      analysis: response.text,
    });
  } catch (error) {
    console.log("RESUME ERROR:", error.message || error);

    res.json({
      analysis: "Resume analysis failed. Try again later.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});