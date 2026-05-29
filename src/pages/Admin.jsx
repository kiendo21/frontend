import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../context.jsx";

export default function Admin() {
    const { currentUser } = useApp();
    const [users, setUsers] = useState([]);
    const [comments, setComments] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [view, setView] = useState("dashboard");
    const [commentSearch, setCommentSearch] = useState("");
    const [banSelections, setBanSelections] = useState({});

    const loadAdminData = async () => {
        setLoading(true);
        setError("");
        try {
            const [usersData, commentsData, statsData] = await Promise.all([
                api.getAdminUsers(),
                api.getAdminComments(),
                api.getAdminStats(),
            ]);
            setUsers(usersData.data || []);
            setComments(commentsData.data || []);
            setStats(statsData.data || null);
        } catch (err) {
            setError(err.message || "Không thể tải dữ liệu admin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.role === "admin") {
            loadAdminData();
        }
    }, [currentUser]);

    const updateUserStatus = async (userId, status) => {
        try {
            const result = await api.setAdminUserStatus(userId, status);
            setUsers((prev) => prev.map((user) => user._id === userId ? result.data : user));
        } catch (err) {
            alert(err.message || "Không thể cập nhật tài khoản.");
        }
    };

    const deleteComment = async (commentId) => {
        try {
            await api.deleteAdminComment(commentId);
            setComments((prev) => prev.filter((comment) => comment._id !== commentId));
        } catch (err) {
            alert(err.message || "Không thể xoá bình luận.");
        }
    };

    const updateUserInState = (updatedUser) => {
        setUsers((prev) => prev.map((user) => user._id === updatedUser._id ? updatedUser : user));
        setComments((prev) => prev.map((comment) => (
            comment.userId?._id === updatedUser._id
                ? { ...comment, userId: { ...comment.userId, ...updatedUser } }
                : comment
        )));
    };

    const banCommentUser = async (userId) => {
        const duration = banSelections[userId] || "7d";
        try {
            const result = await api.setAdminCommentBan(userId, duration);
            updateUserInState(result.data);
        } catch (err) {
            alert(err.message || "Không thể ban user.");
        }
    };

    const showDashboardInsight = () => {
        setView("dashboard");
        setTimeout(() => {
            document.getElementById("admin-insight")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
    };

    const statCards = [
        { key: "users", label: "User", value: stats?.totals?.users || 0, action: () => setView("users") },
        { key: "views", label: "Lượt xem", value: stats?.totals?.views || 0, action: showDashboardInsight },
        { key: "wishlist", label: "Wishlist", value: stats?.totals?.wishlist || 0, action: showDashboardInsight },
        { key: "comments", label: "Bình luận", value: stats?.totals?.comments || 0, action: () => setView("comments") },
        { key: "reactions", label: "Reaction", value: stats?.totals?.reactions || 0, action: showDashboardInsight },
    ];

    const insightSections = [
        { key: "views", title: "Phim hot theo lượt xem", list: stats?.hotMovies?.byViews || [] },
        { key: "wishlist", title: "Phim hot theo wishlist", list: stats?.hotMovies?.byWishlist || [] },
        { key: "reactions", title: "Phim hot theo like", list: stats?.hotMovies?.byLikes || [] },
        { key: "comments", title: "Bình luận mới nhất", list: comments.slice(0, 5), type: "comments" },
    ];

    const filteredComments = comments.filter((comment) => {
        const query = commentSearch.trim().toLowerCase();
        if (!query) return true;
        return [
            comment.userId?.username,
            comment.userId?.email,
            comment.title,
            comment.content,
            comment.movieId,
        ].some((value) => String(value || "").toLowerCase().includes(query));
    });

    const banOptions = [
        ["7d", "7 ngày"],
        ["30d", "30 ngày"],
        ["180d", "6 tháng"],
        ["1y", "1 năm"],
        ["permanent", "Vĩnh viễn"],
        ["none", "Gỡ ban"],
    ];

    const renderUserList = (list) => (
        <div className="commentList">
            {list.map((user) => (
                <div key={user._id} className="commentItem">
                    <div className="commentItem__header">
                        <div>
                            <strong>{user.username}</strong>
                            <div className="muted">{user.email} · {user.role || "user"} · {user.status || "active"}</div>
                        </div>
                        {user.role !== "admin" && (
                            <button
                                className="btnGhost"
                                onClick={() => updateUserStatus(user._id, (user.status || "active") === "locked" ? "active" : "locked")}
                            >
                                {(user.status || "active") === "locked" ? "Mở khoá" : "Khoá"}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderCommentList = (list) => (
        <div className="commentList">
            {list.map((comment) => (
                <div key={comment._id} className="commentItem">
                    <div className="commentItem__header">
                        <div>
                            <strong>{comment.title || `Phim ID: ${comment.movieId}`}</strong>
                            <div className="muted">
                                {comment.userId?.username || "User"} · {comment.userId?.email || "no-email"} · {new Date(comment.createdAt).toLocaleDateString()}
                                {comment.userId?.commentBannedUntil && new Date(comment.userId.commentBannedUntil).getTime() > Date.now()
                                    ? ` · Đang bị ban ${comment.userId.commentBanLabel || ""}`
                                    : ""}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {comment.userId?._id && comment.userId?.role !== "admin" && (
                                <>
                                    <select
                                        className="sortSelect"
                                        value={banSelections[comment.userId._id] || "7d"}
                                        onChange={(e) => setBanSelections((prev) => ({ ...prev, [comment.userId._id]: e.target.value }))}
                                    >
                                        {banOptions.map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                    <button className="btnGhost" onClick={() => banCommentUser(comment.userId._id)}>Ban</button>
                                </>
                            )}
                            <button className="btnGhost" onClick={() => deleteComment(comment._id)}>Xoá</button>
                        </div>
                    </div>
                    <div className="commentItem__text">{comment.content}</div>
                </div>
            ))}
        </div>
    );

    if (currentUser?.role !== "admin") {
        return (
            <div className="container browsePage">
                <div className="emptyState">
                    <div className="emptyState__icon">🔒</div>
                    <div className="emptyState__title">Bạn không có quyền admin</div>
                </div>
            </div>
        );
    }

    return (
        <div className="browsePage">
            <div className="container">
                <div className="browseHeader">
                    <h1 className="browseTitle">Admin</h1>
                    <p className="browseSubtitle">Quản lý cộng đồng MovieHub</p>
                </div>

                {error && <div className="formError" style={{ marginBottom: 20 }}>{error}</div>}
                {loading ? (
                    <div className="emptyState">
                        <div className="emptyState__icon">⏳</div>
                        <div className="emptyState__title">Đang tải dữ liệu...</div>
                    </div>
                ) : (
                    <>
                        {view !== "dashboard" && (
                            <button className="backBtn" onClick={() => setView("dashboard")}>← Quay lại tổng quan</button>
                        )}

                        {view === "users" && (
                            <section className="section">
                                <div className="sectionHeader">
                                    <div className="section__title">Quản lý user</div>
                                    <div className="muted">{users.length} tài khoản</div>
                                </div>
                                {renderUserList(users)}
                            </section>
                        )}

                        {view === "comments" && (
                            <section className="section">
                                <div className="sectionHeader">
                                    <div className="section__title">Quản lý bình luận</div>
                                    <div className="muted">{filteredComments.length} bình luận</div>
                                </div>
                                <div className="browseSearch" style={{ marginBottom: 20 }}>
                                    <span className="browseSearch__icon">⌕</span>
                                    <input
                                        className="browseSearch__input"
                                        placeholder="Tìm theo user, email, phim hoặc nội dung bình luận..."
                                        value={commentSearch}
                                        onChange={(e) => setCommentSearch(e.target.value)}
                                    />
                                    {commentSearch && (
                                        <button className="browseSearch__clear" onClick={() => setCommentSearch("")}>✕</button>
                                    )}
                                </div>
                                {renderCommentList(filteredComments)}
                            </section>
                        )}

                        {view === "dashboard" && (
                            <>
                        <section className="section">
                            <div className="chartCols">
                                {statCards.map((card) => (
                                    <button
                                        key={card.key}
                                        className="profileCard"
                                        onClick={card.action}
                                        style={{ color: "inherit", textAlign: "left", cursor: "pointer" }}
                                    >
                                        <h2 className="profileCard__title">{card.label}</h2>
                                        <div className="profileCard__body" style={{ fontSize: 28, fontWeight: 800 }}>{card.value}</div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="section">
                            <div className="sectionHeader">
                                <div className="section__title">Quản lý user</div>
                                {users.length > 5 && <button className="seeAllBtn" onClick={() => setView("users")}>Xem tất cả →</button>}
                            </div>
                            {renderUserList(users.slice(0, 5))}
                        </section>

                        <section className="section">
                            <div className="sectionHeader">
                                <div className="section__title">Quản lý bình luận</div>
                                {comments.length > 5 && <button className="seeAllBtn" onClick={() => setView("comments")}>Xem tất cả →</button>}
                            </div>
                            {renderCommentList(comments.slice(0, 5))}
                        </section>

                        <section className="section" id="admin-insight">
                            <div className="section__title">Thông tin hệ thống</div>
                            <div className="chartCols chartCols--2" style={{ marginTop: 16 }}>
                                {insightSections.map((section) => (
                                    <div key={section.key} className="chartCol">
                                        <h3 className="chartCol__title">{section.title}</h3>
                                        <div className="chartList">
                                            {section.list.length === 0 ? (
                                                <div className="muted">Chưa có dữ liệu</div>
                                            ) : section.type === "comments" ? (
                                                section.list.map((comment) => (
                                                    <div key={comment._id} className="chartItem">
                                                        <span className="chartItem__name">{comment.title || `Phim ID: ${comment.movieId}`}</span>
                                                        <span style={{ marginLeft: "auto" }}>{comment.userId?.username || "User"}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                section.list.map((item) => (
                                                    <div key={item._id} className="chartItem">
                                                        {item.poster && <img src={item.poster} alt="" className="chartItem__thumb" />}
                                                        <span className="chartItem__name">{item.title || `Phim ID: ${item._id}`}</span>
                                                        <span style={{ marginLeft: "auto" }}>{item.count}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
