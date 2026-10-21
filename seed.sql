-- Run this script in SQL Server Management Studio (SSMS) against the releaf_pads database

-- 1. Insert Products
INSERT INTO dbo.Product (id, name, packSize, mrp, sellingPrice, discount, description, imageFallback, stock, stockStatus, totalSold, active)
VALUES 
('p1', 'Releaf Cotton Sanitary Pads – 30 Pads', '30 Pads', 414.00, 359.00, 13.00, 'Our most popular pack. Super soft, breathable cotton pads with wings. Ideal for regular to heavy flow.', '#A390E4', 50, 'IN_STOCK', 120, 1),

('p2', 'Releaf Cotton Sanitary Pads – 20 Pads', '20 Pads', 278.00, 249.00, 10.00, 'Perfect for your monthly cycle. Comfortable and rash-free experience.', '#A390E4', 35, 'IN_STOCK', 85, 1),

('p3', 'Releaf Cotton Sanitary Pads – 10 Pads Pack', '10 Pads', 155.00, 139.00, 10.00, 'Travel-friendly pack. Experience the comfort of pure cotton.', '#A390E4', 0, 'OUT_OF_STOCK', 30, 1),

('p4', 'Releaf Cotton Sanitary Pads – 6 Pads Pack', '6 Pads', 85.00, 77.00, 9.00, 'A trial pack to experience true comfort and care.', '#A390E4', 7, 'LOW_STOCK', 15, 1),
('p_panty', 'Releaf Period Panty', '1 Panty', 75.00, 50.00, 33.00, 'Comfortable, leak-proof Releaf Period Panty designed for ultimate comfort and protection during your period cycle.', '#E87A90', 50, 'IN_STOCK', 0, 1);
