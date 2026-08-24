-- SQL Script to initialize ReLeaf Pads Database Tables

-- 1. Products Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Products' and xtype='U')
CREATE TABLE Products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    packSize VARCHAR(50),
    mrp DECIMAL(10, 2),
    sellingPrice DECIMAL(10, 2),
    discount DECIMAL(5, 2),
    description TEXT,
    imageFallback VARCHAR(50),
    stock INT,
    stockStatus VARCHAR(50),
    totalSold INT,
    active BIT
);

-- 2. DeliveryPartners Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DeliveryPartners' and xtype='U')
CREATE TABLE DeliveryPartners (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(50),
    activeOrders INT,
    completedOrders INT,
    rating DECIMAL(3, 2)
);

-- 3. Customers Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Customers' and xtype='U')
CREATE TABLE Customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pincode VARCHAR(10)
);

-- 4. Addresses Table (Linked to Customers)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Addresses' and xtype='U')
CREATE TABLE Addresses (
    id VARCHAR(50) PRIMARY KEY,
    customerId VARCHAR(50) FOREIGN KEY REFERENCES Customers(id),
    name VARCHAR(255),
    phone VARCHAR(20),
    houseNumber VARCHAR(255),
    street VARCHAR(255),
    area VARCHAR(255),
    landmark VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    addressType VARCHAR(50)
);

-- 5. Orders Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Orders' and xtype='U')
CREATE TABLE Orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    customerId VARCHAR(50) FOREIGN KEY REFERENCES Customers(id),
    addressId VARCHAR(50) FOREIGN KEY REFERENCES Addresses(id),
    deliveryPartnerId VARCHAR(50) FOREIGN KEY REFERENCES DeliveryPartners(id) NULL,
    subtotal DECIMAL(10, 2),
    delivery DECIMAL(10, 2),
    total DECIMAL(10, 2),
    paymentStatus VARCHAR(50),
    status VARCHAR(50),
    date DATETIME
);
