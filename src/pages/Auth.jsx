import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context.jsx";
import Wishlist from "./Wishlist.jsx";
import Admin from "./Admin.jsx";

export default function Auth({ onGoMovie }) {
  const { currentUser, login, register, logout, myComments, history, fetchMovieDetail } = useApp();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [commentTitles, setCommentTitles] = useState({});

  const commentsMissingTitle = useMemo(() => {
    const seen = new Set();
    return myComments
      .filter((comment) => !comment.title && comment.movieId && !commentTitles[comment.movieId])
      .filter((comment) => {
        if (seen.has(comment.movieId)) return false;
        seen.add(comment.movieId);
        return true;
      });
  }, [myComments, commentTitles]);

  useEffect(() => {
    if (commentsMissingTitle.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        commentsMissingTitle.map(async (comment) => {
          try {
            const movie = await fetchMovieDetail(comment.movieId);
            return [comment.movieId, movie.title];
          } catch {
            return [comment.movieId, `Phim ID: ${comment.movieId}`];
          }
        })
      );

      if (!cancelled) {
        queueMicrotask(() => {
          setCommentTitles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
        });
      }
    })();

    return () => { cancelled = true; };
  }, [commentsMissingTitle, fetchMovieDetail]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (mode === "register" && !form.name) {
      setError("Vui lòng nhập họ tên.");
      return;
    }
    if (form.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
        setSuccess("Đăng nhập thành công! Chào mừng trở lại 🎉");
      } else {
        await register({ name: form.name, email: form.email, password: form.password });
        setSuccess("Đăng ký thành công! Chào mừng đến với MovieHub 🎬");
      }
    } catch (err) {
      setError(err.message || "Không thể đăng nhập. Vui lòng thử lại.");
    }
  };

  const handleLogout = () => {
    logout();
    setForm({ name: "", email: "", password: "" });
    setSuccess("");
    setError("");
  };

  if (currentUser) {
    if (currentUser.role === "admin") {
      return (
        <div className="profilePage">
          <div className="profileHeader">
            <div className="profileHeader__avatar">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="profileHeader__info">
              <h1 className="profileHeader__name">{currentUser.name}</h1>
              <p className="profileHeader__email">{currentUser.email}</p>
            </div>
            <button className="btnGhost" onClick={handleLogout} style={{ marginLeft: "auto" }}>
              Đăng xuất
            </button>
          </div>
          <Admin />
        </div>
      );
    }

    return (
      <div className="profilePage">
        <div className="profileHeader">
          <div className="profileHeader__avatar">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="profileHeader__info">
            <h1 className="profileHeader__name">{currentUser.name}</h1>
            <p className="profileHeader__email">{currentUser.email}</p>
          </div>
          <button className="btnGhost" onClick={handleLogout} style={{ marginLeft: "auto" }}>
            Đăng xuất
          </button>
        </div>

        <div className="profileContent" style={{ display: "flex", flexDirection: "column", gap: "60px", padding: "40px" }}>
          
          {/* Phim yêu thích */}
          <div style={{ margin: "0 -40px" }}>
            <Wishlist onGoMovie={onGoMovie} />
          </div>

          {/* Bình luận */}
          <div className="profileCard">
            <h2 className="profileCard__title">Lịch sử bình luận</h2>
              <div className="profileCard__body">
                {myComments.length === 0 ? (
                  <div className="emptyState" style={{ padding: "40px 0" }}>
                    <div className="emptyState__icon">💬</div>
                    <div className="emptyState__title">Chưa có bình luận nào</div>
                    <p className="emptyState__desc">Bạn chưa để lại đánh giá nào cho các bộ phim.</p>
                  </div>
                ) : (
                  <div className="commentList">
                    {myComments.map(comment => (
                      <div key={comment._id} className="commentItem" style={{ background: "rgba(255,255,255,0.02)", marginBottom: 16 }}>
                        <div className="commentItem__header">
                          <div style={{ fontWeight: "bold", cursor: "pointer", color: "#e50914" }} onClick={() => onGoMovie(comment.movieId)}>
                            {comment.title || commentTitles[comment.movieId] || `Phim ID: ${comment.movieId}`}
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 8 }}>(Nhấn để xem phim)</span>
                          </div>
                          <div className="commentItem__date">{new Date(comment.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="commentItem__rating" style={{ marginBottom: 8 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ color: i < comment.rating ? "#ffd658" : "rgba(255,255,255,0.2)" }}>★</span>
                          ))}
                        </div>
                        <div className="commentItem__text">{comment.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          {/* Lịch sử xem */}
          <div className="profileCard">
            <h2 className="profileCard__title">Lịch sử xem phim</h2>
            <div className="profileCard__body">
              {history.length === 0 ? (
                <div className="emptyState" style={{ padding: "40px 0" }}>
                  <div className="emptyState__icon">🕘</div>
                  <div className="emptyState__title">Chưa có lịch sử xem</div>
                  <p className="emptyState__desc">Các phim bạn mở chi tiết hoặc bấm xem sẽ xuất hiện ở đây.</p>
                </div>
              ) : (
                <div className="chartList">
                  {history.map((item) => (
                    <div key={item._id || item.movieId} className="chartItem" onClick={() => onGoMovie(item.movieId)}>
                      {item.poster && <img src={item.poster} alt="" className="chartItem__thumb" />}
                      <span className="chartItem__name">{item.title || `Phim ID: ${item.movieId}`}</span>
                      <span className="commentItem__date" style={{ marginLeft: "auto" }}>
                        {new Date(item.watchedAt || item.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="authPage">
      <div className="authCard">
        {/* Tab switcher */}
        <div className="authTabs">
          <button
            className={`authTab ${mode === "login" ? "is-active" : ""}`}
            onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
          >
            Đăng nhập
          </button>
          <button
            className={`authTab ${mode === "register" ? "is-active" : ""}`}
            onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
          >
            Đăng ký
          </button>
        </div>

        <div className="authCard__body">
          <div className="authCard__icon">🎬</div>
          <h2 className="authCard__title">
            {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
          </h2>
          <p className="authCard__subtitle">
            {mode === "login"
              ? "Đăng nhập để lưu phim yêu thích và xem lịch sử"
              : "Đăng ký miễn phí, không cần thẻ tín dụng"}
          </p>

          <form className="authForm" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="formGroup">
                <label className="formLabel">Họ và tên</label>
                <input
                  className="formInput"
                  type="text"
                  name="name"
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="formGroup">
              <label className="formLabel">Email</label>
              <input
                className="formInput"
                type="email"
                name="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="formGroup">
              <label className="formLabel">Mật khẩu</label>
              <input
                className="formInput"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            {error && <div className="formError">⚠ {error}</div>}
            {success && <div className="formSuccess">✅ {success}</div>}

            <button className="btnPrimary btnPrimary--full" type="submit">
              {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
            </button>
          </form>

          {mode === "login" && (
            <p className="authCard__footer">
              Chưa có tài khoản?{" "}
              <button className="linkBtn" onClick={() => setMode("register")}>
                Đăng ký ngay
              </button>
            </p>
          )}
          {mode === "register" && (
            <p className="authCard__footer">
              Đã có tài khoản?{" "}
              <button className="linkBtn" onClick={() => setMode("login")}>
                Đăng nhập
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
