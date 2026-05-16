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
        name: String,
        email: { type: String, unique: true },
        password: String,
    },
    { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

const InterviewSchema = new mongoose.Schema(
    {
        userId: String,
        question: String,
        answer: String,
        feedback: String,
        score: Number,
        timeTaken: Number,
    },
    { timestamps: true }
);

const Interview = mongoose.model("Interview", InterviewSchema);

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
    res.send("InterviewFlow AI Backend Running 🚀");
});

app.get("/api/test", (req, res) => {
    res.json({ message: "API working ✅" });
});

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        res.json({
            success: true,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.log("REGISTER ERROR:", error.message);
        res.status(500).json({ message: "Registration failed" });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "interview_secret",
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.log("LOGIN ERROR:", error.message);
        res.status(500).json({ message: "Login failed" });
    }
});

app.post("/api/save-interview", async (req, res) => {
    try {
        const interview = await Interview.create(req.body);

        res.json({
            success: true,
            interview,
        });
    } catch (error) {
        console.log("SAVE INTERVIEW ERROR:", error.message);
        res.status(500).json({ message: "Interview save failed" });
    }
});

app.post("/api/interviews", async (req, res) => {
    try {
        const interview = await Interview.create(req.body);

        res.json({
            success: true,
            interview,
        });
    } catch (error) {
        console.log("SAVE INTERVIEW ERROR:", error.message);
        res.status(500).json({ message: "Interview save failed" });
    }
});

app.get("/api/interviews/:userId", async (req, res) => {
    try {
        const interviews = await Interview.find({
            userId: req.params.userId,
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            interviews,
        });
    } catch (error) {
        console.log("GET INTERVIEWS ERROR:", error.message);
        res.status(500).json({
            success: false,
            interviews: [],
        });
    }
});

app.post("/question", async (req, res) => {
    try {
        const { role, difficulty, category } = req.body;

        const prompt = `
Generate ONLY ONE interview question.

Role: ${role}
Difficulty: ${difficulty}
Category: ${category}

Rules:
- Short
- Professional
- No explanation
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        res.json({
            question: response.text || "Tell me about yourself.",
        });
    } catch (error) {
        console.log("QUESTION ERROR:", error.message);
        res.json({
            question: "Explain the difference between null and undefined.",
        });
    }
});

app.post("/feedback", async (req, res) => {
    try {
        const { question, answer } = req.body;

        const prompt = `
Question:
${question}

Candidate Answer:
${answer}

Give:

Score: x/10

Feedback:
2 short lines

Improved Answer:
short improved answer
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        res.json({ feedback: response.text });
    } catch (error) {
        console.log("FEEDBACK ERROR:", error.message);
        res.json({
            feedback: "Score: 7/10\n\nGood answer but add more technical details.",
        });
    }
});

app.post("/analyze-resume", upload.single("resume"), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ analysis: "No resume uploaded." });
        }

        const pdfData = await pdfParse(req.file.buffer);
        const resumeText = pdfData.text.slice(0, 5000);

        const prompt = `
Analyze this resume.

Give:
1. Resume score
2. Strengths
3. Weaknesses
4. Missing skills
5. Best job roles

Resume:
${resumeText}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        res.json({ analysis: response.text });
    } catch (error) {
        console.log("RESUME ERROR:", error.message);
        res.json({ analysis: "Resume analysis failed." });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});