(() => {
    const form = document.getElementById("login-form");
    if (!form) {
        return;
    }

    const errorBox = document.getElementById("login-error");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.textContent = "";

        const payload = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch("/api/pyt/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Login failed.");
            }

            window.location.href = "/Pyt";
        } catch (error) {
            errorBox.textContent = error.message;
        }
    });
})();
