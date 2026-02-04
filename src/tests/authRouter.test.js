const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database');
const { expectValidJwt } =  require('./testHelper');
const { createTestUser } = require('./factories');

beforeAll(async () => {
    DB.setTesting();
});

afterAll(async () => {
    await DB.deleteTestingDatabase();
});

test('Register', async () => {
    // Create new user and try registering them
    const testUser = { name: 'Test User', email: 'test@test.com', password: 'thisismypassword' };
    const registerRes = await request(app).post('/api/auth').send(testUser);

    expect(registerRes.status).toBe(200);
    expectValidJwt(registerRes.body.token);

    const expectedUser = { name: testUser.name, email: testUser.email, roles: [{ role: 'diner' }] };
    expect(registerRes.body.user).toMatchObject(expectedUser);
});

test('Register Fail', async () => {
    // Send garbage data into app
    const registerRes = await request(app).post('/api/auth').send([{ dummyData: "yes" }]);

    expect(registerRes.status).toBe(400);
    expect(registerRes.body.message).toBe('name, email, and password are required');

});

test('Login', async () => {
    // Create test user
    const testUser = await createTestUser({ password: 'mypassword' });

    // Try logging in
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expectValidJwt(loginRes.body.token);

    const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
    delete expectedUser.password;
    expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('Logout', async () => {
    // Create test user and login
    const testUser = await createTestUser({ password: 'hello' });
    const loginRes = await request(app).put('/api/auth').send(testUser);
    const testUserAuthToken = loginRes.body.token;

    // Try logging out
    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('logout successful');
})

