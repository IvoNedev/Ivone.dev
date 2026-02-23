(() => {
    const tableBody = document.querySelector("#entity-table tbody");
    const form = document.getElementById("entity-form");
    if (!form || !tableBody) {
        return;
    }

    const elements = {
        id: document.getElementById("entity-id"),
        name: document.getElementById("name"),
        address: document.getElementById("address"),
        isFavorite: document.getElementById("is-favorite"),
        isActive: document.getElementById("is-active"),
        message: document.getElementById("entity-message"),
        save: document.getElementById("entity-save-btn"),
        reset: document.getElementById("entity-reset-btn")
    };

    let items = [];

    const setMessage = (text, isError = false) => {
        elements.message.textContent = text;
        elements.message.classList.toggle("error-text", isError);
    };

    const resetForm = () => {
        elements.id.value = "";
        elements.name.value = "";
        elements.address.value = "";
        elements.isFavorite.checked = false;
        elements.isActive.checked = true;
        elements.save.textContent = "Save";
    };

    const payloadFromForm = () => ({
        name: elements.name.value,
        address: elements.address.value,
        isFavorite: elements.isFavorite.checked,
        isActive: elements.isActive.checked
    });

    const render = () => {
        tableBody.innerHTML = "";
        items.forEach((item) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.address ?? "-"}</td>
                <td>${item.isFavorite ? "Yes" : "No"}</td>
                <td>${item.isActive ? "Yes" : "No"}</td>
                <td>
                    <button type="button" class="btn-secondary btn-sm" data-action="edit" data-id="${item.id}">Edit</button>
                    <button type="button" class="btn-secondary btn-sm" data-action="deactivate" data-id="${item.id}">Deactivate</button>
                </td>`;
            tableBody.appendChild(row);
        });
    };

    const load = async () => {
        items = await window.pytApi.get("/api/pyt/locations");
        render();
    };

    const wireEvents = () => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const id = Number(elements.id.value || 0);

            try {
                if (id) {
                    await window.pytApi.put(`/api/pyt/locations/${id}`, payloadFromForm());
                    setMessage("Location updated.");
                } else {
                    await window.pytApi.post("/api/pyt/locations", payloadFromForm());
                    setMessage("Location created.");
                }

                await load();
                resetForm();
            } catch (error) {
                setMessage(error.message, true);
            }
        });

        elements.reset.addEventListener("click", resetForm);

        tableBody.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const id = Number(target.dataset.id || 0);
            const action = target.dataset.action;
            if (!id || !action) {
                return;
            }

            try {
                if (action === "edit") {
                    const selected = items.find((x) => x.id === id);
                    if (!selected) {
                        return;
                    }

                    elements.id.value = selected.id;
                    elements.name.value = selected.name;
                    elements.address.value = selected.address ?? "";
                    elements.isFavorite.checked = selected.isFavorite;
                    elements.isActive.checked = selected.isActive;
                    elements.save.textContent = "Update";
                    return;
                }

                if (action === "deactivate") {
                    await window.pytApi.post(`/api/pyt/locations/${id}/deactivate`, {});
                    setMessage("Location deactivated.");
                    await load();
                }
            } catch (error) {
                setMessage(error.message, true);
            }
        });
    };

    const init = async () => {
        wireEvents();
        resetForm();
        await load();
    };

    init();
})();
