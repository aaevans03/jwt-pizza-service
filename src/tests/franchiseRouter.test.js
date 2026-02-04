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

afterAll(async() => {
    await DB.deleteTestingDatabase();
});

test('Get Franchises', async () => {
    const response = await request(app).get('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('franchises');
    expect(response.body).toHaveProperty('more');
});

test('Get User Franchises', async () => {
    await createFranchise(adminUser.email, { name: 'My Franchise 1' });
    await createFranchise(adminUser.email, { name: 'My Franchise 2' });

    const response = await request(app).get('/api/franchise/' + adminUser.id).set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);

    // For each franchise in the response, make sure it fits the format
    response.body.forEach(franchise => {
        expect(franchise).toMatchObject({
            name: expect.any(String),
            id: expect.any(Number),
            stores: expect.any(Array),
            admins: expect.arrayContaining([
                expect.objectContaining({
                    id: adminUser.id,
                    name: adminUser.name,
                    email: adminUser.email,
                }),
            ]),
        });
    });
});

test('Create Franchise', async () => {
    const response = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send({ name: 'pizzaPocket', admins: [{ email: adminUser.email }]});

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('pizzaPocket');
    expect(response.body.admins).toEqual([ { email: adminUser.email, id: expect.any(Number), name: adminUser.name } ]);
    expect(response.body.id).toEqual(expect.any(Number));
});

test('Create Franchise Non-Admin', async () => {
    const testUser = await createTestUser({ password: 'hello' });
    const loginRes = await request(app).put('/api/auth').send(testUser);
    const testUserAuthToken = loginRes.body.token;
    const response = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send({ name: 'Fake Store', admins: [{ email: adminUser.email }]});

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('unable to create a franchise');
});

test('Delete Franchise', async () => {
    const franchiseInfo = await createFranchise(adminUser.email, { name: 'Delete Me' });
    
    const response = await request(app).delete('/api/franchise/' + franchiseInfo.id).set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('franchise deleted');
});

test('Create Store', async () => {
    const franchiseInfo = await createFranchise(adminUser.email);
    
    const response = await request(app).post('/api/franchise/' + franchiseInfo.id + '/store').set('Authorization', `Bearer ${adminUserAuthToken}`).send({ name: 'New Store' });
    expect(response.status).toBe(200);
    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.franchiseId).toBe(franchiseInfo.id);
    expect(response.body.name).toEqual(expect.any(String));
});

test('Delete Store', async () => {
    const franchiseInfo = await createFranchise(adminUser.email);
    const storeInfo = await createStore(franchiseInfo.id);
    
    const response = await request(app).delete('/api/franchise/' + franchiseInfo.id + '/store/' + storeInfo.id).set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('store deleted');
});
