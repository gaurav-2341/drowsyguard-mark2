// Global variables
let model;
let webcam;
let isModelLoaded = false;
let isPredicting = false;
let drowsinessCount = 0;
let lastAlertTime = 0;
const DROWSINESS_THRESHOLD = 0.7; // 70% confidence threshold
const ALERT_DURATION = 3000; // 3 seconds in milliseconds
const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/46VSzKASk/';

// DOM elements
const startButton = document.getElementById('startButton');
const headerStartButton = document.getElementById('headerStartButton');
const stopButton = document.getElementById('stopButton');
const pauseButton = document.getElementById('pauseButton');
const muteButton = document.getElementById('muteButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const testCameraButton = document.getElementById('testCameraButton');
const webcamElement = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const cameraOverlay = document.getElementById('cameraOverlay');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const awakeFill = document.getElementById('awakeFill');
const drowsyFill = document.getElementById('drowsyFill');
const awakeValue = document.getElementById('awakeValue');
const drowsyValue = document.getElementById('drowsyValue');
const alertSection = document.getElementById('alertSection');

// Additional UI elements
const recordingIndicator = document.getElementById('recordingIndicator');
const cameraInfo = document.getElementById('cameraInfo');
const resolutionInfo = document.getElementById('resolutionInfo');
const fpsInfo = document.getElementById('fpsInfo');
const analysisStatus = document.getElementById('analysisStatus');
const monitoringTime = document.getElementById('monitoringTime');
const alertCount = document.getElementById('alertCount');
const avgAwakeLevel = document.getElementById('avgAwakeLevel');
const safetyScore = document.getElementById('safetyScore');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityValue = document.getElementById('sensitivityValue');
const alertDelaySlider = document.getElementById('alertDelaySlider');
const alertDelayValue = document.getElementById('alertDelayValue');
const vibrationToggle = document.getElementById('vibrationToggle');
const soundToggle = document.getElementById('soundToggle');

// Session tracking variables
let sessionStartTime = null;
let totalAlerts = 0;
let awakeScores = [];
let isPaused = false;
let isMuted = false;
let customThreshold = 0.7;
let customAlertDelay = 3;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing drowsiness detection system...');
    
    // Check browser compatibility
    console.log('Browser compatibility check:');
    console.log('- getUserMedia supported:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    console.log('- speechSynthesis supported:', !!(window.speechSynthesis));
    console.log('- Protocol:', window.location.protocol);
    console.log('- Host:', window.location.host);
    
    initializeSystem();
});

async function initializeSystem() {
    try {
        updateStatus('Loading AI model...', false);
        await loadModel();
        updateStatus('Ready to start', false);
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize system:', error);
        updateStatus('Error loading model', false);
        showAlert('Failed to load AI model. Please refresh the page and try again.');
    }
}

async function loadModel() {
    try {
        console.log('Loading Teachable Machine model from:', MODEL_URL);
        
        // Load the model from Teachable Machine
        model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
        
        isModelLoaded = true;
        console.log('Model loaded successfully');
        console.log('Model classes:', model.getClassLabels());
        
    } catch (error) {
        console.error('Error loading model:', error);
        throw new Error('Failed to load AI model');
    }
}

function setupEventListeners() {
    startButton.addEventListener('click', startCamera);
    headerStartButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
    pauseButton.addEventListener('click', togglePause);
    muteButton.addEventListener('click', toggleMute);
    fullscreenButton.addEventListener('click', toggleFullscreen);
    testCameraButton.addEventListener('click', testCameraOnly);
    
    // Settings event listeners
    sensitivitySlider.addEventListener('input', updateSensitivity);
    alertDelaySlider.addEventListener('input', updateAlertDelay);
    vibrationToggle.addEventListener('change', updateVibrationSetting);
    soundToggle.addEventListener('change', updateSoundSetting);
}

