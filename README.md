# DrowsiGuard - Professional Driver Drowsiness Detection System

## Overview

DrowsiGuard is a professional web-based driver drowsiness detection system that uses advanced machine learning to monitor driver alertness in real-time. The application features a modern, professional interface with comprehensive information sections and leverages a pre-trained model from Google's Teachable Machine platform to analyze facial features and eye movements through the user's webcam, providing immediate critical safety alerts when drowsiness is detected.

## User Preferences

Preferred communication style: Simple, everyday language.
UI Design: Professional, modern website with comprehensive information sections and professional branding.

## System Architecture

### Frontend Architecture
- **Single Page Application (SPA)**: The system consists of two main HTML pages - a landing page (`index.html`) and a monitoring interface (`monitor.html`)
- **Vanilla JavaScript**: Pure JavaScript implementation without frameworks for simplicity and performance
- **Real-time Video Processing**: Uses HTML5 Canvas and Video APIs for webcam access and image processing
- **Responsive Design**: CSS-based responsive layout that works across different device sizes

### AI/ML Integration
- **TensorFlow.js**: Client-side machine learning using TensorFlow.js for model inference
- **Teachable Machine Integration**: Pre-trained model hosted on Google's Teachable Machine platform
- **Real-time Classification**: Continuous image classification for drowsiness detection

## Key Components

### 1. Professional Landing Page (`index.html`)
- Fixed navigation bar with brand identity and smooth scrolling
- Hero section with compelling statistics and professional branding
- Comprehensive features section with detailed capabilities
- Step-by-step "How It Works" process explanation
- Benefits section highlighting safety and effectiveness
- Professional call-to-action section
- Clean footer with brand consistency

### 2. Live Monitoring Interface (`monitor.html`)
- Professional header with status indicators
- Real-time video feed with clean camera controls
- AI analysis display with confidence levels
- Critical safety alert system with urgent voice warnings
- Professional styling with modern UI elements

### 3. Core JavaScript Logic (`script.js`)
- **Model Management**: Loading and initializing the Teachable Machine model
- **Camera Handling**: Webcam access and video stream management
- **Prediction Engine**: Real-time image classification and drowsiness detection
- **Alert System**: Threshold-based alerting when drowsiness is detected
- **Status Management**: User interface state updates and feedback

### 4. Professional Styling (`styles.css`)
- CSS custom properties for consistent theming
- Professional color palette with modern gradients
- Responsive grid layouts and flexbox components
- Advanced animations and transitions
- Professional typography with Inter font family
- Modern button designs with hover effects
- Clean card-based layouts with shadows and borders

## Data Flow

1. **Initialization**: System loads the pre-trained model from Teachable Machine
2. **Camera Access**: User grants webcam permissions and video stream starts
3. **Image Capture**: Continuous frame capture from the video stream
4. **Preprocessing**: Frames are processed and prepared for model inference
5. **Classification**: Each frame is classified for drowsiness indicators
6. **Threshold Evaluation**: Confidence scores are compared against drowsiness threshold (70%)
7. **Alert Generation**: Visual and potentially audio alerts when drowsiness is detected
8. **Status Updates**: Real-time UI updates reflecting system state

## External Dependencies

### CDN Resources
- **Font Awesome 6.0.0**: Icon library for UI elements
- **TensorFlow.js**: Machine learning framework for browser-based inference
- **Teachable Machine Library**: Google's library for loading and using Teachable Machine models

### Third-party Services
- **Google Teachable Machine**: Hosts the pre-trained drowsiness detection model
- **Model URL**: `https://teachablemachine.withgoogle.com/models/46VSzKASk/`

## Recent Changes (July 16, 2025)

### Enhanced Monitor Page Features
- Added header start button for quick access to monitoring
- Fixed undefined alert issue by removing duplicate showAlert function
- Added comprehensive session statistics tracking
- Implemented customizable alert settings (sensitivity, delay, vibration, sound)
- Added pause/resume functionality with proper state management
- Added mute/unmute controls for voice alerts
- Added fullscreen mode for camera feed
- Added live recording indicator and camera information display
- Improved professional UI with modern design elements

## Key Technical Decisions

### Client-Side Processing
**Problem**: Need for real-time drowsiness detection without server dependency
**Solution**: Browser-based machine learning using TensorFlow.js
**Rationale**: Reduces latency, ensures privacy (no video data sent to servers), and eliminates server infrastructure costs

### Teachable Machine Integration
**Problem**: Need for a reliable drowsiness detection model
**Solution**: Pre-trained model from Google's Teachable Machine platform
**Rationale**: Faster development, proven accuracy, and easy model updates without rebuilding the entire system

### Vanilla JavaScript Implementation
**Problem**: Need for lightweight, fast-loading application
**Solution**: Pure JavaScript without heavy frameworks
**Rationale**: Minimizes bundle size, reduces complexity, and ensures fast startup times critical for safety applications

### Enhanced Alert System
**Problem**: Balancing sensitivity vs. false positives while providing user control
**Solution**: Customizable threshold (50-90%) and alert delay (1-10 seconds) with multiple alert types
**Rationale**: Provides reliable detection while allowing users to adjust sensitivity based on their needs and minimizing false alarms

## Deployment Strategy

### Static Web Hosting
The application is designed as a client-side static web application that can be deployed on any web server or CDN. No backend infrastructure is required, making deployment simple and cost-effective.

### Browser Requirements
- Modern browser with WebRTC support for camera access
- JavaScript enabled
- Sufficient processing power for real-time ML inference

### Performance Considerations
- Model loading occurs once during initialization
- Continuous inference runs at video frame rate
- Alert mechanisms include cooldown periods to prevent spam