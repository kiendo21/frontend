import { useApp } from "../context.jsx";

export default function Header({ tab, onChangeTab }) {
  const { wishlist, currentUser } = useApp();

  return (
    <header className="topbar">
      <div className="container topbar__inner headerSimple">
        <div className="brand brand--red" onClick={() => onChangeTab("home")}>
          MOVIEHUB
        </div>

        <nav className="menuSimple">
          <button
            className={`headerIconBtn ${tab === "browse" ? "is-active" : ""}`}
            onClick={() => onChangeTab("browse")}
            title="Tìm kiếm"
          >
            ⌕
          </button>

          <button
            className={tab === "browse" ? "is-active" : ""}
            onClick={() => onChangeTab("browse")}
          >
            Danh sách phim
          </button>


          <button
            className={`btnAuthNav ${tab === "auth" ? "is-active" : ""}`}
            onClick={() => onChangeTab("auth")}
          >
            {currentUser ? `👤 ${currentUser.name}` : "Đăng nhập"}
          </button>
        </nav>
      </div>
    </header>
  );
}