async function testCameraOnly() {
    try {
        updateStatus('Testing camera access...', false);
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access not supported in this browser');
        }
        
        console.log('Testing camera access...');
        
        // Request camera permissions
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false
        });
        
        console.log('Camera test successful:', stream);
        
        // Show video stream
        webcamElement.srcObject = stream;
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Video loading timeout'));
            }, 10000);
            
            webcamElement.onloadedmetadata = () => {
                clearTimeout(timeout);
                console.log('Test video metadata loaded');
                webcamElement.play().then(() => {
                    console.log('Test video playback started');
                    resolve();
                }).catch(reject);
            };
        });
        
        // Hide overlay to show camera
        cameraOverlay.style.display = 'none';
        
        updateStatus('Camera test successful', true);
        alert('Camera test successful! You can now use the "Start Camera" button for full monitoring.');
        
        // Stop the test stream after 3 seconds
        setTimeout(() => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                webcamElement.srcObject = null;
                cameraOverlay.style.display = 'flex';
                updateStatus('Camera test completed', false);
            }
        }, 3000);
        
    } catch (error) {
        console.error('Camera test failed:', error);
        updateStatus('Camera test failed', false);
        
        let errorMessage = 'Camera test failed: ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Camera access denied. Please allow camera permissions in your browser settings.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No camera found. Please connect a camera to your device.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage += 'Camera not supported in this browser.';
        } else if (error.name === 'SecurityError') {
            errorMessage += 'Security error. Please use HTTPS or localhost.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
    }
}

async function startCamera() {
    if (!isModelLoaded) {
        alert('AI model is still loading. Please wait...');
        return;
    }

    try {
        updateStatus('Requesting camera access...', false);
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access not supported in this browser');
        }
        
        console.log('Requesting camera access...');
        
        // Request camera permissions with simpler constraints first
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false
        });
        
        console.log('Camera stream obtained:', stream);
        
        webcamElement.srcObject = stream;
        
        // Wait for video to load with timeout
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Video loading timeout'));
            }, 10000);
            
            webcamElement.onloadedmetadata = () => {
                clearTimeout(timeout);
                console.log('Video metadata loaded');
                webcamElement.play().then(() => {
                    console.log('Video playback started');
                    resolve();
                }).catch(reject);
            };
            
            webcamElement.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
        });
        
        // Hide overlay and show controls
        cameraOverlay.style.display = 'none';
        startButton.disabled = true;
        headerStartButton.disabled = true;
        headerStartButton.innerHTML = '<i class="fas fa-circle"></i> Monitoring...';
        stopButton.disabled = false;
        pauseButton.disabled = false;
        
        // Start session tracking
        sessionStartTime = new Date();
        totalAlerts = 0;
        awakeScores = [];
        
        // Update UI
        recordingIndicator.classList.add('active');
        cameraInfo.classList.add('active');
        updateCameraInfo();
        updateAnalysisStatus('Analyzing...', true);
        
        updateStatus('Monitoring active', true);
        
        // Start prediction loop
        isPredicting = true;
        startPredictionLoop();
        
        console.log('Camera started successfully');
        
    } catch (error) {
        console.error('Error starting camera:', error);
        updateStatus('Camera error: ' + error.message, false);
        
        let errorMessage = 'Failed to start camera. ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Please allow camera permissions and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage += 'Camera not supported in this browser.';
        } else if (error.name === 'SecurityError') {
            errorMessage += 'Camera access blocked by security settings. Please use HTTPS or localhost.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
    }
}

function stopCamera() {
    isPredicting = false;
    
    // Stop video stream
    if (webcamElement.srcObject) {
        const tracks = webcamElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        webcamElement.srcObject = null;
    }
    
    // Reset UI
    cameraOverlay.style.display = 'flex';
    startButton.disabled = false;
    headerStartButton.disabled = false;
    headerStartButton.innerHTML = '<i class="fas fa-play"></i> Quick Start';
    stopButton.disabled = true;
    pauseButton.disabled = true;
    
    recordingIndicator.classList.remove('active');
    cameraInfo.classList.remove('active');
    
    // Reset predictions
    resetPredictions();
    hideAlert();
    
    updateStatus('Stopped', false);
    updateAnalysisStatus('Ready', false);
    drowsinessCount = 0;
    
    // Reset session data
    sessionStartTime = null;
    totalAlerts = 0;
    awakeScores = [];
    
    // Update final stats
    updateSessionStats();
    
    console.log('Camera stopped');
}

