/**
 * FoodExpress - Database helpers (Supabase)
 * All table/column names are lowercase (PostgreSQL default)
 */

window.DB = {
  client() {
    return window.supabaseClient;
  },

  getLocalOrders() {
    try {
      const raw = localStorage.getItem('foodexpress_orders');
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  },

  saveLocalOrders(orders) {
    try {
      localStorage.setItem('foodexpress_orders', JSON.stringify(orders || []));
    } catch (e) {}
  },

  async getRestaurants() {
    const { data, error } = await this.client()
      .from('restaurant')
      .select('*')
      .eq('isactive', true)
      .order('rating', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getRestaurant(id) {
    const { data, error } = await this.client()
      .from('restaurant')
      .select('*')
      .eq('restaurantid', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getMenuItems(restaurantId) {
    const { data, error } = await this.client()
      .from('menuitem')
      .select('*')
      .eq('restaurantid', restaurantId)
      .eq('isavailable', true);
    if (error) throw error;
    return data || [];
  },

  async findCustomerByEmail(email) {
    const { data, error } = await this.client()
      .from('customer')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createCustomer({ name, email, phone, password }) {
    const { data, error } = await this.client()
      .from('customer')
      .insert([{
        name,
        email,
        phone: phone || null,
        passwordhash: password || 'demo'
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCustomer(customerId, fields) {
    const payload = {};
    if (fields.name !== undefined) payload.name = fields.name;
    if (fields.email !== undefined) payload.email = fields.email;
    if (fields.phone !== undefined) payload.phone = fields.phone;
    const { data, error } = await this.client()
      .from('customer')
      .update(payload)
      .eq('customerid', customerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getOrCreateDefaultAddress(customerId) {
    // Do NOT auto-create a fake "Default Address". Return null if none exist.
    const list = await this.getCustomerAddresses(customerId);
    const real = (list || []).filter(a => {
      const s = (a.street || '').toLowerCase().trim();
      return s && s !== 'default address' && !s.startsWith('default address');
    });
    return real[0] || null;
  },


  async placeOrder({ customerId, addressId, cartItems, paymentMethod }) {
    if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');

    const byRest = {};
    cartItems.forEach(item => {
      const key = item.restaurantId
        ? ('id:' + item.restaurantId)
        : (item.restaurant || 'Unknown');
      if (!byRest[key]) byRest[key] = [];
      byRest[key].push(item);
    });

    const restaurants = await this.getRestaurants().catch(() => []);
    const nameToId = {};
    restaurants.forEach(r => { nameToId[r.name] = r.restaurantid; });

    let grandTotal = 0;
    cartItems.forEach(i => { grandTotal += (i.price * i.qty); });
    const deliveryFee = Object.keys(byRest).length > 1 ? (Object.keys(byRest).length * 40) : 40;
    const timestamp = new Date().toISOString();

    let combined = null;
    const createdOrders = [];

    if (this.client()) {
      try {
        const { data: cData, error: cErr } = await this.client()
          .from('combinedorder')
          .insert([{
            customerid: customerId,
            addressid: addressId,
            ismerged: Object.keys(byRest).length > 1,
            deliveryfee: deliveryFee,
            overallstatus: 'Placed',
            totalamount: grandTotal + deliveryFee
          }])
          .select()
          .single();

        if (cErr) {
          console.error('combinedorder insert failed', cErr);
          throw cErr;
        }
        if (cData) {
          combined = cData;
          for (const [restKey, items] of Object.entries(byRest)) {
            const restName = items[0].restaurant || restKey.replace(/^id:/, '');
            let restaurantId = items[0].restaurantId || nameToId[restName];
            if (!restaurantId && restKey.startsWith('id:')) restaurantId = parseInt(restKey.slice(3), 10);
            restaurantId = restaurantId || 1;
            let subTotal = 0;
            items.forEach(i => { subTotal += i.price * i.qty; });

            const { data: order, error: oErr } = await this.client()
              .from('orders')
              .insert([{
                combinedorderid: combined.combinedorderid,
                customerid: customerId,
                restaurantid: restaurantId,
                addressid: addressId,
                status: 'Placed',
                deliverypartnerid: null,
                orderdatetime: timestamp,
                subtotal: subTotal,
                deliveryfee: Object.keys(byRest).length > 1 ? 40 : deliveryFee,
                paymentstatus: 'Paid'
              }])
              .select()
              .single();

            if (oErr) {
              console.error('Order insert failed for', restName, oErr);
              throw oErr;
            }
            if (order) {
              const orderItems = items.map(i => ({
                orderid: order.orderid,
                itemid: parseInt(i.id, 10) || parseInt(i.itemid, 10) || null,
                quantity: i.qty,
                unitprice: i.price,
                subtotal: i.price * i.qty
              })).filter(oi => oi.itemid);

              const { error: oiErr } = await this.client().from('orderitem').insert(orderItems);
              if (oiErr) { console.error('orderitem insert', oiErr); throw oiErr; }
              order.restaurant = { name: restName };
              order.orderitem = items.map(i => ({
                quantity: i.qty,
                unitprice: i.price,
                subtotal: i.price * i.qty,
                menuitem: { name: i.name, imageurl: i.image }
              }));
              createdOrders.push(order);
            }
          }

          await this.client().from('payment').insert([{
            combinedorderid: combined.combinedorderid,
            amount: grandTotal + deliveryFee,
            method: paymentMethod || 'UPI',
            status: 'Completed',
            paidat: timestamp
          }]);
        }
      } catch (err) {
        console.warn('Supabase placeOrder fallback to localStorage:', err);
      }
    }

    if (!createdOrders.length) {
      const localOrders = this.getLocalOrders();
      const nextCombinedId = Math.max(100, ...localOrders.map(o => o.combinedorderid || 0)) + 1;
      let nextOrderId = Math.max(10, ...localOrders.map(o => o.orderid || 0)) + 1;

      combined = {
        combinedorderid: nextCombinedId,
        customerid: customerId,
        addressid: addressId,
        ismerged: Object.keys(byRest).length > 1,
        deliveryfee: deliveryFee,
        overallstatus: 'Placed',
        totalamount: grandTotal + deliveryFee
      };

      for (const [restKey, items] of Object.entries(byRest)) {
        const restName = items[0].restaurant || restKey.replace(/^id:/, '');
        let restaurantId = items[0].restaurantId || nameToId[restName];
        if (!restaurantId && restKey.startsWith('id:')) restaurantId = parseInt(restKey.slice(3), 10);
        restaurantId = restaurantId || 1;
        let subTotal = 0;
        items.forEach(i => { subTotal += i.price * i.qty; });

        const order = {
          orderid: nextOrderId++,
          combinedorderid: nextCombinedId,
          customerid: customerId,
          restaurantid: restaurantId,
          addressid: addressId,
          status: 'Placed',
          deliverypartnerid: null,
          deliveryPartnerName: null,
          subtotal: subTotal,
          deliveryfee: Object.keys(byRest).length > 1 ? 40 : deliveryFee,
          paymentstatus: 'Paid',
          orderdatetime: timestamp,
          restaurant: { name: restName },
          orderitem: items.map(i => ({
            quantity: i.qty,
            unitprice: i.price,
            subtotal: i.price * i.qty,
            menuitem: { name: i.name, imageurl: i.image }
          }))
        };
        createdOrders.push(order);
      }
    }

    const allLocal = this.getLocalOrders();
    createdOrders.forEach(co => {
      const idx = allLocal.findIndex(o => String(o.orderid) === String(co.orderid));
      if (idx >= 0) allLocal[idx] = { ...allLocal[idx], ...co };
      else allLocal.unshift(co);
    });
    this.saveLocalOrders(allLocal);

    try {
      window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: { orders: createdOrders } }));
      localStorage.setItem('foodexpress_orders_updated', String(Date.now()));
    } catch (e) {}

    return { combined, orders: createdOrders };
  },

  async getOrdersForRestaurant(restaurantId) {
    let dbOrders = [];
    if (this.client()) {
      try {
        const { data, error } = await this.client()
          .from('orders')
          .select(`
            *,
            customer:customerid ( name, phone, email ),
            orderitem ( itemid, quantity, unitprice, subtotal, menuitem:itemid ( name, imageurl ) )
          `)
          .eq('restaurantid', restaurantId)
          .order('orderdatetime', { ascending: false });
        if (!error && data) dbOrders = data;
      } catch (e) {}
    }

    const localOrders = this.getLocalOrders().filter(o => String(o.restaurantid) === String(restaurantId));
    const map = new Map();
    dbOrders.forEach(o => map.set(String(o.orderid), o));
    localOrders.forEach(o => {
      const existing = map.get(String(o.orderid));
      map.set(String(o.orderid), existing ? { ...existing, ...o } : o);
    });

    const result = Array.from(map.values());
    result.sort((a, b) => new Date(b.orderdatetime || 0) - new Date(a.orderdatetime || 0));
    return result;
  },

  /**
   * Only show orders where status is 'Ready' (or equivalent) AND deliverypartnerid is null
   */
  async getAvailableOrdersForDelivery() {
    /**
     * Multi-restaurant support:
     * - Group by combinedorderid
     * - A combined job is available only when EVERY order in the group is Ready
     *   and none is already assigned to a delivery partner
     * - Single-restaurant jobs work the same (one order group)
     * Returns "job" objects with combinedorderid, orders[], restaurants summary
     */
    let dbOrders = [];
    if (this.client()) {
      try {
        let res = await this.client()
          .from('orders')
          .select(`
            *,
            restaurant:restaurantid ( name, address, phone ),
            customer:customerid ( name, phone ),
            address:addressid ( street, city, pincode, landmark )
          `);
        if (res.error) {
          // Fallback: plain select without joins (schema mismatch)
          console.warn('orders join query failed, retrying simple', res.error);
          res = await this.client().from('orders').select('*');
        }
        if (!res.error && res.data) dbOrders = res.data;
      } catch (e) { console.warn('getAvailableOrdersForDelivery', e); }
    }

    const localOrders = this.getLocalOrders();
    const map = new Map();
    // Prefer database as source of truth for status / partner assignment
    localOrders.forEach(o => map.set(String(o.orderid), o));
    dbOrders.forEach(o => map.set(String(o.orderid), o));
    const all = Array.from(map.values());

    // Group by combinedorderid (fallback to own orderid)
    const groups = {};
    all.forEach(o => {
      const key = String(o.combinedorderid || o.orderid);
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });

    const jobs = [];
    Object.entries(groups).forEach(([cid, orders]) => {
      const allReady = orders.every(o => {
        const s = (o.status || '').toLowerCase();
        return s === 'ready' || s.includes('ready');
      });
      // Exclude job if ANY sub-order is already assigned or already out/delivered
      const anyAssigned = orders.some(o => o.deliverypartnerid != null && o.deliverypartnerid !== '');
      const anyInProgress = orders.some(o => {
        const s = (o.status || '').toLowerCase();
        return s.includes('out') || (s.includes('deliver') && !s.includes('out'));
      });
      if (allReady && !anyAssigned && !anyInProgress) {
        const first = orders[0];
        jobs.push({
          combinedorderid: first.combinedorderid || first.orderid,
          ismerged: orders.length > 1,
          orders,
          orderids: orders.map(o => o.orderid),
          customer: first.customer,
          address: first.address,
          restaurants: orders.map(o => o.restaurant ? o.restaurant.name : 'Restaurant').join(' + '),
          subtotal: orders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0),
          status: 'Ready',
          orderdatetime: first.orderdatetime
        });
      }
    });

    jobs.sort((a, b) => new Date(a.orderdatetime || 0) - new Date(b.orderdatetime || 0));
    return jobs;
  },

  /**
   * Assign one delivery partner to ALL restaurant orders under a combined order
   */
  async acceptCombinedDelivery(combinedOrderId, partnerId, orderIds = []) {
    const cid = combinedOrderId;
    const pid = partnerId != null ? Number(partnerId) : null;
    if (pid == null || Number.isNaN(pid)) throw new Error('Invalid delivery partner id');

    // Resolve every order id that belongs to this job
    let ids = (orderIds || []).map(x => parseInt(x, 10)).filter(Boolean);
    if (this.client()) {
      try {
        if (!ids.length) {
          const { data: siblings, error } = await this.client()
            .from('orders')
            .select('orderid')
            .eq('combinedorderid', cid);
          if (error) throw error;
          ids = (siblings || []).map(r => r.orderid);
        }
        // If still empty, treat cid as a single order id
        if (!ids.length) ids = [parseInt(cid, 10)].filter(Boolean);

        if (!ids.length) throw new Error('No orders found for this delivery job');

        // Update EACH order by primary key and verify
        for (const oid of ids) {
          const { data, error } = await this.client()
            .from('orders')
            .update({
              status: 'OutForDelivery',
              deliverypartnerid: pid
            })
            .eq('orderid', oid)
            .select('orderid, status, deliverypartnerid')
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('Order #' + oid + ' was not updated (check table permissions)');
        }

        try {
          await this.client()
            .from('combinedorder')
            .update({ overallstatus: 'OutForDelivery' })
            .eq('combinedorderid', cid);
        } catch (_) {}

        // Mirror into localStorage so UI stays consistent
        const localOrders = this.getLocalOrders();
        let changed = false;
        localOrders.forEach(o => {
          const isTarget = ids.length ? ids.includes(Number(o.orderid)) : String(o.combinedorderid) === String(cid);
          if (isTarget) {
            o.status = 'OutForDelivery';
            o.deliverypartnerid = pid;
            changed = true;
          }
        });
        // Also inject from DB if missing locally
        for (const oid of ids) {
          if (!localOrders.find(o => Number(o.orderid) === Number(oid))) {
            localOrders.push({
              orderid: oid,
              combinedorderid: cid,
              status: 'OutForDelivery',
              deliverypartnerid: pid
            });
            changed = true;
          }
        }
        if (changed) this.saveLocalOrders(localOrders);
        return true;
      } catch (e) {
        console.error('acceptCombinedDelivery failed', e);
        throw e;
      }
    }

    // Offline / no client
    const localOrders = this.getLocalOrders();
    let changed = false;
    localOrders.forEach(o => {
      const isTarget = ids.length ? ids.includes(Number(o.orderid)) : (String(o.combinedorderid) === String(cid) || String(o.orderid) === String(cid));
      if (isTarget) {
        o.status = 'OutForDelivery';
        o.deliverypartnerid = pid;
        changed = true;
      }
    });
    if (changed) this.saveLocalOrders(localOrders);
    return changed;
  },

  async markCombinedDelivered(combinedOrderId, orderIds = []) {
    const cid = combinedOrderId;
    let ids = (orderIds || []).map(x => parseInt(x, 10)).filter(Boolean);
    if (this.client()) {
      try {
        if (!ids.length) {
          const { data: siblings } = await this.client()
            .from('orders')
            .select('orderid')
            .eq('combinedorderid', cid);
          ids = (siblings || []).map(r => r.orderid);
        }
        if (!ids.length) ids = [parseInt(cid, 10)].filter(Boolean);
        for (const oid of ids) {
          const { error } = await this.client()
            .from('orders')
            .update({ status: 'Delivered' })
            .eq('orderid', oid);
          if (error) throw error;
        }
        try {
          await this.client()
            .from('combinedorder')
            .update({ overallstatus: 'Delivered' })
            .eq('combinedorderid', cid);
        } catch (_) {}
      } catch (e) {
        console.error('markCombinedDelivered', e);
        throw e;
      }
    }
    const localOrders = this.getLocalOrders();
    localOrders.forEach(o => {
      const isTarget = ids.length ? ids.includes(Number(o.orderid)) : (String(o.combinedorderid) === String(cid) || String(o.orderid) === String(cid));
      if (isTarget) {
        o.status = 'Delivered';
      }
    });
    this.saveLocalOrders(localOrders);
    return true;
  },

  /** Fetch line items for an order directly (for reorder) */
  async getOrderItems(orderId) {
    if (!this.client()) return [];
    const { data, error } = await this.client()
      .from('orderitem')
      .select('itemid, quantity, unitprice, subtotal, menuitem:itemid ( itemid, name, imageurl, price )')
      .eq('orderid', orderId);
    if (error) {
      console.warn('getOrderItems', error);
      // Fallback without join
      const { data: d2, error: e2 } = await this.client()
        .from('orderitem')
        .select('*')
        .eq('orderid', orderId);
      if (e2) throw e2;
      return d2 || [];
    }
    return data || [];
  },

  async getOrdersForPartner(partnerId) {
    let dbOrders = [];
    if (this.client()) {
      try {
        const { data, error } = await this.client()
          .from('orders')
          .select(`
            *,
            restaurant:restaurantid ( name, address ),
            customer:customerid ( name, phone ),
            address:addressid ( street, city, pincode )
          `)
          .eq('deliverypartnerid', partnerId)
          .order('orderdatetime', { ascending: false });
        if (!error && data) dbOrders = data;
      } catch (e) {}
    }

    const localOrders = this.getLocalOrders().filter(o => String(o.deliverypartnerid) === String(partnerId));
    const map = new Map();
    dbOrders.forEach(o => map.set(String(o.orderid), o));
    localOrders.forEach(o => {
      const existing = map.get(String(o.orderid));
      map.set(String(o.orderid), existing ? { ...existing, ...o } : o);
    });

    const result = Array.from(map.values()).filter(o => String(o.deliverypartnerid) === String(partnerId));
    result.sort((a, b) => new Date(b.orderdatetime || 0) - new Date(a.orderdatetime || 0));
    return result;
  },

  async getCustomerAddresses(customerId) {
    const { data, error } = await this.client()
      .from('address')
      .select('*')
      .eq('customerid', customerId)
      .order('isdefault', { ascending: false })
      .order('addressid', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async addCustomerAddress({ customerId, street, city, pincode, landmark, isdefault }) {
    if (isdefault) {
      await this.client()
        .from('address')
        .update({ isdefault: false })
        .eq('customerid', customerId);
    }
    const { data, error } = await this.client()
      .from('address')
      .insert([{
        customerid: customerId,
        street: street || '',
        city: city || 'Kochi',
        pincode: pincode || '682001',
        landmark: landmark || '',
        isdefault: !!isdefault
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCustomerAddress(addressId, fields) {
    if (fields.isdefault && fields.customerId) {
      await this.client()
        .from('address')
        .update({ isdefault: false })
        .eq('customerid', fields.customerId);
    }
    const payload = {};
    if (fields.street !== undefined) payload.street = fields.street;
    if (fields.city !== undefined) payload.city = fields.city;
    if (fields.pincode !== undefined) payload.pincode = fields.pincode;
    if (fields.landmark !== undefined) payload.landmark = fields.landmark;
    if (fields.isdefault !== undefined) payload.isdefault = fields.isdefault;

    const { data, error } = await this.client()
      .from('address')
      .update(payload)
      .eq('addressid', addressId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCustomerAddress(addressId) {
    const { data, error } = await this.client()
      .from('address')
      .delete()
      .eq('addressid', addressId);
    if (error) throw error;
    return true;
  },

  async updateOrderStatus(orderId, status, extra = {}) {
    const payload = { status, ...extra };

    let dbData = null;
    if (this.client()) {
      try {
        const dbPayload = { ...payload };
        delete dbPayload.deliveryPartnerName;

        const { data } = await this.client()
          .from('orders')
          .update(dbPayload)
          .eq('orderid', orderId)
          .select()
          .maybeSingle();
        if (data) dbData = data;
      } catch (err) {
        console.warn('Supabase updateOrderStatus error:', err);
      }
    }

    const localOrders = this.getLocalOrders();
    const idx = localOrders.findIndex(o => String(o.orderid) === String(orderId));
    let updatedLocal = null;

    if (idx >= 0) {
      localOrders[idx] = {
        ...localOrders[idx],
        ...payload
      };
      if (extra.deliverypartnerid !== undefined) localOrders[idx].deliverypartnerid = extra.deliverypartnerid;
      if (extra.deliveryPartnerName !== undefined) localOrders[idx].deliveryPartnerName = extra.deliveryPartnerName;
      updatedLocal = localOrders[idx];
    } else if (dbData) {
      updatedLocal = { ...dbData, ...payload };
      localOrders.unshift(updatedLocal);
    } else {
      updatedLocal = { orderid: orderId, status, ...extra };
      localOrders.unshift(updatedLocal);
    }

    this.saveLocalOrders(localOrders);

    const result = { ...(dbData || {}), ...updatedLocal, status };

    try {
      window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: { orderId, status, extra, order: result } }));
      localStorage.setItem('foodexpress_orders_updated', String(Date.now()));
    } catch (e) {}

    return result;
  },

  async getDeliveryHistory(partnerId) {
    const allPartner = await this.getOrdersForPartner(partnerId);
    return allPartner.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s.includes('deliver') || s.includes('complete');
    });
  },

  async getAllOpenOrders() {
    let dbOrders = [];
    if (this.client()) {
      try {
        const { data, error } = await this.client()
          .from('orders')
          .select(`
            *,
            restaurant:restaurantid ( name, address, phone ),
            customer:customerid ( name, phone ),
            address:addressid ( street, city, pincode, landmark )
          `)
          .order('orderdatetime', { ascending: false })
          .limit(50);
        if (!error && data) dbOrders = data;
      } catch (e) {}
    }

    const localOrders = this.getLocalOrders();
    const map = new Map();
    dbOrders.forEach(o => map.set(String(o.orderid), o));
    localOrders.forEach(o => {
      const existing = map.get(String(o.orderid));
      map.set(String(o.orderid), existing ? { ...existing, ...o } : o);
    });

    const result = Array.from(map.values());
    result.sort((a, b) => new Date(b.orderdatetime || 0) - new Date(a.orderdatetime || 0));
    return result;
  },

  async getCustomerOrders(customerId) {
    let dbOrders = [];
    if (this.client()) {
      try {
        const { data, error } = await this.client()
          .from('orders')
          .select(`
            *,
            restaurant:restaurantid ( name, address, phone ),
            address:addressid ( street, city, pincode, landmark ),
            deliverypartner:deliverypartnerid ( name, phone, rating ),
            orderitem ( itemid, quantity, unitprice, subtotal, menuitem:itemid ( name, imageurl ) )
          `)
          .eq('customerid', customerId)
          .order('orderdatetime', { ascending: false });
        if (!error && data) dbOrders = data;
      } catch (e) {}
    }

    const localOrders = this.getLocalOrders().filter(o => String(o.customerid) === String(customerId));
    const map = new Map();
    dbOrders.forEach(o => map.set(String(o.orderid), o));
    localOrders.forEach(o => {
      const existing = map.get(String(o.orderid));
      map.set(String(o.orderid), existing ? { ...existing, ...o } : o);
    });

    const result = Array.from(map.values());
    result.sort((a, b) => new Date(b.orderdatetime || 0) - new Date(a.orderdatetime || 0));
    return result;
  },

  async getOrderDetails(orderId) {
    if (!orderId) return null;
    const str = String(orderId).trim();
    const ids = str.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);

    let dbData = null;
    if (this.client()) {
      try {
        let query = this.client().from('orders').select(`
          *,
          restaurant:restaurantid ( name, address, phone ),
          customer:customerid ( name, phone, email ),
          address:addressid ( street, city, pincode, landmark ),
          deliverypartner:deliverypartnerid ( name, phone, rating ),
          orderitem ( itemid, quantity, unitprice, subtotal, menuitem:itemid ( name, imageurl ) )
        `);

        if (ids.length > 1) {
          const { data } = await query.in('orderid', ids).order('orderdatetime', { ascending: false });
          if (data && data.length) dbData = data;
        } else if (ids.length === 1) {
          const { data } = await query.eq('orderid', ids[0]);
          if (data && data.length) {
            dbData = data;
          } else {
            const { data: combinedOrders } = await this.client().from('orders').select(`
              *,
              restaurant:restaurantid ( name, address, phone ),
              customer:customerid ( name, phone, email ),
              address:addressid ( street, city, pincode, landmark ),
              deliverypartner:deliverypartnerid ( name, phone, rating ),
              orderitem ( itemid, quantity, unitprice, subtotal, menuitem:itemid ( name, imageurl ) )
            `).eq('combinedorderid', ids[0]);
            if (combinedOrders && combinedOrders.length) dbData = combinedOrders;
          }
        }
      } catch (err) {
        console.warn('Supabase getOrderDetails error:', err);
      }
    }

    const localOrders = this.getLocalOrders();

    function mergeSingle(dbObj, locObj) {
      if (!dbObj && !locObj) return null;
      if (!dbObj) return locObj;
      if (!locObj) return dbObj;
      const res = { ...dbObj, ...locObj };
      if (locObj.status) res.status = locObj.status;
      if (locObj.deliverypartnerid !== undefined) res.deliverypartnerid = locObj.deliverypartnerid;
      if (locObj.deliveryPartnerName !== undefined) res.deliveryPartnerName = locObj.deliveryPartnerName;
      if (dbObj.deliverypartner) res.deliverypartner = dbObj.deliverypartner;
      return res;
    }

    if (ids.length > 1) {
      const results = [];
      ids.forEach(id => {
        const dbSub = Array.isArray(dbData) ? dbData.find(d => Number(d.orderid) === id) : null;
        const locSub = localOrders.find(l => Number(l.orderid) === id);
        const merged = mergeSingle(dbSub, locSub);
        if (merged) results.push(merged);
      });
      if (results.length) return results;
    }

    const target = ids[0];
    const dbMatch = Array.isArray(dbData) ? dbData.find(d => Number(d.orderid) === target) || dbData[0] : dbData;
    const locMatch = localOrders.find(l => Number(l.orderid) === target || Number(l.combinedorderid) === target);

    const mergedSingle = mergeSingle(dbMatch, locMatch);

    if (mergedSingle) {
      const combinedLocals = localOrders.filter(l => Number(l.combinedorderid) === target);
      if (combinedLocals.length > 1) {
        return combinedLocals.map(l => {
          const dbSub = Array.isArray(dbData) ? dbData.find(d => Number(d.orderid) === Number(l.orderid)) : null;
          return mergeSingle(dbSub, l);
        });
      }
      return mergedSingle;
    }

    return null;
  },

  async createReview({ orderId, customerId, restaurantId, rating, comment }) {
    const payload = {
      orderid: orderId,
      customerid: customerId,
      restaurantid: restaurantId,
      rating,
      comment: comment || null
    };
    if (this.client()) {
      const { data, error } = await this.client().from('review').insert([payload]).select().single();
      if (error) throw error;
      return data;
    }
    return payload;
  },
  async getReviewForOrder(orderId) {
    if (!this.client()) return null;
    const { data, error } = await this.client().from('review').select('*').eq('orderid', orderId).maybeSingle();
    if (error) throw error;
    return data;
  },
  async getReviewsForRestaurant(restaurantId) {
    if (!this.client()) return [];
    const { data, error } = await this.client()
      .from('review').select('*, customer:customerid ( name )')
      .eq('restaurantid', restaurantId).order('reviewid', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async validateCoupon(code) {
    if (!this.client()) return null;
    const c = (code || '').trim().toUpperCase();
    if (!c) return null;
    const { data, error } = await this.client().from('coupon').select('*').eq('code', c).eq('isactive', true).maybeSingle();
    if (error) throw error;
    return data;
  },
  async searchMenuItems(query) {
    if (!this.client()) return [];
    const q = (query || '').trim();
    if (!q) return [];
    const { data, error } = await this.client()
      .from('menuitem')
      .select('*, restaurant:restaurantid ( restaurantid, name, rating )')
      .eq('isavailable', true)
      .ilike('name', '%' + q + '%')
      .limit(30);
    if (error) throw error;
    return data || [];
  },
  async addMenuItem(restaurantId, item) {
    const payload = {
      restaurantid: restaurantId,
      name: item.name,
      description: item.description || null,
      price: item.price,
      category: item.category || 'General',
      isveg: !!item.isveg,
      isavailable: true,
      imageurl: item.imageurl || null
    };
    const { data, error } = await this.client().from('menuitem').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  async toggleMenuAvailability(itemId, isAvailable) {
    const { data, error } = await this.client()
      .from('menuitem').update({ isavailable: isAvailable }).eq('itemid', itemId).select().single();
    if (error) throw error;
    return data;
  },
  async getAllMenuItemsForRestaurant(restaurantId) {
    const { data, error } = await this.client()
      .from('menuitem').select('*').eq('restaurantid', restaurantId).order('category');
    if (error) throw error;
    return data || [];
  },

};
