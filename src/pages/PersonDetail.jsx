import { useState, useEffect } from "react";
import { fetchPersonDetail, fetchPersonMovies, mapMovieFromList } from "../tmdb.js";
import { useApp } from "../context.jsx";
import MovieCard from "../components/MovieCard.jsx";

export default function PersonDetail({ personId, onGoBack, onGoMovie, onGoAuth }) {
    const { genreMap, isInWishlist, toggleWishlist, currentUser } = useApp();
    const [person, setPerson] = useState(null);
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const [detail, movieRaw] = await Promise.all([
                    fetchPersonDetail(personId),
                    fetchPersonMovies(personId),
                ]);
                if (cancelled) return;
                setPerson(detail);
                setMovies(
                    movieRaw
                        .map((m) => mapMovieFromList(m, genreMap))
                        .filter((m) => m.thumb)
                        .slice(0, 20)
                );
            } catch (err) {
                console.error("Person detail fetch error:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [personId, genreMap]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [personId]);

    if (loading) {
        return (
            <div className="container page" style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Đang tải thông tin diễn viên...</div>
            </div>
        );
    }

    if (!person) {
        return (
            <div className="container page">
                <p>Không tìm thấy thông tin diễn viên.</p>
                <button className="btnGhost" onClick={onGoBack}>
                    ← Quay lại
                </button>
            </div>
        );
    }

    return (
        <div className="personPage">
            <div className="container">
                <button className="backBtn" onClick={onGoBack}>
                    ← Quay lại
                </button>

                <div className="personHero">
                    <div className="personPhoto">
                        {person.photo ? (
                            <img src={person.photo} alt={person.name} />
                        ) : (
                            <div className="personPhoto__placeholder">👤</div>
                        )}
                    </div>

                    <div className="personInfo">
                        <h1 className="personInfo__name">{person.name}</h1>
                        <div className="personInfo__meta">
                            {person.knownFor && <span className="chip">{person.knownFor}</span>}
                            {person.birthday && <span className="chip">🎂 {person.birthday}</span>}
                            {person.placeOfBirth && <span className="chip">📍 {person.placeOfBirth}</span>}
                            {person.deathday && <span className="chip">✝ {person.deathday}</span>}
                        </div>

                        {person.biography && (
                            <div className="personBio">
                                <h2 className="personBio__title">Tiểu sử</h2>
                                <p className="personBio__text">{person.biography}</p>
                            </div>
                        )}
                    </div>
                </div>

                {movies.length > 0 && (
                    <section className="section">
                        <div className="sectionHeader">
                            <div className="section__title">Phim đã tham gia</div>
                            <div className="muted">{movies.length} phim nổi bật</div>
                        </div>
                        <div className="movieGrid">
                            {movies.map((m) => (
                                <MovieCard
                                    key={m.id}
                                    movie={m}
                                    onGoMovie={onGoMovie}
                                    isInWishlist={isInWishlist(m.id)}
                                    onToggleWishlist={() => {
                  if (!currentUser) onGoAuth();
                  else toggleWishlist(m);
                }}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
