import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context.jsx";
import MovieCard from "../components/MovieCard.jsx";
import TrailerModal from "../components/TrailerModal.jsx";
import { mapMovieFromList, fetchByGenre } from "../tmdb.js";
import { api } from "../api.js";

export default function MovieDetail({ movieId, onGoBack, onGoMovie, onGoPerson, onGoAuth }) {
    const { toggleWishlist, isInWishlist, genreMap, currentUser, addHistory, addComment, saveRating, myRatings, myReactions, setMovieReaction } = useApp();
    const [movie, setMovie] = useState(null);
    const [related, setRelated] = useState([]);
    const [sameGenre, setSameGenre] = useState([]);
    const [activeGenres, setActiveGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [genreLoading, setGenreLoading] = useState(false);
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);
    const { fetchMovieDetail } = useApp();

    // Comments & Rating state
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [newRating, setNewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [showAllComments, setShowAllComments] = useState(false);
    const [reactionStats, setReactionStats] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState("");

    // Load comments from backend
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!movieId) return;
            try {
                const result = await api.getComments(movieId);
                if (!cancelled) setComments(result.data || []);
            } catch (err) {
                console.error("Comment fetch error:", err);
                if (!cancelled) setComments([]);
            }

            if (!cancelled) {
                setNewComment("");
            }
        })();

        return () => { cancelled = true; };
    }, [movieId]);

    useEffect(() => {
        setNewRating(myRatings[String(movieId)] || 0);
    }, [movieId, myRatings]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await api.getMovieReaction(movieId);
                if (!cancelled) setReactionStats(result.data);
            } catch (err) {
                console.error("Reaction fetch error:", err);
            }
        })();

        return () => { cancelled = true; };
    }, [movieId]);

    useEffect(() => {
        if (currentUser && movie) {
            addHistory(movie);
        }
    }, [currentUser, movie, addHistory]);

    const requireLogin = (message) => {
        if (currentUser) return true;
        alert(message);
        onGoAuth();
        return false;
    };

    const handleRatingClick = async (star) => {
        if (!requireLogin("Vui lòng đăng nhập để rating phim.")) return;
        setNewRating(star);
        try {
            await saveRating(movieId, star);
        } catch (err) {
            alert(err.message || "Không thể lưu rating.");
        }
    };

    const handleWatchClick = async () => {
        if (movie) {
            await addHistory(movie);
        }
    };

    const handleMovieReaction = async (reaction) => {
        if (!requireLogin("Vui lòng đăng nhập để like/dislike phim.")) return;
        try {
            const data = await setMovieReaction(movie, reaction);
            if (data) setReactionStats(data);
        } catch (err) {
            alert(err.message || "Không thể lưu reaction.");
        }
    };

    const replaceComment = (updatedComment) => {
        setComments((prev) => prev.map((comment) => comment._id === updatedComment._id ? updatedComment : comment));
    };

    const handleCommentLike = async (commentId) => {
        if (!requireLogin("Vui lòng đăng nhập để like comment.")) return;
        try {
            const result = await api.toggleCommentLike(commentId);
            replaceComment(result.data);
        } catch (err) {
            alert(err.message || "Không thể like comment.");
        }
    };

    const handleReplySubmit = async (commentId) => {
        if (!requireLogin("Vui lòng đăng nhập để reply comment.")) return;
        if (!replyText.trim()) return;

        try {
            const result = await api.addReply(commentId, replyText);
            replaceComment(result.data);
            setReplyText("");
            setReplyingTo(null);
        } catch (err) {
            alert(err.message || "Không thể gửi reply.");
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!requireLogin("Vui lòng đăng nhập để bình luận phim.")) return;
        if (!newComment.trim() || newRating === 0) return;

        try {
            await saveRating(movieId, newRating);
            const savedComment = await addComment(movieId, newComment, newRating, movie);
            if (savedComment) {
                setComments((prev) => [savedComment, ...prev]);
                setNewComment("");
            }
        } catch (err) {
            alert(err.message || "Không thể gửi bình luận.");
        }
    };

    // Fetch movie detail
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const data = await fetchMovieDetail(movieId);
                if (cancelled) return;
                setMovie(data);

                // Set all genres as active by default
                const genreIds = (data.genreDetails || []).map((g) => g.id);
                setActiveGenres(genreIds);

                // Map recommendations
                const recs = (data.recommendations || [])
                    .map((m) => mapMovieFromList(m, genreMap))
                    .filter((m) => m.thumb)
                    .slice(0, 6);
                setRelated(recs);

                // Fetch same-genre movies using all genre IDs
                if (genreIds.length > 0) {
                    const genreData = await fetchByGenre(genreIds.join(","));
                    if (!cancelled) {
                        const genreMovies = (genreData.results || [])
                            .filter((m) => m.id !== movieId)
                            .map((m) => mapMovieFromList(m, genreMap))
                            .filter((m) => m.thumb)
                            .filter((m) => !recs.find((r) => r.id === m.id))
                            .slice(0, 12);
                        setSameGenre(genreMovies);
                    }
                }
            } catch (err) {
                console.error("Detail fetch error:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [movieId, fetchMovieDetail, genreMap]);

    // Scroll to top when movieId changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [movieId]);

    // Re-fetch when active genres change (user toggles)
    const handleGenreToggle = useCallback(async (genreId) => {
        if (!movie) return;
        const newActive = activeGenres.includes(genreId)
            ? activeGenres.filter((id) => id !== genreId)
            : [...activeGenres, genreId];

        // Must keep at least one genre
        if (newActive.length === 0) return;
        setActiveGenres(newActive);

        setGenreLoading(true);
        try {
            const genreData = await fetchByGenre(newActive.join(","));
            const genreMovies = (genreData.results || [])
                .filter((m) => m.id !== movieId)
                .map((m) => mapMovieFromList(m, genreMap))
                .filter((m) => m.thumb)
                .filter((m) => !related.find((r) => r.id === m.id))
                .slice(0, 12);
            setSameGenre(genreMovies);
        } catch (err) {
            console.error(err);
        } finally {
            setGenreLoading(false);
        }
    }, [movie, activeGenres, movieId, genreMap, related]);

    if (loading) {
        return (
            <div className="container browsePage" style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Đang tải thông tin phim...</div>
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="container browsePage">
                <p>Không tìm thấy phim.</p>
                <button className="btnGhost" onClick={onGoBack}>← Quay lại</button>
            </div>
        );
    }

    const inWishlist = isInWishlist(movie.id);

    return (
        <div className="detailPage">
            {/* Backdrop */}
            <div
                className="detailBackdrop"
                style={{ backgroundImage: `url(${movie.backdrop || movie.thumb})` }}
            >
                <div className="detailBackdrop__overlay" />
            </div>

            <div className="container detailContent">
                <button className="backBtn" onClick={onGoBack}>← Quay lại</button>

                <div className="detailHero">
                    <div className="detailPoster">
                        {movie.thumb && <img src={movie.thumb} alt={movie.title} />}
                    </div>

                    <div className="detailInfo">
                        <div className="detailInfo__genres">
                            {(movie.genres || []).map((g) => (
                                <span key={g} className="heroBadge">{g}</span>
                            ))}
                        </div>

                        <h1 className="detailInfo__title">{movie.title}</h1>
                        <div className="detailInfo__original">{movie.originalTitle}</div>
                        {movie.tagline && (
                            <div style={{ color: "rgba(232,232,234,0.5)", fontStyle: "italic", marginBottom: 12 }}>
                                "{movie.tagline}"
                            </div>
                        )}

                        <div className="detailInfo__meta">
                            <span className="chip chip--imdb">⭐ {movie.rating}/10</span>
                            <span className="chip">{movie.year}</span>
                            {movie.duration && <span className="chip">{movie.duration}</span>}
                        </div>

                        <p className="detailInfo__desc">{movie.desc}</p>

                        <div className="detailInfo__actions">
                            <button className="btnPrimary btnPrimary--lg" onClick={handleWatchClick}>▶ Xem ngay</button>
                            {movie.trailerKey && (
                                <button
                                    className="btnPrimary btnPrimary--lg btnTrailer"
                                    style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
                                    onClick={() => setIsTrailerOpen(true)}
                                >
                                    Trailer
                                </button>
                            )}
                            <button
                                className={`btnGhost btnGhost--lg ${inWishlist ? "is-wishlisted" : ""}`}
                                onClick={() => {
                                    if (!currentUser) {
                                        alert("Vui lòng đăng nhập để yêu thích phim.");
                                        onGoAuth();
                                    } else {
                                        toggleWishlist(movie);
                                    }
                                }}
                            >
                                {inWishlist ? "❤ Đã yêu thích" : "🤍 Yêu thích"}
                            </button>
                            <button className="btnGhost btnGhost--lg">📤 Chia sẻ</button>
                        </div>

                        <div className="detailInfo__actions" style={{ marginTop: 14 }}>
                            <button
                                className={`btnGhost ${myReactions[String(movie.id)] === "like" ? "is-wishlisted" : ""}`}
                                onClick={() => handleMovieReaction("like")}
                            >
                                👍 Thích {reactionStats?.likePercent || 0}%
                            </button>
                            <button
                                className={`btnGhost ${myReactions[String(movie.id)] === "dislike" ? "is-wishlisted" : ""}`}
                                onClick={() => handleMovieReaction("dislike")}
                            >
                                👎 Không thích {reactionStats?.dislikePercent || 0}%
                            </button>
                            <span className="muted">{reactionStats?.total || 0} lượt đánh giá</span>
                        </div>
                    </div>
                </div>

                <TrailerModal
                    trailerKey={movie.trailerKey}
                    isOpen={isTrailerOpen}
                    onClose={() => setIsTrailerOpen(false)}
                />

                {/* ─── Cast Section ─────────────────────────── */}
                {movie.castFull && movie.castFull.length > 0 && (
                    <section className="section">
                        <div className="section__title">Dàn diễn viên</div>
                        <div className="castGrid">
                            {movie.castFull.map((actor) => (
                                <button
                                    key={actor.id}
                                    className="castCard"
                                    onClick={() => onGoPerson(actor.id)}
                                    title={`Xem thông tin ${actor.name}`}
                                >
                                    <div className="castCard__photo">
                                        {actor.photo
                                            ? <img src={actor.photo} alt={actor.name} loading="lazy" />
                                            : <div className="castCard__placeholder">👤</div>
                                        }
                                    </div>
                                    <div className="castCard__info">
                                        <div className="castCard__name">{actor.name}</div>
                                        {actor.character && (
                                            <div className="castCard__char">{actor.character}</div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── Comments & Rating ─────────────────────── */}
                <section className="section commentsSection">
                    <div className="section__title">Đánh giá & Bình luận</div>
                    
                    <form className="commentsForm" onSubmit={handleCommentSubmit}>
                        <div className="ratingSelect">
                            <span className="ratingSelect__label">Đánh giá của bạn:</span>
                            <div className="ratingSelect__stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                        key={star}
                                        className={`starIcon ${(hoverRating || newRating) >= star ? "is-active" : ""}`}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => handleRatingClick(star)}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                        </div>
                        <textarea
                            className="commentInput"
                            placeholder="Viết bình luận của bạn về bộ phim này..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            className="btnPrimary"
                            disabled={!newComment.trim() || newRating === 0}
                            style={{ opacity: (!newComment.trim() || newRating === 0) ? 0.5 : 1 }}
                        >
                            Gửi đánh giá
                        </button>
                    </form>

                    <div className="commentList">
                        {comments.length === 0 ? (
                            <div style={{ color: "rgba(232,232,234,0.5)", textAlign: "center", padding: "20px" }}>
                                Chưa có bình luận nào. Hãy là người đầu tiên đánh giá!
                            </div>
                        ) : (
                            <>
                                {(showAllComments ? comments : comments.slice(0, 3)).map((comment) => {
                                    const username = comment.userId?.username || comment.user || "User";
                                    return (
                                    <div key={comment._id || comment.id} className="commentItem">
                                        <div className="commentItem__header">
                                            <div className="commentItem__user">
                                                <div className="commentItem__avatar">
                                                    {username.charAt(0)}
                                                </div>
                                                <span>{username}</span>
                                            </div>
                                            <div className="commentItem__date">{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : comment.date}</div>
                                        </div>
                                        <div className="commentItem__rating">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <span key={i} style={{ color: i < comment.rating ? "#ffd658" : "rgba(255,255,255,0.2)" }}>
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                        <div className="commentItem__text" style={{ marginTop: "12px" }}>{comment.content || comment.text}</div>
                                        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                                            <button className="linkBtn" onClick={() => handleCommentLike(comment._id)}>
                                                {comment.isLiked ? "Bỏ thích" : "Thích"} ({comment.likeCount || 0})
                                            </button>
                                            <button
                                                className="linkBtn"
                                                onClick={() => {
                                                    setReplyingTo(replyingTo === comment._id ? null : comment._id);
                                                    setReplyText("");
                                                }}
                                            >
                                                Trả lời ({comment.replyCount || 0})
                                            </button>
                                        </div>
                                        {(comment.replies || []).length > 0 && (
                                            <div className="commentList" style={{ marginTop: 12, paddingLeft: 24 }}>
                                                {comment.replies.map((reply) => {
                                                    const replyUser = reply.userId?.username || "User";
                                                    return (
                                                        <div key={reply._id} className="commentItem" style={{ padding: 12 }}>
                                                            <div className="commentItem__user">
                                                                <div className="commentItem__avatar">{replyUser.charAt(0)}</div>
                                                                <span>{replyUser}</span>
                                                            </div>
                                                            <div className="commentItem__text" style={{ marginTop: 8 }}>{reply.content}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {replyingTo === comment._id && (
                                            <div style={{ marginTop: 12 }}>
                                                <textarea
                                                    className="commentInput"
                                                    placeholder="Viết phản hồi..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    style={{ minHeight: 70 }}
                                                />
                                                <button className="btnPrimary" onClick={() => handleReplySubmit(comment._id)}>Gửi phản hồi</button>
                                            </div>
                                        )}
                                    </div>
                                )})}
                                {comments.length > 3 && (
                                    <button
                                        className="btnGhost"
                                        style={{ width: "100%", marginTop: "8px" }}
                                        onClick={() => setShowAllComments(!showAllComments)}
                                    >
                                        {showAllComments ? "Thu gọn" : `Xem thêm ${comments.length - 3} bình luận`}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* ─── Recommended Movies ──────────────────── */}
                {related.length > 0 && (
                    <section className="section">
                        <div className="section__title">Phim tương tự</div>
                        <div className="movieGrid">
                            {related.map((m) => (
                                <MovieCard
                                    key={m.id}
                                    movie={m}
                                    onGoMovie={onGoMovie}
                                    isInWishlist={isInWishlist(m.id)}
                                    onToggleWishlist={() => {
                                        if (!currentUser) {
                                            alert("Vui lòng đăng nhập để yêu thích phim.");
                                            onGoAuth();
                                        }
                                        else toggleWishlist(m);
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── Same Genre with Toggles ─────────────── */}
                {movie.genreDetails && movie.genreDetails.length > 0 && (
                    <section className="section">
                        <div className="section__title">Cùng thể loại</div>
                        <div className="genreToggleRow">
                            {movie.genreDetails.map((g) => (
                                <button
                                    key={g.id}
                                    className={`genreToggle ${activeGenres.includes(g.id) ? "is-active" : ""}`}
                                    onClick={() => handleGenreToggle(g.id)}
                                >
                                    {g.name}
                                    {activeGenres.includes(g.id) && <span className="genreToggle__x">✕</span>}
                                </button>
                            ))}
                        </div>
                        {genreLoading ? (
                            <div style={{ padding: "30px", textAlign: "center", color: "rgba(232,232,234,0.5)" }}>Đang tải...</div>
                        ) : sameGenre.length > 0 ? (
                            <div className="movieGrid">
                                {sameGenre.map((m) => (
                                    <MovieCard
                                        key={m.id}
                                        movie={m}
                                        onGoMovie={onGoMovie}
                                        isInWishlist={isInWishlist(m.id)}
                                        onToggleWishlist={() => {
                                            if (!currentUser) {
                                                alert("Vui lòng đăng nhập để yêu thích phim.");
                                                onGoAuth();
                                            }
                                            else toggleWishlist(m);
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: "30px", textAlign: "center", color: "rgba(232,232,234,0.5)" }}>Không tìm thấy phim cho thể loại đã chọn</div>
                        )}
                    </section>
                )}

            </div>
        </div>
    );
}
