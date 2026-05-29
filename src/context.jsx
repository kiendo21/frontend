/* eslint-disable react-refresh/only-export-components */
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
} from "./tmdb.js";
import { api, clearSession, getStoredUser, getToken, normalizeUser, saveSession } from "./api.js";

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
  const [history, setHistory] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [myRatings, setMyRatings] = useState({});
  const [myReactions, setMyReactions] = useState({});
  const [currentUser, setCurrentUserState] = useState(() => getStoredUser());

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

  // ─── user data from backend ───────────────────────────
  const loadUserData = useCallback(async () => {
    if (!getToken()) return;

    const [wishlistData, historyData, commentsData, ratingsData, reactionsData] = await Promise.all([
      api.getWishlist(),
      api.getHistory(),
      api.getMyComments(),
      api.getMyRatings(),
      api.getMyReactions(),
    ]);

    setWishlist((wishlistData.data || []).map((item) => item.movieData));
    setHistory(historyData.data || []);
    setMyComments(commentsData.data || []);

    const ratingMap = {};
    (ratingsData.data || []).forEach((item) => {
      ratingMap[item.movieId] = item.rating;
    });
    setMyRatings(ratingMap);

    const reactionMap = {};
    (reactionsData.data || []).forEach((item) => {
      reactionMap[item.movieId] = item.reaction;
    });
    setMyReactions(reactionMap);
  }, []);

  useEffect(() => {
    if (!getToken()) return;

    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        const user = normalizeUser(me.data);
        setCurrentUserState(user);
        localStorage.setItem("moviehub_user", JSON.stringify(user));
        await loadUserData();
      } catch (err) {
        console.error("Session restore error:", err);
        clearSession();
        setCurrentUserState(null);
        setWishlist([]);
        setHistory([]);
        setMyComments([]);
        setMyRatings({});
        setMyReactions({});
      }
    })();

    return () => { cancelled = true; };
  }, [loadUserData]);

  const login = useCallback(async ({ email, password }) => {
    const result = await api.login({ email, password });
    const user = normalizeUser(result.user);
    saveSession(result.token, user);
    setCurrentUserState(user);
    await loadUserData();
    return user;
  }, [loadUserData]);

  const register = useCallback(async ({ name, email, password }) => {
    await api.register({ username: name, email, password });
    return login({ email, password });
  }, [login]);

  const logout = useCallback(() => {
    clearSession();
    setCurrentUserState(null);
    setWishlist([]);
    setHistory([]);
    setMyComments([]);
    setMyRatings({});
    setMyReactions({});
  }, []);

  const setCurrentUser = useCallback((user) => {
    if (!user) {
      logout();
      return;
    }
    const normalized = normalizeUser(user);
    setCurrentUserState(normalized);
    localStorage.setItem("moviehub_user", JSON.stringify(normalized));
  }, [logout]);

  // ─── wishlist ─────────────────────────────────────────
  const toggleWishlist = useCallback(async (movie) => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập để yêu thích phim.");
      return false;
    }

    const movieId = String(movie.id);
    const exists = wishlist.find((m) => String(m.id) === movieId);

    if (exists) {
      await api.removeWishlist(movieId);
      setWishlist((prev) => prev.filter((m) => String(m.id) !== movieId));
      return false;
    }

    await api.addWishlist(movie);
    setWishlist((prev) => [...prev, movie]);
    return true;
  }, [currentUser, wishlist]);

  const isInWishlist = useCallback((movieId) => {
    return wishlist.some((m) => String(m.id) === String(movieId));
  }, [wishlist]);

  const addHistory = useCallback(async (movie) => {
    if (!currentUser || !movie?.id) return;

    try {
      const result = await api.addHistory(movie);
      setHistory((prev) => {
        const withoutCurrent = prev.filter((item) => item.movieId !== String(movie.id));
        return [result.data, ...withoutCurrent];
      });
    } catch (err) {
      console.error("History save error:", err);
    }
  }, [currentUser]);

  const addComment = useCallback(async (movieId, content, rating, movie) => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập để bình luận phim.");
      return null;
    }

    const result = await api.addComment(movieId, content, rating, movie);
    setMyComments((prev) => [result.data, ...prev]);
    return result.data;
  }, [currentUser]);

  const saveRating = useCallback(async (movieId, rating) => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập để rating phim.");
      return null;
    }

    const result = await api.saveRating(movieId, rating);
    setMyRatings((prev) => ({ ...prev, [String(movieId)]: result.data.rating }));
    return result.data;
  }, [currentUser]);

  const setMovieReaction = useCallback(async (movie, reaction) => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập để like/dislike phim.");
      return null;
    }

    const movieId = String(movie.id);
    const currentReaction = myReactions[movieId];
    const result = currentReaction === reaction
      ? await api.clearMovieReaction(movieId)
      : await api.setMovieReaction(movie, reaction);

    setMyReactions((prev) => {
      const next = { ...prev };
      if (currentReaction === reaction) delete next[movieId];
      else next[movieId] = reaction;
      return next;
    });

    return result.data;
  }, [currentUser, myReactions]);

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
      history,
      myComments,
      myRatings,
      myReactions,
      loadUserData,
      toggleWishlist,
      isInWishlist,
      addHistory,
      addComment,
      saveRating,
      setMovieReaction,
      // user
      currentUser,
      setCurrentUser,
      login,
      register,
      logout,
    }),
    [genreMap, genreList, trending, popular, loading, wishlist, history, myComments, myRatings, myReactions, loadUserData, currentUser, searchMovies, fetchByGenre, fetchMovieDetail, isInWishlist, toggleWishlist, addHistory, addComment, saveRating, setMovieReaction, setCurrentUser, login, register, logout]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
