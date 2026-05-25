import { useState, useEffect } from "react";
import { useApp } from "../context.jsx";
import MovieCard from "../components/MovieCard.jsx";
import TrailerModal from "../components/TrailerModal.jsx";
import { mapMovieFromList } from "../tmdb.js";

export default function Home({ onGoBrowse, onGoMovie, onGoAuth }) {
  const {
    trending, popular, toggleWishlist, isInWishlist, loading: appLoading,
    fetchTrendingDay, fetchTrendingWeek, genreMap, fetchMovieDetail, currentUser
  } = useApp();

  const [activeHot, setActiveHot] = useState(0);
  const [hotMoviesDetailed, setHotMoviesDetailed] = useState([]);
  const [topMovies, setTopMovies] = useState([]);
  const [topTV, setTopTV] = useState([]);
  const [weeklyFavorites, setWeeklyFavorites] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  const hotMovies = hotMoviesDetailed.length > 0 ? hotMoviesDetailed : trending.slice(0, 5);
  const featuredMovies = popular.slice(0, 6);
  const heroData = hotMovies[activeHot] || hotMovies[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLocalLoading(true);
        // Fetch detailed data for hot movies to get trailers & durations
        const trendingSlice = trending.slice(0, 5);

        const [movDay, tvDay, weekTrend, hotDetails] = await Promise.all([
          fetchTrendingDay("movie"),
          fetchTrendingDay("tv"),
          fetchTrendingWeek("movie"),
          Promise.all(trendingSlice.map(m => fetchMovieDetail(m.id, m.mediaType)))
        ]);

        if (cancelled) return;

        setHotMoviesDetailed(hotDetails);
        setTopMovies((movDay.results || []).slice(0, 10).map(m => ({ ...mapMovieFromList(m, genreMap), mediaType: "movie" })));
        setTopTV((tvDay.results || []).slice(0, 10).map(m => ({ ...mapMovieFromList(m, genreMap), mediaType: "tv" })));
        setWeeklyFavorites((weekTrend.results || []).slice(0, 5).map(m => mapMovieFromList(m, genreMap)));
      } catch (err) {
        console.error("Home extra fetch error:", err);
      } finally {
        if (!cancelled) setLocalLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchTrendingDay, fetchTrendingWeek, genreMap, trending, fetchMovieDetail]);

  useEffect(() => {
    if (hotMovies.length === 0 || isTrailerOpen) return;

    const timer = setInterval(() => {
      setActiveHot((prev) => (prev + 1) % hotMovies.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [hotMovies.length, isTrailerOpen]);

  if (appLoading || !heroData) {
    return (
      <div className="home">
        <div className="container page" style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Đang tải dữ liệu phim...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div className="container hero__inner hero2">
          {/* Backdrop image behind text */}
          {heroData.backdrop && (
            <div className="hero__backdrop" style={{ backgroundImage: `url(${heroData.backdrop})` }} />
          )}
          {/* Left: hero content */}
          <div className="hero__content">
            <div className="hero__badges">
              {heroData.genres.slice(0, 2).map((g) => (
                <span key={g} className="heroBadge">{g}</span>
              ))}
            </div>
            <div className="hero__title">{heroData.title}</div>
            <div className="hero__subtitle">{heroData.originalTitle} ({heroData.year})</div>

            <div className="hero__meta">
              <span className="chip chip--imdb">⭐ {heroData.rating}</span>
              <span className="chip">{heroData.year}</span>
              {heroData.duration && <span className="chip">{heroData.duration}</span>}
            </div>

            <p className="hero__desc">{heroData.desc}</p>

            <div className="hero__actions">
              <button className="btnPrimary" onClick={() => onGoMovie(heroData.id)}>
                ▶ Xem ngay
              </button>
              {heroData.trailerKey && (
                <button
                  className="btnPrimary btnTrailer"
                  style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
                  onClick={() => setIsTrailerOpen(true)}
                >
                  Trailer
                </button>
              )}
              <button
                className={`btnGhost ${isInWishlist(heroData.id) ? "is-wishlisted" : ""}`}
                onClick={() => {
                  if (!currentUser) onGoAuth();
                  else toggleWishlist(heroData);
                }}
                title="Thêm vào yêu thích"
              >
                {isInWishlist(heroData.id) ? "❤" : "🤍"}
              </button>
              <button className="btnGhost" onClick={() => onGoMovie(heroData.id)}>
                ℹ
              </button>
            </div>
          </div>

          <TrailerModal
            trailerKey={heroData.trailerKey}
            isOpen={isTrailerOpen}
            onClose={() => setIsTrailerOpen(false)}
          />

          {/* Right: hot rail */}
          <div className="hotRail">
            <div className="hotRail__label">🔥 Đang hot</div>
            <div className="hotRail__thumbs">
              {hotMovies.map((m, idx) => (
                <button
                  key={m.id}
                  className={`hotThumb ${idx === activeHot ? "is-active" : ""}`}
                  onClick={() => setActiveHot(idx)}
                  title={`${m.title} (${m.year})`}
                >
                  {m.thumb && (
                    <img className="hotThumb__img" src={m.thumb} alt={m.title} loading="lazy" />
                  )}
                  <div className="hotThumb__title">{m.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED MOVIES (Moved up) */}
      <section className="container section">
        <div className="sectionHeader">
          <div className="section__title">Phim nổi bật</div>
          <button className="seeAllBtn" onClick={onGoBrowse}>Xem tất cả →</button>
        </div>
        <div className="movieGrid">
          {featuredMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onGoMovie={onGoMovie}
              isInWishlist={isInWishlist(movie.id)}
              onToggleWishlist={() => {
                if (!currentUser) onGoAuth();
                else toggleWishlist(movie);
              }}
            />
          ))}
        </div>
      </section>

      {/* TOP 10 MOVIES */}
      <section className="container section">
        <div className="sectionHeader">
          <div className="section__title">Top 10 phim lẻ trong ngày</div>
        </div>
        <div className="topTenSlider">
          <div className="topTenTrack">
            {/* Set 1 */}
            <div className="topTenSet">
              {topMovies.map((m, idx) => (
                <div key={m.id} className="topTenCard" onClick={() => onGoMovie(m.id, m.mediaType)}>
                  <div className="topTenCard__rank">{idx + 1}</div>
                  <div className="topTenCard__inner">
                    <img src={m.thumb} alt={m.title} className="topTenCard__img" />
                  </div>
                </div>
              ))}
            </div>
            {/* Set 2 (Duplicate for infinite scroll) */}
            <div className="topTenSet">
              {topMovies.map((m, idx) => (
                <div key={`dup-${m.id}`} className="topTenCard" onClick={() => onGoMovie(m.id, m.mediaType)}>
                  <div className="topTenCard__rank">{idx + 1}</div>
                  <div className="topTenCard__inner">
                    <img src={m.thumb} alt={m.title} className="topTenCard__img" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TOP 10 TV SHOWS */}
      <section className="container section">
        <div className="sectionHeader">
          <div className="section__title">Top 10 phim bộ trong ngày</div>
        </div>
        <div className="topTenSlider">
          <div className="topTenTrack">
            {/* Set 1 */}
            <div className="topTenSet">
              {topTV.map((m, idx) => (
                <div key={m.id} className="topTenCard" onClick={() => onGoMovie(m.id, m.mediaType)}>
                  <div className="topTenCard__rank">{idx + 1}</div>
                  <div className="topTenCard__inner">
                    <img src={m.thumb} alt={m.title} className="topTenCard__img" />
                  </div>
                </div>
              ))}
            </div>
            {/* Set 2 (Duplicate for infinite scroll) */}
            <div className="topTenSet">
              {topTV.map((m, idx) => (
                <div key={`dup-${m.id}`} className="topTenCard" onClick={() => onGoMovie(m.id, m.mediaType)}>
                  <div className="topTenCard__rank">{idx + 1}</div>
                  <div className="topTenCard__inner">
                    <img src={m.thumb} alt={m.title} className="topTenCard__img" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD CHART SECTION */}
      <section className="container section chartSection">
        <div className="chartCols chartCols--2">
          {/* Column 1: Sôi nổi nhất */}
          <div className="chartCol">
            <h3 className="chartCol__title">🎬 SÔI NỔI NHẤT</h3>
            <div className="chartList">
              {popular.slice(0, 5).map((m, idx) => (
                <div key={m.id} className="chartItem" onClick={() => onGoMovie(m.id)}>
                  <span className="chartItem__rank">{idx + 1}.</span>
                  <img src={m.thumb} alt="" className="chartItem__thumb" />
                  <span className="chartItem__name">{m.title}</span>
                </div>
              ))}
            </div>
            <button className="seeMoreBtn" onClick={onGoBrowse}>Xem thêm</button>
          </div>

          {/* Column 2: Yêu thích tuần */}
          <div className="chartCol">
            <h3 className="chartCol__title">❤ YÊU THÍCH TUẦN</h3>
            <div className="chartList">
              {weeklyFavorites.map((m, idx) => (
                <div key={m.id} className="chartItem" onClick={() => onGoMovie(m.id)}>
                  <span className="chartItem__rank">{idx + 1}.</span>
                  <img src={m.thumb} alt="" className="chartItem__thumb" />
                  <span className="chartItem__name">{m.title}</span>
                </div>
              ))}
            </div>
            <button className="seeMoreBtn" onClick={onGoBrowse}>Xem thêm</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer__brand">🎬 MOVIEHUB</div>
          <p className="footer__copy">© 2025 MovieHub. Dữ liệu phim từ TMDB.</p>
        </div>
      </footer>
    </div>
  );
}