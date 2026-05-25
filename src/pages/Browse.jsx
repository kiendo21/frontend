import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context.jsx";
import MovieCard from "../components/MovieCard.jsx";
import { searchPerson, fetchPersonMovies, mapMovieFromList, IMG } from "../tmdb.js";

export default function Browse({ onGoMovie, onGoPerson, initialGenreId, onGenreConsumed, onGoAuth }) {
  const { popular, genreList, genreMap, toggleWishlist, isInWishlist, searchMovies, fetchByGenre, currentUser } = useApp();

  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [activeGenres, setActiveGenres] = useState([]); // Array of genre IDs
  const [sort, setSort] = useState("popularity");
  const [loading, setLoading] = useState(false);
  const [searchLabel, setSearchLabel] = useState("");
  const [matchedPersons, setMatchedPersons] = useState([]);
  const debounceRef = useRef(null);

  // Init with popular movies
  useEffect(() => {
    if (popular.length > 0 && movies.length === 0 && !search && activeGenres.length === 0) {
      setMovies(popular);
    }
  }, [popular]);

  // Handle genre navigation from chatbot
  useEffect(() => {
    if (initialGenreId && genreList.length > 0) {
      setActiveGenres([initialGenreId]);
      setSearch("");
      loadByGenre([initialGenreId]);
      if (onGenreConsumed) onGenreConsumed();
    }
  }, [initialGenreId, genreList]);

  // Search with debounce — search movies AND actors
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim()) {
      setSearchLabel("");
      setMatchedPersons([]);
      if (activeGenres.length === 0) {
        setMovies(popular);
      } else {
        loadByGenre(activeGenres);
      }
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchLabel("");
      try {
        // Search movies by title
        const movieData = await searchMovies(search);
        let results = movieData.results || [];

        // Also search by actor name
        const persons = await searchPerson(search);
        setMatchedPersons(persons.slice(0, 6)); // Show top 6 matched actors
        if (persons.length > 0) {
          // Get movies for the top matched actor
          const topPerson = persons[0];
          const personMoviesRaw = await fetchPersonMovies(topPerson.id);
          const personMovies = personMoviesRaw
            .map((m) => mapMovieFromList(m, genreMap))
            .filter((m) => m.thumb);

          // Merge: movie results first, then actor movies (deduplicate)
          const existingIds = new Set(results.map((m) => m.id));
          const extra = personMovies.filter((m) => !existingIds.has(m.id));
          results = [...results, ...extra];

          if (movieData.results.length === 0 && extra.length > 0) {
            setSearchLabel(`Phim có "${topPerson.name}"`);
          }
        }

        setMovies(results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Genre filter
  const loadByGenre = useCallback(async (genreIds) => {
    if (!genreIds || genreIds.length === 0) {
      setMovies(popular);
      return;
    }
    setLoading(true);
    try {
      // TMDB discover supports comma-separated genre IDs
      const data = await fetchByGenre(genreIds.join(","));
      setMovies(data.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [popular, fetchByGenre]);

  const handleGenreClick = (genreId) => {
    setSearch("");
    if (genreId === 0) {
      setActiveGenres([]);
      setMovies(popular);
      return;
    }

    const newGenres = activeGenres.includes(genreId)
      ? activeGenres.filter((id) => id !== genreId)
      : [...activeGenres, genreId];

    setActiveGenres(newGenres);
    loadByGenre(newGenres);
  };

  // Sort
  const sortedMovies = [...movies].sort((a, b) => {
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "year") return (b.year || 0) - (a.year || 0);
    if (sort === "title") return (a.title || "").localeCompare(b.title || "", "vi");
    return b.popularity - a.popularity; // default
  });

  return (
    <div className="browsePage">
      <div className="container">
        {/* Header */}
        <div className="browseHeader">
          <h1 className="browseTitle">Danh sách phim</h1>
          <p className="browseSubtitle">{sortedMovies.length} bộ phim</p>
        </div>

        {searchLabel && (
          <div className="searchLabel">
            <span className="searchLabel__text">{searchLabel}</span>
            <button className="searchLabel__clear" onClick={() => { setSearch(""); setSearchLabel(""); }}>✕</button>
          </div>
        )}

        {/* Search bar */}
        <div className="browseSearch">
          <span className="browseSearch__icon">⌕</span>
          <input
            className="browseSearch__input"
            type="text"
            placeholder="Tìm phim, diễn viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button className="browseSearch__clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        {/* Controls */}
        <div className="browseControls">
          {/* Genre filter */}
          <div className="genreFilter">
            <button
              className={`genreFilterBtn ${activeGenres.length === 0 ? "is-active" : ""}`}
              onClick={() => handleGenreClick(0)}
            >
              Tất Cả
            </button>
            {genreList.map((g) => {
              const isActive = activeGenres.includes(g.id);
              return (
                <button
                  key={g.id}
                  className={`genreFilterBtn ${isActive ? "is-active" : ""}`}
                  onClick={() => handleGenreClick(g.id)}
                >
                  {g.name}
                  {isActive && <span className="genreFilterBtn__x">✕</span>}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="sortControl">
            <label className="sortLabel">Sắp xếp:</label>
            <select
              className="sortSelect"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="popularity">Phổ biến nhất</option>
              <option value="rating">Điểm cao nhất</option>
              <option value="year">Mới nhất</option>
              <option value="title">Tên A-Z</option>
            </select>
          </div>
        </div>

        {/* Matched Actors */}
        {matchedPersons.length > 0 && search.trim() && (
          <div className="actorResults">
            <div className="actorResults__title">Diễn viên</div>
            <div className="actorResults__list">
              {matchedPersons.map((person) => (
                <div
                  key={person.id}
                  className="actorCard"
                  onClick={() => onGoPerson && onGoPerson(person.id)}
                >
                  <div className="actorCard__imgWrap">
                    {person.profile_path ? (
                      <img
                        src={`${IMG}/w185${person.profile_path}`}
                        alt={person.name}
                        className="actorCard__img"
                      />
                    ) : (
                      <div className="actorCard__placeholder">👤</div>
                    )}
                  </div>
                  <div className="actorCard__name">{person.name}</div>
                  <div className="actorCard__dept">{person.known_for_department || "Diễn viên"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="emptyState">
            <div className="emptyState__icon">⏳</div>
            <div className="emptyState__title">Đang tải phim...</div>
          </div>
        ) : sortedMovies.length > 0 ? (
          <div className="movieGrid movieGrid--browse">
            {sortedMovies.map((movie) => (
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
        ) : (
          <div className="emptyState">
            <div className="emptyState__icon">🎬</div>
            <div className="emptyState__title">Không tìm thấy phim</div>
            <p className="emptyState__desc">Thử tìm kiếm với từ khóa khác hoặc đổi thể loại</p>
            <button
              className="btnPrimary"
              onClick={() => { setSearch(""); handleGenreClick(0); }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </div>
  );
}