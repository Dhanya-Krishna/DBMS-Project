/**
 * FoodExpress - Main Script
 */

document.addEventListener('DOMContentLoaded', function () {

  // Scroll reveal for sections
  const revealEls = document.querySelectorAll('.section-title, .category-card, .restaurant-card, .step-card, .menu-card, .cta-editorial, .profile-card');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          en.target.classList.add('reveal');
          en.target.style.opacity = '1';
          en.target.style.transform = 'none';
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 6) * 0.06 + 's';
      io.observe(el);
    });
  }


  // Navbar glass effect on scroll
  const nav = document.querySelector('.navbar');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Search functionality
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const q = searchInput.value.trim();
      if (q) {
        window.location.href = `restaurants.html?search=${encodeURIComponent(q)}`;
      }
    });
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchBtn.click();
    });
  }

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      const parent = this.closest('.filter-bar');
      if (parent) {
        parent.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      }
      this.classList.add('active');
    });
  });

  // Payment option selection
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', function () {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      this.classList.add('selected');
      const radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Qty controls (for cart page)
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.dataset.id;
      const action = this.dataset.action;
      if (!id || !window.Cart) return;
      const items = Cart.getItems();
      const item = items.find(i => i.id === id);
      if (!item) return;
      if (action === 'inc') {
        Cart.updateQty(id, item.qty + 1);
      } else if (action === 'dec') {
        Cart.updateQty(id, item.qty - 1);
      }
      // Re-render if on cart page
      if (typeof renderCart === 'function') renderCart();
    });
  });

  // NOTE: Add-to-cart listeners are handled in menu.html (and other pages)
  // to avoid double-adding items. Do not re-attach here.

  // Form validation helpers
  const forms = document.querySelectorAll('.needs-validation');
  forms.forEach(form => {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  });

  // Note: loginForm, registerForm, and checkoutForm are handled with async database checks in their respective pages.

  // Display user name if logged in
  try {
    const user = JSON.parse(localStorage.getItem('foodexpress_user'));
    if (user && user.name) {
      document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = user.name;
      });
    }
  } catch {}

  // Restaurant dashboard - status update buttons
  document.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', function () {
      const row = this.closest('tr');
      const badge = row?.querySelector('.status-badge');
      const status = this.dataset.status;
      if (badge && status) {
        badge.className = 'status-badge status-' + status;
        badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      }
    });
  });

  // Delivery dashboard accept/complete
  document.querySelectorAll('.btn-accept-order').forEach(btn => {
    btn.addEventListener('click', function () {
      const card = this.closest('.delivery-card');
      if (card) {
        card.classList.add('accepted');
        this.textContent = 'Picked Up';
        this.classList.remove('btn-primary-custom');
        this.classList.add('btn-success');
        this.onclick = function () {
          card.classList.add('completed');
          this.textContent = 'Delivered';
          this.disabled = true;
        };
      }
    });
  });
});

// Simple counter animation for stats
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current.toLocaleString();
    }, 30);
  });
}

if (document.querySelector('[data-count]')) {
  animateCounters();
}