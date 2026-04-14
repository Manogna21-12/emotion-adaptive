// Hardcoded user ID for this standalone demo (simulating a logged-in user)
// Ensure this ID format matches Mongoose ObjectId or dynamically inject in real app.
const USER_ID = "650c1234abcd567890def123"; 

const API_BASE = "http://localhost:5000/api";

const allVideosContainer = document.getElementById("all-videos-container");
const recVideosContainer = document.getElementById("recommended-container");
const recSection = document.getElementById("recommended-section");
const statusBadge = document.getElementById("status-badge");

async function init() {
    renderSkeletons(allVideosContainer, 6);
    
    // Load default all videos (No emotion focus to start)
    await fetchAllVideos();

    // Since this is a vanilla JS demo disconnected from actual Webcam inference,
    // we hook up emulator buttons to simulate real-time AI states.
    setupSimulators();
}

async function fetchAllVideos(emotionFilter = null) {
    renderSkeletons(allVideosContainer, 6);
    try {
        let url = `${API_BASE}/videos`;
        if (emotionFilter) {
            url += `?emotion=${emotionFilter}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        renderCards(data, allVideosContainer, false);
    } catch (err) {
        console.error("Error fetching videos:", err);
        allVideosContainer.innerHTML = `<div class="empty-state">Failed to load videos API. Is Node.js running on Port 5000?</div>`;
    }
}

async function fetchRecommendedVideos() {
    recSection.classList.remove("hidden");
    renderSkeletons(recVideosContainer, 3);
    try {
        const res = await fetch(`${API_BASE}/videos/recommend/${USER_ID}`);
        
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        if (data && data.length > 0) {
            renderCards(data, recVideosContainer, true);
        } else {
            // Hide section if no recommendations available
            recSection.classList.add("hidden");
        }
    } catch (err) {
        console.error("Error fetching recommended:", err);
        recSection.classList.add("hidden");
    }
}

function renderSkeletons(container, count) {
    let html = '';
    for(let i=0; i<count; i++) {
        html += `
        <div class="video-card skeleton">
            <div class="sk-img"></div>
            <div style="padding-top: 1.5rem">
                <div class="sk-line"></div>
                <div class="sk-line short"></div>
                <div class="sk-line" style="margin-top: 2rem;"></div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function renderCards(videos, container, isRecommended) {
    if(!videos || videos.length === 0) {
        container.innerHTML = `<div class="empty-state">Uh oh! No videos found matching your current state.</div>`;
        return;
    }

    const html = videos.map(vid => `
        <div class="video-card">
            <div class="card-img">
                <img src="${vid.video_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'}" alt="Preview" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'">
                <div class="card-badge">${vid.duration || '5:00'}</div>
                ${isRecommended ? '<div class="rec-badge">⭐ Recommended</div>' : ''}
            </div>
            <div class="card-content">
                <h3 class="card-title">${vid.title}</h3>
                <div class="card-meta">
                    <span class="level">${vid.level || 'Beginner'}</span>
                    <span style="text-transform: capitalize;">#${vid.emotion_tag}</span>
                </div>
                <button class="card-btn" onclick="startLearning('${vid._id}')">Start Learning</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function startLearning(id) {
    alert("Navigating to Video Player for ID: " + id);
}

function setupSimulators() {
    document.getElementById("simulate-happy").onclick = () => triggerEmotion("happy");
    document.getElementById("simulate-confused").onclick = () => triggerEmotion("confused");
    document.getElementById("simulate-sad").onclick = () => triggerEmotion("sad");
    document.getElementById("clear-filter").onclick = () => {
        document.body.className = "theme-neutral";
        statusBadge.textContent = "Current State: Neutral";
        recSection.classList.add("hidden");
        fetchAllVideos(); // Reset view
    };
}

async function triggerEmotion(emotion) {
    // 1. Visually update UI theme based on emotion
    document.body.className = `theme-${emotion}`;
    statusBadge.textContent = `Current State: ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`;

    // 2. Fetch the newly filtered catalog dynamically based on emotion
    fetchAllVideos(emotion);
    
    // 3. Log emotion to backend to calculate streak/stats
    // In actual app, this is done silently by webcam background worker.
    try {
        await fetch(`${API_BASE}/log-emotion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: USER_ID, emotion: emotion, focus: 85 })
        });
        
        // 4. Fetch the dynamic "AI Suggestions" block from backend passing our USER_ID
        // This will grab the emotion we just logged!
        fetchRecommendedVideos();

    } catch (e) { 
        console.error("Could not sync emotion to database", e); 
    }
}

// Kickoff
window.onload = init;
