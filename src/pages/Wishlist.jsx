import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context.jsx";
import MovieCard from "../components/MovieCard.jsx";

export default function Wishlist({ onGoMovie }) {
    const { wishlist, toggleWishlist, isInWishlist, fetchByGenre } = useApp();
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(false);

    // Extract unique genre IDs from all wishlisted movies
    const getWishlistGenreIds = useCallback(() => {
        const genreSet = new Set();
        wishlist.forEach((movie) => {
            (movie.genreIds || []).forEach((gid) => genreSet.add(gid));
        });
        return Array.from(genreSet);
    }, [wishlist]);

    // Fetch recommendations based on wishlisted genres
    useEffect(() => {
        const genreIds = getWishlistGenreIds();
        if (genreIds.length === 0) {
            setRecommendations([]);
            return;
        }

        let cancelled = false;
        setLoadingRecs(true);

        // Use the top 3 genres to fetch recommendations
        const topGenres = genreIds.slice(0, 3);
        Promise.all(
            topGenres.map(async (gid) => {
                try {
                    const data = await fetchByGenre(String(gid));
                    return data.results || [];
                } catch {
                    return [];
                }
            })
        ).then((results) => {
            if (cancelled) return;
            // Merge all results, deduplicate, exclude already-wishlisted movies
            const wishlistIds = new Set(wishlist.map((m) => m.id));
            const seen = new Set();
            const merged = [];
            results.flat().forEach((movie) => {
                if (!wishlistIds.has(movie.id) && !seen.has(movie.id)) {
                    seen.add(movie.id);
                    merged.push(movie);
                }
            });
            // Sort by popularity and take top 10
            merged.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            setRecommendations(merged.slice(0, 10));
            setLoadingRecs(false);
        });

        return () => { cancelled = true; };
    }, [wishlist, fetchByGenre, getWishlistGenreIds]);

    return (
        <div className="browsePage">
            <div className="container">
                <div className="browseHeader">
                    <h1 className="browseTitle">❤ Phim yêu thích</h1>
                    <p className="browseSubtitle">{wishlist.length} bộ phim đã lưu</p>
                </div>

                {wishlist.length > 0 ? (
                    <div className="movieGrid movieGrid--browse">
                        {wishlist.map((movie) => (
                            <MovieCard
                                key={movie.id}
                                movie={movie}
                                onGoMovie={onGoMovie}
                                isInWishlist={true}
                                onToggleWishlist={() => toggleWishlist(movie)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="emptyState">
                        <div className="emptyState__icon">💔</div>
                        <div className="emptyState__title">Chưa có phim yêu thích</div>
                        <p className="emptyState__desc">
                            Nhấn vào biểu tượng ❤ trên các bộ phim để lưu vào danh sách yêu thích của bạn
                        </p>
                    </div>
                )}

                {/* Recommendation Section */}
                {wishlist.length > 0 && recommendations.length > 0 && (
                    <div className="section" style={{ marginTop: 48 }}>
                        <div className="sectionHeader">
                            <div className="section__title">✨ Phim bạn có thể thích</div>
                        </div>
                        {loadingRecs ? (
                            <div style={{ color: "rgba(255,255,255,0.5)", padding: "20px 0" }}>Đang tìm phim phù hợp...</div>
                        ) : (
                            <div className="movieGrid movieGrid--browse">
                                {recommendations.map((movie) => (
                                    <MovieCard
                                        key={movie.id}
                                        movie={movie}
                                        onGoMovie={onGoMovie}
                                        isInWishlist={isInWishlist(movie.id)}
                                        onToggleWishlist={() => toggleWishlist(movie)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
