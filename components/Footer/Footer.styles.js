export const footerCSS = `.footer {
  border-top: 1px solid rgba(0, 82, 204, 0.08);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 80px 24px 30px 24px;
  position: relative;
  z-index: 10;
  box-shadow: 0 -4px 30px rgba(0, 82, 204, 0.02);
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1.5fr 1.3fr;
  gap: 60px;
  padding-bottom: 60px;
  border-bottom: 1px solid rgba(0, 82, 204, 0.08);
}

/* Brand info column */
.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 1.2rem;
  letter-spacing: 1.5px;
  text-decoration: none;
  color: #0052cc;
}

.logo-icon {
  color: #00b4d8;
}

.logo-text {
  background: linear-gradient(135deg, #0052cc, #00b4d8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-desc {
  font-size: 0.9rem;
  color: #486581;
  line-height: 1.6;
  max-width: 320px;
}

/* Navigation links columns */
.footer-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.link-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.link-group h4 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #102a43;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.link-group a {
  font-size: 0.9rem;
  color: #486581;
  text-decoration: none;
  transition: all 0.2s ease;
}

.link-group a:hover {
  color: #0052cc;
  transform: translateX(4px);
}

/* Newsletter Signup column */
.footer-newsletter {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.footer-newsletter h4 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #102a43;
  letter-spacing: 0.5px;
}

.footer-newsletter p {
  font-size: 0.9rem;
  color: #486581;
  line-height: 1.5;
}

#newsletter-form {
  display: flex;
  background: #f0f4f8;
  border: 1px solid rgba(0, 82, 204, 0.08);
  border-radius: 12px;
  padding: 4px;
  transition: all 0.2s ease;
}

#newsletter-form:focus-within {
  background: white;
  border-color: #0052cc;
  box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
}

#newsletter-input {
  flex-grow: 1;
  border: none;
  background: none;
  outline: none;
  padding: 10px 14px;
  font-size: 0.9rem;
  color: #102a43;
  font-weight: 550;
}

.submit-btn {
  background: #0052cc;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.submit-btn:hover {
  background: #00b4d8;
  transform: scale(1.03);
}

.feedback-msg {
  font-size: 0.8rem;
  font-weight: 600;
}

.feedback-msg.success {
  color: #36b37e;
}

/* Bottom Bar details */
.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.copyright {
  font-size: 0.85rem;
  color: #627d98;
}

.socials {
  display: flex;
  gap: 12px;
}

.socials a {
  color: #486581;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(0, 82, 204, 0.08);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.socials a:hover {
  border-color: #0052cc;
  color: #0052cc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 82, 204, 0.1);
}

/* Responsive configurations */
@media (max-width: 968px) {
  .footer-container {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .brand-desc {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .footer-links {
    grid-template-columns: 1fr;
  }
  .footer-bottom {
    flex-direction: column;
    align-items: center;
  }
}
`;
export default footerCSS;