async function startPredictionLoop() {
    while (isPredicting && isModelLoaded) {
        try {
            await makePrediction();
            // Wait a bit before next prediction to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('Prediction error:', error);
            // Continue the loop even if one prediction fails
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

async function makePrediction() {
    if (!webcamElement.videoWidth || !webcamElement.videoHeight) {
        return; // Video not ready yet
    }
    
    try {
        // Make prediction using the webcam element directly
        const predictions = await model.predict(webcamElement);
        
        // Process predictions
        let awakeConfidence = 0;
        let drowsyConfidence = 0;
        
        predictions.forEach(prediction => {
            const className = prediction.className.toLowerCase();
            const confidence = prediction.probability;
            
            if (className.includes('awake') || className.includes('alert')) {
                awakeConfidence = confidence;
            } else if (className.includes('drowsy') || className.includes('sleepy') || className.includes('tired')) {
                drowsyConfidence = confidence;
            }
        });
        
        // Store awake scores for statistics
        awakeScores.push(awakeConfidence);
        if (awakeScores.length > 100) {
            awakeScores.shift(); // Keep only last 100 scores
        }
        
        // Update UI with predictions
        updatePredictionDisplay(awakeConfidence, drowsyConfidence);
        
        // Check for drowsiness
        checkDrowsiness(drowsyConfidence);
        
        // Update session stats every 10 predictions
        if (awakeScores.length % 10 === 0) {
            updateSessionStats();
        }
        
    } catch (error) {
        console.error('Prediction failed:', error);
    }
}

function updatePredictionDisplay(awakeConfidence, drowsyConfidence) {
    const awakePercent = Math.round(awakeConfidence * 100);
    const drowsyPercent = Math.round(drowsyConfidence * 100);
    
    // Update progress bars
    awakeFill.style.width = awakePercent + '%';
    drowsyFill.style.width = drowsyPercent + '%';
    
    // Update percentage text
    awakeValue.textContent = awakePercent + '%';
    drowsyValue.textContent = drowsyPercent + '%';
}

function checkDrowsiness(drowsyConfidence) {
    if (isPaused) return;
    
    const currentTime = Date.now();
    
    if (drowsyConfidence > customThreshold) {
        drowsinessCount++;
        
        // If drowsy for the custom delay duration (approximately 10 predictions per second)
        if (drowsinessCount >= (customAlertDelay * 10)) {
            // Only trigger alert if enough time has passed since last alert
            if (currentTime - lastAlertTime > ALERT_DURATION) {
                totalAlerts++;
                if (vibrationToggle.checked && navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]);
                }
                triggerDrowsinessAlert();
                lastAlertTime = currentTime;
            }
            // Reset counter to avoid continuous alerts
            drowsinessCount = 0;
        }
    } else {
        // Reset counter if person becomes alert
        drowsinessCount = Math.max(0, drowsinessCount - 2);
        
        // Hide alert if showing and person is awake
        if (currentTime - lastAlertTime > 2000) {
            hideAlert();
        }
    }
}

function triggerDrowsinessAlert() {
    console.log('Drowsiness detected! Triggering alert...');
    
    // Show visual alert
    showAlert();
    
    // Trigger audio alert using Text-to-Speech with the specific message
    speakAlert("Wake up! You are sleeping while driving. Do you want to die?");
    
    // Optional: Add vibration on mobile devices
    if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
    }
}

