import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../styles/ChatArea.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function ChatArea({ selectedRequest, onSubmit }) {
  const [inputType, setInputType] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);
  const [showVoiceGrid, setShowVoiceGrid] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => { fetchAvatarsAndVoices(); }, []);

  const fetchAvatarsAndVoices = async () => {
    try {
      const [avatarsRes, voicesRes] = await Promise.all([
        axios.get(`${API_URL}/avatars`),
        axios.get(`${API_URL}/voices`)
      ]);
      setAvatars(avatarsRes.data.data || []);
      setVoices(voicesRes.data.data || []);
    } catch (err) {
      console.error('Error fetching avatars/voices:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputType === 'text' && !text.trim()) return;
    if (inputType === 'document' && !file) return;

    setPendingMessage({
      original_text: text,
      input_document_path: file?.name,
      status: 'processing',
      avatar: selectedAvatar,
      voice: selectedVoice
    });

    const currentText = text;
    const currentFile = file;
    setText('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setLoading(true);
    await onSubmit(inputType, currentText, currentFile, selectedAvatar?.id, selectedVoice?.id);
    setLoading(false);
    setPendingMessage(null);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setInputType('document');
    }
  };

  const playVoiceSample = (voice, e) => {
    e.stopPropagation();
    if (!voice.sample_audio_path) return;
    if (playingVoiceId === voice.id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }
    const audioUrl = `${API_URL.replace('/api', '')}/files/${voice.sample_audio_path}`;
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setPlayingVoiceId(voice.id);
      audioRef.current.onended = () => setPlayingVoiceId(null);
    }
  };

  const displayRequest = pendingMessage || selectedRequest;

  if (!displayRequest) {
    return (
      <div className="chat-area">
        <audio ref={audioRef} style={{ display: 'none' }} />
        <div className="welcome-screen">
          <div className="welcome-content">
            <div className="welcome-icon">🏥</div>
            <h2>Medical Video POC</h2>
            <p>Submit medical text or a document to get a patient-friendly explanation with a generated video.</p>
          </div>
          {renderInputArea()}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <audio ref={audioRef} style={{ display: 'none' }} />
      <div className="split-panel">

        {/* LEFT — Input + Explanation */}
        <div className="panel-left">
          <div className="panel-scroll">

            {/* Original input */}
            <div className="result-section">
              <div className="result-section-label">Medical Input</div>
              <div className="result-section-body input-body">
                {displayRequest.original_text || `📄 ${displayRequest.input_document_path}`}
              </div>
              {(displayRequest.avatar?.id || displayRequest.voice?.id) && (
                <div className="selection-tags">
                  {displayRequest.avatar?.id && <span className="selection-tag">👤 {displayRequest.avatar.name}</span>}
                  {displayRequest.voice?.id && <span className="selection-tag">🎙️ {displayRequest.voice.name}</span>}
                </div>
              )}
            </div>

            {/* Processing state */}
            {displayRequest.status === 'processing' && (
              <div className="result-section processing-section">
                <div className="result-section-label">Processing</div>
                <div className="result-section-body">
                  <div className="loading-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                  <span>Simplifying medical text...</span>
                </div>
              </div>
            )}

            {/* Error */}
            {displayRequest.status === 'failed' && (
              <div className="result-section error-section">
                <div className="result-section-label">Error</div>
                <div className="result-section-body">
                  {displayRequest.error_message || 'Something went wrong'}
                </div>
              </div>
            )}

            {/* Simplified explanation */}
            {displayRequest.simplified_text && (
              <div className="result-section explanation-section">
                <div className="result-section-label">✦ Simplified Explanation</div>
                <div className="result-section-body explanation-body">
                  {displayRequest.simplified_text}
                </div>
              </div>
            )}
          </div>

          {/* Input area fixed at bottom of left panel */}
          {renderInputArea()}
        </div>

        {/* RIGHT — Video */}
        <div className="panel-right">
          {displayRequest.video_path ? (
            <div className="video-container">
              <div className="video-label">Generated Video</div>
              <video
                controls
                autoPlay
                className="main-video"
                src={`${API_URL.replace('/api', '')}/files/${displayRequest.video_path}`}
              />
            </div>
          ) : (
            <div className="video-placeholder">
              {displayRequest.status === 'processing' ? (
                <>
                  <div className="placeholder-icon">🎬</div>
                  <p>Generating video...</p>
                </>
              ) : (
                <>
                  <div className="placeholder-icon">🎬</div>
                  <p>Video will appear here</p>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );

  function renderInputArea() {
    return (
      <div className="input-area">
        <div className="selection-buttons">
          {/* Avatar selector */}
          <div className="selector-wrapper">
            {selectedAvatar ? (
              <button className="selector-btn selected" onClick={() => setShowAvatarGrid(!showAvatarGrid)}>
                {selectedAvatar.thumbnail_path
                  ? <img src={`${API_URL.replace('/api', '')}/files/${selectedAvatar.thumbnail_path}`} alt="" className="btn-thumb" />
                  : <span>👤</span>}
                <span>{selectedAvatar.name}</span>
                <span className="clear-btn" onClick={(e) => { e.stopPropagation(); setSelectedAvatar(null); }}>✕</span>
              </button>
            ) : (
              <button className="selector-btn" onClick={() => { setShowAvatarGrid(!showAvatarGrid); setShowVoiceGrid(false); }}>
                <span>👤</span><span>Select Avatar</span>
                <span className="arrow">{showAvatarGrid ? '▲' : '▼'}</span>
              </button>
            )}
            {showAvatarGrid && avatars.length > 0 && (
              <div className="selection-grid-popup">
                {avatars.map(avatar => (
                  <div key={avatar.id} className={`grid-item ${selectedAvatar?.id === avatar.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedAvatar(avatar); setShowAvatarGrid(false); }}>
                    {avatar.thumbnail_path
                      ? <img src={`${API_URL.replace('/api', '')}/files/${avatar.thumbnail_path}`} alt={avatar.name} />
                      : <div className="grid-placeholder">👤</div>}
                    <span className="grid-item-name">{avatar.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice selector */}
          <div className="selector-wrapper">
            {selectedVoice ? (
              <button className="selector-btn selected" onClick={() => setShowVoiceGrid(!showVoiceGrid)}>
                <span>🎙️</span><span>{selectedVoice.name}</span>
                <span className="clear-btn" onClick={(e) => { e.stopPropagation(); setSelectedVoice(null); }}>✕</span>
              </button>
            ) : (
              <button className="selector-btn" onClick={() => { setShowVoiceGrid(!showVoiceGrid); setShowAvatarGrid(false); }}>
                <span>🎙️</span><span>Select Voice</span>
                <span className="arrow">{showVoiceGrid ? '▲' : '▼'}</span>
              </button>
            )}
            {showVoiceGrid && voices.length > 0 && (
              <div className="selection-grid-popup">
                {voices.map(voice => (
                  <div key={voice.id} className={`grid-item voice-item ${selectedVoice?.id === voice.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedVoice(voice); setShowVoiceGrid(false); }}>
                    <div className="voice-icon">
                      🎙️
                      {voice.sample_audio_path && (
                        <button className="play-btn" onClick={(e) => playVoiceSample(voice, e)}>
                          {playingVoiceId === voice.id ? '⏹' : '▶'}
                        </button>
                      )}
                    </div>
                    <span className="grid-item-name">{voice.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()}>📎</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt" />
            {file ? (
              <div className="file-preview">
                <span>📄 {file.name}</span>
                <button type="button" onClick={() => { setFile(null); setInputType('text'); }}>✕</button>
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setInputType('text'); }}
                placeholder="Enter medical text to simplify..."
                rows={1}
                disabled={loading}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                }}
              />
            )}
            <button type="submit" className="submit-btn" disabled={loading || (!text.trim() && !file)}>
              {loading ? '...' : '➤'}
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default ChatArea;
