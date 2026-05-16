const API_URL = "http://localhost:3000";

let totalTime = 120;
let currentQuestion = "";
let timeLeft = 120;
let timerInterval;
let timeTaken = 0;
let scoreChartInstance = null;

function typeText(element, text, speed = 10) {
    text = String(text || "");
    element.textContent = "";

    let i = 0;

    const timer = setInterval(() => {
        element.textContent += text.charAt(i);
        i++;

        if (i >= text.length) {
            clearInterval(timer);
        }
    }, speed);
}

function getSavedUser() {
    return JSON.parse(localStorage.getItem("user"));
}

async function getQuestion() {
    const role = document.getElementById("role").value;
    const difficulty = document.getElementById("difficulty").value;
    const category = document.getElementById("category").value;
    const questionText = document.getElementById("questionText");

    questionText.innerHTML = `<div class="loader"></div>`;

    const status =
        document.querySelector(".interview-status");

    if (status) {
        status.innerHTML =
            "🤖 AI is generating question...";
    }

    startTimer();

    try {
        const response = await fetch(`${API_URL}/question`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                role,
                difficulty,
                category,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.question) {
            questionText.innerText = "Question generate nahi hua.";
            return;
        }

        currentQuestion = data.question;
        typeText(questionText, data.question);
        if (status) {
            status.innerHTML =
                "🎤 AI asked a question";
        }

    } catch (error) {
        questionText.innerText =
            "Server issue hai. Thodi der baad try karo.";
        console.log(error);
    }
}

function startTimer() {
    clearInterval(timerInterval);

    const difficulty = document.getElementById("difficulty").value;

    if (difficulty === "Easy") {
        totalTime = 120;
    } else if (difficulty === "Medium") {
        totalTime = 300;
    } else {
        totalTime = 480;
    }

    timeLeft = totalTime;
    timeTaken = 0;
    updateTimer();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimer();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timeTaken = totalTime;
            alert("Time up! Now submit your answer.");
        }
    }, 1000);
}

function updateTimer() {
    const timer = document.getElementById("timer");

    if (!timer) return;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timer.textContent = `${String(minutes).padStart(2, "0")}:${String(
        seconds
    ).padStart(2, "0")}`;
}

const progressBar =
    document.getElementById("progressBar");

if (progressBar) {

    const progress =
        (timeLeft / totalTime) * 100;

    progressBar.style.width =
        `${progress}%`;
}

