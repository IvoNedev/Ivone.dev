(() => {
    const state = {
        vehicles: [],
        drivers: [],
        locations: [],
        purposePresets: []
    };

    const form = document.getElementById("trip-form");
    if (!form) {
        return;
    }

    const elements = {
        tripId: document.getElementById("trip-id"),
        vehicleId: document.getElementById("vehicle-id"),
        driverId: document.getElementById("driver-id"),
        startDateTime: document.getElementById("start-datetime"),
        endDateTime: document.getElementById("end-datetime"),
        startMileage: document.getElementById("start-mileage"),
        endMileage: document.getElementById("end-mileage"),
        startLocationId: document.getElementById("start-location-id"),
        endLocationId: document.getElementById("end-location-id"),
        purpose: document.getElementById("purpose"),
        notes: document.getElementById("notes"),
        message: document.getElementById("trip-message"),
        warnings: document.getElementById("trip-warnings"),
        saveButton: document.getElementById("save-btn"),
        saveNewButton: document.getElementById("save-new-btn"),
        resetButton: document.getElementById("reset-btn"),
        vehicleMileage: document.getElementById("vehicle-mileage"),
        filtersForm: document.getElementById("filters-form"),
        filterFrom: document.getElementById("filter-from"),
        filterTo: document.getElementById("filter-to"),
        filterVehicle: document.getElementById("filter-vehicle"),
        filterDriver: document.getElementById("filter-driver"),
        clearFilters: document.getElementById("clear-filters"),
        tripsTableBody: document.querySelector("#trips-table tbody"),
        exportPdf: document.getElementById("export-pdf"),
        exportExcel: document.getElementById("export-excel"),
        swapLocations: document.getElementById("swap-locations"),
        purposePresets: document.getElementById("purpose-presets")
    };

    const pad = (value) => value.toString().padStart(2, "0");

    const toDateInput = (date) => {
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        return `${year}-${month}-${day}`;
    };

    const toDateTimeInput = (value) => {
        if (!value) {
            return "";
        }

        if (typeof value === "string") {
            const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
            if (match) {
                return `${match[1]}T${match[2]}`;
            }
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hour = pad(date.getHours());
        const minute = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hour}:${minute}`;
    };

    const formatDateTime = (value) => {
        if (typeof value === "string") {
            const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
            if (match) {
                return `${match[1]} ${match[2]}`;
            }
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const setMessage = (text, isError = false) => {
        elements.message.textContent = text;
        elements.message.classList.toggle("error-text", isError);
    };

    const renderWarnings = (warnings) => {
        elements.warnings.innerHTML = "";
        (warnings || []).forEach((warning) => {
            const item = document.createElement("li");
            item.textContent = warning.message;
            elements.warnings.appendChild(item);
        });
    };

    const populateSelect = (select, items, mapLabel, includeEmpty = false) => {
        const current = select.value;
        select.innerHTML = "";

        if (includeEmpty) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "All";
            select.appendChild(option);
        }

        items.forEach((item) => {
            const option = document.createElement("option");
            option.value = item.id;
            option.textContent = mapLabel(item);
            select.appendChild(option);
        });

        if (current && [...select.options].some((x) => x.value === current)) {
            select.value = current;
        }
    };

    const updateVehicleMileageHint = () => {
        const selectedId = Number(elements.vehicleId.value || 0);
        const vehicle = state.vehicles.find((x) => x.id === selectedId);
        if (!vehicle) {
            elements.vehicleMileage.textContent = "";
            return;
        }

        const lastMileageText = vehicle.lastMileage != null ? `${vehicle.lastMileage} km` : "no mileage";
        elements.vehicleMileage.textContent = `Last mileage: ${lastMileageText}`;
    };

    const applyDefaults = (defaults, applyEndMileageSuggestion = true) => {
        if (!defaults) {
            return;
        }

        if (defaults.vehicleId) {
            elements.vehicleId.value = String(defaults.vehicleId);
        }

        if (defaults.driverId) {
            elements.driverId.value = String(defaults.driverId);
        }

        if (defaults.startLocationId) {
            elements.startLocationId.value = String(defaults.startLocationId);
        }

        if (defaults.endLocationId) {
            elements.endLocationId.value = String(defaults.endLocationId);
        }

        elements.startDateTime.value = toDateTimeInput(defaults.startDateTime);
        elements.endDateTime.value = toDateTimeInput(defaults.endDateTime);
        elements.startMileage.value = defaults.startMileage ?? 0;

        if (applyEndMileageSuggestion && defaults.endMileageSuggestion != null) {
            elements.endMileage.value = defaults.endMileageSuggestion;
        }

        elements.purpose.value = defaults.purpose || "";
        updateVehicleMileageHint();
    };

    const toTripPayload = () => ({
        vehicleId: Number(elements.vehicleId.value),
        driverId: Number(elements.driverId.value),
        startDateTime: elements.startDateTime.value,
        endDateTime: elements.endDateTime.value,
        startLocationId: Number(elements.startLocationId.value),
        endLocationId: Number(elements.endLocationId.value),
        startMileage: Number(elements.startMileage.value),
        endMileage: Number(elements.endMileage.value),
        purpose: elements.purpose.value,
        notes: elements.notes.value
    });

    const buildTripFilters = () => {
        const params = new URLSearchParams();
        if (elements.filterFrom.value) {
            params.set("from", elements.filterFrom.value);
        }

        if (elements.filterTo.value) {
            params.set("to", elements.filterTo.value);
        }

        if (elements.filterVehicle.value) {
            params.set("vehicleId", elements.filterVehicle.value);
        }

        if (elements.filterDriver.value) {
            params.set("driverId", elements.filterDriver.value);
        }

        return params;
    };

    const loadTrips = async () => {
        const params = buildTripFilters();
        const query = params.toString();
        const payload = await window.pytApi.get(`/api/pyt/trips${query ? `?${query}` : ""}`);
        renderTrips(payload.items || []);
    };

    const renderTrips = (items) => {
        elements.tripsTableBody.innerHTML = "";

        items.forEach((trip) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${trip.id}</td>
                <td>${trip.vehicleLabel}</td>
                <td>${trip.driverName}</td>
                <td>${formatDateTime(trip.startDateTime)}</td>
                <td>${formatDateTime(trip.endDateTime)}</td>
                <td>${trip.startLocationName} -> ${trip.endLocationName}</td>
                <td>${trip.distance}</td>
                <td>${trip.purpose}</td>
                <td>
                    <button type="button" class="btn-secondary btn-sm" data-action="edit" data-id="${trip.id}">Edit</button>
                    <button type="button" class="btn-secondary btn-sm" data-action="delete" data-id="${trip.id}">Delete</button>
                </td>`;
            elements.tripsTableBody.appendChild(row);
        });
    };

    const resetFormState = () => {
        elements.tripId.value = "";
        elements.saveButton.textContent = "Save";
    };

    const loadTripToForm = async (id) => {
        const trip = await window.pytApi.get(`/api/pyt/trips/${id}`);
        elements.tripId.value = trip.id;
        elements.vehicleId.value = String(trip.vehicleId);
        elements.driverId.value = String(trip.driverId);
        elements.startDateTime.value = toDateTimeInput(trip.startDateTime);
        elements.endDateTime.value = toDateTimeInput(trip.endDateTime);
        elements.startLocationId.value = String(trip.startLocationId);
        elements.endLocationId.value = String(trip.endLocationId);
        elements.startMileage.value = trip.startMileage;
        elements.endMileage.value = trip.endMileage;
        elements.purpose.value = trip.purpose;
        elements.notes.value = trip.notes || "";
        elements.saveButton.textContent = "Update";
        updateVehicleMileageHint();
        elements.endMileage.focus();
    };

    const saveTrip = async (saveAndNew) => {
        setMessage("");
        renderWarnings([]);

        const payload = toTripPayload();
        const tripId = Number(elements.tripId.value || 0);

        if (!payload.vehicleId || !payload.driverId) {
            setMessage("Vehicle and driver are required.", true);
            return;
        }

        if (payload.endMileage < payload.startMileage) {
            setMessage("End mileage must be >= start mileage.", true);
            return;
        }

        if (payload.endDateTime < payload.startDateTime) {
            setMessage("End date must be >= start date.", true);
            return;
        }

        const endpoint = tripId ? `/api/pyt/trips/${tripId}` : "/api/pyt/trips";
        const method = tripId ? "put" : "post";

        const result = await window.pytApi[method](endpoint, payload);

        renderWarnings(result.warnings);
        setMessage(tripId ? "Trip updated." : "Trip saved.");
        await loadTrips();

        if (saveAndNew) {
            resetFormState();
            elements.notes.value = "";
            applyDefaults(result.nextDefaults, true);
            elements.endMileage.focus();
        }
    };

    const applyDefaultFilterRange = () => {
        const now = new Date();
        const from = new Date(now);
        from.setDate(now.getDate() - 30);
        elements.filterFrom.value = toDateInput(from);
        elements.filterTo.value = toDateInput(now);
    };

    const reloadDefaultsForVehicle = async () => {
        const selectedVehicleId = elements.vehicleId.value;
        if (!selectedVehicleId) {
            return;
        }

        const defaults = await window.pytApi.get(`/api/pyt/trips/defaults?vehicleId=${selectedVehicleId}`);
        applyDefaults(defaults, false);
        if (defaults.endMileageSuggestion != null) {
            elements.endMileage.value = defaults.endMileageSuggestion;
        }
    };

    const wireEvents = () => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                await saveTrip(false);
            } catch (error) {
                setMessage(error.message, true);
            }
        });

        elements.saveNewButton.addEventListener("click", async () => {
            try {
                await saveTrip(true);
            } catch (error) {
                setMessage(error.message, true);
            }
        });

        elements.resetButton.addEventListener("click", async () => {
            try {
                const defaults = await window.pytApi.get(`/api/pyt/trips/defaults?vehicleId=${elements.vehicleId.value || ""}`);
                applyDefaults(defaults, true);
                resetFormState();
                elements.notes.value = "";
                setMessage("Defaults reloaded.");
                elements.endMileage.focus();
            } catch (error) {
                setMessage(error.message, true);
            }
        });

        elements.vehicleId.addEventListener("change", async () => {
            updateVehicleMileageHint();
            try {
                await reloadDefaultsForVehicle();
            } catch (error) {
                setMessage(error.message, true);
            }
        });

        document.querySelectorAll("[data-date-action]").forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.getAttribute("data-date-action");
                const start = elements.startDateTime.value ? new Date(elements.startDateTime.value) : new Date();
                const end = elements.endDateTime.value ? new Date(elements.endDateTime.value) : new Date();

                if (action === "today") {
                    const today = new Date();
                    start.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
                    end.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
                }

                if (action === "yesterday") {
                    const day = new Date();
                    day.setDate(day.getDate() - 1);
                    start.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
                    end.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
                }

                if (action === "plus1") {
                    end.setDate(end.getDate() + 1);
                }

                if (action === "same") {
                    end.setTime(start.getTime());
                }

                elements.startDateTime.value = toDateTimeInput(start);
                elements.endDateTime.value = toDateTimeInput(end);
            });
        });

        elements.swapLocations.addEventListener("click", () => {
            const from = elements.startLocationId.value;
            elements.startLocationId.value = elements.endLocationId.value;
            elements.endLocationId.value = from;
        });

        elements.filtersForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                await loadTrips();
            } catch (error) {
                setMessage(error.message, true);
            }
        });

        elements.clearFilters.addEventListener("click", async () => {
            elements.filterVehicle.value = "";
            elements.filterDriver.value = "";
            applyDefaultFilterRange();
            try {
                await loadTrips();
            } catch (error) {
                setMessage(error.message, true);
            }
        });

        elements.tripsTableBody.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const action = target.dataset.action;
            const id = Number(target.dataset.id || 0);
            if (!action || !id) {
                return;
            }

            try {
                if (action === "edit") {
                    await loadTripToForm(id);
                    return;
                }

                if (action === "delete") {
                    if (!window.confirm("Delete this trip?")) {
                        return;
                    }

                    await window.pytApi.delete(`/api/pyt/trips/${id}`);
                    setMessage("Trip deleted.");
                    await loadTrips();
                }
            } catch (error) {
                setMessage(error.message, true);
            }
        });

        const runExport = (format) => {
            const params = buildTripFilters();
            const query = params.toString();
            window.location.href = `/api/pyt/trips/export/${format}${query ? `?${query}` : ""}`;
        };

        elements.exportPdf.addEventListener("click", () => runExport("pdf"));
        elements.exportExcel.addEventListener("click", () => runExport("excel"));
    };

    const init = async () => {
        try {
            const bootstrap = await window.pytApi.get("/api/pyt/trips/bootstrap");
            state.vehicles = bootstrap.vehicles || [];
            state.drivers = bootstrap.drivers || [];
            state.locations = bootstrap.locations || [];
            state.purposePresets = bootstrap.purposePresets || [];

            populateSelect(elements.vehicleId, state.vehicles, (x) => `${x.plateNumber} • ${x.makeModel}${x.isActive ? "" : " (inactive)"}`);
            populateSelect(elements.driverId, state.drivers, (x) => `${x.name}${x.isActive ? "" : " (inactive)"}`);
            populateSelect(elements.startLocationId, state.locations, (x) => `${x.name}${x.isFavorite ? " ?" : ""}${x.isActive ? "" : " (inactive)"}`);
            populateSelect(elements.endLocationId, state.locations, (x) => `${x.name}${x.isFavorite ? " ?" : ""}${x.isActive ? "" : " (inactive)"}`);

            populateSelect(elements.filterVehicle, state.vehicles, (x) => `${x.plateNumber} • ${x.makeModel}`, true);
            populateSelect(elements.filterDriver, state.drivers, (x) => x.name, true);

            elements.purposePresets.innerHTML = "";
            state.purposePresets.forEach((item) => {
                const option = document.createElement("option");
                option.value = item;
                elements.purposePresets.appendChild(option);
            });

            applyDefaults(bootstrap.defaults, true);
            applyDefaultFilterRange();
            wireEvents();
            await loadTrips();
            elements.endMileage.focus();
        } catch (error) {
            setMessage(error.message, true);
        }
    };

    init();
})();
