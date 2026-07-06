let historyData = [];

const API_URL = "https://interviewflow-ai-t2yn.onrender.com";

let totalQuestions = 15;
let currentQuestionIndex = 0;
let currentQuestion = "";
let totalTime = 120;
let timeLeft = 120;
let timeTaken = 0;
let timerInterval = null;
let autoNextTimer = null;
let cameraStream = null;
let faceDetectionInterval = null;
let faceInterval = null;
let noFaceCount = 0;

const branchData = {
    "Computer Science": {
        roles: [
            "Frontend Developer",
            "Backend Developer",
            "Java Developer",
            "Python Developer",
            "Full Stack Developer"
        ],
        categories: [
            "Frontend",
            "Backend",
            "React",
            "Node.js",
            "Java",
            "Python",
            "DSA",
            "System Design"
        ]
    },

    "Electrical Engineering": {
        roles: [
            "Electrical Engineer",
            "Power System Engineer",
            "Control System Engineer",
            "Substation Engineer",
            "Maintenance Engineer"
        ],
        categories: [
            "Electrical Machines",
            "Power System",
            "Network Theory",
            "Control System",
            "Power Electronics",
            "Measurements"
        ]
    },

    "Mechanical Engineering": {
        roles: [
            "Mechanical Engineer",
            "Production Engineer",
            "Design Engineer",
            "Automobile Engineer"
        ],
        categories: [
            "Thermodynamics",
            "Fluid Mechanics",
            "Heat Transfer",
            "Manufacturing",
            "SOM"
        ]
    },

    "Civil Engineering": {
        roles: [
            "Civil Engineer",
            "Site Engineer",
            "Structural Engineer"
        ],
        categories: [
            "RCC",
            "Surveying",
            "Transportation",
            "Geotechnical"
        ]
    },

    "Electronics & Communication": {
        roles: [
            "Electronics Engineer",
            "Embedded Engineer",
            "Communication Engineer"
        ],
        categories: [
            "Digital Electronics",
            "Signals & Systems",
            "Communication Systems",
            "Microprocessors"
        ]
    },

    "Information Technology": {
        roles: [
            "Software Developer",
            "Web Developer",
            "Cloud Engineer"
        ],
        categories: [
            "Frontend",
            "Backend",
            "Database",
            "Networking"
        ]
    },

    "Human Resources": {
        roles: [
            "HR Executive",
            "Recruiter",
            "Talent Acquisition"
        ],
        categories: [
            "Recruitment",
            "Employee Relations",
            "HR Policies"
        ]
    },

    "Marketing": {
        roles: [
            "Marketing Executive",
            "Digital Marketer",
            "SEO Specialist"
        ],
        categories: [
            "Digital Marketing",
            "SEO",
            "Social Media",
            "Branding"
        ]
    },

    "Finance": {
        roles: [
            "Financial Analyst",
            "Accountant",
            "Investment Analyst"
        ],
        categories: [
            "Accounting",
            "Taxation",
            "Financial Management",
            "Investment"
        ]
    }

};

function updateBranchOptions() {

    const branch = document.getElementById("branch").value;

    const roleSelect = document.getElementById("role");
    const categorySelect = document.getElementById("category");

    roleSelect.innerHTML = "";
    categorySelect.innerHTML = "";

    branchData[branch].roles.forEach(role => {
        roleSelect.innerHTML += `<option value="${role}">${role}</option>`;
    });

    branchData[branch].categories.forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function getSavedUser() {
    return JSON.parse(localStorage.getItem("user"));
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
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

async function startInterview() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    }
    interviewActive = true;
    await startCamera();
    await getQuestion();
}

