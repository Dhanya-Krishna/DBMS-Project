/**
 * FoodExpress - Database helpers (Supabase)
 * All table/column names are lowercase (PostgreSQL default)
 */

window.DB = {
  client() {
    return window.supabaseClient;
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
    const { data: existing } = await this.client()
      .from('address')
      .select('*')
      .eq('customerid', customerId)
      .eq('isdefault', true)
      .maybeSingle();
    if (existing) return existing;

    const { data, error } = await this.client()
      .from('address')
      .insert([{
        customerid: customerId,
        street: 'Default Address',
        city: 'Kochi',
        pincode: '682001',
        landmark: '',
        isdefault: true
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Place order from cart items.
   * Groups by restaurant → one CombinedOrder + one Order per restaurant + OrderItems
   */
  async placeOrder({ customerId, addressId, cartItems, paymentMethod }) {
    if (!cartItems || cartItems.length === 0) throw new Error('Cart is empty');

    // Group cart by restaurant name (cart stores restaurant name string)
    const byRest = {};
    cartItems.forEach(item => {
      const key = item.restaurant || 'Unknown';
      if (!byRest[key]) byRest[key] = [];
      byRest[key].push(item);
    });

    const restaurants = await this.getRestaurants();
    const nameToId = {};
    restaurants.forEach(r => { nameToId[r.name] = r.restaurantid; });

    let grandTotal = 0;
    cartItems.forEach(i => { grandTotal += (i.price * i.qty); });
    const deliveryFee = Object.keys(byRest).length > 1 ? 80 : 40;

    // Combined order
    const { data: combined, error: cErr } = await this.client()
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
    if (cErr) throw cErr;

    const createdOrders = [];

    for (const [restName, items] of Object.entries(byRest)) {
      const restaurantId = nameToId[restName] || 1;
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
          subtotal: subTotal,
          deliveryfee: Object.keys(byRest).length > 1 ? 0 : deliveryFee,
          paymentstatus: 'Paid'
        }])
        .select()
        .single();
      if (oErr) throw oErr;

      const orderItems = items.map(i => ({
        orderid: order.orderid,
        itemid: parseInt(i.id, 10) || 1,
        quantity: i.qty,
        unitprice: i.price,
        subtotal: i.price * i.qty
      }));

      const { error: oiErr } = await this.client()
        .from('orderitem')
        .insert(orderItems);
      if (oiErr) throw oiErr;

      createdOrders.push(order);
    }

    // Payment record
    await this.client().from('payment').insert([{
      combinedorderid: combined.combinedorderid,
      amount: grandTotal + deliveryFee,
      method: paymentMethod || 'UPI',
      status: 'Completed',
      paidat: new Date().toISOString()
    }]);

    return { combined, orders: createdOrders };
  },

  async getOrdersForRestaurant(restaurantId) {
    const { data, error } = await this.client()
      .from('orders')
      .select(`
        *,
        customer:customerid ( name, phone, email ),
        orderitem ( quantity, unitprice, subtotal, menuitem:itemid ( name ) )
      `)
      .eq('restaurantid', restaurantId)
      .order('orderdatetime', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAvailableOrdersForDelivery() {
    const { data, error } = await this.client()
      .from('orders')
      .select(`
        *,
        restaurant:restaurantid ( name, address, phone ),
        customer:customerid ( name, phone ),
        address:addressid ( street, city, pincode, landmark )
      `)
      .in('status', ['Ready', 'Confirmed', 'Preparing', 'Placed', 'New', 'Accepted'])
      .order('orderdatetime', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getOrdersForPartner(partnerId) {
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
    if (error) throw error;
    return data || [];
  },

  async updateOrderStatus(orderId, status, extra = {}) {
    const payload = { status, ...extra };
    const { data, error } = await this.client()
      .from('orders')
      .update(payload)
      .eq('orderid', orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDeliveryHistory(partnerId) {
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
    if (error) throw error;
    return (data || []).filter(o => {
      const s = (o.status || '').toLowerCase();
      return s.includes('deliver') || s.includes('complete');
    });
  },

  async getAllOpenOrders() {
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
    if (error) throw error;
    return data || [];
  },

  async getCustomerOrders(customerId) {
    const { data, error } = await this.client()
      .from('orders')
      .select(`
        *,
        restaurant:restaurantid ( name )
      `)
      .eq('customerid', customerId)
      .order('orderdatetime', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getOrderDetails(orderId) {
    if (!orderId) return null;
    const isNum = /^\d+$/.test(String(orderId));
    let query = this.client()
      .from('orders')
      .select(`
        *,
        restaurant:restaurantid ( name, address, phone ),
        customer:customerid ( name, phone, email ),
        address:addressid ( street, city, pincode, landmark ),
        deliverypartner:deliverypartnerid ( name, phone, rating ),
        orderitem ( quantity, unitprice, subtotal, menuitem:itemid ( name, imageurl ) )
      `);

    if (isNum) {
      query = query.eq('orderid', parseInt(orderId, 10));
    } else {
      query = query.eq('orderid', orderId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }
};
