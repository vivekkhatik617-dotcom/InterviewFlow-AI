let totalTime = 120;

let currentQuestion = "";

let timeLeft = 120;
let timerInterval;
let timeTaken = 0;

function typeText(element, text, speed = 20) {
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
async function getQuestion() {

    const role =
        document.getElementById("role").value;

    const difficulty =
        document.getElementById("difficulty").value;

    const category =
        document.getElementById("category").value;

    const questionText =
        document.getElementById("questionText");

    questionText.innerHTML =
        `<div class="loader"></div>`;

    startTimer();

    try {

        const response = await fetch("https://interviewflow-ai-t2yn.onrender.com/question", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                role,
                difficulty,
                category
            })

        });

        const data = await response.json();

        if (!response.ok || !data.question) {

            questionText.innerText =
                "Question generate nahi hua.";

            return;
        }

        currentQuestion = data.question;

        typeText(questionText, data.question);

    } catch (error) {

        questionText.innerText =
            "⏳ Server waking up... Please wait a few seconds and try again.";

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

    timer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

}

async function getFeedback() {

    const answer =
        document.getElementById("answer").value;

    const feedbackText =
        document.getElementById("feedbackText");

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

    feedbackText.innerHTML =
        `<div class="loader"></div>`;

    try {

        const response = await fetch("https://interviewflow-ai-t2yn.onrender.com/feedback", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                question: currentQuestion,
                answer: answer
            })

        });

        const data = await response.json();

        if (!response.ok || !data.feedback) {

            feedbackText.innerText =
                "Feedback generate nahi hua.";

            return;
        }

        typeText(feedbackText, data.feedback);

        saveInterview(
            currentQuestion,
            answer,
            data.feedback,
            timeTaken
        );

    } catch (error) {

        feedbackText.innerText =
            "⏳ Server waking up... Please wait a few seconds and try again.";

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

function saveInterview(question, answer, feedback, timeTaken) {
    const history =
        JSON.parse(localStorage.getItem("history")) || [];

    const scoreMatch = feedback.match(/Score:\s*(\d+)/i);

    let score = 0;

    if (scoreMatch) {
        score = Number(scoreMatch[1]);
    }

    history.push({
        question,
        answer,
        feedback,
        score,
        timeTaken
    });

    localStorage.setItem("history", JSON.stringify(history));

    loadHistory();
    generatePerformanceReport();
    loadUserProfile();
}

function loadHistory() {
    const history =
        JSON.parse(localStorage.getItem("history")) || [];

    const historyList = document.getElementById("historyList");
    const avgScore = document.getElementById("avgScore");
    const bestScore = document.getElementById("bestScore");

    if (!historyList || !avgScore || !bestScore) return;

    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.innerHTML = "<p>No interviews yet.</p>";
        avgScore.textContent = "0";
        bestScore.textContent = "0";
        return;
    }

    let total = 0;
    let best = 0;

    [...history].reverse().forEach((item) => {
        total += item.score;

        if (item.score > best) {
            best = item.score;
        }

        historyList.innerHTML += `
      <div class="history-card">
        <h3>⭐ Score: ${item.score}/10</h3>
        <p>⏱️ Time Taken: ${formatTime(item.timeTaken || 0)}</p>

        <p>
          <b>Question:</b>
          ${item.question.substring(0, 60)}...
        </p>

        <p>
          <b>Your Answer:</b>
          ${item.answer.substring(0, 80)}...
        </p>

        <button onclick='showDetails(
          ${JSON.stringify(item.question)},
          ${JSON.stringify(item.answer)},
          ${JSON.stringify(item.feedback)}
        )'>
          View Details
        </button>
      </div>
    `;
    });

    avgScore.textContent = (total / history.length).toFixed(1);
    bestScore.textContent = best;
}

