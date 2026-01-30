const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database');
const { expectValidJwt, randomName } = require('./testHelper');

const adminUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let adminUserAuthToken;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

beforeAll(async () => {
    DB.setTesting();
    const adminUserResponse = await createAdminUser();

    adminUser.name = adminUserResponse.name;
    adminUser.email = adminUserResponse.email;
    adminUser.password = adminUserResponse.password;
    adminUser.id = adminUserResponse.id;
    
    const registerRes = await request(app).put('/api/auth').send({ email: adminUser.email, password: adminUser.password });
    adminUserAuthToken = registerRes.body.token;
    expectValidJwt(adminUserAuthToken);
});

afterAll(async() => {
    await DB.deleteTestingDatabase();
});

beforeEach(async () => {
    
});

// helper functions: create dummy franchises, delete all franchises

test('Get Franchises', async () => {
    const response = await request(app).get('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('franchises');
    expect(response.body).toHaveProperty('more');
});

test('Get User Franchises', async () => {
    await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send({ name: 'My Franchise 1', admins: [{ email: adminUser.email }]});
    await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send({ name: 'My Franchise 2', admins: [{ email: adminUser.email }]});

    const response = await request(app).get('/api/franchise/' + adminUser.id).set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    for (let i = 0; i < response.body.length; i++) {
        const franchise = response.body[i];
        expect(franchise).toHaveProperty('name');
        expect(franchise).toHaveProperty('id');
        expect(franchise).toHaveProperty('admins');

        expect(franchise.admins).toContainEqual({ id: adminUser.id, name: adminUser.name, email: adminUser.email });

        for (let j = 0; j < franchise.admins.length; j++) {
            expect(franchise.admins[j]).toHaveProperty('id');
            expect(franchise.admins[j]).toHaveProperty('name');
            expect(franchise.admins[j]).toHaveProperty('email');
        }
        expect(franchise).toHaveProperty('stores');
    }
});

test('Create Franchise', async () => {
    const response = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send({ name: 'pizzaPocket', admins: [{ email: adminUser.email }]});

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('pizzaPocket');
    expect(response.body.admins).toEqual([ { email: adminUser.email, id: expect.any(Number), name: adminUser.name } ]);
    expect(response.body.id).toEqual(expect.any(Number));
});