import { Link, useNavigate } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="Movie App by: Justin home">
          <span className="navbar-logo-icon" aria-hidden="true">🎬</span>
          <span className="navbar-logo-text">
            Movie App by:<span className="text-gradient"> Justin</span>
          </span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="navbar-link">Home</Link>
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="navbar-link navbar-link--muted"
            title="Powered by TMDB"
          >
            Powered by TMDB
          </a>
        </div>
      </div>
    </nav>
  )
}

export default Navbar