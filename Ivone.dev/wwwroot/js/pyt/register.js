(() => {
    const form = document.getElementById("register-form");
    if (!form) {
        return;
    }

    const errorBox = document.getElementById("register-error");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.textContent = "";

        const organizationIdValue = document.getElementById("organizationId").value;
        const payload = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
            organizationId: organizationIdValue ? Number(organizationIdValue) : null
        };

        try {
            const response = await fetch("/api/pyt/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Register failed.");
            }

            window.location.href = "/Pyt";
        } catch (error) {
            errorBox.textContent = error.message;
        }
    });
})();
