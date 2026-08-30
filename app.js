/* =========================================================
   NEXUS GATE v0.3
   Spatial Task + Arrival Alert Engine
========================================================= */

let currentLocation = null;
let gpsWatcher = null;

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

const radiusHint =
    document.getElementById("radiusHint");

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
   RADIUS DESCRIPTIONS
========================================================= */

const radiusDescriptions = {

    25: "Basically at the spot",

    50: "Approaching the location",

    100: "Somewhere around the place",

    250: "Nearby neighborhood"

};


/* =========================================================
   RADIUS HINT
========================================================= */

function updateRadiusHint() {

    const radius =
        Number(radiusInput.value);

    radiusHint.textContent =
        radiusDescriptions[radius] ||
        "Custom activation range";

}


/* =========================================================
   GPS DETECTION
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

            checkGates();

        },

        error => {

            console.error(
                "Location error:",
                error
            );

            handleLocationError(error);

        },

        {
            enableHighAccuracy: true,

            timeout: 15000,

            maximumAge: 5000
        }

    );

}


/* =========================================================
   UPDATE LOCATION
========================================================= */

function updateLocation(position) {

    const coords =
        position.coords;


    currentLocation = {

        latitude:
            coords.latitude,

        longitude:
            coords.longitude,

        accuracy:
            coords.accuracy

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
   LOCATION ERRORS
========================================================= */

function handleLocationError(error) {

    gpsStatus.style.color =
        "var(--closed)";


    if (error.code === 1) {

        systemStatus.textContent =
            "LOCATION DENIED";

        gpsStatus.textContent =
            "PERMISSION DENIED";

    }

    else if (error.code === 2) {

        systemStatus.textContent =
            "LOCATION UNAVAILABLE";

        gpsStatus.textContent =
            "SIGNAL UNAVAILABLE";

    }

    else if (error.code === 3) {

        systemStatus.textContent =
            "LOCATION TIMEOUT";

        gpsStatus.textContent =
            "SIGNAL TIMEOUT";

    }

    else {

        systemStatus.textContent =
            "LOCATION ERROR";

        gpsStatus.textContent =
            "GPS ERROR";

    }

}


/* =========================================================
   CREATE GATE
========================================================= */

function createGate() {

    const task =
        taskInput.value.trim();


    if (!task) {

        alert(
            "Enter a task first."
        );

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

        distance:
            0,

        createdAt:
            new Date().toISOString()

    };


    const distance =
        calculateDistance(

            currentLocation.latitude,

            currentLocation.longitude,

            gate.latitude,

            gate.longitude

        );


    gate.distance =
        Math.round(distance);


    gate.state =
        distance <= gate.radius
            ? "open"
            : "closed";


    gates.push(gate);

    saveGates();

    renderGates();


    taskInput.value = "";


    systemStatus.textContent =
        "GATE CREATED";

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
   INITIAL UI
========================================================= */

updateRadiusHint();

renderGates();/* =========================================================
   DISTANCE ENGINE
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
        Math.sin(latDifference / 2) ** 2 +

        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *

        Math.sin(lonDifference / 2) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;

}


function toRadians(degrees) {

    return degrees *
        Math.PI /
        180;

}


/* =========================================================
   CHECK ALL GATES
========================================================= */

function checkGates() {

    if (!currentLocation) {
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


        const wasOpen =
            gate.state === "open";


        const isInside =
            distance <= gate.radius;


        /* ARRIVE → OPEN */

        if (
            isInside &&
            !wasOpen
        ) {

            gate.state =
                "open";

            changed = true;

            triggerGateOpen(gate);

        }


        /* LEAVE → CLOSE */

        else if (
            !isInside &&
            wasOpen
        ) {

            gate.state =
                "closed";

            changed = true;

        }

    });


    renderGates();


    if (changed) {

        saveGates();

    }

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


        const distance =
            Number.isFinite(gate.distance)
                ? gate.distance
                : null;


        let proximity = 0;


        if (distance !== null) {

            if (
                distance <= gate.radius
            ) {

                proximity =
                    (
                        (gate.radius - distance)
                        / gate.radius
                    ) * 100;

            }

            else {

                proximity =
                    (
                        gate.radius /
                        distance
                    ) * 100;

            }

        }


        proximity =
            Math.max(
                0,
                Math.min(
                    100,
                    proximity
                )
            );


        const distanceText =
            distance === null
                ? "--"
                : formatDistance(distance);


        const distanceLabel =
            distance === null
                ? "DISTANCE"
                : distance <= gate.radius
                    ? "INSIDE GATE"
                    : "DISTANCE TO GATE";


        card.innerHTML = `

            <div class="gate-state">

                <span class="gate-state-dot"></span>

                ${
                    gate.state === "open"
                        ? "GATE OPEN"
                        : "GATE CLOSED"
                }

            </div>


            <div class="gate-task">
                ${escapeHTML(gate.task)}
            </div>


            <div class="gate-spatial">

                <div class="spatial-stat">

                    <span>
                        ${distanceLabel}
                    </span>

                    <strong>
                        ${distanceText}
                    </strong>

                </div>


                <div class="spatial-stat">

                    <span>
                        ACTIVATION RADIUS
                    </span>

                    <strong>
                        ${gate.radius} m
                    </strong>

                </div>

            </div>


            <div class="proximity">

                <div class="proximity-label">

                    <span>
                        PROXIMITY
                    </span>

                    <span>
                        ${Math.round(proximity)}%
                    </span>

                </div>


                <div class="proximity-track">

                    <div
                        class="proximity-fill"
                        style="width:${proximity}%">

                    </div>

                </div>

            </div>


            <div class="gate-meta">

                <span>
                    ${gate.latitude.toFixed(5)},
                    ${gate.longitude.toFixed(5)}
                </span>

                <span>
                    ${getRadiusMode(gate.radius)}
                </span>

            </div>


            <button
                class="complete-button"
                data-gate-id="${gate.id}"
                type="button">

                COMPLETE & DESTROY

            </button>

        `;


        gatesContainer.appendChild(card);

    });


    /*
       Attach complete buttons
    */

    document
        .querySelectorAll(".complete-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        Number(
                            button.dataset.gateId
                        );

                    completeGate(id);

                }
            );

        });

}


