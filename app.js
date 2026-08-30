/* =========================================================
   NEXUS GATE
   Spatial Task Engine
========================================================= */


/* =========================================================
   STATE
========================================================= */

let currentLocation = null;

let gates = JSON.parse(
    localStorage.getItem("nexusGates") || "[]"
);


/* =========================================================
   ELEMENTS
========================================================= */

const locateBtn =
    document.getElementById("locateBtn");

const useLocationBtn =
    document.getElementById("useLocationBtn");

const createGateBtn =
    document.getElementById("createGateBtn");

const taskInput =
    document.getElementById("taskInput");

const locationInput =
    document.getElementById("locationInput");

const radiusInput =
    document.getElementById("radiusInput");

const gatesContainer =
    document.getElementById("gatesContainer");

const emptyState =
    document.getElementById("emptyState");

const gateCount =
    document.getElementById("gateCount");

const systemStatus =
    document.getElementById("systemStatus");

const gpsStatus =
    document.getElementById("gpsStatus");

const latitude =
    document.getElementById("latitude");

const longitude =
    document.getElementById("longitude");

const accuracy =
    document.getElementById("accuracy");


/* =========================================================
   GPS
========================================================= */

function detectLocation() {

    if (!navigator.geolocation) {

        systemStatus.textContent =
            "GPS NOT SUPPORTED";

        gpsStatus.textContent =
            "GPS UNAVAILABLE";

        return;

    }


    systemStatus.textContent =
        "LOCATING...";

    gpsStatus.textContent =
        "ACQUIRING SIGNAL";


    navigator.geolocation.getCurrentPosition(

        position => {

            updateLocation(position);

        },

        error => {

            console.error(error);

            systemStatus.textContent =
                "LOCATION ERROR";

            gpsStatus.textContent =
                "GPS ERROR";

        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }

    );

}


/* =========================================================
   UPDATE LOCATION
========================================================= */

