/**
 * FoodExpress - Cart Management
 * Handles localStorage cart operations
 */

const Cart = {
  STORAGE_KEY: 'foodexpress_cart',

  getItems() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.updateBadge();
    this.dispatchUpdate();
  },

  addItem(item) {
    const items = this.getItems();
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image || '',
        restaurant: item.restaurant || '',
        qty: item.qty || 1
      });
    }
    this.saveItems(items);
    this.showToast(`${item.name} added to cart!`);
  },

  removeItem(id) {
    let items = this.getItems().filter(i => i.id !== id);
    this.saveItems(items);
  },

  updateQty(id, qty) {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      if (qty <= 0) {
        this.removeItem(id);
      } else {
        item.qty = qty;
        this.saveItems(items);
      }
    }
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.updateBadge();
    this.dispatchUpdate();
  },

  getTotal() {
    return this.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  getCount() {
    return this.getItems().reduce((sum, i) => sum + i.qty, 0);
  },

  updateBadge() {
    const badges = document.querySelectorAll('.cart-count');
    const count = this.getCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'inline-block' : 'none';
    });
  },

  dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  },

  showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

// Initialize badge on load
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
window.addEventListener('cartUpdated', () => Cart.updateBadge());

// Expose globally
window.Cart = Cart;