const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
    res.send("InterviewFlow AI Backend Running 🚀");
});

app.post("/question", async (req, res) => {
    const { role = "Developer", difficulty = "Medium" } = req.body || {};

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
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        res.json({
            question: response.text || "Tell me about yourself."
        });

    } catch (error) {
        console.log("QUESTION ERROR:", error.message || error);

        const fallbackQuestions = [
            `For a ${role} developer, explain the difference between synchronous and asynchronous JavaScript.`,
            "Describe a technical decision where you had to balance performance and readability.",
            "How would you optimize a slow web application?",
            "Explain the difference between stack and heap memory.",
            "What is RAII in C++ and why is it important?"
        ];

        const randomQuestion =
            fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

        res.json({
            question: randomQuestion
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
I would first understand the problem, reproduce it, debug the root cause, and then fix it using proper technical practices. After that, I would test the solution with edge cases to make sure it is stable.`
        });
    }
});

app.listen(3000, () => {
    console.log("Server running on https://interviewflow-ai-t2yn.onrender.com");
});