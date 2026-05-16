const API_URL = "https://interviewflow-ai-t2yn.onrender.com";

async function registerUser() {
    
 
    if (!name || !email || !password) {
        alert("All fields required");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Registration Failed");
            return;
        }

        localStorage.setItem("user", JSON.stringify(data.user));
        alert("Registration Successful ✅");
        window.location.href = "login.html";

    } catch (error) {
        console.log(error);
        alert("Server error");
    }
}

async function loginUser() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
        alert("Email and password required");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
 
        if (!res.ok) {
            alert(data.message || "Login Failed");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        alert("Login Successful ✅");
        window.location.href = "index.html";

    } catch (error) {
        console.log(error);
        alert("Server error");
    }
}