'use strict';

// --- DOM Elements ---
const live2dCanvas = document.getElementById('live2d-canvas');
const live2dContainer = document.getElementById('live2d-container');
const audioSourceSelect = document.getElementById('audio-source');
const audioFileInput = document.getElementById('audio-file-input');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusP = document.getElementById('status');

// --- Live2D Placeholder ---
// NOTE: User needs to integrate their Live2D SDK and model here.
// This involves:
// 1. Including the necessary Live2D Cubism SDK scripts in index.html.
// 2. Loading the Live2D model (.model3.json).
// 3. Initializing the Live2D application and renderer.
// 4. Getting a reference to the Live2D model instance.

let live2dModel = null; // Placeholder for the Live2D model instance
let live2dApp = null; // Placeholder for the Live2D application instance

// Example function to load and initialize Live2D (replace with actual SDK usage)
async function initializeLive2D() {
    console.log("Initializing Live2D (Placeholder)...");
    // --- Replace with actual Live2D SDK loading and initialization ---
    // Example:
    // await Live2DCubismCore.initialize();
    // live2dApp = new LAppDelegate(live2dCanvas); // Or your custom app class
    // live2dModel = await live2dApp.loadModel('path/to/your/model.model3.json');
    // live2dApp.run();
    // -----------------------------------------------------------------
    console.log("Live2D Initialized (Placeholder).");
    // Set initial canvas size based on model (if needed)
    // live2dCanvas.width = live2dModel.getCanvasWidth();
    // live2dCanvas.height = live2dModel.getCanvasHeight();
    // live2dContainer.style.width = `${live2dCanvas.width}px`;
    // live2dContainer.style.height = `${live2dCanvas.height}px`;
}

// Example function to update Live2D model scale (replace with actual SDK usage)
function setLive2DScale(scale) {
    if (live2dCanvas) { // Use canvas transform as a fallback if SDK integration is complex
        live2dCanvas.style.transform = `scale(${scale})`;
    }
    // --- Replace/Add actual Live2D SDK scaling ---
    // Example using model matrix:
    // if (live2dModel) {
    //     const modelMatrix = live2dModel.getModelMatrix();
    //     modelMatrix.scale(scale, scale);
    // }
    // --------------------------------------------
}

// --- Web Audio API ---
let audioContext;
let analyser;
let audioSourceNode = null; // Can be MediaStreamSource (mic) or MediaElementAudioSource (file)
let microphoneStream = null;
let audioElement = null; // For file playback
let dataArray;
let animationFrameId = null;

const FFT_SIZE = 256; // Frequency bins (power of 2)
const MIN_SCALE = 0.8; // Minimum scale factor for the model
const MAX_SCALE = 1.2; // Maximum scale factor for the model
const SMOOTHING_FACTOR = 0.1; // For smoothing scale changes (0 to 1)

let currentScale = 1.0;

function setupAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.6; // Smoothing for analyser data
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }
}

// --- Audio Processing Logic ---
function processAudio() {
    if (!analyser || !dataArray) return;

    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume/intensity
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // Normalize the average value (0 to 1)
    const normalizedValue = Math.min(average / 128, 1.0); // 128 is a rough midpoint for Uint8Array

    // Map normalized value to scale range
    const targetScale = MIN_SCALE + normalizedValue * (MAX_SCALE - MIN_SCALE);

    // Apply smoothing
    currentScale += (targetScale - currentScale) * SMOOTHING_FACTOR;

    // Apply scale to Live2D model/canvas
    setLive2DScale(currentScale);

    // Continue the loop
    animationFrameId = requestAnimationFrame(processAudio);
}

