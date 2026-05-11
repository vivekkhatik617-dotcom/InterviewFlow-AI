function registerUser() {

    const name =
        document.getElementById("name").value;

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    if (!name || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    const user = {
        name,
        email,
        password
    };

    localStorage.setItem(
        "hiremindUser",
        JSON.stringify(user)
    );

    alert("Registration Successful 🚀");

    window.location.href = "login.html";
}



function loginUser() {

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    const savedUser =
        JSON.parse(
            localStorage.getItem("hiremindUser")
        );

    if (
        !savedUser ||
        email !== savedUser.email ||
        password !== savedUser.password
    ) {
        alert("Invalid Email or Password");
        return;
    }

    localStorage.setItem("isLoggedIn", "true");

    alert("Login Successful 😎");

    window.location.href = "index.html";
}