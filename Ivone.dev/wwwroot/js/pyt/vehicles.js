(() => {
    const tableBody = document.querySelector("#entity-table tbody");
    const form = document.getElementById("entity-form");
    if (!form || !tableBody) {
        return;
    }

    const elements = {
        id: document.getElementById("entity-id"),
        plateNumber: document.getElementById("plate-number"),
        makeModel: document.getElementById("make-model"),
        fuelType: document.getElementById("fuel-type"),
        avgConsumption: document.getElementById("avg-consumption"),
        lastMileage: document.getElementById("last-mileage"),
        isActive: document.getElementById("is-active"),
        message: document.getElementById("entity-message"),
        reset: document.getElementById("entity-reset-btn"),
        save: document.getElementById("entity-save-btn")
    };

    let items = [];

    const pad = (value) => value.toString().padStart(2, "0");
    const formatDate = (value) => {
        if (!value) {
            return "-";
        }

        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
            return "-";
        }

        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const setMessage = (text, isError = false) => {
        elements.message.textContent = text;
        elements.message.classList.toggle("error-text", isError);
    };

    const resetForm = () => {
        elements.id.value = "";
        elements.plateNumber.value = "";
        elements.makeModel.value = "";
        elements.fuelType.value = "";
        elements.avgConsumption.value = "";
        elements.lastMileage.value = "";
        elements.isActive.checked = true;
        elements.save.textContent = "Save";
    };

    const payloadFromForm = () => ({
        plateNumber: elements.plateNumber.value,
        makeModel: elements.makeModel.value,
        fuelType: elements.fuelType.value,
        avgConsumption: elements.avgConsumption.value ? Number(elements.avgConsumption.value) : null,
        lastMileage: elements.lastMileage.value ? Number(elements.lastMileage.value) : null,
        isActive: elements.isActive.checked
    });

    const render = () => {
        tableBody.innerHTML = "";
        items.forEach((item) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.plateNumber}</td>
                <td>${item.makeModel}</td>
                <td>${item.fuelType}</td>
                <td>${item.avgConsumption ?? "-"}</td>
                <td>${item.lastMileage ?? "-"}</td>
                <td>${formatDate(item.lastTripDate)}</td>
                <td>${item.isActive ? "Yes" : "No"}</td>
                <td>
                    <button type="button" class="btn-secondary btn-sm" data-action="edit" data-id="${item.id}">Edit</button>
                    <button type="button" class="btn-secondary btn-sm" data-action="deactivate" data-id="${item.id}">Deactivate</button>
                </td>`;
            tableBody.appendChild(row);
        });
    };

    const load = async () => {
        items = await window.pytApi.get("/api/pyt/vehicles");
        render();
    };

    const wireEvents = () => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            try {
                const id = Number(elements.id.value || 0);
                const payload = payloadFromForm();
                if (id) {
                    await window.pytApi.put(`/api/pyt/vehicles/${id}`, payload);
                    setMessage("Vehicle updated.");
                } else {
                    await window.pytApi.post("/api/pyt/vehicles", payload);
                    setMessage("Vehicle created.");
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
                    elements.plateNumber.value = selected.plateNumber;
                    elements.makeModel.value = selected.makeModel;
                    elements.fuelType.value = selected.fuelType;
                    elements.avgConsumption.value = selected.avgConsumption ?? "";
                    elements.lastMileage.value = selected.lastMileage ?? "";
                    elements.isActive.checked = selected.isActive;
                    elements.save.textContent = "Update";
                    return;
                }

                if (action === "deactivate") {
                    await window.pytApi.post(`/api/pyt/vehicles/${id}/deactivate`, {});
                    setMessage("Vehicle deactivated.");
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
