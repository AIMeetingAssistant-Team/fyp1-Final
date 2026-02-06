import { Download, FileText, Loader2, Music, Video, Play, Pause, SkipBack, SkipForward, Volume2, Mic } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ⭐ ADD THIS

const RecordingSection = ({ selected, isHost }) => {
    const recordings = selected.recordings || [];
    const navigate = useNavigate(); // ⭐ ADD THIS
    const [showDownloadProgress, setShowDownloadProgress] = useState(false);
    const [currentDownloadingFile, setCurrentDownloadingFile] = useState(null);
    const [showErrorNotification, setShowErrorNotification] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // Media player states for each recording
    const [playingStates, setPlayingStates] = useState({});
    const [currentTimes, setCurrentTimes] = useState({});
    const [durations, setDurations] = useState({});
    const [volumes, setVolumes] = useState({});
    const audioRefs = useRef({});
    const videoRefs = useRef({});
    
    const getToken = () => localStorage.getItem("token");

    // ⭐ ADD THIS FUNCTION FOR ADDING NEW RECORDING
    const handleAddRecording = () => {
        navigate(`/realtime-recorder/${selected._id}`);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const showNotification = (type, message) => {
        if (type === 'success') {
            setSuccessMessage(message);
            setShowSuccessNotification(true);
        } else {
            setErrorMessage(message);
            setShowErrorNotification(true);
        }
    };

    const handleDownloadRecording = async (recordingIndex = 0, fileName = 'recording') => {
        try {
            const token = getToken();
            setCurrentDownloadingFile({
                name: fileName,
                index: recordingIndex
            });
            setShowDownloadProgress(true);

            const response = await fetch(
                `${import.meta.env.VITE_BASE_URL}/recordings/${selected._id}/download/${recordingIndex}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showNotification('success', `"${fileName}" downloaded successfully!`);

        } catch (error) {
            console.error('Download error:', error);
            showNotification('error', `Download failed: ${error.message}`);
        } finally {
            setTimeout(() => {
                setCurrentDownloadingFile(null);
                setShowDownloadProgress(false);
            }, 2000);
        }
    };

    // Media player controls
    const togglePlayPause = (index) => {
        const isVideo = recordings[index].fileType?.startsWith('video') ||
            recordings[index].fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
        
        const mediaRef = isVideo ? videoRefs.current[index] : audioRefs.current[index];
        
        if (!mediaRef) return;

        if (playingStates[index]) {
            mediaRef.pause();
        } else {
            // Pause all other media players
            Object.keys(playingStates).forEach(idx => {
                if (playingStates[idx]) {
                    const otherIsVideo = recordings[idx].fileType?.startsWith('video') ||
                        recordings[idx].fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                    const otherMediaRef = otherIsVideo ? videoRefs.current[idx] : audioRefs.current[idx];
                    otherMediaRef?.pause();
                    setPlayingStates(prev => ({ ...prev, [idx]: false }));
                }
            });
            
            mediaRef.play();
        }
        
        setPlayingStates(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleTimeUpdate = (index, e) => {
        setCurrentTimes(prev => ({ ...prev, [index]: e.target.currentTime }));
    };

    const handleLoadedMetadata = (index, e) => {
        setDurations(prev => ({ ...prev, [index]: e.target.duration }));
    };

    const handleSeek = (index, value) => {
        const isVideo = recordings[index].fileType?.startsWith('video') ||
            recordings[index].fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
        
        const mediaRef = isVideo ? videoRefs.current[index] : audioRefs.current[index];
        if (mediaRef) {
            mediaRef.currentTime = value;
            setCurrentTimes(prev => ({ ...prev, [index]: value }));
        }
    };

    const handleVolumeChange = (index, value) => {
        const isVideo = recordings[index].fileType?.startsWith('video') ||
            recordings[index].fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
        
        const mediaRef = isVideo ? videoRefs.current[index] : audioRefs.current[index];
        if (mediaRef) {
            mediaRef.volume = value;
            setVolumes(prev => ({ ...prev, [index]: value }));
        }
    };

    const skipForward = (index) => {
        const isVideo = recordings[index].fileType?.startsWith('video') ||
            recordings[index].fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
        
        const mediaRef = isVideo ? videoRefs.current[index] : audioRefs.current[index];
        if (mediaRef) {
            mediaRef.currentTime = Math.min(mediaRef.currentTime + 10, mediaRef.duration);
        }
    };

    const skipBackward = (index) => {
        const isVideo = recordings[index].fileType?.startsWith('video') ||
            recordings[index].fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
        
        const mediaRef = isVideo ? videoRefs.current[index] : audioRefs.current[index];
        if (mediaRef) {
            mediaRef.currentTime = Math.max(mediaRef.currentTime - 10, 0);
        }
    };

    const handleEnded = (index) => {
        setPlayingStates(prev => ({ ...prev, [index]: false }));
        setCurrentTimes(prev => ({ ...prev, [index]: 0 }));
        
        const isVideo = recordings[index].fileType?.startsWith('video') ||
            recordings[index].fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
        const mediaRef = isVideo ? videoRefs.current[index] : audioRefs.current[index];
        if (mediaRef) {
            mediaRef.currentTime = 0;
        }
    };

    // Initialize volumes
    useEffect(() => {
        const initialVolumes = {};
        recordings.forEach((_, index) => {
            initialVolumes[index] = 0.7; // Default volume
        });
        setVolumes(initialVolumes);
    }, [recordings]);

    return (
        <div className="mt-6">
            {/* ⭐ ADD HEADER WITH ADD RECORDING BUTTON */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Recordings</h2>
                    <p className="text-sm text-gray-600">Meeting recordings and media files ({recordings.length})</p>
                </div>
                
                {/* {isHost && (
                    <button
                        onClick={handleAddRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all"
                    >
                        <Mic size={18} />
                        Add New Recording
                    </button>
                )} */}
            </div>

            {recordings.length === 0 ? (
                <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No recordings uploaded for this meeting</p>
                    {/* {isHost && (
                        <button
                            onClick={handleAddRecording}
                            className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all text-sm"
                        >
                            Start Recording
                        </button>
                    )} */}
                </div>
            ) : (
                <div className="space-y-6">
                    {recordings.map((recording, index) => {
                        const isVideo = recording.fileType?.startsWith('video') ||
                            recording.fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                        const isAudio = recording.fileType?.startsWith('audio') ||
                            recording.fileName?.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);
                        const mediaType = isVideo ? 'video' : isAudio ? 'audio' : 'other';

                        // ⭐ UPDATED URL TO USE THE CORRECT ENDPOINT
                        const recordingUrl = recording.url || `${import.meta.env.VITE_BASE_URL}/recordings/${selected._id}/download/${index}`;

                        return (
                            <div key={index} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                {/* File info header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center flex-1 min-w-0">
                                        {isVideo ? (
                                            <Video className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                                        ) : isAudio ? (
                                            <Music className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                                        ) : (
                                            <FileText className="w-5 h-5 text-gray-600 mr-3 flex-shrink-0" />
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 truncate">
                                                {recording.fileName || `Recording ${index + 1}`}
                                            </p>
                                            <div className="flex items-center text-sm text-gray-500 mt-1 flex-wrap gap-2">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                    {recording.fileType || (isAudio ? 'Audio' : 'File')}
                                                </span>
                                                <span>
                                                    {recording.fileSize ? formatFileSize(recording.fileSize) : 'Size not available'}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Uploaded: {recording.uploadedAt ?
                                                        new Date(recording.uploadedAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : 'Just now'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDownloadRecording(index, recording.fileName)}
                                        disabled={showDownloadProgress && currentDownloadingFile?.index === index}
                                        className="ml-4 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex-shrink-0"
                                        title="Download"
                                    >
                                        {showDownloadProgress && currentDownloadingFile?.index === index ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Download className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>

                                {/* Audio player - only for audio files */}
                                {mediaType === 'audio' && (
                                    <div className="mb-4">
                                        {/* Audio player with controls */}
                                        <audio
                                            ref={el => audioRefs.current[index] = el}
                                            src={recordingUrl}
                                            onTimeUpdate={(e) => handleTimeUpdate(index, e)}
                                            onLoadedMetadata={(e) => handleLoadedMetadata(index, e)}
                                            onEnded={() => handleEnded(index)}
                                            controls
                                            className="w-full"
                                            preload="metadata"
                                        />
                                    </div>
                                )}

                                {/* Custom media controls - only for audio files */}
                                {isAudio && (
                                    <div className="space-y-4">
                                        {/* Progress bar */}
                                        <div className="w-full">
                                            <input
                                                type="range"
                                                min="0"
                                                max={durations[index] || 100}
                                                value={currentTimes[index] || 0}
                                                onChange={(e) => handleSeek(index, parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                                                style={{
                                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((currentTimes[index] || 0) / (durations[index] || 1)) * 100}%, #d1d5db ${((currentTimes[index] || 0) / (durations[index] || 1)) * 100}%, #d1d5db 100%)`
                                                }}
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>{formatTime(currentTimes[index] || 0)}</span>
                                                <span>{formatTime(durations[index] || 0)}</span>
                                            </div>
                                        </div>

                                        {/* Control buttons */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                {/* Volume control */}
                                                <div className="flex items-center space-x-2">
                                                    <Volume2 className="w-4 h-4 text-gray-600" />
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1"
                                                        step="0.1"
                                                        value={volumes[index] || 0.7}
                                                        onChange={(e) => handleVolumeChange(index, parseFloat(e.target.value))}
                                                        className="w-20 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                {/* Skip backward */}
                                                <button
                                                    onClick={() => skipBackward(index)}
                                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="Skip backward 10 seconds"
                                                >
                                                    <SkipBack className="w-5 h-5" />
                                                </button>

                                                {/* Play/Pause */}
                                                <button
                                                    onClick={() => togglePlayPause(index)}
                                                    className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 rounded-full transition-colors shadow-sm"
                                                    title={playingStates[index] ? "Pause" : "Play"}
                                                >
                                                    {playingStates[index] ? (
                                                        <Pause className="w-5 h-5" />
                                                    ) : (
                                                        <Play className="w-5 h-5" />
                                                    )}
                                                </button>

                                                {/* Skip forward */}
                                                <button
                                                    onClick={() => skipForward(index)}
                                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                    title="Skip forward 10 seconds"
                                                >
                                                    <SkipForward className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* Duration display for audio only */}
                                            {isAudio && (
                                                <div className="text-sm text-gray-600 font-medium">
                                                    {formatTime(currentTimes[index] || 0)} / {formatTime(durations[index] || 0)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Non-media files */}
                                {mediaType === 'other' && (
                                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                                        <FileText className="w-8 h-8 mx-auto mb-2" />
                                        <p>Preview not available for this file type</p>
                                        <button
                                            onClick={() => handleDownloadRecording(index, recording.fileName)}
                                            className="mt-3 px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                        >
                                            Download File
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Notifications */}
            {showSuccessNotification && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg">
                    {successMessage}
                </div>
            )}
            {showErrorNotification && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
                    {errorMessage}
                </div>
            )}
        </div>
    );
}

export default RecordingSection;