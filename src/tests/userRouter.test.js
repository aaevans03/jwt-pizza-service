const request = require('supertest');
const app = require('../service');
const { DB } = require('../database/database');
const { expectValidJwt } = require('./testHelper');
const { createTestUser, createAdminUser, createFranchise, createStore } = require('./factories');

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

test('Get info for authenticated user', async () => {
    const response = await request(app).get('/api/user/me').set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(adminUser.id);
    expect(response.body.name).toBe(adminUser.name);
    expect(response.body.email).toBe(adminUser.email);
    expect(response.body.roles).toEqual([{ role: 'admin' }]);
});
