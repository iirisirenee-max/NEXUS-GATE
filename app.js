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

let gpsHistory = [];

const MAX_GPS_HISTORY = 3;


/* =========================================================
   LOAD SAVED GATES
========================================================= */

let gates = [];

try {

    gates = JSON.parse(
        localStorage.getItem("nexusGates") || "[]"
    );

    if (!Array.isArray(gates)) {
        gates = [];
    }

} catch (error) {

    console.log(
        "NEXUS: Could not load saved gates.",
        error
    );

    gates = [];

}


/* =========================================================
   ELEMENT HELPERS
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   MAIN ELEMENTS
========================================================= */

const locateBtn =
    getElement("locateBtn");

const useLocationBtn =
    getElement("useLocationBtn");

const createGateBtn =
    getElement("createGateBtn");

const taskInput =
    getElement("taskInput");

const locationInput =
    getElement("locationInput");

const smartInput =
    getElement("smartInput");

const distanceInput =
    getElement("distanceInput");

const distanceUnit =
    getElement("distanceUnit");

const radiusInput =
    getElement("radiusInput");

const radiusHint =
    getElement("radiusHint");

const locationField =
    getElement("locationField");

const smartField =
    getElement("smartField");

const distanceField =
    getElement("distanceField");

const placeModeBtn =
    getElement("placeModeBtn");

const travelModeBtn =
    getElement("travelModeBtn");

const smartModeBtn =
    getElement("smartModeBtn");

const gatesContainer =
    getElement("gatesContainer");

const emptyState =
    getElement("emptyState");

const gateCount =
    getElement("gateCount");

const systemStatus =
    getElement("systemStatus");

const gpsStatus =
    getElement("gpsStatus");

const latitude =
    getElement("latitude");

const longitude =
    getElement("longitude");

const accuracy =
    getElement("accuracy");


/* =========================================================
   SAFE TEXT UPDATE
========================================================= */

