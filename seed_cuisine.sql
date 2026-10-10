CREATE TABLE IF NOT EXISTS cuisine (
  cuisineid SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS restaurantcuisine (
  restaurantid INT NOT NULL,
  cuisineid INT NOT NULL,
  PRIMARY KEY (restaurantid, cuisineid)
);
TRUNCATE restaurantcuisine;
DELETE FROM cuisine;
INSERT INTO cuisine (cuisineid, name) VALUES
(1,'North Indian'),(2,'Biryani'),(3,'Italian'),(4,'Pizza'),
(5,'American'),(6,'Burgers'),(7,'Chinese'),(8,'Asian'),
(9,'Desserts'),(10,'Bakery'),(11,'Healthy'),(12,'Salads'),
(13,'Cafe'),(14,'Beverages'),(15,'Seafood'),(16,'Mexican');
INSERT INTO restaurantcuisine (restaurantid, cuisineid) VALUES
(1,1),(1,2),(2,3),(2,4),(3,5),(3,6),(4,7),(4,8),
(5,9),(5,10),(6,11),(6,12),(7,13),(7,14),(8,15),(9,16);
