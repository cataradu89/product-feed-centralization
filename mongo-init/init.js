// MongoDB initialization script
db = db.getSiblingDB('product-feed');

// Create admin user if it doesn't exist
if (db.getUser('admin') == null) {
  db.createUser({
    user: 'admin',
    pwd: 'password',
    roles: [{ role: 'readWrite', db: 'product-feed' }]
  });
}

// Create default application user if users collection is empty
if (db.users.countDocuments() === 0) {
  // Create hashed password (equivalent to "password123")
  const hashedPassword = "$2a$10$XFMaFjL38jX.FPXLRIAcxeAYKzAfQrjQM4jO7OQw1kjlwlh9KR8zq";
  
  db.users.insertOne({
    username: "admin",
    email: "admin@example.com",
    password: hashedPassword,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  print("Default admin user created successfully");
}

// Sample data for stores
const sampleStores = [
  {
    name: "Example Store 1",
    domain: "example.com",
    favicon: null,
    faviconUrl: null,
    faviconGeneratedAt: null,
    productCount: 2,
    lastUpdated: new Date(),
    createdAt: new Date()
  },
  {
    name: "Example Store 2",
    domain: "example2.com",
    favicon: null,
    faviconUrl: null,
    faviconGeneratedAt: null,
    productCount: 1,
    lastUpdated: new Date(),
    createdAt: new Date()
  }
];

// Insert sample stores if collection is empty
if (db.stores.countDocuments() === 0) {
  db.stores.insertMany(sampleStores);
  print("Sample stores inserted successfully");
}

// Sample data for feeds
const sampleFeeds = [
  {
    name: "Example Feed 1",
    url: "https://example.com/feed1.csv",
    status: "active",
    lastImport: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Example Feed 2",
    url: "https://example2.com/feed2.csv",
    status: "active",
    lastImport: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Insert sample feeds if collection is empty
if (db.feeds.countDocuments() === 0) {
  db.feeds.insertMany(sampleFeeds);
  print("Sample feeds inserted successfully");
}

// Sample data for products
const sampleProducts = [
  {
    title: "Product 1",
    aff_code: "P001",
    price: 19.99,
    campaign_name: "example.com",
    image_urls: "https://example.com/images/product1.jpg",
    subcategory: "Electronics",
    url: "https://example.com/product1",
    lastUpdated: new Date(),
    createdAt: new Date()
  },
  {
    title: "Product 2",
    aff_code: "P002",
    price: 29.99,
    campaign_name: "example.com",
    image_urls: "https://example.com/images/product2.jpg",
    subcategory: "Home",
    url: "https://example.com/product2",
    lastUpdated: new Date(),
    createdAt: new Date()
  },
  {
    title: "Product 3",
    aff_code: "P003",
    price: 39.99,
    campaign_name: "example2.com",
    image_urls: "https://example2.com/images/product3.jpg",
    subcategory: "Fashion",
    url: "https://example2.com/product3",
    lastUpdated: new Date(),
    createdAt: new Date()
  }
];

// Insert sample products if collection is empty
if (db.products.countDocuments() === 0) {
  db.products.insertMany(sampleProducts);
  print("Sample products inserted successfully");
}

// Create indexes for better performance
// Products collection indexes
db.products.createIndex({ url: 1 }, { unique: true });
db.products.createIndex({ campaign_name: 1 });
db.products.createIndex({ title: 1 });
db.products.createIndex({ subcategory: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ createdAt: -1 });
db.products.createIndex({ lastUpdated: -1 });
db.products.createIndex({ campaign_name: 1, subcategory: 1 }); // Composite index for filtering by store and category
db.products.createIndex({ campaign_name: 1, price: 1 }); // Composite index for filtering and sorting by price

// Feeds collection indexes
db.feeds.createIndex({ url: 1 }, { unique: true });
db.feeds.createIndex({ status: 1 });
db.feeds.createIndex({ lastImport: 1 });
db.feeds.createIndex({ createdAt: -1 });
db.feeds.createIndex({ updatedAt: -1 });

// Stores collection indexes
db.stores.createIndex({ name: 1 }, { unique: true });
db.stores.createIndex({ domain: 1 });
db.stores.createIndex({ productCount: -1 }); // For sorting by product count
db.stores.createIndex({ lastUpdated: -1 }); // For sorting by last updated
db.stores.createIndex({ createdAt: -1 }); // For sorting by creation date

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

print("MongoDB initialization completed successfully");