function speakAlert(message) {
    if (isMuted || !soundToggle.checked) return;
    
    try {
        // Use Web Speech API for text-to-speech
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 1.0; // Slightly slower for clarity
            utterance.pitch = 1.3; // Higher pitch for urgency
            utterance.volume = 1.0; // Maximum volume
            
            // Use a more urgent voice if available
            const voices = speechSynthesis.getVoices();
            const englishVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Google')) || 
                              voices.find(voice => voice.lang.startsWith('en'));
            if (englishVoice) {
                utterance.voice = englishVoice;
            }
            
            // Speak the message immediately
            speechSynthesis.speak(utterance);
            
            // Add a second alert after a brief pause for emphasis
            setTimeout(() => {
                if (!isMuted && soundToggle.checked) {
                    const secondUtterance = new SpeechSynthesisUtterance("Pull over safely immediately!");
                    secondUtterance.rate = 1.1;
                    secondUtterance.pitch = 1.4;
                    secondUtterance.volume = 1.0;
                    if (englishVoice) {
                        secondUtterance.voice = englishVoice;
                    }
                    speechSynthesis.speak(secondUtterance);
                }
            }, 2000);
            
        } else {
            console.warn('Text-to-speech not supported in this browser');
        }
    } catch (error) {
        console.error('Error with text-to-speech:', error);
    }
}

function showAlert() {
    alertSection.classList.add('show');
}

function hideAlert() {
    alertSection.classList.remove('show');
}

function updateStatus(text, isActive) {
    statusText.textContent = text;
    
    if (isActive) {
        statusDot.classList.add('active');
    } else {
        statusDot.classList.remove('active');
    }
}

function resetPredictions() {
    awakeFill.style.width = '0%';
    drowsyFill.style.width = '0%';
    awakeValue.textContent = '0%';
    drowsyValue.textContent = '0%';
}

// Utility function for user notifications
function showUserMessage(message) {
    alert(message);
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isPredicting) {
        console.log('Page hidden, pausing predictions...');
        isPredicting = false;
    } else if (!document.hidden && webcamElement.srcObject && !isPredicting) {
        console.log('Page visible, resuming predictions...');
        isPredicting = true;
        startPredictionLoop();
    }
});

// Handle window beforeunload to clean up camera
window.addEventListener('beforeunload', function() {
    if (webcamElement.srcObject) {
        const tracks = webcamElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
    }
});

// Load voices for text-to-speech (some browsers need this)
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = function() {
        console.log('Speech synthesis voices loaded');
    };
}

console.log('Drowsiness detection script loaded successfully');

// Enhanced functionality for new features
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        pauseButton.innerHTML = '<i class="fas fa-play"></i> Resume';
        updateAnalysisStatus('Paused', false);
        pauseButton.classList.add('resume-btn');
        pauseButton.classList.remove('pause-btn');
    } else {
        pauseButton.innerHTML = '<i class="fas fa-pause"></i> Pause';
        updateAnalysisStatus('Analyzing...', true);
        pauseButton.classList.add('pause-btn');
        pauseButton.classList.remove('resume-btn');
    }
}

function toggleMute() {
    isMuted = !isMuted;
    
    if (isMuted) {
        muteButton.innerHTML = '<i class="fas fa-volume-mute"></i> Unmute';
        muteButton.classList.add('muted');
    } else {
        muteButton.innerHTML = '<i class="fas fa-volume-up"></i> Mute Alerts';
        muteButton.classList.remove('muted');
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        webcamElement.requestFullscreen().catch(err => {
            alert('Error attempting to enable fullscreen: ' + err.message);
        });
        fullscreenButton.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
    } else {
        document.exitFullscreen();
        fullscreenButton.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
    }
}

function updateCameraInfo() {
    if (webcamElement.videoWidth && webcamElement.videoHeight) {
        resolutionInfo.textContent = `${webcamElement.videoWidth}x${webcamElement.videoHeight}`;
    }
    
    // Update FPS counter (approximate)
    let fps = 0;
    let lastTime = performance.now();
    let frames = 0;
    
    function countFPS() {
        frames++;
        const currentTime = performance.now();
        if (currentTime - lastTime >= 1000) {
            fps = Math.round(frames * 1000 / (currentTime - lastTime));
            fpsInfo.textContent = `${fps} FPS`;
            frames = 0;
            lastTime = currentTime;
        }
        if (isPredicting) {
            requestAnimationFrame(countFPS);
        }
    }
    
    if (isPredicting) {
        requestAnimationFrame(countFPS);
    }
}

