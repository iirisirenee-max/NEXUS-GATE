/* =========================================================
   NEXUS GATE
   SPATIAL TASK ENGINE
   APP.JS — PART 1 / 3
========================================================= */


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentLocation = null;

let gpsWatcher = null;

let selectedMode = "place";

let locationHistory = [];

let lastGPSPoint = null;


/* =========================================================
   CONSTANTS
========================================================= */

const GPS_HISTORY_SIZE = 5;


/* =========================================================
   LOAD SAVED GATES
========================================================= */

let gates = [];

try {

    gates = JSON.parse(
        localStorage.getItem("nexusGates") || "[]"
    );

} catch (error) {

    console.log(
        "Could not load saved gates:",
        error
    );

    gates = [];

}


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

const smartInput =
    document.getElementById("smartInput");

const distanceInput =
    document.getElementById("distanceInput");

const distanceUnit =
    document.getElementById("distanceUnit");

const radiusHint =
    document.getElementById("radiusHint");

const locationField =
    document.getElementById("locationField");

const smartField =
    document.getElementById("smartField");

const distanceField =
    document.getElementById("distanceField");

const placeModeBtn =
    document.getElementById("placeModeBtn");

const travelModeBtn =
    document.getElementById("travelModeBtn");

const smartModeBtn =
    document.getElementById("smartModeBtn");

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
   TRIGGER MODE
========================================================= */

function setMode(mode) {

    selectedMode = mode;


    /*
       Remove active state from all buttons.
    */

    placeModeBtn.classList.remove(
        "active"
    );

    travelModeBtn.classList.remove(
        "active"
    );

    smartModeBtn.classList.remove(
        "active"
    );


    /*
       Activate selected mode.
    */

    if (mode === "place") {

        placeModeBtn.classList.add(
            "active"
        );

    }

    else if (mode === "travel") {

        travelModeBtn.classList.add(
            "active"
        );

    }

    else if (mode === "smart") {

        smartModeBtn.classList.add(
            "active"
        );

    }


    /*
       NEAR A PLACE
    */

    if (mode === "place") {

        locationField.classList.remove(
            "hidden"
        );

        distanceField.classList.remove(
            "hidden"
        );

        smartField.classList.add(
            "hidden"
        );


        radiusHint.textContent =
            "Trigger when you enter the selected radius.";

    }


    /*
       DISTANCE TRAVELLED
    */

    else if (mode === "travel") {

        locationField.classList.remove(
            "hidden"
        );

        distanceField.classList.remove(
            "hidden"
        );

        smartField.classList.add(
            "hidden"
        );


        radiusHint.textContent =
            "Measures the actual path travelled from here.";

    }


    /*
       SMART
    */

    else if (mode === "smart") {

        locationField.classList.remove(
            "hidden"
        );

        distanceField.classList.add(
            "hidden"
        );

        smartField.classList.remove(
            "hidden"
        );


        radiusHint.textContent =
            "Smart location mode will use the saved GPS point.";

    }

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

            processGPSPosition(
                position
            );

        },


        error => {

            handleLocationError(
                error
            );

        },


        {

            enableHighAccuracy:
                true,

            timeout:
                20000,

            maximumAge:
                0

        }

    );

}


/* =========================================================
   PROCESS GPS POSITION
========================================================= */

function processGPSPosition(
    position
) {

    const coords =
        position.coords;


    /*
       Ignore obviously invalid GPS readings.
    */

    if (
        !Number.isFinite(
            coords.latitude
        ) ||
        !Number.isFinite(
            coords.longitude
        )
    ) {

        return;

    }


    const reading = {

        latitude:
            coords.latitude,

        longitude:
            coords.longitude,

        accuracy:
            Number.isFinite(
                coords.accuracy
            )
                ? coords.accuracy
                : 999,

        timestamp:
            Date.now()

    };


    /*
       Keep recent GPS readings.
    */

    locationHistory.push(
        reading
    );


    if (
        locationHistory.length >
        GPS_HISTORY_SIZE
    ) {

        locationHistory.shift();

    }


    /*
       Calculate a stabilized position.
    */

    const stableLocation =
        getStableLocation();


    if (!stableLocation) {
        return;
    }


    currentLocation =
        stableLocation;


    updateLocationDisplay(
        stableLocation
    );


    /*
       Calculate travelled distance
       before replacing the previous point.
    */

    updateTravelledDistance(
        stableLocation
    );


    /*
       Check every active gate.
    */

    checkGates();

}


