export default function MovieCard({ movie, onGoMovie, isInWishlist, onToggleWishlist }) {
    if (!movie || !movie.thumb) return null;

    return (
        <div className="movieCard" onClick={() => onGoMovie(movie.id)}>
            <div className="movieCard__poster">
                <img src={movie.thumb} alt={movie.title} loading="lazy" />
                <div className="movieCard__overlay">
                    <button
                        className="movieCard__playBtn"
                        onClick={(e) => { e.stopPropagation(); onGoMovie(movie.id); }}
                    >
                        ▶
                    </button>
                </div>
                <button
                    className={`movieCard__wishBtn ${isInWishlist ? "is-active" : ""}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist();
                    }}
                    title={isInWishlist ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                >
                    {isInWishlist ? "❤" : "🤍"}
                </button>
                <div className="movieCard__rating">⭐ {movie.rating}</div>
            </div>
            <div className="movieCard__info">
                <div className="movieCard__title">{movie.title}</div>
                <div className="movieCard__meta">
                    <span>{movie.year}</span>
                    {movie.duration && <><span>·</span><span>{movie.duration}</span></>}
                </div>
                <div className="movieCard__genres">
                    {(movie.genres || []).slice(0, 2).map((g) => (
                        <span key={g} className="movieCard__genre">{g}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
