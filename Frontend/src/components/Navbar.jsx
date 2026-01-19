import React, { useEffect, useRef, useState } from 'react';
import { navbarStyles } from '../assets/dummyStyles';
import {
  Calendar,
  Clapperboard,
  Film,
  Home,
  LogOut,
  Mail,
  Menu,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // 🔹 Handle scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 🔹 Read auth info
  useEffect(() => {
    const readAuthFromStorage = () => {
      const json = localStorage.getItem('cine_auth');
      if (json) {
        try {
          const parsed = JSON.parse(json);
          setIsLoggedIn(!!parsed?.isLoggedIn);
          setUserEmail(parsed?.email || '');
          return;
        } catch {}
      }

      const flag = localStorage.getItem('isLoggedIn');
      const email =
        localStorage.getItem('userEmail') ||
        localStorage.getItem('cine_user_email');

      if (flag === 'true') {
        setIsLoggedIn(true);
        setUserEmail(email || '');
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
      }
    };

    readAuthFromStorage();

    const onStorage = (e) => {
      if (
        ['cine_auth', 'isLoggedIn', 'userEmail', 'cine_user_email'].includes(
          e.key
        )
      ) {
        readAuthFromStorage();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 🔹 Close menu on resize or ESC
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) setIsMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setIsMenuOpen(false);

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen]);

  // 🔹 Logout
  const handleLogout = () => {
    localStorage.removeItem('cine_auth');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('cine_user_email');
    setIsLoggedIn(false);
    setUserEmail('');
    navigate('/login');
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'movies', label: 'Movies', icon: Film, path: '/movies' },
    { id: 'releases', label: 'Releases', icon: Calendar, path: '/releases' },
    { id: 'contact', label: 'Contact', icon: Mail, path: '/contact' },
    { id: 'bookings', label: 'Bookings', icon: Ticket, path: '/bookings' },
  ];

  return (
    <nav
      className={`${navbarStyles.nav.base} ${
        isScrolled ? navbarStyles.nav.scrolled : navbarStyles.nav.notScrolled
      }`}
    >
      <div className={navbarStyles.container}>
        {/* ---------- LOGO ---------- */}
        <div className={navbarStyles.logoContainer}>
          <div className={navbarStyles.logoIconContainer}>
            <Clapperboard className={navbarStyles.logoIcon} />
          </div>
          <div className={navbarStyles.logoText}>CineVerse</div>
        </div>

        {/* ---------- DESKTOP NAV ---------- */}
        <div className={navbarStyles.desktopNav}>
          {navItems.map(({ id, label, icon: Icon, path }) => (
            <NavLink
              key={id}
              to={path}
              end
              className={({ isActive }) =>
                `${navbarStyles.desktopNavLink.base} ${
                  isActive
                    ? navbarStyles.desktopNavLink.active
                    : navbarStyles.desktopNavLink.inactive
                }`
              }
            >
              <Icon className={navbarStyles.desktopNavIcon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* ---------- RIGHT SECTION ---------- */}
        <div className={navbarStyles.rightSection}>
          {isLoggedIn ? (
            <button
              title={userEmail || 'Logout'}
              onClick={handleLogout}
              className={navbarStyles.logoutButton}
            >
              <LogOut className={navbarStyles.authIcon} />
              <span>Logout</span>
            </button>
          ) : (
            <NavLink to="/login" className={navbarStyles.loginButton}>
              <User className={navbarStyles.authIcon} />
              <span>Login</span>
            </NavLink>
          )}

          {/* ---------- HAMBURGER BUTTON ---------- */}
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={`block md:hidden ${navbarStyles.mobileMenuButton}`}
          >
            {isMenuOpen ? (
              <X className={navbarStyles.mobileMenuIcon} />
            ) : (
              <Menu className={navbarStyles.mobileMenuIcon} />
            )}
          </button>
        </div>
      </div>

      {/* ---------- MOBILE MENU ---------- */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className={`${navbarStyles.mobileMenuPanel} md:hidden`}
        >
          <div className={navbarStyles.mobileMenuItems}>
            {navItems.map(({ id, label, icon: Icon, path }) => (
              <NavLink
                key={id}
                to={path}
                end
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `${navbarStyles.mobileNavLink.base} ${
                    isActive
                      ? navbarStyles.mobileNavLink.active
                      : navbarStyles.mobileNavLink.inactive
                  }`
                }
              >
                <Icon className={navbarStyles.mobileNavIcon} />
                <span>{label}</span>
              </NavLink>
            ))}

            {isLoggedIn ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className={navbarStyles.mobileLogoutButton}
              >
                <LogOut className={navbarStyles.mobileNavIcon} />
                <span>Logout</span>
              </button>
            ) : (
              <NavLink
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className={navbarStyles.mobileLoginButton}
              >
                <User className={navbarStyles.mobileNavIcon} />
                <span>Login</span>
              </NavLink>
            )}
          </div>
        </div>
      )}

    </nav>
  );
};

export default Navbar;
