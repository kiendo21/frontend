const TOKEN_KEY = "moviehub_token";
const USER_KEY = "moviehub_user";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
}

export function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)));
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function normalizeUser(user) {
    if (!user) return null;
    return {
        id: user.id || user._id,
        username: user.username || user.name || "",
        name: user.name || user.username || "",
        email: user.email || "",
        role: user.role || "user",
        status: user.status || "active",
    };
}

export function movieSummary(movie) {
    return {
        id: movie.id,
        title: movie.title,
        originalTitle: movie.originalTitle || "",
        year: movie.year || "",
        rating: movie.rating || 0,
        duration: movie.duration || "",
        genres: movie.genres || [],
        genreIds: movie.genreIds || [],
        desc: movie.desc || "",
        thumb: movie.thumb || "",
        backdrop: movie.backdrop || "",
        popularity: movie.popularity || 0,
        voteCount: movie.voteCount || 0,
        mediaType: movie.mediaType || "movie",
    };
}

async function apiRequest(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };
    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "API request failed");
    }
    return data;
}

export const api = {
    register: (payload) => apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
    }),
    login: (payload) => apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    }),
    me: () => apiRequest("/api/auth/me"),

    getWishlist: () => apiRequest("/api/wishlist"),
    addWishlist: (movie) => apiRequest("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ movieId: String(movie.id), movieData: movieSummary(movie) }),
    }),
    removeWishlist: (movieId) => apiRequest(`/api/wishlist/${movieId}`, {
        method: "DELETE",
    }),

    getHistory: () => apiRequest("/api/history"),
    addHistory: (movie) => apiRequest("/api/history", {
        method: "POST",
        body: JSON.stringify({
            movieId: String(movie.id),
            title: movie.title,
            poster: movie.thumb,
            releaseDate: movie.year,
        }),
    }),

    getComments: (movieId) => apiRequest(`/api/comments/${movieId}`),
    getMyComments: () => apiRequest("/api/comments/user/me"),
    addComment: (movieId, content, rating, movie) => apiRequest(`/api/comments/${movieId}`, {
        method: "POST",
        body: JSON.stringify({
            content,
            rating,
            title: movie?.title,
            poster: movie?.thumb,
            releaseDate: movie?.year,
        }),
    }),
    addReply: (commentId, content) => apiRequest(`/api/comments/${commentId}/replies`, {
        method: "POST",
        body: JSON.stringify({ content }),
    }),
    toggleCommentLike: (commentId) => apiRequest(`/api/comments/${commentId}/like`, {
        method: "POST",
    }),

    getMyRatings: () => apiRequest("/api/ratings/user/me"),
    saveRating: (movieId, rating) => apiRequest(`/api/ratings/${movieId}`, {
        method: "POST",
        body: JSON.stringify({ rating }),
    }),

    getMyReactions: () => apiRequest("/api/reactions/user/me"),
    getMovieReaction: (movieId) => apiRequest(`/api/reactions/${movieId}`),
    setMovieReaction: (movie, reaction) => apiRequest(`/api/reactions/${movie.id}`, {
        method: "POST",
        body: JSON.stringify({
            reaction,
            title: movie.title,
            poster: movie.thumb,
            releaseDate: movie.year,
        }),
    }),
    clearMovieReaction: (movieId) => apiRequest(`/api/reactions/${movieId}`, {
        method: "DELETE",
    }),

    getAdminUsers: () => apiRequest("/api/admin/users"),
    setAdminUserStatus: (userId, status) => apiRequest(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    }),
    setAdminCommentBan: (userId, duration) => apiRequest(`/api/admin/users/${userId}/comment-ban`, {
        method: "PATCH",
        body: JSON.stringify({ duration }),
    }),
    getAdminComments: () => apiRequest("/api/admin/comments"),
    deleteAdminComment: (commentId) => apiRequest(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
    }),
    getAdminStats: () => apiRequest("/api/admin/stats"),
};
