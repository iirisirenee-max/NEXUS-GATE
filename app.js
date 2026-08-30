/* =========================================================
   NEXUS GATE
   Spatial Task Engine
   PART 1 / 3
========================================================= */

let currentLocation = null;
let gpsWatcher = null;

let gates = JSON.parse(
    localStorage.getItem("nexusGates") || "[]"
);


/* =========================================================
   GPS STABILITY
========================================================= */

const GPS_HISTORY_SIZE = 5;

let locationHistory = [];


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

    25:
        "Exact location — GPS precision may vary",

    50:
        "Close range",

    100:
        "Around the location",

    250:
        "Nearby zone"

};


/* =========================================================
   UPDATE RADIUS HINT
========================================================= */

function updateRadiusHint() {

    if (!radiusHint) {
        return;
    }


    const radius =
        Number(radiusInput.value);


    radiusHint.textContent =
        radiusDescriptions[radius] ||
        "Custom activation range";

}


/* =========================================================
   DETECT LOCATION
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

function processGPSPosition(position) {

    const coords =
        position.coords;


    /*
       Store recent readings.
       This helps reduce GPS jumping.
    */

    locationHistory.push({

        latitude:
            coords.latitude,

        longitude:
            coords.longitude,

        accuracy:
            coords.accuracy,

        timestamp:
            Date.now()

    });


    if (
        locationHistory.length >
        GPS_HISTORY_SIZE
    ) {

        locationHistory.shift();

    }


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


    checkGates();

}


/* =========================================================
   STABLE LOCATION
========================================================= */

function getStableLocation() {

    if (
        locationHistory.length === 0
    ) {

        return null;

    }


    /*
       Average the recent coordinates.
       Accuracy is averaged separately.
    */

    let latitudeSum = 0;

    let longitudeSum = 0;

    let accuracySum = 0;


    locationHistory.forEach(
        reading => {

            latitudeSum +=
                reading.latitude;

            longitudeSum +=
                reading.longitude;

            accuracySum +=
                reading.accuracy;

        }
    );


    const count =
        locationHistory.length;


    return {

        latitude:
            latitudeSum / count,

        longitude:
            longitudeSum / count,

        accuracy:
            accuracySum / count

    };

}


/* =========================================================
   UPDATE LOCATION DISPLAY
========================================================= */

