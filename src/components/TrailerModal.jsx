import React from "react";

export default function TrailerModal({ trailerKey, isOpen, onClose }) {
    if (!isOpen || !trailerKey) return null;

    return (
        <div className="trailerModal" onClick={onClose}>
            <div className="trailerModal__content" onClick={(e) => e.stopPropagation()}>
                <button className="trailerModal__close" onClick={onClose}>✕</button>
                <div className="trailerModal__video">
                    <iframe
                        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                        title="Movie Trailer"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        </div>
    );
}
