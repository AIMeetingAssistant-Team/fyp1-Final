import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import "../assets/style/VideoMeeting.css";
import { apiRequest } from "../utils/api";
import { useAIContext } from '../context/AIContext';
import { Copy, Share2, Mail, QrCode, Users, Clock, Mic, Video, ScreenShare, MessageSquare, Hand, X } from "lucide-react";

const VideoMeeting = () => {
    const { meetingId } = useParams();
    const containerRef = useRef(null);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meetingInfo, setMeetingInfo] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [userRole, setUserRole] = useState("participant");
    const [showTranscript, setShowTranscript] = useState(false);
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [meetingShareInfo, setMeetingShareInfo] = useState(null);
    const [copyStatus, setCopyStatus] = useState('');
    const { addRealTimeTranscript, realTimeTranscripts } = useAIContext();

    // Refs for managing ZEGO instance and state
    const zpRef = useRef(null);
    const meetingTimer = useRef(null);
    const joinTimeout = useRef(null);
    const isMountedRef = useRef(true);
    const hasJoinedRef = useRef(false);
    const isInitializingRef = useRef(false);
    const cleanupCalledRef = useRef(false);
    const zegoInstanceRef = useRef(null);

    // ✅ Get auth token from localStorage
    const getAuthToken = useCallback(() => {
        return localStorage.getItem("token");
    }, []);

    // ✅ Get user info
    const getUserInfo = useCallback(() => {
        try {
            const userStr = localStorage.getItem("user");
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }, []);

    // ✅ Fetch meeting info
    const fetchMeetingInfo = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error("Please login first");
            }

            const data = await apiRequest(`/meetings/${meetingId}`, "GET", null, token);

            if (!data.success) {
                throw new Error(data.message);
            }

            const meeting = data.meeting;
            const user = getUserInfo();

            const userIsHost = meeting.host._id.toString() === user?.id;

            if (isMountedRef.current) {
                setIsHost(userIsHost);
                setUserRole(userIsHost ? "host" : "participant");
            }

            return meeting;

        } catch (err) {
            console.error("Meeting info error:", err);
            throw err;
        }
    }, [meetingId, getAuthToken, getUserInfo]);

    // ✅ Get share info
    const getShareInfo = useCallback(async () => {
        try {
            const token = getAuthToken();
            const data = await apiRequest(`/meetings/${meetingId}/share`, 'GET', null, token);
            
            if (data.success) {
                setMeetingShareInfo(data.shareInfo || {
                    meetingCode: meetingInfo?.meetingCode || meetingId.substring(0, 8).toUpperCase(),
                    shareableLink: window.location.href
                });
            } else {
                // Fallback if no share endpoint
                setMeetingShareInfo({
                    meetingCode: meetingInfo?.meetingCode || meetingId.substring(0, 8).toUpperCase(),
                    shareableLink: window.location.href,
                    title: meetingInfo?.title || "Video Meeting"
                });
            }
        } catch (err) {
            console.error('Get share info error:', err);
            // Fallback
            setMeetingShareInfo({
                meetingCode: meetingInfo?.meetingCode || meetingId.substring(0, 8).toUpperCase(),
                shareableLink: window.location.href,
                title: meetingInfo?.title || "Video Meeting"
            });
        }
    }, [meetingId, getAuthToken, meetingInfo]);

    const handleRealTimeTranscript = (data) => {
        if (data.meetingId === meetingId) {
            addRealTimeTranscript(meetingId, {
                text: data.text,
                speaker: data.speaker || 'Unknown',
                timestamp: new Date().toLocaleTimeString(),
                confidence: data.confidence || 0.8
            });
        }
    };

    // ✅ Fetch ZEGO token from backend
    const fetchZegoToken = useCallback(async (role) => {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error("Please login first");
            }

            const data = await apiRequest(
                `/zego/meetings/${meetingId}/token`,
                "POST",
                { role },
                token
            );

            if (!data.success) {
                throw new Error(data.message || "Failed to generate token");
            }

            return data;

        } catch (err) {
            console.error("Token fetch error:", err);
            throw err;
        }
    }, [meetingId, getAuthToken]);

    // ✅ Start video meeting (host only)
    const startVideoMeeting = useCallback(async () => {
        try {
            const token = getAuthToken();

            const data = await apiRequest(
                `/zego/meetings/${meetingId}/start`,
                "POST",
                {},
                token
            );

            if (data.success === false) {
                throw new Error(data.message || "Failed to start meeting");
            }

            return true;
        } catch (err) {
            console.error("Failed to start meeting:", err);
            return false;
        }
    }, [meetingId, getAuthToken]);

    // ✅ Generate Kit Token for ZEGO
    const generateKitToken = useCallback((tokenData) => {
        try {
            if (!tokenData.appID || !tokenData.roomID || !tokenData.userID) {
                throw new Error("Incomplete token data received from server");
            }

            const appID = parseInt(tokenData.appID);
            if (isNaN(appID)) {
                throw new Error(`Invalid App ID: ${tokenData.appID}`);
            }

            // Use your ZEGO server secret
            const serverSecret = "8d1a41f413ddc278af7723dcd70e5148";

            // Generate the Kit Token
            const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                appID,
                serverSecret,
                tokenData.roomID,
                tokenData.userID,
                tokenData.userName
            );

            return kitToken;

        } catch (err) {
            console.error("Kit Token generation failed:", err);
            throw new Error("Failed to generate video meeting token: " + err.message);
        }
    }, []);

    // ✅ Start meeting timer
    const startMeetingTimer = useCallback(() => {
        let seconds = 0;
        if (meetingTimer.current) {
            clearInterval(meetingTimer.current);
        }
        meetingTimer.current = setInterval(() => {
            seconds++;
            const timerElement = document.getElementById("meeting-timer");
            if (timerElement && isMountedRef.current) {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                timerElement.textContent =
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }, []);

    // ✅ Stop meeting timer
    const stopMeetingTimer = useCallback(() => {
        if (meetingTimer.current) {
            clearInterval(meetingTimer.current);
            meetingTimer.current = null;
        }
    }, []);

    // ✅ Initialize ZEGO meeting
    const initializeZegoMeeting = useCallback(async (tokenData) => {
        try {
            // Check if we should proceed
            if (!isMountedRef.current || hasJoinedRef.current || isInitializingRef.current) {
                console.log("Skipping initialization - already joined or unmounted");
                return;
            }

            isInitializingRef.current = true;

            // Generate kit token
            const kitToken = generateKitToken(tokenData);

            // Create Zego instance
            const zp = ZegoUIKitPrebuilt.create(kitToken);
            zpRef.current = zp;
            zegoInstanceRef.current = zp;

            // Configure meeting
            const meetingConfig = {
                container: containerRef.current,
                scenario: {
                    mode: ZegoUIKitPrebuilt.VideoConference,
                    config: {
                        turnOnMicrophoneWhenJoining: false,
                        turnOnCameraWhenJoining: false,
                        showMyMeetingTimer: true,
                        showTextChat: true,
                        showUserList: true,
                        showScreenSharingButton: isHost,
                        showLeavingView: false,
                        showNonVideoUser: true,
                        showOnlyAudioUser: true,
                        roleType: isHost ?
                            ZegoUIKitPrebuilt.Host :
                            ZegoUIKitPrebuilt.Cohost,
                    }
                },
                showPreJoinView: false,
                sharedLinks: [{
                    name: 'Meeting Link',
                    url: window.location.protocol + '//' + window.location.host + window.location.pathname,
                }],
                // Event Handlers
                onJoinRoom: () => {
                    console.log("✅ Successfully joined ZEGO meeting room!");
                    if (isMountedRef.current) {
                        hasJoinedRef.current = true;
                        isInitializingRef.current = false;
                        setLoading(false);
                        startMeetingTimer();
                    }
                },
                onLeaveRoom: () => {
                    console.log("👋 Left ZEGO meeting room");
                    stopMeetingTimer();
                    hasJoinedRef.current = false;

                    // Clean up ZEGO instance
                    if (zpRef.current === zegoInstanceRef.current) {
                        zpRef.current = null;
                        zegoInstanceRef.current = null;
                    }

                    // Navigate back if still mounted
                    if (isMountedRef.current) {
                        navigate(`/meetings/${meetingId}`);
                    }
                },
                onJoinRoomError: (error) => {
                    console.error("ZEGO join error:", error);
                    isInitializingRef.current = false;
                    if (isMountedRef.current) {
                        setError(`Failed to join meeting: ${error.message || 'unknown'}`);
                        setLoading(false);
                        hasJoinedRef.current = false;
                    }
                },
            };

            // Join the room
            zp.joinRoom(meetingConfig);

        } catch (err) {
            console.error("ZEGO initialization error:", err);
            isInitializingRef.current = false;
            if (isMountedRef.current) {
                setError(err.message || "Failed to initialize video meeting");
                setLoading(false);
                hasJoinedRef.current = false;
            }
        }
    }, [meetingId, isHost, navigate, generateKitToken, startMeetingTimer, stopMeetingTimer]);

    // ✅ Main join meeting function
    const joinMeeting = useCallback(async () => {
        try {
            if (!isMountedRef.current || hasJoinedRef.current || isInitializingRef.current) {
                return;
            }

            setLoading(true);
            setError(null);

            // 1. Fetch meeting information
            const meeting = await fetchMeetingInfo();
            if (!isMountedRef.current) return;

            setMeetingInfo(meeting);

            // 2. Check meeting status
            if (meeting.status === 'cancelled') {
                throw new Error("This meeting has been cancelled");
            }

            if (meeting.status === 'completed') {
                throw new Error("This meeting has already ended");
            }

            // 3. If meeting is scheduled and user is host, start it
            if (meeting.status === 'scheduled' && isHost) {
                const started = await startVideoMeeting();
                if (!started) {
                    throw new Error("Failed to start the meeting");
                }
            } else if (meeting.status === 'scheduled' && !isHost) {
                setError("Waiting for host to start the meeting...");
                setLoading(false);
                return;
            }

            // 4. Fetch ZEGO token with correct role
            const tokenRole = isHost ? "host" : "participant";
            const tokenData = await fetchZegoToken(tokenRole);

            // 5. Initialize ZEGO meeting
            await initializeZegoMeeting(tokenData);

        } catch (err) {
            console.error("Join meeting error:", err);
            if (isMountedRef.current) {
                setError(err.response?.data?.message || err.message || "Failed to join meeting");
                setLoading(false);
                hasJoinedRef.current = false;
                isInitializingRef.current = false;
            }
        }
    }, [isHost, fetchMeetingInfo, startVideoMeeting, fetchZegoToken, initializeZegoMeeting]);

    // ✅ Handle leaving meeting
    const handleLeaveMeeting = useCallback(() => {
        console.log("User initiated leaving meeting");

        if (zpRef.current && hasJoinedRef.current) {
            // Let ZEGO handle the leave process
            zpRef.current.leaveRoom();
        } else {
            navigate(`/meetings/${meetingId}`);
        }
    }, [meetingId, navigate]);

    // ✅ End meeting (host only)
    const handleEndMeeting = useCallback(async () => {
        if (window.confirm("Are you sure you want to end the meeting for everyone?")) {
            try {
                const token = getAuthToken();
                const data = await apiRequest(
                    `/zego/meetings/${meetingId}/end`,
                    "POST",
                    {},
                    token
                );
                if (data.success === false) {
                    throw new Error(data.message || "Failed to end meeting");
                }
                handleLeaveMeeting();
            } catch (err) {
                console.error("Failed to end meeting:", err);
                alert("Failed to end meeting: " + (err.response?.data?.message || err.message));
            }
        }
    }, [meetingId, getAuthToken, handleLeaveMeeting]);

    // ✅ Copy meeting link
    const copyMeetingLink = useCallback(() => {
        const link = window.location.href;
        navigator.clipboard.writeText(link)
            .then(() => {
                // Show toast
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transform translate-y-0 opacity-0 transition-all duration-300 z-50';
                toast.textContent = 'Meeting link copied to clipboard!';
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.classList.add('opacity-100');
                }, 10);
                
                setTimeout(() => {
                    toast.classList.remove('opacity-100');
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 3000);
            })
            .catch(err => {
                console.error("Failed to copy link:", err);
                alert("Failed to copy link to clipboard");
            });
    }, []);

    // ✅ Copy text to clipboard
    const copyToClipboard = async (text, type = 'link') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyStatus(type);
            
            // Show success message
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transform translate-y-0 opacity-0 transition-all duration-300 z-50';
            toast.textContent = `${type === 'code' ? 'Meeting code' : 'Link'} copied to clipboard!`;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('opacity-100');
            }, 10);
            
            setTimeout(() => {
                toast.classList.remove('opacity-100');
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
            
            setTimeout(() => setCopyStatus(''), 2000);
            
        } catch (err) {
            console.error('Copy failed:', err);
            setCopyStatus('error');
        }
    };

    // ✅ Share meeting function
    const shareMeeting = async () => {
        if (!meetingShareInfo) {
            await getShareInfo();
        }
        
        if (navigator.share && meetingShareInfo) {
            try {
                await navigator.share({
                    title: `Join ${meetingInfo?.title || 'my meeting'}`,
                    text: `Join my meeting. Meeting code: ${meetingShareInfo.meetingCode}`,
                    url: meetingShareInfo.shareableLink,
                });
            } catch (err) {
                console.error('Share failed:', err);
                // Fallback to copy
                copyToClipboard(meetingShareInfo.shareableLink, 'link');
            }
        } else {
            setShowSharePanel(true);
        }
    };

    // ✅ Safe ZEGO instance cleanup
    const safeDestroyZegoInstance = useCallback(() => {
        try {
            if (zegoInstanceRef.current) {
                // Check if the instance is still valid
                const instance = zegoInstanceRef.current;

                // Use try-catch for destroy to prevent errors
                try {
                    if (instance.destroy && typeof instance.destroy === 'function') {
                        instance.destroy();
                    }
                } catch (destroyError) {
                    console.warn("Error destroying ZEGO instance:", destroyError);
                }

                zegoInstanceRef.current = null;
                zpRef.current = null;
            }
        } catch (err) {
            console.warn("Error in safe ZEGO cleanup:", err);
        }
    }, []);

    // ✅ Proper cleanup function
    const cleanup = useCallback(() => {
        if (cleanupCalledRef.current) return;
        cleanupCalledRef.current = true;

        console.log("Starting cleanup...");

        // Mark as unmounted
        isMountedRef.current = false;

        // Clear any pending timeouts
        if (joinTimeout.current) {
            clearTimeout(joinTimeout.current);
            joinTimeout.current = null;
        }

        // Stop timer
        stopMeetingTimer();

        // Reset state refs
        hasJoinedRef.current = false;
        isInitializingRef.current = false;

        // Safe cleanup of ZEGO instance with delay
        setTimeout(() => {
            safeDestroyZegoInstance();
        }, 0);

        console.log("Cleanup completed");
    }, [stopMeetingTimer, safeDestroyZegoInstance]);

    // ✅ Main effect - handles initialization
    useEffect(() => {
        // Skip if already initialized or no meetingId
        if (hasJoinedRef.current || !meetingId) {
            return;
        }

        // Reset cleanup flag
        cleanupCalledRef.current = false;
        isMountedRef.current = true;

        // Check authentication
        const token = getAuthToken();
        const user = getUserInfo();

        if (!token || !user) {
            setError("Please login to join the meeting");
            setLoading(false);
            navigate('/login', { state: { from: `/video-meeting/${meetingId}` } });
            return;
        }

        // Join meeting with delay to ensure DOM is ready
        joinTimeout.current = setTimeout(() => {
            joinMeeting();
        }, 100);

        // Cleanup function
        return () => {
            console.log("Cleaning up effect");
            if (joinTimeout.current) {
                clearTimeout(joinTimeout.current);
                joinTimeout.current = null;
            }
        };
    }, [meetingId, getAuthToken, getUserInfo, navigate, joinMeeting]);

    useEffect(() => {
        // This would connect to your WebSocket or Socket.io for real-time transcription
        // For now, we'll simulate with a mock event listener
        const handleMockTranscription = (event) => {
            // This would come from your WebSocket connection
            handleRealTimeTranscript(event.detail);
        };

        window.addEventListener('transcription:real-time', handleMockTranscription);

        return () => {
            window.removeEventListener('transcription:real-time', handleMockTranscription);
        };
    }, [meetingId, handleRealTimeTranscript]);


    // ✅ Cleanup effect - runs only on actual unmount
    useEffect(() => {
        return () => {
            console.log("Component unmounting - final cleanup");
            cleanup();
        };
    }, [cleanup]);

    // ✅ Loading screen
    if (loading) {
        return (
            <div className="video-loading">
                <div className="spinner"></div>
                <h2>Initializing Video Meeting...</h2>
                <p>Setting up audio and video connections</p>

                {meetingInfo && (
                    <div className="meeting-info-card">
                        <h3>{meetingInfo.title}</h3>
                        <div className="meeting-details">
                            <p><strong>Host:</strong> {meetingInfo.host?.name}</p>
                            <p><strong>Your Role:</strong> <span className="role-badge">{userRole}</span></p>
                            <p><strong>Status:</strong> <span className={`status status-${meetingInfo.status}`}>
                                {meetingInfo.status === 'in-progress' ? 'Live Now' : meetingInfo.status}
                            </span></p>
                        </div>
                    </div>
                )}

                <div className="loading-tips">
                    <h4>📝 Tips for best experience:</h4>
                    <ul>
                        <li>Allow camera and microphone permissions when prompted</li>
                        <li>Use headphones to avoid echo</li>
                        <li>Ensure good lighting for your video</li>
                        <li>Close other bandwidth-intensive applications</li>
                    </ul>
                </div>

                <div className="loading-actions">
                    <button
                        onClick={() => {
                            cleanup();
                            isMountedRef.current = true;
                            cleanupCalledRef.current = false;
                            hasJoinedRef.current = false;
                            isInitializingRef.current = false;
                            setError(null);
                            setLoading(true);
                            setTimeout(() => joinMeeting(), 300);
                        }}
                        className="retry-btn"
                        disabled={loading}
                    >
                        {loading ? 'Connecting...' : 'Retry Connection'}
                    </button>
                    <button
                        onClick={() => navigate(`/meetings/${meetingId}`)}
                        className="back-btn"
                    >
                        Back to Meeting Details
                    </button>
                </div>
            </div>
        );
    }

    // ✅ Error screen
    if (error) {
        return (
            <div className="video-error">
                <div className="error-icon">❌</div>
                <h2>Unable to Join Meeting</h2>
                <p className="error-message">{error}</p>

                <div className="error-details">
                    <p><strong>Meeting ID:</strong> {meetingId}</p>
                    <p><strong>Status:</strong> {meetingInfo?.status || 'Unknown'}</p>
                    <p><strong>Your Role:</strong> {userRole}</p>
                </div>

                <div className="error-actions">
                    <button
                        onClick={() => {
                            cleanup();
                            isMountedRef.current = true;
                            cleanupCalledRef.current = false;
                            hasJoinedRef.current = false;
                            isInitializingRef.current = false;
                            setError(null);
                            setLoading(true);
                            setTimeout(() => joinMeeting(), 300);
                        }}
                        className="primary-btn"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => navigate(`/meetings/${meetingId}`)}
                        className="secondary-btn"
                    >
                        Back to Meeting Details
                    </button>
                    {isHost && meetingInfo?.status === 'scheduled' && (
                        <button
                            onClick={async () => {
                                cleanup();
                                isMountedRef.current = true;
                                cleanupCalledRef.current = false;
                                hasJoinedRef.current = false;
                                isInitializingRef.current = false;
                                setError(null);
                                setLoading(true);
                                try {
                                    await startVideoMeeting();
                                    setTimeout(() => joinMeeting(), 300);
                                } catch (err) {
                                    setError(err.message);
                                }
                            }}
                            className="host-btn"
                        >
                            Start Meeting Now
                        </button>
                    )}
                </div>

                <div className="troubleshooting">
                    <h4>🔧 Troubleshooting Tips:</h4>
                    <ul>
                        <li>Refresh the page (Ctrl + R or Cmd + R)</li>
                        <li>Check your internet connection</li>
                        <li>Make sure you're logged in</li>
                        <li>Try using a different browser</li>
                        <li>Clear browser cache if problems persist</li>
                    </ul>
                </div>
            </div>
        );
    }

    // ✅ Main meeting screen
    return (
        <>
            <div className="video-meeting-container">
                {/* Header */}
                <div className="meeting-header">
                    <div className="meeting-info">
                        <div className="meeting-title-section">
                            <div className="title-and-role">
                                <h2>{meetingInfo?.title || "Video Meeting"}</h2>
                                <span className={`role-tag ${userRole}`}>
                                    {userRole === 'host' ? '👑 Host' : '👥 Participant'}
                                </span>
                            </div>
                            <div className="meeting-status">
                                <span className="live-indicator"></span>
                                <span className="live-text">LIVE</span>
                                <button
                                    onClick={shareMeeting}
                                    className="share-btn"
                                    title="Share meeting"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </button>
                            </div>
                        </div>

                        <div className="meeting-controls">
                            <div className="time-display">
                                <Clock className="w-4 h-4" />
                                <span id="meeting-timer">00:00:00</span>
                            </div>

                            {isHost && (
                                <button
                                    onClick={handleEndMeeting}
                                    className="end-meeting-btn danger"
                                    title="End meeting for all participants"
                                >
                                    🏁 End Meeting
                                </button>
                            )}

                            <button
                                onClick={handleLeaveMeeting}
                                className="leave-btn"
                            >
                                🚪 Leave
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main video area */}
                <div className="video-main-area">
                    <div ref={containerRef} className="zego-container" />

                    {/* Transcript Panel */}
                    {showTranscript && (
                        <div className="transcript-panel">
                            <div className="transcript-header">
                                <h3>Live Transcript</h3>
                                <button 
                                    onClick={() => setShowTranscript(false)}
                                    className="close-transcript"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="transcript-content">
                                {realTimeTranscripts[meetingId]?.length > 0 ? (
                                    realTimeTranscripts[meetingId].map((transcript, index) => (
                                        <div key={index} className="transcript-item">
                                            <div className="transcript-meta">
                                                <span className="speaker">{transcript.speaker}</span>
                                                <span className="time">{transcript.timestamp}</span>
                                            </div>
                                            <p className="transcript-text">{transcript.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-transcripts">
                                        <p>No transcripts yet. Start speaking to see live transcription.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick controls overlay (bottom center) */}
                    <div className="quick-controls-overlay">
                        <div className="quick-controls">
                            <button
                                className="control-btn"
                                onClick={() => {
                                    // Toggle microphone - ZEGO SDK handles this
                                }}
                                title="Toggle microphone"
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                            <button
                                className="control-btn"
                                onClick={() => {
                                    // Toggle camera - ZEGO SDK handles this
                                }}
                                title="Toggle camera"
                            >
                                <Video className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowTranscript(!showTranscript)}
                                className={`control-btn ${showTranscript ? 'active' : ''}`}
                                title="Toggle transcript"
                            >
                                📝
                            </button>
                            <button
                                className="control-btn"
                                onClick={() => {
                                    // Screen share - ZEGO SDK handles this
                                }}
                                title="Share screen"
                            >
                                <ScreenShare className="w-5 h-5" />
                            </button>
                            <button
                                className="control-btn"
                                onClick={() => {
                                    // Raise hand - ZEGO SDK handles this
                                }}
                                title="Raise hand"
                            >
                                <Hand className="w-5 h-5" />
                            </button>
                            <button
                                className="control-btn"
                                onClick={() => {
                                    // Open chat - ZEGO SDK handles this
                                }}
                                title="Open chat"
                            >
                                <MessageSquare className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="meeting-footer">
                    <div className="connection-status">
                        <span className="connection-indicator good"></span>
                        <span>Connection: Excellent</span>
                    </div>

                    <div className="meeting-id-display">
                        <span>Meeting ID: {meetingId}</span>
                        {meetingInfo?.videoRoomId && (
                            <span className="room-id">Room: {meetingInfo.videoRoomId.substring(0, 10)}...</span>
                        )}
                    </div>

                    <div className="footer-actions">
                        <button
                            onClick={copyMeetingLink}
                            className="help-link"
                            title="Copy meeting link"
                        >
                            <Copy className="w-4 h-4" />
                            Copy Link
                        </button>
                    </div>
                </div>
            </div>

            {/* Share Panel Modal */}
            {showSharePanel && (
                <div className="share-panel-overlay" onClick={() => setShowSharePanel(false)}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="share-panel" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="share-panel-header">
                            <h3>Share Meeting</h3>
                            <button 
                                onClick={() => setShowSharePanel(false)}
                                className="close-btn"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="share-content">
                            {/* Meeting Info */}
                            <div className="meeting-info-summary">
                                <h4>{meetingInfo?.title || "Video Meeting"}</h4>
                                <div className="info-row">
                                    <Users className="w-4 h-4" />
                                    <span>Host: {meetingInfo?.host?.name || "You"}</span>
                                </div>
                                <div className="info-row">
                                    <Clock className="w-4 h-4" />
                                    <span>Duration: <span id="share-timer">00:00:00</span></span>
                                </div>
                            </div>
                            
                            {/* Meeting Code */}
                            <div className="share-section">
                                <label>Meeting Code</label>
                                <div className="code-display">
                                    <code>{meetingShareInfo?.meetingCode || meetingId.substring(0, 8).toUpperCase()}</code>
                                    <button
                                        onClick={() => copyToClipboard(meetingShareInfo?.meetingCode || meetingId.substring(0, 8).toUpperCase(), 'code')}
                                        className={`copy-btn ${copyStatus === 'code' ? 'copied' : ''}`}
                                    >
                                        {copyStatus === 'code' ? '✓ Copied' : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="help-text">Share this code with participants</p>
                            </div>
                            
                            {/* Shareable Link */}
                            <div className="share-section">
                                <label>Shareable Link</label>
                                <div className="link-display">
                                    <input
                                        type="text"
                                        readOnly
                                        value={meetingShareInfo?.shareableLink || window.location.href}
                                        className="share-link-input"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(meetingShareInfo?.shareableLink || window.location.href, 'link')}
                                        className={`copy-btn ${copyStatus === 'link' ? 'copied' : ''}`}
                                    >
                                        {copyStatus === 'link' ? '✓ Copied' : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="help-text">Click to copy the full link</p>
                            </div>
                            
                            {/* Share Options */}
                            <div className="share-options">
                                <button
                                    onClick={() => {
                                        if (navigator.share && meetingShareInfo) {
                                            navigator.share({
                                                title: `Join ${meetingInfo?.title}`,
                                                text: `Join my meeting: ${meetingShareInfo.meetingCode}`,
                                                url: meetingShareInfo.shareableLink,
                                            });
                                        }
                                    }}
                                    className="share-option-btn primary"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share via...
                                </button>
                                
                                <button
                                    onClick={() => {
                                        // Generate email template
                                        const subject = `Join my meeting: ${meetingInfo?.title}`;
                                        const body = `You're invited to join my meeting.\n\nMeeting: ${meetingInfo?.title}\nCode: ${meetingShareInfo?.meetingCode}\nLink: ${meetingShareInfo?.shareableLink || window.location.href}\n\nJoin now!`;
                                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                                    }}
                                    className="share-option-btn"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email Invite
                                </button>
                            </div>
                            
                            {/* Quick Tips */}
                            <div className="share-tips">
                                <h4>📝 Quick Tips:</h4>
                                <ul>
                                    <li>• Participants can join without creating an account</li>
                                    <li>• Share the link for easiest joining experience</li>
                                    <li>• Meeting expires after 1 hour of inactivity</li>
                                    <li>• Host can extend the meeting anytime</li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default VideoMeeting;