/* =========================================================
   STABLE GPS LOCATION
========================================================= */

function getStableLocation() {

    if (
        locationHistory.length === 0
    ) {

        return null;

    }


    let latSum = 0;

    let lonSum = 0;

    let accuracySum = 0;


    locationHistory.forEach(
        reading => {

            latSum +=
                reading.latitude;

            lonSum +=
                reading.longitude;

            accuracySum +=
                reading.accuracy;

        }
    );


    const count =
        locationHistory.length;


    return {

        latitude:
            latSum / count,

        longitude:
            lonSum / count,

        accuracy:
            accuracySum / count

    };

}


/* =========================================================
   UPDATE GPS DISPLAY
========================================================= */

function updateLocationDisplay(
    location
) {

    latitude.textContent =
        location.latitude.toFixed(6);


    longitude.textContent =
        location.longitude.toFixed(6);


    accuracy.textContent =
        `${Math.round(
            location.accuracy
        )} m`;


    locationInput.value =
        `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;


    systemStatus.textContent =
        "SYSTEM ONLINE";


    gpsStatus.textContent =
        "GPS LOCKED";

}


/* =========================================================
   TRAVELLED DISTANCE
========================================================= */

function updateTravelledDistance(
    location
) {

    /*
       First GPS reading establishes
       the starting point.
    */

    if (!lastGPSPoint) {

        lastGPSPoint = {

            latitude:
                location.latitude,

            longitude:
                location.longitude

        };

        return;

    }


    /*
       Calculate movement since the
       previous stabilized GPS point.
    */

    const movement =
        calculateDistance(

            lastGPSPoint.latitude,

            lastGPSPoint.longitude,

            location.latitude,

            location.longitude

        );


    /*
       Ignore tiny GPS noise.

       This prevents a stationary phone
       from accumulating fake walking distance.
    */

    const minimumMovement =
        Math.max(
            3,
            Math.min(
                location.accuracy * 0.25,
                8
            )
        );


    if (
        movement >=
        minimumMovement
    ) {

        gates.forEach(
            gate => {

                if (
                    gate.mode !== "travel"
                ) {
                    return;
                }


                /*
                   Accumulate actual path
                   distance for travel gates.
                */

                gate.travelledDistance =
                    (
                        gate.travelledDistance || 0
                    ) + movement;

            }
        );


        saveGates();

    }


    lastGPSPoint = {

        latitude:
            location.latitude,

        longitude:
            location.longitude

    };

}


/* =========================================================
   LOCATION ERROR
========================================================= */

function handleLocationError(
    error
) {

    if (
        error.code === 1
    ) {

        systemStatus.textContent =
            "LOCATION DENIED";

        gpsStatus.textContent =
            "PERMISSION DENIED";

    }

    else if (
        error.code === 2
    ) {

        systemStatus.textContent =
            "LOCATION UNAVAILABLE";

        gpsStatus.textContent =
            "SIGNAL UNAVAILABLE";

    }

    else if (
        error.code === 3
    ) {

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
   DISTANCE CONVERSION
========================================================= */

function getDistanceInMeters() {

    const value =
        Number(
            distanceInput.value
        );


    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return null;

    }


    if (
        distanceUnit.value === "km"
    ) {

        return value * 1000;

    }


    return value;

    }/* =========================================================
   HAVERSINE DISTANCE
========================================================= */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadius = 6371000;

    const lat1Rad =
        lat1 * Math.PI / 180;

    const lat2Rad =
        lat2 * Math.PI / 180;

    const deltaLat =
        (lat2 - lat1) *
        Math.PI / 180;

    const deltaLon =
        (lon2 - lon1) *
        Math.PI / 180;


    const a =
        Math.sin(deltaLat / 2) ** 2 +

        Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLon / 2) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;

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


    /*
       Smart mode currently uses
       the GPS point as its spatial anchor.
    */

    if (
        !currentLocation
    ) {

        alert(
            "Detect your location before creating a gate."
        );

        detectLocation();

        return;

    }


    /*
       Distance modes require a valid
       distance value.
    */

    let distance = null;


    if (
        selectedMode === "place" ||
        selectedMode === "travel"
    ) {

        distance =
            getDistanceInMeters();


        if (
            distance === null
        ) {

            alert(
                "Enter a valid distance."
            );

            distanceInput.focus();

            return;

        }

    }


    /*
       Prevent accidental duplicate gates.
    */

    const gate = {

        id:
            Date.now(),

        task:

            task,

        mode:

            selectedMode,

        latitude:

            currentLocation.latitude,

        longitude:

            currentLocation.longitude,

        accuracy:

            currentLocation.accuracy,

        distance:

            distance,

        smartPlace:

            selectedMode === "smart"
                ? smartInput.value.trim()
                : "",

        travelledDistance:

            0,

        triggered:

            false,

        open:

            false,

        completed:

            false,

        createdAt:

            Date.now()

    };


    gates.push(
        gate
    );


    saveGates();

    renderGates();


    /*
       Reset the form after creation.
    */

    taskInput.value = "";

    smartInput.value = "";


    systemStatus.textContent =
        "GATE CREATED";


    /*
       Small delay before returning
       the status to normal.
    */

    setTimeout(
        () => {

            systemStatus.textContent =
                "SYSTEM ONLINE";

        },
        1800
    );

}


/* =========================================================
   CHECK ALL GATES
========================================================= */

function checkGates() {

    if (
        !currentLocation
    ) {

        return;

    }


    gates.forEach(
        gate => {

            if (
                gate.completed
            ) {

                return;

            }


            /*
               NEAR A PLACE
            */

            if (
                gate.mode === "place"
            ) {

                checkPlaceGate(
                    gate
                );

            }


            /*
               DISTANCE TRAVELLED
            */

            else if (
                gate.mode === "travel"
            ) {

                checkTravelGate(
                    gate
                );

            }


            /*
               SMART
            */

            else if (
                gate.mode === "smart"
            ) {

                checkSmartGate(
                    gate
                );

            }

        }
    );


    saveGates();

    renderGates();

}


/* =========================================================
   NEAR-A-PLACE GATE
========================================================= */

function checkPlaceGate(
    gate
) {

    const distance =
        calculateDistance(

            currentLocation.latitude,

            currentLocation.longitude,

            gate.latitude,

            gate.longitude

        );


    gate.currentDistance =
        distance;


    /*
       The GPS reading itself has uncertainty.

       Don't pretend that a 10 m gate can be
       perfectly precise when the phone says
       accuracy is 25 m.

       We still trigger according to the user's
       requested radius, but the UI can show
       the GPS accuracy.
    */

    const inside =
        distance <=
        gate.distance;


    /*
       ENTERING THE GATE
    */

    if (
        inside &&
        !gate.open
    ) {

        gate.open = true;

        gate.triggered = true;

        gate.openedAt = Date.now();


        triggerArrival(
            gate
        );

    }


    /*
       LEAVING THE GATE
    */

    else if (
        !inside &&
        gate.open
    ) {

        gate.open = false;

        gate.closedAt = Date.now();


        triggerDeparture(
            gate
        );

    }

}


/* =========================================================
   DISTANCE-TRAVELLED GATE
========================================================= */

function checkTravelGate(
    gate
) {

    /*
       Once the user has travelled
       the requested amount, trigger it.

       Unlike a place gate, this doesn't
       care where the user ends up.
    */

    if (
        !gate.triggered &&
        gate.travelledDistance >=
        gate.distance
    ) {

        gate.triggered = true;

        gate.open = true;

        gate.openedAt = Date.now();


        triggerArrival(
            gate
        );

    }

}


/* =========================================================
   SMART GATE
========================================================= */

function checkSmartGate(
    gate
) {

    /*
       IMPORTANT:

       A browser cannot magically know
       that coordinates correspond to
       "airport", "school", "restaurant",
       etc.

       Until we connect a place/geocoding
       service, Smart mode uses the current
       saved GPS anchor.

       This keeps the engine functional
       without pretending we have a
       location database.

       The natural-language field is
       therefore currently descriptive.
    */

    const smartRadius =
        50;


    const distance =
        calculateDistance(

            currentLocation.latitude,

            currentLocation.longitude,

            gate.latitude,

            gate.longitude

        );


    gate.currentDistance =
        distance;


    if (
        distance <=
        smartRadius &&
        !gate.open
    ) {

        gate.open = true;

        gate.triggered = true;

        gate.openedAt = Date.now();


        triggerArrival(
            gate
        );

    }


    else if (
        distance >
        smartRadius &&
        gate.open
    ) {

        gate.open = false;

        gate.closedAt = Date.now();


        triggerDeparture(
            gate
        );

    }

}


/* =========================================================
   ARRIVAL TRIGGER
========================================================= */

function triggerArrival(
    gate
) {

    systemStatus.textContent =
        "GATE OPEN";


    /*
       Play the NEXUS arrival sound.
    */

    playArrivalSound();


    /*
       Ask the device to vibrate.
    */

    vibrateDevice(
        [
            180,
            100,
            180
        ]
    );


    /*
       Browser notification.
    */

    showNotification(
        "NEXUS GATE OPEN",
        gate.task
    );


    /*
       Bring attention to the
       relevant gate card.
    */

    renderGates();


    /*
       Attempt to keep the browser
       visually focused on the event.
    */

    document.title =
        "● GATE OPEN — NEXUS";

}


/* =========================================================
   DEPARTURE TRIGGER
========================================================= */

function triggerDeparture(
    gate
) {

    systemStatus.textContent =
        "GATE CLOSED";


    playDepartureSound();


    vibrateDevice(
        [
            100,
            80,
            100
        ]
    );


    showNotification(
        "NEXUS GATE CLOSED",
        gate.task
    );


    renderGates();


    document.title =
        "NEXUS GATE";


    setTimeout(
        () => {

            systemStatus.textContent =
                "SYSTEM ONLINE";

        },
        1800
    );

}


/* =========================================================
   VIBRATION
========================================================= */

function vibrateDevice(
    pattern
) {

    if (
        "vibrate" in navigator
    ) {

        try {

            navigator.vibrate(
                pattern
            );

        } catch (error) {

            console.log(
                "Vibration unavailable."
            );

        }

    }

}


/* =========================================================
   AUDIO ENGINE
========================================================= */

let audioContext = null;


function getAudioContext() {

    if (
        !audioContext
    ) {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {

            return null;

        }


        audioContext =
            new AudioContext();

    }


    if (
        audioContext.state ===
        "suspended"
    ) {

        audioContext.resume();

    }


    return audioContext;

}


/* =========================================================
   ARRIVAL SOUND
========================================================= */

function playArrivalSound() {

    const ctx =
        getAudioContext();


    if (!ctx) {

        return;

    }


    const now =
        ctx.currentTime;


    const oscillator =
        ctx.createOscillator();


    const gain =
        ctx.createGain();


    oscillator.type =
        "sine";


    oscillator.frequency
        .setValueAtTime(
            660,
            now
        );


    oscillator.frequency
        .linearRampToValueAtTime(
            880,
            now + 0.18
        );


    gain.gain
        .setValueAtTime(
            0.0001,
            now
        );


    gain.gain
        .exponentialRampToValueAtTime(
            0.22,
            now + 0.02
        );


    gain.gain
        .exponentialRampToValueAtTime(
            0.0001,
            now + 0.45
        );


    oscillator.connect(
        gain
    );


    gain.connect(
        ctx.destination
    );


    oscillator.start(
        now
    );


    oscillator.stop(
        now + 0.5
    );

}


/* =========================================================
   DEPARTURE SOUND
========================================================= */

function playDepartureSound() {

    const ctx =
        getAudioContext();


    if (!ctx) {

        return;

    }


    const now =
        ctx.currentTime;


    const oscillator =
        ctx.createOscillator();


    const gain =
        ctx.createGain();


    oscillator.type =
        "sine";


    oscillator.frequency
        .setValueAtTime(
            520,
            now
        );


    oscillator.frequency
        .linearRampToValueAtTime(
            330,
            now + 0.25
        );


    gain.gain
        .setValueAtTime(
            0.0001,
            now
        );


    gain.gain
        .exponentialRampToValueAtTime(
            0.18,
            now + 0.02
        );


    gain.gain
        .exponentialRampToValueAtTime(
            0.0001,
            now + 0.5
        );


    oscillator.connect(
        gain
    );


    gain.connect(
        ctx.destination
    );


    oscillator.start(
        now
    );


    oscillator.stop(
        now + 0.55
    );

}/* =========================================================
   NOTIFICATIONS
========================================================= */

function showNotification(title, message) {

    /*
       Notifications require permission from
       the user. Browsers also restrict them
       unless the site is served over HTTPS.
    */

    if (
        !("Notification" in window)
    ) {

        return;

    }


    if (
        Notification.permission ===
        "granted"
    ) {

        new Notification(
            title,
            {
                body: message,
                icon: "/favicon.ico"
            }
        );

    }

}


/* =========================================================
   REQUEST NOTIFICATION PERMISSION
========================================================= */

async function requestNotificationPermission() {

    if (
        !("Notification" in window)
    ) {

        return;

    }


    if (
        Notification.permission ===
        "default"
    ) {

        try {

            await Notification.requestPermission();

        } catch (error) {

            console.log(
                "Notification permission unavailable."
            );

        }

    }

}


/* =========================================================
   START GPS WATCH
========================================================= */

function startGPSWatch() {

    if (
        !navigator.geolocation
    ) {

        gpsStatus.textContent =
            "GPS UNSUPPORTED";

        return;

    }


    /*
       Don't create multiple GPS watchers.
    */

    if (
        gpsWatcher !== null
    ) {

        return;

    }


    gpsWatcher =
        navigator.geolocation.watchPosition(

            position => {

                processGPSPosition(
                    position
                );

            },


            error => {

                handleLocationError(
                    error
                );

            },


            {

                enableHighAccuracy:
                    true,

                maximumAge:
                    2000,

                timeout:
                    20000

            }

        );


    gpsStatus.textContent =
        "GPS WATCHING";

}


/* =========================================================
   SAVE GATES
========================================================= */

function saveGates() {

    try {

        localStorage.setItem(
            "nexusGates",
            JSON.stringify(
                gates
            )
        );

    } catch (error) {

        console.log(
            "Could not save gates:",
            error
        );

    }

}


/* =========================================================
   FORMAT DISTANCE
========================================================= */

function formatDistance(
    meters
) {

    if (
        !Number.isFinite(meters)
    ) {

        return "--";

    }


    if (
        meters >= 1000
    ) {

        return (
            meters / 1000
        ).toFixed(
            meters >= 10000
                ? 0
                : 2
        ) + " km";

    }


    if (
        meters >= 100
    ) {

        return (
            Math.round(meters)
        ) + " m";

    }


    return (
        meters.toFixed(1)
    ) + " m";

}


/* =========================================================
   MODE LABEL
========================================================= */

function getModeLabel(
    mode
) {

    if (
        mode === "place"
    ) {

        return "NEAR A PLACE";

    }


    if (
        mode === "travel"
    ) {

        return "DISTANCE TRAVELLED";

    }


    if (
        mode === "smart"
    ) {

        return "SMART";

    }


    return "UNKNOWN";

}


/* =========================================================
   RENDER GATES
========================================================= */

function renderGates() {

    /*
       Remove old dynamically-created
       gate cards while preserving
       the empty state element.
    */

    gatesContainer
        .querySelectorAll(
            ".gate-card"
        )
        .forEach(
            card => card.remove()
        );


    /*
       Update count.
    */

    const activeGates =
        gates.filter(
            gate =>
                !gate.completed
        );


    gateCount.textContent =
        activeGates.length;


    /*
       Show empty state when there
       are no active gates.
    */

    if (
        activeGates.length === 0
    ) {

        emptyState.style.display =
            "block";

        return;

    }


    emptyState.style.display =
        "none";


    /*
       Create cards.
    */

    activeGates.forEach(
        gate => {

            const card =
                createGateCard(
                    gate
                );


            gatesContainer.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   CREATE GATE CARD
========================================================= */

function createGateCard(
    gate
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "gate-card " +
        (
            gate.open
                ? "open"
                : "closed"
        );


    /*
       Current distance.

       For travel gates we show
       accumulated travelled distance.

       For place/smart gates we show
       distance from the anchor.
    */

    let currentDistance =
        0;


    if (
        gate.mode === "travel"
    ) {

        currentDistance =
            gate.travelledDistance || 0;

    }

    else {

        currentDistance =
            Number.isFinite(
                gate.currentDistance
            )
                ? gate.currentDistance
                : 0;

    }


    /*
       Progress percentage.
    */

    let progress = 0;


    if (
        gate.distance > 0
    ) {

        progress =
            Math.min(
                100,
                (
                    currentDistance /
                    gate.distance
                ) * 100
            );

    }


    /*
       For a place gate, entering means
       progress reaches 100%.

       For a travel gate, progress is
       actual accumulated movement.
    */

    const stateText =
        gate.open
            ? "GATE OPEN"
            : gate.triggered
                ? "GATE CLOSED"
                : "GATE ARMED";


    card.innerHTML = `

        <div class="gate-state">

            <span class="gate-state-dot"></span>

            ${stateText}

        </div>


        <div class="gate-task">
            ${escapeHTML(gate.task)}
        </div>


        <div class="gate-spatial">


            <div class="spatial-stat">

                <span>
                    MODE
                </span>

                <strong>
                    ${getModeLabel(
                        gate.mode
                    )}
                </strong>

            </div>


            <div class="spatial-stat">

                <span>
                    ${gate.mode === "travel"
                        ? "TRAVELLED"
                        : "DISTANCE"
                    }
                </span>

                <strong>
                    ${
                        gate.mode === "travel"
                            ? formatDistance(
                                currentDistance
                              )
                            : formatDistance(
                                gate.distance
                              )
                    }
                </strong>

            </div>


        </div>


        ${
            gate.mode === "smart"
                ? `
                    <div class="gate-meta">

                        <span>
                            PLACE
                        </span>

                        <span>
                            ${
                                escapeHTML(
                                    gate.smartPlace ||
                                    "GPS ANCHOR"
                                )
                            }
                        </span>

                    </div>
                  `
                : ""
        }


        ${
            gate.mode === "place"
                ? `
                    <div class="proximity">

                        <div class="proximity-label">

                            <span>
                                PROXIMITY
                            </span>

                            <span>
                                ${
                                    formatDistance(
                                        gate.currentDistance
                                    )
                                }
                            </span>

                        </div>


                        <div class="proximity-track">

                            <div
                                class="proximity-fill"
                                style="
                                    width:${progress}%;
                                ">
                            </div>

                        </div>

                    </div>
                  `
                : ""
        }


        ${
            gate.mode === "travel"
                ? `
                    <div class="proximity">

                        <div class="proximity-label">

                            <span>
                                JOURNEY PROGRESS
                            </span>

                            <span>
                                ${
                                    Math.round(
                                        progress
                                    )
                                }%
                            </span>

                        </div>


                        <div class="proximity-track">

                            <div
                                class="proximity-fill"
                                style="
                                    width:${progress}%;
                                ">
                            </div>

                        </div>

                    </div>
                  `
                : ""
        }


        <div class="gate-meta">

            <span>
                ACCURACY
            </span>

            <span>
                ${
                    Number.isFinite(
                        gate.accuracy
                    )
                        ? Math.round(
                            gate.accuracy
                          ) + " m"
                        : "--"
                }
            </span>

        </div>


        <button
            class="complete-button"
            type="button">

            COMPLETE & DESTROY

        </button>

    `;


    /*
       Complete / destroy.
    */

    const completeButton =
        card.querySelector(
            ".complete-button"
        );


    completeButton.addEventListener(
        "click",
        () => {

            completeGate(
                gate.id
            );

        }
    );


    return card;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   COMPLETE GATE
========================================================= */

function completeGate(
    id
) {

    const gate =
        gates.find(
            item =>
                item.id === id
        );


    if (!gate) {

        return;

    }


    gate.completed =
        true;


    gate.open =
        false;


    gate.completedAt =
        Date.now();


    saveGates();

    renderGates();


    systemStatus.textContent =
        "GATE DESTROYED";


    setTimeout(
        () => {

            systemStatus.textContent =
                "SYSTEM ONLINE";

        },
        1500
    );

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

locateBtn.addEventListener(
    "click",
    () => {

        detectLocation();

        startGPSWatch();

        requestNotificationPermission();

        /*
           AudioContext generally needs
           a user interaction to start.
        */

        const ctx =
            getAudioContext();

        if (ctx) {

            ctx.resume();

        }

    }
);


useLocationBtn.addEventListener(
    "click",
    () => {

        detectLocation();

        startGPSWatch();

    }
);


createGateBtn.addEventListener(
    "click",
    () => {

        createGate();

        /*
           Start continuous tracking as
           soon as a gate is created.
        */

        startGPSWatch();

        requestNotificationPermission();

    }
);


/* =========================================================
   MODE BUTTON EVENTS
========================================================= */

placeModeBtn.addEventListener(
    "click",
    () => {

        setMode(
            "place"
        );

    }
);


travelModeBtn.addEventListener(
    "click",
    () => {

        setMode(
            "travel"
        );

    }
);


smartModeBtn.addEventListener(
    "click",
    () => {

        setMode(
            "smart"
        );

    }
);


/* =========================================================
   DISTANCE INPUT NORMALIZATION
========================================================= */

distanceInput.addEventListener(
    "input",
    () => {

        /*
           Prevent negative values.
        */

        if (
            Number(
                distanceInput.value
            ) < 0
        ) {

            distanceInput.value =
                0;

        }

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

function initializeNexus() {

    setMode(
        "place"
    );


    renderGates();


    /*
       If gates already exist, GPS tracking
       should resume automatically after
       the user has granted permission.
    */

    if (
        gates.some(
            gate =>
                !gate.completed
        )
    ) {

        startGPSWatch();

    }


    systemStatus.textContent =
        "SYSTEM READY";


    gpsStatus.textContent =
        "GPS OFFLINE";

}


/* =========================================================
   START NEXUS
========================================================= */

initializeNexus();
