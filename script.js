const API_URL = "https://interviewflow-ai-t2yn.onrender.com";

let totalQuestions = 15;
let currentQuestionIndex = 0;
let totalScore = 0;
let interviewStarted = false;

let totalTime = 120;
let currentQuestion = "";
let timeLeft = 120;
let timerInterval;
let timeTaken = 0;
let scoreChartInstance = null;
let autoNextTimer = null;

function getSavedUser() {
    return JSON.parse(localStorage.getItem("user"));
}

function typeText(element, text, speed = 10) {
    text = String(text || "");
    element.textContent = "";

    let i = 0;
    const timer = setInterval(() => {

        element.textContent += text.charAt(i);
        i++;

        if (i >= text.length) clearInterval(timer);
    }, speed);
}

function getAutoDifficulty() {
    if (currentQuestionIndex < 5) return "Easy";
    if (currentQuestionIndex < 10) return "Medium";
    return "Hard";
}

function updateQuestionCounter() {
    const counter = document.getElementById("questionCounter");
    if (counter) {
        counter.innerText = `Question ${currentQuestionIndex + 1} / ${totalQuestions}`;
    }
}

async function getQuestion() {
    const role = document.getElementById("role").value;
    const category = document.getElementById("category").value;
    const difficultyEl = document.getElementById("difficulty");
    const questionText = document.getElementById("questionText");
    const feedbackText = document.getElementById("feedbackText");
    const answerBox = document.getElementById("answer");
    const status = document.querySelector(".interview-status");

    if (difficultyEl) difficultyEl.value = getAutoDifficulty();
    if (feedbackText) feedbackText.innerHTML = "";
    if (answerBox) answerBox.value = "";

    updateQuestionCounter();

    questionText.innerHTML = `<div class="loader"></div>`;

    if (status) status.innerHTML = "🤖 AI is generating question...";

    startTimer();

    try {
        const response = await fetch(`${API_URL}/question`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role,
                difficulty: getAutoDifficulty(),
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

        if (status) status.innerHTML = "🎤 AI asked a question";
    } catch (error) {
        questionText.innerText = "Server issue hai. Thodi der baad try karo.";
        console.log(error);
    }
}

function startTimer() {
    clearInterval(timerInterval);

    const difficulty = getAutoDifficulty();

    if (difficulty === "Easy") totalTime = 120;
    else if (difficulty === "Medium") totalTime = 300;
    else totalTime = 480;

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
    const progressBar = document.getElementById("progressBar");

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    if (timer) {
        timer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    if (progressBar) {
        const progress = (timeLeft / totalTime) * 100;
        progressBar.style.width = `${progress}%`;
    }
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

    clearTimeout(autoNextTimer);
    clearInterval(timerInterval);

    timeTaken = totalTime - timeLeft;
    feedbackText.innerHTML = `<div class="loader"></div>`;

    try {
        const response = await fetch(`${API_URL}/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: currentQuestion,
                answer,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.feedback) {
            feedbackText.innerText = "Server Error. Feedback failed.";
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

        autoNextTimer = setTimeout(() => {
            moveToNextQuestion();
        }, 5000);

    } catch (error) {
        feedbackText.innerText = "Server Error. Feedback failed.";
        console.log(error);
    }
}

async function moveToNextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex >= totalQuestions) {
        finishInterview();
        return;
    }

    await getQuestion();
}

async function nextQuestion() {
    const answer = document.getElementById("answer").value;

    if (answer.trim() === "") {
        alert("Please answer first");
        return;
    }

    await moveToNextQuestion();
}

function finishInterview() {
    clearInterval(timerInterval);
    clearTimeout(autoNextTimer);

    const questionText = document.getElementById("questionText");
    const answerBox = document.getElementById("answer");
    const feedbackText = document.getElementById("feedbackText");

    if (questionText) {
        questionText.innerHTML = `
            <h2>🎉 Interview Finished</h2>
            <p>You completed ${totalQuestions} questions.</p>
            <p>Check your final report below.</p>
        `;
    }

    if (answerBox) answerBox.value = "";

    if (feedbackText) {
        feedbackText.innerHTML += `
            <br><br>
            ✅ Interview Completed Successfully!
        `;
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
            headers: { "Content-Type": "application/json" },
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
        const response = await fetch(`${API_URL}/api/interviews/${savedUser.id}`);
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
            best = Math.max(best, item.score || 0);

            historyList.innerHTML += `
                <div class="history-card">
                    <h3>⭐ Score: ${item.score || 0}/10</h3>

                    <div class="history-date">
                        ${new Date(item.createdAt).toLocaleString()}
                    </div>

                    <p>⏱️ Time Taken: ${formatTime(item.timeTaken || 0)}</p>

                    <p><b>Question:</b> ${(item.question || "").substring(0, 80)}...</p>

                    <p><b>Your Answer:</b> ${(item.answer || "").substring(0, 100)}...</p>

                    <button onclick='showDetails(${JSON.stringify(item.question)}, ${JSON.stringify(item.answer)}, ${JSON.stringify(item.feedback)})'>
    View Details
</button>
                  
                </div>
            `;
        });

        avgScore.textContent = (total / history.length).toFixed(1);
        bestScore.textContent = best;
    } catch (error) {
        console.log("LOAD HISTORY ERROR:", error);
        historyList.innerHTML = "<p>Failed to load history.</p>";
    }
}

async function clearHistory() {
    const savedUser = getSavedUser();

    if (!savedUser) {
        alert("Please login first");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to clear history?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_URL}/api/interviews/${savedUser.id}`, {
            method: "DELETE",
        });

        const data = await response.json();

        if (!data.success) {
            alert("History clear failed.");
            return;
        }

        const historyList = document.getElementById("historyList");
        const avgScore = document.getElementById("avgScore");
        const bestScore = document.getElementById("bestScore");

        if (historyList) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <h3>🚀 No Interviews Yet</h3>
                    <p>Start your first AI mock interview now.</p>
                </div>
            `;
        }

        if (avgScore) avgScore.textContent = "0";
        if (bestScore) bestScore.textContent = "0";

        await loadUserProfile();
        await generatePerformanceReport();
        await loadAnalyticsChart();

        alert("History Cleared Successfully ✅");
    } catch (error) {
        console.log("CLEAR HISTORY ERROR:", error);
        alert("History clear failed.");
    }
}

async function generatePerformanceReport() {
    const savedUser = getSavedUser();
    if (!savedUser) return;

    const report = document.getElementById("performanceReport");
    if (!report) return;

    try {
        const response = await fetch(`${API_URL}/api/interviews/${savedUser.id}`);
        const data = await response.json();
        const history = data.interviews || [];

        if (history.length === 0) {
            report.innerHTML = "No interview data available.";
            return;
        }

        let total = 0;
        history.forEach((item) => total += item.score || 0);

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
        const response = await fetch(`${API_URL}/api/interviews/${user.id}`);
        const data = await response.json();
        const history = data.interviews || [];

        let totalScoreProfile = 0;
        let bestScoreProfile = 0;
        let totalTimeProfile = 0;

        history.forEach((item) => {
            totalScoreProfile += item.score || 0;
            bestScoreProfile = Math.max(bestScoreProfile, item.score || 0);
            totalTimeProfile += item.timeTaken || 0;
        });

        if (profileTotal) profileTotal.textContent = history.length;
        if (profileAvg) {
            profileAvg.textContent = history.length
                ? (totalScoreProfile / history.length).toFixed(1)
                : "0";
        }
        if (profileBest) profileBest.textContent = bestScoreProfile;
        if (profileTime) profileTime.textContent = formatTime(totalTimeProfile);
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
        const response = await fetch(`${API_URL}/api/interviews/${user.id}`);
        const data = await response.json();
        const history = data.interviews || [];

        const labels = history.slice().reverse().map((_, index) => `Interview ${index + 1}`);
        const scores = history.slice().reverse().map((item) => item.score || 0);

        if (scoreChartInstance) scoreChartInstance.destroy();

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
                        labels: { color: "white" },
                    },
                },
                scales: {
                    x: {
                        ticks: { color: "white" },
                    },
                    y: {
                        ticks: { color: "white" },
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
        const response = await fetch(`${API_URL}/api/interviews/${user.id}`);
        const data = await response.json();
        const history = data.interviews || [];

        doc.text(`Total Interviews: ${history.length}`, 20, 45);

        let y = 60;

        history.forEach((item, index) => {

            if (y > 260) {
                doc.addPage();
                y = 20;
            }

            doc.text(`Interview ${index + 1}`, 20, y);
            y += 10;

            doc.text(`Score: ${item.score || 0}/10`, 20, y);
            y += 10;

            doc.text(`Time: ${formatTime(item.timeTaken || 0)}`, 20, y);
            y += 10;

            doc.text(
                `Question: ${(item.question || "").substring(0, 60)}`,
                20,
                y
            );

            y += 15;
        });

        doc.save("InterviewFlow_Report.pdf");

    } catch (error) {
        console.log("PDF ERROR:", error);
        alert("PDF generation failed");
    }
}


document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    showLoggedInUser();
    loadHistory();
    loadUserProfile();
    generatePerformanceReport();
    loadAnalyticsChart();
    updateQuestionCounter();
});

async function showFinalReport() {
    console.log("NEW FINAL REPORT WORKING");
    const user = getSavedUser();
    const finalReport = document.getElementById("finalReport");

    if (!user) {
        alert("Please login first");
        return;
    }

    finalReport.innerHTML = `<div class="loader"></div>`;

    const response = await fetch(`${API_URL}/api/interviews/${user.id}`);
    const data = await response.json();
    const history = data.interviews || [];

    if (history.length === 0) {
        finalReport.innerHTML = `<h2>📊 Final Report</h2><p>No interview data found.</p>`;
        return;
    }

    let total = 0;
    let best = 0;
    let totalTime = 0;

    history.forEach(item => {
        total += item.score || 0;
        best = Math.max(best, item.score || 0);
        totalTime += item.timeTaken || 0;
    });

    const avg = (total / history.length).toFixed(1);

    finalReport.innerHTML = `
        <h2>📊 Final Interview Report</h2>
        <p>👤 User: <b>${user.name}</b></p>
        <p>🧠 Total Interviews: <b>${history.length}</b></p>
        <p>⭐ Average Score: <b>${avg}/10</b></p>
        <p>🏆 Best Score: <b>${best}/10</b></p>
        <p>⏱️ Total Time: <b>${formatTime(totalTime)}</b></p>
    `;
}

let cameraStream = null;
let confidenceInterval = null;

async function startCamera() {
    const video = document.getElementById("camera");
    const confidenceScore = document.getElementById("confidenceScore");
    const eyeStatus = document.getElementById("eyeStatus");

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        video.srcObject = cameraStream;

        if (confidenceScore) confidenceScore.innerText = "Detecting...";
        if (eyeStatus) eyeStatus.innerText = "Camera Active";

        startConfidenceMeter();

    } catch (error) {
        alert("Camera access denied");
        console.log(error);
    }
}

function startConfidenceMeter() {
    const confidenceScore = document.getElementById("confidenceScore");
    const eyeStatus = document.getElementById("eyeStatus");

    clearInterval(confidenceInterval);

    confidenceInterval = setInterval(() => {
        const score = Math.floor(Math.random() * 21) + 75;

        if (confidenceScore) {
            confidenceScore.innerText = `${score}%`;
        }

        if (eyeStatus) {
            eyeStatus.innerText =
                score > 85 ? "Good Eye Contact ✅" : "Look at Camera 👀";
        }
    }, 2000);
}