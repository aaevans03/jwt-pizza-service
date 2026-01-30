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
    
    const registerRes = await request(app).post('/api/auth').send(adminUser);
    adminUserAuthToken = registerRes.body.token;
    expectValidJwt(adminUserAuthToken);
});

afterAll(async() => {
    await DB.deleteTestingDatabase();
})

test('Get Franchises', async () => {
    const response = await request(app).get('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('franchises');
    expect(response.body).toHaveProperty('more');
});