function updateLocation(position) {

    const coords = position.coords;


    currentLocation = {

        latitude: coords.latitude,

        longitude: coords.longitude,

        accuracy: coords.accuracy

    };


    latitude.textContent =
        coords.latitude.toFixed(6);

    longitude.textContent =
        coords.longitude.toFixed(6);

    accuracy.textContent =
        `${Math.round(coords.accuracy)} m`;


    locationInput.value =
        `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;


    systemStatus.textContent =
        "SYSTEM ONLINE";

    gpsStatus.textContent =
        "GPS LOCKED";


    gpsStatus.style.color =
        "var(--amber)";

}


/* =========================================================
   CREATE GATE
========================================================= */

function createGate() {

    const task =
        taskInput.value.trim();


    if (!task) {

        alert("Enter a task first.");

        taskInput.focus();

        return;

    }


    if (!currentLocation) {

        alert(
            "Detect your location before creating a gate."
        );

        detectLocation();

        return;

    }


    const radius =
        Number(radiusInput.value);


    const gate = {

        id:
            Date.now(),

        task:
            task,

        latitude:
            currentLocation.latitude,

        longitude:
            currentLocation.longitude,

        radius:
            radius,

        state:
            "closed",

        createdAt:
            new Date().toISOString()

    };


    gates.push(gate);


    saveGates();

    renderGates();


    taskInput.value = "";

}


/* =========================================================
   SAVE GATES
========================================================= */

function saveGates() {

    localStorage.setItem(
        "nexusGates",
        JSON.stringify(gates)
    );

}


/* =========================================================
   RENDER GATES
========================================================= */

function renderGates() {

    gatesContainer.innerHTML = "";


    gateCount.textContent =
        gates.length;


    if (gates.length === 0) {

        gatesContainer.appendChild(
            emptyState
        );

        return;

    }


    gates.forEach(gate => {

        const card =
            document.createElement("article");


        card.className =
            `gate-card ${gate.state}`;


        card.innerHTML = `

            <div class="gate-state">

                <span class="gate-state-dot"></span>

                ${gate.state === "open"
                    ? "GATE OPEN"
                    : "GATE CLOSED"}

            </div>


            <div class="gate-task">
                ${escapeHTML(gate.task)}
            </div>


            <div class="gate-meta">

                <span>
                    ${gate.latitude.toFixed(5)},
                    ${gate.longitude.toFixed(5)}
                </span>

                <span>
                    ${gate.radius}M
                </span>

            </div>


            <button
                class="complete-button"
                onclick="completeGate(${gate.id})">

                COMPLETE & DESTROY

            </button>

        `;


        gatesContainer.appendChild(card);

    });

}


/* =========================================================
   COMPLETE GATE
========================================================= */

function completeGate(id) {

    gates =
        gates.filter(
            gate => gate.id !== id
        );


    saveGates();

    renderGates();

}


/* =========================================================
   BASIC HTML SAFETY
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

locateBtn.addEventListener(
    "click",
    detectLocation
);


useLocationBtn.addEventListener(
    "click",
    detectLocation
);


createGateBtn.addEventListener(
    "click",
    createGate
);


/* =========================================================
   INITIAL LOAD
========================================================= */

renderGates();


/* =========================================================
   AUTO GPS
========================================================= */

detectLocation();/* =========================================================
   NEXUS SPATIAL ENGINE
========================================================= */


/* =========================================================
   DISTANCE CALCULATION
   Haversine Formula
========================================================= */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadius = 6371000;

    const latDifference =
        toRadians(lat2 - lat1);

    const lonDifference =
        toRadians(lon2 - lon1);


    const a =
        Math.sin(latDifference / 2) *
        Math.sin(latDifference / 2) +

        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *

        Math.sin(lonDifference / 2) *
        Math.sin(lonDifference / 2);


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;

}


function toRadians(degrees) {

    return degrees * Math.PI / 180;

}


/* =========================================================
   CHECK ALL GATES
========================================================= */

function checkGates() {

    if (!currentLocation || gates.length === 0) {
        return;
    }


    let changed = false;


    gates.forEach(gate => {

        const distance =
            calculateDistance(

                currentLocation.latitude,

                currentLocation.longitude,

                gate.latitude,

                gate.longitude

            );


        gate.distance =
            Math.round(distance);


        const insideGate =
            distance <= gate.radius;


        /* =========================
           ARRIVE → OPEN
        ========================= */

        if (
            insideGate &&
            gate.state !== "open"
        ) {

            gate.state = "open";

            changed = true;

            showGateArrival(gate);

        }


        /* =========================
           LEAVE → CLOSE
        ========================= */

        else if (
            !insideGate &&
            gate.state === "open"
        ) {

            gate.state = "closed";

            changed = true;

        }

    });


    if (changed) {

        saveGates();

        renderGates();

    }

}


/* =========================================================
   ARRIVAL EVENT
========================================================= */

function showGateArrival(gate) {

    systemStatus.textContent =
        "GATE ACTIVATED";


    gpsStatus.textContent =
        "SPATIAL MATCH";


    gpsStatus.style.color =
        "var(--amber)";


    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {

        new Notification(
            "NEXUS GATE",
            {
                body: gate.task
            }
        );

    }


    setTimeout(() => {

        systemStatus.textContent =
            "SYSTEM ONLINE";

    }, 3000);

}


/* =========================================================
   LIVE GPS TRACKING
========================================================= */

function startTracking() {

    if (!navigator.geolocation) {

        return;

    }


    navigator.geolocation.watchPosition(

        position => {

            updateLocation(position);

            checkGates();

        },

        error => {

            console.error(
                "GPS tracking error:",
                error
            );

            gpsStatus.textContent =
                "GPS SIGNAL LOST";

        },

        {

            enableHighAccuracy: true,

            maximumAge: 5000,

            timeout: 15000

        }

    );

}


/* =========================================================
   REQUEST NOTIFICATIONS
========================================================= */

function requestNotifications() {

    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {

        Notification.requestPermission();

    }

}


/* =========================================================
   START NEXUS
========================================================= */

requestNotifications();

startTracking();

checkGates();
