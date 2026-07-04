require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenAI } = require("@google/genai");

const { createClient } = require('@supabase/supabase-js');

const app = express();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);
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

        console.log("DATA AA RHA HAI:", req.body);

        const { data, error } = await supabase
            .from("interview_history")
            .insert([req.body])
            .select();

        if (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            interview: data
        });

    } catch (error) {
        console.log("SAVE INTERVIEW ERROR:", error.message);
        res.status(500).json({
            success: false
        });
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

        const { data, error } = await supabase
            .from("interview_history")
            .select("*")
            .eq("userId", req.params.userId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            interviews: data
        });

    } catch (error) {
        console.log("GET INTERVIEWS ERROR:", error.message);

        res.status(500).json({
            success: false,
            interviews: []
        });
    }
});
app.post("/question", async (req, res) => {
    try {
        const { branch, role, difficulty, category } = req.body;

        const prompt = `
Generate ONLY ONE interview question.

Branch: ${branch}
Role: ${role}
Difficulty: ${difficulty}
Category: ${category}

Rules:

If branch is Electrical Engineering,
generate only Electrical Engineering interview questions.

If branch is Computer Science,
generate only Computer Science interview questions.

If branch is Mechanical Engineering,
generate only Mechanical Engineering interview questions.

If branch is Civil Engineering,
generate only Civil Engineering interview questions.

If branch is Electronics & Communication,
generate only ECE interview questions.

If branch is Human Resources,
generate only HR interview questions.

Return only one interview question.
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

        if (!question || !answer) {
            return res.status(400).json({
                feedback: "Score: 0/10\n\nFeedback:\nQuestion ya answer missing hai.\n\nImproved Answer:\nPlease answer the question properly.",
            });
        }

        const prompt = `
You are an expert technical interviewer.

Generate ONLY ONE interview question.

Selected Details:

Rules:

1. Question MUST belong to the selected Branch.

2. Question MUST belong to the selected Role.

3. Question MUST belong to the selected Category.

4. Never ask questions from another branch.

5. Never mix categories.

Examples:

Electrical Engineering
- Power System → Relay, Circuit Breaker, Fault Analysis, Protection
- Electrical Machines → Transformer, Motor, Generator
- Network Theory → KCL, KVL, Thevenin, Norton
- Control System → Stability, Root Locus, Bode Plot
- Power Electronics → Rectifier, Inverter, Chopper
- Measurements → Instruments, Errors, Sensors

Computer Science
- Frontend → HTML, CSS, JavaScript
- Backend → Node.js, Express, APIs
- React → Hooks, State, Props
- Java → OOP, Collections
- Python → Functions, OOP
- DSA → Trees, Graphs, Arrays
- System Design → Scalability, Load Balancer

Mechanical Engineering
- Thermodynamics
- SOM
- Fluid Mechanics
- Heat Transfer
- Manufacturing

Civil Engineering
- RCC
- Surveying
- Transportation
- Geotechnical

Electronics & Communication
- Digital Electronics
- Analog Electronics
- Signals & Systems
- Communication Systems
- Microprocessors

Human Resources
- Recruitment
- HR Policies
- Employee Relations

Marketing
- Digital Marketing
- SEO
- Branding
- Social Media Marketing

Finance
- Accounting
- Taxation
- Financial Management
- Investment

Generate ONLY ONE interview question.

Return ONLY the question.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        res.json({
            success: true,
            feedback: response.text || "Score: 0/10\n\nFeedback:\nNo feedback generated.\n\nImproved Answer:\nTry again.",
        });
    } catch (error) {
        console.log("FEEDBACK ERROR:", error.message);
        res.status(500).json({
            success: false,
            feedback: "Score: 0/10\n\nFeedback:\nFeedback failed due to server error.\n\nImproved Answer:\nPlease try again.",
        });
    }
});

app.delete("/api/interviews/:userId", async (req, res) => {
    try {

        const { error } = await supabase
            .from("interview_history")
            .delete()
            .eq("userId", req.params.userId);

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false
        });
    }
});
app.get("/test-supabase", async (req, res) => {

    const { data, error } = await supabase
        .from("user")
        .insert([
            {
                name: "Vivek Test",
                email: "test@test.com"
            }
        ])
        .select();

    if (error) {
        return res.json(error);
    }

    res.json(data);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});