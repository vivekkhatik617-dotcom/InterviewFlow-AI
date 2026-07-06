require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const pdfParse = require("pdf-parse");
console.log("PDF PARSE =", pdfParse);
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

async function generateWithRetry(prompt, retry = 3) {
    for (let i = 0; i < retry; i++) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            return response.text;

        } catch (err) {

            const msg = err.message || "";

            if (msg.includes("503") || msg.includes("429")) {
                console.log(`Gemini Busy... Retry ${i + 1}`);

                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
            }

            throw err;
        }
    }

    throw new Error("Gemini Busy");
}

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

        const analysis = await generateWithRetry(prompt);

        res.json({
            analysis: JSON.parse(analysis)
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

Question:
${question}

Candidate Answer:
${answer}

Evaluate the answer and respond ONLY in this format:

Overall Score: X/10

Technical Accuracy:
X/10

Communication:
X/10

Strengths:
• point 1
• point 2

Weaknesses:
• point 1
• point 2

Missing Points:
• point 1
• point 2

Improved Answer:
(short improved answer)

Interview Tip:
(one short practical tip)

Keep the feedback concise and professional.
`;

        const analysis = await generateWithRetry(prompt);

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

console.log("Resume route hit ✅");

app.post("/analyze-resume", upload.single("resume"), async (req, res) => {

    console.log("Resume route hit ✅");
    console.log(req.file);
    console.log(req.file?.originalname);

    try {
        if (!req.file) {
            return res.status(400).json({
                analysis: "Please upload a PDF resume."
            });
        }

        const pdfData = await pdfParse(req.file.buffer);
        const resumeText = pdfData.text;

        const prompt = `
You are an ATS Resume Expert.

Analyze the following resume.

Resume:
${resumeText}

Return ONLY in this format:

📄 Resume Score: X/10

✅ Strong Skills
• ...

❌ Missing Skills
• ...

💼 Best Suitable Roles
• ...

📈 ATS Compatibility
XX%

🎯 Improvement Suggestions
• ...
• ...
• ...
Return ONLY valid JSON in this format:

{
  "score": 0,
  "strongSkills": [],
  "missingSkills": [],
  "bestRoles": [],
  "ats": 0,
  "suggestions": []
}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        res.json({
            analysis: response.text || "Resume analysis failed."
        });

    } catch (error) {
        console.log("RESUME ERROR:", error.message);

        res.status(500).json({
            analysis: "🤖 AI server abhi busy hai.\n\n20–30 seconds baad dubara try karein."
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