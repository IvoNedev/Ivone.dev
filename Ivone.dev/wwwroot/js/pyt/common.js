(() => {
    const toJson = async (response) => {
        const text = await response.text();
        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    };

    const request = async (url, options = {}) => {
        const response = await fetch(url, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        if (response.status === 401) {
            window.location.href = "/Pyt/Auth/Login";
            throw new Error("Unauthorized");
        }

        if (!response.ok) {
            const payload = await toJson(response);
            const message = typeof payload === "string"
                ? payload
                : payload?.title || payload?.message || "Request failed.";
            throw new Error(message);
        }

        if (response.status === 204) {
            return null;
        }

        return toJson(response);
    };

    window.pytApi = {
        get: (url) => request(url, { method: "GET" }),
        post: (url, body) => request(url, { method: "POST", body: JSON.stringify(body ?? {}) }),
        put: (url, body) => request(url, { method: "PUT", body: JSON.stringify(body ?? {}) }),
        delete: (url) => request(url, { method: "DELETE" })
    };

    const logoutButton = document.getElementById("pyt-logout-btn");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                await request("/api/pyt/auth/logout", { method: "POST" });
            } catch {
                // Ignore logout errors and force redirect.
            }

            window.location.href = "/Pyt/Auth/Login";
        });
    }
})();
