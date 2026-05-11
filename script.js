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

async function getQuestion() {
    const role = document.getElementById("role").value;
    const difficulty = document.getElementById("difficulty").value;
    const questionText = document.getElementById("questionText");

    questionText.innerHTML = `<div class="loader"></div>`;

    try {
        const response = await fetch("/question",{
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                role,
                difficulty
            })
        });

        const data = await response.json();

        if (!response.ok || !data.question) {
            questionText.innerText = data.error || "Question generate nahi hua. Backend check karo.";
            return;
        }

        currentQuestion = data.question
            .replace(/\*/g, "")
            .replace(/\n/g, " ")
            .slice(0, 180);
        typeText(questionText, data.question);

        startTimer();

    } catch (error) {
        questionText.innerText = "Error: Backend server is not running.";
        console.log(error);
    }
}

async function getFeedback() {
    const answer = document.getElementById("answer").value;
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
        const response = await fetch("/feedback", {
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
            feedbackText.innerText = data.error || "Feedback generate nahi hua. Backend check karo.";
            return;
        }

        typeText(feedbackText, data.feedback);

        saveInterview(currentQuestion, answer, data.feedback, timeTaken);

    } catch (error) {
        feedbackText.innerText = "Error: Backend server is not running.";
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