function updateAnalysisStatus(text, isActive) {
    analysisStatus.innerHTML = `<i class="fas fa-brain"></i> <span>${text}</span>`;
    if (isActive) {
        analysisStatus.style.color = 'var(--success-color)';
    } else {
        analysisStatus.style.color = 'var(--text-light)';
    }
}

function updateSessionStats() {
    if (sessionStartTime) {
        const elapsed = new Date() - sessionStartTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        monitoringTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    alertCount.textContent = totalAlerts.toString();
    
    if (awakeScores.length > 0) {
        const avgAwake = awakeScores.reduce((a, b) => a + b, 0) / awakeScores.length;
        avgAwakeLevel.textContent = `${Math.round(avgAwake * 100)}%`;
        
        // Calculate safety score based on average awake level and alert count
        const safetyPercentage = Math.max(0, Math.min(100, (avgAwake * 100) - (totalAlerts * 10)));
        safetyScore.textContent = `${Math.round(safetyPercentage)}%`;
    }
}

function updateSensitivity() {
    customThreshold = parseFloat(sensitivitySlider.value) / 100;
    sensitivityValue.textContent = `${sensitivitySlider.value}%`;
}

function updateAlertDelay() {
    customAlertDelay = parseInt(alertDelaySlider.value);
    alertDelayValue.textContent = `${alertDelaySlider.value}s`;
}

function updateVibrationSetting() {
    // Vibration setting updated
    console.log('Vibration alerts:', vibrationToggle.checked);
}

function updateSoundSetting() {
    // Sound setting updated
    console.log('Sound alerts:', soundToggle.checked);
    isMuted = !soundToggle.checked;
}

// Start session stats timer
setInterval(updateSessionStats, 1000);

// Additional stats variables
let drowsyScores = [];
let maxDrowsyLevel = 0;
let lastAlertTimestamp = null;

// Override updatePredictionDisplay to also track stats
const originalUpdatePredictionDisplay = updatePredictionDisplay;
updatePredictionDisplay = function(awakeConfidence, drowsyConfidence) {
    originalUpdatePredictionDisplay(awakeConfidence, drowsyConfidence);
    const drowsyPercent = Math.round(drowsyConfidence * 100);
    drowsyScores.push(drowsyPercent);
    if (drowsyScores.length > 100) drowsyScores.shift();
    if (drowsyPercent > maxDrowsyLevel) {
        maxDrowsyLevel = drowsyPercent;
        document.getElementById('maxDrowsyLevel').textContent = maxDrowsyLevel + '%';
        document.getElementById('maxDrowsyLevel').parentElement.parentElement.classList.add('updated');
        setTimeout(()=>document.getElementById('maxDrowsyLevel').parentElement.parentElement.classList.remove('updated'),600);
    }
    const avg = Math.round(drowsyScores.reduce((a,b)=>a+b,0) / drowsyScores.length);
    document.getElementById('avgDrowsyLevel').textContent = avg + '%';
};

// Override triggerDrowsinessAlert to log last alert time
const originalTriggerDrowsinessAlert = triggerDrowsinessAlert;
triggerDrowsinessAlert = function() {
    originalTriggerDrowsinessAlert();
    lastAlertTimestamp = new Date();
    document.getElementById('lastAlertTime').textContent = lastAlertTimestamp.toLocaleTimeString();
    document.getElementById('lastAlertTime').parentElement.parentElement.classList.add('updated');
    setTimeout(()=>document.getElementById('lastAlertTime').parentElement.parentElement.classList.remove('updated'),600);
};

// Reset stats when camera stops
const originalStopCamera = stopCamera;
stopCamera = function() {
    originalStopCamera();
    drowsyScores = [];
    maxDrowsyLevel = 0;
    lastAlertTimestamp = null;
    document.getElementById('avgDrowsyLevel').textContent = '-';
    document.getElementById('maxDrowsyLevel').textContent = '-';
    document.getElementById('lastAlertTime').textContent = '-';
};