/* =========================================================
   DISTANCE FORMAT
========================================================= */

function formatDistance(distance) {

    if (distance < 1000) {

        return `${Math.round(distance)} m`;

    }


    return `${(
        distance / 1000
    ).toFixed(1)} km`;

}


/* =========================================================
   RADIUS MODE
========================================================= */

function getRadiusMode(radius) {

    const modes = {

        25: "EXACT",

        50: "NEAR",

        100: "AREA",

        250: "ZONE"

    };


    return modes[radius] ||
        "CUSTOM";

}/* =========================================================
   ARRIVAL ALERT
========================================================= */

function triggerGateOpen(gate) {

    systemStatus.textContent =
        "GATE ACTIVATED";


    gpsStatus.textContent =
        "SPATIAL MATCH";


    gpsStatus.style.color =
        "var(--amber)";


    /* =========================
       PHONE VIBRATION
    ========================= */

    if ("vibrate" in navigator) {

        navigator.vibrate([
            250,
            120,
            250
        ]);

    }


    /* =========================
       ALERT SOUND
    ========================= */

    playAlertSound();


    /* =========================
       BROWSER NOTIFICATION
    ========================= */

    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {

        try {

            new Notification(
                "NEXUS GATE OPEN",
                {

                    body:
                        `${gate.task}\nYou have arrived.`,

                    tag:
                        `nexus-${gate.id}`,

                    renotify:
                        true

                }
            );

        }

        catch (error) {

            console.log(
                "Notification error:",
                error
            );

        }

    }


    /* =========================
       RESET STATUS
    ========================= */

    setTimeout(() => {

        systemStatus.textContent =
            "SYSTEM ONLINE";

        gpsStatus.textContent =
            "GPS LOCKED";

    }, 3500);

}


/* =========================================================
   ALERT SOUND
   Web Audio API
========================================================= */

function playAlertSound() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {
            return;
        }


        const context =
            new AudioContext();


        const oscillator =
            context.createOscillator();


        const gain =
            context.createGain();


        oscillator.type =
            "sine";


        oscillator.frequency.value =
            880;


        gain.gain.setValueAtTime(
            0.0001,
            context.currentTime
        );


        gain.gain.exponentialRampToValueAtTime(
            0.18,
            context.currentTime + 0.02
        );


        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.35
        );


        oscillator.connect(gain);

        gain.connect(
            context.destination
        );


        oscillator.start();

        oscillator.stop(
            context.currentTime + 0.35
        );

    }

    catch (error) {

        console.log(
            "Audio unavailable:",
            error
        );

    }

}


/* =========================================================
   COMPLETE & DESTROY
========================================================= */

function completeGate(id) {

    const gate =
        gates.find(
            item => item.id === id
        );


    if (!gate) {
        return;
    }


    gates =
        gates.filter(
            item => item.id !== id
        );


    saveGates();

    renderGates();


    systemStatus.textContent =
        "GATE DESTROYED";


    setTimeout(() => {

        systemStatus.textContent =
            "SYSTEM ONLINE";

    }, 2500);

}


/* =========================================================
   LIVE GPS TRACKING
========================================================= */

function startTracking() {

    if (!navigator.geolocation) {
        return;
    }


    if (
        gpsWatcher !== null
    ) {

        navigator.geolocation.clearWatch(
            gpsWatcher
        );

    }


    gpsWatcher =
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

                handleLocationError(error);

            },


            {

                enableHighAccuracy: true,

                maximumAge: 5000,

                timeout: 15000

            }

        );

}


/* =========================================================
   NOTIFICATION PERMISSION
========================================================= */

function requestNotifications() {

    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {

        Notification.requestPermission()

            .catch(
                error =>
                    console.log(
                        "Notification permission:",
                        error
                    )
            );

    }

}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");


    div.textContent =
        text;


    return div.innerHTML;

}


/* =========================================================
   EVENT LISTENERS
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


radiusInput.addEventListener(
    "change",
    updateRadiusHint
);


/* =========================================================
   ENTER KEY
========================================================= */

taskInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            createGate();

        }

    }
);


/* =========================================================
   INITIALIZE NEXUS
========================================================= */

updateRadiusHint();

renderGates();

requestNotifications();

startTracking();

checkGates();
