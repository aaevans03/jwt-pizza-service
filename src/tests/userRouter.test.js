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

test('Get info for authenticated user', async () => {
    const response = await request(app).get('/api/user/me').set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(adminUser.id);
    expect(response.body.name).toBe(adminUser.name);
    expect(response.body.email).toBe(adminUser.email);
    expect(response.body.roles).toEqual([{ role: 'admin' }]);
});

test('Admin update info of self', async () => {
    const updatedName = 'Updated Admin Name';
    const updatedEmail = 'updatedemail@jwt.com';
    const updatedPassword = 'newpassword123';

    const response = await request(app)
        .put(`/api/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send({ name: updatedName, email: updatedEmail, password: updatedPassword });

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(adminUser.id);
    expect(response.body.user.name).toBe(updatedName);
    expect(response.body.user.email).toBe(updatedEmail);
    expect(response.body.user.roles).toEqual([{ role: 'admin' }]);
    expectValidJwt(response.body.token);
});

// FUTURE: Test-driven development with new userRouter endpoints