function setText(
    element,
    value
) {

    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   MODE SELECTION
========================================================= */

function setMode(mode) {

    selectedMode =
        mode;


    /*
       Remove active state safely.
    */

    if (placeModeBtn) {

        placeModeBtn.classList.remove(
            "active"
        );

    }


    if (travelModeBtn) {

        travelModeBtn.classList.remove(
            "active"
        );

    }


    if (smartModeBtn) {

        smartModeBtn.classList.remove(
            "active"
        );

    }


    /*
       Activate selected button.
    */

    if (
        mode === "place" &&
        placeModeBtn
    ) {

        placeModeBtn.classList.add(
            "active"
        );

    }


    if (
        mode === "travel" &&
        travelModeBtn
    ) {

        travelModeBtn.classList.add(
            "active"
        );

    }


    if (
        mode === "smart" &&
        smartModeBtn
    ) {

        smartModeBtn.classList.add(
            "active"
        );

    }


    /*
       NEAR A PLACE
    */

    if (
        mode === "place"
    ) {

        if (locationField) {

            locationField.classList.remove(
                "hidden"
            );

        }

        if (distanceField) {

            distanceField.classList.remove(
                "hidden"
            );

        }

        if (smartField) {

            smartField.classList.add(
                "hidden"
            );

        }

        setText(
            radiusHint,
            "Open when you enter this distance from the saved place."
        );

    }


    /*
       DISTANCE TRAVELLED
    */

    else if (
        mode === "travel"
    ) {

        if (locationField) {

            locationField.classList.remove(
                "hidden"
            );

        }

        if (distanceField) {

            distanceField.classList.remove(
                "hidden"
            );

        }

        if (smartField) {

            smartField.classList.add(
                "hidden"
            );

        }

        setText(
            radiusHint,
            "Counts the actual distance you travel from this point."
        );

    }


    /*
       SMART
    */

    else if (
        mode === "smart"
    ) {

        if (locationField) {

            locationField.classList.remove(
                "hidden"
            );

        }

        if (distanceField) {

            distanceField.classList.add(
                "hidden"
            );

        }

        if (smartField) {

            smartField.classList.remove(
                "hidden"
            );

        }

        setText(
            radiusHint,
            "Use a saved location as the spatial anchor."
        );

    }

}


/* =========================================================
   GPS DETECTION
========================================================= */

function detectLocation() {

    if (
        !navigator.geolocation
    ) {

        setText(
            systemStatus,
            "GPS NOT SUPPORTED"
        );

        setText(
            gpsStatus,
            "GPS UNAVAILABLE"
        );

        return;

    }


    setText(
        systemStatus,
        "LOCATING..."
    );


    setText(
        gpsStatus,
        "ACQUIRING SIGNAL"
    );


    navigator.geolocation.getCurrentPosition(

        function(position) {

            processGPSPosition(
                position
            );

        },


        function(error) {

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

    if (
        !position ||
        !position.coords
    ) {

        return;

    }


    const coords =
        position.coords;


    const lat =
        Number(
            coords.latitude
        );

    const lon =
        Number(
            coords.longitude
        );

    const gpsAccuracy =
        Number(
            coords.accuracy
        );


    /*
       Reject invalid coordinates.
    */

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {

        return;

    }


    const reading = {

        latitude:
            lat,

        longitude:
            lon,

        accuracy:
            Number.isFinite(
                gpsAccuracy
            )
                ? gpsAccuracy
                : 999,

        timestamp:
            Date.now()

    };


    /*
       Keep only a few recent readings.
    */

    gpsHistory.push(
        reading
    );


    if (
        gpsHistory.length >
        MAX_GPS_HISTORY
    ) {

        gpsHistory.shift();

    }


    /*
       Use the newest GPS reading directly.

       IMPORTANT:

       We are NOT using the old averaging
       method for travel distance.

       Averaging GPS positions can hide
       small movements.

       The travel engine needs the actual
       sequence of GPS points.
    */

    currentLocation = {

        latitude:
            reading.latitude,

        longitude:
            reading.longitude,

        accuracy:
            reading.accuracy

    };


    updateLocationDisplay(
        currentLocation
    );


    /*
       THIS is the important part.

       Every travel gate calculates its
       own movement between GPS readings.
    */

    updateTravelGates(
        reading
    );


    /*
       Check proximity-based gates.
    */

    checkGates();


    /*
       Save the latest state.
    */

    saveGates();

}


/* =========================================================
   UPDATE GPS DISPLAY
========================================================= */

function updateLocationDisplay(
    location
) {

    if (!location) {
        return;
    }


    setText(
        latitude,
        location.latitude.toFixed(6)
    );


    setText(
        longitude,
        location.longitude.toFixed(6)
    );


    setText(
        accuracy,
        `${Math.round(
            location.accuracy
        )} m`
    );


    if (locationInput) {

        locationInput.value =
            `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;

    }


    setText(
        systemStatus,
        "SYSTEM ONLINE"
    );


    setText(
        gpsStatus,
        "GPS LOCKED"
    );

}


/* =========================================================
   UPDATE TRAVEL GATES
========================================================= */

function updateTravelGates(
    reading
) {

    gates.forEach(
        function(gate) {

            /*
               Only travel gates use
               travelled-distance accumulation.
            */

            if (
                gate.mode !== "travel"
            ) {

                return;

            }


            if (
                gate.completed
            ) {

                return;

            }


            /*
               First reading after gate creation.

               This becomes the starting point.
            */

            if (
                !gate.lastTravelPoint
            ) {

                gate.lastTravelPoint = {

                    latitude:
                        reading.latitude,

                    longitude:
                        reading.longitude,

                    timestamp:
                        reading.timestamp

                };


                /*
                   Make sure old/broken values
                   don't survive.
                */

                if (
                    !Number.isFinite(
                        gate.travelledDistance
                    )
                ) {

                    gate.travelledDistance =
                        0;

                }


                return;

            }


            /*
               Calculate movement from the
               previous GPS point to THIS GPS point.
            */

            const movement =
                calculateDistance(

                    gate.lastTravelPoint.latitude,

                    gate.lastTravelPoint.longitude,

                    reading.latitude,

                    reading.longitude

                );


            /*
               Calculate time between readings.
            */

            const elapsedSeconds =
                Math.max(

                    0.1,

                    (
                        reading.timestamp -
                        gate.lastTravelPoint.timestamp
                    ) / 1000

                );


            /*
               Reject impossible GPS jumps.

               Example:

               A phone suddenly "moves"
               800 metres in one second.

               That's almost certainly GPS noise.
            */

            const speed =
                movement /
                elapsedSeconds;


            const MAX_REASONABLE_SPEED =
                60;


            if (
                speed <=
                MAX_REASONABLE_SPEED
            ) {

                /*
                   Don't throw away genuine
                   small movements.

                   A 1 m, 2 m or 3 m movement
                   is still movement.

                   This is particularly important
                   for your 2 m test.
                */

                if (
                    movement >= 0.8
                ) {

                    gate.travelledDistance =
                        (
                            Number(
                                gate.travelledDistance
                            ) || 0
                        ) + movement;

                }

            }


            /*
               ALWAYS advance the previous point.

               This is critical.

               Even if one GPS reading is bad,
               the next reading is compared to
               the latest real point instead of
               repeatedly comparing against an
               ancient location.
            */

            gate.lastTravelPoint = {

                latitude:
                    reading.latitude,

                longitude:
                    reading.longitude,

                timestamp:
                    reading.timestamp

            };


            /*
               Check whether the gate has
               reached its target.
            */

            if (
                gate.travelledDistance >=
                Number(
                    gate.distance
                )
            ) {

                if (
                    !gate.triggered
                ) {

                    gate.triggered =
                        true;

                    gate.open =
                        true;

                    gate.openedAt =
                        Date.now();


                    triggerArrival(
                        gate
                    );

                }

            }

        }
    );

}


/* =========================================================
   HAVERSINE DISTANCE
========================================================= */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const EARTH_RADIUS =
        6371000;


    const lat1Rad =
        lat1 *
        Math.PI /
        180;


    const lat2Rad =
        lat2 *
        Math.PI /
        180;


    const deltaLat =
        (
            lat2 -
            lat1
        ) *
        Math.PI /
        180;


    const deltaLon =
        (
            lon2 -
            lon1
        ) *
        Math.PI /
        180;


    const a =
        Math.sin(
            deltaLat / 2
        ) ** 2 +

        Math.cos(
            lat1Rad
        ) *

        Math.cos(
            lat2Rad
        ) *

        Math.sin(
            deltaLon / 2
        ) ** 2;


    const c =
        2 *
        Math.atan2(

            Math.sqrt(a),

            Math.sqrt(
                1 - a
            )

        );


    return (
        EARTH_RADIUS *
        c
    );

}


/* =========================================================
   DISTANCE INPUT → METERS
========================================================= */

function getDistanceInMeters() {

    /*
       If the newer distance input exists,
       use it.
    */

    if (distanceInput) {

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
            distanceUnit &&
            distanceUnit.value === "km"
        ) {

            return value * 1000;

        }


        return value;

    }


    /*
       Fallback for the original NEXUS
       radius selector.
    */

    if (radiusInput) {

        const value =
            Number(
                radiusInput.value
            );


        if (
            Number.isFinite(value) &&
            value > 0
        ) {

            return value;

        }

    }


    return null;

           }/* =========================================================
   CREATE GATE
========================================================= */

function createGate() {

    const task =
        taskInput
            ? taskInput.value.trim()
            : "";


    if (!task) {

        alert(
            "Enter a task first."
        );

        if (taskInput) {
            taskInput.focus();
        }

        return;

    }


    /*
       A GPS position is required because
       every NEXUS gate needs a spatial anchor.
    */

    if (!currentLocation) {

        alert(
            "Detect your location before creating a gate."
        );

        detectLocation();

        startGPSWatch();

        return;

    }


    let distance = null;


    /*
       PLACE and TRAVEL modes both
       accept completely flexible distances.

       Examples:

       2 m
       10 m
       40 m
       110 m
       500 m
       1.5 km
    */

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

            if (distanceInput) {
                distanceInput.focus();
            }

            return;

        }

    }


    /*
       Create the gate.
    */

    const gate = {

        id:
            Date.now() +
            Math.random(),


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
                ? (
                    smartInput
                        ? smartInput.value.trim()
                        : ""
                  )
                : "",


        /*
           Travel gates begin at ZERO.
        */

        travelledDistance:
            0,


        /*
           This is intentionally null.

           The first GPS reading AFTER the
           gate is created establishes the
           starting point for travelled distance.
        */

        lastTravelPoint:
            null,


        currentDistance:
            null,


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
       Keep GPS tracking active.
    */

    startGPSWatch();


    /*
       Ask for notifications now so the
       user doesn't have to wait until
       the first trigger.
    */

    requestNotificationPermission();


    /*
       Reset task text.

       Do NOT reset the location.
    */

    if (taskInput) {

        taskInput.value =
            "";

    }


    if (smartInput) {

        smartInput.value =
            "";

    }


    setText(
        systemStatus,
        "GATE CREATED"
    );


    setTimeout(
        function() {

            setText(
                systemStatus,
                "SYSTEM ONLINE"
            );

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
        function(gate) {

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

               The actual accumulation is
               handled by updateTravelGates().

               Here we only keep the UI/state
               synchronized.
            */

            else if (
                gate.mode === "travel"
            ) {

                checkTravelGate(
                    gate
                );

            }


            /*
               SMART MODE
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


    renderGates();

}


/* =========================================================
   NEAR A PLACE
========================================================= */

function checkPlaceGate(
    gate
) {

    if (
        !currentLocation
    ) {

        return;

    }


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
       IMPORTANT:

       This mode measures distance FROM
       the saved location.

       It does NOT measure the path
       travelled by the user.

       Therefore:

       Start → left → right

       can increase/decrease depending
       on where the user is relative
       to the saved point.

       That is correct behavior for
       "NEAR A PLACE".
    */

    const inside =
        distance <=
        Number(
            gate.distance
        );


    /*
       ARRIVAL
    */

    if (
        inside &&
        !gate.open
    ) {

        gate.open =
            true;

        gate.triggered =
            true;

        gate.openedAt =
            Date.now();


        triggerArrival(
            gate
        );

    }


    /*
       DEPARTURE
    */

    else if (
        !inside &&
        gate.open
    ) {

        gate.open =
            false;

        gate.closedAt =
            Date.now();


        triggerDeparture(
            gate
        );

    }

}


/* =========================================================
   DISTANCE TRAVELLED CHECK
========================================================= */

function checkTravelGate(
    gate
) {

    if (
        gate.completed
    ) {

        return;

    }


    /*
       Protect against old localStorage
       data from the previous version.
    */

    if (
        !Number.isFinite(
            gate.travelledDistance
        )
    ) {

        gate.travelledDistance =
            0;

    }


    /*
       If the target has been reached,
       make sure the gate is open.
    */

    if (
        gate.travelledDistance >=
        Number(
            gate.distance
        )
    ) {

        if (
            !gate.triggered
        ) {

            gate.triggered =
                true;

            gate.open =
                true;

            gate.openedAt =
                Date.now();


            triggerArrival(
                gate
            );

        }

    }

}


/* =========================================================
   SMART GATE
========================================================= */

function checkSmartGate(
    gate
) {

    /*
       A normal browser GPS API does not
       understand words like:

       "airport"
       "school"
       "restaurant"

       by itself.

       Until a Places/geocoding service
       is connected, SMART uses a
       practical GPS anchor.

       We keep this isolated so it can
       later be replaced by real place
       lookup without changing the
       rest of NEXUS.
    */

    if (
        !currentLocation
    ) {

        return;

    }


    const SMART_RADIUS =
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


    const inside =
        distance <=
        SMART_RADIUS;


    /*
       ARRIVAL
    */

    if (
        inside &&
        !gate.open
    ) {

        gate.open =
            true;

        gate.triggered =
            true;

        gate.openedAt =
            Date.now();


        triggerArrival(
            gate
        );

    }


    /*
       DEPARTURE
    */

    else if (
        !inside &&
        gate.open
    ) {

        gate.open =
            false;

        gate.closedAt =
            Date.now();


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

    setText(
        systemStatus,
        "GATE OPEN"
    );


    /*
       Audio alarm.
    */

    playArrivalSound();


    /*
       Haptic feedback.
    */

    vibrateDevice(
        [
            200,
            100,
            200,
            100,
            300
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
       Make the browser tab obvious.
    */

    document.title =
        "● GATE OPEN — NEXUS";


    renderGates();

}


/* =========================================================
   DEPARTURE TRIGGER
========================================================= */

function triggerDeparture(
    gate
) {

    setText(
        systemStatus,
        "GATE CLOSED"
    );


    playDepartureSound();


    vibrateDevice(
        [
            120,
            80,
            120
        ]
    );


    showNotification(
        "NEXUS GATE CLOSED",
        gate.task
    );


    document.title =
        "NEXUS GATE";


    setTimeout(
        function() {

            setText(
                systemStatus,
                "SYSTEM ONLINE"
            );

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
                "NEXUS: vibration unavailable."
            );

        }

    }

}


/* =========================================================
   AUDIO CONTEXT
========================================================= */

let audioContext = null;


function getAudioContext() {

    const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;


    if (
        !AudioContext
    ) {

        return null;

    }


    if (
        !audioContext
    ) {

        audioContext =
            new AudioContext();

    }


    if (
        audioContext.state ===
        "suspended"
    ) {

        audioContext
            .resume()
            .catch(
                function() {

                    console.log(
                        "NEXUS: audio resume blocked."
                    );

                }
            );

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
            620,
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
            0.25,
            now + 0.025
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
            500,
            now
        );


    oscillator.frequency
        .linearRampToValueAtTime(
            320,
            now + 0.25
        );


    gain.gain
        .setValueAtTime(
            0.0001,
            now
        );


    gain.gain
        .exponentialRampToValueAtTime(
            0.2,
            now + 0.025
        );


    gain.gain
        .exponentialRampToValueAtTime(
            0.0001,
            now + 0.55
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
        now + 0.6
    );

       }/* =========================================================
   NOTIFICATIONS
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
                "NEXUS: notification permission unavailable."
            );

        }

    }

}


/* =========================================================
   SHOW NOTIFICATION
========================================================= */

function showNotification(
    title,
    message
) {

    if (
        !("Notification" in window)
    ) {

        return;

    }


    if (
        Notification.permission !==
        "granted"
    ) {

        return;

    }


    try {

        new Notification(
            title,
            {
                body: message,
                icon: "/favicon.ico"
            }
        );

    } catch (error) {

        console.log(
            "NEXUS: notification failed."
        );

    }

}


/* =========================================================
   START GPS WATCH
========================================================= */

function startGPSWatch() {

    if (
        !navigator.geolocation
    ) {

        setText(
            gpsStatus,
            "GPS UNSUPPORTED"
        );

        return;

    }


    /*
       Prevent duplicate watchers.
    */

    if (
        gpsWatcher !== null
    ) {

        return;

    }


    gpsWatcher =
        navigator.geolocation.watchPosition(

            function(position) {

                processGPSPosition(
                    position
                );

            },


            function(error) {

                handleLocationError(
                    error
                );

            },


            {

                enableHighAccuracy:
                    true,

                maximumAge:
                    1000,

                timeout:
                    20000

            }

        );


    setText(
        gpsStatus,
        "GPS WATCHING"
    );

}


/* =========================================================
   GPS ERROR HANDLER
========================================================= */

function handleLocationError(
    error
) {

    if (!error) {

        return;

    }


    if (
        error.code === 1
    ) {

        setText(
            systemStatus,
            "LOCATION DENIED"
        );

        setText(
            gpsStatus,
            "PERMISSION DENIED"
        );

        return;

    }


    if (
        error.code === 2
    ) {

        setText(
            systemStatus,
            "LOCATION UNAVAILABLE"
        );

        setText(
            gpsStatus,
            "SIGNAL UNAVAILABLE"
        );

        return;

    }


    if (
        error.code === 3
    ) {

        setText(
            systemStatus,
            "LOCATION TIMEOUT"
        );

        setText(
            gpsStatus,
            "SIGNAL TIMEOUT"
        );

        return;

    }


    setText(
        systemStatus,
        "LOCATION ERROR"
    );

    setText(
        gpsStatus,
        "GPS ERROR"
    );

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
            "NEXUS: Could not save gates.",
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
        !Number.isFinite(
            Number(meters)
        )
    ) {

        return "--";

    }


    meters =
        Number(meters);


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
            Math.round(
                meters
            )
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

    switch (mode) {

        case "place":
            return "NEAR A PLACE";

        case "travel":
            return "DISTANCE TRAVELLED";

        case "smart":
            return "SMART";

        default:
            return "UNKNOWN";

    }

}


/* =========================================================
   RENDER GATES
========================================================= */

function renderGates() {

    if (
        !gatesContainer
    ) {

        return;

    }


    /*
       Remove dynamically-created cards.
    */

    gatesContainer
        .querySelectorAll(
            ".gate-card"
        )
        .forEach(
            function(card) {

                card.remove();

            }
        );


    const activeGates =
        gates.filter(
            function(gate) {

                return !gate.completed;

            }
        );


    if (gateCount) {

        gateCount.textContent =
            activeGates.length;

    }


    /*
       EMPTY STATE
    */

    if (
        activeGates.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    /*
       Render newest gate first.
    */

    activeGates
        .slice()
        .reverse()
        .forEach(
            function(gate) {

                const card =
                    createGateCard(
                        gate
                    );


                if (card) {

                    gatesContainer
                        .appendChild(
                            card
                        );

                }

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
        "gate-card";


    if (
        gate.open
    ) {

        card.classList.add(
            "open"
        );

    }

    else {

        card.classList.add(
            "closed"
        );

    }


    /*
       Determine displayed distance.
    */

    let currentDistance =
        0;


    if (
        gate.mode === "travel"
    ) {

        currentDistance =
            Number(
                gate.travelledDistance
            ) || 0;

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
       Progress.
    */

    let progress =
        0;


    if (
        Number(gate.distance) > 0
    ) {

        progress =
            Math.min(

                100,

                (
                    currentDistance /
                    Number(gate.distance)
                ) * 100

            );

    }


    /*
       State label.
    */

    let stateText =
        "GATE ARMED";


    if (
        gate.open
    ) {

        stateText =
            "GATE OPEN";

    }

    else if (
        gate.triggered
    ) {

        stateText =
            "GATE CLOSED";

    }


    /*
       Build card.
    */

    card.innerHTML = `

        <div class="gate-state">

            <span class="gate-state-dot"></span>

            ${stateText}

        </div>


        <div class="gate-task">

            ${escapeHTML(
                gate.task
            )}

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

                    ${
                        gate.mode === "travel"
                            ? "TRAVELLED"
                            : "RADIUS"
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
            gate.mode === "travel"

                ? `

                    <div class="proximity">

                        <div class="proximity-label">

                            <span>
                                JOURNEY PROGRESS
                            </span>

                            <span>
                                ${Math.round(
                                    progress
                                )}%
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
            gate.mode === "place"

                ? `

                    <div class="proximity">

                        <div class="proximity-label">

                            <span>
                                DISTANCE FROM PLACE
                            </span>

                            <span>
                                ${
                                    Number.isFinite(
                                        gate.currentDistance
                                    )
                                        ? formatDistance(
                                            gate.currentDistance
                                          )
                                        : "--"
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


        <div class="gate-meta">

            <span>
                GPS ACCURACY
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
       Complete button.
    */

    const completeButton =
        card.querySelector(
            ".complete-button"
        );


    if (completeButton) {

        completeButton.addEventListener(
            "click",
            function() {

                completeGate(
                    gate.id
                );

            }
        );

    }


    return card;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
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
   COMPLETE + DESTROY
========================================================= */

function completeGate(
    id
) {

    const gate =
        gates.find(
            function(item) {

                return item.id === id;

            }
        );


    if (!gate) {

        return;

    }


    /*
       NEXUS philosophy:

       COMPLETE → DESTROY
    */

    gate.completed =
        true;


    gate.open =
        false;


    gate.completedAt =
        Date.now();


    saveGates();

    renderGates();


    setText(
        systemStatus,
        "GATE DESTROYED"
    );


    setTimeout(
        function() {

            setText(
                systemStatus,
                "SYSTEM ONLINE"
            );

        },
        1500
    );

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

if (locateBtn) {

    locateBtn.addEventListener(
        "click",
        function() {

            detectLocation();

            startGPSWatch();

            requestNotificationPermission();


            /*
               Unlock audio after user interaction.
            */

            const ctx =
                getAudioContext();


            if (ctx) {

                ctx.resume()
                    .catch(
                        function() {}
                    );

            }

        }
    );

}


if (useLocationBtn) {

    useLocationBtn.addEventListener(
        "click",
        function() {

            detectLocation();

            startGPSWatch();

        }
    );

}


if (createGateBtn) {

    createGateBtn.addEventListener(
        "click",
        function() {

            createGate();

            startGPSWatch();

            requestNotificationPermission();

        }
    );

}


/* =========================================================
   MODE BUTTONS
========================================================= */

if (placeModeBtn) {

    placeModeBtn.addEventListener(
        "click",
        function() {

            setMode(
                "place"
            );

        }
    );

}


if (travelModeBtn) {

    travelModeBtn.addEventListener(
        "click",
        function() {

            setMode(
                "travel"
            );

        }
    );

}


if (smartModeBtn) {

    smartModeBtn.addEventListener(
        "click",
        function() {

            setMode(
                "smart"
            );

        }
    );

}


/* =========================================================
   ENTER KEY
========================================================= */

if (taskInput) {

    taskInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                createGate();

            }

        }
    );

}


/* =========================================================
   DISTANCE INPUT
========================================================= */

if (distanceInput) {

    distanceInput.addEventListener(
        "input",
        function() {

            const value =
                Number(
                    distanceInput.value
                );


            if (
                value < 0
            ) {

                distanceInput.value =
                    0;

            }

        }
    );

}


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
    "visibilitychange",
    function() {

        /*
           When the user returns to the
           website, immediately request
           another GPS reading.

           This helps when the browser
           temporarily pauses GPS updates.
        */

        if (
            document.visibilityState ===
            "visible"
        ) {

            if (
                gates.some(
                    function(gate) {

                        return !gate.completed;

                    }
                )
            ) {

                startGPSWatch();

                detectLocation();

            }

        }

    }
);


/* =========================================================
   INITIALIZE NEXUS
========================================================= */

function initializeNexus() {

    setMode(
        "place"
    );


    renderGates();


    /*
       Resume GPS tracking if there are
       existing active gates.

       The browser will still require
       location permission.
    */

    if (
        gates.some(
            function(gate) {

                return !gate.completed;

            }
        )
    ) {

        startGPSWatch();

    }


    setText(
        systemStatus,
        "SYSTEM READY"
    );


    setText(
        gpsStatus,
        "GPS OFFLINE"
    );

}


/* =========================================================
   START
========================================================= */

initializeNexus();