async function getFeedback() {
    const answerBox = document.getElementById("answer");
    const answer = answerBox.value;
    const feedbackText = document.getElementById("feedbackText");

    if (!currentQuestion) {
        alert("First generate a question.");
        return;
    }

    if (!answer.trim()) {
        alert("Please write your answer.");
        return;
    }

    clearInterval(timerInterval);
    timeTaken = totalTime - timeLeft;

    feedbackText.innerHTML = `<div class="loader"></div>`;

    try {
        const response = await fetch(`${API_URL}/feedback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                question: currentQuestion,
                answer,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.feedback) {
            feedbackText.innerText = "Feedback generate nahi hua.";
            return;
        }

        typeText(feedbackText, data.feedback);

        await saveInterview(
            currentQuestion,
            answer,
            data.feedback,
            timeTaken
        );

        await loadHistory();
        await loadUserProfile();
        await generatePerformanceReport();
        await loadAnalyticsChart();
    } catch (error) {
        feedbackText.innerText = "Feedback failed.";
        console.log(error);
    }
}

async function saveInterview(question, answer, feedback, timeTaken) {
    const savedUser = getSavedUser();

    if (!savedUser) {
        console.log("No user found");
        return;
    }

    const scoreMatch = feedback.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

    try {
        const response = await fetch(`${API_URL}/api/save-interview`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: savedUser.id,
                question,
                answer,
                feedback,
                score,
                timeTaken,
            }),
        });

        const data = await response.json();

        console.log("Interview Saved ✅", data);
    } catch (error) {
        console.log("SAVE ERROR:", error);
    }
}

async function loadHistory() {
    const savedUser = getSavedUser();

    if (!savedUser) return;

    const historyList = document.getElementById("historyList");
    const avgScore = document.getElementById("avgScore");
    const bestScore = document.getElementById("bestScore");

    if (!historyList || !avgScore || !bestScore) return;

    try {
        const response = await fetch(
            `${API_URL}/api/interviews/${savedUser.id}`
        );

        const data = await response.json();
        const history = data.interviews || [];

        historyList.innerHTML = "";

        if (history.length === 0) {
            historyList.innerHTML = `
    <div class="empty-state">
        <h3>🚀 No Interviews Yet</h3>
        <p>Start your first AI mock interview now.</p>
    </div>
`;
            avgScore.textContent = "0";
            bestScore.textContent = "0";
            return;
        }

        let total = 0;
        let best = 0;

        history.forEach((item) => {
            total += item.score || 0;

            if ((item.score || 0) > best) {
                best = item.score || 0;
            }

            historyList.innerHTML += `
                <div class="history-card">
                    <h3>⭐ Score: ${item.score || 0}/10</h3>

              <div class="history-date">
                 ${new Date(item.createdAt).toLocaleString()}
            </div>
                    <p>
                        ⏱️ Time Taken:
                        ${formatTime(item.timeTaken || 0)}
                    </p>

                    <p>
                        <b>Question:</b>
                        ${(item.question || "").substring(0, 80)}...
                    </p>

                    <p>
                        <b>Your Answer:</b>
                        ${(item.answer || "").substring(0, 100)}...
                    </p>


                    <button onclick='showDetails(
    ${JSON.stringify(item.question || "")},
    ${JSON.stringify(item.answer || "")},
    ${JSON.stringify(item.feedback || "")}
)'>
    View Details
</button>

                </div>
            `;
        });

        document.querySelectorAll(".details-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                showDetails(
                    decodeURIComponent(btn.dataset.question),
                    decodeURIComponent(btn.dataset.answer),
                    decodeURIComponent(btn.dataset.feedback)
                );
            });
        });

        avgScore.textContent = (total / history.length).toFixed(1);
        bestScore.textContent = best;
    } catch (error) {
        console.log("LOAD HISTORY ERROR:", error);
        historyList.innerHTML = "<p>Failed to load history.</p>";
    }
}

async function generatePerformanceReport() {
    const savedUser = getSavedUser();

    if (!savedUser) return;

    const report = document.getElementById("performanceReport");

    if (!report) return;

    try {
        const response = await fetch(
            `${API_URL}/api/interviews/${savedUser.id}`
        );

        const data = await response.json();
        const history = data.interviews || [];

        if (history.length === 0) {
            report.innerHTML = "No interview data available.";
            return;
        }

        let total = 0;

        history.forEach((item) => {
            total += item.score || 0;
        });

        const avg = total / history.length;

        let communication = "";
        let technical = "";
        let confidence = "";
        let recommendation = "";

        if (avg >= 8) {
            communication = "Excellent";
            technical = "Strong";
            confidence = "High";
            recommendation = "Highly Recommended ✅";
        } else if (avg >= 5) {
            communication = "Good";
            technical = "Moderate";
            confidence = "Average";
            recommendation = "Recommended 👍";
        } else {
            communication = "Needs Improvement";
            technical = "Weak";
            confidence = "Low";
            recommendation = "Practice More ❌";
        }

        report.innerHTML = `
            <p>🗣️ Communication Skills: <b>${communication}</b></p>
            <p>💻 Technical Knowledge: <b>${technical}</b></p>
            <p>🔥 Confidence Level: <b>${confidence}</b></p>
            <p>📊 Average Score: <b>${avg.toFixed(1)}/10</b></p>
            <p>🎯 Final Recommendation: <b>${recommendation}</b></p>
        `;
    } catch (error) {
        console.log("REPORT ERROR:", error);
    }
}

async function clearHistory() {
    alert("Database history clear feature abhi add nahi hua.");
}

function showDetails(question, answer, feedback) {
    alert(
        `QUESTION:

${question}

--------------------------------

ANSWER:

${answer}

--------------------------------

FEEDBACK:

${feedback}`
    );
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function showLoggedInUser() {
    const user = getSavedUser();

    const userName = document.getElementById("userName");
    const heroUser = document.getElementById("heroUser");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");

    if (!user) return;

    if (userName) userName.textContent = `Welcome ${user.name}`;
    if (heroUser) heroUser.textContent = user.name;
    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email;
}

function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

async function loadUserProfile() {
    const user = getSavedUser();

    if (!user) return;

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileTotal = document.getElementById("profileTotal");
    const profileAvg = document.getElementById("profileAvg");
    const profileBest = document.getElementById("profileBest");
    const profileTime = document.getElementById("profileTime");

    if (profileName) profileName.textContent = user.name || "User";
    if (profileEmail) profileEmail.textContent = user.email || "Not available";

    try {
        const response = await fetch(
            `${API_URL}/api/interviews/${user.id}`
        );

        const data = await response.json();
        const history = data.interviews || [];

        let totalScore = 0;
        let bestScore = 0;
        let totalTime = 0;

        history.forEach((item) => {
            totalScore += item.score || 0;
            bestScore = Math.max(bestScore, item.score || 0);
            totalTime += item.timeTaken || 0;
        });

        if (profileTotal) profileTotal.textContent = history.length;
        if (profileAvg) {
            profileAvg.textContent = history.length
                ? (totalScore / history.length).toFixed(1)
                : "0";
        }
        if (profileBest) profileBest.textContent = bestScore;
        if (profileTime) profileTime.textContent = formatTime(totalTime);
    } catch (error) {
        console.log("PROFILE ERROR:", error);
    }
}

async function loadAnalyticsChart() {
    const user = getSavedUser();

    if (!user) return;

    const chartCanvas = document.getElementById("scoreChart");

    if (!chartCanvas) return;

    try {
        const response = await fetch(
            `${API_URL}/api/interviews/${user.id}`
        );

        const data = await response.json();
        const history = data.interviews || [];

        const labels = history
            .slice()
            .reverse()
            .map((_, index) => `Interview ${index + 1}`);

        const scores = history
            .slice()
            .reverse()
            .map((item) => item.score || 0);

        if (scoreChartInstance) {
            scoreChartInstance.destroy();
        }

        scoreChartInstance = new Chart(chartCanvas, {
            type: "line",

            data: {
                labels,
                datasets: [
                    {
                        label: "Interview Scores",
                        data: scores,
                        borderColor: "#38bdf8",
                        backgroundColor: "rgba(56,189,248,0.2)",
                        tension: 0.4,
                        fill: true,
                    },
                ],
            },

            options: {
                responsive: true,

                plugins: {
                    legend: {
                        labels: {
                            color: "white",
                        },
                    },
                },

                scales: {
                    x: {
                        ticks: {
                            color: "white",
                        },
                    },

                    y: {
                        ticks: {
                            color: "white",
                        },
                        beginAtZero: true,
                        max: 10,
                    },
                },
            },
        });
    } catch (error) {
        console.log("CHART ERROR:", error);
    }
}

function toggleTheme() {
    document.body.classList.toggle("light-mode");

    const isLight = document.body.classList.contains("light-mode");

    localStorage.setItem("theme", isLight ? "light" : "dark");
}

function loadTheme() {
    const theme = localStorage.getItem("theme");

    if (theme === "light") {
        document.body.classList.add("light-mode");
    }
}

async function analyzeResume() {
    const fileInput = document.getElementById("resumeFile");
    const result = document.getElementById("resumeResult");

    if (!fileInput.files.length) {
        alert("Please upload a PDF resume.");
        return;
    }

    const formData = new FormData();
    formData.append("resume", fileInput.files[0]);

    result.innerHTML = `<div class="loader"></div>`;

    try {
        const response = await fetch(`${API_URL}/analyze-resume`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        result.innerText = data.analysis;
    } catch (error) {
        result.innerText = "Resume analysis failed.";
        console.log(error);
    }
}

function speakQuestion() {
    if (!currentQuestion) {
        alert("Generate a question first");
        return;
    }

    const speech = new SpeechSynthesisUtterance(currentQuestion);
    speech.lang = "en-US";
    speech.rate = 1;

    window.speechSynthesis.speak(speech);
}

function startVoiceInput() {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.onstart = () => {
        alert("Listening... Speak now 🎤");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById("answer").value = transcript;
    };

    recognition.onerror = (event) => {
        console.log(event.error);
        alert("Voice recognition error");
    };

    recognition.start();
}

async function downloadReportPDF() {
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    const user = getSavedUser() || {};

    doc.setFont("helvetica");
    doc.setFontSize(20);
    doc.text("InterviewFlow AI Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`User: ${user.name || "User"}`, 20, 35);

    try {
        const response = await fetch(
            `${API_URL}/api/interviews/${user.id}`
        );

        const data = await response.json();
        const history = data.interviews || [];

        doc.text(`Total Interviews: ${history.length}`, 20, 45);

        let y = 60;

        history.slice(0, 5).forEach((item, index) => {
            doc.setFontSize(14);
            doc.text(`Interview ${index + 1}`, 20, y);

            y += 10;

            doc.setFontSize(11);
            doc.text(`Score: ${item.score || 0}/10`, 20, y);
            y += 8;

            doc.text(
                `Time Taken: ${formatTime(item.timeTaken || 0)}`,
                20,
                y
            );

            y += 10;

            const question = doc.splitTextToSize(
                `Question: ${item.question || ""}`,
                160
            );

            doc.text(question, 20, y);
            y += question.length * 7;

            const answer = doc.splitTextToSize(
                `Answer: ${item.answer || ""}`,
                160
            );

            doc.text(answer, 20, y);
            y += answer.length * 7 + 12;

            if (y > 260) {
                doc.addPage();
                y = 20;
            }
        });

        doc.save("InterviewFlow-AI-Report.pdf");
    } catch (error) {
        console.log("PDF ERROR:", error);
        alert("PDF download failed.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    loadTheme();
    showLoggedInUser();
    await loadHistory();
    await generatePerformanceReport();
    await loadUserProfile();
    await loadAnalyticsChart();
});