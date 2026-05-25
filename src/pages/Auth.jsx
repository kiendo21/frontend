import { useState, useEffect } from "react";
import { useApp } from "../context.jsx";
import Wishlist from "./Wishlist.jsx";

export default function Auth({ onGoMovie }) {
  const { currentUser, setCurrentUser } = useApp();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [myComments, setMyComments] = useState([]);

  // Fetch comments from local storage
  useEffect(() => {
    if (currentUser) {
      const userComments = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("comments_")) {
          const movieId = key.replace("comments_", "");
          const comments = JSON.parse(localStorage.getItem(key));
          const mine = comments.filter(c => c.user === currentUser.name);
          mine.forEach(c => {
            userComments.push({ ...c, movieId });
          });
        }
      }
      // Sort by date/id descending
      userComments.sort((a, b) => b.id - a.id);
      setMyComments(userComments);
    }
  }, [currentUser]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = (e) => {
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

    // Simulate auth
    if (mode === "login") {
      setCurrentUser({ name: form.email.split("@")[0], email: form.email });
      setSuccess("Đăng nhập thành công! Chào mừng trở lại 🎉");
    } else {
      setCurrentUser({ name: form.name, email: form.email });
      setSuccess("Đăng ký thành công! Chào mừng đến với MovieHub 🎬");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setForm({ name: "", email: "", password: "" });
    setSuccess("");
    setError("");
  };

  if (currentUser) {
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
                      <div key={comment.id} className="commentItem" style={{ background: "rgba(255,255,255,0.02)", marginBottom: 16 }}>
                        <div className="commentItem__header">
                          <div style={{ fontWeight: "bold", cursor: "pointer", color: "#e50914" }} onClick={() => onGoMovie(comment.movieId)}>
                            Phim ID: {comment.movieId} {/* We don't have movie title easily from localStorage, so show ID or "Click để xem phim" */}
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 8 }}>(Nhấn để xem phim)</span>
                          </div>
                          <div className="commentItem__date">{comment.date}</div>
                        </div>
                        <div className="commentItem__rating" style={{ marginBottom: 8 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ color: i < comment.rating ? "#ffd658" : "rgba(255,255,255,0.2)" }}>★</span>
                          ))}
                        </div>
                        <div className="commentItem__text">{comment.text}</div>
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