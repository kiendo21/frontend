import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchGenres,
  fetchTrending,
  fetchTrendingDay,
  fetchTrendingWeek,
  fetchPopular,
  fetchMovieDetail as fetchDetail,
  fetchTVDetail,
  searchMovies as searchApi,
  fetchByGenre as discoverApi,
  mapMovieFromList,
  mapMovie,
} from "./tmdb.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ─── movie data ──────────────────────────────────────
  const [genreMap, setGenreMap] = useState({});       // id → name
  const [genreList, setGenreList] = useState([]);      // [{id, name}]
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── user data ────────────────────────────────────────
  const [wishlist, setWishlist] = useState([]);        // full movie objects
  const [currentUser, setCurrentUser] = useState(null);

  // ─── init: fetch genres + trending + popular ─────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [genres, trendRaw, popRaw] = await Promise.all([
          fetchGenres(),
          fetchTrending("all", "day"), // Mixed movie & tv for Hero/Hot
          fetchPopular(),
        ]);

        if (cancelled) return;

        // Build genre map: {28: "Phim Hành Động", ...}
        const gMap = {};
        genres.forEach((g) => (gMap[g.id] = g.name));
        setGenreMap(gMap);
        setGenreList(genres);

        setTrending(trendRaw.map((m) => mapMovieFromList(m, gMap)));
        setPopular(popRaw.results.map((m) => mapMovieFromList(m, gMap)));
      } catch (err) {
        console.error("TMDB init error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── search ───────────────────────────────────────────
  const searchMovies = useCallback(async (query, page = 1) => {
    const data = await searchApi(query, page);
    return {
      ...data,
      results: data.results.map((m) => mapMovieFromList(m, genreMap)),
    };
  }, [genreMap]);

  // ─── discover by genre ────────────────────────────────
  const fetchByGenre = useCallback(async (genreId, page = 1) => {
    const data = await discoverApi(genreId, page);
    return {
      ...data,
      results: data.results.map((m) => mapMovieFromList(m, genreMap)),
    };
  }, [genreMap]);

  // ─── movie detail ─────────────────────────────────────
  const fetchMovieDetail = useCallback(async (id, type = "movie") => {
    if (type === "tv") return fetchTVDetail(id);
    return fetchDetail(id);
  }, []);

  // ─── wishlist ─────────────────────────────────────────
  const toggleWishlist = useCallback((movie) => {
    setWishlist((prev) => {
      const exists = prev.find((m) => m.id === movie.id);
      if (exists) return prev.filter((m) => m.id !== movie.id);
      return [...prev, movie];
    });
  }, []);

  const isInWishlist = useCallback((movieId) => {
    return wishlist.some((m) => m.id === movieId);
  }, [wishlist]);

  // ─── context value ────────────────────────────────────
  const value = useMemo(
    () => ({
      // data
      genreMap,
      genreList,
      trending,
      popular,
      loading,
      // API functions
      searchMovies,
      fetchByGenre,
      fetchMovieDetail,
      fetchTrendingDay,
      fetchTrendingWeek,
      // wishlist
      wishlist,
      toggleWishlist,
      isInWishlist,
      // user
      currentUser,
      setCurrentUser,
    }),
    [genreMap, genreList, trending, popular, loading, wishlist, currentUser, searchMovies, fetchByGenre, fetchMovieDetail, fetchTrendingDay, fetchTrendingWeek, isInWishlist, toggleWishlist]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