function generatePerformanceReport() {
    const history =
        JSON.parse(localStorage.getItem("history")) || [];

    const report = document.getElementById("performanceReport");

    if (!report) return;

    if (history.length === 0) {
        report.innerHTML = "No interview data available.";
        return;
    }

    let total = 0;

    history.forEach((item) => {
        total += item.score;
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
}

function clearHistory() {
    localStorage.removeItem("history");

    loadHistory();
    generatePerformanceReport();

    alert("Interview history cleared.");
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

loadHistory();
generatePerformanceReport();

function showLoggedInUser() {
    const user =
        JSON.parse(localStorage.getItem("InterviewFlowdUser"));

    const userName =
        document.getElementById("userName");
        document.getElementById("heroUser").textContent = user.name;

    if (user && userName) {
        userName.textContent = `Welcome, ${user.name}`;
    }
}

function logoutUser() {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "login.html";
}

showLoggedInUser();

function downloadReportPDF() {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    const history =
        JSON.parse(localStorage.getItem("history")) || [];

    const user =
        JSON.parse(localStorage.getItem("InterviewFlow User")) || {};

    doc.setFont("helvetica");

    doc.setFontSize(20);
    doc.text("InterviewFlow AI Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`User: ${user.name || "User"}`, 20, 35);

    doc.text(`Total Interviews: ${history.length}`, 20, 45);

    let y = 60;

    history.slice(-5).forEach((item, index) => {

        doc.setFontSize(14);
        doc.text(`Interview ${index + 1}`, 20, y);

        y += 10;

        doc.setFontSize(11);

        doc.text(`Score: ${item.score}/10`, 20, y);
        y += 8;

        doc.text(
            `Time Taken: ${formatTime(item.timeTaken || 0)}`,
            20,
            y
        );

        y += 10;

        const question =
            doc.splitTextToSize(
                `Question: ${item.question}`,
                160
            );

        doc.text(question, 20, y);

        y += question.length * 7;

        const answer =
            doc.splitTextToSize(
                `Answer: ${item.answer}`,
                160
            );

        doc.text(answer, 20, y);

        y += answer.length * 7;

        y += 12;

        if (y > 260) {
            doc.addPage();
            y = 20;
        }

    });

    doc.save("InterviewFlow-AI-Report.pdf");
}

function loadUserProfile() {
    const user =
        JSON.parse(localStorage.getItem("InterviewFlowUser")) || {};

    const history =
        JSON.parse(localStorage.getItem("history")) || [];

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileTotal = document.getElementById("profileTotal");
    const profileAvg = document.getElementById("profileAvg");
    const profileBest = document.getElementById("profileBest");
    const profileTime = document.getElementById("profileTime");

    if (!profileName) return;

    profileName.textContent = user.name || "User";
    profileEmail.textContent = user.email || "Not available";

    let totalScore = 0;
    let bestScore = 0;
    let totalTime = 0;

    history.forEach((item) => {
        totalScore += item.score || 0;
        bestScore = Math.max(bestScore, item.score || 0);
        totalTime += item.timeTaken || 0;
    });

    profileTotal.textContent = history.length;
    profileAvg.textContent =
        history.length ? (totalScore / history.length).toFixed(1) : "0";
    profileBest.textContent = bestScore;
    profileTime.textContent = formatTime(totalTime);
}

loadUserProfile();

function loadAnalyticsChart() {

    const history =
        JSON.parse(localStorage.getItem("history")) || [];

    const chartCanvas =
        document.getElementById("scoreChart");

    if (!chartCanvas) return;

    const labels =
        history.map((_, index) => `Interview ${index + 1}`);

    const scores =
        history.map(item => item.score || 0);

    new Chart(chartCanvas, {

        type: "line",

        data: {
            labels: labels,

            datasets: [{
                label: "Interview Scores",

                data: scores,

                borderColor: "#38bdf8",

                backgroundColor: "rgba(56,189,248,0.2)",

                tension: 0.4,

                fill: true
            }]
        },

        options: {

            responsive: true,

            plugins: {
                legend: {
                    labels: {
                        color: "white"
                    }
                }
            },

            scales: {

                x: {
                    ticks: {
                        color: "white"
                    }
                },

                y: {
                    ticks: {
                        color: "white"
                    },

                    beginAtZero: true,
                    max: 10
                }
            }
        }
    });
}

loadAnalyticsChart();

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

loadTheme();