async function startProcessing(sourceType) {
    if (animationFrameId) {
        console.warn("Processing already active.");
        return;
    }

    try {
        setupAudioContext();
        await audioContext.resume(); // Required after user interaction

        if (sourceType === 'mic') {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia not supported on your browser!');
            }
            microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioSourceNode = audioContext.createMediaStreamSource(microphoneStream);
            statusP.textContent = "Status: Processing Microphone...";
        } else if (sourceType === 'file' && audioElement) {
            if (!audioSourceNode || audioSourceNode.mediaElement !== audioElement) {
                 // Create source node only once per element
                audioSourceNode = audioContext.createMediaElementSource(audioElement);
            }
            await audioElement.play();
            statusP.textContent = `Status: Processing File: ${audioFileInput.files[0].name}`;
        } else {
            throw new Error("Invalid audio source or file not loaded.");
        }

        audioSourceNode.connect(analyser);
        // Optional: Connect analyser to destination to hear the audio
        // analyser.connect(audioContext.destination);

        startBtn.disabled = true;
        stopBtn.disabled = false;
        audioSourceSelect.disabled = true;
        audioFileInput.disabled = true;

        // Start the animation loop
        processAudio();

    } catch (err) {
        console.error("Error starting audio processing:", err);
        statusP.textContent = `Status: Error - ${err.message}`;
        stopProcessing(); // Clean up on error
    }
}

function stopProcessing() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (audioSourceNode) {
        audioSourceNode.disconnect();
        // Don't destroy MediaElementAudioSource, just disconnect
        if (!(audioSourceNode instanceof MediaElementAudioSource)) {
             audioSourceNode = null; // Allow recreation for mic
        }
    }

    if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
    }

    if (audioElement && !audioElement.paused) {
        audioElement.pause();
        // audioElement.currentTime = 0; // Optional: Reset playback position
    }

    // Reset scale
    currentScale = 1.0;
    setLive2DScale(currentScale);

    startBtn.disabled = false;
    stopBtn.disabled = true;
    audioSourceSelect.disabled = false;
    audioFileInput.disabled = (audioSourceSelect.value === 'mic');
    statusP.textContent = "Status: Stopped";

    // Consider closing the AudioContext if not needed anymore,
    // but often it's kept open for subsequent starts.
    // if (audioContext && audioContext.state !== 'closed') {
    //     audioContext.suspend(); // or audioContext.close();
    // }
}

// --- Event Listeners ---
audioSourceSelect.addEventListener('change', () => {
    const isFile = audioSourceSelect.value === 'file';
    audioFileInput.style.display = isFile ? 'inline-block' : 'none';
    audioFileInput.disabled = !isFile;
    // Reset state if source changes
    stopProcessing();
    statusP.textContent = "Status: Idle";
    audioElement = null; // Clear audio element if switching away from file
    audioSourceNode = null; // Reset source node
});

audioFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        if (audioElement) {
            audioElement.remove(); // Remove previous audio element if exists
        }
        audioElement = new Audio();
        audioElement.src = URL.createObjectURL(file);
        audioElement.loop = true; // Optional: Loop the audio file
        audioElement.addEventListener('canplaythrough', () => {
             statusP.textContent = `Status: Ready to play ${file.name}`;
             startBtn.disabled = false; // Enable start only when file is ready
        });
         audioElement.addEventListener('error', (e) => {
            statusP.textContent = `Status: Error loading audio file.`;
            console.error("Audio Element Error:", e);
            startBtn.disabled = true;
        });
        statusP.textContent = `Status: Loading ${file.name}...`;
        startBtn.disabled = true; // Disable start until file is loaded
        stopBtn.disabled = true;
        // Reset audio source node as the element changed
        audioSourceNode = null;
    }
});

startBtn.addEventListener('click', () => {
    const sourceType = audioSourceSelect.value;
    if (sourceType === 'file' && !audioElement) {
        statusP.textContent = "Status: Please select an audio file first.";
        return;
    }
    startProcessing(sourceType);
});

stopBtn.addEventListener('click', stopProcessing);

// --- Initialization ---
window.addEventListener('load', async () => {
    statusP.textContent = "Status: Initializing...";
    audioFileInput.style.display = 'none'; // Hide file input initially
    audioFileInput.disabled = true;
    startBtn.disabled = true; // Disabled until Live2D and potentially audio file are ready

    try {
        await initializeLive2D(); // Load Live2D model
        statusP.textContent = "Status: Idle. Select audio source.";
        // Enable start button based on initial selection IF Live2D loaded
        if (audioSourceSelect.value === 'mic') {
             startBtn.disabled = false;
        }
        // If 'file' is default, start remains disabled until file selected
    } catch (error) {
        console.error("Failed to initialize Live2D:", error);
        statusP.textContent = "Status: Error initializing Live2D.";
        // Keep controls disabled if Live2D fails
    }
});