async function getQuestion() {
    const branch = document.getElementById("branch")?.value || "Computer Science";
    const role = document.getElementById("role")?.value || "Frontend Developer";
    const category = document.getElementById("category")?.value || "Frontend";
    const questionText = document.getElementById("questionText");
    const feedbackText = document.getElementById("feedbackText");
    const answerBox = document.getElementById("answer");
    const status = document.querySelector(".interview-status");
    if (feedbackText) feedbackText.innerHTML = "";
    if (answerBox) answerBox.value = "";
    if (!questionText) return;

    startTimer();

    try {
        const response = await fetch(`${API_URL}/question`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                branch,
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

        updateQuestionCounter();   // 👈 YE LINE ADD KAR

        typeText(questionText, data.question);

        if (status) status.innerHTML = "🎤 AI asked a question";
    } catch (error) {
        questionText.innerText = "Server issue hai. Thodi der baad try karo.";
        console.log(error);
    }
}

function updateQuestionCounter() {

    const counter = document.getElementById("questionCounter");

    if (counter) {
        counter.innerText =
            `Question ${currentQuestionIndex + 1} / ${totalQuestions}`;
    }

    const diff = document.getElementById("difficultyStatus");

    if (diff) {
        diff.innerText =
            `⚡ Difficulty: ${getAutoDifficulty()}`;
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
    const feedbackText = document.getElementById("feedbackText");
    const answer = answerBox?.value || "";

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

    if (feedbackText) feedbackText.innerHTML = `<div class="loader"></div>`;

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
            if (feedbackText) feedbackText.innerText = "Server Error. Feedback failed.";
            return;
        }

        if (feedbackText) typeText(feedbackText, data.feedback);

        await saveInterview(currentQuestion, answer, data.feedback, timeTaken);

        await loadHistory();
        await loadUserProfile();
        await generatePerformanceReport();

    } catch (error) {
        if (feedbackText) feedbackText.innerText = "Server Error. Feedback failed.";
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
    await moveToNextQuestion();
}

function finishInterview() {
    interviewActive = false;
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
        historyData = history;

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

        history.forEach((item, index) => {
            total += item.score || 0;
            best = Math.max(best, item.score || 0);

            historyList.innerHTML += `
                <div class="history-card">
                    <h3>⭐ Score: ${item.score || 0}/10</h3>
                   <div class="history-date">${new Date(item.created_at).toLocaleString()}</div>
                    <p>⏱️ Time Taken: ${formatTime(item.timeTaken || 0)}</p>
                    <p><b>Question:</b> ${(item.question || "").substring(0, 80)}...</p>
                    <p><b>Your Answer:</b> ${(item.answer || "").substring(0, 100)}...</p>
                    <button onclick="showHistoryDetails(${index})">
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

        await loadHistory();
        await loadUserProfile();
        await generatePerformanceReport();

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

function showHistoryDetails(index) {
    const item = historyData[index];

    if (!item) {
        alert("Details not found");
        return;
    }

    showDetails(
        item.question || "",
        item.answer || "",
        item.feedback || ""
    );
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

        let report = data.analysis;

        if (typeof report === "string") {

            report = report
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            report = JSON.parse(report);
        }

        console.log(data);
        console.log(report);

        result.innerHTML = `
<div class="resume-card">

    <h2>⭐ Resume Score: ${report.score}/10</h2>

    <h3>📈 ATS Compatibility</h3>
    <div class="progress">
        <div class="progress-fill" style="width:${report.ats}%">
            ${report.ats}%
        </div>
    </div>

    <h3>✅ Strong Skills</h3>
    <ul>
        ${report.strongSkills.map(skill => `<li>✅ ${skill}</li>`).join("")}
    </ul>

    <h3>❌ Missing Skills</h3>
    <ul>
        ${report.missingSkills.map(skill => `<li>❌ ${skill}</li>`).join("")}
    </ul>

    <h3>💼 Best Roles</h3>
    <ul>
        ${report.bestRoles.map(role => `<li>💼 ${role}</li>`).join("")}
    </ul>

    <h3>🎯 Improvement Suggestions</h3>
    <ul>
        ${report.suggestions.map(item => `<li>👉 ${item}</li>`).join("")}
    </ul>

</div>
`;

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

            doc.setFontSize(14);
            doc.text(`Interview ${index + 1}`, 20, y);
            y += 10;

            doc.setFontSize(11);
            doc.text(`Score: ${item.score || 0}/10`, 20, y);
            y += 8;

            doc.text(`Time Taken: ${formatTime(item.timeTaken || 0)}`, 20, y);
            y += 8;

            const question = doc.splitTextToSize(`Question: ${item.question || ""}`, 170);
            doc.text(question, 20, y);
            y += question.length * 7;

            const answer = doc.splitTextToSize(`Answer: ${item.answer || ""}`, 170);
            doc.text(answer, 20, y);
            y += answer.length * 7 + 10;
        });

        doc.save("InterviewFlow-AI-Report.pdf");
    } catch (error) {
        console.log("PDF ERROR:", error);
        alert("PDF download failed.");
    }
}

async function startCamera() {
    const video = document.getElementById("camera");
    const confidenceScore = document.getElementById("confidenceScore");
    const eyeStatus = document.getElementById("eyeStatus");

    if (!video) return;

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        video.srcObject = cameraStream;

        if (confidenceScore) confidenceScore.innerText = "Detecting...";
        if (eyeStatus) eyeStatus.innerText = "Camera Active";

        video.onloadedmetadata = async () => {

            await video.play();

            console.log("VIDEO STARTED ✅");

            setTimeout(() => {
                detectFaceConfidence();
            }, 3000);

        };

    } catch (error) {
        alert("Camera access denied");
        console.log(error);
    }
}

async function detectFaceReal() {
    console.log("1. detectFaceConfidence called");
    const video = document.getElementById("camera");
    const confidenceScore = document.getElementById("confidenceScore");
    const eyeStatus = document.getElementById("eyeStatus");

    if (!video || !window.faceapi) {
        console.log("Face API not loaded");
        return;
    }

    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(
            "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/"
        );
    } catch (error) {
        console.log("Face model load error:", error);
        return;
    }

    clearInterval(faceDetectionInterval);

    if (detection) {

        confidenceText.innerHTML =
            "🎯 Confidence: High ✅";

        const leftEye = detection.landmarks.getLeftEye();
        const rightEye = detection.landmarks.getRightEye();

        if (leftEye && rightEye) {

            eyeText.innerHTML =
                "👀 Eye Contact: Looking at Camera ✅";

        } else {

            eyeText.innerHTML =
                "👀 Eye Contact: Weak ⚠️";
        }

    } else {

        confidenceText.innerHTML =
            "🎯 Confidence: Low ❌";

        eyeText.innerHTML =
            "👀 Eye Contact: No Face ❌";
    }

    if (!detections || detections.length === 0) {
        if (confidenceScore) confidenceScore.innerText = "20%";
        if (eyeStatus) eyeStatus.innerText = "Face Not Visible ❌";
        return;
    }

    if (detections.length === 1) {

        const landmarks = detections[0].landmarks;

        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        const leftEyeCenter =
            leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length;

        const rightEyeCenter =
            rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length;

        const faceBox = detections[0].detection.box;

        const faceCenter =
            faceBox.x + (faceBox.width / 2);

        const eyeCenter =
            (leftEyeCenter + rightEyeCenter) / 2;

        const difference =
            Math.abs(faceCenter - eyeCenter);

        confidenceText.innerHTML = "High ✅";

        if (difference < 20) {
            eyeText.innerHTML = "Looking at Camera ✅";
        } else {
            eyeText.innerHTML = "Looking Away ⚠️";
            addCheatingWarning("User looking away");
        }

    }

    const box = detections[0].box;
    const centerX = box.x + box.width / 2;
    const videoCenter = video.videoWidth / 2;
    const difference = Math.abs(centerX - videoCenter);

    if (difference < video.videoWidth * 0.18) {
        if (confidenceScore) confidenceScore.innerText = "92%";
        if (eyeStatus) eyeStatus.innerText = "Good Eye Contact ✅";
    } else {
        if (confidenceScore) confidenceScore.innerText = "65%";
        if (eyeStatus) eyeStatus.innerText = "Look at Camera 👀";
    }
}

async function showFinalReport() {
    const user = getSavedUser();
    const finalReport = document.getElementById("finalReport");

    if (!user) {
        alert("Please login first");
        return;
    }

    if (!finalReport) return;

    finalReport.innerHTML = `<div class="loader"></div>`;

    try {
        const response = await fetch(`${API_URL}/api/interviews/${user.id}`);
        const data = await response.json();
        const history = data.interviews || [];

        if (history.length === 0) {
            finalReport.innerHTML = `
                <h2>📊 Final Report</h2>
                <p>No interview data found.</p>
            `;
            return;
        }

        let total = 0;
        let best = 0;
        let totalTime = 0;

        history.forEach((item) => {
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
    } catch (error) {
        console.log("FINAL REPORT ERROR:", error);
        finalReport.innerHTML = `<p>Failed to generate final report.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    showLoggedInUser();
    loadHistory();
    loadUserProfile();
    generatePerformanceReport();
    updateQuestionCounter();
});

document.addEventListener("fullscreenchange", () => {

    if (!document.fullscreenElement && interviewActive) {

        addCheatingWarning(
            "Fullscreen mode exited"
        );
    }

});

async function loadFaceAI() {

    await faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models"
    );

    await faceapi.nets.faceLandmark68Net.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models"
    );

    console.log("Face AI Loaded ✅");
    console.log("FACE API READY 🚀");
}

