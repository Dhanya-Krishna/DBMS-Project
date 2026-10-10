-- Top-selling items
SELECT m.name, SUM(oi.quantity) AS units FROM orderitem oi JOIN menuitem m ON m.itemid=oi.itemid GROUP BY m.itemid,m.name ORDER BY units DESC LIMIT 10;
-- Active customers
SELECT c.name,c.email,COUNT(o.orderid) AS orders FROM customer c JOIN orders o ON o.customerid=c.customerid GROUP BY c.customerid,c.name,c.email ORDER BY orders DESC LIMIT 10;
-- Restaurant revenue
SELECT r.name,COUNT(o.orderid) AS orders,COALESCE(SUM(o.subtotal),0) AS revenue FROM restaurant r LEFT JOIN orders o ON o.restaurantid=r.restaurantid GROUP BY r.restaurantid,r.name ORDER BY revenue DESC;
-- Daily revenue
SELECT DATE(orderdatetime) AS day,COUNT(*) AS orders,SUM(subtotal) AS revenue FROM orders GROUP BY DATE(orderdatetime) ORDER BY day DESC;
-- Pending deliveries
SELECT orderid,status,restaurantid,customerid FROM orders WHERE LOWER(status) NOT LIKE '%deliver%' AND LOWER(COALESCE(status,'')) NOT LIKE '%cancel%';