function updateLocationDisplay(
    location
) {

    latitude.textContent =
        location.latitude.toFixed(6);


    longitude.textContent =
        location.longitude.toFixed(6);


    accuracy.textContent =
        `${Math.round(location.accuracy)} m`;


    locationInput.value =
        `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;


    systemStatus.textContent =
        "SYSTEM ONLINE";


    gpsStatus.textContent =
        "GPS LOCKED";


    gpsStatus.style.color =
        "var(--amber)";

}


/* =========================================================
   LOCATION ERROR
========================================================= */

function handleLocationError(error) {

    gpsStatus.style.color =
        "var(--closed)";


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
            "open",

        distance:
            0,

        accuracy:
            currentLocation.accuracy,

        createdAt:
            new Date().toISOString()

    };


    /*
       A newly created gate starts OPEN
       because you are currently inside it.
    */

    gates.push(
        gate
    );


    saveGates();

    renderGates();


    taskInput.value = "";


    systemStatus.textContent =
        "GATE CREATED";


    /*
       Make sure tracking is active.
    */

    startTracking();

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
   INITIAL SETUP
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


        /*
           GPS uncertainty protection.

           We don't want a gate to rapidly switch
           when the GPS measurement is unreliable.
        */

        const gpsAccuracy =
            currentLocation.accuracy;


        const buffer =
            Math.max(
                8,
                Math.min(
                    gpsAccuracy * 0.35,
                    20
                )
            );


        /*
           OPEN → CLOSED

           We only close the gate after the user
           is clearly outside the radius.
        */

        if (
            gate.state === "open" &&
            distance >
            gate.radius + buffer
        ) {

            gate.state =
                "closed";


            changed = true;


            triggerGateClosed(
                gate
            );

        }


        /*
           CLOSED → OPEN

           We allow the user back inside when
           they are clearly within the zone.
        */

        else if (
            gate.state === "closed" &&
            distance <
            gate.radius - buffer
        ) {

            gate.state =
                "open";


            changed = true;


            triggerGateOpen(
                gate
            );

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
            document.createElement(
                "article"
            );


        card.className =
            `gate-card ${gate.state}`;


        const distance =
            Number.isFinite(
                gate.distance
            )
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
                        /
                        gate.radius
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
                : formatDistance(
                    distance
                );


        const distanceLabel =
            distance === null
                ? "DISTANCE"
                : distance <= gate.radius
                    ? "INSIDE GATE"
                    : "DISTANCE TO GATE";


        card.innerHTML = `

            <div class="gate-state">

                <span
                    class="gate-state-dot">
                </span>

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
                        ${formatDistance(
                            gate.radius
                        )}
                    </strong>

                </div>

            </div>


            <div class="proximity">

                <div class="proximity-label">

                    <span>
                        PROXIMITY
                    </span>

                    <span>
                        ${Math.round(
                            proximity
                        )}%
                    </span>

                </div>


                <div class="proximity-track">

                    <div
                        class="proximity-fill"
                        style="
                            width:${proximity}%;
                        "
                    >
                    </div>

                </div>

            </div>


            <div class="gate-meta">

                <span>
                    ${
                        Number.isFinite(
                            gate.latitude
                        )
                            ? gate.latitude.toFixed(5)
                            : "--"
                    },
                    ${
                        Number.isFinite(
                            gate.longitude
                        )
                            ? gate.longitude.toFixed(5)
                            : "--"
                    }
                </span>


                <span>
                    ${getRadiusMode(
                        gate.radius
                    )}
                </span>

            </div>


            <button
                class="complete-button"
                data-gate-id="${gate.id}"
                type="button">

                COMPLETE & DESTROY

            </button>

        `;


        gatesContainer.appendChild(
            card
        );

    });


    /*
       Complete buttons
    */

    document
        .querySelectorAll(
            ".complete-button"
        )
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
   DISTANCE FORMATTER
========================================================= */

function formatDistance(
    distance
) {

    if (
        distance < 1000
    ) {

        return `${Math.round(
            distance
        )} m`;

    }


    return `${(
        distance / 1000
    ).toFixed(1)} km`;

}


/* =========================================================
   RADIUS MODE
========================================================= */

function getRadiusMode(
    radius
) {

    const modes = {

        25:
            "EXACT",

        50:
            "NEAR",

        100:
            "AREA",

        250:
            "ZONE"

    };


    return modes[radius] ||
        "CUSTOM";

               }/* =========================================================
   GATE OPEN ALERT
========================================================= */

function triggerGateOpen(gate) {

    systemStatus.textContent =
        "GATE ACTIVATED";

    gpsStatus.textContent =
        "SPATIAL MATCH";


    if ("vibrate" in navigator) {

        navigator.vibrate([
            250,
            120,
            250
        ]);

    }


    playAlertSound();


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
                        `nexus-open-${gate.id}`
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


    setTimeout(() => {

        systemStatus.textContent =
            "SYSTEM ONLINE";

        gpsStatus.textContent =
            "GPS LOCKED";

    }, 3500);

}


/* =========================================================
   GATE CLOSED ALERT
========================================================= */

function triggerGateClosed(gate) {

    systemStatus.textContent =
        "GATE CLOSED";

    gpsStatus.textContent =
        "ZONE EXITED";


    if ("vibrate" in navigator) {

        navigator.vibrate([
            150,
            100,
            150
        ]);

    }


    playAlertSound();


    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {

        try {

            new Notification(
                "NEXUS GATE CLOSED",
                {
                    body:
                        `${gate.task}\nYou have left the zone.`,
                    tag:
                        `nexus-closed-${gate.id}`
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


    setTimeout(() => {

        systemStatus.textContent =
            "SYSTEM ONLINE";

        gpsStatus.textContent =
            "GPS LOCKED";

    }, 3500);

}


/* =========================================================
   ALERT SOUND
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
                    3000,

                timeout:
                    15000

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

        Notification.requestPermission()

            .then(permission => {

                console.log(
                    "Notification permission:",
                    permission
                );

            })

            .catch(error => {

                console.log(
                    "Notification permission error:",
                    error
                );

            });

    }

}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


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