window.addEventListener("load", async () => {
    await loadFaceAI();
    console.log("FACE API READY 🚀");
});

let mediaRecorder;
let recordedChunks = [];
let warningCount = 0;
const MAX_WARNINGS = 3;
let interviewActive = false;

function showToast(message) {
    const toastBox = document.getElementById("toastBox");

    if (!toastBox) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;

    toastBox.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function addCheatingWarning(reason) {

    if (!interviewActive) return;

    warningCount++;

    showToast(`Warning ${warningCount}/${MAX_WARNINGS}: ${reason}`);

    console.log("CHEATING WARNING:", reason);

    if (warningCount >= MAX_WARNINGS) {

        interviewActive = false;

        clearInterval(timerInterval);
        clearInterval(faceInterval);

        alert(
            "🚫 Interview Terminated.\n\nReason: Too many cheating warnings."
        );

        const questionText =
            document.getElementById("questionText");

        if (questionText) {

            questionText.innerHTML = `
                <h2>🚫 Interview Terminated</h2>
                <p>Too many cheating warnings detected.</p>
            `;
        }
    }
}

async function detectFaceConfidence() {
    const video = document.getElementById("camera");
    const confidenceText = document.getElementById("confidenceScore");
    const eyeText = document.getElementById("eyeStatus");

    if (!video || !confidenceText || !eyeText) return;

    clearInterval(faceInterval);

    console.log("2. Interval starting");

    faceInterval = setInterval(async () => {

        console.log("3. Interval running");

        try {

            console.log("VIDEO CHECK:", video);
            console.log("SIZE:", video.videoWidth, video.videoHeight);

            const detections = await faceapi
                .detectAllFaces(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.15
                    })
                )
                .withFaceLandmarks();

            console.log("RAW DETECTIONS:", detections);

            console.log("Faces Found:", detections.length);

            if (detections.length === 0) {

                noFaceCount++;

                if (noFaceCount >= 3) {

                    confidenceText.innerHTML = "20%";
                    eyeText.innerHTML = "No Face Detected ❌";

                }

            }

            else if (detections.length > 1) {

                confidenceText.innerHTML = "45%";
                eyeText.innerHTML = "Multiple Faces ⚠️";

                addCheatingWarning("Multiple people detected");

            }

            else {

                noFaceCount = 0;

                const face = detections[0];
                const box = face.detection.box;

                const centerX = box.x + box.width / 2;
                const videoCenter = video.videoWidth / 2;

                const difference = Math.abs(centerX - videoCenter);

                if (difference < video.videoWidth * 0.15) {

                    confidenceText.innerHTML = "95%";
                    eyeText.innerHTML = "Good Eye Contact ✅";

                }

                else if (difference < video.videoWidth * 0.30) {

                    confidenceText.innerHTML = "70%";
                    eyeText.innerHTML = "Look at Camera 👀";

                }

                else {

                    confidenceText.innerHTML = "50%";
                    eyeText.innerHTML = "Poor Eye Contact ⚠️";

                }
            }

        } catch (error) {
            console.log("FACE DETECTION ERROR:", error);
        }
    }, 2000);
}

function startRecording() {
    const video = document.getElementById("camera");

    if (!video || !video.srcObject) {
        alert("Camera not started");
        return;
    }

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(video.srcObject);

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, {
            type: "video/webm"
        });

        const url = URL.createObjectURL(blob);
        const downloadLink = document.getElementById("downloadVideo");

        if (downloadLink) {
            downloadLink.href = url;
            downloadLink.download = "InterviewRecording.webm";
            downloadLink.style.display = "inline-block";
        }
    };

    mediaRecorder.start();
    alert("Recording Started 🔴");
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        alert("Recording Stopped ✅");
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        addCheatingWarning("Tab switched during interview");
    }
});

document.addEventListener("copy", () => {
    addCheatingWarning("Copy action detected");
});

document.addEventListener("paste", () => {
    addCheatingWarning("Paste action detected");
});

function showInstructions() {
    document.getElementById("instructionModal").style.display = "flex";
}

async function confirmInterview() {

    const agree = document.getElementById("agreeRules");

    if (!agree.checked) {
        alert("Pehle instructions accept karo.");
        return;
    }

    document.getElementById("instructionModal").style.display = "none";

    await startInterview();
}

document.addEventListener("DOMContentLoaded", () => {
    updateBranchOptions();
});