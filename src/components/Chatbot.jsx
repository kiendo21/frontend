import React, { useState, useEffect, useRef } from 'react';
import geminiLogo from '../assets/movies/Gemini_logo.png';
import { useApp } from '../context.jsx';

/**
 * Mood → Genre mapping
 * Each mood maps to a list of TMDB genre IDs with Vietnamese labels
 */
const MOOD_MAP = {
    "😊 Vui vẻ": [
        { id: 35, name: "Phim Hài" },
        { id: 10751, name: "Phim Gia Đình" },
        { id: 16, name: "Phim Hoạt Hình" },
        { id: 10402, name: "Phim Nhạc" },
    ],
    "😢 Buồn bã": [
        { id: 18, name: "Phim Chính Kịch" },
        { id: 10749, name: "Phim Lãng Mạn" },
        { id: 10751, name: "Phim Gia Đình" },
    ],
    "🤯 Căng thẳng": [
        { id: 28, name: "Phim Hành Động" },
        { id: 53, name: "Phim Giật Gân" },
        { id: 878, name: "Phim Khoa Học Viễn Tưởng" },
    ],
    "💪 Cần động lực": [
        { id: 12, name: "Phim Phiêu Lưu" },
        { id: 28, name: "Phim Hành Động" },
        { id: 36, name: "Phim Lịch Sử" },
        { id: 18, name: "Phim Chính Kịch" },
    ],
    "💕 Lãng mạn": [
        { id: 10749, name: "Phim Lãng Mạn" },
        { id: 35, name: "Phim Hài" },
        { id: 10402, name: "Phim Nhạc" },
    ],
    "👻 Sợ hãi": [
        { id: 27, name: "Phim Kinh Dị" },
        { id: 9648, name: "Phim Bí Ẩn" },
        { id: 53, name: "Phim Giật Gân" },
    ],
};

const MOODS = Object.keys(MOOD_MAP);

export default function Chatbot({ onNavigateGenre, onGoMovie }) {
    const { fetchByGenre } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMood, setSelectedMood] = useState(null);
    const [genreMovies, setGenreMovies] = useState({}); // { genreId: [movie1, movie2, movie3] }
    const [loadingMovies, setLoadingMovies] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, selectedMood, genreMovies]);

    // Fetch 3 movies for each genre when mood is selected
    useEffect(() => {
        if (!selectedMood) {
            setGenreMovies({});
            return;
        }

        const genres = MOOD_MAP[selectedMood];
        setLoadingMovies(true);

        Promise.all(
            genres.map(async (genre) => {
                try {
                    const data = await fetchByGenre(String(genre.id));
                    const movies = (data.results || []).slice(0, 3);
                    return { genreId: genre.id, movies };
                } catch {
                    return { genreId: genre.id, movies: [] };
                }
            })
        ).then((results) => {
            const map = {};
            results.forEach((r) => { map[r.genreId] = r.movies; });
            setGenreMovies(map);
            setLoadingMovies(false);
        });
    }, [selectedMood, fetchByGenre]);

    const handleMoodClick = (mood) => {
        setSelectedMood(mood);
    };

    const handleGenreClick = (genreId) => {
        setIsOpen(false);
        setSelectedMood(null);
        if (onNavigateGenre) {
            onNavigateGenre(genreId);
        }
    };

    const handleMovieClick = (movieId) => {
        setIsOpen(false);
        setSelectedMood(null);
        if (onGoMovie) {
            onGoMovie(movieId);
        }
    };

    const handleReset = () => {
        setSelectedMood(null);
    };

    return (
        <div className={`chatbot-container ${isOpen ? 'is-open' : ''}`}>
            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-header__title">
                            <img src={geminiLogo} alt="Gemini" className="chatbot-header__icon" />
                            Gemini AI
                        </div>
                        <button className="chatbot-header__close" onClick={() => { setIsOpen(false); setSelectedMood(null); }}>✕</button>
                    </div>

                    <div className="chatbot-messages">
                        {/* Step 1: Ask mood */}
                        <div className="chat-bubble-wrapper model">
                            <div className="chat-bubble">
                                Xin chào! 👋 Bạn đang cảm thấy thế nào? Hãy chọn tâm trạng để tôi gợi ý phim nhé!
                            </div>
                        </div>

                        <div className="chat-chips">
                            {MOODS.map((mood) => (
                                <button
                                    key={mood}
                                    className={`chat-chip ${selectedMood === mood ? 'is-active' : ''}`}
                                    onClick={() => handleMoodClick(mood)}
                                >
                                    {mood}
                                </button>
                            ))}
                        </div>

                        {/* Step 2: Show genres + movies based on selected mood */}
                        {selectedMood && (
                            <>
                                <div className="chat-bubble-wrapper user">
                                    <div className="chat-bubble">{selectedMood}</div>
                                </div>
                                <div className="chat-bubble-wrapper model">
                                    <div className="chat-bubble">
                                        Với tâm trạng <strong>{selectedMood}</strong>, đây là những thể loại và phim đang hot mà bạn có thể thích:
                                    </div>
                                </div>

                                {/* Genre sections with movies */}
                                {MOOD_MAP[selectedMood].map((genre) => (
                                    <div key={genre.id} className="chat-genre-section">
                                        <button
                                            className="chat-genre-title"
                                            onClick={() => handleGenreClick(genre.id)}
                                        >
                                            🎬 {genre.name} →
                                        </button>
                                        <div className="chat-movie-row">
                                            {loadingMovies ? (
                                                <div className="chat-movie-loading">Đang tải...</div>
                                            ) : (
                                                (genreMovies[genre.id] || []).map((movie) => (
                                                    <div
                                                        key={movie.id}
                                                        className="chat-movie-card"
                                                        onClick={() => handleMovieClick(movie.id)}
                                                    >
                                                        {movie.thumb && (
                                                            <img src={movie.thumb} alt={movie.title} className="chat-movie-card__img" />
                                                        )}
                                                        <div className="chat-movie-card__title">{movie.title}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <button className="chat-reset" onClick={handleReset}>← Chọn tâm trạng khác</button>
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            {/* Floating Toggle Button + Tooltip */}
            {!isOpen && (
                <div className="chatbot-toggle-wrapper">
                    <div className="chatbot-tooltip" onClick={() => setIsOpen(true)}>
                        Bạn đang cảm thấy thế nào?
                    </div>
                    <button className="chatbot-toggle" onClick={() => setIsOpen(true)}>
                        <img src={geminiLogo} alt="Gemini" className="chatbot-toggle__icon" />
                    </button>
                </div>
            )}
        </div>
    );
}
