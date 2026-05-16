const Footer = () => (
  <footer className="site-footer" role="contentinfo">
    <div className="site-footer-inner">
      <span>© {new Date().getFullYear()} MovieApp</span>
      <span className="site-footer-sep" aria-hidden="true">·</span>
      <span>Personal project — not for commercial use</span>
      <span className="site-footer-sep" aria-hidden="true">·</span>
      <span>Powered by</span>
      <a
        href="https://www.themoviedb.org"
        className="site-footer-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        TMDB
      </a>
      <span className="site-footer-sep" aria-hidden="true">·</span>
      <a href="mailto:jjavier292002@gmail.com" className="site-footer-link">
        jjavier292002@gmail.com
      </a>
    </div>
  </footer>
)

export default Footer