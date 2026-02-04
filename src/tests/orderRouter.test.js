const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database');
const { expectValidJwt } = require('./testHelper');
const { createAdminUser } = require('./factories');

let adminUser;
let adminUserAuthToken;

beforeAll(async () => {
    DB.setTesting();

    // create an admin user to use for all of these tests
    const adminUserResponse = await createAdminUser();

    adminUser = {
        name: adminUserResponse.name,
        email: adminUserResponse.email,
        password: adminUserResponse.password,
        id: adminUserResponse.id
    };
    
    const registerRes = await request(app).put('/api/auth').send({ email: adminUser.email, password: adminUser.password });
    adminUserAuthToken = registerRes.body.token;
    expectValidJwt(adminUserAuthToken);
});

afterAll(async() => {
    await DB.deleteTestingDatabase();
});

test('Get Menu', async () => {
    // Add a menu item as admin
    const addResponse = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminUserAuthToken}`).send({ title: 'Test Pizza', description: 'Tasty', image: 'pizzaX.png', price: 0.01 });

    expect(addResponse.status).toBe(200);
    expect(addResponse.body.length).toBeGreaterThan(0);

    const added = addResponse.body.find(i => i.title === 'Test Pizza');
    expect(added).toMatchObject({ id: expect.any(Number), title: 'Test Pizza', description: 'Tasty', image: 'pizzaX.png', price: expect.any(Number) });

    // Fetch menu (no auth required)
    const getResponse = await request(app).get('/api/order/menu');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.length).toBeGreaterThan(0);
    const found = getResponse.body.find(i => i.title === 'Test Pizza');
    expect(found).toBeDefined();
});

