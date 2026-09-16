export const searchBarCSS = `.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(16, 42, 67, 0.2); /* Soft transparent background */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.search-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.search-panel {
  width: 100%;
  max-width: 800px;
  margin: 80px auto 0 auto;
  border-radius: 20px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 82, 204, 0.1);
  box-shadow: 0 20px 50px rgba(0, 82, 204, 0.15);
  transform: translateY(-50px);
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.search-overlay.open .search-panel {
  transform: translateY(0);
}

/* Header Inside Panel */
.search-header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  color: #486581;
}

#search-input {
  width: 100%;
  background: #f0f4f8;
  border: 1px solid rgba(0, 82, 204, 0.08);
  padding: 14px 48px;
  font-size: 1.05rem;
  color: #102a43;
  border-radius: 14px;
  outline: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

#search-input:focus {
  background: white;
  border-color: #0052cc;
  box-shadow: 0 0 0 4px rgba(0, 82, 204, 0.1), 0 4px 12px rgba(0, 82, 204, 0.05);
}

.clear-btn {
  position: absolute;
  right: 16px;
  color: #486581;
  background: rgba(0, 82, 204, 0.05);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  border: none;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(255, 86, 48, 0.1);
  color: #ff5630;
}

.close-btn {
  font-weight: 600;
  color: #486581;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 82, 204, 0.05);
  color: #0052cc;
}

/* Suggestions */
.search-suggestions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #486581;
  letter-spacing: 0.5px;
}

.suggestion-chips {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.chip {
  background: rgba(0, 82, 204, 0.04);
  border: 1px solid rgba(0, 82, 204, 0.08);
  color: #0052cc;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 550;
  transition: all 0.2s ease;
}

.chip:hover {
  background: #0052cc;
  color: white;
  border-color: #0052cc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 82, 204, 0.15);
}

@media (max-width: 840px) {
  .search-panel {
    max-width: 90%;
    margin-top: 60px;
    padding: 16px;
  }
  #search-input {
    font-size: 0.95rem;
    padding: 12px 40px;
  }
  .search-icon {
    left: 12px;
  }
}
`;
export default searchBarCSS;
