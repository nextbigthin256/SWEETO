// Dedicated Customer Reviews & Testimonials Moderation Management Portal

let selectedReviewIds = new Set();
let reviewStatusFilter = 'All'; // 'All' | 'approved' | 'pending' | 'rejected'
let reviewRatingFilter = 'All'; // 'All' | '5' | '4' | '3' | '2' | '1'
let reviewSortBy = 'newest'; // 'newest' | 'oldest' | 'highest' | 'lowest'

export function renderAdminReviews(context) {
  // Load real customer reviews from storage, cleaning legacy mock reviews
  let reviews = [];
  try {
    const stored = sessionStorage.getItem('SWEETOS_reviews') || sessionStorage.getItem('SWEETOS_reviews_all');
    if (stored) {
      reviews = JSON.parse(stored);
    } else if (context.reviews && Array.isArray(context.reviews)) {
      reviews = context.reviews;
    }
  } catch(e) {
    reviews = [];
  }

  // Filter out legacy mock placeholder items (e.g. rev_1 to rev_5)
  reviews = reviews.filter(r => {
    const isMock = String(r.id || '').startsWith('rev_1') || String(r.id || '') === 'rev_2' || String(r.id || '') === 'rev_3' || String(r.id || '') === 'rev_4' || String(r.id || '') === 'rev_5';
    return !isMock;
  });

  context.reviews = reviews;
  try {
    sessionStorage.setItem('SWEETOS_reviews', JSON.stringify(reviews));
    sessionStorage.setItem('SWEETOS_reviews_all', JSON.stringify(reviews));
  } catch(e) {}

  const query = (context.searchQuery || '').toLowerCase().trim();
  const rawProducts = context.products || [];

  // Filter reviews
  let filtered = reviews.filter(r => {
    if (query) {
      const matchUser = (r.user || '').toLowerCase().includes(query);
      const matchComment = (r.comment || '').toLowerCase().includes(query);
      const prod = rawProducts.find(p => p.id === r.productId);
      const matchProd = prod && (prod.name || '').toLowerCase().includes(query);
      if (!matchUser && !matchComment && !matchProd) return false;
    }

    if (reviewStatusFilter !== 'All') {
      if ((r.status || 'approved').toLowerCase() !== reviewStatusFilter.toLowerCase()) return false;
    }

    if (reviewRatingFilter !== 'All') {
      if (r.rating !== parseInt(reviewRatingFilter)) return false;
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (reviewSortBy === 'highest') return b.rating - a.rating;
    if (reviewSortBy === 'lowest') return a.rating - b.rating;
    if (reviewSortBy === 'oldest') return (new Date(a.date) || 0) - (new Date(b.date) || 0);
    return (new Date(b.date) || 0) - (new Date(a.date) || 0);
  });

  // KPIs
  const totalCount = reviews.length;
  const avgRating = totalCount > 0 
    ? (reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / totalCount).toFixed(1) 
    : '5.0';
  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const approvedCount = reviews.filter(r => r.status === 'approved' || !r.status).length;
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fiveStarPct = totalCount > 0 ? Math.round((fiveStarCount / totalCount) * 100) : 100;

  const editRev = context.editingReviewId ? reviews.find(r => r.id === context.editingReviewId) : null;
  const isEditing = !!editRev;

  return `
    <style>
      .reviews-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .kpi-card {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 16px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
        transition: all 0.2s ease;
        backdrop-filter: blur(8px);
      }
      .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
      }
      .kpi-icon-box {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }
      .kpi-title {
        font-size: 11.5px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 3px;
        display: block;
      }
      .kpi-val {
        font-size: 22px;
        font-weight: 850;
        color: #0f172a;
        line-height: 1.2;
      }
      .reviews-toolbar {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 16px;
        padding: 14px 18px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      }
      .status-pill-btn {
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 12.5px;
        font-weight: 750;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #475569;
        transition: all 0.15s ease;
      }
      .status-pill-btn.active {
        background: #0052cc;
        color: #ffffff;
        border-color: #0052cc;
      }
      .reviews-table-container {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }
      .bulk-action-bar {
        background: #0f172a;
        color: #ffffff;
        padding: 10px 18px;
        border-radius: 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        animation: slide-down 0.2s ease;
      }
      .stars-glow {
        color: #f59e0b;
        letter-spacing: 2px;
        font-size: 14px;
      }
      .rating-bar-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 16px;
        padding: 14px 20px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
    </style>

    <!-- 1. Review Metrics KPIs -->
    <div class="reviews-kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(0, 82, 204, 0.1); color: #0052cc;">📝</div>
        <div>
          <span class="kpi-title">Total Reviews</span>
          <span class="kpi-val">${totalCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(245, 158, 11, 0.12); color: #d97706;">⭐</div>
        <div>
          <span class="kpi-title">Average Rating</span>
          <span class="kpi-val" style="color: #d97706;">${avgRating} <span style="font-size:14px; color:#64748b;">/ 5.0</span></span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">⏳</div>
        <div>
          <span class="kpi-title">Pending Moderation</span>
          <span class="kpi-val" style="color: #0284c7;">${pendingCount}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-box" style="background: rgba(34, 197, 94, 0.1); color: #16a34a;">🏆</div>
        <div>
          <span class="kpi-title">5-Star CSAT %</span>
          <span class="kpi-val" style="color: #16a34a;">${fiveStarPct}%</span>
        </div>
      </div>
    </div>

    <!-- 2. Status Pill Filters -->
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
      <button class="status-pill-btn ${reviewStatusFilter === 'All' ? 'active' : ''}" data-status="All">
        <span>All Reviews</span>
        <span class="badge-count">${totalCount}</span>
      </button>
      <button class="status-pill-btn ${reviewStatusFilter === 'approved' ? 'active' : ''}" data-status="approved">
        <span>✅ Approved & Published</span>
        <span class="badge-count">${approvedCount}</span>
      </button>
      <button class="status-pill-btn ${reviewStatusFilter === 'pending' ? 'active' : ''}" data-status="pending">
        <span>⏳ Pending Moderation</span>
        <span class="badge-count">${pendingCount}</span>
      </button>
    </div>

    <!-- 3. Toolbar & Multi-Filters -->
    <div class="reviews-toolbar">
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1;">
        <div class="clean-search-box" style="min-width:240px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" role="searchbox" aria-label="Search" id="review-search-input" name="q_search_no_credentials" placeholder="Search by customer, comment, product..." value="${context.searchQuery || ''}" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>

        <select class="select-filter-btn" id="review-rating-filter" title="Filter by stars">
          <option value="All" ${reviewRatingFilter === 'All' ? 'selected' : ''}>⭐ All Star Ratings</option>
          <option value="5" ${reviewRatingFilter === '5' ? 'selected' : ''}>⭐⭐⭐⭐⭐ 5 Stars</option>
          <option value="4" ${reviewRatingFilter === '4' ? 'selected' : ''}>⭐⭐⭐⭐ 4 Stars</option>
          <option value="3" ${reviewRatingFilter === '3' ? 'selected' : ''}>⭐⭐⭐ 3 Stars</option>
          <option value="2" ${reviewRatingFilter === '2' ? 'selected' : ''}>⭐⭐ 2 Stars</option>
          <option value="1" ${reviewRatingFilter === '1' ? 'selected' : ''}>⭐ 1 Star</option>
        </select>

        <select class="select-filter-btn" id="review-sort-select" title="Sort reviews">
          <option value="newest" ${reviewSortBy === 'newest' ? 'selected' : ''}>⚡ Newest First</option>
          <option value="oldest" ${reviewSortBy === 'oldest' ? 'selected' : ''}>⏳ Oldest First</option>
          <option value="highest" ${reviewSortBy === 'highest' ? 'selected' : ''}>⭐ Highest Rating</option>
          <option value="lowest" ${reviewSortBy === 'lowest' ? 'selected' : ''}>📉 Lowest Rating</option>
        </select>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button class="select-filter-btn" id="clear-all-mock-reviews-btn" style="background:#fff1f2; color:#e11d48; border-color:#fecdd3; display:flex; align-items:center; gap:6px;" title="Supprimer tous les avis mock/test pour repartir à zéro">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>🧹 Clear All Mock Reviews</span>
        </button>

        <button class="select-filter-btn" id="export-reviews-csv-btn" style="background:#f8fafc; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Export CSV</span>
        </button>

        <button class="admin-btn admin-btn-primary" id="add-review-btn" style="display:flex; align-items:center; gap:8px; padding:10px 18px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add Testimonial</span>
        </button>
      </div>
    </div>

    <!-- 4. Bulk Action Bar -->
    ${selectedReviewIds.size > 0 ? `
      <div class="bulk-action-bar">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:13.5px;">✓ ${selectedReviewIds.size} Selected</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="admin-btn admin-btn-secondary" id="bulk-approve-reviews-btn" style="padding:6px 14px; font-size:12px; font-weight:750;">
            ✓ Bulk Approve
          </button>
          <button class="admin-btn admin-btn-danger" id="bulk-delete-reviews-btn" style="padding:6px 14px; font-size:12px; font-weight:750;">
            🗑️ Bulk Delete
          </button>
        </div>
      </div>
    ` : ''}

    <!-- 5. Reviews Data Table -->
    <div class="reviews-table-container">
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0;">
              <th style="padding:12px 14px; width:38px; text-align:center;">
                <input type="checkbox" id="select-all-reviews-checkbox" ${selectedReviewIds.size === filtered.length && filtered.length > 0 ? 'checked' : ''} style="cursor:pointer; accent-color:#0052cc;">
              </th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Product</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Customer</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Rating Score</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Review & Store Reply</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Status</th>
              <th style="padding:12px 16px; font-size:11.5px; font-weight:800; color:#64748b; text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="7" style="padding:48px 20px; text-align:center; color:#94a3b8;">
                  <div style="font-size:36px; margin-bottom:8px;">⭐</div>
                  <strong style="font-size:15px; color:#475569; display:block;">No reviews found</strong>
                  <span style="font-size:13px;">No customer testimonials matched your active search query or filter.</span>
                </td>
              </tr>
            ` : filtered.map(r => {
              const prod = rawProducts.find(p => p.id === r.productId) || { name: 'Storefront Experience', image: './assets/keyboard_1786712380801.jpg' };
              const isSelected = selectedReviewIds.has(r.id);
              const isApproved = r.status === 'approved' || !r.status;

              return `
                <tr style="border-bottom:1px solid #e2e8f0; background:${isSelected ? 'rgba(0,82,204,0.04)' : 'transparent'};">
                  <td style="padding:12px 14px; text-align:center;">
                    <input type="checkbox" class="review-row-checkbox" data-review-id="${r.id}" ${isSelected ? 'checked' : ''} style="cursor:pointer; accent-color:#0052cc;">
                  </td>

                  <!-- Product -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <img src="${prod.image || './assets/keyboard_1786712380801.jpg'}" alt="${prod.name}" style="width:38px; height:38px; border-radius:8px; object-fit:cover; border:1px solid #e2e8f0; flex-shrink:0;">
                      <strong style="font-size:13px; color:#0f172a; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${prod.name}
                      </strong>
                    </div>
                  </td>

                  <!-- Customer -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <strong style="font-size:13px; color:#0f172a;">${r.user}</strong>
                      <div style="display:flex; align-items:center; gap:6px;">
                        ${r.verified ? `
                          <span style="font-size:10px; font-weight:800; color:#16a34a; background:#dcfce7; padding:1px 6px; border-radius:4px;">
                            Verified Buyer ✓
                          </span>
                        ` : ''}
                        <small style="color:#94a3b8; font-size:11px;">${r.date || 'Today'}</small>
                      </div>
                    </div>
                  </td>

                  <!-- Rating -->
                  <td style="padding:14px 16px;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <span class="stars-glow">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                      <small style="color:#64748b; font-size:11px; font-weight:700;">Score: ${r.rating} / 5</small>
                    </div>
                  </td>

                  <!-- Comment & Store Reply -->
                  <td style="padding:14px 16px; max-width:320px;">
                    <p style="margin:0 0 6px 0; font-size:12.5px; color:#334155; line-height:1.4;">"${r.comment}"</p>
                    ${r.storeReply ? `
                      <div style="background:#f1f5f9; border-left:3px solid #0052cc; padding:6px 10px; border-radius:4px; font-size:11.5px; color:#475569;">
                        <strong style="color:#0052cc; display:block; font-size:10.5px;">Store Response:</strong>
                        ${r.storeReply}
                      </div>
                    ` : ''}
                  </td>

                  <!-- Status -->
                  <td style="padding:14px 16px;">
                    <span class="status-badge ${isApproved ? 'status-green' : 'status-yellow'}" style="font-weight:800;">
                      ${isApproved ? 'Approved ✓' : 'Pending ⏳'}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td style="padding:14px 16px; text-align:right;">
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                      ${!isApproved ? `
                        <button class="action-icon-btn approve-review-btn" data-review-id="${r.id}" title="Approve Review" style="color:#16a34a; background:rgba(34,197,94,0.1);">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                      ` : ''}
                      <button class="action-icon-btn edit-review-btn" data-review-id="${r.id}" title="Edit / Reply">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>
                      <button class="action-icon-btn delete-btn delete-review-btn" data-review-id="${r.id}" title="Delete Review">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 6. Create / Edit Review Modal -->
    ${context.showReviewModal ? `
      <div class="modal-overlay-modern" id="review-modal-overlay">
        <div class="modal-card-modern" style="width: 540px;">
          
          <div class="modal-header-modern">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="kpi-icon-box" style="width:40px; height:40px; font-size:18px; background:rgba(0,82,204,0.1); color:#0052cc;">
                ⭐
              </div>
              <div>
                <h3 style="margin:0; font-size:17px; font-weight:850; color:white;">
                  ${isEditing ? 'Edit Customer Review & Store Reply' : 'Add New Customer Testimonial'}
                </h3>
                <p style="margin:2px 0 0 0; font-size:12px; color:#94a3b8;">Manage verified ratings and public replies</p>
              </div>
            </div>
            <button class="modal-close-btn" id="close-review-modal-btn">✕</button>
          </div>

          <div class="modal-body-modern custom-scroll" style="max-height:75vh; overflow-y:auto; padding:16px 4px;">
            <form id="review-crud-form" autocomplete="off" style="display:flex; flex-direction:column; gap:16px;">
              
              <div class="form-group-modern">
                <label>Target Product *</label>
                <select id="rev-product-id" class="admin-input" style="padding:12px 14px; font-weight:700;" required>
                  <option value="" disabled ${!isEditing ? 'selected' : ''}>Select Product...</option>
                  ${rawProducts.map(p => `
                    <option value="${p.id}" ${isEditing && editRev.productId === p.id ? 'selected' : ''}>${p.name}</option>
                  `).join('')}
                </select>
              </div>

              <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:14px;">
                <div class="form-group-modern">
                  <label>Reviewer Name *</label>
                  <input type="text" id="rev-author-name" name="rev_author_name_no_autofill" required placeholder="e.g. Marc Aurele" value="${isEditing ? (editRev.user || '') : ''}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-autocomplete="none">
                </div>

                <div class="form-group-modern">
                  <label>Rating Score (1 - 5 Stars) *</label>
                  <select id="rev-rating-score" class="admin-input" style="padding:12px 14px; font-weight:750;">
                    <option value="5" ${isEditing && editRev.rating === 5 ? 'selected' : (!isEditing ? 'selected' : '')}>⭐⭐⭐⭐⭐ 5 Stars</option>
                    <option value="4" ${isEditing && editRev.rating === 4 ? 'selected' : ''}>⭐⭐⭐⭐ 4 Stars</option>
                    <option value="3" ${isEditing && editRev.rating === 3 ? 'selected' : ''}>⭐⭐⭐ 3 Stars</option>
                    <option value="2" ${isEditing && editRev.rating === 2 ? 'selected' : ''}>⭐⭐ 2 Stars</option>
                    <option value="1" ${isEditing && editRev.rating === 1 ? 'selected' : ''}>⭐ 1 Star</option>
                  </select>
                </div>
              </div>

              <div class="form-group-modern">
                <label>Customer Feedback & Commentary *</label>
                <textarea id="rev-comment-text" required rows="3" placeholder="Write or paste customer review text...">${isEditing ? (editRev.comment || '') : ''}</textarea>
              </div>

              <div class="form-group-modern">
                <label>Official Store Public Response (Optional)</label>
                <textarea id="rev-store-reply" rows="2" placeholder="e.g. Thank you for choosing SWEETOS!">${isEditing ? (editRev.storeReply || '') : ''}</textarea>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                <div class="form-group-modern">
                  <label>Moderation Status</label>
                  <select id="rev-status-val" class="admin-input" style="padding:12px 14px;">
                    <option value="approved" ${isEditing && editRev.status === 'approved' ? 'selected' : (!isEditing ? 'selected' : '')}>✅ Approved & Live</option>
                    <option value="pending" ${isEditing && editRev.status === 'pending' ? 'selected' : ''}>⏳ Pending Review</option>
                  </select>
                </div>

                <div class="form-group-modern" style="justify-content:center;">
                  <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white; font-size:12.5px; font-weight:750; margin-top:20px;">
                    <input type="checkbox" id="rev-verified-check" ${isEditing && editRev.verified !== false ? 'checked' : (!isEditing ? 'checked' : '')} style="width:16px; height:16px; accent-color:#0052cc;">
                    <span>Verified Buyer Badge ✓</span>
                  </label>
                </div>
              </div>

              <button type="submit" class="admin-btn admin-btn-primary" style="padding:14px; font-size:14px; font-weight:800; margin-top:8px;">
                ${isEditing ? '✓ Save Review & Response' : '🚀 Publish Review'}
              </button>
            </form>
          </div>

        </div>
      </div>
    ` : ''}
  `;
}

export function attachAdminReviewsListeners(context, shadow) {
  // 1. Search Input
  const searchInput = shadow.getElementById('review-search-input');
  if (searchInput) {
    if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
      searchInput.value = '';
      context.searchQuery = '';
    }
    searchInput.addEventListener('focus', () => {
      if (context.isAutofilledCredential && context.isAutofilledCredential(searchInput.value)) {
        searchInput.value = '';
        context.searchQuery = '';
      }
    });

    searchInput.addEventListener('input', (e) => {
      let val = e.target.value;
      if (context.isAutofilledCredential && context.isAutofilledCredential(val)) {
        e.target.value = '';
        val = '';
      }
      context.searchQuery = val;
      context.render();
      context.attachListeners();
      const sRef = shadow.getElementById('review-search-input');
      if (sRef) {
        sRef.focus();
        sRef.setSelectionRange(sRef.value.length, sRef.value.length);
      }
    });
  }

  // 2. Status Pill Filters
  shadow.querySelectorAll('.status-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      reviewStatusFilter = btn.getAttribute('data-status');
      context.render();
      context.attachListeners();
    });
  });

  // 3. Rating Dropdown Filter
  const ratingSelect = shadow.getElementById('review-rating-filter');
  if (ratingSelect) {
    ratingSelect.addEventListener('change', (e) => {
      reviewRatingFilter = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 4. Sort Dropdown
  const sortSelect = shadow.getElementById('review-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      reviewSortBy = e.target.value;
      context.render();
      context.attachListeners();
    });
  }

  // 5. Add Review Modal Open
  const addBtn = shadow.getElementById('add-review-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      context.editingReviewId = null;
      context.showReviewModal = true;
      context.render();
      context.attachListeners();
    });
  }

  // 6. Close Modal
  const closeBtn = shadow.getElementById('close-review-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      context.showReviewModal = false;
      context.editingReviewId = null;
      context.render();
      context.attachListeners();
    });
  }

  // 7. Select All Checkbox
  const selectAll = shadow.getElementById('select-all-reviews-checkbox');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      selectedReviewIds.clear();
      if (isChecked) {
        (context.reviews || []).forEach(r => selectedReviewIds.add(r.id));
      }
      context.render();
      context.attachListeners();
    });
  }

  // 8. Row Checkboxes
  shadow.querySelectorAll('.review-row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.getAttribute('data-review-id');
      if (e.target.checked) {
        selectedReviewIds.add(id);
      } else {
        selectedReviewIds.delete(id);
      }
      context.render();
      context.attachListeners();
    });
  });

  const syncReviews = (list) => {
    context.reviews = list;
    sessionStorage.setItem('SWEETOS_reviews', JSON.stringify(list));
    sessionStorage.setItem('SWEETOS_reviews_all', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('reviews:updated', { detail: list }));
  };

  // Clear all mock / test reviews handler
  const clearMockBtn = shadow.getElementById('clear-all-mock-reviews-btn');
  if (clearMockBtn) {
    clearMockBtn.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Effacer tous les avis mock',
        message: 'Voulez-vous supprimer tous les avis de test et repartir à zéro avec un système 100% temps réel ?',
        confirmText: 'Oui, tout effacer',
        cancelText: 'Annuler',
        type: 'danger',
        icon: '🧹'
      }) : Promise.resolve(confirm('Voulez-vous supprimer tous les avis de test ?')));

      if (confirmed) {
        syncReviews([]);
        selectedReviewIds.clear();
        window.dispatchEvent(new CustomEvent('toast:show', { detail: '🧹 Tous les avis mock ont été effacés ! Système 100% temps réel.' }));
        context.render();
        context.attachListeners();
      }
    });
  }

  // 9. Quick Approve Action
  shadow.querySelectorAll('.approve-review-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-review-id');
      const rev = (context.reviews || []).find(r => r.id === id);
      if (rev) {
        rev.status = 'approved';
        syncReviews(context.reviews);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Review approved and published!' }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // 10. Edit / Reply Action
  shadow.querySelectorAll('.edit-review-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-review-id');
      context.editingReviewId = id;
      context.showReviewModal = true;
      context.render();
      context.attachListeners();
    });
  });

  // 11. Delete Single Review
  shadow.querySelectorAll('.delete-review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-review-id');
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Delete Customer Review',
        message: 'Are you sure you want to permanently delete this customer review?',
        confirmText: 'Delete Review',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm('Are you sure you want to permanently delete this customer review?')));

      if (confirmed) {
        const updated = (context.reviews || []).filter(r => r.id !== id);
        selectedReviewIds.delete(id);
        syncReviews(updated);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Review deleted.' }));
        context.render();
        context.attachListeners();
      }
    });
  });

  // 12. Bulk Approve
  const bulkApproveBtn = shadow.getElementById('bulk-approve-reviews-btn');
  if (bulkApproveBtn) {
    bulkApproveBtn.addEventListener('click', () => {
      (context.reviews || []).forEach(r => {
        if (selectedReviewIds.has(r.id)) {
          r.status = 'approved';
        }
      });
      selectedReviewIds.clear();
      syncReviews(context.reviews);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Selected reviews approved!' }));
      context.render();
      context.attachListeners();
    });
  }

  // 13. Bulk Delete
  const bulkDeleteBtn = shadow.getElementById('bulk-delete-reviews-btn');
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', async () => {
      const confirmed = await (window.showConfirmModal ? window.showConfirmModal({
        title: 'Bulk Delete Reviews',
        message: `Are you sure you want to permanently delete ${selectedReviewIds.size} selected customer reviews?`,
        confirmText: 'Delete Selected',
        cancelText: 'Cancel',
        type: 'danger',
        icon: '🗑️'
      }) : Promise.resolve(confirm(`Delete ${selectedReviewIds.size} selected reviews?`)));

      if (confirmed) {
        const updated = (context.reviews || []).filter(r => !selectedReviewIds.has(r.id));
        selectedReviewIds.clear();
        syncReviews(updated);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Selected reviews removed.' }));
        context.render();
        context.attachListeners();
      }
    });
  }

  // 14. CRUD Form Submit
  const crudForm = shadow.getElementById('review-crud-form');
  if (crudForm) {
    crudForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const prodId = shadow.getElementById('rev-product-id').value;
      const author = shadow.getElementById('rev-author-name').value.trim();
      const rating = parseInt(shadow.getElementById('rev-rating-score').value);
      const comment = shadow.getElementById('rev-comment-text').value.trim();
      const storeReply = shadow.getElementById('rev-store-reply').value.trim();
      const status = shadow.getElementById('rev-status-val').value;
      const verified = shadow.getElementById('rev-verified-check').checked;

      if (context.editingReviewId) {
        const rev = (context.reviews || []).find(r => r.id === context.editingReviewId);
        if (rev) {
          rev.productId = prodId;
          rev.user = author;
          rev.rating = rating;
          rev.comment = comment;
          rev.storeReply = storeReply;
          rev.status = status;
          rev.verified = verified;
        }
        syncReviews(context.reviews);
      } else {
        const newRev = {
          id: `rev_${Date.now()}`,
          productId: prodId,
          user: author,
          rating: rating,
          comment: comment,
          storeReply: storeReply,
          status: status,
          verified: verified,
          date: new Date().toISOString().slice(0, 10)
        };
        syncReviews([newRev, ...(context.reviews || [])]);
      }

      context.showReviewModal = false;
      context.editingReviewId = null;
      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'Customer review saved successfully!' }));
      context.render();
      context.attachListeners();
    });
  }

  // 15. Export CSV
  const csvBtn = shadow.getElementById('export-reviews-csv-btn');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      let csvContent = "data:text/csv;charset=utf-8,ID,Product ID,Customer,Rating,Comment,Status,Verified,Date\n";
      (context.reviews || []).forEach(r => {
        const row = [
          r.id,
          r.productId,
          `"${(r.user || '').replace(/"/g, '""')}"`,
          r.rating,
          `"${(r.comment || '').replace(/"/g, '""')}"`,
          r.status || 'approved',
          r.verified ? 'Yes' : 'No',
          r.date || ''
        ];
        csvContent += row.join(",") + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SWEETOS_Customer_Reviews_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.dispatchEvent(new CustomEvent('toast:show', { detail: 'CSV export downloaded!' }));
    });
  }
}
