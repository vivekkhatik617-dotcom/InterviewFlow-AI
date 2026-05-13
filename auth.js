const API_URL = "http://localhost:3000";

// REGISTER
async function registerUser() {
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                email,
                password,
            }),
        });

        const data = await response.json();

        alert(data.message);

        if (response.ok) {
            window.location.href = "login.html";
        }

    } catch (error) {
        console.log(error);
        alert("Registration Failed");
    }
}

// LOGIN
async function loginUser() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            alert("Login Successful 🚀");

            window.location.href = "index.html";
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Login Failed");
    }
}