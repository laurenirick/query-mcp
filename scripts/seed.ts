import { Client } from 'pg'
import { faker } from '@faker-js/faker'

const NUM_USERS = 100
const NUM_PRODUCTS = 50
const NUM_ORDERS = 500
const NUM_ORDER_ITEMS = 1200
const NUM_EVENTS = 2000

type User = { name: string; email: string; created_at: Date }
type Product = { name: string; price: number; category: string }
type Order = { user_id: number; order_date: Date }
type OrderItem = {
    order_id: number
    product_id: number
    quantity: number
    price: number
}
type Event = { user_id: number; event_type: string; event_time: Date }

const run = async () => {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'sample',
    })

    await client.connect()
    console.log('Connected to database. Seeding...')

    // Drop tables if they exist
    await client.query(`
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS events CASCADE;
  `)

    // Create tables
    await client.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      price NUMERIC(10,2),
      category VARCHAR(50)
    );
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      order_date TIMESTAMP,
      total NUMERIC(10,2)
    );
    CREATE TABLE order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER,
      price NUMERIC(10,2)
    );
    CREATE TABLE events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      event_type VARCHAR(50),
      event_time TIMESTAMP
    );
  `)

    // Generate users
    const users: User[] = []
    for (let i = 0; i < NUM_USERS; i++) {
        users.push({
            name: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            created_at: faker.date.between({ from: '2023-01-01', to: '2024-01-01' }),
        })
    }
    await client.query(
        `INSERT INTO users (name, email, created_at) VALUES ${users
            .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
            .join(',')}`,
        users.flatMap(u => [u.name, u.email, u.created_at]),
    )

    // Generate products
    const categories = ['Electronics', 'Home', 'Office', 'Clothing', 'Sports', 'Books']
    const products: Product[] = []
    for (let i = 0; i < NUM_PRODUCTS; i++) {
        products.push({
            name: faker.commerce.productName(),
            price: faker.number.float({ min: 5, max: 2000, fractionDigits: 2 }),
            category: faker.helpers.arrayElement(categories),
        })
    }
    await client.query(
        `INSERT INTO products (name, price, category) VALUES ${products
            .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
            .join(',')}`,
        products.flatMap(p => [p.name, p.price, p.category]),
    )

    // Generate orders
    const orders: Order[] = []
    for (let i = 0; i < NUM_ORDERS; i++) {
        const user_id = faker.number.int({ min: 1, max: NUM_USERS })
        const order_date = faker.date.between({
            from: '2024-01-01',
            to: '2024-06-01',
        })
        orders.push({ user_id, order_date })
    }
    // Insert orders, get their IDs
    const orderValues = orders.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',')
    const orderParams = orders.flatMap(o => [o.user_id, o.order_date])
    const orderInsert = await client.query(
        `INSERT INTO orders (user_id, order_date) VALUES ${orderValues} RETURNING id`,
        orderParams,
    )
    const orderIds = orderInsert.rows.map(r => r.id)

    // Generate order_items
    const order_items: OrderItem[] = []
    for (let i = 0; i < NUM_ORDER_ITEMS; i++) {
        const order_id = faker.helpers.arrayElement(orderIds) as number
        const product_id = faker.number.int({ min: 1, max: NUM_PRODUCTS })
        const quantity = faker.number.int({ min: 1, max: 5 })
        const price = products[product_id - 1].price
        order_items.push({ order_id, product_id, quantity, price })
    }
    // Insert order_items in batches
    for (let i = 0; i < order_items.length; i += 500) {
        const batch = order_items.slice(i, i + 500)
        await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ${batch
                .map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`)
                .join(',')}`,
            batch.flatMap(oi => [oi.order_id, oi.product_id, oi.quantity, oi.price]),
        )
    }

    // Generate events
    const event_types = ['login', 'view_product', 'purchase', 'logout', 'add_to_cart']
    const events: Event[] = []
    for (let i = 0; i < NUM_EVENTS; i++) {
        const user_id = faker.number.int({ min: 1, max: NUM_USERS })
        const event_type = faker.helpers.arrayElement(event_types)
        const event_time = faker.date.between({
            from: '2024-01-01',
            to: '2024-06-01',
        })
        events.push({ user_id, event_type, event_time })
    }
    // Insert events in batches
    for (let i = 0; i < events.length; i += 500) {
        const batch = events.slice(i, i + 500)
        await client.query(
            `INSERT INTO events (user_id, event_type, event_time) VALUES ${batch
                .map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`)
                .join(',')}`,
            batch.flatMap(e => [e.user_id, e.event_type, e.event_time]),
        )
    }

    // Update orders with totals
    await client.query(`
    UPDATE orders o SET total = (
      SELECT SUM(oi.price * oi.quantity) FROM order_items oi WHERE oi.order_id = o.id
    )
  `)

    console.log('Database seeded with lots of random data!')
    await client.end()
}

const main = async () => {
    await run()
}

main()
